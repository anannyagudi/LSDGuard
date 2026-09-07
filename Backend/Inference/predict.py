import sys
import os

# Add Backend folder to Python path
sys.path.append(
    os.path.abspath(
        os.path.join(
            os.path.dirname(__file__),
            ".."
        )
    )
)

import torch
import torch.nn as nn

from torchvision import transforms, models
from PIL import Image

from YOLO.detect_nodules import detect_nodules
from YOLO.patch_analyzer import analyze_patches
from YOLO.severity_calculator import calculate_severity

# Device
device = torch.device("cpu")

# Classes
classes = [
    "Lumpy Skin",
    "Normal Skin",
    "NotCow"
]

# Load Model
model = models.efficientnet_b0(weights=None)

num_features = model.classifier[1].in_features

model.classifier[1] = nn.Linear(
    num_features,
    3
)

model.load_state_dict(
    torch.load(
        os.path.join(
            os.path.dirname(__file__),
            "..",
            "Model",
            "lsd_classifier.pt"
        ),
        map_location=device
    )
)

model.to(device)
model.eval()

# Image Transform
transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor()
])

# Number of Images
num_images = int(
    input(
        "How many images do you want to analyze? (1-5): "
    )
)

results = []

for i in range(num_images):

    print(f"\nImage {i+1}")

    image_path = input(
        "Enter Image Path: "
    ).strip().strip('"')

    image = Image.open(
        image_path
    ).convert("RGB")

    image = transform(image)

    image = image.unsqueeze(0).to(device)

    with torch.no_grad():

        outputs = model(image)

        probabilities = torch.softmax(
            outputs,
            dim=1
        )

        confidence, prediction = torch.max(
            probabilities,
            dim=1
        )

    predicted_class = classes[
        prediction.item()
    ]

    confidence_score = round(
        confidence.item() * 100,
        2
    )

    nodule_density = 0
    coverage_percent = 0
    patch_percent = 0
    severity = 0

    if predicted_class == "Lumpy Skin":

        detection_result = detect_nodules(
            image_path
        )

        coverage_percent = min(
            detection_result["coverage_percent"],
            100
        )

        nodule_density = detection_result[
            "nodule_density"
        ]

        patch_percent = analyze_patches(
            image_path
        )

        severity = calculate_severity(
            nodule_density,
            coverage_percent,
            patch_percent
        )

    results.append(
        {
            "prediction": predicted_class,
            "confidence": confidence_score,
            "nodule_density": nodule_density,
            "coverage": coverage_percent,
            "patch": patch_percent,
            "severity": severity
        }
    )

print("\n========== ANALYSIS REPORT ==========\n")

lumpy_count = 0
normal_count = 0
notcow_count = 0

total_confidence = 0

severity_values = []

for index, result in enumerate(results):

    print(
        f"Image {index+1}: "
        f"{result['prediction']} "
        f"({result['confidence']}%)"
    )

    if result["prediction"] == "Lumpy Skin":

        print(
            f"Nodule Density : "
            f"{result['nodule_density']}%"
        )

        print(
            f"Coverage Area  : "
            f"{result['coverage']}%"
        )

        print(
            f"Patch Area     : "
            f"{result['patch']}%"
        )

        print(
            f"Severity       : "
            f"{result['severity']}%"
        )

        severity_values.append(
            result["severity"]
        )

    elif result["prediction"] == "Normal Skin":

        print(
            "Status         : Cow is Healthy"
        )

    elif result["prediction"] == "NotCow":

        print(
            "Status         : Please Upload Cow Image"
        )

    print("--------------------------------")

    total_confidence += result["confidence"]

    if result["prediction"] == "Lumpy Skin":
        lumpy_count += 1

    elif result["prediction"] == "Normal Skin":
        normal_count += 1

    else:
        notcow_count += 1

average_confidence = round(
    total_confidence / len(results),
    2
)

if len(severity_values) > 0:

    overall_severity = round(
        sum(severity_values)
        / len(severity_values),
        2
    )

else:

    overall_severity = 0

# ========== SYMPTOM INPUT ==========

print("\n========== FARMER SYMPTOM CHECK ==========\n")

symptoms = {
    "Fever": input(
        "Does the cow have Fever?          (y/n): "
    ).strip().lower(),

    "Milk Reduction": input(
        "Is there Milk Reduction?          (y/n): "
    ).strip().lower(),

    "Appetite Loss": input(
        "Is there Appetite Loss?           (y/n): "
    ).strip().lower(),

    "Eye Discharge": input(
        "Is there Eye/Nasal Discharge?     (y/n): "
    ).strip().lower(),

    "Swollen Lymph": input(
        "Are Lymph Nodes Swollen?          (y/n): "
    ).strip().lower(),
}

symptom_score = sum(
    20 for answer in symptoms.values()
    if answer == "y"
)

if len(severity_values) > 0:

    final_severity = round(
        0.4 * overall_severity +
        0.6 * symptom_score,
        2
    )

else:

    final_severity = 0

# ========== SUMMARY ==========

print("\n========== SUMMARY ==========\n")

print("Lumpy Skin Images :", lumpy_count)
print("Normal Skin Images:", normal_count)
print("NotCow Images     :", notcow_count)

print(
    f"Average Confidence: "
    f"{average_confidence}%"
)

print(
    f"Overall Severity  : "
    f"{overall_severity}%"
)

print(
    f"Symptom Score     : "
    f"{symptom_score}%"
)

print(
    f"Final Severity    : "
    f"{final_severity}%"
)

if lumpy_count > normal_count:

    final_result = "Lumpy Skin Disease"

elif normal_count > lumpy_count:

    final_result = "Healthy Cow"

elif notcow_count == len(results):

    final_result = "Not a Cow"

else:

    final_result = "Uncertain"

print(
    f"\nFinal Result: "
    f"{final_result}"
)

print("\n=============================\n")