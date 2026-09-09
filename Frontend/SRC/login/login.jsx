import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./login.css";
import loginImg from "../image/login-cute-cow.png";
import {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
} from "firebase/auth";
import { auth, provider } from "../firebase";
import { useLanguage } from "../context/useLanguage";
import ReCAPTCHA from "react-google-recaptcha";

const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE) ||
  "http://https://lsdguard-gx3u.onrender.com";
const RECAPTCHA_SITE_KEY =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_RECAPTCHA_SITE_KEY) ||
  "";

export default function Login() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState(null);
  const recaptchaRef = useRef(null);

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
      throw new Error(data.message || "Google login failed");
    }

    localStorage.setItem("user", JSON.stringify(data.user));
    if (data.token) localStorage.setItem("token", data.token);
    navigate("/home");
  };

  useEffect(() => {
    getRedirectResult(auth)
      .then(async (result) => {
        if (result?.user) {
          await completeGoogleAuth(result);
        }
      })
      .catch((error) => {
        console.error("Google Redirect Error:", error);
        alert(error.message || "Google login failed");
      });
  }, [navigate]);

  const handleLogin = async () => {
    if (!email || !password) {
      alert("Please enter email and password");
      return;
    }

    if (!captchaToken) {
      alert(t("auth.invalidCaptcha", "Please complete the reCAPTCHA verification"));
      return;
    }

    const cleanEmail = email.trim().toLowerCase();

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, password, recaptchaToken: captchaToken }),
      });

      const data = await response.json();

      console.log("Response ->", data);

      if (response.ok) {
        localStorage.setItem("user", JSON.stringify(data.user));

        if (data.token) {
          localStorage.setItem("token", data.token);
        }

        navigate("/home");
      } else {
        alert(data.message || "Login failed");
        recaptchaRef.current?.reset();
        setCaptchaToken(null);
      }
    } catch (error) {
      console.error("Login Error ->", error);
      alert("Server error. Please try again.");
      recaptchaRef.current?.reset();
      setCaptchaToken(null);
    } finally {
      setLoading(false);
    }
  };

  const googleLogin = async () => {
    try {
      if (window.innerWidth < 768) {
        await signInWithRedirect(auth, provider);
      } else {
        const result = await signInWithPopup(auth, provider);
        await completeGoogleAuth(result);
      }
    } catch (error) {
      console.error("Google Login Error:", error);
      alert(error.message || "Google login failed");
    }
  };

  return (
    <div className="auth-page auth-login-page auth-desktop-page auth-signin-page">
      <div className="auth-brand">
        <div className="auth-brand-mark">L</div>
        <div>
          <div className="auth-brand-title">LSDGuard</div>
          <div className="auth-brand-sub">{t("auth.brandSub")}</div>
        </div>
      </div>

      <div className="auth-shell auth-login-shell auth-desktop-shell">
        <div className="auth-visual auth-login-visual auth-desktop-visual">
          <div className="auth-scan-window">
            <div className="auth-scan-top">
              <span>{t("auth.welcomeBack")}</span>
              <strong>{t("auth.signInTitle")}</strong>
            </div>
            <div className="auth-hero-wrap">
              <img src={loginImg} className="auth-hero-image" alt="login" />
              <div className="auth-scan-line" />
            </div>
            <div className="auth-floating-chip chip-one">{t("auth.loginPoint1")}</div>
            <div className="auth-floating-chip chip-two">{t("auth.loginPoint2")}</div>
          </div>
          <div className="auth-visual-card">
            <h2>{t("auth.loginVisualTitle")}</h2>
            <p>{t("auth.loginVisualText")}</p>
          </div>

          <div className="auth-points">
            <span>{t("auth.loginPoint1")}</span>
            <span>{t("auth.loginPoint2")}</span>
            <span>{t("auth.loginPoint3")}</span>
          </div>
        </div>

        <div className="auth-panel auth-login-panel auth-desktop-panel">
          <div className="auth-panel-head">
            <p className="auth-kicker">{t("auth.welcomeBack")}</p>
            <h1 className="auth-title">{t("auth.signInTitle")}</h1>
            <p className="auth-subtitle">{t("auth.signInSubtitle")}</p>
          </div>

          <div className="card auth-form-card auth-login-form-card auth-desktop-form-card">
            <div className="field-label">{t("auth.emailAddress")}</div>
            <input
              placeholder={t("auth.emailPlaceholder")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <div className="field-label">{t("auth.password")}</div>
            <div className="password-field">
              <input
                type={showPassword ? "text" : "password"}
                placeholder={t("auth.passwordPlaceholder")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <span
                className="toggle-eye"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? t("auth.hide") : t("auth.show")}
              </span>
            </div>

            <div className="recaptcha-wrap">
              {RECAPTCHA_SITE_KEY ? (
                <ReCAPTCHA
                  ref={recaptchaRef}
                  sitekey={RECAPTCHA_SITE_KEY}
                  onChange={(token) => setCaptchaToken(token)}
                  onExpired={() => setCaptchaToken(null)}
                  onErrored={() => setCaptchaToken(null)}
                />
              ) : (
                <p className="auth-inline-error">
                  Missing VITE_RECAPTCHA_SITE_KEY in the frontend .env file.
                </p>
              )}
            </div>

            <button
              type="button"
              className="forgot-link"
              onClick={() => navigate("/forgot-password")}
            >
              {t("auth.forgotPassword")}
            </button>

            <button className="signin-btn" onClick={handleLogin} disabled={loading}>
              {loading ? "Signing in..." : t("common.signIn")}
            </button>

            <div className="auth-divider">
              <span />
              <p>{t("auth.continueWith")}</p>
              <span />
            </div>

            <button className="google-btn" onClick={googleLogin}>
              {t("auth.continueWithGoogle")}
            </button>

            <p className="auth-switch">
              {t("auth.noAccount")}{" "}
              <span className="auth-link" onClick={() => navigate("/signup")}>
                {t("auth.createAccountLink")}
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
