import "./App.css";
import cow from "../Frontend/SRC/image/cow.png";

import {
  BrowserRouter as Router,
  Routes,
  Route,
  useNavigate,
  useLocation,
  useParams,
} from "react-router-dom";

import { useEffect, useRef, useState } from "react";
import ReCAPTCHA from "react-google-recaptcha";
import {
  Activity,
  ArrowRight,
  BellRing,
  Camera,
  CheckCircle2,
  FileText,
  HeartPulse,
  MapPinned,
  ShieldCheck,
  Stethoscope,
  Upload,
} from "lucide-react";

import Home from "../Frontend/page/home.jsx";
import OutbreakPage from "../Frontend/page/OutbreakPage.jsx";
import AddCow from "../Frontend/page/addcow.jsx";
import UploadScan from "../Frontend/page/UploadScan.jsx";
import ViewAllCows from "../Frontend/page/ViewAllCow.jsx";
import CowDetails from "../Frontend/page/CowDetails.jsx";
import PastHistory from "../Frontend/page/PastHistory.jsx";
import VaccinationTracker from "../Frontend/page/VaccinationTracker.jsx";
import ContactSupport from "../Frontend/page/ContactSupport.jsx";
import AboutUs from "../Frontend/page/AboutUs.jsx";

const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE) ||
  "http://localhost:5000";
const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    return {};
  }
};
const RECAPTCHA_SITE_KEY =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_RECAPTCHA_SITE_KEY) ||
  "";
const isStrongPassword = (value) =>
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/.test(String(value || ""));

const text = {
  "landing.subtitle": "AI cattle health scanner",
  "landing.badge": "Smart support for early LSD awareness",
  "landing.heading1": "Protect your herd with",
  "landing.heading2": "LSDGuard",
  "landing.text": "Scan symptoms, track cattle records, and keep daily farm health work organized.",
  "landing.liveScan": "Live Scan",
  "landing.match": "AI Ready",
  "landing.analyzing": "Analyzing skin pattern",
  "landing.offerTitle": "What LSDGuard offers",
  "landing.offerHeading": "Simple tools for cattle health tracking",
  "landing.feature1Title": "Early awareness",
  "landing.feature1Text": "Record visible symptoms and keep scan history in one place.",
  "landing.feature2Title": "Health activity",
  "landing.feature2Text": "Follow cow profiles, reports, and recent checks.",
  "landing.feature3Title": "Reminders",
  "landing.feature3Text": "Use notifications to stay aware of vaccination tasks.",
  "landing.howTitle": "How it works",
  "landing.howHeading": "Three quick steps",
  "landing.step1Title": "Upload image",
  "landing.step1Text": "Capture or upload a clear cow skin image.",
  "landing.step2Title": "Add details",
  "landing.step2Text": "Attach cow and location information.",
  "landing.step3Title": "Review result",
  "landing.step3Text": "Use the report to decide the next action.",
  "landing.whyTitle": "Why use it",
  "landing.whyHeading": "Built for daily farm use",
  "landing.list1Title": "Focused records",
  "landing.list1Text": "Cow profiles and reports stay organized.",
  "landing.list2Title": "Fast access",
  "landing.list2Text": "Important actions are easy to reach.",
  "landing.list3Title": "Practical tracking",
  "landing.list3Text": "Vaccination and scan work can be followed over time.",
  "landing.readyLabel": "Ready",
  "landing.readyHeading": "Start protecting your cattle today",
  "common.getStarted": "Get Started",
  "common.signIn": "Sign In",
};

function t(key, fallback) {
  return text[key] || fallback || key;
}

