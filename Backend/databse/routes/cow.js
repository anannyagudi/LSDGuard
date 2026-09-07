const express = require("express");
const Cow = require("../models/Cow");
const User = require("../models/User");
const Scan = require("../models/Scan");
const upload = require("../config/multer");

const router = express.Router();

/* ================= ADD COW ================= */
router.post(
  "/add",
  upload.fields([
    { name: "photo", maxCount: 1 },
    { name: "healthReport", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const {
        userId,
        cowName,
        gender,
        milkProduction,
        dateOfBirth,
        vaccinationsDone,
        vaccinationsPending,
        pendingVaccinationDate,
        pendingVaccinationDoctor,
        lastVaccinationDate,
        lastVaccinationDoctor,
        vaccinationSlots, // NEW — JSON string from frontend
      } = req.body;

      const normalizedCowName = String(cowName || "").trim();
      const normalizedGender = String(gender || "").trim();

      /* ================= VALIDATION ================= */
      if (
        !userId ||
        !normalizedCowName ||
        !normalizedGender ||
        !dateOfBirth ||
        vaccinationsDone === undefined ||
        vaccinationsPending === undefined
      ) {
        return res.status(400).json({ message: "Required fields missing" });
      }

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      /* ================= AGE CALCULATION ================= */
      const dob = new Date(dateOfBirth);
      if (Number.isNaN(dob.getTime())) {
        return res.status(400).json({ message: "Invalid date of birth" });
      }

      const today = new Date();
      let years = today.getFullYear() - dob.getFullYear();
      let months = today.getMonth() - dob.getMonth();
      if (months < 0) {
        years--;
        months += 12;
      }

      /* ================= FILE HANDLING ================= */
      const photoUpload = req.files?.photo?.[0];
      const photoFile = photoUpload?.path || photoUpload?.secure_url || "";
      const photoMime = String(photoUpload?.mimetype || "").toLowerCase();
      if (!photoFile) {
        return res.status(400).json({ message: "Photo is required" });
      }
      if (!photoMime.startsWith("image/")) {
        return res.status(400).json({ message: "Cow photo must be an image file" });
      }

      /* ================= PARSE VACCINATION SLOTS ================= */
      let parsedSlots = [];
      if (vaccinationSlots) {
        try {
          parsedSlots = JSON.parse(vaccinationSlots);
        } catch (e) {
          console.warn("⚠️ Could not parse vaccinationSlots JSON:", e.message);
        }
      }

      /* ================= LEGACY SINGLE DATE ================= */
      const pendingCount = Math.max(0, Number(vaccinationsPending) || 0);
      const parsedPendingDate =
        pendingCount > 0 && pendingVaccinationDate
          ? new Date(pendingVaccinationDate)
          : null;
      const parsedLastVaccinationDate =
        lastVaccinationDate
          ? new Date(lastVaccinationDate)
          : null;

      if (parsedPendingDate && Number.isNaN(parsedPendingDate.getTime())) {
        return res.status(400).json({ message: "Invalid pending vaccination date" });
      }
      if (parsedLastVaccinationDate && Number.isNaN(parsedLastVaccinationDate.getTime())) {
        return res.status(400).json({ message: "Invalid last vaccination date" });
      }

      /* ================= CREATE COW ================= */
      const newCow = new Cow({
        owner: user._id,
        ownerName: user.name,
        cowName: normalizedCowName,
        gender: normalizedGender,
        milkProduction: normalizedGender === "Female" ? Number(milkProduction) : 0,
        dateOfBirth: new Date(dateOfBirth),
        ageYears: years,
        ageMonths: months,
        vaccinationsDone: Math.max(0, Number(vaccinationsDone) || 0),
        vaccinationsPending: pendingCount,
        pendingVaccinationDate: parsedPendingDate,
        pendingVaccinationDoctor:
          pendingCount > 0 ? (pendingVaccinationDoctor || "").trim() : "",
        lastVaccinationDate: parsedLastVaccinationDate,
        lastVaccinationDoctor: (lastVaccinationDoctor || "").trim(),
        vaccinationSlots: parsedSlots,
        photo: photoFile,
        healthReport: req.files?.healthReport
          ? req.files.healthReport[0].path
          : null,
      });

      await newCow.save();
      console.log(`Cow saved: ${newCow.cowName}`);
      res.status(201).json(newCow);
    } catch (err) {
      console.error("❌ ADD COW ERROR:", err);
      res.status(500).json({ message: "Failed to add cow", error: err.message });
    }
  }
);

/* ================= GET USER COWS ================= */
router.get("/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).select("name");
    const query = user
      ? {
          $or: [
            { owner: user._id },
            { owner: userId },
            { ownerName: user.name },
          ],
        }
      : { owner: userId };

    const cows = await Cow.find(query).sort({ createdAt: -1 });
    // Backfill doctorReports with existing healthReport if missing
    const saveOps = [];
    cows.forEach((c) => {
      if (c.healthReport && (!Array.isArray(c.doctorReports) || c.doctorReports.length === 0)) {
        c.doctorReports = [c.healthReport];
        saveOps.push(c.save());
      }
    });
    if (saveOps.length) await Promise.all(saveOps);
    res.status(200).json(cows);
  } catch (err) {
    console.error("❌ FETCH ERROR:", err);
    res.status(500).json({ message: "Failed to fetch cows" });
  }
});

