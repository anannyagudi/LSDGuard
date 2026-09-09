import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./login.css";
import { useLanguage } from "../context/useLanguage";

const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE) ||
  "http://https://lsdguard-gx3u.onrender.com";
const isStrongPassword = (password) =>
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/.test(String(password || ""));

export default function ForgotPassword() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const passwordMismatch = useMemo(
    () => Boolean(confirmPassword) && password !== confirmPassword,
    [confirmPassword, password],
  );
  const flowSteps = [
    {
      number: "01",
      title: t("auth.emailAddress", "Email Address"),
      text: t(
        "auth.resetFlowEmailText",
        "Enter the email linked to your LSDGuard account to begin the reset.",
      ),
    },
    {
      number: "02",
      title: t("auth.enterVerificationCodeLabel", "Verification Code"),
      text: t(
        "auth.resetFlowCodeText",
        "We send a one-time verification code so only you can continue.",
      ),
    },
    {
      number: "03",
      title: t("auth.createNewPasswordTitle", "Create new password"),
      text: t(
        "auth.resetFlowPasswordText",
        "Set a strong new password and get back into your account securely.",
      ),
    },
  ];

  const handleRequestCode = async () => {
    const trimmedEmail = email.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      alert(t("auth.enterValidResetEmail"));
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/auth/forgot-password/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || t("auth.resetCodeSendFailed"));
      }

      setEmail(trimmedEmail);
      setStep(2);

      if (data.deliveryMode === "dev-otp" && data.otp) {
        alert(
          `${data.message || "Email delivery failed."} Use verification code ${data.otp} to continue.`,
        );
      } else {
        alert(t("auth.resetCodeSent", "Verification code sent to your email"));
      }
    } catch (error) {
      alert(error.message || t("auth.resetCodeSendFailed"));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!otp.trim()) {
      alert(t("auth.enterVerificationCode"));
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/auth/forgot-password/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          otp: otp.trim(),
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || t("auth.invalidResetCode"));
      }

      setStep(3);
      alert(data.message || t("auth.resetCodeVerified"));
    } catch (error) {
      alert(error.message || t("auth.invalidResetCode"));
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!password || !confirmPassword) {
      alert(t("auth.enterPassword"));
      return;
    }

    if (!isStrongPassword(password)) {
      alert(t("auth.passwordRuleAlert"));
      return;
    }

    if (password !== confirmPassword) {
      alert(t("auth.passwordsDoNotMatch"));
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/auth/forgot-password/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          otp: otp.trim(),
          password,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || t("auth.resetPasswordFailed"));
      }

      alert(data.message || t("auth.passwordResetSuccess"));
      navigate("/login");
    } catch (error) {
      alert(error.message || t("auth.resetPasswordFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page forgot-password-page">
      <div className="auth-shell forgot-shell">
        <div className="auth-panel forgot-panel">
          <div className="forgot-stage-shell">
            <div className="auth-brand forgot-brand">
              <div className="auth-brand-mark">L</div>
              <div>
                <div className="auth-brand-title">LSDGuard</div>
                <div className="auth-brand-sub">{t("auth.brandSub", "AI cattle health scanner")}</div>
              </div>
            </div>

            <div className="auth-panel-head">
              <p className="auth-kicker forgot-kicker">{t("auth.forgotPassword", "Forgot password?")}</p>
              <h1 className="auth-title forgot-title">
                {step === 1 && t("auth.forgotPasswordTitle", "Reset your password")}
                {step === 2 && t("auth.verifyResetCodeTitle", "Enter verification code")}
                {step === 3 && t("auth.createNewPasswordTitle", "Create new password")}
              </h1>
              <p className="auth-subtitle forgot-subtitle">
                {step === 1 &&
                  t(
                    "auth.forgotPasswordSubtitle",
                    "Enter your registered email address to receive a verification code.",
                  )}
                {step === 2 &&
                  t(
                    "auth.verifyResetCodeSubtitle",
                    "Type the verification code sent to your email to continue.",
                  )}
                {step === 3 &&
                  t(
                    "auth.createNewPasswordSubtitle",
                    "After verification, set and confirm your new password below.",
                  )}
              </p>
            </div>

            <div className="card auth-form-card forgot-card">
              <div className="reset-steps" aria-label="Password reset steps">
                <span className={step >= 1 ? "active" : ""}>1</span>
                <span className={step >= 2 ? "active" : ""}>2</span>
                <span className={step >= 3 ? "active" : ""}>3</span>
              </div>

              {step === 1 && (
                <div className="forgot-action-block">
                  <div className="forgot-action-head">
                    <span>{t("auth.currentStepLabel", "Step 1 of 3")}</span>
                    <strong>{t("auth.currentStepEmailTitle", "Enter your account email")}</strong>
                    <p>
                      {t(
                        "auth.currentStepEmailText",
                        "Use the email you signed up with so we can send your verification code to the right place.",
                      )}
                    </p>
                  </div>

                  <div className="field-label forgot-field-label">
                    {t("auth.emailAddress", "Email Address")}
                  </div>
                  <input
                    className="forgot-main-input"
                    placeholder={t("auth.emailPlaceholder", "farmer@example.com")}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />

                  <button
                    type="button"
                    className="signin-btn forgot-main-button"
                    onClick={handleRequestCode}
                    disabled={loading}
                  >
                    {loading
                      ? t("common.loading", "Loading...")
                      : t("auth.sendVerificationCode", "Send Verification Code")}
                  </button>
                </div>
              )}

              {step === 2 && (
                <div className="forgot-action-block">
                  <div className="forgot-action-head">
                    <span>{t("auth.currentStepLabel2", "Step 2 of 3")}</span>
                    <strong>{t("auth.currentStepCodeTitle", "Enter the verification code")}</strong>
                    <p>
                      {t(
                        "auth.currentStepCodeText",
                        "Check your inbox for the code we sent, then paste or type it below.",
                      )}
                    </p>
                  </div>

                  <div className="field-label forgot-field-label">
                    {t("auth.emailAddress", "Email Address")}
                  </div>
                  <input className="forgot-main-input" value={email} disabled />

                  <div className="field-label forgot-field-label">
                    {t("auth.enterVerificationCodeLabel", "Verification Code")}
                  </div>
                  <input
                    className="forgot-main-input"
                    placeholder={t("auth.verificationCodePlaceholder", "Enter 6-digit code")}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  />

                  <p className="auth-helper-text forgot-helper-text">
                    {t(
                      "auth.resetCodeSentHint",
                      "Check your inbox, copy the verification code, and enter it here.",
                    )}
                  </p>

                  <button
                    type="button"
                    className="signin-btn forgot-main-button"
                    onClick={handleVerifyCode}
                    disabled={loading}
                  >
                    {loading
                      ? t("common.loading", "Loading...")
                      : t("auth.submitVerificationCode", "Submit Verification Code")}
                  </button>
                </div>
              )}

              {step === 3 && (
                <div className="forgot-action-block">
                  <div className="forgot-action-head">
                    <span>{t("auth.currentStepLabel3", "Step 3 of 3")}</span>
                    <strong>{t("auth.currentStepPasswordTitle", "Create a strong new password")}</strong>
                    <p>
                      {t(
                        "auth.currentStepPasswordText",
                        "Choose a secure password you can remember, then confirm it once more below.",
                      )}
                    </p>
                  </div>

                  <p className="auth-helper-text forgot-helper-text">
                    {t(
                      "auth.newPasswordReadyHint",
                      "Verification completed. Enter your new password and confirm it below.",
                    )}
                  </p>

                  <div className="field-label forgot-field-label">
                    {t("auth.createPassword", "Create Password")}
                  </div>
                  <div className="password-field">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder={t("auth.createPasswordPlaceholder", "Create Password")}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <span className="toggle-eye" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? t("auth.hide", "Hide") : t("auth.show", "Show")}
                    </span>
                  </div>

                  {!isStrongPassword(password) && password && (
                    <div className="auth-error-box">
                      - {t("auth.passwordRule1")}<br />
                      - {t("auth.passwordRule2")}<br />
                      - {t("auth.passwordRule3")}<br />
                      - {t("auth.passwordRule4")}<br />
                      - {t("auth.passwordRule5")}
                    </div>
                  )}

                  <div className="field-label forgot-field-label">
                    {t("auth.confirmPassword", "Confirm Password")}
                  </div>
                  <div className="password-field">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder={t("auth.confirmPasswordPlaceholder", "Confirm Password")}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                    <span
                      className="toggle-eye"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? t("auth.hide", "Hide") : t("auth.show", "Show")}
                    </span>
                  </div>

                  {passwordMismatch && (
                    <p className="auth-inline-error">{t("auth.passwordMismatchInline")}</p>
                  )}

                  <button
                    type="button"
                    className="signup-btn forgot-main-button"
                    onClick={handleResetPassword}
                    disabled={loading}
                  >
                    {loading
                      ? t("common.loading", "Loading...")
                      : t("auth.updatePassword", "Update Password")}
                  </button>
                </div>
              )}

              <button
                type="button"
                className="forgot-link back-link"
                onClick={() => navigate("/login")}
              >
                {t("auth.backToSignIn", "Back to Sign In")}
              </button>
            </div>

            <div className="forgot-flow">
              <div className="forgot-flow-head">
                <p>{t("auth.resetFlowLabel", "What happens next")}</p>
                <h2>{t("auth.resetFlowHeading", "Quick and secure password recovery")}</h2>
              </div>

              <div className="forgot-flow-grid">
                {flowSteps.map((item, index) => (
                  <div
                    key={item.number}
                    className={`forgot-flow-card ${step === index + 1 ? "current" : ""} ${step > index + 1 ? "done" : ""}`}
                  >
                    <span className="forgot-flow-number">{item.number}</span>
                    <strong>{item.title}</strong>
                    <p>{item.text}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="forgot-assurance">
              <div className="forgot-assurance-card">
                <span>{t("auth.resetTrustLabel", "Safe reset")}</span>
                <strong>{t("auth.resetTrustTitle", "Codes expire in 10 minutes")}</strong>
                <p>
                  {t(
                    "auth.resetTrustText",
                    "Each verification code is short-lived to protect your account if someone else sees your email.",
                  )}
                </p>
              </div>

              <div className="forgot-assurance-card muted">
                <span>{t("auth.resetHelpLabel", "Need help?")}</span>
                <strong>{t("auth.resetHelpTitle", "Still not receiving the email?")}</strong>
                <p>
                  {t(
                    "auth.resetHelpText",
                    "Check spam first, then return to sign in or contact support if the problem continues.",
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