function Landing() {
  const navigate = useNavigate();

  useEffect(() => {
    const landing = document.querySelector(".lsd-landing");
    const revealItems = document.querySelectorAll(".lsd-reveal");

    if (!("IntersectionObserver" in window)) {
      revealItems.forEach((item) => item.classList.add("is-visible"));
      return undefined;
    }

    landing?.classList.add("lsd-js-reveal");

    const revealVisibleItems = () => {
      revealItems.forEach((item) => {
        const rect = item.getBoundingClientRect();
        const triggerPoint = window.innerHeight * 0.92;

        if (rect.top < triggerPoint && rect.bottom > 0) {
          item.classList.add("is-visible");
        }
      });
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.05, rootMargin: "0px 0px -8% 0px" },
    );

    revealItems.forEach((item) => observer.observe(item));
    revealVisibleItems();
    window.addEventListener("scroll", revealVisibleItems, { passive: true });
    window.addEventListener("resize", revealVisibleItems);

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", revealVisibleItems);
      window.removeEventListener("resize", revealVisibleItems);
      landing?.classList.remove("lsd-js-reveal");
    };
  }, []);

  return (
    <div className="lsd-landing">
      <header className="lsd-nav">
        <button className="lsd-brand" onClick={() => navigate("/")}>
          <span className="lsd-brand-mark">
            <HeartPulse size={22} />
          </span>
          <div>
            <strong>LSDGuard</strong>
            <small>{t("landing.subtitle")}</small>
          </div>
        </button>

        <nav className="lsd-nav-links" aria-label="Landing navigation">
          <a href="#features">Features</a>
          <a href="#how">How it works</a>
          <a href="#trust">Trust</a>
        </nav>

        <div className="lsd-nav-actions">
          <button className="lsd-icon-btn" aria-label="Theme">
            <ShieldCheck size={18} />
          </button>
          <button className="lsd-ghost-btn" onClick={() => navigate("/login")}>
            {t("common.signIn")}
          </button>
          <button className="lsd-primary-btn small" onClick={() => navigate("/signup")}>
            Start free
          </button>
        </div>
      </header>

      <section className="lsd-hero">
        <div className="lsd-hero-copy">
          <div className="lsd-pill">
            <span>✦</span>
            AI-powered cattle health protection
          </div>

          <h1>
            Detect early signs.
            <span> Protect your herd.</span>
          </h1>

          <p>
            LSDGuard helps farmers upload cow skin images, review disease risk,
            track cattle records, and stay ready with vaccination reminders.
          </p>

          <div className="lsd-hero-actions">
            <button className="lsd-primary-btn" onClick={() => navigate("/signup")}>
              Get started free
              <ArrowRight size={19} />
            </button>
            <button className="lsd-outline-btn" onClick={() => navigate("/login")}>
              Sign in
            </button>
          </div>

          <div className="lsd-check-row">
            <span><CheckCircle2 size={15} /> No complex setup</span>
            <span><CheckCircle2 size={15} /> Farmer-friendly reports</span>
            <span><CheckCircle2 size={15} /> Built for daily care</span>
          </div>
        </div>

        <div className="lsd-hero-visual" aria-label="LSDGuard scan preview">
          <div className="lsd-scan-card">
            <div className="lsd-scan-top">
              <div>
                <span>Live Skin Scan</span>
                <strong>Confidence 94%</strong>
              </div>
              <div className="lsd-status-dot" />
            </div>

            <div className="lsd-cow-stage">
              <img src={cow} alt="Cow scan preview" />
              <div className="lsd-scan-beam" />
              <div className="lsd-tag lsd-tag-risk">Risk review active</div>
              <div className="lsd-tag lsd-tag-report">Report ready</div>
            </div>

            <div className="lsd-progress-card">
              <div>
                <span>Skin pattern analysis</span>
                <strong>Scanning image quality</strong>
              </div>
              <div className="lsd-progress-track">
                <span />
              </div>
            </div>
          </div>

          <div className="lsd-floating-note note-one">
            <BellRing size={18} />
            Vaccination reminder set
          </div>
          <div className="lsd-floating-note note-two">
            <FileText size={18} />
            Health report saved
          </div>
        </div>
      </section>

      <section className="lsd-stats" aria-label="Platform highlights">
        <div className="lsd-reveal" style={{ "--reveal-delay": "0ms" }}>
          <strong>3-step</strong>
          <span>scan workflow</span>
        </div>
        <div className="lsd-reveal" style={{ "--reveal-delay": "90ms" }}>
          <strong>24/7</strong>
          <span>health access</span>
        </div>
        <div className="lsd-reveal" style={{ "--reveal-delay": "180ms" }}>
          <strong>AI</strong>
          <span>assisted review</span>
        </div>
        <div className="lsd-reveal" style={{ "--reveal-delay": "270ms" }}>
          <strong>1 place</strong>
          <span>for cow records</span>
        </div>
      </section>

      <section className="lsd-section" id="features">
        <div className="lsd-section-head lsd-reveal">
          <div className="lsd-pill blue">
            <span>✣</span>
            What it does
          </div>
          <h2>Everything your cattle health workflow needs, in one place</h2>
          <p>
            From scan upload to report review, LSDGuard keeps the most important
            actions clear and easy to use.
          </p>
        </div>

        <div className="lsd-feature-grid">
          <FeatureCard
            icon={<Camera size={22} />}
            tone="green"
            title="Image based screening"
            text="Upload a clear skin image and keep scan activity connected to each cow profile."
          />
          <FeatureCard
            icon={<Activity size={22} />}
            tone="blue"
            title="Health dashboard"
            text="Track weekly scans, cattle counts, symptoms, and farm activity from one clean dashboard."
          />
          <FeatureCard
            icon={<BellRing size={22} />}
            tone="orange"
            title="Smart reminders"
            text="Stay aware of pending vaccination work and important health follow-ups."
          />
          <FeatureCard
            icon={<ShieldCheck size={22} />}
            tone="purple"
            title="Risk awareness"
            text="Make faster decisions when symptoms appear by reviewing structured scan reports."
          />
          <FeatureCard
            icon={<MapPinned size={22} />}
            tone="pink"
            title="Location context"
            text="Store farm and cow location details so records stay useful over time."
          />
          <FeatureCard
            icon={<Stethoscope size={22} />}
            tone="teal"
            title="Care history"
            text="Keep past reports, vaccination details, and cattle records organized for visits."
          />
        </div>
      </section>

      <section className="lsd-how" id="how">
        <div className="lsd-section-head lsd-reveal">
          <div className="lsd-pill">
            <span>▷</span>
            Getting started
          </div>
          <h2>Up and running in minutes</h2>
          <p>Simple enough for daily farm use. Structured enough for serious health tracking.</p>
        </div>

        <div className="lsd-steps">
          <StepCard number="1" icon={<Upload size={24} />} title="Upload a cow image" text="Choose a clear photo of visible skin symptoms or normal skin." />
          <StepCard number="2" icon={<Activity size={24} />} title="Review the scan" text="See the scan status and keep the result attached to the cow." />
          <StepCard number="3" icon={<FileText size={24} />} title="Track care history" text="Use reports and reminders to plan the next farm action." />
        </div>
      </section>

      <section className="lsd-insight" id="trust">
        <div className="lsd-reveal">
          <div className="lsd-pill purple">
            <span>✦</span>
            Farm-ready intelligence
          </div>
          <h2>A disease awareness system that feels simple, not technical</h2>
          <p>
            Farmers do not need complicated software. LSDGuard keeps the
            interface visual, direct, and focused on action.
          </p>

          <div className="lsd-bullet-list">
            <span><CheckCircle2 size={16} /> Clear scan journey from upload to result</span>
            <span><CheckCircle2 size={16} /> Organized cattle profile history</span>
            <span><CheckCircle2 size={16} /> Professional design for laptop and mobile</span>
          </div>
        </div>

        <div className="lsd-insight-stack lsd-reveal" style={{ "--reveal-delay": "120ms" }}>
          <div className="lsd-alert-card">
            <span className="lsd-alert-icon green"><ShieldCheck size={18} /></span>
            <div>
              <strong>Healthy Cow</strong>
              <p>No urgent symptom pattern detected in latest report.</p>
            </div>
            <small>Safe</small>
          </div>
          <div className="lsd-alert-card">
            <span className="lsd-alert-icon orange"><BellRing size={18} /></span>
            <div>
              <strong>Vaccination Due</strong>
              <p>Schedule the next vaccination visit for registered cattle.</p>
            </div>
            <small>Reminder</small>
          </div>
          <div className="lsd-alert-card">
            <span className="lsd-alert-icon purple"><FileText size={18} /></span>
            <div>
              <strong>Report Saved</strong>
              <p>Scan history is ready for review during doctor visits.</p>
            </div>
            <small>Record</small>
          </div>
        </div>
      </section>

      <section className="lsd-security">
        <div className="lsd-pill dark">
          <span>◎</span>
          Prevention first
        </div>
        <h2>Your herd records stay ready when you need them</h2>
        <p>
          Use LSDGuard to keep important cattle health information in one
          organized workflow before problems become harder to manage.
        </p>
        <div className="lsd-security-grid">
          <span><ShieldCheck size={20} /> Scan records</span>
          <span><BellRing size={20} /> Reminders</span>
          <span><FileText size={20} /> Reports</span>
          <span><HeartPulse size={20} /> Care history</span>
        </div>
      </section>

      <section className="lsd-final-cta">
        <div className="lsd-pill">
          <span>•</span>
          Start simple
        </div>
        <h2>Protect your herd with smarter daily health tracking.</h2>
        <p>
          Create an account, add your cattle, and begin organizing scans,
          reports, and vaccination work in one place.
        </p>
        <div className="lsd-hero-actions centered">
          <button className="lsd-primary-btn" onClick={() => navigate("/signup")}>
            Create your free account
            <ArrowRight size={19} />
          </button>
          <button className="lsd-outline-btn" onClick={() => navigate("/login")}>
            Sign in
          </button>
        </div>
      </section>

      <footer className="lsd-footer">
        <button className="lsd-brand" onClick={() => navigate("/")}>
          <span className="lsd-brand-mark">
            <HeartPulse size={20} />
          </span>
          <div>
            <strong>LSDGuard</strong>
            <small>AI cattle health scanner</small>
          </div>
        </button>
        <span>All systems operational</span>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, tone, title, text }) {
  return (
    <article className="lsd-feature-card lsd-reveal">
      <span className={`lsd-feature-icon ${tone}`}>{icon}</span>
      <h3>{title}</h3>
      <p>{text}</p>
    </article>
  );
}

