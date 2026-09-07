const axios = require("axios");

const XAI_BASE_URL = "https://api.x.ai/v1";

function getRiskBand(percent) {
  const risk = Number(percent || 0);
  if (risk >= 60) return "High / Severe";
  if (risk >= 35) return "Moderate";
  if (risk > 0) return "Low / Mild";
  return "No visible risk";
}

function buildSymptoms(scan = {}) {
  return {
    fever: Boolean(scan.symptom_fever),
    reducedMilkProduction: Boolean(scan.symptom_milkReduced),
    reducedAppetite: Boolean(scan.symptom_eatingLess),
    eyeOrNoseDischarge: Boolean(scan.symptom_discharge),
    vaccinated: Boolean(scan.symptom_vaccinated),
  };
}

function summarizeImageFindings(scan = {}) {
  const visibilityScores = Array.isArray(scan.visibility_scores)
    ? scan.visibility_scores
    : [];
  const lsdImages = visibilityScores.filter(
    (result) => String(result?.prediction || "").toLowerCase() === "lumpy skin"
  );

  if (!lsdImages.length) {
    return {
      detectedNoduleDensityPercent: 0,
      affectedSkinAreaPercent: 0,
      analyzedImages: visibilityScores.length,
    };
  }

  const average = (key) =>
    Number(
      (
        lsdImages.reduce((sum, result) => sum + Number(result?.[key] || 0), 0) /
        lsdImages.length
      ).toFixed(2)
    );

  return {
    detectedNoduleDensityPercent: average("nodule_density"),
    affectedSkinAreaPercent: average("coverage"),
    patchAreaPercent: average("patch"),
    analyzedImages: visibilityScores.length,
    lumpySkinImages: lsdImages.length,
  };
}

