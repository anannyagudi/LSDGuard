import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiBase } from "../utils/image";

const getStoredUserId = () => {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    return user?._id || user?.id || user?.userId || "";
  } catch {
    return "";
  }
};

const todayStart = () => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
};

const formatDate = (value) => {
  if (!value) return "Date not set";
  const date = new Date(String(value).includes("T") ? value : `${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "Date not set";
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

const getDaysLabel = (dateValue) => {
  if (!dateValue) return "Not scheduled";
  const dueDate = new Date(String(dateValue).includes("T") ? dateValue : `${dateValue}T00:00:00`);
  if (Number.isNaN(dueDate.getTime())) return "Not scheduled";
  dueDate.setHours(0, 0, 0, 0);
  const diff = Math.ceil((dueDate.getTime() - todayStart().getTime()) / (24 * 60 * 60 * 1000));
  if (diff < 0) return `${Math.abs(diff)}d overdue`;
  if (diff === 0) return "Due today";
  return `${diff}d left`;
};

const normalizeVaccinationRows = (cow) => {
  const slots = Array.isArray(cow.vaccinationSlots) ? cow.vaccinationSlots : [];
  const rows = slots
    .filter((slot) => slot?.date || slot?.time || slot?.doctor || slot?.completed)
    .map((slot, index) => ({
      id: `${cow._id}-${slot._id || index}`,
      cow,
      date: slot.date || "",
      time: slot.time || "",
      doctor: slot.doctor || "",
      completed: Boolean(slot.completed),
      source: "slot",
    }));

  if (rows.length === 0 && cow.pendingVaccinationDate && Number(cow.vaccinationsPending || 0) > 0) {
    rows.push({
      id: `${cow._id}-legacy-pending`,
      cow,
      date: cow.pendingVaccinationDate,
      time: "",
      doctor: cow.pendingVaccinationDoctor || "",
      completed: false,
      source: "legacy",
    });
  }

  return rows;
};

const getRowStatus = (row) => {
  if (row.completed) return "completed";
  if (!row.date) return "unscheduled";
  const dueDate = new Date(String(row.date).includes("T") ? row.date : `${row.date}T00:00:00`);
  if (Number.isNaN(dueDate.getTime())) return "unscheduled";
  dueDate.setHours(0, 0, 0, 0);
  return dueDate < todayStart() ? "overdue" : "upcoming";
};

export default function VaccinationTracker() {
  const navigate = useNavigate();
  const [cows, setCows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("upcoming");
  const [savingCowId, setSavingCowId] = useState("");

  const loadCows = async () => {
    const userId = getStoredUserId();
    if (!userId) {
      setCows([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${apiBase}/cow/user/${userId}`);
      const data = await response.json().catch(() => []);
      if (!response.ok) throw new Error(data?.message || "Could not load vaccination tracker.");
      setCows(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Could not load vaccination tracker.");
      setCows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCows();
  }, []);

  const rows = useMemo(() => {
    const allRows = cows.flatMap(normalizeVaccinationRows).map((row) => ({
      ...row,
      status: getRowStatus(row),
    }));

    return allRows.sort((a, b) => {
      const aTime = a.date ? new Date(a.date).getTime() : Number.MAX_SAFE_INTEGER;
      const bTime = b.date ? new Date(b.date).getTime() : Number.MAX_SAFE_INTEGER;
      return aTime - bTime;
    });
  }, [cows]);

  const normalCows = useMemo(
    () => cows.filter((cow) => normalizeVaccinationRows(cow).filter((row) => !row.completed).length === 0),
    [cows],
  );

  const counts = useMemo(() => ({
    all: rows.length,
    upcoming: rows.filter((row) => row.status === "upcoming").length,
    overdue: rows.filter((row) => row.status === "overdue").length,
    completed: rows.filter((row) => row.status === "completed").length,
    normal: normalCows.length,
  }), [normalCows.length, rows]);

  const visibleRows = rows.filter((row) => filter === "all" || row.status === filter);
  const showNormal = filter === "normal";

  const markComplete = async (cowId) => {
    setSavingCowId(cowId);
    setError("");
    try {
      const response = await fetch(`${apiBase}/cow/${cowId}/vaccination/complete`, { method: "PUT" });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.message || "Could not complete vaccination.");
      await loadCows();
    } catch (err) {
      setError(err.message || "Could not complete vaccination.");
    } finally {
      setSavingCowId("");
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.shell}>
        <div style={styles.header}>
          <button style={styles.backBtn} type="button" onClick={() => navigate(-1)}>{"<-"}</button>
          <div>
            <div style={styles.eyebrow}>Vaccination Tracker</div>
            <h1 style={styles.title}>Herd vaccination schedule</h1>
            <p style={styles.sub}>Review upcoming, overdue, completed, and normal cattle vaccination status.</p>
          </div>
        </div>

        <div style={styles.bodyPanel}>
          {error && <div style={styles.error}>{error}</div>}

          <div style={styles.summaryGrid}>
            <SummaryCard label="Upcoming" value={counts.upcoming} tone="green" />
            <SummaryCard label="Overdue" value={counts.overdue} tone="warning" />
            <SummaryCard label="Completed" value={counts.completed} tone="blue" />
            <SummaryCard label="Normal" value={counts.normal} tone="plain" />
          </div>

          <div style={styles.tabs}>
            {[
              ["upcoming", `Upcoming (${counts.upcoming})`],
              ["overdue", `Overdue (${counts.overdue})`],
              ["completed", `Completed (${counts.completed})`],
              ["normal", `Normal (${counts.normal})`],
              ["all", `All (${counts.all})`],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                style={filter === key ? styles.tabActive : styles.tab}
                onClick={() => setFilter(key)}
              >
                {label}
              </button>
            ))}
          </div>

          {loading ? (
            <div style={styles.empty}>Loading vaccination records...</div>
          ) : showNormal ? (
            normalCows.length === 0 ? (
              <div style={styles.empty}>No normal cattle found for this filter.</div>
            ) : (
              <div style={styles.list}>
                {normalCows.map((cow) => (
                  <article key={cow._id} style={styles.row}>
                    <div>
                      <h3 style={styles.cowName}>{cow.cowName}</h3>
                      <p style={styles.meta}>No pending vaccination schedule. Done: {cow.vaccinationsDone || 0}</p>
                    </div>
                    <button style={styles.outlineBtn} type="button" onClick={() => navigate(`/cow/${cow._id}`)}>
                      View cow
                    </button>
                  </article>
                ))}
              </div>
            )
          ) : visibleRows.length === 0 ? (
            <div style={styles.empty}>No vaccination records in this category.</div>
          ) : (
            <div style={styles.list}>
              {visibleRows.map((row) => (
                <article key={row.id} style={styles.row}>
                  <div style={styles.rowMain}>
                    <div>
                      <h3 style={styles.cowName}>{row.cow.cowName}</h3>
                      <p style={styles.meta}>
                        {formatDate(row.date)} {row.time ? `at ${row.time}` : ""} | Doctor: {row.doctor || "Not assigned"}
                      </p>
                    </div>
                    <span style={statusStyle(row.status)}>{row.status}</span>
                  </div>

                  <div style={styles.rowFooter}>
                    <span style={styles.days}>{getDaysLabel(row.date)}</span>
                    <div style={styles.actions}>
                      <button style={styles.outlineBtn} type="button" onClick={() => navigate(`/cow/${row.cow._id}`)}>
                        View cow
                      </button>
                      {row.status !== "completed" && (
                        <button
                          style={styles.completeBtn}
                          type="button"
                          disabled={savingCowId === row.cow._id}
                          onClick={() => markComplete(row.cow._id)}
                        >
                          {savingCowId === row.cow._id ? "Saving..." : "Mark done"}
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, tone }) {
  return (
    <div style={{ ...styles.summaryCard, ...(styles.summaryTones[tone] || {}) }}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

const statusStyle = (status) => {
  const tone = {
    upcoming: { background: "var(--success-soft)", color: "var(--success-text)", border: "1px solid var(--success-border)" },
    overdue: { background: "var(--warning-soft)", color: "var(--warning-text)", border: "1px solid var(--warning-border)" },
    completed: { background: "var(--surface-soft)", color: "var(--text)", border: "1px solid var(--app-border)" },
    unscheduled: { background: "var(--background)", color: "var(--text-secondary)", border: "1px solid var(--app-border)" },
  };
  return {
    ...(tone[status] || tone.unscheduled),
    borderRadius: "999px",
    padding: "7px 11px",
    fontSize: "12px",
    fontWeight: 900,
    textTransform: "capitalize",
  };
};

const styles = {
  page: {
    minHeight: "100vh",
    padding: "16px",
    background: "var(--background)",
    color: "var(--text)",
    fontFamily: "Georgia, 'Times New Roman', serif",
  },
  shell: { width: "min(1120px, 100%)", margin: "0 auto" },
  header: {
    background: "linear-gradient(135deg, #218a4d 0%, #39b86b 100%)",
    color: "white",
    borderRadius: "28px 28px 0 0",
    padding: "18px",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    boxShadow: "0 18px 34px rgba(33, 138, 77, 0.16)",
  },
  backBtn: {
    width: "40px",
    height: "40px",
    borderRadius: "14px",
    border: "1px solid rgba(255,255,255,0.2)",
    background: "rgba(255,255,255,0.14)",
    color: "white",
    fontSize: "18px",
    cursor: "pointer",
    flexShrink: 0,
  },
  eyebrow: { fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 800, opacity: 0.85 },
  title: { margin: "7px 0 5px", fontSize: "28px", lineHeight: 1.1 },
  sub: { margin: 0, fontSize: "14px", lineHeight: 1.5, color: "rgba(255,255,255,0.9)" },
  bodyPanel: {
    background: "linear-gradient(180deg, var(--card) 0%, var(--background) 100%)",
    border: "1px solid var(--app-border)",
    borderTop: 0,
    borderRadius: "0 0 28px 28px",
    padding: "18px",
    boxShadow: "var(--app-shadow)",
  },
  error: {
    marginBottom: "14px",
    padding: "12px 14px",
    borderRadius: "14px",
    background: "var(--danger-soft)",
    color: "var(--danger-text)",
    fontWeight: 800,
  },
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: "12px",
    marginBottom: "14px",
  },
  summaryCard: {
    borderRadius: "18px",
    padding: "16px",
    border: "1px solid var(--app-border)",
    background: "var(--card)",
    display: "grid",
    gap: "6px",
  },
  summaryTones: {
    green: { background: "var(--success-soft)", borderColor: "var(--success-border)" },
    warning: { background: "var(--warning-soft)", borderColor: "var(--warning-border)" },
    blue: { background: "var(--surface-soft)", borderColor: "var(--app-border)" },
    plain: { background: "var(--card)", borderColor: "var(--app-border)" },
  },
  tabs: { display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "14px" },
  tab: {
    border: "1px solid var(--app-border)",
    background: "var(--background)",
    color: "var(--text-secondary)",
    padding: "9px 13px",
    borderRadius: "999px",
    fontWeight: 800,
    cursor: "pointer",
  },
  tabActive: {
    border: "1px solid transparent",
    background: "linear-gradient(135deg, #219653 0%, #34b566 100%)",
    color: "white",
    padding: "9px 13px",
    borderRadius: "999px",
    fontWeight: 800,
    cursor: "pointer",
  },
  list: { display: "grid", gap: "12px" },
  row: {
    background: "var(--card)",
    border: "1px solid var(--app-border)",
    borderRadius: "18px",
    padding: "16px",
    boxShadow: "0 10px 24px rgba(42, 82, 52, 0.06)",
  },
  rowMain: { display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-start", flexWrap: "wrap" },
  cowName: { margin: 0, fontSize: "20px", color: "var(--text)" },
  meta: { margin: "6px 0 0", color: "var(--text-secondary)", fontWeight: 700, lineHeight: 1.45 },
  rowFooter: {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    alignItems: "center",
    flexWrap: "wrap",
    marginTop: "14px",
  },
  days: {
    color: "var(--success-text)",
    background: "var(--success-soft)",
    border: "1px solid var(--success-border)",
    padding: "8px 12px",
    borderRadius: "999px",
    fontWeight: 900,
    fontSize: "13px",
  },
  actions: { display: "flex", gap: "10px", flexWrap: "wrap" },
  outlineBtn: {
    border: "1px solid var(--app-border)",
    background: "var(--background)",
    color: "var(--text)",
    borderRadius: "12px",
    padding: "10px 14px",
    fontWeight: 800,
    cursor: "pointer",
  },
  completeBtn: {
    border: "1px solid var(--success-border)",
    background: "var(--success-soft)",
    color: "var(--success-text)",
    borderRadius: "12px",
    padding: "10px 14px",
    fontWeight: 900,
    cursor: "pointer",
  },
  empty: {
    background: "var(--card)",
    border: "1px dashed var(--app-border)",
    color: "var(--text-secondary)",
    borderRadius: "18px",
    padding: "24px",
    textAlign: "center",
    fontWeight: 800,
  },
};
