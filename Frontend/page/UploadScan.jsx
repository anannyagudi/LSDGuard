import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";

const ML_API_URL =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_ML_API_URL) ||
  "http://localhost:8000";

const APP_API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE) ||
  "http://localhost:5000";

const imageSlots = [
  { key: "side",  labelKey: "uploadScan.sideView" },
  { key: "neck",  labelKey: "uploadScan.neck" },
  { key: "back",  labelKey: "uploadScan.back" },
  { key: "legs",  labelKey: "uploadScan.legs" },
  { key: "under", labelKey: "uploadScan.under" },
];

const imageSlotLabels = {
  side:  "Side image",
  neck:  "Neck image",
  back:  "Back image",
  legs:  "Legs image",
  under: "Under image",
};

const MIN_SCAN_IMAGES = 3;
const MAX_SCAN_IMAGES = imageSlots.length;

const allowedScanMimeTypes = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

const droppedTextTypes = ["text/uri-list", "text/plain", "text/html"];

const scanText = {
  "common.ok": "OK",
  "uploadScan.eyebrow": "LSD scan workflow",
  "uploadScan.title": "Upload cow scan images",
  "uploadScan.heroText": "Add clear images of the selected cow so the scan can review visible skin symptoms.",
  "uploadScan.checklist": "Photo checklist",
  "uploadScan.daylight": "Taken in daylight",
  "uploadScan.centered": "Cow skin is centered",
  "uploadScan.clear": "Image is clear",
  "uploadScan.earlySymptoms": "Early Symptoms",
  "uploadScan.fever": "Fever?",
  "uploadScan.milkReduced": "Milk reduced?",
  "uploadScan.eatingLess": "Eating less?",
  "uploadScan.discharge": "Eye / nose discharge?",
  "uploadScan.vaccinated": "Vaccinated?",
  "uploadScan.villageName": "Village Name",
  "uploadScan.villagePlaceholder": "Auto-filled from profile",
  "uploadScan.animalAge": "Animal Age",
  "uploadScan.selectAge": "Select age",
  "uploadScan.age.youngCow": "Young Cow (0-5 years)",
  "uploadScan.age.adultCow": "Adult Cow (5-12 years)",
  "uploadScan.age.agedCow": "Aged Cow (12-20 years)",
  "uploadScan.scanning": "Scanning...",
  "uploadScan.uploadMore": "Upload {{count}} more image(s)",
  "uploadScan.completeChecklist": "Complete checklist",
  "uploadScan.sideRequired": "Side view image is required",
  "uploadScan.uploadAndScan": "Upload and scan",
  "uploadScan.uploadGuide": "Upload requirement",
  "uploadScan.guideText1": "Please upload clear, well-lit cow images so the scan can review visible skin symptoms.",
  "uploadScan.guideText2": "Upload at least 3 images to start the scan. You can add up to 5 images.",
  "uploadScan.multiImageTitle": "Upload cow scan images",
  "uploadScan.multiImageHint": "Upload at least 3 clear cow images to start the scan. You can add up to 5 images.",
  "uploadScan.addMoreImages": "Add or drop more images",
  "uploadScan.selectMultiple": "Select or drop images",
  "uploadScan.dropImageHint": "Drag photos here from your device or browser.",
  "uploadScan.changeImages": "Add more images",
  "uploadScan.dropAddHint": "Add images one by one or several together until you reach 5.",
  "uploadScan.sideView": "Side image",
  "uploadScan.neck": "Neck image",
  "uploadScan.back": "Back image",
  "uploadScan.legs": "Legs image",
  "uploadScan.under": "Under image",
};

const t = (key, fallback, params = {}) => {
  const template = scanText[key] || fallback || key;
  return Object.entries(params).reduce(
    (text, [name, value]) => text.replaceAll(`{{${name}}}`, value),
    template,
  );
};

const scanPageCss = `
  @keyframes scanPageRise {
    from { opacity: 0; transform: translateY(18px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes scanSoftPulse {
    0%, 100% { transform: scale(1); opacity: 0.72; }
    50% { transform: scale(1.05); opacity: 1; }
  }

  .scan-form-shell {
    width: min(1120px, 100%);
    margin: 0 auto;
  }

  .scan-hero {
    position: relative;
    overflow: hidden;
    animation: scanPageRise 520ms ease both;
  }

  .scan-body-panel {
    background: linear-gradient(180deg, var(--card) 0%, var(--background) 100%);
    border: 1px solid var(--app-border);
    border-top: 0;
    border-radius: 0 0 28px 28px;
    padding: 18px;
    box-shadow: var(--app-shadow);
    animation: scanPageRise 560ms ease both;
  }

  .scan-hero::after {
    content: "";
    position: absolute;
    top: 20px;
    right: 34px;
    width: 148px;
    aspect-ratio: 1;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.16);
    box-shadow: 0 0 0 34px rgba(255, 255, 255, 0.08);
    animation: scanSoftPulse 4s ease-in-out infinite;
  }

  .scan-hero > * {
    position: relative;
    z-index: 1;
  }

  .scan-upload-card,
  .scan-form-card,
  .scan-counter-card,
  .scan-error-card,
  .scan-submit-button {
    animation: scanPageRise 560ms ease both;
  }

  .scan-body-panel .scan-upload-card,
  .scan-body-panel .scan-form-card,
  .scan-body-panel .scan-counter-card {
    background: var(--card) !important;
    box-shadow: none !important;
    border-color: var(--app-border) !important;
  }

  .scan-form-stack {
    display: grid;
    grid-template-columns: 1fr;
    gap: 16px;
    margin-bottom: 14px;
  }

  .scan-form-card,
  .scan-upload-card {
    transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease;
  }

  .scan-form-card:hover,
  .scan-upload-card:hover {
    transform: translateY(-1px);
    box-shadow: 0 12px 26px rgba(42, 82, 52, 0.08) !important;
    border-color: rgba(34, 197, 94, 0.32) !important;
  }

  .scan-submit-button {
    display: block;
    width: min(520px, 100%) !important;
    margin: 0 auto;
    box-shadow: 0 18px 34px rgba(22, 101, 52, 0.18);
  }

  .scan-submit-button:not(:disabled):hover {
    transform: translateY(-2px);
    box-shadow: 0 24px 42px rgba(22, 101, 52, 0.24);
  }

  @media (max-width: 640px) {
    .scan-form-shell {
      width: 100%;
    }

    .scan-hero::after {
      right: -34px;
    }

    .scan-body-panel {
      padding: 14px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .scan-hero,
    .scan-upload-card,
    .scan-form-card,
    .scan-counter-card,
    .scan-body-panel,
    .scan-error-card,
    .scan-submit-button,
    .scan-hero::after {
      animation: none;
      transition: none;
    }
  }
`;