function safeJsonParse(text) {
  if (!text || typeof text !== "string") return null;

  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

function extractResponseText(data = {}) {
  const chatText = data.choices?.[0]?.message?.content;
  if (typeof chatText === "string") return chatText;

  if (typeof data.output_text === "string") return data.output_text;

  if (Array.isArray(data.output)) {
    return data.output
      .flatMap((item) => (Array.isArray(item.content) ? item.content : []))
      .map((content) => content.text || content.summary || "")
      .filter(Boolean)
      .join("\n");
  }

  return "";
}

function normalizeCarePlan(plan = {}, modelName = "") {
  const remedies = Array.isArray(plan.remedies)
    ? plan.remedies
        .map((item) => ({
          title: String(item?.title || "").trim(),
          purpose: String(item?.purpose || "").trim(),
          steps: Array.isArray(item?.steps)
            ? item.steps.map((step) => String(step || "").trim()).filter(Boolean).join(" ")
            : String(item?.steps || "").trim(),
          evidence: String(item?.evidence || item?.warning || "").trim(),
        }))
        .filter((item) => item.title && item.purpose && item.steps)
        .slice(0, 4)
    : [];

  const aiAdvice = [
    plan.immediateRemedySummary || plan.summary,
    plan.isolationAdvice,
    plan.veterinaryRecommendation || plan.vetAdvice,
    plan.nutritionAdvice || plan.feedingCare,
    plan.recoveryMonitoring || plan.monitoringTips,
    plan.medicinesToDiscuss,
  ]
    .map((item) => {
      if (Array.isArray(item)) return item.join(" ");
      return String(item || "").trim();
    })
    .filter(Boolean)
    .join("\n\n");

  return {
    remedies,
    aiAdvice,
    remedySource: "Grok AI",
    remedyModel: modelName,
    aiAdviceSource: "Grok AI",
    aiAdviceModel: modelName,
  };
}

function buildFallbackCarePlan(scan = {}) {
  const risk = Number(scan.lsd_percent || 0);
  const severity = scan.severity || "None";
  const urgent = risk >= 60 || severity === "Severe";
  const moderate = risk >= 35 || severity === "Moderate";
  const location = scan.villageName || "your area";

  return {
    remedies: [
      {
        title: urgent ? "Isolate and call a veterinarian" : "Separate and observe",
        purpose: "Lumpy Skin Disease can spread through biting insects and close contact, so early separation protects the herd.",
        steps: urgent
          ? "Move the cow to a clean shaded area away from healthy cattle. Call the nearest government veterinary hospital or registered large-animal veterinarian today."
          : "Keep the cow in a clean separate space and check skin nodules, temperature, appetite, and milk production twice daily.",
        evidence: "This is first-aid support, not a diagnosis or medicine prescription.",
      },
      {
        title: "Hydration and soft feed",
        purpose: "Sick cattle may eat less and dehydrate faster, especially when fever is present.",
        steps: "Provide clean water at all times. Offer soft, palatable feed and avoid stressful handling or long movement.",
        evidence: "Seek urgent veterinary help if the cow stops eating, becomes weak, or has persistent fever.",
      },
      {
        title: "Clean skin and fly control",
        purpose: "Clean housing and insect control reduce irritation and lower the chance of spread.",
        steps: "Keep bedding dry, remove manure regularly, and use veterinarian-approved fly or tick control around the shed.",
        evidence: "Do not apply harsh chemicals or human medicines on lesions.",
      },
      {
        title: "Protect the herd",
        purpose: "Monitoring nearby cattle helps catch new cases early.",
        steps: "Check other animals for fever, nodules, eye or nose discharge, and reduced milk. Ask a vet in " + location + " about vaccination and outbreak guidance.",
        evidence: "Follow local veterinary advice for vaccination and movement restrictions.",
      },
    ],
    aiAdvice: [
      urgent
        ? "The scan shows high LSD risk. Treat this as urgent first-aid guidance and contact a veterinarian as soon as possible."
        : moderate
          ? "The scan shows a moderate LSD risk. Separate the animal, monitor symptoms closely, and arrange a veterinary review."
          : "The scan shows low visible LSD risk, but continue observation because early symptoms can change quickly.",
      "Avoid self-medicating with antibiotics, injections, steroids, or unknown home mixtures. A veterinarian should decide treatment.",
    ].join("\n\n"),
    remedySource: "LSDGuard care guide",
    remedyModel: "",
    aiAdviceSource: "LSDGuard care guide",
    aiAdviceModel: "",
  };
}

function buildPrompt(scan = {}) {
  const payload = {
    disease: "Lumpy Skin Disease",
    riskScorePercent: Number(scan.lsd_percent || 0),
    severity: scan.severity || "None",
    riskBand: getRiskBand(scan.lsd_percent),
    villageOrLocation: scan.villageName || "Unknown",
    animalAge: scan.animalAge || "Unknown",
    symptoms: buildSymptoms(scan),
    imageFindings: summarizeImageFindings(scan),
  };

  return `
LSDGuard has already completed image analysis and severity calculation. Do not diagnose the disease again.

Use this calculated case context:
${JSON.stringify(payload, null, 2)}

Generate a dynamic farmer-friendly care plan for possible Lumpy Skin Disease.

Rules:
- Keep the total response under 200 words.
- Do not prescribe medicines, injections, antibiotics, steroids, or dosages.
- Medicines must be phrased only as "discuss with a veterinarian".
- Recommend isolation, hygiene, hydration, soft feed, fly/vector control, monitoring, and veterinary consultation.
- Keep advice practical for Indian dairy farmers.
- Return JSON only. No markdown.

Return exactly this JSON shape:
{
  "immediateRemedySummary": "Short summary based on risk and severity.",
  "medicinesToDiscuss": ["Supportive item to discuss with a veterinarian"],
  "isolationAdvice": "Isolation and spread-prevention advice.",
  "veterinaryRecommendation": "When and why to consult a veterinarian.",
  "nutritionAdvice": "Hydration and feeding care advice.",
  "recoveryMonitoring": "What to monitor over the next few days.",
  "remedies": [
    {
      "title": "Short title",
      "purpose": "Why this helps",
      "steps": ["Step 1", "Step 2"],
      "warning": "When to call a veterinarian"
    }
  ]
}
`;
}

async function generateGrokCarePlan(scan) {
  const apiKey = process.env.XAI_API_KEY;
  const modelName = process.env.XAI_MODEL || "grok-4.3";

  if (!apiKey) {
    return buildFallbackCarePlan(scan);
  }

  try {
    const response = await axios.post(
      `${XAI_BASE_URL}/chat/completions`,
      {
        model: modelName,
        messages: [
          {
            role: "system",
            content: "You generate concise veterinary first-aid guidance from already-calculated LSDGuard risk data. You never diagnose or prescribe.",
          },
          {
            role: "user",
            content: buildPrompt(scan),
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.35,
        max_tokens: 900,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        timeout: 30000,
      }
    );

    const text = extractResponseText(response.data);
    const parsed = safeJsonParse(text);

    if (!parsed) {
      throw new Error("Grok returned non-JSON recommendation text.");
    }

    const carePlan = normalizeCarePlan(parsed, modelName);
    return carePlan.remedies.length || carePlan.aiAdvice
      ? carePlan
      : buildFallbackCarePlan(scan);
  } catch (err) {
    console.warn("Grok care plan unavailable:", err.response?.data?.error?.message || err.message);
    return buildFallbackCarePlan(scan);
  }
}

module.exports = {
  buildFallbackCarePlan,
  generateGrokCarePlan,
};
