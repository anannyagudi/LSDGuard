import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Bell,
  CalendarClock,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Eye,
  FileText,
  List,
  LogOut,
  Milk,
  Moon,
  Plus,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Sun,
  Syringe,
  UserRound,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import cowImage from "../SRC/image/cow.png";
import "./home.css";

const stats = [
  {
    icon: List,
    label: "Registered cattle",
    value: "0",
    detail: "Profiles in your herd",
    tone: "green",
  },
  {
    icon: ScanLine,
    label: "Scans this week",
    value: "0",
    detail: "Image checks completed",
    tone: "blue",
  },
  {
    icon: AlertCircle,
    label: "Open alerts",
    value: "0",
    detail: "No urgent cases",
    tone: "amber",
  },
];

const oneWeekInMs = 7 * 24 * 60 * 60 * 1000;
const vaccinationReminderWindowMs = 20 * 24 * 60 * 60 * 1000;

const getUpcomingVaccinationReminders = (cows = []) => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const windowEnd = new Date(now.getTime() + vaccinationReminderWindowMs);

  return cows
    .flatMap((cow) => {
      const slotReminders = (Array.isArray(cow.vaccinationSlots) ? cow.vaccinationSlots : [])
        .filter((slot) => slot?.date && !slot.completed)
        .map((slot) => ({
          cowName: cow.cowName,
          date: slot.date,
          time: slot.time || "",
          doctor: slot.doctor || cow.pendingVaccinationDoctor || "",
        }));

      const legacyReminder =
        cow.pendingVaccinationDate && Number(cow.vaccinationsPending || 0) > 0
          ? [{
            cowName: cow.cowName,
            date: cow.pendingVaccinationDate,
            time: "",
            doctor: cow.pendingVaccinationDoctor || "",
          }]
          : [];

      return [...slotReminders, ...legacyReminder];
    })
    .map((item) => {
      const dueDate = new Date(item.date);
      dueDate.setHours(0, 0, 0, 0);
      const daysLeft = Math.ceil((dueDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
      return { ...item, dueDate, daysLeft };
    })
    .filter((item) => item.dueDate >= now && item.dueDate <= windowEnd)
    .sort((a, b) => a.dueDate - b.dueDate);
};

const actions = [
  {
    icon: Plus,
    title: "Add Cow",
    text: "Create a cattle profile with ID and care details.",
    path: "/add-cow",
    variant: "primary",
  },
  {
    icon: ScanLine,
    title: "Inspect Cow",
    text: "Select a registered cow before starting a scan.",
    path: "inspect",
    variant: "dark",
  },
  {
    icon: ClipboardList,
    title: "View Herd",
    text: "Browse cow profiles, reports, and history.",
    path: "/view-cows",
    variant: "light",
  },
];

const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE) ||
  "http://https://lsdguard-gx3u.onrender.com";

const clampScore = (value) => Math.max(0, Math.min(100, Math.round(value)));

const getSeverityPenalty = (severity = "") => {
  const normalized = String(severity).toLowerCase();
  if (normalized === "severe") return 60;
  if (normalized === "moderate") return 35;
  if (normalized === "mild") return 15;
  return 0;
};

const getCowHealthScore = (cow, scanList = []) => {
  let score = 100;
  const sortedScans = [...scanList].sort(
    (a, b) => new Date(b.createdAt || b.reportDate || 0) - new Date(a.createdAt || a.reportDate || 0),
  );
  const latestScan = sortedScans[0];

  if (!latestScan) {
    score -= 15;
  } else {
    score -= getSeverityPenalty(latestScan.severity);
    score -= Math.min(30, Number(latestScan.lsd_percent || 0) * 0.3);
  }

  const pendingVaccinations = Math.max(0, Number(cow.vaccinationsPending || 0));
  score -= Math.min(15, pendingVaccinations * 5);

  const hasReport =
    Boolean(cow.healthReport) ||
    (Array.isArray(cow.doctorReports) && cow.doctorReports.filter(Boolean).length > 0);
  if (!hasReport) score -= 5;

  return clampScore(score);
};

const getHealthIndex = (cows = [], scanLists = []) => {
  if (!cows.length) {
    return {
      score: 0,
      label: "No herd data yet. Add cattle records and scans to build the health index.",
    };
  }

  const cowScores = cows.map((cow, index) => getCowHealthScore(cow, scanLists[index] || []));
  const score = clampScore(cowScores.reduce((sum, item) => sum + item, 0) / cowScores.length);

  let label = "Your herd looks stable based on latest scans, reports, and vaccination records.";
  if (score < 40) label = "Urgent review recommended. Several cattle records show higher risk or missing care data.";
  else if (score < 60) label = "Herd needs attention. Review risky scans, pending vaccinations, and missing reports.";
  else if (score < 80) label = "Herd is mostly stable, with a few records needing monitoring.";

  return { score, label };
};

