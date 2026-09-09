import React, { useState, useEffect } from "react";
import "./login.css";
import fallbackSignupImg from "../image/cow.png";
import {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
} from "firebase/auth";
import { auth, provider } from "../firebase";
import emailjs from "@emailjs/browser";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../context/useLanguage";

const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE) ||
  "http://https://lsdguard-gx3u.onrender.com";

export default function Signup() {
  const { t } = useLanguage();
  const signupImg = `${API_BASE}/uploads/COWIMG.png`;
  const [form, setForm] = useState({
    name: "",
    mobile: "",
    email: "",
    village: "",
    lat: null,
    lng: null,
    role: "Farmer",
  });

  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [otpVerified, setOtpVerified] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otpTimer, setOtpTimer] = useState(60);
  const [showResend, setShowResend] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [confirmTouched, setConfirmTouched] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [heroImageSrc, setHeroImageSrc] = useState(signupImg);
  const [locationStatus, setLocationStatus] = useState("");
  const [publicStats, setPublicStats] = useState({
    farmersCount: 0,
    scansCount: 0,
    statesCount: 0,
    accuracyPercent: 95,
  });

  const navigate = useNavigate();

  const resolveGoogleProfile = async (result, credential) => {
    const providerData = Array.isArray(result.user?.providerData)
      ? result.user.providerData[0] || {}
      : {};

    const baseProfile = {
      name: result.user.displayName || providerData.displayName || "",
      email: result.user.email || providerData.email || "",
      photoURL: result.user.photoURL || providerData.photoURL || "",
    };

    if (baseProfile.name) {
      return baseProfile;
    }

    if (!credential?.accessToken) {
      return baseProfile;
    }

    try {
      const response = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: {
          Authorization: `Bearer ${credential.accessToken}`,
        },
      });

      const data = await response.json();

      return {
        name: data.name || baseProfile.name,
        email: data.email || baseProfile.email,
        photoURL: data.picture || baseProfile.photoURL,
      };
    } catch (error) {
      console.error("Google userinfo fetch failed:", error);
      return baseProfile;
    }
  };

  const completeGoogleAuth = async (result) => {
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const googleIdToken = credential?.idToken;
    const firebaseIdToken = await result.user.getIdToken();
    const profile = await resolveGoogleProfile(result, credential);

    if (!googleIdToken && !firebaseIdToken) {
      throw new Error("Missing Google sign-in token");
    }

    const response = await fetch(`${API_BASE}/api/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        idToken: googleIdToken || firebaseIdToken,
        googleIdToken,
        firebaseIdToken,
        profile,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Google signup failed");
    }

    localStorage.setItem("user", JSON.stringify(data.user));
    if (data.token) localStorage.setItem("token", data.token);
    navigate("/home");
  };

  const isValidPassword = (currentPassword) =>
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/.test(currentPassword);

  useEffect(() => {
    getRedirectResult(auth)
      .then(async (result) => {
        if (result?.user) {
          await completeGoogleAuth(result);
        }
      })
      .catch((error) => {
        console.error("Google Redirect Error:", error);
        alert(error.message || "Google signup failed");
      });
  }, [navigate]);

  useEffect(() => {
    let active = true;

    fetch(`${API_BASE}/api/user/platform-stats`)
      .then((response) => response.json())
      .then((data) => {
        if (!active) return;
        setPublicStats({
          farmersCount: Number(data.farmers || 0),
          scansCount: Number(data.scans || 0),
          statesCount: Number(data.states || 0),
          accuracyPercent: Number(data.accuracy || 95),
        });
      })
      .catch((error) => {
        console.error("Public stats load failed:", error);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let interval;
    if (otpSent && otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer((prev) => prev - 1);
      }, 1000);
    }
    if (otpTimer === 0) {
      setShowResend(true);
    }
    return () => clearInterval(interval);
  }, [otpSent, otpTimer]);

  const googleSignup = async () => {
    try {
      if (window.innerWidth < 768) {
        await signInWithRedirect(auth, provider);
      } else {
        const result = await signInWithPopup(auth, provider);
        await completeGoogleAuth(result);
      }
    } catch (error) {
      console.error("Google Signup Error:", error);
      alert(error.message || "Google signup failed");
    }
  };

  const populateLocation = async (lat, lon) => {
    try {
      setLocationStatus("Detecting your area...");
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`,
      );
      const data = await res.json();

      const address = data.address || {};
      const area =
        address.suburb ||
        address.neighbourhood ||
        address.village ||
        address.town ||
        address.city ||
        address.county ||
        address.state ||
        "";

      const city = address.city || address.town || "";

      const locationString = area
        ? `${area}${city && city !== area ? `, ${city}` : ""}`
        : "";

      if (locationString) {
        setForm((prev) => ({
          ...prev,
          village: locationString,
          lat,
          lng: lon,
        }));
        setLocationStatus("");
      } else {
        setForm((prev) => ({ ...prev, lat, lng: lon }));
        setLocationStatus(
          "Location permission allowed, but area name was not found.",
        );
      }
    } catch {
      setLocationStatus("Unable to fetch location.");
    }
  };

  const getLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus("Location is not supported by your browser.");
      return;
    }

    setLocationStatus("Detecting your area...");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        populateLocation(position.coords.latitude, position.coords.longitude);
      },
      () => {
        setLocationStatus("Location permission denied.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  };

  const handleNameChange = (e) => {
    setForm({ ...form, name: e.target.value.replace(/[^A-Za-z\s]/g, "") });
  };

  const handleMobileChange = (e) => {
    setForm({ ...form, mobile: e.target.value.replace(/\D/g, "").slice(0, 10) });
  };

  const handleEmailChange = (e) => {
    setForm({ ...form, email: e.target.value });
  };

  const isValidEmail = (currentEmail) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(currentEmail);
  const canCreateAccount =
    otpVerified &&
    form.name.trim() &&
    form.mobile.length === 10 &&
    form.village.trim() &&
    isValidEmail(form.email) &&
    isValidPassword(password) &&
    confirmPassword &&
    password === confirmPassword;

  const formatCompactNumber = (value) => {
    if (value >= 100000) return `${(value / 100000).toFixed(1).replace(/\.0$/, "")}L+`;
    if (value >= 1000) return `${(value / 1000).toFixed(1).replace(/\.0$/, "")}K+`;
    return `${value}`;
  };

  const sendOtp = () => {
    if (!form.name || !form.mobile || !form.village || !form.email || !isValidEmail(form.email)) {
      alert(t("auth.fillRequiredCorrectly"));
      return;
    }

    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();

    setGeneratedOtp(newOtp);
    setOtpSent(true);
    setOtpTimer(60);
    setShowResend(false);
    setOtp("");

    emailjs.send(
      "service_mj99z0u",
      "template_zui8h1l",
      { to_email: form.email, to_name: form.name || "User", otp: newOtp },
      "DQtGufAKcu7qTOoOA",
    );
  };

  const verifyOtp = () => {
    if (otp.trim() === generatedOtp) {
      setOtpVerified(true);
      setOtpSent(false);
      alert(t("auth.otpVerified"));
    } else {
      alert(t("auth.invalidOtp"));
    }
  };

  const handleSignup = async () => {
    if (!otpVerified) {
      alert(t("auth.verifyOtpFirst"));
      return;
    }

    if (!password || !confirmPassword) {
      alert(t("auth.enterPassword"));
      return;
    }

    if (!isValidPassword(password)) {
      alert(t("auth.passwordRuleAlert"));
      return;
    }

    if (password !== confirmPassword) {
      alert(t("auth.passwordsDoNotMatch"));
      return;
    }

    const userData = {
      name: form.name,
      mobile: form.mobile,
      email: form.email,
      location: form.village,
      lat: form.lat,
      lng: form.lng,
      role: form.role,
      password,
    };

    try {
      const res = await fetch("https://lsdguard-gx3u.onrender.com/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      });

      const data = await res.json();

      if (res.ok) {
        alert(t("auth.accountCreated"));
        localStorage.setItem("user", JSON.stringify(userData));
        navigate("/login");
      } else {
        alert(data.message);
      }
    } catch {
      alert(t("auth.serverError"));
    }
  };

  return (
    <div className="auth-page auth-login-page auth-desktop-page auth-signup-page">
      <div className="auth-brand">
        <div className="auth-brand-mark">L</div>
        <div>
          <div className="auth-brand-title">LSDGuard</div>
          <div className="auth-brand-sub">{t("auth.brandSub")}</div>
        </div>
      </div>

      <div className="auth-shell auth-login-shell auth-desktop-shell signup-shell">
        <div className="auth-visual auth-login-visual auth-desktop-visual signup-visual">
          <div className="auth-scan-window">
            <div className="auth-scan-top">
              <span>{t("common.getStarted")}</span>
              <strong>{t("auth.createAccount")}</strong>
            </div>
            <div className="auth-hero-wrap">
              <img
                src={heroImageSrc}
                className="auth-hero-image"
                alt="signup"
                onError={() => setHeroImageSrc(fallbackSignupImg)}
              />
              <div className="auth-scan-line" />
            </div>
            <div className="auth-floating-chip chip-one">{t("auth.verifyWithOtp")}</div>
            <div className="auth-floating-chip chip-two">{t("auth.farmer")}</div>
          </div>
          <div className="auth-visual-card">
            <h2>{t("auth.signupVisualTitle")}</h2>
            <p>{t("auth.signupVisualText")}</p>
          </div>

          <div className="auth-metric-grid">
            <div><strong>{formatCompactNumber(publicStats.farmersCount)}</strong><span>{t("auth.farmers")}</span></div>
            <div><strong>{formatCompactNumber(publicStats.scansCount)}</strong><span>{t("auth.scans")}</span></div>
            <div><strong>{publicStats.statesCount}</strong><span>{t("auth.states")}</span></div>
            <div><strong>{publicStats.accuracyPercent}%</strong><span>{t("auth.accuracy")}</span></div>
          </div>
        </div>

        <div className="auth-panel auth-login-panel auth-desktop-panel">
          <div className="auth-panel-head">
            <p className="auth-kicker">{t("common.getStarted")}</p>
            <h1 className="auth-title">{t("auth.createAccount")}</h1>
            <p className="auth-subtitle">{t("auth.signupSubtitle")}</p>
          </div>

          <div className="card auth-form-card auth-login-form-card auth-desktop-form-card">
            <div className="field-label">{t("auth.fullName")}</div>
            <input placeholder={t("auth.fullName")} value={form.name} onChange={handleNameChange} />

            <div className="field-label">{t("auth.mobileNumber")}</div>
            <input
              placeholder={t("auth.mobileNumber")}
              value={form.mobile}
              onChange={handleMobileChange}
              maxLength={10}
            />

            <div className="field-label">{t("auth.emailAddress")}</div>
            <input
              placeholder={t("auth.email")}
              value={form.email}
              onChange={handleEmailChange}
              style={{ borderColor: form.email && !isValidEmail(form.email) ? "red" : "" }}
            />

            <div className="field-label">{t("auth.villageArea")}</div>
            <div className="location-box">
              <input
                placeholder={t("auth.villageArea")}
                value={form.village}
                onChange={(e) => {
                  setForm({ ...form, village: e.target.value, lat: null, lng: null });
                  setLocationStatus("");
                }}
              />
              <button type="button" className="loc-btn" onClick={getLocation}>
                {t("auth.useMyLocation")}
              </button>
            </div>
            {locationStatus && (
              <p className="auth-helper-text">{locationStatus}</p>
            )}

            <div className="field-label">{t("common.role")}</div>
            <div className="role-static">
              <span className="role-badge">{t("auth.farmer")}</span>
            </div>

            {form.email.trim() && !otpSent && !otpVerified && (
              <button type="button" className="signin-btn" onClick={sendOtp}>
                {t("auth.verifyWithOtp")}
              </button>
            )}

            {otpSent && !otpVerified && (
              <>
                <div className="field-label">{t("auth.enterOtp")}</div>
                <input
                  placeholder={t("auth.otpPlaceholder")}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                />

                <p className="auth-helper-text">{t("auth.timeRemaining")}: {otpTimer}s</p>

                {showResend && (
                  <button type="button" className="signin-btn" onClick={sendOtp}>
                    {t("auth.resendOtp")}
                  </button>
                )}

                <button type="button" className="signin-btn" onClick={verifyOtp}>
                  {t("auth.verifyOtp")}
                </button>
              </>
            )}

            {otpVerified && (
              <>
                <div className="field-label">{t("auth.createPassword")}</div>
                <div className="password-field">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder={t("auth.createPasswordPlaceholder")}
                    value={password}
                    onChange={(e) => {
                      const nextPassword = e.target.value;
                      setPassword(nextPassword);
                      setPasswordTouched(true);
                      if (!nextPassword) {
                        setConfirmPassword("");
                        setConfirmTouched(false);
                      }
                    }}
                  />
                  <span className="toggle-eye" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? t("auth.hide") : t("auth.show")}
                  </span>
                </div>

                {passwordTouched && !isValidPassword(password) && (
                  <div className="auth-password-rules">
                    <span>{t("auth.passwordRule1")}</span>
                    <span>{t("auth.passwordRule2")}</span>
                    <span>{t("auth.passwordRule3")}</span>
                    <span>{t("auth.passwordRule4")}</span>
                    <span>{t("auth.passwordRule5")}</span>
                  </div>
                )}

                <div className="field-label">{t("auth.confirmPassword")}</div>
                <div className="password-field">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder={t("auth.confirmPasswordPlaceholder")}
                    value={confirmPassword}
                    disabled={!password.trim()}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setConfirmTouched(true);
                    }}
                  />
                  <span className="toggle-eye" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                    {showConfirmPassword ? t("auth.hide") : t("auth.show")}
                  </span>
                </div>

                {confirmTouched && password !== confirmPassword && (
                  <p className="auth-inline-error">{t("auth.passwordMismatchInline")}</p>
                )}
              </>
            )}

            <button type="button" className="google-btn" onClick={googleSignup}>
              {t("auth.continueWithGoogle")}
            </button>

            {otpVerified && (
              <button type="button" className="signup-btn" onClick={handleSignup} disabled={!canCreateAccount}>
                {t("auth.createAccount")}
              </button>
            )}

            <p className="auth-switch">
              {t("auth.alreadyHaveAccount")}{" "}
              <span className="auth-link" onClick={() => navigate("/login")}>
                {t("auth.signInLink")}
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