function StepCard({ number, icon, title, text }) {
  return (
    <article className="lsd-step-card lsd-reveal">
      <span className="lsd-step-number">{number}</span>
      <div className="lsd-step-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{text}</p>
    </article>
  );
}

function AuthPage({ mode }) {
  const navigate = useNavigate();
  const isSignup = mode === "signup";
  const isForgot = mode === "forgot";
  const recaptchaRef = useRef(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [location, setLocation] = useState("");
  const [coords, setCoords] = useState({ lat: null, lng: null });
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [locationStatus, setLocationStatus] = useState("");
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [resetStep, setResetStep] = useState(1);
  const [resetOtp, setResetOtp] = useState("");
  const [resetEmailName, setResetEmailName] = useState("");

  useEffect(() => {
    if (!message) return undefined;

    const timer = window.setTimeout(() => {
      setMessage(null);
    }, 2400);

    return () => window.clearTimeout(timer);
  }, [message]);

  useEffect(() => {
    if (!isSignup) return undefined;

    if (!navigator.geolocation) {
      setLocationStatus("");
      return undefined;
    }

    const formatDetectedLocation = async (latitude, longitude) => {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
        );
        const data = await response.json();
        const address = data.address || {};
        const area =
          address.village ||
          address.town ||
          address.city ||
          address.suburb ||
          address.county ||
          address.state ||
          data.display_name;

        return area || "";
      } catch {
        return "";
      }
    };

    const requestCurrentLocation = () => navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setCoords({ lat: latitude, lng: longitude });
        setLocationStatus("Detecting your area...");

        const detectedLocation = await formatDetectedLocation(latitude, longitude);

        if (detectedLocation) {
          setLocation(detectedLocation);
          setLocationStatus("");
          return;
        }

        setLocation("");
        setLocationStatus("");
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setLocationStatus("");
          return;
        }

        setLocationStatus("");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );

    setLocationStatus("Checking location permission...");

    if (navigator.permissions?.query) {
      navigator.permissions
        .query({ name: "geolocation" })
        .then((permission) => {
          if (permission.state === "denied") {
            setLocationStatus("");
            return;
          }

          setLocationStatus("");
          requestCurrentLocation();
        })
        .catch(() => {
          requestCurrentLocation();
        });
    } else {
      requestCurrentLocation();
    }

    return undefined;
  }, [isSignup]);

  const resetCaptcha = () => {
    recaptchaRef.current?.reset();
    setCaptchaToken("");
  };

  const showMessage = (type, textValue) => {
    setMessage({ type, text: textValue });
  };

  const cleanEmail = email.trim().toLowerCase();
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail);
  const isSignupPasswordValid =
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /\d/.test(password);
  const isResetPasswordReady =
    isStrongPassword(password) && confirmPassword && password === confirmPassword;
  const isForgotFormReady =
    (resetStep === 1 && isEmailValid) ||
    (resetStep === 2 && resetOtp.trim().length === 6) ||
    (resetStep === 3 && isResetPasswordReady);
  const isSignupFormReady =
    name.trim() &&
    mobile.length === 10 &&
    isEmailValid &&
    location.trim() &&
    isSignupPasswordValid &&
    confirmPassword &&
    password === confirmPassword;
  const isLoginFormReady = isEmailValid && password && Boolean(captchaToken);
  const canSubmit = isForgot ? isForgotFormReady : (isSignup ? isSignupFormReady : isLoginFormReady);

  const requestPasswordResetCode = async () => {
    if (!isEmailValid) {
      showMessage("error", "Please enter a valid registered email address.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/auth/forgot-password/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "Unable to send verification code.");
      }

      setEmail(cleanEmail);
      setResetEmailName(data.name || "");
      setResetOtp("");
      setResetStep(2);
      showMessage(
        "success",
        data.deliveryMode === "dev-otp" && data.otp
          ? `Email could not be sent, so use development code ${data.otp}.`
          : `Verification code sent${data.name ? ` to ${data.name}` : ""}.`,
      );
    } catch (error) {
      showMessage("error", error.message || "Unable to send verification code.");
    } finally {
      setLoading(false);
    }
  };

  const verifyPasswordResetCode = async () => {
    const code = resetOtp.trim();

    if (code.length !== 6) {
      showMessage("error", "Please enter the 6-digit verification code.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/auth/forgot-password/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, otp: code }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "Invalid verification code.");
      }

      setPassword("");
      setConfirmPassword("");
      setPasswordTouched(false);
      setResetStep(3);
      showMessage("success", data.message || "Verification code verified successfully.");
    } catch (error) {
      showMessage("error", error.message || "Invalid verification code.");
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async () => {
    if (!isStrongPassword(password)) {
      setPasswordTouched(true);
      showMessage(
        "error",
        "Password must include uppercase, lowercase, number, special character, and be at least 8 characters.",
      );
      return;
    }

    if (password !== confirmPassword) {
      showMessage("error", "Please reenter the same password.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/auth/forgot-password/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: cleanEmail,
          otp: resetOtp.trim(),
          password,
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "Unable to reset password.");
      }

      showMessage("success", "Password reset successfully. Redirecting to sign in...");
      window.setTimeout(() => {
        navigate("/login");
      }, 1400);
    } catch (error) {
      showMessage("error", error.message || "Unable to reset password.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (isForgot) {
      if (resetStep === 1) {
        await requestPasswordResetCode();
        return;
      }

      if (resetStep === 2) {
        await verifyPasswordResetCode();
        return;
      }

      await resetPassword();
      return;
    }

    if (!isEmailValid || !password) {
      showMessage("error", "Please enter your email and password.");
      return;
    }

    if (isSignup && (!name.trim() || !mobile.trim() || !location.trim())) {
      showMessage("error", "Please fill in your name, mobile number, and location.");
      return;
    }

    if (isSignup && mobile.length !== 10) {
      showMessage("error", "Please enter a valid 10-digit mobile number.");
      return;
    }

    if (isSignup && !isSignupPasswordValid) {
      showMessage("error", "Please enter a stronger password.");
      return;
    }

    if (isSignup && password !== confirmPassword) {
      showMessage("error", "Please reenter password.");
      return;
    }

    if (!isSignup && !captchaToken) {
      showMessage("error", "Please complete the reCAPTCHA verification.");
      return;
    }

    setLoading(true);

    try {
      const endpoint = isSignup ? "/api/auth/signup" : "/api/auth/login";
      const payload = isSignup
        ? {
            name: name.trim(),
            mobile: mobile.trim(),
            email: cleanEmail,
            location: location.trim(),
            lat: coords.lat,
            lng: coords.lng,
            role: "Farmer",
            password,
          }
        : { email: cleanEmail, password, recaptchaToken: captchaToken };

      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || (isSignup ? "Signup failed" : "Login failed"));
      }

      if (isSignup) {
        showMessage("success", "Your account is created successfully.");
        window.setTimeout(() => {
          navigate("/login");
        }, 1600);
        return;
      }

      localStorage.setItem("user", JSON.stringify(data.user));
      if (data.token) {
        localStorage.setItem("token", data.token);
      }
      navigate("/home");
    } catch (error) {
      showMessage("error", error.message || "Something went wrong. Please try again.");
      if (!isSignup) resetCaptcha();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`auth-page auth-desktop-page ${isSignup ? "auth-signup-page" : "auth-signin-page"}`}>
      <header className="auth-topbar">
        <button className="auth-brand" onClick={() => navigate("/")}>
          <div className="auth-brand-mark">L</div>
          <div>
            <div className="auth-brand-title">LSDGuard</div>
            <div className="auth-brand-sub">AI cattle health scanner</div>
          </div>
        </button>

        <button className="auth-top-link" onClick={() => navigate("/")}>
          Back to home
        </button>
      </header>

      <main className="auth-shell auth-desktop-shell">
        <section className="auth-visual auth-desktop-visual">
          <div className="auth-scan-window">
            <div className="auth-scan-top">
              <span>{isSignup ? "New farmer workspace" : isForgot ? "Secure recovery" : "Welcome back"}</span>
              <strong>{isSignup ? "Ready to protect" : isForgot ? "Reset safely" : "Farm health hub"}</strong>
            </div>

            <div className="auth-hero-wrap">
              <img src={cow} className="auth-hero-image" alt="LSDGuard cattle health preview" />
              <div className="auth-scan-line" />
            </div>

            <div className="auth-floating-chip chip-one">Report ready</div>
            <div className="auth-floating-chip chip-two">Reminder active</div>
          </div>

          <div className="auth-visual-card">
            <h2>{isSignup ? "Start with a cleaner cattle-care workflow" : isForgot ? "Get your account back without the noise" : "Continue your cattle health tracking"}</h2>
            <p>
              {isSignup
                ? "Create your farmer profile, keep cattle records organized, and make every scan easier to follow."
                : isForgot
                  ? "Verify your account by email, set a new password, and return to your farm dashboard securely."
                : "Open your dashboard, review scans, and keep daily farm health tasks moving."}
            </p>
          </div>

          <div className="auth-points">
            <span>Image-based screening</span>
            <span>Vaccination reminders</span>
            <span>Organized cow records</span>
          </div>
        </section>

        <section className="auth-panel auth-desktop-panel">
          <div className="auth-panel-head">
            <p className="auth-kicker">{isSignup ? "Get started" : isForgot ? "Forgot password" : "Welcome back"}</p>
            <h1 className="auth-title">
              {isSignup ? "Create your LSDGuard account" : isForgot ? "Reset your password" : "Sign in to LSDGuard"}
            </h1>
            <p className="auth-subtitle">
              {isForgot
                ? resetStep === 1
                  ? "Enter your registered email and we will send a verification code."
                  : resetStep === 2
                    ? "Enter the code from your email to unlock password reset."
                    : "Create and confirm your new password to finish the reset."
                : isSignup
                  ? "A simple, desktop-friendly signup flow for farmers and cattle-care teams."
                  : "Access your farm dashboard, scan history, and cattle records."}
            </p>
          </div>

          <div className="card auth-form-card auth-desktop-form-card">
            {message && (
              <div className={`auth-toast ${message.type}`} role="status" aria-live="polite">
                {message.text}
              </div>
            )}

            {isForgot ? (
              <>
                <div className="reset-step-row" aria-label="Password reset progress">
                  <span className={resetStep >= 1 ? "active" : ""}>Email</span>
                  <span className={resetStep >= 2 ? "active" : ""}>Code</span>
                  <span className={resetStep >= 3 ? "active" : ""}>Password</span>
                </div>

                {resetStep === 1 && (
                  <>
                    <div className="field-label">Registered Email Address</div>
                    <input
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="farmer@example.com"
                      type="email"
                    />
                    <p className="auth-helper-text">
                      We will send a 6-digit verification code to this email address.
                    </p>
                  </>
                )}

                {resetStep === 2 && (
                  <>
                    <div className="field-label">Email Address</div>
                    <input value={email} disabled />

                    <div className="field-label">Verification Code</div>
                    <input
                      value={resetOtp}
                      onChange={(event) => setResetOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="Enter 6-digit code"
                      inputMode="numeric"
                    />
                    <div className="reset-inline-actions">
                      <p className="auth-helper-text">
                        {resetEmailName
                          ? `Code sent for ${resetEmailName}. Check your inbox or spam folder.`
                          : "Check your inbox or spam folder for the verification code."}
                      </p>
                      <button type="button" className="text-action-btn" onClick={requestPasswordResetCode} disabled={loading}>
                        Resend code
                      </button>
                    </div>
                  </>
                )}

                {resetStep === 3 && (
                  <>
                    <div className="reset-success-note">
                      Verification matched. Create a new password for your account.
                    </div>

                    <div className="field-label">New Password</div>
                    <input
                      type="password"
                      value={password}
                      onFocus={() => setPasswordTouched(true)}
                      onChange={(event) => {
                        setPassword(event.target.value);
                        setPasswordTouched(true);
                      }}
                      placeholder="New password"
                      minLength={8}
                    />

                    {passwordTouched && !isStrongPassword(password) && (
                      <div className="auth-password-rules">
                        <span className={password.length >= 8 ? "valid" : ""}>At least 8 characters</span>
                        <span className={/[A-Z]/.test(password) ? "valid" : ""}>one uppercase letter</span>
                        <span className={/[a-z]/.test(password) ? "valid" : ""}>one lowercase letter</span>
                        <span className={/\d/.test(password) ? "valid" : ""}>one number</span>
                        <span className={/[@$!%*?&]/.test(password) ? "valid" : ""}>one special character</span>
                      </div>
                    )}

                    <div className="field-label">Retype Password</div>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      placeholder="Retype new password"
                      minLength={8}
                    />

                    {confirmPassword && password !== confirmPassword && (
                      <p className="auth-inline-error">Passwords do not match.</p>
                    )}
                  </>
                )}
              </>
            ) : (
              <>
                {isSignup && (
                  <>
                    <div className="field-label">Full Name</div>
                    <input
                      value={name}
                      onChange={(event) => setName(event.target.value.replace(/[^A-Za-z\s]/g, ""))}
                      placeholder="Your name"
                    />

                    <div className="field-label">Mobile Number</div>
                    <input
                      value={mobile}
                      onChange={(event) => setMobile(event.target.value.replace(/\D/g, "").slice(0, 10))}
                      placeholder="10-digit mobile number"
                      inputMode="numeric"
                    />
                  </>
                )}

                <div className="field-label">Email Address</div>
                <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="farmer@example.com" />

                {isSignup && (
                  <>
                    <div className="field-label">Village / Area</div>
                    <input
                      value={location}
                      onChange={(event) => {
                        setLocation(event.target.value);
                        setLocationStatus("");
                      }}
                      placeholder="Your village or farm area"
                    />
                  </>
                )}

                <div className="field-label">Password</div>
                <input
                  type="password"
                  value={password}
                  onFocus={() => setPasswordTouched(true)}
                  onChange={(event) => {
                    const nextPassword = event.target.value;
                    setPassword(nextPassword);
                    setPasswordTouched(true);
                    if (!nextPassword) {
                      setConfirmPassword("");
                    }
                  }}
                  placeholder="Password"
                  minLength={8}
                />
                {isSignup && passwordTouched && (
                  <div className="auth-password-rules">
                    <span className={password.length >= 8 ? "valid" : ""}>At least 8 characters</span>
                    <span className={/[A-Z]/.test(password) ? "valid" : ""}>one uppercase letter</span>
                    <span className={/[a-z]/.test(password) ? "valid" : ""}>one lowercase letter</span>
                    <span className={/\d/.test(password) ? "valid" : ""}>one number</span>
                  </div>
                )}

                {isSignup && (
                  <>
                    <div className="field-label">Re-enter Password</div>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      placeholder="Re-enter password"
                      minLength={8}
                      disabled={!password.trim()}
                    />
                    {confirmPassword && password !== confirmPassword && (
                      <p className="auth-inline-error">Please reenter password.</p>
                    )}
                  </>
                )}
              </>
            )}

            {!isSignup && !isForgot && (
              <div className="auth-recaptcha">
                {RECAPTCHA_SITE_KEY ? (
                  <ReCAPTCHA
                    ref={recaptchaRef}
                    sitekey={RECAPTCHA_SITE_KEY}
                    onChange={(token) => setCaptchaToken(token || "")}
                    onExpired={resetCaptcha}
                    onErrored={resetCaptcha}
                  />
                ) : (
                  <p className="auth-inline-error">
                    Missing VITE_RECAPTCHA_SITE_KEY in the frontend .env file.
                  </p>
                )}
              </div>
            )}

            <button className="signin-btn" onClick={handleSubmit} disabled={loading || !canSubmit}>
              {loading
                ? "Please wait..."
                : isSignup
                  ? "Create Account"
                  : isForgot && resetStep === 1
                    ? "Send Verification Code"
                    : isForgot && resetStep === 2
                      ? "Verify Code"
                      : isForgot
                        ? "Reset Password"
                        : "Sign In"}
            </button>

            {isForgot && resetStep > 1 && (
              <button
                type="button"
                className="forgot-link"
                onClick={() => {
                  setResetStep((current) => Math.max(1, current - 1));
                  setMessage(null);
                }}
              >
                Back to previous step
              </button>
            )}

            {!isForgot && (
              <button type="button" className="forgot-link" onClick={() => navigate("/forgot-password")}>
                Forgot password?
              </button>
            )}

            <p className="auth-switch">
              {isForgot ? "Remembered your password?" : isSignup ? "Already have an account?" : "Need an account?"}{" "}
              <span className="auth-link" onClick={() => navigate(isForgot || isSignup ? "/login" : "/signup")}>
                {isForgot || isSignup ? "Sign in" : "Create account"}
              </span>
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}

function PlaceholderPage({ title }) {
  const navigate = useNavigate();

  return (
    <div className="app-shell">
      <div className="app-theme content-fit-theme">
        <div style={{ padding: 24 }}>
          <h1>{title}</h1>
          <p>This page is not connected yet in the current folder layout.</p>
          <button onClick={() => navigate("/home")}>Back Home</button>
        </div>
      </div>
    </div>
  );
}

function buildResultCarePlan({ risk, severity, villageName }) {
  const urgent = risk >= 60 || severity === "Severe";
  const location = villageName || "your area";

  return [
    {
      title: urgent ? "Isolate and call a veterinarian" : "Separate and observe",
      purpose: "Reduce possible spread to healthy cattle while the animal is checked.",
      steps: urgent
        ? "Move the cow to a clean shaded area away from the herd and contact the nearest veterinary hospital or large-animal veterinarian today."
        : "Keep the cow separate, comfortable, and under observation. Check skin nodules, temperature, appetite, and milk production twice daily.",
      evidence: "First-aid guidance only. A veterinarian should confirm treatment.",
    },
    {
      title: "Hydration and soft feed",
      purpose: "Support recovery while avoiding extra stress.",
      steps: "Provide clean water at all times, offer soft palatable feed, and avoid transport or rough handling.",
      evidence: "Get urgent help if the cow stops eating, becomes weak, or has persistent fever.",
    },
    {
      title: "Clean shed and fly control",
      purpose: "Biting insects can contribute to spread, and clean bedding helps irritated skin.",
      steps: "Keep bedding dry, remove manure regularly, and use veterinarian-approved fly or tick control around the shed.",
      evidence: "Do not use harsh chemicals or human medicines on lesions.",
    },
    {
      title: "Protect the herd",
      purpose: "Early monitoring helps prevent wider infection.",
      steps: `Check nearby cattle for fever, nodules, discharge, and milk drop. Ask a vet in ${location} about vaccination and local outbreak guidance.`,
      evidence: "Follow local veterinary advice for vaccination and movement restrictions.",
    },
  ];
}

function ScanResultPage() {
  const navigate = useNavigate();
  const { cowId } = useParams();
  const { state } = useLocation();
  const [nearbyVets, setNearbyVets] = useState([]);
  const [vetsLoading, setVetsLoading] = useState(false);
  const [vetsError, setVetsError] = useState("");
  const [vetLocation, setVetLocation] = useState("");
  const risk = Math.round(Number(state?.lsd_percent || 0));
  const severity = state?.severity || "None";
  const reportFile = state?.scan?.reportFile || state?.reportFile || "";
  const preview = state?.preview;
  const scanData = state?.scan || {};
  const remedies = Array.isArray(state?.remedies)
    ? state.remedies
    : Array.isArray(scanData.remedies)
      ? scanData.remedies
      : [];
  const villageName = state?.villageName || state?.village || "Unknown";
  const displayRemedies = remedies.length
    ? remedies
    : buildResultCarePlan({ risk, severity, villageName });
  const aiAdvice = state?.aiAdvice || scanData.aiAdvice || "";
  const aiSource = state?.aiAdviceSource || state?.remedySource || scanData.aiAdviceSource || scanData.remedySource || "";
  const aiModel = state?.aiAdviceModel || state?.remedyModel || scanData.aiAdviceModel || scanData.remedyModel || "";

  useEffect(() => {
    const storedUser = getStoredUser();
    const location =
      state?.villageName ||
      state?.village ||
      scanData.villageName ||
      storedUser.location ||
      storedUser.village ||
      "";
    const farmerId = storedUser._id || storedUser.id || storedUser.userId || "";

    const fetchNearbyVets = async () => {
      setVetsLoading(true);
      setVetsError("");
      try {
        const params = new URLSearchParams();
        if (farmerId) params.set("farmerId", farmerId);
        if (location) params.set("location", location);
        params.set("cowId", cowId || "");
        params.set("maxHours", "3");

        const res = await fetch(`${API_BASE}/api/user/nearby-vets?${params.toString()}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || "Could not load nearby veterinary doctors");

        setNearbyVets(Array.isArray(data.vets) ? data.vets : []);
        setVetLocation(data.farmerLocation || location);
      } catch (err) {
        console.error("Nearby vets failed:", err);
        setNearbyVets([]);
        setVetsError(err.message || "Could not load nearby veterinary doctors");
      } finally {
        setVetsLoading(false);
      }
    };

    fetchNearbyVets();
  }, [cowId, scanData.villageName, state?.village, state?.villageName]);

  const severityColor =
    severity === "Severe"
      ? "#dc2626"
      : severity === "Moderate"
        ? "#ea580c"
        : severity === "Mild"
          ? "#ca8a04"
          : "#16a34a";

  return (
    <div className="app-shell">
      <div className="app-theme content-fit-theme">
        <div style={{ padding: 18 }}>
          <div
            style={{
              background: "linear-gradient(135deg, #218a4d 0%, #39b86b 100%)",
              color: "white",
              borderRadius: 28,
              padding: 20,
              marginBottom: 16,
            }}
          >
            <button
              type="button"
              onClick={() => navigate("/home")}
              style={{
                width: 40,
                height: 40,
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.22)",
                background: "rgba(255,255,255,0.14)",
                color: "white",
                fontSize: 22,
                cursor: "pointer",
              }}
            >
              ←
            </button>
            <h1 style={{ margin: "18px 0 6px", fontSize: 28 }}>Scan Result</h1>
            <p style={{ margin: 0, opacity: 0.88 }}>
              Cow image validation and LSD risk review completed.
            </p>
          </div>

          <div
            style={{
              background: "linear-gradient(180deg, #ffffff 0%, #f3fbf5 100%)",
              border: "1px solid var(--success-border)",
              borderRadius: 24,
              padding: 18,
              boxShadow: "0 18px 42px rgba(42, 82, 52, 0.12)",
            }}
          >
            {preview && (
              <img
                src={preview}
                alt="Uploaded cow preview"
                style={{
                  width: "100%",
                  maxHeight: 260,
                  objectFit: "cover",
                  borderRadius: 18,
                  marginBottom: 16,
                }}
              />
            )}

            <div style={{ textAlign: "center", padding: "14px 0 20px" }}>
              <div style={{ color: "var(--text-secondary)", fontWeight: 700 }}>
                LSDGuard Risk
              </div>
              <div style={{ color: severityColor, fontSize: 56, fontWeight: 900 }}>
                {risk}%
              </div>
              <div
                style={{
                  display: "inline-flex",
                  borderRadius: 999,
                  padding: "8px 14px",
                  background: "var(--success-soft)",
                  color: severityColor,
                  fontWeight: 800,
                }}
              >
                {severity}
              </div>
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              <div style={resultRowStyle}>
                <span>Average model confidence</span>
                <strong>{Number(state?.avg_score || 0).toFixed(2)}%</strong>
              </div>
              <div style={resultRowStyle}>
                <span>Village</span>
                <strong>{villageName}</strong>
              </div>
              <div style={resultRowStyle}>
                <span>Animal age</span>
                <strong>{state?.animalAge || "Not selected"}</strong>
              </div>
            </div>

            <section style={carePlanStyle}>
                <div style={carePlanHeaderStyle}>
                  <div>
                    <div style={carePlanEyebrowStyle}>
                      {aiSource ? `${aiSource}${aiModel ? ` - ${aiModel}` : ""}` : "LSDGuard care guide"}
                    </div>
                    <h2 style={carePlanTitleStyle}>Remedies and Care Steps</h2>
                  </div>
                </div>

                {aiAdvice && (
                  <div style={adviceBoxStyle}>
                    {aiAdvice.split(/\n{2,}/).map((paragraph, index) => (
                      <p key={index} style={adviceParagraphStyle}>
                        {paragraph}
                      </p>
                    ))}
                  </div>
                )}

                {displayRemedies.length > 0 && (
                  <div style={remedyListStyle}>
                    {displayRemedies.map((item, index) => (
                      <article key={`${item.title || "remedy"}-${index}`} style={remedyCardStyle}>
                        <div style={remedyNumberStyle}>{index + 1}</div>
                        <div>
                          <h3 style={remedyTitleStyle}>{item.title}</h3>
                          <p style={remedyPurposeStyle}>{item.purpose}</p>
                          <p style={remedyStepsStyle}>{item.steps}</p>
                          {item.evidence && (
                            <p style={remedyEvidenceStyle}>{item.evidence}</p>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                )}
            </section>

            <section style={vetRecommendationStyle}>
              <div style={vetRecommendationHeaderStyle}>
                <div>
                  <div style={carePlanEyebrowStyle}>Location based support</div>
                  <h2 style={carePlanTitleStyle}>Recommended Veterinary Doctors</h2>
                  <p style={vetLocationStyle}>
                    Based on {vetLocation || villageName || "the farmer location saved in LSDGuard"}
                  </p>
                </div>
              </div>

              {vetsLoading && (
                <div style={vetEmptyStyle}>Finding nearby veterinary doctors...</div>
              )}
              {vetsError && !vetsLoading && (
                <div style={vetErrorStyle}>{vetsError}</div>
              )}
              {!vetsLoading && !vetsError && nearbyVets.length === 0 && (
                <div style={vetEmptyStyle}>No nearby veterinary doctor found for this location.</div>
              )}
              {!vetsLoading && nearbyVets.length > 0 && (
                <div style={vetListStyle}>
                  {nearbyVets.slice(0, 3).map((vet) => (
                    <article key={vet.id || vet.name} style={vetCardStyle}>
                      <div style={vetTopRowStyle}>
                        <div>
                          <h3 style={vetNameStyle}>{vet.name}</h3>
                          <p style={vetClinicStyle}>{vet.clinic || "Registered veterinary doctor"}</p>
                        </div>
                        <div style={vetRatingStyle}>
                          {Number(vet.rating || 0).toFixed(1)} / 5
                          <span style={vetReviewStyle}>{Number(vet.reviewCount || 0)} reviews</span>
                        </div>
                      </div>
                      <p style={vetMetaStyle}>
                        {vet.location || [vet.city, vet.district, vet.state].filter(Boolean).join(", ")}
                      </p>
                      <p style={vetMetaStyle}>{vet.specialty || "Large animal veterinary care"}</p>
                      <div style={vetFooterStyle}>
                        <span>
                          {vet.distanceKm != null
                            ? `${vet.distanceKm} km away`
                            : vet.matchReason || "Location matched"}
                        </span>
                        {vet.phone && (
                          <a href={`tel:${vet.phone}`} style={vetCallStyle}>
                            {vet.phone}
                          </a>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section style={quickCareStyle}>
              <h2 style={quickCareTitleStyle}>Immediate Remedy Summary</h2>
              <div style={quickCareGridStyle}>
                <div style={quickCareItemStyle}>
                  <strong>1. Isolate</strong>
                  <span>Keep this cow away from healthy cattle and reduce handling.</span>
                </div>
                <div style={quickCareItemStyle}>
                  <strong>2. Hydrate</strong>
                  <span>Give clean water and soft feed. Watch appetite and fever.</span>
                </div>
                <div style={quickCareItemStyle}>
                  <strong>3. Call vet</strong>
                  <span>Contact a veterinary doctor for treatment and vaccination advice.</span>
                </div>
              </div>
            </section>

            {reportFile && (
              <a
                href={reportFile}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: "block",
                  marginTop: 16,
                  padding: 14,
                  borderRadius: 16,
                  background: "#166534",
                  color: "white",
                  textAlign: "center",
                  textDecoration: "none",
                  fontWeight: 800,
                }}
              >
                Open PDF report
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const resultRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  padding: "13px 14px",
  borderRadius: 14,
  background: "var(--background)",
  border: "1px solid var(--app-border)",
  color: "var(--text)",
};

const carePlanStyle = {
  marginTop: 16,
  padding: 14,
  borderRadius: 18,
  background: "rgba(240, 253, 244, 0.82)",
  border: "1px solid var(--success-border)",
};

const carePlanHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  marginBottom: 12,
};

const carePlanEyebrowStyle = {
  color: "var(--success-text)",
  fontSize: 11,
  fontWeight: 800,
  textTransform: "uppercase",
};

const carePlanTitleStyle = {
  margin: "4px 0 0",
  color: "var(--text)",
  fontSize: 18,
};

const adviceBoxStyle = {
  padding: 12,
  borderRadius: 14,
  background: "rgba(255, 255, 255, 0.74)",
  border: "1px solid var(--app-border)",
  marginBottom: 12,
};

const adviceParagraphStyle = {
  margin: "0 0 8px",
  color: "var(--text-secondary)",
  fontSize: 13,
  lineHeight: 1.55,
};

const remedyListStyle = {
  display: "grid",
  gap: 10,
};

const remedyCardStyle = {
  display: "grid",
  gridTemplateColumns: "32px 1fr",
  gap: 10,
  padding: 12,
  borderRadius: 14,
  background: "rgba(255, 255, 255, 0.82)",
  border: "1px solid var(--app-border)",
};

const remedyNumberStyle = {
  width: 28,
  height: 28,
  borderRadius: 999,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "var(--success-soft)",
  color: "var(--success-text)",
  fontWeight: 900,
  fontSize: 13,
};

const remedyTitleStyle = {
  margin: 0,
  color: "var(--text)",
  fontSize: 14,
};

const remedyPurposeStyle = {
  margin: "5px 0 0",
  color: "var(--text-secondary)",
  fontSize: 12,
  lineHeight: 1.45,
};

const remedyStepsStyle = {
  margin: "7px 0 0",
  color: "var(--text)",
  fontSize: 13,
  lineHeight: 1.5,
};

const remedyEvidenceStyle = {
  margin: "7px 0 0",
  color: "var(--danger-text, #991b1b)",
  fontSize: 12,
  lineHeight: 1.45,
  fontWeight: 700,
};

const vetRecommendationStyle = {
  marginTop: 16,
  padding: 14,
  borderRadius: 18,
  background: "#f8fafc",
  border: "1px solid #bfdbfe",
};

const vetRecommendationHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  marginBottom: 12,
};

const vetLocationStyle = {
  margin: "6px 0 0",
  color: "var(--text-secondary)",
  fontSize: 12,
  lineHeight: 1.45,
};

const vetListStyle = {
  display: "grid",
  gap: 10,
};

const vetCardStyle = {
  padding: 12,
  borderRadius: 14,
  background: "white",
  border: "1px solid var(--app-border)",
};

const vetTopRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 10,
};

const vetNameStyle = {
  margin: 0,
  color: "var(--text)",
  fontSize: 14,
};

const vetClinicStyle = {
  margin: "5px 0 0",
  color: "var(--text-secondary)",
  fontSize: 12,
  lineHeight: 1.45,
};

const vetRatingStyle = {
  minWidth: 74,
  textAlign: "right",
  color: "#166534",
  fontWeight: 900,
  fontSize: 13,
};

const vetReviewStyle = {
  display: "block",
  color: "var(--text-secondary)",
  fontWeight: 700,
  fontSize: 11,
  marginTop: 2,
};

const vetMetaStyle = {
  margin: "8px 0 0",
  color: "var(--text-secondary)",
  fontSize: 12,
  lineHeight: 1.45,
};

const vetFooterStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 10,
  flexWrap: "wrap",
  marginTop: 10,
  color: "#166534",
  fontSize: 12,
  fontWeight: 800,
};

const vetCallStyle = {
  color: "#1d4ed8",
  textDecoration: "none",
  background: "#eff6ff",
  border: "1px solid #bfdbfe",
  padding: "6px 10px",
  borderRadius: 999,
};

const vetEmptyStyle = {
  padding: 12,
  borderRadius: 14,
  background: "white",
  border: "1px dashed var(--app-border)",
  color: "var(--text-secondary)",
  fontSize: 13,
  lineHeight: 1.5,
};

const vetErrorStyle = {
  ...vetEmptyStyle,
  color: "var(--danger-text, #991b1b)",
  fontWeight: 700,
};

const quickCareStyle = {
  marginTop: 16,
  padding: 14,
  borderRadius: 18,
  background: "#ecfdf5",
  border: "1px solid #86efac",
};

const quickCareTitleStyle = {
  margin: "0 0 12px",
  color: "#166534",
  fontSize: 18,
};

const quickCareGridStyle = {
  display: "grid",
  gap: 10,
};

const quickCareItemStyle = {
  display: "grid",
  gap: 4,
  padding: 12,
  borderRadius: 14,
  background: "#ffffff",
  border: "1px solid #bbf7d0",
  color: "#14532d",
  fontSize: 13,
  lineHeight: 1.45,
};

function AppRoutes({ setTheme }) {
  const location = useLocation();
  const routeContent = (
    <Routes location={location} key={location.pathname}>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<AuthPage mode="login" />} />
      <Route path="/signup" element={<AuthPage mode="signup" />} />
      <Route path="/forgot-password" element={<AuthPage mode="forgot" />} />
      <Route path="/home" element={<Home setTheme={setTheme} />} />
      <Route path="/view-cows" element={<ViewAllCows />} />
      <Route path="/add-cow" element={<AddCow />} />
      <Route path="/scan/:cowId" element={<UploadScan />} />
      <Route path="/scan-result/:cowId" element={<ScanResultPage />} />
      <Route path="/cows" element={<PlaceholderPage title="Cows" />} />
      <Route path="/cow/:id" element={<CowDetails />} />
      <Route path="/cow/:id/reports" element={<PlaceholderPage title="Cow Reports" />} />
      <Route path="/disease-info" element={<PlaceholderPage title="Disease Info" />} />
      <Route path="/edit-profile" element={<PlaceholderPage title="Edit Profile" />} />
      <Route path="/vaccination" element={<VaccinationTracker />} />
      <Route path="/help/scanner" element={<PlaceholderPage title="Scanner Help" />} />
      <Route path="/help/contact" element={<ContactSupport />} />
      <Route path="/help/about" element={<AboutUs />} />
      <Route path="/past-history" element={<PastHistory />} />
      <Route path="/outbreak-map" element={<OutbreakPage />} />
    </Routes>
  );

  return routeContent;
}

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);

  return null;
}

export default function App() {
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "light");

  useEffect(() => {
    document.body.setAttribute("data-theme", theme);
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  return (
    <Router>
      <ScrollToTop />
      <AppRoutes setTheme={setTheme} />
    </Router>
  );
}
