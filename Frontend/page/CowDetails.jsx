import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getCow, getCowScans } from "../services/api";
import ScanCard from "../components/ScanCard";
import { useLanguage } from "../context/useLanguage";
import { useRef } from "react";
import { apiBase, getCowImageUrl } from "../utils/image";
import { useTranslatedText } from "../hooks/useTranslatedText";

const fileRoot = apiBase.replace(/\/api\/?$/, "");

function getReportUrl(report = "") {
  if (!report) return "";
  if (/^https?:\/\//i.test(report)) return report;
  return `${fileRoot}/${String(report).replace(/^\/+/, "")}`;
}

export default function CowDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [cow, setCow] = useState(null);
  const [scans, setScans] = useState([]);
  const [monthFilter, setMonthFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [vacFilter, setVacFilter] = useState("upcoming"); // all | upcoming | missed | completed
  const [reportUploading, setReportUploading] = useState(false);
  const [reportError, setReportError] = useState(null);
  const reportInputRef = useRef(null);
  const { t } = useLanguage();
  const displayName = useTranslatedText(cow?.cowName || "");

  useEffect(() => {
    loadData();
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") fetchScans();
    }, 3000);
    return () => window.clearInterval(interval);
  }, [id]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const cowData = await getCow(id);
      setCow(cowData);
      await fetchScans();
    } catch (err) {
      console.error(err);
      setError(t("cowDetails.fetchFailed", "Failed to load cow details"));
    } finally {
      setLoading(false);
    }
  };

  const fetchScans = async () => {
    try {
      const scanData = await getCowScans(id);
      setScans(scanData);
    } catch (err) {
      console.error(err);
    }
  };

  const handleReportUpload = async (file) => {
    if (!file) return;
    setReportUploading(true);
    setReportError(null);
    try {
      const form = new FormData();
      // Include multiple common field names to match backend expectations
      form.append("report", file);
      form.append("healthReport", file);
      form.append("file", file);
      form.append("cowId", id);
      const res = await fetch(`${apiBase}/cow/${id}/report`, {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || data.error || "Upload failed");
      }
      const data = await res.json();
      await loadData();
      setCow((prev) => ({ ...prev, healthReport: data.healthReport || data.file || prev.healthReport }));
    } catch (err) {
      console.error(err);
      setReportError(err.message || "Could not upload report");
    } finally {
      setReportUploading(false);
    }
  };

  const handleDeleteScan = async (scanId) => {
    const confirmDelete = window.confirm(t("cowDetails.confirmDeleteScan"));
    if (!confirmDelete) return;
    try {
      await fetch(`http://localhost:5000/api/scan/${scanId}`, { method: "DELETE" });
      setScans((prev) => prev.filter((scan) => scan._id !== scanId));
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  if (loading) return <h2 style={{ padding: "20px", color: "var(--text)" }}>{t("cowDetails.loading")}</h2>;
  if (error) return (
    <div style={{ padding: "20px", color: "var(--text)" }}>
      <p>{error}</p>
      <button style={{ marginTop: "12px" }} onClick={loadData}>{t("common.retry", "Retry")}</button>
    </div>
  );
  if (!cow) return <h2 style={{ padding: "20px", color: "var(--text)" }}>{t("cowDetails.loading")}</h2>;

  const doctorReports = (() => {
    const arr = Array.isArray(cow.doctorReports) ? [...cow.doctorReports] : [];
    if (cow.healthReport && !arr.includes(cow.healthReport)) arr.unshift(cow.healthReport);
    return arr;
  })();

  const noFilterActive = monthFilter === "all" && yearFilter === "all";
  const filteredScans = (() => {
    const filtered = scans.filter((scan) => {
      const scanDate = new Date(scan.createdAt);
      const monthMatch = monthFilter === "all" || scanDate.getMonth() === parseInt(monthFilter);
      const yearMatch = yearFilter === "all" || scanDate.getFullYear() === parseInt(yearFilter);
      return monthMatch && yearMatch;
    });
    // When no filter is active show only the 3 most recent scans
    return noFilterActive ? filtered.slice(0, 3) : filtered;
  })();

  // ── Build all vaccination slots ──────────────────────────────────────
  // vaccinationSlots = upcoming (to be done) slots
  // vaccinationsPending = missed/overdue count  
  // vaccinationsDone = completed count

  const upcomingSlots = (Array.isArray(cow.vaccinationSlots) ? cow.vaccinationSlots : [])
    .filter((s) => !s.completed)
    .map((s) => ({ ...s, kind: "upcoming" }));

  const missedSlots = (Array.isArray(cow.vaccinationSlots) ? cow.vaccinationSlots : [])
    .filter((s) => s.kind === "missed")
    .map((s) => ({ ...s, kind: "missed" }));

  // Build missed from legacy pendingVaccinationDate if no dedicated missed slots
  const missedDisplay = missedSlots.length > 0 ? missedSlots : (() => {
    const pending = Number(cow.vaccinationsPending || 0);
    const legacyDate = cow.pendingVaccinationDate ? new Date(cow.pendingVaccinationDate) : null;
    const validDate = legacyDate && !Number.isNaN(legacyDate.getTime());
    return Array.from({ length: pending }, (_, i) => ({
      date: validDate && i === 0 ? legacyDate.toISOString().slice(0, 10) : "",
      time: validDate && i === 0
        ? `${String(legacyDate.getHours()).padStart(2, "0")}:${String(legacyDate.getMinutes()).padStart(2, "0")}`
        : "",
      doctor: i === 0 ? (cow.pendingVaccinationDoctor || "") : "",
      kind: "missed",
    }));
  })();

  const completedSlots = (Array.isArray(cow.vaccinationSlots) ? cow.vaccinationSlots : [])
    .filter((s) => s.completed)
    .map((s) => ({ ...s, kind: "completed" }));

  // Build completed placeholders from done count if no completed slot data
  const completedDisplay = completedSlots.length > 0 ? completedSlots : (() => {
    const done = Number(cow.vaccinationsDone || 0);
    return Array.from({ length: done }, (_, i) => ({
      date: "", time: "", doctor: "", kind: "completed", completed: true,
    }));
  })();

  // Summary counts
  const totalUpcoming = upcomingSlots.length;
  const totalMissed = missedDisplay.length;
  const totalCompleted = completedDisplay.length;
  const totalAll = totalUpcoming + totalMissed + totalCompleted;

  // Filter tabs
  const vacTabs = [
    { key: "all",       label: `All (${totalAll})` },
    { key: "upcoming",  label: `📅 Upcoming (${totalUpcoming})` },
    { key: "missed",    label: `⚠️ Missed (${totalMissed})` },
    { key: "completed", label: `✅ Done (${totalCompleted})` },
  ];

  const visibleUpcoming  = vacFilter === "all" || vacFilter === "upcoming";
  const visibleMissed    = vacFilter === "all" || vacFilter === "missed";
  const visibleCompleted = vacFilter === "all" || vacFilter === "completed";

  return (
    <div style={styles.container}>
      <style>{cowDetailsPageCss}</style>
      <div className="cow-details-shell">
      {/* ── Hero ── */}
      <div className="cow-details-hero" style={styles.hero}>
        <button onClick={() => navigate(-1)} style={styles.backBtn}>{"<-"}</button>
        <div style={styles.heroTop}>
          <div>
            <div style={styles.eyebrow}>{t("cowDetails.eyebrow")}</div>
            <h2 style={styles.heroTitle}>{displayName}</h2>
            <p style={styles.heroText}>{t("cowDetails.heroText")}</p>
          </div>
          {getCowImageUrl(cow) && (
            <img
              src={getCowImageUrl(cow)}
              alt={displayName}
              style={styles.heroImage}
            />
          )}
        </div>
      </div>

      <div className="cow-details-body-panel" style={styles.body}>

        {/* ── Basic Info ── */}
        <div className="cow-details-form-card" style={styles.infoCard}>
          <div style={styles.infoGrid}>
            <InfoRow label={t("common.owner")} value={cow.ownerName} />
            <InfoRow label={t("tracker.gender")} value={cow.gender === "Female" ? t("common.female") : t("common.male")} />
            <InfoRow label={t("common.age")} value={`${cow.ageYears} ${t("cowDetails.years")} ${cow.ageMonths} ${t("cowDetails.months")}`} />
            <InfoRow label={t("cowDetails.milkProduction")} value={`${cow.milkProduction} L/day`} />
            <InfoRow
              label="Date of birth"
              value={cow.dateOfBirth ? new Date(cow.dateOfBirth).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : ""}
            />
            <InfoRow label="Vaccinations done" value={cow.vaccinationsDone} />
            <InfoRow label="Vaccinations pending" value={cow.vaccinationsPending} />
          </div>
          <div style={styles.reportRow}>
            <span style={styles.reportLabel}>
              {cow.healthReport
                ? t("cowDetails.healthReport")
                : t("cowDetails.reports", "Reports")}
            </span>
            <button
              type="button"
              onClick={() => navigate(`/cow/${id}/reports`)}
              style={styles.reportLinkButton}
            >
              {t("cowDetails.viewReport")}
            </button>
            <button
              type="button"
              style={styles.addReportButton}
              onClick={() => reportInputRef.current?.click()}
              disabled={reportUploading}
            >
              {reportUploading ? t("common.uploading", "Uploading…") : t("cowDetails.addReport", "Add report")}
            </button>
            <input
              ref={reportInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleReportUpload(file);
                e.target.value = "";
              }}
            />
          </div>
          {reportError && <div style={styles.reportError}>{reportError}</div>}
          <div style={styles.reportList}>
            <div style={styles.reportListTitle}>Stored Cow Reports</div>
            {doctorReports.length === 0 ? (
              <div style={styles.reportEmpty}>No cow reports uploaded yet.</div>
            ) : (
              doctorReports.map((report, index) => (
                <a
                  key={`${report}-${index}`}
                  href={getReportUrl(report)}
                  target="_blank"
                  rel="noreferrer"
                  style={styles.reportFileLink}
                >
                  Report {index + 1}
                </a>
              ))
            )}
          </div>
        </div>

        {/* ── Vaccination Section ── */}
        <div className="cow-details-form-card" style={styles.vacCard}>

          {/* Header + summary pills */}
          <div style={styles.vacHeader}>
            <div style={styles.sectionEyebrow}>Vaccination Schedule</div>
            <div style={styles.vacSummaryRow}>
              <div style={styles.vacSummaryPill}>
                <span style={styles.vacSummaryNum}>{cow.vaccinationsDone || 0}</span>
                <span style={styles.vacSummaryLabel}>Done</span>
              </div>
              <div style={{ ...styles.vacSummaryPill, ...styles.vacSummaryPillBlue }}>
                <span style={styles.vacSummaryNum}>{totalUpcoming}</span>
                <span style={styles.vacSummaryLabel}>Upcoming</span>
              </div>
              <div style={{ ...styles.vacSummaryPill, ...styles.vacSummaryPillWarn }}>
                <span style={styles.vacSummaryNum}>{totalMissed}</span>
                <span style={styles.vacSummaryLabel}>Missed</span>
              </div>
            </div>
          </div>

          {/* Filter tabs */}
          <div style={styles.vacTabRow}>
            {vacTabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                style={vacFilter === tab.key ? styles.vacTabActive : styles.vacTab}
                onClick={() => setVacFilter(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── Upcoming slots ── */}
          {visibleUpcoming && upcomingSlots.length > 0 && (
            <div style={styles.vacGroup}>
              <div style={styles.vacGroupTitle}>📅 Upcoming Vaccinations</div>
              {upcomingSlots.map((slot, i) => (
                <VacSlotCard
                  key={"up-" + i}
                  number={i + 1}
                  slot={slot}
                  kind="upcoming"
                />
              ))}
            </div>
          )}

          {/* ── Missed slots ── */}
          {visibleMissed && missedDisplay.length > 0 && (
            <div style={styles.vacGroup}>
              <div style={styles.vacGroupTitle}>⚠️ Missed / Overdue Vaccinations</div>
              {missedDisplay.map((slot, i) => (
                <VacSlotCard
                  key={"miss-" + i}
                  number={i + 1}
                  slot={slot}
                  kind="missed"
                />
              ))}
            </div>
          )}

          {/* ── Completed slots ── */}
          {visibleCompleted && completedDisplay.length > 0 && (
            <div style={styles.vacGroup}>
              <div style={styles.vacGroupTitle}>✅ Completed Vaccinations</div>
              {completedDisplay.map((slot, i) => (
                <VacSlotCard
                  key={"done-" + i}
                  number={i + 1}
                  slot={slot}
                  kind="completed"
                />
              ))}
            </div>
          )}

          {/* Empty state */}
          {totalAll === 0 && (
            <div style={styles.vacEmpty}>
              No vaccination records yet. Add vaccinations when registering or from the Vaccination Tracker.
            </div>
          )}

          {/* Empty for current filter */}
          {totalAll > 0 &&
            !( (visibleUpcoming && upcomingSlots.length > 0) ||
               (visibleMissed   && missedDisplay.length > 0) ||
               (visibleCompleted && completedDisplay.length > 0) ) && (
            <div style={styles.vacEmpty}>
              No vaccinations in this category.
            </div>
          )}
        </div>

        {/* ── Scan History ── */}
        <div className="cow-details-form-card" style={styles.filterCard}>
          <div>
            <div style={styles.filterTitle}>{t("cowDetails.scanHistory")}</div>
            <div style={styles.filterText}>{t("cowDetails.scanHistoryText")}</div>
            {noFilterActive && scans.length > 3 && (
              <div style={styles.recentNote}>Showing 3 most recent scans. Select a month to see all.</div>
            )}
          </div>
          <div style={styles.filterRow}>
            <select value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} style={styles.select}>
              <option value="all">{t("common.month")}</option>
              <option value="0">{t("months.january")}</option>
              <option value="1">{t("months.february")}</option>
              <option value="2">{t("months.march")}</option>
              <option value="3">{t("months.april")}</option>
              <option value="4">{t("months.may")}</option>
              <option value="5">{t("months.june")}</option>
              <option value="6">{t("months.july")}</option>
              <option value="7">{t("months.august")}</option>
              <option value="8">{t("months.september")}</option>
              <option value="9">{t("months.october")}</option>
              <option value="10">{t("months.november")}</option>
              <option value="11">{t("months.december")}</option>
            </select>
            <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)} style={styles.select}>
              <option value="all">{t("common.year")}</option>
              <option value="2026">2026</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
            </select>
          </div>
        </div>

        {filteredScans.length === 0 && (
          <div style={styles.emptyState}>{t("cowDetails.noScans")}</div>
        )}
        {filteredScans.map((scan) => (
          <div key={scan._id} className="cow-details-form-card" style={styles.scanCard}>
            <ScanCard scan={scan} onDelete={handleDeleteScan} />
          </div>
        ))}
      </div>
      </div>
    </div>
  );
}

