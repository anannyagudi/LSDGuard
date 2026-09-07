const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const rateLimit = require("express-rate-limit");
const User = require("../models/User");
const Scan = require("../models/Scan");

const router = express.Router();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const FIREBASE_API_KEY =
  process.env.FIREBASE_API_KEY || "AIzaSyC5uAW-Ah28oPMtHpSdxkTc_b-R8bm3ARQ";
const EMAILJS_SERVICE_ID = process.env.EMAILJS_SERVICE_ID || "";
const EMAILJS_TEMPLATE_ID =
  process.env.EMAILJS_RESET_TEMPLATE_ID || process.env.EMAILJS_TEMPLATE_ID || "";
const EMAILJS_PUBLIC_KEY = process.env.EMAILJS_PUBLIC_KEY || "";
const EMAILJS_PRIVATE_KEY = process.env.EMAILJS_PRIVATE_KEY || "";
const HAS_SERVER_EMAIL_CONFIG = Boolean(
  EMAILJS_SERVICE_ID && EMAILJS_TEMPLATE_ID && EMAILJS_PUBLIC_KEY,
);
const IS_PRODUCTION = process.env.NODE_ENV === "production";

/* ================= RATE LIMITER ================= */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { message: "Too many requests, please try again later." },
});

/* ================= JWT HELPER ================= */
const generateToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "7d" });

const RESET_OTP_EXPIRY_MS = 10 * 60 * 1000;

const createOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

const isStrongPassword = (password) =>
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/.test(String(password || ""));

const hasValidOtp = (user, otp) =>
  Boolean(
    user &&
      user.otp &&
      user.otpExpiry &&
      String(user.otp) === String(otp || "").trim() &&
      new Date(user.otpExpiry).getTime() > Date.now(),
  );

const sendResetOtpEmail = async ({ email, name, otp }) => {
  const response = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      service_id: EMAILJS_SERVICE_ID,
      template_id: EMAILJS_TEMPLATE_ID,
      user_id: EMAILJS_PUBLIC_KEY,
      ...(EMAILJS_PRIVATE_KEY ? { accessToken: EMAILJS_PRIVATE_KEY } : {}),
      template_params: {
        to_email: email,
        to_name: name || "User",
        otp,
        passcode: otp,
        verification_code: otp,
        app_name: "LSDGuard",
        message: `Your LSDGuard password reset verification code is ${otp}. It expires in 10 minutes.`,
      },
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(detail || "Unable to send reset email");
  }
};

/* ================= SAFE USER RESPONSE ================= */
const safeUser = (user) => ({
  _id: user._id,
  name: user.name,
  mobile: user.mobile,
  email: user.email,
  location: user.location,
  lat: user.lat,
  lng: user.lng,
  role: user.role,
  profileImage: user.profileImage,
  authProvider: user.authProvider,
});

const deriveNameFromEmail = (email) => {
  const localPart = String(email || "").split("@")[0].trim();
  if (!localPart) return "Google User";

  return localPart
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const isFallbackName = (name, email) => {
  const normalizedName = String(name || "").trim().toLowerCase();
  const normalizedFallback = deriveNameFromEmail(email).toLowerCase();
  return !normalizedName || normalizedName === normalizedFallback;
};

const findOrCreateGoogleUser = async ({ googleId, email, name, profileImage }) => {
  const resolvedName = String(name || "").trim() || deriveNameFromEmail(email);
  const resolvedProfileImage = String(profileImage || "").trim();
  let user = await User.findOne({ email });

  if (user) {
    if (isFallbackName(user.name, email) && resolvedName) {
      user.name = resolvedName;
    }
    if (googleId && user.googleId !== googleId) {
      user.googleId = googleId;
    }
    if (resolvedProfileImage) {
      user.profileImage = resolvedProfileImage;
    }
    if (user.authProvider !== "google") {
      user.authProvider = "google";
    }
    await user.save();
    return { user, isNew: false };
  }

  user = new User({
    name: resolvedName,
    email,
    googleId,
    authProvider: "google",
    mobile: "",
    location: "",
    role: "Farmer",
    profileImage: resolvedProfileImage || null,
    password: null,
  });

  await user.save();
  return { user, isNew: true };
};

const verifyGoogleOAuthToken = async (idToken) => {
  if (!idToken) {
    throw new Error("Missing Google OAuth ID token");
  }

  const ticket = await client.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();

  return {
    googleId: payload?.sub,
    email: payload?.email?.trim().toLowerCase(),
    name: payload?.name || "",
    profileImage: payload?.picture || "",
    emailVerified: Boolean(payload?.email_verified),
  };
};

const verifyFirebaseToken = async (idToken) => {
  if (!idToken) {
    throw new Error("Missing Firebase ID token");
  }

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    },
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.error?.message || "Firebase token verification failed");
  }

  const account = Array.isArray(data.users) ? data.users[0] : null;

  if (!account) {
    throw new Error("No Firebase account found for token");
  }

  return {
    googleId: account.localId,
    email: account.email?.trim().toLowerCase(),
    name: account.displayName || "",
    profileImage: account.photoUrl || "",
    emailVerified: Boolean(account.emailVerified),
  };
};