const workflow = [
  {
    icon: Plus,
    title: "Register",
    text: "Add each cow once so all scans and care notes stay connected.",
  },
  {
    icon: Eye,
    title: "Inspect",
    text: "Review visible skin symptoms, appetite, milk, and behavior changes.",
  },
  {
    icon: ScanLine,
    title: "Scan",
    text: "Upload a focused image when nodules or swelling are visible.",
  },
  {
    icon: FileText,
    title: "Record",
    text: "Keep reports ready for follow-up visits and vaccination planning.",
  },
];

const checklist = [
  {
    icon: Milk,
    title: "Daily observation",
    text: "Record appetite, milk, fever, and skin changes.",
  },
  {
    icon: Syringe,
    title: "Vaccination tracking",
    text: "Keep upcoming and completed doses visible.",
  },
  {
    icon: CalendarClock,
    title: "Follow-up care",
    text: "Review reports before symptoms become harder to manage.",
  },
];

export default function Home({ setTheme }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [theme, setLocalTheme] = useState(localStorage.getItem("theme") || "light");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [inspectOpen, setInspectOpen] = useState(false);
  const [cows, setCows] = useState([]);
  const [cowsLoading, setCowsLoading] = useState(false);
  const [cowsError, setCowsError] = useState("");
  const [selectedCowId, setSelectedCowId] = useState("");
  const [cowMenuOpen, setCowMenuOpen] = useState(false);
  const [scanStats, setScanStats] = useState({
    weeklyScans: 0,
    openAlerts: 0,
    healthIndex: 0,
    healthIndexText: "Add cattle records and scans to build the health index.",
  });

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    setUser(storedUser ? JSON.parse(storedUser) : { name: "Farmer" });
  }, []);

  useEffect(() => {
    if (!user?._id) return;

    let active = true;
    setCowsLoading(true);
    setCowsError("");

    (async () => {
      try {
        const response = await fetch(`${API_BASE}/api/cow/user/${user._id}`);
        const data = await response.json().catch(() => []);
        if (!response.ok) {
          throw new Error(data?.message || "Unable to load registered cows.");
        }
        if (active) {
          const nextCows = Array.isArray(data) ? data : [];
          setCows(nextCows);

          const scanResponses = await Promise.allSettled(
            nextCows.map((cow) =>
              fetch(`${API_BASE}/api/scan/cow/${cow._id}`).then((scanResponse) =>
                scanResponse.ok ? scanResponse.json() : [],
              ),
            ),
          );

          if (!active) return;

          const now = Date.now();
          const allScanLists = scanResponses.map((result) =>
            result.status === "fulfilled" && Array.isArray(result.value) ? result.value : [],
          );
          const allScans = allScanLists.flat();
          const weeklyScans = allScans.filter((scan) => {
            const scanTime = new Date(scan.createdAt || scan.reportDate || 0).getTime();
            return Number.isFinite(scanTime) && now - scanTime <= oneWeekInMs;
          }).length;
          const openAlerts = allScanLists.filter((scanList) => {
            const latestScan = [...scanList].sort(
              (a, b) => new Date(b.createdAt || b.reportDate || 0) - new Date(a.createdAt || a.reportDate || 0),
            )[0];
            return latestScan && latestScan.severity && latestScan.severity !== "None";
          }).length;
          const healthIndex = getHealthIndex(nextCows, allScanLists);

          setScanStats({
            weeklyScans,
            openAlerts,
            healthIndex: healthIndex.score,
            healthIndexText: healthIndex.label,
          });
        }
      } catch (error) {
        if (active) setCowsError(error.message || "Unable to load registered cows.");
      } finally {
        if (active) setCowsLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [user?._id]);

  const displayName = useMemo(() => {
    const rawName = user?.name || user?.email || "Farmer";
    const firstName = rawName.split(/[ @]/)[0];
    return firstName ? firstName.charAt(0).toUpperCase() + firstName.slice(1) : "Farmer";
  }, [user]);

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setLocalTheme(nextTheme);
    setTheme?.(nextTheme);
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/login");
  };

  const selectedCow = useMemo(
    () => cows.find((cow) => cow._id === selectedCowId) || null,
    [cows, selectedCowId],
  );
  const vaccinationReminders = useMemo(() => getUpcomingVaccinationReminders(cows), [cows]);

  useEffect(() => {
    if (vaccinationReminders.length === 0 && notificationsOpen) {
      setNotificationsOpen(false);
    }
  }, [notificationsOpen, vaccinationReminders.length]);

  const dashboardStats = useMemo(
    () =>
      stats.map((item) => {
        if (item.label === "Registered cattle") {
          return {
            ...item,
            value: String(cows.length),
            detail: cows.length === 1 ? "Profile in your herd" : "Profiles in your herd",
          };
        }

        if (item.label === "Scans this week") {
          return {
            ...item,
            value: String(scanStats.weeklyScans),
            detail: scanStats.weeklyScans === 1 ? "Image check completed" : "Image checks completed",
          };
        }

        if (item.label === "Open alerts") {
          return {
            ...item,
            value: String(scanStats.openAlerts),
            detail: scanStats.openAlerts > 0 ? "Cows need review" : "No urgent cases",
          };
        }

        return item;
      }),
    [cows.length, scanStats],
  );

  const handleActionClick = (item) => {
    if (item.path === "inspect") {
      setInspectOpen((current) => !current);
      setCowMenuOpen(false);
      return;
    }

    navigate(item.path);
  };

  const handleStartScan = () => {
    if (!selectedCowId) return;
    navigate(`/scan/${selectedCowId}`);
  };

  const handleSelectCow = (cowId) => {
    setSelectedCowId(cowId);
    setCowMenuOpen(false);
  };

  return (
    <main className="home-page">
      <header className="home-topbar">
        <button className="home-brand" onClick={() => navigate("/home")} aria-label="Go to dashboard">
          <span className="home-brand-mark">
            <ShieldCheck size={22} />
          </span>
          <span>
            <strong>LSDGuard</strong>
            <small>AI cattle health scanner</small>
          </span>
        </button>

        <div className="home-topbar-actions">
          <button className="home-icon-button" onClick={toggleTheme} aria-label="Toggle theme">
            {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          <button
            className="home-icon-button"
            aria-label="Notifications"
            onClick={() => {
              if (vaccinationReminders.length > 0) setNotificationsOpen(true);
            }}
          >
            <Bell size={18} />
            {vaccinationReminders.length > 0 && (
              <span className="home-notification-dot">{vaccinationReminders.length}</span>
            )}
          </button>
          <button className="home-profile-button" onClick={handleLogout}>
            <UserRound size={18} />
            <span>{displayName}</span>
            <LogOut size={16} />
          </button>
        </div>
      </header>

      <section className="home-shell">
        <section className="home-hero">
          <div className="home-hero-copy">
            <p className="home-kicker">
              <Sparkles size={15} />
              Farm Health Dashboard
            </p>
            <h1>Welcome back, {displayName}</h1>
            <p>
              Monitor your herd, start skin scans, and keep LSD prevention work organized from one calm,
              professional workspace.
            </p>

            <div className="home-hero-insights">
              <div>
                <strong>24/7</strong>
                <span>Farm workspace access</span>
              </div>
              <div>
                <strong>10m</strong>
                <span>Reset code validity</span>
              </div>
              <div>
                <strong>PDF</strong>
                <span>Report-ready records</span>
              </div>
            </div>

            <div className="home-hero-strip">
              <span>
                <ShieldCheck size={15} />
                Account protected
              </span>
              <span>
                <ScanLine size={15} />
                Image workflow
              </span>
              <span>
                <CalendarClock size={15} />
                History timeline
              </span>
            </div>
          </div>

          <div className="home-scan-preview" aria-label="Cattle scan preview">
            <div className="home-preview-top">
              <div>
                <span>Current status</span>
                <strong>Ready for review</strong>
              </div>
              <span className="home-live-dot" />
            </div>
            <div className="home-cow-stage">
              <span className="home-sun" />
              <span className="home-cloud cloud-one" />
              <span className="home-field-line line-one" />
              <span className="home-field-line line-two" />
              <img src={cowImage} alt="Cow health scanner preview" className="home-cute-cow" />
              <span className="home-scan-line" />
              <span className="home-floating-tag tag-one">Skin check</span>
              <span className="home-floating-tag tag-two">Report saved</span>
              <span className="home-floating-tag tag-three">Healthy routine</span>
            </div>
          </div>
        </section>

        <section className="home-stat-grid" aria-label="Farm metrics">
          {dashboardStats.map((item) => (
            <StatCard key={item.label} {...item} />
          ))}
        </section>

        <section className="home-main-grid">
          <div className="home-panel home-actions-panel">
            <SectionHead label="Quick Actions" title="What do you want to do now?" />
            <div className="home-action-list">
              {actions.map((item) => (
                <React.Fragment key={item.title}>
                  <ActionButton {...item} onClick={() => handleActionClick(item)} expanded={item.path === "inspect" && inspectOpen} />
                  {item.path === "inspect" && inspectOpen && (
                    <section className="home-inspect-panel" aria-label="Inspect cow">
                      {cowsLoading ? (
                        <p className="home-inspect-message">Loading registered cows...</p>
                      ) : cowsError ? (
                        <p className="home-inspect-message error">{cowsError}</p>
                      ) : cows.length === 0 ? (
                        <div className="home-inspect-empty">
                          <strong>No registered cows found</strong>
                          <p>Add a cow profile first, then come back to start a scan.</p>
                          <button type="button" onClick={() => navigate("/add-cow")}>Add Cow</button>
                        </div>
                      ) : (
                        <>
                          <div className="home-cow-select">
                            <span>Select cow</span>
                            <button
                              className="home-cow-select-trigger"
                              type="button"
                              onClick={() => setCowMenuOpen((current) => !current)}
                              aria-expanded={cowMenuOpen}
                            >
                              <span>{selectedCow ? selectedCow.cowName : "Choose a registered cow"}</span>
                              <ChevronDown size={18} />
                            </button>
                            {cowMenuOpen && (
                              <div className="home-cow-menu" role="listbox">
                                {cows.map((cow) => (
                                  <button
                                    key={cow._id}
                                    type="button"
                                    className={cow._id === selectedCowId ? "selected" : ""}
                                    onClick={() => handleSelectCow(cow._id)}
                                  >
                                    {cow.photo ? (
                                      <img src={cow.photo} alt="" />
                                    ) : (
                                      <span className="home-cow-menu-avatar">
                                        {(cow.cowName || "C").charAt(0).toUpperCase()}
                                      </span>
                                    )}
                                    <span>
                                      <strong>{cow.cowName}</strong>
                                      <small>
                                        {cow.gender || "Gender not added"}
                                        {cow.ageYears !== undefined ? `, ${cow.ageYears} yr ${cow.ageMonths || 0} mo` : ""}
                                      </small>
                                    </span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          {selectedCow && (
                            <article className="home-selected-cow">
                              {selectedCow.photo && <img src={selectedCow.photo} alt={selectedCow.cowName} />}
                              <div>
                                <strong>{selectedCow.cowName}</strong>
                                <p>
                                  {selectedCow.gender || "Gender not added"} cow
                                  {selectedCow.ageYears !== undefined ? `, ${selectedCow.ageYears} yr ${selectedCow.ageMonths || 0} mo` : ""}
                                </p>
                                <span>
                                  Milk: {selectedCow.gender === "Female" ? `${selectedCow.milkProduction || 0} L/day` : "Not applicable"}
                                </span>
                                <span>Vaccines done: {selectedCow.vaccinationsDone ?? 0}</span>
                              </div>
                            </article>
                          )}

                          <button className="home-start-scan-button" type="button" onClick={handleStartScan} disabled={!selectedCowId}>
                            <ScanLine size={18} />
                            Start Scan
                          </button>
                        </>
                      )}
                    </section>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          <div className="home-panel home-status-panel">
            <div className="home-status-header">
              <div>
                <p className="home-kicker">Report Index</p>
                <h2>Health report index</h2>
              </div>
              <div
                className="home-score-ring"
                style={{ "--score": `${scanStats.healthIndex * 3.6}deg` }}
              >
                <strong>{scanStats.healthIndex}</strong>
                <span>Score</span>
              </div>
            </div>
            <p className="home-status-copy">
              {scanStats.healthIndexText}
            </p>
          </div>
        </section>

        <section className="home-main-grid lower">
          <div className="home-panel">
            <SectionHead label="Recommended Flow" title="A clean routine for every cow" />
            <div className="home-workflow-list">
              {workflow.map((item, index) => (
                <WorkflowStep key={item.title} number={index + 1} {...item} />
              ))}
            </div>
          </div>

          <div className="home-panel">
            <SectionHead label="Prevention" title="Care checklist" />
            <div className="home-check-list">
              {checklist.map((item) => (
                <ChecklistItem key={item.title} {...item} />
              ))}
            </div>
          </div>
        </section>

        <section className="home-footer-actions" aria-label="Outbreak and history actions">
          <article className="home-outbreak-ready">
            <div className="home-footer-action-text">
              <span className="home-footer-action-icon warning">
                <AlertCircle size={17} />
              </span>
              <div>
                <strong>Outbreak readiness</strong>
                <p>Keep image scans updated to catch possible warning signs earlier.</p>
              </div>
            </div>
            <button type="button" onClick={() => navigate("/outbreak-map")}>
              Check outbreak map
            </button>
          </article>

          <article className="home-history-ready">
            <h2>Quick Actions</h2>
            <button type="button" onClick={() => navigate("/past-history")}>
              <Sparkles size={18} />
              View Past History
            </button>
          </article>

          <p>Early detection protects every animal in your care.</p>
        </section>

        <footer className="home-footer">
          <div className="home-footer-brand">
            <span className="home-brand-mark">
              <ShieldCheck size={20} />
            </span>
            <div>
              <strong>LSDGuard</strong>
              <p>AI-assisted cattle health records for organized farm care.</p>
            </div>
          </div>

          <div className="home-footer-links" aria-label="Footer links">
            <button type="button" onClick={() => navigate("/view-cows")}>Herd Records</button>
            <button type="button" onClick={() => navigate("/vaccination")}>Vaccination</button>
            <button type="button" onClick={() => navigate("/past-history")}>History</button>
            <button type="button" onClick={() => navigate("/help/contact")}>Support</button>
            <button type="button" onClick={() => navigate("/help/about")}>About</button>
          </div>

          <div className="home-footer-meta">
            <span>Local dashboard</span>
            <span>Secure account session</span>
          </div>
        </footer>
      </section>

      {notificationsOpen && vaccinationReminders.length > 0 && (
        <div className="home-overlay" onClick={() => setNotificationsOpen(false)}>
          <section className="home-sheet" onClick={(event) => event.stopPropagation()}>
            <button
              className="home-sheet-close"
              onClick={() => setNotificationsOpen(false)}
              aria-label="Close notifications"
            >
              x
            </button>
            <p className="home-kicker">Notifications</p>
            <h2>Upcoming vaccinations</h2>
            <p>
              Reminders appear when a vaccination date is within the next 20 days.
            </p>
            <div className="home-notification-list">
              {vaccinationReminders.map((reminder, index) => (
                <article
                  className="home-notification-item"
                  key={`${reminder.cowName}-${reminder.date}-${index}`}
                >
                  <div>
                    <strong>{reminder.cowName}</strong>
                    <span>
                      {reminder.dueDate.toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                      {reminder.time ? ` at ${reminder.time}` : ""}
                    </span>
                    {reminder.doctor && <small>Doctor: {reminder.doctor}</small>}
                  </div>
                  <b>{reminder.daysLeft === 0 ? "Today" : `${reminder.daysLeft}d left`}</b>
                </article>
              ))}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

function SectionHead({ label, title }) {
  return (
    <div className="home-section-head">
      <p className="home-kicker">{label}</p>
      <h2>{title}</h2>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, detail, tone }) {
  return (
    <article className={`home-stat-card ${tone}`}>
      <span className="home-stat-icon">
        <Icon size={20} />
      </span>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <p>{detail}</p>
      </div>
    </article>
  );
}

function ActionButton({ icon: Icon, title, text, variant, onClick, expanded }) {
  return (
    <button className={`home-action-button ${variant}`} onClick={onClick} aria-expanded={expanded}>
      <span>
        <Icon size={22} />
      </span>
      <div>
        <strong>{title}</strong>
        <small>{text}</small>
      </div>
      <ChevronRight size={20} />
    </button>
  );
}

function WorkflowStep({ icon: Icon, number, title, text }) {
  return (
    <article className="home-workflow-step">
      <span className="home-step-number">{String(number).padStart(2, "0")}</span>
      <span className="home-workflow-icon">
        <Icon size={18} />
      </span>
      <div>
        <strong>{title}</strong>
        <p>{text}</p>
      </div>
    </article>
  );
}

function ChecklistItem({ icon: Icon, title, text }) {
  return (
    <article className="home-check-item">
      <span>
        <Icon size={18} />
      </span>
      <div>
        <strong>{title}</strong>
        <p>{text}</p>
      </div>
    </article>
  );
}