/* ── Vaccination Slot Card component ─────────────────────────────────── */
function VacSlotCard({ number, slot, kind }) {
  const hasDate   = !!slot.date;
  const hasTime   = !!slot.time;
  const hasDoctor = !!slot.doctor;

  const cardStyle =
    kind === "completed" ? styles.vacSlotDone :
    kind === "missed"    ? styles.vacSlotMissed :
                           styles.vacSlotUpcoming;

  const badgeStyle =
    kind === "completed" ? styles.badgeDone :
    kind === "missed"    ? styles.badgeMissed :
                           styles.badgeUpcoming;

  const statusStyle =
    kind === "completed" ? styles.statusDone :
    kind === "missed"    ? styles.statusMissed :
                           styles.statusUpcoming;

  const statusText =
    kind === "completed" ? "✓ Completed" :
    kind === "missed"    ? "⚠️ Missed" :
                           "📅 Upcoming";

  const label =
    kind === "completed" ? `Vaccination ${number} — Completed` :
    kind === "missed"    ? `Vaccination ${number} — Missed` :
                           `Vaccination ${number} — Upcoming`;

  return (
    <div style={cardStyle}>
      {/* Top row */}
      <div style={styles.slotTopRow}>
        <div style={badgeStyle}>{label}</div>
        <div style={statusStyle}>{statusText}</div>
      </div>

      {/* Date + Time row */}
      <div style={styles.slotMetaRow}>
        <div style={hasDate ? styles.slotChip : styles.slotChipMuted}>
          📅 {hasDate ? formatDisplayDate(slot.date) : "Date not set"}
        </div>
        <div style={hasTime ? styles.slotChip : styles.slotChipMuted}>
          🕐 {hasTime ? formatDisplayTime(slot.time) : "Time not set"}
        </div>
      </div>

      {/* Doctor row */}
      <div style={styles.slotDoctorRow}>
        <span style={styles.slotDoctorLabel}>👨‍⚕️ Doctor:</span>
        <span style={styles.slotDoctorValue}>
          {hasDoctor
            ? slot.doctor
            : <span style={{ color: "var(--text-secondary)", fontStyle: "italic" }}>Not assigned</span>}
        </span>
      </div>

      {/* Completed note */}
      {kind === "completed" && (hasDate || hasTime || hasDoctor) && (
        <div style={styles.completedNote}>
          Vaccination completed
          {hasDate ? ` on ${formatDisplayDate(slot.date)}` : ""}
          {hasTime ? ` at ${formatDisplayTime(slot.time)}` : ""}
          {hasDoctor ? ` by ${slot.doctor}` : ""}
        </div>
      )}
    </div>
  );
}

