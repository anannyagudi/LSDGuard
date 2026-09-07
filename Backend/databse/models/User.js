const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    mobile: {
      type: String,
      required: false, // Google users won't have mobile
      default: "",
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    location: {
      type: String,
      required: false, // Google users may not have location
      default: "",
    },

    lat: { type: Number, default: null },
lng: { type: Number, default: null },

    clinicName: { type: String, default: "" },
    rating: { type: Number, default: 0 },
    serviceRadiusKm: { type: Number, default: 120 },

    role: {
      type: String,
      enum: ["Farmer", "Vet"],
      required: false,
      default: "Farmer",
    },

    password: {
      type: String,
      required: false, // Google users have no password
      minlength: 6,
      default: null,
    },

    // OTP fields used for signup/reset verification
    otp: {
      type: String,
    },

    otpExpiry: {
      type: Date,
    },

    profileImage: {
      type: String,
      default: null,
    },

    // ✅ NEW: Google auth fields
    authProvider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },

    googleId: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", userSchema);
