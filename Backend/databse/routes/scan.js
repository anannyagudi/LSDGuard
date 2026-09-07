const express = require("express");
const router = express.Router();
const upload = require("../config/multer");
const cloudinary = require("../config/cloudinary");
const Scan = require("../models/Scan");
const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");
const crypto = require("crypto");
const PDFDocument = require("pdfkit");
const { buildFallbackCarePlan, generateGrokCarePlan } = require("../services/grokService");

const ML_VALIDATION_SECRET =
  process.env.ML_VALIDATION_SECRET || "lsdguard-dev-validation-secret";

const severityPalette = {
  None: { accent: "#22c55e", label: "Low" },
  Mild: { accent: "#eab308", label: "Medium" },
  Moderate: { accent: "#f97316", label: "Moderate" },
  Severe: { accent: "#ef4444", label: "High" },
};

const registeredVets = [
  {
    name: "Dr. Anjali Patil",
    clinic: "Pune Large Animal Care Centre",
    city: "Pune",
    district: "Pune",
    state: "Maharashtra",
    serviceAreas: ["Hinjewadi", "Mulshi", "PCMC", "Pune"],
    phone: "+91 98765 41021",
    rating: 4.8,
  },
  {
    name: "Dr. Ramesh Jadhav",
    clinic: "Maval Bovine Health Clinic",
    city: "Talegaon Dabhade",
    district: "Pune",
    state: "Maharashtra",
    serviceAreas: ["Maval", "Pune", "Hinjewadi"],
    phone: "+91 98220 31844",
    rating: 4.6,
  },
  {
    name: "Dr. K. Srinivas",
    clinic: "Medchal Livestock Clinic",
    city: "Hyderabad",
    district: "Medchal",
    state: "Telangana",
    serviceAreas: ["Hyderabad", "Medchal", "Secunderabad"],
    phone: "+91 98490 55217",
    rating: 4.7,
  },
  {
    name: "Dr. Kavya Rao",
    clinic: "Yelahanka Dairy Animal Clinic",
    city: "Bengaluru",
    district: "Bengaluru Urban",
    state: "Karnataka",
    serviceAreas: ["Bengaluru", "Yelahanka", "Devanahalli"],
    phone: "+91 99005 33661",
    rating: 4.5,
  },
  {
    name: "Dr. Nilesh Parmar",
    clinic: "Sanand Cattle Health Service",
    city: "Ahmedabad",
    district: "Ahmedabad",
    state: "Gujarat",
    serviceAreas: ["Ahmedabad", "Sanand", "Gandhinagar"],
    phone: "+91 98251 77420",
    rating: 4.6,
  },
];

function buildDetectedSigns(severity) {
  if (severity === "Severe") {
    return [
      "Multiple skin lesions likely visible",
      "Urgent isolation recommended",
    ];
  }
  if (severity === "Moderate") {
    return [
      "Elevated body temperature reported",
      "Significant milk production drop",
    ];
  }
  if (severity === "Mild") {
    return [
      "Early skin changes may be present",
      "Continue monitoring for fever or nodules",
    ];
  }
  return [
    "No obvious lumpy skin disease pattern detected",
    "Keep observing the cow over the next few days",
  ];
}

function normalizeRemedies(remedies) {
  if (!Array.isArray(remedies)) return [];

  return remedies
    .map((item) => ({
      title: String(item?.title || "").trim(),
      purpose: String(item?.purpose || "").trim(),
      steps: String(item?.steps || "").trim(),
      evidence: String(item?.evidence || "").trim(),
    }))
    .filter((item) => item.title && item.purpose && item.steps)
    .slice(0, 4);
}

function buildStaticRemedies() {
  return [];
}