/* ================= GET SINGLE COW ================= */
router.get("/:id", async (req, res) => {
  try {
    const cow = await Cow.findById(req.params.id);
    if (!cow) return res.status(404).json({ message: "Cow not found" });
    if (cow.healthReport && (!Array.isArray(cow.doctorReports) || cow.doctorReports.length === 0)) {
      cow.doctorReports = [cow.healthReport];
      await cow.save();
    }
    res.json(cow);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ================= UPLOAD/ADD DOCTOR REPORT ================= */
router.post(
  "/:id/report",
  upload.fields([
    { name: "report", maxCount: 1 },
    { name: "healthReport", maxCount: 1 },
    { name: "file", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const cow = await Cow.findById(req.params.id);
      if (!cow) return res.status(404).json({ message: "Cow not found" });

      const fileField =
        req.files?.report?.[0] ||
        req.files?.healthReport?.[0] ||
        req.files?.file?.[0];

      if (!fileField) {
        return res.status(400).json({ message: "No report file provided" });
      }

      const previousPrimary = cow.healthReport;
      const fileUrl = fileField.path;
      cow.healthReport = fileUrl;
      if (!Array.isArray(cow.doctorReports)) cow.doctorReports = [];
      // seed with previous primary if missing
      if (previousPrimary && !cow.doctorReports.includes(previousPrimary)) {
        cow.doctorReports.push(previousPrimary);
      }
      if (!cow.doctorReports.includes(fileUrl)) {
        cow.doctorReports.push(fileUrl);
      }
      await cow.save();

      res.status(200).json({
        message: "Report uploaded",
        healthReport: cow.healthReport,
        doctorReports: cow.doctorReports,
      });
    } catch (err) {
      console.error("UPLOAD REPORT ERROR:", err);
      res
        .status(500)
        .json({ message: "Failed to upload report", error: err.message });
    }
  },
);

async function deleteReport(req, res) {
  try {
    const cow = await Cow.findById(req.params.id);
    if (!cow) return res.status(404).json({ message: "Cow not found" });

    const filename = String(
      req.query.filename || req.body?.filename || cow.healthReport || "",
    ).trim();
    if (!filename) {
      return res.status(400).json({ message: "No report available to delete" });
    }

    const currentReports = Array.isArray(cow.doctorReports)
      ? cow.doctorReports.filter(Boolean)
      : [];

    cow.doctorReports = currentReports.filter((report) => report !== filename);

    if (cow.healthReport === filename) {
      cow.healthReport = cow.doctorReports[0] || null;
    }

    await cow.save();

    res.status(200).json({
      message: "Report deleted",
      healthReport: cow.healthReport,
      doctorReports: cow.doctorReports,
    });
  } catch (err) {
    console.error("DELETE REPORT ERROR:", err);
    res.status(500).json({ message: "Failed to delete report", error: err.message });
  }
}

/* ================= DELETE CURRENT/SELECTED REPORT ================= */
router.delete("/:id/report", deleteReport);
router.post("/:id/report/delete", deleteReport);

/* ================= SCHEDULE VACCINATION ================= */
// Now accepts full vaccinationSlots array as well as legacy fields
router.put("/:id/vaccination/schedule", async (req, res) => {
  try {
    const {
      pendingVaccinationDate,
      pendingVaccinationDoctor,
      vaccinationsPending,
      vaccinationSlots, // NEW — array of { date, time, doctor }
    } = req.body;

    const cow = await Cow.findById(req.params.id);
    if (!cow) return res.status(404).json({ message: "Cow not found" });

    const nextPendingCount =
      vaccinationsPending !== undefined
        ? Math.max(0, Number(vaccinationsPending) || 0)
        : cow.vaccinationsPending;

    cow.vaccinationsPending = nextPendingCount;
    cow.pendingVaccinationDoctor =
      nextPendingCount > 0 ? (pendingVaccinationDoctor || "").trim() : "";
    cow.pendingVaccinationDate =
      nextPendingCount > 0 && pendingVaccinationDate
        ? new Date(pendingVaccinationDate)
        : null;

    // Save slots array if provided
    if (Array.isArray(vaccinationSlots)) {
      cow.vaccinationSlots = vaccinationSlots;
    }

    await cow.save();
    res.status(200).json(cow);
  } catch (err) {
    console.error("❌ SCHEDULE ERROR:", err);
    res.status(500).json({ message: "Failed to update vaccination" });
  }
});

/* ================= COMPLETE ONE VACCINATION SLOT ================= */
// Marks the earliest incomplete slot as done and decrements pending count
router.put("/:id/vaccination/complete", async (req, res) => {
  try {
    const cow = await Cow.findById(req.params.id);
    if (!cow) return res.status(404).json({ message: "Cow not found" });

    if (Number(cow.vaccinationsPending || 0) <= 0) {
      return res.status(400).json({ message: "No pending vaccinations" });
    }

    // Mark the first incomplete slot as completed
    const slotIndex = cow.vaccinationSlots.findIndex((s) => !s.completed);
    if (slotIndex !== -1) {
      cow.vaccinationSlots[slotIndex].completed = true;
    }

    cow.vaccinationsDone = Math.max(0, Number(cow.vaccinationsDone || 0)) + 1;
    cow.vaccinationsPending = Math.max(0, Number(cow.vaccinationsPending || 0) - 1);

    // Advance legacy fields to the next pending slot (if any)
    const nextSlot = cow.vaccinationSlots.find((s) => !s.completed);
    if (nextSlot) {
      const combinedDate =
        nextSlot.date && nextSlot.time
          ? new Date(`${nextSlot.date}T${nextSlot.time}`)
          : null;
      cow.pendingVaccinationDate = combinedDate;
      cow.pendingVaccinationDoctor = nextSlot.doctor || "";
    } else {
      cow.pendingVaccinationDate = null;
      cow.pendingVaccinationDoctor = "";
    }

    await cow.save();
    res.status(200).json(cow);
  } catch (err) {
    console.error("❌ COMPLETE ERROR:", err);
    res.status(500).json({ message: "Failed to complete vaccination" });
  }
});

/* ================= DELETE COW ================= */
router.delete("/:id", async (req, res) => {
  try {
    const cowId = req.params.id;
    const cow = await Cow.findById(cowId);
    if (!cow) return res.status(404).json({ message: "Cow not found" });

    await Cow.findByIdAndDelete(cowId);
    await Scan.deleteMany({ cowId });

    res.status(200).json({ message: "Cow deleted successfully" });
  } catch (err) {
    console.error("❌ DELETE ERROR:", err);
    res.status(500).json({ message: "Delete failed" });
  }
});

module.exports = router;