const readDroppedText = (item) =>
  new Promise((resolve) => {
    item.getAsString((text) => resolve(text || ""));
  });

const getFileNameFromUrl = (imageUrl, fallbackIndex) => {
  try {
    const parsedUrl = new URL(imageUrl);
    const pathName = parsedUrl.pathname.split("/").filter(Boolean).pop() || "";
    const cleanName = pathName.split("?")[0];
    return cleanName || `dropped-image-${fallbackIndex + 1}.jpg`;
  } catch {
    return `dropped-image-${fallbackIndex + 1}.jpg`;
  }
};

const getDroppedUrls = async (dataTransfer) => {
  const items = Array.from(dataTransfer?.items || []);
  const textItems = items.filter(
    (item) => item.kind === "string" && droppedTextTypes.includes(item.type),
  );

  const textBlocks = await Promise.all(textItems.map(readDroppedText));
  const urls = [];

  textBlocks.forEach((text) => {
    if (!text) return;

    if (text.includes("<img")) {
      const htmlDoc = new DOMParser().parseFromString(text, "text/html");
      htmlDoc.querySelectorAll("img[src]").forEach((img) => {
        urls.push(img.getAttribute("src"));
      });
    }

    text
      .split(/\s+/)
      .map((line) => line.trim())
      .filter((line) => line.startsWith("http"))
      .forEach((line) => urls.push(line));
  });

  return [...new Set(urls.filter(Boolean))];
};

const getFilesFromDrop = async (dataTransfer) => {
  const files = Array.from(dataTransfer?.files || []).filter((file) =>
    file.type.startsWith("image/"),
  );

  if (files.length) return files;

  const urls = await getDroppedUrls(dataTransfer);
  const imageFiles = [];

  for (const imageUrl of urls.slice(0, MAX_SCAN_IMAGES)) {
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    if (!blob.type.startsWith("image/")) continue;

    imageFiles.push(
      new File([blob], getFileNameFromUrl(imageUrl, imageFiles.length), {
        type: blob.type,
      }),
    );
  }

  return imageFiles;
};

const formatMlError = (errorData, uploadedFiles) => {
  const detail = errorData?.detail;
  const fallbackMessage =
    (typeof detail === "string" && detail) ||
    errorData?.message ||
    "ML prediction failed";

  if (!detail || typeof detail !== "object" || !Array.isArray(detail.invalid_images)) {
    return fallbackMessage;
  }

  const invalidDetails = detail.invalid_images
    .map((item) => {
      const file  = uploadedFiles[item.index];
      const slot  = imageSlots[item.index]?.key;
      const label = imageSlotLabels[slot] || `Image ${item.index + 1}`;
      const fileName = file?.name ? ` (${file.name})` : "";
      const reasons =
        Array.isArray(item.failure_reasons) && item.failure_reasons.length
          ? item.failure_reasons.join(", ")
          : "validation failed";
      return `${label}${fileName}: ${reasons}`;
    })
    .join(" | ");

  return invalidDetails
    ? `${detail.message} ${invalidDetails}`
    : detail.message || fallbackMessage;
};