/* ================= SIGNUP ROUTE ================= */
router.post("/signup", authLimiter, async (req, res) => {
  let { name, mobile, email, location, role, password, lat, lng } = req.body;

  email = email?.trim().toLowerCase();

  if (!name || !mobile || !email || !location || !role || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = new User({
      name,
      mobile,
      email,
      location,
      lat: Number.isFinite(Number(lat)) ? Number(lat) : null,
      lng: Number.isFinite(Number(lng)) ? Number(lng) : null,
      role,
      password: hashedPassword,
      authProvider: "local",
    });

    await user.save();
    res.status(201).json({ message: "User registered successfully" });
  } catch (err) {
    console.error("SIGNUP ERROR:", err);
    res.status(500).json({ message: "Signup failed" });
  }
});

/* ================= LOGIN ROUTE ================= */
router.post("/login", authLimiter, async (req, res) => {
  let { email, password } = req.body;

  email = email?.trim().toLowerCase();

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    if (user.authProvider === "google") {
      return res.status(400).json({
        message: "This account uses Google Sign-In. Please use the Google button.",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = generateToken(user._id);

    res.status(200).json({
      message: "Login successful",
      token,
      user: safeUser(user),
    });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    res.status(500).json({ message: "Login failed" });
  }
});

router.post("/forgot-password/request", authLimiter, async (req, res) => {
  let { email } = req.body;

  email = email?.trim().toLowerCase();

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "No account found with this email" });
    }

    if (user.authProvider === "google") {
      return res.status(400).json({
        message: "This account uses Google Sign-In. Please use the Google button.",
      });
    }

    user.otp = createOtp();
    user.otpExpiry = new Date(Date.now() + RESET_OTP_EXPIRY_MS);
    await user.save();

    if (HAS_SERVER_EMAIL_CONFIG) {
      try {
        await sendResetOtpEmail({
          email: user.email,
          name: user.name,
          otp: user.otp,
        });
      } catch (emailError) {
        console.error("FORGOT PASSWORD EMAIL ERROR:", emailError);

        if (IS_PRODUCTION) {
          user.otp = undefined;
          user.otpExpiry = undefined;
          await user.save();
          return res.status(500).json({
            message: "Failed to send verification code email",
          });
        }

        return res.status(200).json({
          message: emailError.message || "Email delivery failed, using development verification code instead",
          expiresInSeconds: RESET_OTP_EXPIRY_MS / 1000,
          deliveryMode: "dev-otp",
          otp: user.otp,
          name: user.name || "User",
        });
      }
    }

    res.status(200).json({
      message: HAS_SERVER_EMAIL_CONFIG
        ? "Verification code sent successfully"
        : "Verification code generated successfully for local development",
      expiresInSeconds: RESET_OTP_EXPIRY_MS / 1000,
      deliveryMode: HAS_SERVER_EMAIL_CONFIG ? "server-emailjs" : "dev-otp",
      otp: HAS_SERVER_EMAIL_CONFIG ? undefined : user.otp,
      name: user.name || "User",
    });
  } catch (err) {
    console.error("FORGOT PASSWORD REQUEST ERROR:", err);
    res.status(500).json({ message: "Failed to generate verification code" });
  }
});

router.post("/forgot-password/verify", authLimiter, async (req, res) => {
  let { email, otp } = req.body;

  email = email?.trim().toLowerCase();
  otp = String(otp || "").trim();

  if (!email || !otp) {
    return res.status(400).json({ message: "Email and verification code are required" });
  }

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "No account found with this email" });
    }

    if (!user.otp || !user.otpExpiry || new Date(user.otpExpiry).getTime() <= Date.now()) {
      user.otp = undefined;
      user.otpExpiry = undefined;
      await user.save();
      return res.status(400).json({ message: "Verification code has expired" });
    }

    if (!hasValidOtp(user, otp)) {
      return res.status(400).json({ message: "Invalid verification code" });
    }

    res.status(200).json({ message: "Verification code verified successfully" });
  } catch (err) {
    console.error("FORGOT PASSWORD VERIFY ERROR:", err);
    res.status(500).json({ message: "Failed to verify code" });
  }
});