/* ── Helpers ─────────────────────────────────────────────────────────── */
function formatDisplayDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function formatDisplayTime(timeStr) {
  if (!timeStr) return "";
  const [h, m] = timeStr.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
}

function InfoRow({ label, value }) {
  const { t } = useLanguage();
  const displayValue = value === 0 || value ? value : t("home.na");
  return (
    <div style={styles.infoRow}>
      <span style={styles.infoLabel}>{label}</span>
      <strong style={styles.infoValue}>{displayValue}</strong>
    </div>
  );
}

const cowDetailsPageCss = `
  .cow-details-shell {
    width: min(1120px, 100%);
    margin: 0 auto;
  }
`;

/* ── Styles ──────────────────────────────────────────────────────────── */
const styles = {
  container: { minHeight: "100vh", background: "var(--background)", color: "var(--text)", fontFamily: "Georgia, 'Times New Roman', serif" },
  hero: { margin: "16px", padding: "18px", borderRadius: "28px", background: "linear-gradient(135deg, #218a4d 0%, #39b86b 100%)", color: "white", boxShadow: "0 18px 34px rgba(33, 138, 77, 0.2)" },
  backBtn: { width: "40px", height: "40px", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.14)", color: "white", fontSize: "24px", cursor: "pointer", marginBottom: "18px", padding: 0 },
  heroTop: { display: "flex", justifyContent: "space-between", gap: "16px", alignItems: "center" },
  eyebrow: { fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: "700", opacity: 0.85 },
  heroTitle: { margin: "10px 0 6px", fontSize: "28px" },
  heroText: { margin: 0, fontSize: "14px", lineHeight: 1.6, color: "rgba(255,255,255,0.88)" },
  heroImage: { width: "92px", height: "92px", borderRadius: "24px", objectFit: "cover", border: "4px solid rgba(255,255,255,0.2)" },
  body: { padding: "0 16px 24px" },

  infoCard: { background: "var(--card)", borderRadius: "24px", padding: "18px", boxShadow: "0 14px 30px rgba(42, 82, 52, 0.08)", border: "1px solid var(--app-border)", marginBottom: "14px" },
  infoRow: { display: "flex", justifyContent: "space-between", gap: "12px", padding: "12px 0", borderBottom: "1px dashed var(--muted-border)", fontSize: "14px" },
  infoLabel: { color: "var(--text-secondary)" },
  infoValue: { color: "var(--text)" },
  reportRow: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", paddingTop: "14px", flexWrap: "wrap" },
  reportLabel: { color: "var(--text-secondary)", fontSize: "14px" },
  reportLinkButton: { color: "var(--success-text)", fontWeight: "700", textDecoration: "none", background: "transparent", border: "1px solid var(--success-border)", padding: "8px 12px", borderRadius: "12px", cursor: "pointer" },
  addReportButton: { color: "var(--text)", fontWeight: "700", background: "var(--background)", border: "1px solid var(--app-border)", padding: "8px 12px", borderRadius: "12px", cursor: "pointer" },
  reportError: { color: "var(--danger-text, #b91c1c)", fontWeight: "600", marginTop: "6px" },

  // ── Vaccination card ─────────────────────────────────────────────────
  reportList: { marginTop: "14px", padding: "12px", borderRadius: "14px", background: "var(--background)", border: "1px solid var(--app-border)", display: "grid", gap: "8px" },
  reportListTitle: { color: "var(--text)", fontWeight: "800", fontSize: "13px" },
  reportEmpty: { color: "var(--text-secondary)", fontSize: "12px" },
  reportFileLink: { color: "var(--success-text)", fontWeight: "800", textDecoration: "none", fontSize: "13px", padding: "8px 10px", borderRadius: "10px", background: "var(--success-soft)", border: "1px solid var(--success-border)" },
  vacCard: { background: "var(--card)", borderRadius: "24px", padding: "18px", boxShadow: "0 14px 30px rgba(42, 82, 52, 0.08)", border: "1px solid var(--app-border)", marginBottom: "14px" },
  vacHeader: { marginBottom: "14px" },
  sectionEyebrow: { fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: "700", color: "#15803d", marginBottom: "10px" },
  vacSummaryRow: { display: "flex", gap: "10px", flexWrap: "wrap" },
  vacSummaryPill: { display: "flex", alignItems: "center", gap: "8px", background: "var(--success-soft)", borderRadius: "14px", padding: "10px 14px", border: "1px solid var(--success-border)" },
  vacSummaryPillWarn: { background: "var(--warning-soft)", border: "1px solid var(--warning-border)" },
  vacSummaryPillBlue: { background: "var(--surface-soft)", border: "1px solid var(--app-border)" },
  vacSummaryNum: { fontSize: "20px", fontWeight: "700", color: "var(--text)", lineHeight: 1 },
  vacSummaryLabel: { fontSize: "12px", color: "var(--text-secondary)", fontWeight: "600" },

  // Filter tabs
  vacTabRow: { display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "14px", marginBottom: "4px" },
  vacTab: { border: "1px solid var(--app-border)", background: "var(--background)", color: "var(--text-secondary)", padding: "9px 14px", borderRadius: "999px", fontWeight: "700", fontSize: "12px", whiteSpace: "nowrap", cursor: "pointer" },
  vacTabActive: { border: "1px solid transparent", background: "linear-gradient(135deg, #219653 0%, #34b566 100%)", color: "white", padding: "9px 14px", borderRadius: "999px", fontWeight: "700", fontSize: "12px", whiteSpace: "nowrap", cursor: "pointer" },

  vacGroup: { marginBottom: "16px" },
  vacGroupTitle: { fontSize: "13px", fontWeight: "700", color: "var(--text)", marginBottom: "10px", paddingBottom: "6px", borderBottom: "1px solid var(--app-border)" },

  // Slot cards
  vacSlotUpcoming: { padding: "14px", borderRadius: "18px", border: "2px solid var(--app-border)", background: "var(--surface-soft)", marginBottom: "10px" },
  vacSlotMissed:   { padding: "14px", borderRadius: "18px", border: "2px solid var(--warning-border)", background: "var(--warning-soft)", marginBottom: "10px" },
  vacSlotDone:     { padding: "14px", borderRadius: "18px", border: "1px solid var(--success-border)", background: "var(--success-soft)", marginBottom: "10px" },

  slotTopRow: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px", flexWrap: "wrap", gap: "6px" },

  badgeUpcoming: { display: "inline-flex", alignItems: "center", background: "var(--surface-soft-2)", color: "var(--text)", padding: "5px 12px", borderRadius: "999px", fontSize: "12px", fontWeight: "700" },
  badgeMissed:   { display: "inline-flex", alignItems: "center", background: "var(--warning-soft-2)", color: "var(--warning-text)", padding: "5px 12px", borderRadius: "999px", fontSize: "12px", fontWeight: "700" },
  badgeDone:     { display: "inline-flex", alignItems: "center", background: "var(--success-soft-2)", color: "var(--success-text)", padding: "5px 12px", borderRadius: "999px", fontSize: "12px", fontWeight: "700" },

  statusUpcoming: { fontSize: "11px", fontWeight: "700", color: "var(--text)", background: "var(--surface-soft)", padding: "4px 10px", borderRadius: "999px", border: "1px solid var(--app-border)" },
  statusMissed:   { fontSize: "11px", fontWeight: "700", color: "var(--warning-text)", background: "var(--warning-soft-2)", padding: "4px 10px", borderRadius: "999px" },
  statusDone:     { fontSize: "11px", fontWeight: "700", color: "var(--success-text)", background: "var(--success-soft-2)", padding: "4px 10px", borderRadius: "999px" },

  slotMetaRow: { display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "8px" },
  slotChip:     { background: "var(--card)", border: "1px solid var(--app-border)", borderRadius: "999px", padding: "5px 12px", fontSize: "12px", fontWeight: "600", color: "var(--text)" },
  slotChipMuted:{ border: "1px dashed var(--app-border)", borderRadius: "999px", padding: "5px 12px", fontSize: "12px", color: "var(--text-secondary)", background: "transparent" },

  slotDoctorRow:   { display: "flex", alignItems: "center", gap: "8px", fontSize: "13px" },
  slotDoctorLabel: { color: "var(--text-secondary)", fontWeight: "600" },
  slotDoctorValue: { color: "var(--text)", fontWeight: "700" },

  completedNote: { marginTop: "10px", padding: "8px 12px", borderRadius: "10px", background: "var(--success-soft-2)", color: "var(--success-text)", fontSize: "12px", fontWeight: "600", lineHeight: 1.5 },

  vacEmpty: { padding: "16px", borderRadius: "14px", background: "var(--background)", border: "1px dashed var(--app-border)", color: "var(--text-secondary)", fontSize: "13px", lineHeight: 1.6, textAlign: "center" },

  // Scan history
  filterCard: { background: "var(--card)", borderRadius: "24px", padding: "18px", boxShadow: "0 14px 30px rgba(42, 82, 52, 0.08)", border: "1px solid var(--app-border)", marginBottom: "14px" },
  filterTitle: { fontSize: "18px", fontWeight: "700", color: "var(--text)" },
  filterText:  { marginTop: "6px", fontSize: "13px", color: "var(--text-secondary)" },
  filterRow:   { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "14px" },
  select: { width: "100%", padding: "14px 15px", borderRadius: "16px", border: "1px solid var(--app-border)", background: "var(--input)", fontSize: "14px", color: "var(--text)" },
  emptyState: { background: "var(--card)", borderRadius: "24px", padding: "20px", textAlign: "center", color: "var(--text-secondary)", boxShadow: "0 14px 30px rgba(42, 82, 52, 0.08)", border: "1px solid var(--app-border)" },
  recentNote: { marginTop: "8px", fontSize: "12px", color: "var(--success-text)", fontWeight: "600", background: "var(--success-soft)", padding: "6px 12px", borderRadius: "10px", border: "1px solid var(--success-border)" },
  scanCard: { background: "var(--card)", padding: "14px", borderRadius: "22px", boxShadow: "0 14px 30px rgba(42, 82, 52, 0.08)", marginBottom: "12px", border: "1px solid var(--app-border)" },
};
