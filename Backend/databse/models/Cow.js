const mongoose = require("mongoose");

// Sub-schema for each individual vaccination slot
const vaccinationSlotSchema = new mongoose.Schema(
  {
    date: { type: String, default: "" },   // "YYYY-MM-DD"
    time: { type: String, default: "" },   // "HH:MM"
    doctor: { type: String, default: "" },
    completed: { type: Boolean, default: false },
  },
  { _id: true }
);

const cowSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    ownerName: {
      type: String,
      required: true,
    },
    cowName: {
      type: String,
      required: true,
    },
    gender: {
      type: String,
      required: true,
    },
    milkProduction: {
      type: Number,
    },
    dateOfBirth: {
      type: Date,
      required: true,
    },
    ageYears: {
      type: Number,
    },
    ageMonths: {
      type: Number,
    },

    vaccinationsDone: {
      type: Number,
      required: true,
      min: 0,
    },
    vaccinationsPending: {
      type: Number,
      required: true,
      min: 0,
    },

    // Legacy single-slot fields — kept for backward compatibility
    pendingVaccinationDate: {
      type: Date,
      default: null,
    },
    pendingVaccinationDoctor: {
      type: String,
      default: "",
    },
    lastVaccinationDate: {
      type: Date,
      default: null,
    },
    lastVaccinationDoctor: {
      type: String,
      default: "",
    },

    // NEW — one entry per pending vaccination
    vaccinationSlots: {
      type: [vaccinationSlotSchema],
      default: [],
    },

    photo: {
      type: String,
      required: true,
      trim: true,
    },
    healthReport: {
      type: String,
    },
    doctorReports: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Cow", cowSchema);