router.post("/forgot-password/reset", authLimiter, async (req, res) => {
  let { email, otp, password } = req.body;

  email = email?.trim().toLowerCase();
  otp = String(otp || "").trim();

  if (!email || !otp || !password) {
    return res
      .status(400)
      .json({ message: "Email, verification code and new password are required" });
  }

  if (!isStrongPassword(password)) {
    return res.status(400).json({
      message:
        "Password must be at least 8 characters and include uppercase, lowercase, number and special character",
    });
  }

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "No account found with this email" });
    }

    if (user.authProvider === "google") {
      return res.status(400).json({
        message: "This account uses Google Sign-In. Please use the Google button.",
      });
    }

    if (!user.otp || !user.otpExpiry || new Date(user.otpExpiry).getTime() <= Date.now()) {
      user.otp = undefined;
      user.otpExpiry = undefined;
      await user.save();
      return res.status(400).json({ message: "Verification code has expired" });
    }

    if (!hasValidOtp(user, otp)) {
      return res.status(400).json({ message: "Invalid verification code" });
    }

    user.password = await bcrypt.hash(password, 12);
    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();

    res.status(200).json({ message: "Password reset successful" });
  } catch (err) {
    console.error("FORGOT PASSWORD RESET ERROR:", err);
    res.status(500).json({ message: "Failed to reset password" });
  }
});

/* ================= GOOGLE AUTH ROUTE ================= */
router.post("/google", authLimiter, async (req, res) => {
  const { idToken, googleIdToken, firebaseIdToken, profile: googleProfile } = req.body;
  const primaryToken = googleIdToken || idToken;
  const fallbackToken = firebaseIdToken || idToken;

  if (!primaryToken && !fallbackToken) {
    return res.status(400).json({ message: "ID token is required" });
  }

  try {
    let profile;
    let verificationMode = "google-oauth";

    try {
      profile = await verifyGoogleOAuthToken(primaryToken);
    } catch (googleError) {
      console.warn(
        "Google OAuth verification failed, trying Firebase token:",
        googleError.message,
      );
      profile = await verifyFirebaseToken(fallbackToken);
      verificationMode = "firebase-auth";
    }

    const {
      googleId,
      email,
      name,
      profileImage,
      emailVerified,
    } = {
      ...profile,
      name:
        String(googleProfile?.name || googleProfile?.displayName || "").trim() ||
        profile?.name,
      profileImage:
        String(
          googleProfile?.profileImage ||
            googleProfile?.photoURL ||
            googleProfile?.photoUrl ||
            "",
        ).trim() || profile?.profileImage,
    };

    if (!emailVerified) {
      return res.status(400).json({ message: "Google email is not verified" });
    }

    if (!email || !googleId) {
      return res.status(400).json({ message: "Invalid Google account data" });
    }

    const { user, isNew } = await findOrCreateGoogleUser({
      googleId,
      email,
      name,
      profileImage,
    });
    const token = generateToken(user._id);

    res.status(isNew ? 201 : 200).json({
      message: isNew ? "Google signup successful" : "Google login successful",
      token,
      user: safeUser(user),
      verificationMode,
    });
  } catch (err) {
    console.error("GOOGLE AUTH ERROR:", err);
    res.status(401).json({
      message: "Google authentication failed",
      detail: err.message,
    });
  }
});

/* ================= TEST ROUTE ================= */
router.get("/public-stats", async (_req, res) => {
  try {
    const [farmersCount, scansCount, userLocationRows, scanLocationRows] = await Promise.all([
      User.countDocuments({ role: "Farmer" }),
      Scan.countDocuments(),
      User.find({ location: { $exists: true, $ne: "" } }).select("location -_id"),
      Scan.find({ villageName: { $exists: true, $ne: "" } }).select("villageName -_id"),
    ]);

    const uniqueCities = new Set();
    const pushCityCandidate = (rawLocation) => {
      const normalizedLocation = String(rawLocation || "").trim();
      if (!normalizedLocation) return;

      const parts = normalizedLocation
        .split(",")
        .map((part) => part.trim().toLowerCase())
        .filter(Boolean);

      if (parts.length >= 2) {
        uniqueCities.add(parts[parts.length - 1]);
        return;
      }

      if (parts.length === 1) {
        uniqueCities.add(parts[0]);
      }
    };

    userLocationRows.forEach(({ location }) => pushCityCandidate(location));
    scanLocationRows.forEach(({ villageName }) => pushCityCandidate(villageName));

    res.json({
      farmersCount,
      scansCount,
      citiesCount: uniqueCities.size,
      accuracyPercent: 95,
    });
  } catch (err) {
    console.error("PUBLIC STATS ERROR:", err);
    res.status(500).json({ message: "Failed to load public stats" });
  }
});

router.get("/users", async (_req, res) => {
  try {
    const users = await User.find().select("-password -googleId -otp -otpExpiry");
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

module.exports = router;