function getNearbyVets(locationText = "") {
  const location = (locationText || "").toLowerCase().trim();
  const scored = registeredVets
    .map((vet) => {
      const haystack = [
        vet.city,
        vet.district,
        vet.state,
        ...(vet.serviceAreas || []),
      ]
        .join(" ")
        .toLowerCase();
      const score = haystack.includes(location)
        ? 3
        : location.split(" ").some((word) => word && haystack.includes(word))
          ? 2
          : 0;
      return { vet, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length > 0) return scored.slice(0, 3).map((item) => item.vet);
  return registeredVets.slice(0, 3);
}

function drawSectionTitle(doc, title, color = "#0f172a") {
  doc.moveDown(0.5);
  doc.fontSize(16).fillColor(color).text(title);
  doc.moveDown(0.25);
}

function isRemoteFile(value = "") {
  return /^https?:\/\//i.test(String(value || "").trim());
}

function fetchRemoteBuffer(url) {
  const client = url.startsWith("https://") ? https : http;

  return new Promise((resolve, reject) => {
    client
      .get(url, (response) => {
        if (
          response.statusCode >= 300 &&
          response.statusCode < 400 &&
          response.headers.location
        ) {
          response.resume();
          resolve(fetchRemoteBuffer(response.headers.location));
          return;
        }

        if (response.statusCode !== 200) {
          response.resume();
          reject(new Error(`Failed to fetch image: ${response.statusCode}`));
          return;
        }

        const chunks = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () => resolve(Buffer.concat(chunks)));
      })
      .on("error", reject);
  });
}

function sha256Hex(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function buildValidationSignature(imageHashes, expiresAt) {
  const payload = JSON.stringify({
    expires_at: Number(expiresAt),
    image_hashes: imageHashes,
  });

  return crypto
    .createHmac("sha256", ML_VALIDATION_SECRET)
    .update(payload)
    .digest("hex");
}

async function validateMlProof(req) {
  const uploadsDir = path.join(__dirname, "..", "uploads");
  const token = String(req.body.mlValidationToken || "").trim();
  const expiresAt = Number(req.body.mlValidationExpiresAt || 0);
  const claimedHashes = (() => {
    try {
      const parsed = JSON.parse(req.body.mlValidationImageHashes || "[]");
      return Array.isArray(parsed) ? parsed.map((item) => String(item || "")) : [];
    } catch {
      return [];
    }
  })();

  if (!token || !expiresAt || claimedHashes.length === 0) {
    return { ok: false, message: "Missing ML validation proof. Please scan the cow images again." };
  }

  if (Date.now() / 1000 > expiresAt) {
    return { ok: false, message: "ML validation expired. Please rescan the cow images." };
  }

  const orderedUploads = ["side", "neck", "back", "legs", "under"]
    .map((part) => req.files?.[part]?.[0]?.path)
    .filter(Boolean);

  if (orderedUploads.length < 3 || orderedUploads.length > 5) {
    return { ok: false, message: "Upload between 3 and 5 cow images." };
  }

  if (claimedHashes.length !== orderedUploads.length) {
    return { ok: false, message: "Image validation did not match the uploaded files. Please scan again." };
  }

  const expectedToken = buildValidationSignature(claimedHashes, expiresAt);
  if (expectedToken !== token) {
    return { ok: false, message: "Invalid ML validation proof. Please scan the cow images again." };
  }

  const actualHashes = [];
  for (const fileUrl of orderedUploads) {
    const buffer = isRemoteFile(fileUrl)
      ? await fetchRemoteBuffer(fileUrl)
      : fs.readFileSync(path.join(uploadsDir, path.basename(fileUrl)));
    actualHashes.push(sha256Hex(buffer));
  }

  const hashesMatch =
    actualHashes.length === claimedHashes.length &&
    actualHashes.every((hash, index) => hash === claimedHashes[index]);

  if (!hashesMatch) {
    return {
      ok: false,
      message: "Uploaded images do not match the cow images that passed ML validation. Please upload and scan again.",
    };
  }

  return { ok: true };
}

async function resolvePdfImageSource(fileValue, uploadsDir) {
  const normalized = String(fileValue || "").trim();
  if (!normalized) return null;

  if (isRemoteFile(normalized)) {
    try {
      return await fetchRemoteBuffer(normalized);
    } catch (err) {
      console.warn("Could not fetch remote image for PDF:", normalized, err.message);
      return null;
    }
  }

  const localName = path.basename(normalized);
  const localPath = path.join(uploadsDir, localName);
  if (!fs.existsSync(localPath)) return null;
  return localPath;
}

async function createPdfReport(scanDoc) {
  const uploadsDir = path.join(__dirname, "..", "uploads");
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

  const fileName = `scan-report-${new Date(scanDoc.createdAt || Date.now())
    .toISOString()
    .replace(/[:.]/g, "-")}.pdf`;
  const filePath = path.join(uploadsDir, fileName);

  const doc = new PDFDocument({ autoFirstPage: true, margin: 42 });
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  const severity = scanDoc.severity || "None";
  const palette = severityPalette[severity] || severityPalette.None;
  const riskPercent = Math.round(Number(scanDoc.lsd_percent || 0));
  const stage =
    riskPercent >= 60 ? "Advanced" : riskPercent >= 30 ? "Early" : "Low";
  const reportDate = new Date(scanDoc.createdAt || Date.now()).toLocaleDateString(
    "en-IN",
    { day: "numeric", month: "short", year: "numeric" },
  );
  const village = scanDoc.villageName || "Unknown";
  const symptoms = {
    fever: scanDoc.symptom_fever,
    milkReduced: scanDoc.symptom_milkReduced,
    eatingLess: scanDoc.symptom_eatingLess,
    discharge: scanDoc.symptom_discharge,
    vaccinated: scanDoc.symptom_vaccinated,
  };
  const detectedSigns = buildDetectedSigns(severity);
  const remedies =
    normalizeRemedies(scanDoc.remedies).length > 0
      ? normalizeRemedies(scanDoc.remedies)
      : buildStaticRemedies(severity, symptoms);
  const nearbyVets = getNearbyVets(village);

  doc.roundedRect(30, 24, 535, 745, 24).fillAndStroke("#ffffff", "#dcfce7");
  doc.fillColor("#0f172a");
  doc.fontSize(22).text("Animal Report", 58, 54);

  doc.roundedRect(58, 94, 170, 60, 12).fill("#f3f4f6");
  doc.roundedRect(238, 94, 170, 60, 12).fill("#f3f4f6");
  doc.fillColor("#64748b").fontSize(10).text("Date", 72, 108);
  doc.fillColor("#0f172a").fontSize(13).text(reportDate, 72, 126);
  doc.fillColor("#64748b").fontSize(10).text("Village", 252, 108);
  doc.fillColor("#0f172a").fontSize(13).text(village, 252, 126);

  const previewPart = ["side", "neck", "back", "legs", "under"]
    .map((part) => scanDoc[part])
    .find(Boolean);
  if (previewPart) {
    const previewSource = await resolvePdfImageSource(previewPart, uploadsDir);
    if (previewSource) {
      doc.save();
      doc.roundedRect(58, 170, 350, 160, 18).clip();
      doc.image(previewSource, 58, 170, {
        fit: [350, 160],
        align: "center",
        valign: "center",
      });
      doc.restore();
    }
  }

  doc.roundedRect(58, 344, 350, 96, 18).fill("#f8fafc");
  doc.circle(233, 376, 16).fillColor(palette.accent).fill();
  doc.fillColor(palette.accent).fontSize(20).text(`LSD Risk: ${riskPercent}%`, 58, 395, {
    width: 350,
    align: "center",
  });
  doc.fontSize(12).text(`(${palette.label})`, 58, 420, { width: 350, align: "center" });

  doc.fillColor("#64748b").fontSize(12).text("Stage", 58, 468);
  doc.fillColor("#0f172a").fontSize(13).text(stage, 330, 468, { width: 78, align: "right" });
  doc.fillColor("#64748b").fontSize(12).text("Severity", 58, 498);
  doc.fillColor("#0f172a").fontSize(13).text(severity, 330, 498, { width: 78, align: "right" });

  doc.moveTo(58, 532).lineTo(408, 532).strokeColor("#e5e7eb").stroke();
  doc.fillColor("#0f172a").fontSize(14).text("Detected Signs", 58, 548);
  detectedSigns.forEach((sign, index) => {
    doc.fillColor("#22c55e").fontSize(13).text("✓", 58, 575 + index * 28);
    doc.fillColor("#0f172a").fontSize(12).text(sign, 76, 574 + index * 28, {
      width: 320,
    });
  });

  if (remedies.length > 0) {
    const remedyStartY = 640;
    doc.roundedRect(58, remedyStartY, 350, 120, 18).fillAndStroke("#f0fdf4", "#86efac");
    doc.fillColor("#166534").fontSize(15).text("AI Generated Care Plan", 72, remedyStartY + 16);
    doc.fillColor("#15803d").fontSize(10).text(
      "Temporary first-aid. Consult a veterinarian for treatment.",
      72,
      remedyStartY + 40,
    );

    let currentY = remedyStartY + 68;
    remedies.slice(0, 2).forEach((item, index) => {
      doc.roundedRect(72, currentY, 322, 50, 12).fillAndStroke("#ffffff", "#dcfce7");
      doc.roundedRect(84, currentY + 10, 44, 18, 9).fill("#dcfce7");
      doc.fillColor("#166534").fontSize(9).text(`Step ${index + 1}`, 92, currentY + 15);
      doc.fillColor("#0f172a").fontSize(13).text(item.title, 138, currentY + 12);
      doc.fillColor("#166534").fontSize(10).text(item.purpose, 84, currentY + 32, {
        width: 292,
      });
      currentY += 58;
    });
  }

  doc.addPage();
  drawSectionTitle(doc, "Immediate Actions", "#92400e");
  doc.roundedRect(42, 78, 511, 120, 18).fillAndStroke("#fff7ed", "#fbbf24");
  [
    "Call veterinarian within 12 hours",
    "Isolate the animal immediately from healthy cattle",
    "Apply insect repellent spray to prevent fly transmission",
    "Provide clean, fresh water and soft, palatable feed",
  ].forEach((point, index) => {
    doc.fillColor("#0f172a").fontSize(12).text(point, 58, 100 + index * 24);
  });
  doc.fillColor("#92400e").fontSize(11).text(
    "Immediate care can prevent spread and save this animal.",
    58,
    175,
  );

  drawSectionTitle(doc, "Nearby Veterinary Experts", "#1d4ed8");
  doc.roundedRect(42, 226, 511, 370, 18).fillAndStroke("#e0f2fe", "#bfdbfe");
  doc.fillColor("#1d4ed8").fontSize(10).text(
    "Curated large-animal vets based on your location. Call to confirm availability.",
    58,
    246,
  );

  let vetY = 276;
  nearbyVets.forEach((vet) => {
    doc.roundedRect(58, vetY, 478, 86, 14).fillAndStroke("#ffffff", "#dbeafe");
    doc.fillColor("#0f172a").fontSize(13).text(vet.name, 72, vetY + 14);
    doc.fontSize(11).text(vet.clinic, 72, vetY + 32);
    doc.fillColor("#475569").fontSize(10).text(
      [vet.city, vet.district, vet.state].filter(Boolean).join(" • "),
      72,
      vetY + 50,
    );
    doc.fillColor("#1d4ed8").fontSize(11).text(
      [vet.phone, vet.rating ? `Rating ${vet.rating}/5` : ""].filter(Boolean).join("   "),
      72,
      vetY + 66,
    );
    vetY += 96;
  });

  drawSectionTitle(doc, "Symptom Summary");
  [
    `Fever: ${scanDoc.symptom_fever ? "Yes" : "No"}`,
    `Milk reduced: ${scanDoc.symptom_milkReduced ? "Yes" : "No"}`,
    `Eating less: ${scanDoc.symptom_eatingLess ? "Yes" : "No"}`,
    `Eye or nose discharge: ${scanDoc.symptom_discharge ? "Yes" : "No"}`,
    `Vaccinated earlier: ${scanDoc.symptom_vaccinated ? "Yes" : "No"}`,
    `Average model score: ${Number(scanDoc.avg_score || 0).toFixed(2)}`,
  ].forEach((line) => {
    doc.fillColor("#0f172a").fontSize(11).text(`• ${line}`, { indent: 8 });
    doc.moveDown(0.15);
  });

  const parts = ["side", "neck", "back", "legs", "under"];
  for (const part of parts) {
    const fileValue = scanDoc[part];
    if (!fileValue) continue;

    const imageSource = await resolvePdfImageSource(fileValue, uploadsDir);
    if (!imageSource) continue;

    doc.addPage();
    doc.fontSize(16).text(part.toUpperCase(), { align: "center" });
    doc.moveDown();
    doc.image(imageSource, {
      fit: [500, 400],
      align: "center",
      valign: "center",
    });
  }

  doc.end();

  return new Promise((resolve, reject) => {
    stream.on("finish", async () => {
      try {
        const uploadResult = await cloudinary.uploader.upload(filePath, {
          folder: "uploads/reports",
          resource_type: "raw",
          public_id: path.parse(fileName).name,
          format: "pdf",
        });

        try {
          fs.unlinkSync(filePath);
        } catch (unlinkErr) {
          console.warn("Could not remove local PDF after Cloudinary upload:", unlinkErr.message);
        }

        resolve(uploadResult.secure_url || uploadResult.url);
      } catch (uploadErr) {
        reject(uploadErr);
      }
    });
    stream.on("error", reject);
  });
}

router.post(
"/upload",
upload.fields([
{ name:"side", maxCount:1 },
{ name:"neck", maxCount:1 },
{ name:"back", maxCount:1 },
{ name:"legs", maxCount:1 },
{ name:"under", maxCount:1 }
]),
async(req,res)=>{

try{

const mlProof = await validateMlProof(req);
if (!mlProof.ok) {
  return res.status(400).json({ message: mlProof.message });
}

// helpers to coerce booleans from multipart strings
const toBool = (val) => {
  if (val === true || val === false) return val;
  if (typeof val === "string") return val === "true" || val === "1" || val.toLowerCase() === "yes";
  return false;
};

const scan = new Scan({

cowId:req.body.cowId,

side:req.files?.side?.[0]?.path || null,
neck:req.files?.neck?.[0]?.path || null,
back:req.files?.back?.[0]?.path || null,
legs:req.files?.legs?.[0]?.path || null,
under:req.files?.under?.[0]?.path || null,

lsd_percent:Number(req.body.lsd_percent || 0),
avg_score:Number(req.body.avg_score || 0),
severity:req.body.severity || "None",

daylight: toBool(req.body.daylight),
centered: toBool(req.body.centered),
clear: toBool(req.body.clear),

symptom_fever: toBool(req.body.symptom_fever),
symptom_milkReduced: toBool(req.body.symptom_milkReduced),
symptom_eatingLess: toBool(req.body.symptom_eatingLess),
symptom_discharge: toBool(req.body.symptom_discharge),
symptom_vaccinated: toBool(req.body.symptom_vaccinated),

villageName: req.body.villageName || "",
animalAge: req.body.animalAge || "",

 per_image: (() => {
   try { return JSON.parse(req.body.per_image || "[]"); } catch { return []; }
 })(),
 per_image_severity: (() => {
   try { return JSON.parse(req.body.per_image_severity || "[]"); } catch { return []; }
 })(),
 visibility_scores: (() => {
   try { return JSON.parse(req.body.visibility_scores || "[]"); } catch { return []; }
 })(),
reportDate: req.body.reportDate || ""
,
 remedies: (() => {
   try { return normalizeRemedies(JSON.parse(req.body.remedies || "[]")); } catch { return []; }
 })(),
 remedySource: req.body.remedySource || "",
 remedyModel: req.body.remedyModel || "",
 aiAdvice: req.body.aiAdvice || "",
 aiAdviceSource: req.body.aiAdviceSource || "",
 aiAdviceModel: req.body.aiAdviceModel || ""

});

let grokCarePlan;
try {
  grokCarePlan = await generateGrokCarePlan(scan);
} catch (carePlanErr) {
  console.warn("Grok care plan failed during scan save:", carePlanErr.message);
  grokCarePlan = buildFallbackCarePlan(scan);
}
scan.remedies = normalizeRemedies(grokCarePlan.remedies);
scan.remedySource = grokCarePlan.remedySource || "";
scan.remedyModel = grokCarePlan.remedyModel || "";
scan.aiAdvice = grokCarePlan.aiAdvice || "";
scan.aiAdviceSource = grokCarePlan.aiAdviceSource || "";
scan.aiAdviceModel = grokCarePlan.aiAdviceModel || "";

await scan.save();

 // Generate PDF report and attach filename
 try {
   const pdfName = await createPdfReport(scan);
   scan.reportFile = pdfName;
   await scan.save();
 } catch (pdfErr) {
   console.warn("PDF generation failed", pdfErr);
 }

const savedVisibilityScores = Array.isArray(scan.visibility_scores)
  ? scan.visibility_scores
  : [];
const imageSeverityScores = savedVisibilityScores
  .filter((result) => result.prediction === "Lumpy Skin")
  .map((result) => Number(result.severity_score || 0));
const imageSeverityAverage = imageSeverityScores.length
  ? Number(
      (
        imageSeverityScores.reduce((sum, score) => sum + score, 0) /
        imageSeverityScores.length
      ).toFixed(2)
    )
  : 0;
const savedSymptomScore = Math.min(
  [
    scan.symptom_fever,
    scan.symptom_milkReduced,
    scan.symptom_eatingLess,
    scan.symptom_discharge,
  ].filter(Boolean).length * 25,
  100
);

console.log("\n========== LSDGUARD SCAN EXPLAINABILITY REPORT ==========");
console.log("Purpose  : Backend terminal output for viva/demo");
console.log("Pipeline : EfficientNet-B0 CNN + YOLO lesion analysis + OpenCV patch analysis");
console.log(`Cow ID   : ${scan.cowId}`);
console.log(`Images   : ${["side", "neck", "back", "legs", "under"].filter((part) => req.files?.[part]?.[0]).length}`);
console.log("---------------------------------------------------------");

savedVisibilityScores.forEach((result, index) => {
  console.log(`Image ${index + 1}`);
  console.log(`  CNN Prediction       : ${result.prediction || "Unknown"}`);
  console.log(`  CNN Confidence       : ${Number(result.confidence || 0)}%`);
  console.log(`  YOLO Nodule Density  : ${Number(result.nodule_density || 0)}%`);
  console.log(`  YOLO Coverage Area   : ${Number(result.coverage || 0)}%`);
  console.log(`  OpenCV Patch Area    : ${Number(result.patch || 0)}%`);
  console.log(`  Image Severity Score : ${Number(result.severity_score || 0)}%`);
  console.log("---------------------------------------------------------");
});

console.log("Final Scoring");
console.log(`  Average CNN Confidence : ${scan.avg_score}%`);
console.log(`  Image Severity Score   : ${imageSeverityAverage}%`);
console.log(`  Farmer Symptom Score   : ${savedSymptomScore}%`);
console.log("  Formula                : 40% image severity + 60% symptom score");
console.log(`  Final LSD Risk Score   : ${scan.lsd_percent}%`);
console.log(`  Final Severity Label   : ${scan.severity}`);
console.log(`  Report Date            : ${scan.reportDate || "Not set"}`);
console.log("=========================================================\n");

res.json({
success:true,
message:"Scan saved successfully",
scan
});

}catch(err){

console.error("Scan upload failed:", err.message);
res.status(500).json({
message: err.message || "Upload failed"
});

}

});

router.get("/cow/:cowId", async (req, res) => {

  try {

    const scans = await Scan.find({
      cowId: req.params.cowId   // ✅ FIXED HERE
    }).sort({ createdAt: -1 });

    res.json(scans);

  } catch (err) {

    console.error("SCAN FETCH ERROR:", err);
    res.status(500).json({ message: "Failed to fetch scans" });

  }

});

router.post("/:id/report/regenerate", async (req, res) => {
  try {
    const scan = await Scan.findById(req.params.id);
    if (!scan) {
      return res.status(404).json({ message: "Scan not found" });
    }

    const pdfName = await createPdfReport(scan);
    scan.reportFile = pdfName;
    await scan.save();

    res.json({
      message: "Report regenerated successfully",
      reportFile: pdfName,
    });
  } catch (err) {
    console.error("REPORT REGENERATE ERROR:", err);
    res.status(500).json({ message: "Failed to regenerate report", error: err.message });
  }
});

async function deleteScan(req, res) {
  try {
    const deletedScan = await Scan.findByIdAndDelete(req.params.id);

    if (!deletedScan) {
      return res.status(404).json({ message: "Scan not found" });
    }

    res.json({ message: "Scan deleted successfully" });
  } catch (err) {
    console.error("SCAN DELETE ERROR:", err);
    res.status(500).json({ message: "Failed to delete scan" });
  }
}

router.delete("/:id", deleteScan);
router.post("/:id/delete", deleteScan);

module.exports = router;