export default function UploadScan() {
  const navigate   = useNavigate();
  const { cowId }  = useParams();
  const language = "en";
  const alertShown = useRef(false);
  const pageTopRef = useRef(null);
  const [showGuide, setShowGuide] = useState(false);

  // ── Initialise village from localStorage immediately ─────────────────────
  const [villageName, setVillageName] = useState(() => {
    const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
    return storedUser.location || storedUser.village || "";
  });

  const [animalAge, setAnimalAge]           = useState("");
  const [calculatedAgeInfo, setCalculatedAgeInfo] = useState(null);

  useEffect(() => {
    if (!alertShown.current) {
      setShowGuide(true);
      alertShown.current = true;
    }

    // Prefill village from stored farmer location (set at sign-in)
    const storedUser    = JSON.parse(localStorage.getItem("user") || "{}");
    const storedVillage = storedUser.location || storedUser.village;

    if (storedVillage) {
      setVillageName(storedVillage);
    } else if (storedUser._id) {
      (async () => {
        try {
          const res  = await fetch(`${APP_API_BASE}/api/user/${storedUser._id}`);
          const data = await res.json();
          if (res.ok) {
            const dbVillage = data.location || data.village || "";
            setVillageName(dbVillage);
            localStorage.setItem("user", JSON.stringify(data));
          }
        } catch (err) {
          console.warn("Unable to fetch user location", err);
        }
      })();
    }
  }, []);

  useEffect(() => {
    if (showGuide && pageTopRef.current) {
      pageTopRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [showGuide]);

  const calculateAgeFromDOB = (dobString) => {
    if (!dobString) return null;
    const dob = new Date(dobString);
    if (Number.isNaN(dob.getTime())) return null;

    const today  = new Date();
    let years    = today.getFullYear() - dob.getFullYear();
    let months   = today.getMonth() - dob.getMonth();
    if (today.getDate() < dob.getDate()) months -= 1;
    if (months < 0) { years -= 1; months += 12; }

    const category =
      years < 5  ? "young_cow" :
      years < 12 ? "adult_cow" :
                   "aged_cow";

    const label =
      category === "young_cow"
        ? t("uploadScan.age.youngCow", "Young Cow (0-5 years)")
        : category === "adult_cow"
        ? t("uploadScan.age.adultCow", "Adult Cow (5-12 years)")
        : t("uploadScan.age.agedCow", "Aged Cow (12-20 years)");

    return { years, months, category, label };
  };

  useEffect(() => {
    if (!cowId) return;
    let active = true;

    (async () => {
      try {
        const response = await fetch(`${APP_API_BASE}/api/cow/${cowId}`);
        if (!response.ok) return;
        const cowData = await response.json();
        const ageInfo = calculateAgeFromDOB(cowData.dateOfBirth);
        if (ageInfo && active) {
          setAnimalAge(ageInfo.category);
          setCalculatedAgeInfo(ageInfo);
        }
      } catch (err) {
        console.warn("Unable to fetch cow DOB for age calculation", err);
      }
    })();

    return () => { active = false; };
  }, [cowId, t]);

  const [images, setImages] = useState({
    side: null, neck: null, back: null, legs: null, under: null,
  });

  const [previewImage, setPreviewImage] = useState(null);

  const [checklist, setChecklist] = useState({
    daylight: false, centered: false, clear: false,
  });

  const [earlySymptoms, setEarlySymptoms] = useState({
    fever: false, milkReduced: false, eatingLess: false,
    discharge: false, vaccinated: false,
  });

  // FIX: default symptomsTouched to true — symptoms section is visible by
  // default and all boxes start unchecked, which is a valid answer (none).
  const [, setSymptomsTouched] = useState(true);

  const [scanError, setScanError] = useState(null);
  const [isScanning, setScanning] = useState(false);

  const ageLockedByDOB = Boolean(calculatedAgeInfo?.category);

  const uploadedCount      = Object.values(images).filter(Boolean).length;
  const checklistCompleted = Object.values(checklist).every(Boolean);
  const hasSideImage       = Boolean(images.side);

  const assignScanFiles = (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;

    const invalidFile = files.find((file) => !allowedScanMimeTypes.has(file.type));
    if (invalidFile) {
      setScanError("Please upload only JPG, JPEG, PNG, or WEBP cow images.");
      return;
    }

    const currentFiles = imageSlots
      .map((slot) => images[slot.key])
      .filter(Boolean);
    const remainingCapacity = MAX_SCAN_IMAGES - currentFiles.length;

    if (remainingCapacity <= 0) {
      setScanError(`You can upload up to ${MAX_SCAN_IMAGES} images only.`);
      return;
    }

    const filesToAdd = files.slice(0, remainingCapacity);
    const nextFiles = [...currentFiles, ...filesToAdd];

    setScanError(
      files.length > remainingCapacity
        ? `Only ${remainingCapacity} more image(s) can be added. Extra images were skipped.`
        : null,
    );
    setImages(
      imageSlots.reduce((nextImages, slot, index) => {
        nextImages[slot.key] = nextFiles[index] || null;
        return nextImages;
      }, {}),
    );

    if (nextFiles.length >= MIN_SCAN_IMAGES) {
      setChecklist({ daylight: true, centered: true, clear: true });
    }
  };

  const handleMultiUpload = (e) => {
    assignScanFiles(e.target.files);
    e.target.value = "";
  };

  const handleMultiDrop = async (e) => {
    e.preventDefault();
    try {
      const droppedFiles = await getFilesFromDrop(e.dataTransfer);
      if (!droppedFiles.length) {
        setScanError(
          "Drop image files here, or use Select multiple images to choose from your device.",
        );
        return;
      }
      assignScanFiles(droppedFiles);
    } catch {
      setScanError(
        "This image could not be imported directly. Please save it first, then upload or drop it here.",
      );
    }
  };

  const removeImage = (part) => {
    setScanError(null);
    setImages((prev) => {
      const remainingFiles = imageSlots
        .filter((slot) => slot.key !== part)
        .map((slot) => prev[slot.key])
        .filter(Boolean);

      return imageSlots.reduce((nextImages, slot, index) => {
        nextImages[slot.key] = remainingFiles[index] || null;
        return nextImages;
      }, {});
    });
  };

  const handleChecklistSelectAll = () => {
    setChecklist({ daylight: true, centered: true, clear: true });
  };

  const handleScan = async () => {
    if (uploadedCount < MIN_SCAN_IMAGES || !checklistCompleted || !hasSideImage) return;

    setScanning(true);
    setScanError(null);

    // Collect all uploaded files in slot order (side first)
    const uploadedFiles = imageSlots
      .map((slot) => images[slot.key])
      .filter(Boolean);

    // Preview URL from side view (or first available)
    const previewUrl = images.side
      ? URL.createObjectURL(images.side)
      : URL.createObjectURL(uploadedFiles[0]);

    const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
    if (!villageName && (storedUser.location || storedUser.village)) {
      setVillageName(storedUser.location || storedUser.village);
    }

    try {
      // ── Step 1: Call ML /predict endpoint ────────────────────────────────
      const mlForm = new FormData();
      uploadedFiles.forEach((file) => mlForm.append("images", file));
      mlForm.append("symptoms_json", JSON.stringify(earlySymptoms));
      mlForm.append("animal_age", animalAge || "");
      mlForm.append("farmer_location", villageName || "");
      mlForm.append("language", language || "en");

      const mlRes = await fetch(`${ML_API_URL}/predict`, {
        method: "POST",
        body: mlForm,
      }).catch(() => {
        throw new Error(
          `Could not connect to the ML scan server at ${ML_API_URL}. Start the Python FastAPI server on port 8000, then scan again.`,
        );
      });

      if (!mlRes.ok) {
        const errorData = await mlRes.json().catch(() => ({}));
        throw new Error(formatMlError(errorData, uploadedFiles));
      }

      const mlData = await mlRes.json();
      const remedies = Array.isArray(mlData.ai_remedies) ? mlData.ai_remedies : [];
      const validationProof = mlData.validation_proof || null;

      // ── Step 2: Try saving to backend (non-blocking) ──────────────────────
      let savedData = {};
      let saveWarning = "";
      try {
        // FIX: build reportDate once so it is available for the saveForm append
        const reportDate = new Date().toLocaleDateString("en-IN", {
          day: "numeric", month: "short", year: "numeric",
        });

        const saveForm = new FormData();
        saveForm.append("cowId",                cowId);
        saveForm.append("lsd_percent",          mlData.lsd_percent);
        saveForm.append("avg_score",            mlData.avg_score);
        saveForm.append("severity",             mlData.severity);
        saveForm.append("daylight",             checklist.daylight);
        saveForm.append("centered",             checklist.centered);
        saveForm.append("clear",                checklist.clear);
        saveForm.append("symptom_fever",        earlySymptoms.fever);
        saveForm.append("symptom_milkReduced",  earlySymptoms.milkReduced);
        saveForm.append("symptom_eatingLess",   earlySymptoms.eatingLess);
        saveForm.append("symptom_discharge",    earlySymptoms.discharge);
        saveForm.append("symptom_vaccinated",   earlySymptoms.vaccinated);
        saveForm.append("villageName",          villageName);
        saveForm.append("animalAge",            animalAge);
        saveForm.append("per_image",            JSON.stringify(mlData.per_image || []));
        saveForm.append("per_image_severity",   JSON.stringify(mlData.per_image_severity || []));
        saveForm.append("visibility_scores",    JSON.stringify(mlData.visibility_scores || []));
        saveForm.append("reportDate",           reportDate);   // FIX: use local var, not savedData
        saveForm.append("remedies",             JSON.stringify(remedies));
        saveForm.append("remedySource",         mlData.ai_advice_source || "");
        saveForm.append("remedyModel",          mlData.ai_advice_model || "");
        saveForm.append("aiAdvice",             mlData.ai_advice || "");
        saveForm.append("aiAdviceSource",       mlData.ai_advice_source || "");
        saveForm.append("aiAdviceModel",        mlData.ai_advice_model || "");
        saveForm.append("mlValidationToken",    validationProof?.token || "");
        saveForm.append("mlValidationExpiresAt", validationProof?.expires_at || "");
        saveForm.append(
          "mlValidationImageHashes",
          JSON.stringify(validationProof?.image_hashes || []),
        );

        imageSlots.forEach(({ key }) => {
          if (images[key]) saveForm.append(key, images[key]);
        });

        const saveRes = await fetch(`${APP_API_BASE}/api/scan/upload`, {
          method: "POST",
          body: saveForm,
        });

        if (!saveRes.ok) {
          const saveError = await saveRes.json().catch(() => ({}));
          throw new Error(saveError.message || "Could not save scan report.");
        }

        savedData = await saveRes.json();
      } catch (_saveErr) {
        console.warn("Backend save failed:", _saveErr);
        saveWarning =
          _saveErr.message ||
          "The scan finished, but the report could not be saved to the backend.";
        savedData = {};
      }

      // ── Step 3: Navigate to result ────────────────────────────────────────
      const savedScan = savedData.scan || {};
      const resultRemedies =
        Array.isArray(savedScan.remedies) && savedScan.remedies.length
          ? savedScan.remedies
          : remedies;

      const resultState = {
        cowId,
        ...savedData,
        // ML fields always win over any backend data
        lsd_percent:        mlData.lsd_percent,
        avg_score:          mlData.avg_score,
        severity:           mlData.severity,
        per_image:          mlData.per_image,
        per_image_severity: mlData.per_image_severity,
        visibility_scores:  mlData.visibility_scores,
        reportDate:
          savedData.reportDate ||
          new Date().toLocaleDateString("en-IN", {
            day: "numeric", month: "short", year: "numeric",
          }),
        village:
          savedData.village ||
          storedUser.village ||
          storedUser.location ||
          "Unknown",
        villageName:    villageName || savedData.villageName,
        animalAge:      animalAge   || savedData.animalAge,
        earlySymptoms: {
          fever:        earlySymptoms.fever,
          milkReduced:  earlySymptoms.milkReduced,
          eatingLess:   earlySymptoms.eatingLess,
          discharge:    earlySymptoms.discharge,
          vaccinated:   earlySymptoms.vaccinated,
        },
        remedies: resultRemedies,
        remedySource: savedScan.remedySource || mlData.ai_advice_source || savedData.remedySource || "",
        remedyModel:  savedScan.remedyModel || mlData.ai_advice_model || savedData.remedyModel || "",
        aiAdvice:     savedScan.aiAdvice || mlData.ai_advice || savedData.aiAdvice || "",
        aiAdviceSource: savedScan.aiAdviceSource || mlData.ai_advice_source || savedData.aiAdviceSource || "",
        aiAdviceModel:  savedScan.aiAdviceModel || mlData.ai_advice_model || savedData.aiAdviceModel || "",
        saveWarning,
        preview:      previewUrl,
        ownerName:    storedUser.name || "",
      };

      navigate(`/scan-result/${cowId}`, { state: resultState });
    } catch (err) {
      console.error(err);
      setScanError(err.message || "Something went wrong. Please try again.");
      setScanning(false);
    }
  };

  return (
    <div style={styles.container} ref={pageTopRef}>
      <style>{scanPageCss}</style>
      <div className="scan-form-shell">
      <div className="scan-hero" style={styles.hero}>
        <button style={styles.backBtn} onClick={() => navigate(-1)}>
          ←
        </button>

        <div>
          <div style={styles.eyebrow}>{t("uploadScan.eyebrow")}</div>
          <h2 style={styles.heroTitle}>{t("uploadScan.title")}</h2>
          <p style={styles.heroText}>{t("uploadScan.heroText")}</p>
        </div>
      </div>

      <div className="scan-body-panel">
      <div style={styles.list}>
        <MultiImageUpload
          images={images}
          uploadedCount={uploadedCount}
          onChange={handleMultiUpload}
          onDrop={handleMultiDrop}
          onRemove={removeImage}
          onPreview={(img) => setPreviewImage(img)}
        />
      </div>

      <div className="scan-form-stack">
      <div className="scan-form-card" style={styles.card}>
        <div style={styles.cardTitle}>{t("uploadScan.checklist")}</div>
        <div style={styles.autoChecklistHint}>
          {t(
            "uploadScan.autoChecklistHint",
            "Photo quality is auto-confirmed after selecting 3 images. You can still change any item.",
          )}
        </div>
        <button
          type="button"
          style={styles.selectAllBtn}
          onClick={handleChecklistSelectAll}
        >
          Select all
        </button>

        <label style={styles.checkRow}>
          <span style={styles.checkText}>{t("uploadScan.daylight")}</span>
          <input
            type="checkbox"
            checked={checklist.daylight}
            onChange={(e) => setChecklist({ ...checklist, daylight: e.target.checked })}
            style={{ transform: "scale(2)", cursor: "pointer" }}
          />
        </label>
        <label style={styles.checkRow}>
          <span style={styles.checkText}>{t("uploadScan.centered")}</span>
          <input
            type="checkbox"
            checked={checklist.centered}
            onChange={(e) => setChecklist({ ...checklist, centered: e.target.checked })}
            style={{ transform: "scale(2)", cursor: "pointer" }}
          />
        </label>
        <label style={styles.checkRow}>
          <span style={styles.checkText}>{t("uploadScan.clear")}</span>
          <input
            type="checkbox"
            checked={checklist.clear}
            onChange={(e) => setChecklist({ ...checklist, clear: e.target.checked })}
            style={{ transform: "scale(2)", cursor: "pointer" }}
          />
        </label>
      </div>

      <div className="scan-form-card" style={styles.card}>
        <div style={styles.cardTitle}>
          {t("uploadScan.earlySymptoms", "Early Symptoms")}
        </div>

        <SymptomRow
          label={t("uploadScan.fever", "Fever?")}
          checked={earlySymptoms.fever}
          onChange={(val) => {
            setSymptomsTouched(true);
            setEarlySymptoms((prev) => ({ ...prev, fever: val }));
          }}
        />
        <SymptomRow
          label={t("uploadScan.milkReduced", "Milk reduced?")}
          checked={earlySymptoms.milkReduced}
          onChange={(val) => {
            setSymptomsTouched(true);
            setEarlySymptoms((prev) => ({ ...prev, milkReduced: val }));
          }}
        />
        <SymptomRow
          label={t("uploadScan.eatingLess", "Eating less?")}
          checked={earlySymptoms.eatingLess}
          onChange={(val) => {
            setSymptomsTouched(true);
            setEarlySymptoms((prev) => ({ ...prev, eatingLess: val }));
          }}
        />
        <SymptomRow
          label={t("uploadScan.discharge", "Eye / nose discharge?")}
          checked={earlySymptoms.discharge}
          onChange={(val) => {
            setSymptomsTouched(true);
            setEarlySymptoms((prev) => ({ ...prev, discharge: val }));
          }}
        />
        <SymptomRow
          label={t("uploadScan.vaccinated", "Vaccinated?")}
          checked={earlySymptoms.vaccinated}
          onChange={(val) => {
            setSymptomsTouched(true);
            setEarlySymptoms((prev) => ({ ...prev, vaccinated: val }));
          }}
        />

        <div style={styles.fieldGroup}>
          <label style={styles.fieldLabel}>
            {t("uploadScan.villageName", "Village Name")}
          </label>
          <div style={styles.inputWrapper}>
            <input
              type="text"
              value={villageName}
              readOnly
              placeholder={t("uploadScan.villagePlaceholder", "Auto-filled from profile")}
              style={styles.textInput}
            />
          </div>
        </div>

        <div style={styles.fieldGroup}>
          <label style={styles.fieldLabel}>
            {t("uploadScan.animalAge", "Animal Age")}
          </label>
          <div style={styles.selectWrapper}>
            <select
              value={animalAge}
              onChange={(e) => setAnimalAge(e.target.value)}
              disabled={ageLockedByDOB}
              style={styles.select}
            >
              <option value="">{t("uploadScan.selectAge", "Select age")}</option>
              <option value="young_cow">{t("uploadScan.age.youngCow", "Young Cow (0-5 years)")}</option>
              <option value="adult_cow">{t("uploadScan.age.adultCow", "Adult Cow (5-12 years)")}</option>
              <option value="aged_cow">{t("uploadScan.age.agedCow", "Aged Cow (12-20 years)")}</option>
            </select>
          </div>
          {calculatedAgeInfo && (
            <div style={styles.ageHint}>
              {`Age auto-calculated from birthdate: ${calculatedAgeInfo.years}y ${calculatedAgeInfo.months}m (${calculatedAgeInfo.label})`}
            </div>
          )}
        </div>
      </div>

      </div>

      <div className="scan-counter-card" style={styles.counterCard}>
        {t(
          "uploadScan.uploadedCounter",
          "Uploaded {{count}} / 3 images required",
          { count: uploadedCount }
        )}
      </div>

      {scanError && <div className="scan-error-card" style={styles.errorCard}>{scanError}</div>}

      <button
        className="scan-submit-button"
        style={{
          ...styles.uploadBtn,
          background:
            uploadedCount >= MIN_SCAN_IMAGES && checklistCompleted && hasSideImage
              ? "linear-gradient(135deg, #219653 0%, #34b566 100%)"
              : "#d1d5db",
          cursor:
            uploadedCount >= MIN_SCAN_IMAGES && checklistCompleted && hasSideImage && !isScanning
              ? "pointer"
              : "not-allowed",
        }}
        disabled={isScanning || uploadedCount < MIN_SCAN_IMAGES || !checklistCompleted || !hasSideImage}
        onClick={handleScan}
      >
        {isScanning ? (
          <span style={styles.scanningInner}>
            <span style={styles.spinner} />
            {t("uploadScan.scanning", "Scanning…")}
          </span>
        ) : uploadedCount < MIN_SCAN_IMAGES ? (
          t("uploadScan.uploadMore", "Upload {{count}} more image(s)", {
            count: MIN_SCAN_IMAGES - uploadedCount,
          })
        ) : !checklistCompleted ? (
          t("uploadScan.completeChecklist")
        ) : !hasSideImage ? (
          t("uploadScan.sideRequired", "Side view image is required")
        ) : (
          t("uploadScan.uploadAndScan")
        )}
      </button>
      </div>
      </div>

      {previewImage && (
        <div style={styles.modal} onClick={() => setPreviewImage(null)}>
          <img src={previewImage} style={styles.modalImage} alt="preview" />
          <button style={styles.modalClose} onClick={() => setPreviewImage(null)}>
            ×
          </button>
        </div>
      )}

      {showGuide && (
        <div style={styles.guideOverlay} onClick={() => setShowGuide(false)}>
          <div style={styles.guideModal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.guideTitle}>{t("uploadScan.uploadGuide")}</div>
            <p style={styles.guideText}>{t("uploadScan.guideText1")}</p>
            <p style={styles.guideText}>{t("uploadScan.guideText2")}</p>
            <button style={styles.guideBtn} onClick={() => setShowGuide(false)}>
              {t("common.ok")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MultiImageUpload({ images, uploadedCount, onChange, onDrop, onRemove, onPreview }) {
  const [isDragging, setIsDragging] = useState(false);
  const selectedImages = imageSlots
    .map((slot) => ({ ...slot, image: images[slot.key] }))
    .filter((slot) => slot.image);
  const hasSelectedImages = selectedImages.length > 0;
  const canAddMoreImages = uploadedCount < MAX_SCAN_IMAGES;
  const showSinglePreview = Boolean(null);
  const image = null;

  const handleDragEnter = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = async (e) => {
    setIsDragging(false);
    await onDrop(e);
  };

  return (
    <div
      className="scan-upload-card"
      style={{
        ...styles.tileCard,
        ...(isDragging ? styles.dragActiveCard : {}),
      }}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div style={styles.multiUploadHeader}>
        <div>
          <div style={styles.tileHeaderTitle}>
            {t("uploadScan.multiImageTitle", "Upload cow scan images")}
          </div>
          <div style={styles.multiUploadHint}>
            {t(
              "uploadScan.multiImageHint",
              "Upload at least 3 clear cow images to start the scan. You can add up to 5 images.",
            )}
          </div>
        </div>
        <span style={styles.countBadge}>{uploadedCount}/{MAX_SCAN_IMAGES}</span>
      </div>

      <label
        style={{
          ...styles.multiUploadBox,
          display: canAddMoreImages ? "flex" : "none",
          minHeight: hasSelectedImages ? "98px" : styles.multiUploadBox.minHeight,
          marginTop: hasSelectedImages ? "12px" : 0,
          ...(isDragging ? styles.multiUploadBoxActive : {}),
        }}
      >
        <input
          type="file"
          accept="image/*"
          multiple
          style={{ display: "none" }}
          onChange={onChange}
        />

        {showSinglePreview ? (
          <div style={styles.previewContainer}>
            <img
              src={URL.createObjectURL(image)}
              alt="preview"
              style={styles.preview}
              onClick={(e) => {
                e.preventDefault();
                if (onPreview) onPreview(URL.createObjectURL(image));
              }}
            />
            <button
              type="button"
              style={styles.removeBtn}
              onClick={(e) => { e.preventDefault(); onRemove(); }}
            >
              ×
            </button>
          </div>
        ) : (
          <div style={styles.uploadContent}>
            <span style={styles.plus}>+</span>
            <span style={styles.uploadText}>
              {hasSelectedImages
                ? t("uploadScan.addMoreImages", "Add or drop more images")
                : t("uploadScan.selectMultiple", "Select or drop images")}
            </span>
            <span style={styles.uploadSubText}>
              {t(
                "uploadScan.dropImageHint",
                "Drag photos here from your device or browser.",
              )}
            </span>
          </div>
        )}
      </label>

      {selectedImages.length > 0 && (
        <>
        <div style={styles.previewGrid}>
          {selectedImages.map(({ key, labelKey, image }) => {
            const previewUrl = URL.createObjectURL(image);
            return (
              <div key={key} style={styles.previewTile}>
                <img
                  src={previewUrl}
                  alt={t(labelKey)}
                  style={styles.preview}
                  onClick={() => {
                    if (onPreview) onPreview(previewUrl);
                  }}
                />
                <div style={styles.previewLabel}>{t(labelKey)}</div>
                <button
                  type="button"
                  style={styles.removeBtn}
                  onClick={() => onRemove(key)}
                >
                  x
                </button>
              </div>
            );
          })}
        </div>
        <label style={styles.changeImagesBtn}>
          <input
            type="file"
            accept="image/*"
            multiple
            style={{ display: "none" }}
            onChange={onChange}
          />
          {t("uploadScan.changeImages", "Add more images")}
        </label>
        <div style={styles.dropReplaceHint}>
          {t(
            "uploadScan.dropAddHint",
            uploadedCount >= MAX_SCAN_IMAGES
              ? "Maximum 5 images added. Remove one to add another."
              : "Add images one by one or several together until you reach 5.",
          )}
        </div>
        </>
      )}
    </div>
  );
}

function SymptomRow({ label, checked, onChange }) {
  return (
    <label style={styles.symptomRow}>
      <span style={styles.symptomLabel}>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={styles.switch}
      />
    </label>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    background: "var(--background)",
    padding: "16px",
    color: "var(--text)",
    fontFamily: "Georgia, 'Times New Roman', serif",
    position: "relative",
  },
  hero: {
    padding: "18px",
    borderRadius: "28px 28px 0 0",
    background: "linear-gradient(135deg, #218a4d 0%, #39b86b 100%)",
    color: "white",
    boxShadow: "0 18px 34px rgba(33, 138, 77, 0.16)",
    marginBottom: 0,
  },
  backBtn: {
    width: "40px",
    height: "40px",
    borderRadius: "14px",
    border: "1px solid rgba(255,255,255,0.2)",
    background: "rgba(255,255,255,0.14)",
    color: "white",
    fontSize: "24px",
    cursor: "pointer",
    marginBottom: "18px",
    padding: 0,
  },
  eyebrow: {
    fontSize: "12px",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    fontWeight: "700",
    opacity: 0.85,
  },
  heroTitle: { margin: "10px 0 6px", fontSize: "28px" },
  heroText: {
    margin: 0,
    fontSize: "14px",
    lineHeight: 1.6,
    color: "rgba(255,255,255,0.88)",
  },
  list: { display: "grid", gap: "12px", marginBottom: "14px" },
  tileCard: {
    background: "rgba(255, 255, 255, 0.72)",
    padding: "16px",
    borderRadius: "18px",
    boxShadow: "none",
    border: "1px solid var(--app-border)",
  },
  card: {
    background: "rgba(255, 255, 255, 0.72)",
    padding: "18px",
    borderRadius: "18px",
    boxShadow: "none",
    border: "1px solid var(--app-border)",
    marginBottom: 0,
  },
  cardTitle: {
    fontSize: "18px",
    fontWeight: "700",
    color: "var(--text)",
    marginBottom: "12px",
  },
  tileHeader: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "10px",
    fontWeight: "700",
    color: "var(--text)",
  },
  multiUploadHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    marginBottom: "12px",
    color: "var(--text)",
  },
  tileHeaderTitle: {
    fontSize: "16px",
    fontWeight: "700",
    marginBottom: "4px",
  },
  multiUploadHint: {
    color: "var(--text-secondary)",
    fontSize: "13px",
    lineHeight: 1.45,
  },
  countBadge: {
    alignSelf: "flex-start",
    minWidth: "52px",
    textAlign: "center",
    borderRadius: "999px",
    background: "var(--success-soft)",
    color: "var(--success-text)",
    fontWeight: "700",
    fontSize: "13px",
    padding: "8px 10px",
  },
  optional: { fontSize: "12px", color: "var(--text-secondary)" },
  uploadBox: {
    border: "2px dashed var(--success-border)",
    borderRadius: "20px",
    minHeight: "150px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(180deg, var(--card) 0%, var(--background) 100%)",
    cursor: "pointer",
  },
  multiUploadBox: {
    border: "2px dashed var(--success-border)",
    borderRadius: "20px",
    minHeight: "150px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(180deg, var(--card) 0%, var(--background) 100%)",
    cursor: "pointer",
  },
  dragActiveCard: {
    borderColor: "var(--success-border)",
    boxShadow: "0 0 0 3px var(--success-soft)",
  },
  multiUploadBoxActive: {
    borderColor: "var(--success-text)",
    background: "var(--success-soft)",
  },
  uploadContent: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "8px",
    color: "var(--text-secondary)",
  },
  plus: {
    width: "42px",
    height: "42px",
    borderRadius: "14px",
    background: "var(--success-soft)",
    color: "var(--success-text)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "28px",
    fontWeight: "700",
  },
  uploadText: { fontSize: "13px", fontWeight: "700" },
  uploadSubText: {
    maxWidth: "240px",
    textAlign: "center",
    color: "var(--text-secondary)",
    fontSize: "12px",
    lineHeight: 1.4,
  },
  previewContainer: { position: "relative", width: "100%", height: "140px" },
  preview: { width: "100%", height: "140px", objectFit: "cover", borderRadius: "18px" },
  previewGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
    gap: "10px",
    marginTop: "12px",
  },
  previewTile: {
    position: "relative",
    minHeight: "174px",
    background: "var(--background)",
    border: "1px solid var(--app-border)",
    borderRadius: "18px",
    padding: "8px",
  },
  previewLabel: {
    marginTop: "8px",
    color: "var(--text)",
    fontSize: "12px",
    fontWeight: "700",
  },
  changeImagesBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginTop: "12px",
    padding: "12px 14px",
    borderRadius: "14px",
    border: "1px solid var(--app-border)",
    background: "var(--background)",
    color: "var(--success-text)",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "700",
  },
  dropReplaceHint: {
    marginTop: "8px",
    color: "var(--text-secondary)",
    fontSize: "12px",
    lineHeight: 1.4,
    textAlign: "center",
  },
  removeBtn: {
    position: "absolute",
    top: "8px",
    right: "8px",
    background: "#ef4444",
    color: "#fff",
    border: "none",
    borderRadius: "50%",
    width: "28px",
    height: "28px",
    cursor: "pointer",
    fontSize: "16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  checkRow: {
    display: "grid",
    gridTemplateColumns: "1fr 30px",
    alignItems: "center",
    background: "var(--background)",
    padding: "14px 16px",
    borderRadius: "16px",
    marginBottom: "10px",
    fontSize: "14px",
    border: "1px solid var(--app-border)",
  },
  checkText: { fontWeight: "700", color: "var(--text)" },
  symptomRow: {
    display: "grid",
    gridTemplateColumns: "1fr 40px",
    alignItems: "center",
    background: "var(--background)",
    padding: "14px 16px",
    borderRadius: "16px",
    marginBottom: "10px",
    fontSize: "14px",
    border: "1px solid var(--app-border)",
  },
  symptomLabel: { fontWeight: "700", color: "var(--text)" },
  switch: { width: "38px", height: "22px", accentColor: "#166534", cursor: "pointer" },
  counterCard: {
    textAlign: "center",
    marginBottom: "12px",
    color: "var(--text-secondary)",
    background: "rgba(255, 255, 255, 0.72)",
    borderRadius: "18px",
    padding: "14px",
    border: "1px solid var(--app-border)",
  },
  errorCard: {
    background: "var(--danger-soft, #fee2e2)",
    color: "var(--danger-text, #991b1b)",
    border: "1px solid var(--danger-border, #ef4444)",
    borderRadius: "16px",
    padding: "12px 16px",
    marginBottom: "12px",
    fontSize: "14px",
    fontWeight: "600",
  },
  uploadBtn: {
    width: "100%",
    padding: "16px",
    border: "none",
    borderRadius: "18px",
    fontSize: "15px",
    fontWeight: "700",
    color: "white",
    transition: "opacity 0.2s",
  },
  selectAllBtn: {
    marginTop: "8px",
    marginBottom: "12px",
    padding: "10px 12px",
    borderRadius: "12px",
    border: "1px solid var(--app-border)",
    background: "var(--background)",
    color: "var(--text)",
    fontWeight: "700",
    cursor: "pointer",
  },
  autoChecklistHint: {
    color: "var(--text-secondary)",
    fontSize: "13px",
    lineHeight: 1.45,
    marginTop: "-4px",
    marginBottom: "10px",
  },
  scanningInner: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
  },
  spinner: {
    display: "inline-block",
    width: "16px",
    height: "16px",
    border: "2px solid rgba(255,255,255,0.4)",
    borderTopColor: "white",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  modal: {
    position: "absolute",
    inset: 0,
    background: "rgba(0,0,0,0.8)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  modalImage: { maxWidth: "90%", maxHeight: "80%", borderRadius: "18px" },
  modalClose: {
    position: "absolute",
    top: "20px",
    right: "20px",
    fontSize: "30px",
    background: "none",
    border: "none",
    color: "#fff",
    cursor: "pointer",
  },
  guideOverlay: {
    position: "absolute",
    inset: 0,
    background: "var(--overlay)",
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "center",
    paddingTop: "72px",
    zIndex: 1200,
    backdropFilter: "blur(4px)",
  },
  guideModal: {
    width: "calc(100% - 32px)",
    background: "linear-gradient(180deg, var(--card) 0%, var(--background) 100%)",
    borderRadius: "24px",
    padding: "20px",
    boxShadow: "0 18px 36px rgba(0,0,0,0.18)",
    border: "1px solid var(--app-border)",
  },
  guideTitle: {
    fontSize: "20px",
    fontWeight: "700",
    color: "var(--text)",
    marginBottom: "12px",
  },
  guideText: { margin: "0 0 12px", color: "var(--text-secondary)", fontSize: "14px", lineHeight: 1.6 },
  guideBtn: {
    width: "100%",
    marginTop: "8px",
    padding: "14px",
    border: "none",
    borderRadius: "16px",
    background: "linear-gradient(135deg, #219653 0%, #34b566 100%)",
    color: "white",
    fontWeight: "700",
    cursor: "pointer",
  },
  fieldGroup: { display: "flex", flexDirection: "column", gap: "6px", marginTop: "12px" },
  fieldLabel: { fontSize: "13px", fontWeight: "700", color: "var(--text)" },
  inputWrapper: {
    background: "var(--background)",
    borderRadius: "14px",
    border: "1px solid var(--app-border)",
    padding: "10px 12px",
  },
  textInput: {
    width: "100%",
    border: "none",
    outline: "none",
    background: "transparent",
    color: "var(--text)",
    fontSize: "14px",
  },
  selectWrapper: {
    borderRadius: "14px",
    border: "1px solid var(--app-border)",
    background: "var(--background)",
    padding: "0 10px",
  },
  select: {
    width: "100%",
    height: "40px",
    border: "none",
    outline: "none",
    background: "transparent",
    color: "var(--text)",
    fontSize: "14px",
  },
  ageHint: { fontSize: "12px", color: "var(--text-secondary)", marginTop: "6px", lineHeight: 1.4 },
};
