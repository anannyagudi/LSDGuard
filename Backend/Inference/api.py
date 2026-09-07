import hashlib
import hmac
import json
import os
import tempfile
import time
from pathlib import Path

import torch
import torch.nn as nn
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
from torchvision import models, transforms

import sys

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.append(str(BACKEND_DIR))

from YOLO.detect_nodules import detect_nodules
from YOLO.patch_analyzer import analyze_patches
from YOLO.severity_calculator import calculate_severity


ML_VALIDATION_SECRET = os.getenv(
    "ML_VALIDATION_SECRET",
    "lsdguard-dev-validation-secret",
)

CLASSES = ["Lumpy Skin", "Normal Skin", "NotCow"]
DEVICE = torch.device("cpu")

app = FastAPI(title="LSDGuard ML API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
])


def load_classifier():
    model = models.efficientnet_b0(weights=None)
    num_features = model.classifier[1].in_features
    model.classifier[1] = nn.Linear(num_features, len(CLASSES))
    model.load_state_dict(
        torch.load(
            BACKEND_DIR / "Model" / "lsd_classifier.pt",
            map_location=DEVICE,
        )
    )
    model.to(DEVICE)
    model.eval()
    return model


classifier = load_classifier()


def severity_label(percent):
    if percent >= 60:
        return "Severe"
    if percent >= 35:
        return "Moderate"
    if percent > 0:
        return "Mild"
    return "None"


def symptom_score(symptoms):
    symptom_keys = ["fever", "milkReduced", "eatingLess", "discharge"]
    return min(
        sum(25 for key in symptom_keys if bool(symptoms.get(key))),
        100,
    )


def print_visibility_report(results, symptoms, average_confidence, overall_severity, risk_percent):
    print("\n========== LSDGUARD ML EXPLAINABILITY REPORT ==========")
    print("Purpose: Backend technical output for viva/demo")
    print("Pipeline: EfficientNet-B0 CNN + YOLO lesion analysis + OpenCV patch analysis")
    print("-------------------------------------------------------")

    for index, result in enumerate(results, start=1):
        print(f"Image {index}")
        print(f"  CNN Prediction       : {result['prediction']}")
        print(f"  CNN Confidence       : {result['confidence']}%")
        print(f"  YOLO Nodule Density  : {result['nodule_density']}%")
        print(f"  YOLO Coverage Area   : {result['coverage']}%")
        print(f"  OpenCV Patch Area    : {result['patch']}%")
        print(f"  Image Severity Score : {result['severity_score']}%")
        print("-------------------------------------------------------")

    current_symptom_score = symptom_score(symptoms)
    print("Final Scoring")
    print(f"  Average CNN Confidence : {average_confidence}%")
    print(f"  Image Severity Score   : {overall_severity}%")
    print(f"  Farmer Symptom Score   : {current_symptom_score}%")
    print("  Formula                : 40% image severity + 60% symptom score")
    print(f"  Final LSD Risk Score   : {risk_percent}%")
    print(f"  Final Severity Label   : {severity_label(risk_percent)}")
    print("=======================================================\n")


def sign_validation(image_hashes, expires_at):
    payload = json.dumps(
        {
            "expires_at": int(expires_at),
            "image_hashes": image_hashes,
        },
        separators=(",", ":"),
    )
    return hmac.new(
        ML_VALIDATION_SECRET.encode("utf-8"),
        payload.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def predict_image(image_path):
    image = Image.open(image_path).convert("RGB")
    tensor = transform(image).unsqueeze(0).to(DEVICE)

    with torch.no_grad():
        outputs = classifier(tensor)
        probabilities = torch.softmax(outputs, dim=1)
        confidence, prediction = torch.max(probabilities, dim=1)

    predicted_class = CLASSES[prediction.item()]
    confidence_score = round(confidence.item() * 100, 2)

    nodule_density = 0
    coverage_percent = 0
    patch_percent = 0
    image_severity = 0

    if predicted_class == "Lumpy Skin":
        detection_result = detect_nodules(str(image_path))
        coverage_percent = min(detection_result["coverage_percent"], 100)
        nodule_density = detection_result["nodule_density"]
        patch_percent = analyze_patches(str(image_path))
        image_severity = calculate_severity(
            nodule_density,
            coverage_percent,
            patch_percent,
        )

    return {
        "prediction": predicted_class,
        "confidence": confidence_score,
        "nodule_density": nodule_density,
        "coverage": coverage_percent,
        "patch": patch_percent,
        "severity_score": image_severity,
    }


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/predict")
async def predict(
    images: list[UploadFile] = File(...),
    symptoms_json: str = Form("{}"),
    animal_age: str = Form(""),
    farmer_location: str = Form(""),
    language: str = Form("en"),
):
    if len(images) < 3 or len(images) > 5:
        raise HTTPException(
            status_code=400,
            detail="Upload between 3 and 5 cow images.",
        )

    try:
        symptoms = json.loads(symptoms_json or "{}")
    except json.JSONDecodeError:
        symptoms = {}

    temp_paths = []
    image_hashes = []

    try:
        for upload in images:
            suffix = Path(upload.filename or "scan.jpg").suffix or ".jpg"
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
                content = await upload.read()
                temp_file.write(content)
                temp_paths.append(Path(temp_file.name))
                image_hashes.append(hashlib.sha256(content).hexdigest())

        results = [predict_image(path) for path in temp_paths]
        invalid_images = [
            {
                "index": index,
                "prediction": result["prediction"],
                "confidence": result["confidence"],
                "failure_reasons": [
                    "This image was classified as NotCow. Please upload cow images only."
                ],
            }
            for index, result in enumerate(results)
            if result["prediction"] == "NotCow"
        ]

        if invalid_images:
            raise HTTPException(
                status_code=400,
                detail={
                    "message": "Please upload cow images only.",
                    "invalid_images": invalid_images,
                },
            )

        average_confidence = round(
            sum(result["confidence"] for result in results) / len(results),
            2,
        )
        lumpy_severities = [
            result["severity_score"]
            for result in results
            if result["prediction"] == "Lumpy Skin"
        ]
        overall_severity = (
            round(sum(lumpy_severities) / len(lumpy_severities), 2)
            if lumpy_severities
            else 0
        )
        risk_percent = (
            round(0.4 * overall_severity + 0.6 * symptom_score(symptoms), 2)
            if lumpy_severities
            else 0
        )
        expires_at = int(time.time()) + 15 * 60

        print_visibility_report(
            results,
            symptoms,
            average_confidence,
            overall_severity,
            risk_percent,
        )

        return {
            "lsd_percent": risk_percent,
            "avg_score": average_confidence,
            "severity": severity_label(risk_percent),
            "per_image": [result["confidence"] for result in results],
            "per_image_severity": [result["prediction"] for result in results],
            "visibility_scores": results,
            "ai_remedies": [],
            "ai_advice": "",
            "ai_advice_source": "",
            "ai_advice_model": "",
            "validation_proof": {
                "token": sign_validation(image_hashes, expires_at),
                "expires_at": expires_at,
                "image_hashes": image_hashes,
            },
            "meta": {
                "animal_age": animal_age,
                "farmer_location": farmer_location,
                "language": language,
            },
        }
    finally:
        for path in temp_paths:
            try:
                path.unlink(missing_ok=True)
            except OSError:
                pass
