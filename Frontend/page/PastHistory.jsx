import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../context/useLanguage";
import { useTranslatedTexts } from "../hooks/useTranslatedText";
import { getCowScans } from "../services/api";
import { apiBase, getUploadedFileUrl } from "../utils/image";

const PAGE_SIZE = 5;

const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    return {};
  }
};

export default function PastHistory() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const storedUser = getStoredUser();

  const [cows, setCows] = useState([]);
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [month, setMonth] = useState("all");
  const [year, setYear] = useState("all");
  const [severity, setSeverity] = useState("all");
  const [search, setSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const translatedNames = useTranslatedTexts(scans.map((scan) => scan.cow?.cowName || ""));
  const translatedNameMap = new Map(
    scans.map((scan, index) => [scan.cow?.cowName || "", translatedNames[index] || scan.cow?.cowName || ""]),
  );

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const cowRes = await fetch(`${apiBase}/cow/user/${storedUser?._id || ""}`);
        const cowData = await cowRes.json().catch(() => []);
        if (!cowRes.ok) throw new Error(cowData?.message || "Failed to load cows");

        const cowList = Array.isArray(cowData) ? cowData : [];
        setCows(cowList);

        const scanLists = await Promise.all(
          cowList.map(async (cow) => {
            const list = await getCowScans(cow._id);
            return (list || []).map((scan) => ({ ...scan, cow }));
          }),
        );

        const allScans = scanLists
          .flat()
          .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        setScans(allScans);
      } catch (err) {
        console.error(err);
        setError(err.message || t("pastHistory.loadFailed", "Could not load past scans."));
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [storedUser?._id]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [month, year, severity, search]);

  const filtered = useMemo(() => {
    return scans.filter((scan) => {
      const d = new Date(scan.createdAt || 0);
      const mOk = month === "all" || d.getMonth() === Number(month);
      const yOk = year === "all" || d.getFullYear() === Number(year);
      const sOk = severity === "all" || (scan.severity || "").toLowerCase() === severity.toLowerCase();
      const cowName = translatedNameMap.get(scan.cow?.cowName || "") || scan.cow?.cowName || "";
      const text = `${cowName} ${scan.cow?.ownerName || ""} ${scan.villageName || scan.village || ""}`.toLowerCase();
      return mOk && yOk && sOk && text.includes(search.toLowerCase());
    });
  }, [month, scans, search, severity, translatedNameMap, year]);

  const visibleScans = filtered.slice(0, visibleCount);

  const severityTone = (sev) => {
    const key = (sev || "none").toLowerCase();
    if (key === "severe") return { bg: "#fee2e2", fg: "#b91c1c", border: "#fecaca" };
    if (key === "moderate") return { bg: "#ffedd5", fg: "#9a3412", border: "#fed7aa" };
    if (key === "mild") return { bg: "#fef3c7", fg: "#92400e", border: "#fde68a" };
    return { bg: "#dcfce7", fg: "#166534", border: "#bbf7d0" };
  };

  const handleOpenResult = (scan) => {
    const created = new Date(scan.createdAt || Date.now());
    const previewFile = scan.side || scan.neck || scan.back || null;
    const village =
      scan.villageName ||
      scan.village ||
      scan.cow?.village ||
      storedUser?.location ||
      storedUser?.village ||
      "Unknown";
    const severityLabel = (scan.severity || "None").toString();

    navigate(`/scan-result/${scan.cow?._id || ""}`, {
      state: {
        cowId: scan.cow?._id,
        lsd_percent: scan.lsd_percent ?? scan.avg_score ?? 0,
        severity: severityLabel.charAt(0).toUpperCase() + severityLabel.slice(1),
        per_image: scan.per_image,
        per_image_severity: scan.per_image_severity,
        visibility_scores: scan.visibility_scores,
        reportDate: created.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
        village,
        villageName: village,
        animalAge: scan.animalAge,
        earlySymptoms: scan.earlySymptoms,
        remedies: Array.isArray(scan.remedies) ? scan.remedies : [],
        remedySource: scan.remedySource || "",
        remedyModel: scan.remedyModel || "",
        aiAdvice: scan.aiAdvice || "",
        aiAdviceSource: scan.aiAdviceSource || "",
        aiAdviceModel: scan.aiAdviceModel || "",
        preview: getUploadedFileUrl(previewFile),
        ownerName: scan.cow?.ownerName || storedUser?.name || "",
      },
    });
  };

  const handleUploadFirst = () => {
    navigate(cows.length > 0 ? `/scan/${cows[0]._id}` : "/add-cow");
  };

  if (loading || error) {
    return (
      <div style={styles.page}>
        <div style={styles.shell}>
          <div style={styles.stateCard}>{loading ? t("cowDetails.loading", "Loading...") : error}</div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.shell}>
        <div style={styles.header}>
          <button style={styles.backBtn} onClick={() => navigate(-1)} type="button">{"<-"}</button>
          <div>
            <div style={styles.eyebrow}>{t("home.viewPastHistory", "View Past History")}</div>
            <h2 style={styles.title}>{t("home.pastHistoryTitle", "Past Scan History")}</h2>
            <p style={styles.sub}>
              {t("home.pastHistorySub", "Newest cow scans across your herd, sorted by latest upload.")}
            </p>
          </div>
        </div>

        <div style={styles.bodyPanel}>
          <div style={styles.summaryRow}>
            <div>
              <div style={styles.sectionTitle}>Recent scan history</div>
              <div style={styles.sectionSub}>Showing the latest scans first across all registered cows.</div>
            </div>
            <div style={styles.countPill}>{filtered.length} scans</div>
          </div>

          <div style={styles.filterCard}>
            <div style={styles.filterGrid}>
              <select value={month} onChange={(e) => setMonth(e.target.value)} style={styles.select}>
                <option value="all">{t("common.month", "Month")}</option>
                {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((m, i) => (
                  <option key={m} value={i}>{m}</option>
                ))}
              </select>
              <select value={year} onChange={(e) => setYear(e.target.value)} style={styles.select}>
                <option value="all">{t("common.year", "Year")}</option>
                {[2026, 2025, 2024, 2023].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <select value={severity} onChange={(e) => setSeverity(e.target.value)} style={styles.select}>
                <option value="all">{t("common.all", "All severity")}</option>
                <option value="mild">{t("scanResult.mild", "Mild")}</option>
                <option value="moderate">{t("scanResult.severityModerate", "Moderate")}</option>
                <option value="severe">{t("scanResult.severe", "Severe")}</option>
              </select>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("pastHistory.searchCow", "Search cow, owner, or village...")}
                style={styles.search}
              />
            </div>
          </div>

          {filtered.length === 0 ? (
            <div style={styles.empty}>
              <div style={styles.emptyTitle}>{t("pastHistory.noPastScans", "No past scans found.")}</div>
              <button style={styles.primaryBtn} onClick={handleUploadFirst} type="button">
                {t("pastHistory.uploadFirstScan", "Upload first scan")}
              </button>
            </div>
          ) : (
            <div style={styles.scanList}>
              {visibleScans.map((scan) => {
                const created = new Date(scan.createdAt || Date.now());
                const pdf = getUploadedFileUrl(scan.reportFile);
                const tone = severityTone(scan.severity);
                const cowName =
                  translatedNameMap.get(scan.cow?.cowName || "") ||
                  scan.cow?.cowName ||
                  t("common.unknown", "Unknown cow");

                return (
                  <article key={scan._id} style={styles.scanRow}>
                    <div style={styles.rowTop}>
                      <div>
                        <div style={styles.cowName}>{cowName}</div>
                        <div style={styles.metaLine}>
                          {t("common.owner", "Owner")}: {scan.cow?.ownerName || t("home.na", "N/A")} | {scan.villageName || scan.village || t("home.na", "N/A")}
                        </div>
                      </div>
                      <div style={styles.dateBadge}>{created.toLocaleString("en-IN")}</div>
                    </div>

                    <div style={styles.rowMeta}>
                      <div style={styles.severity(tone)}>{scan.severity || t("scanResult.unknown", "Unknown")}</div>
                      <div style={styles.percent}>{Number(scan.lsd_percent || 0).toFixed(1)}% risk</div>
                    </div>

                    <div style={styles.rowBottom}>
                      <div style={styles.thumbs}>
                        {["side", "neck", "back"].map((part) => {
                          const file = scan[part];
                          if (!file) return null;
                          return (
                            <img
                              key={part}
                              src={getUploadedFileUrl(file)}
                              alt={`${cowName} ${part}`}
                              style={styles.thumb}
                            />
                          );
                        })}
                      </div>

                      <div style={styles.actions}>
                        {pdf ? (
                          <a style={styles.link} href={pdf} target="_blank" rel="noreferrer">
                            {t("pastHistory.viewPdf", "View PDF")}
                          </a>
                        ) : (
                          <span style={styles.muted}>{t("pastHistory.noPdfFound", "No PDF found")}</span>
                        )}
                        <button type="button" style={styles.outlineBtn} onClick={() => handleOpenResult(scan)}>
                          {t("pastHistory.openResult", "Open result")}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {filtered.length > visibleCount && (
            <button
              style={styles.loadMore}
              type="button"
              onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
            >
              {t("common.loadMore", "Load more")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    padding: "16px",
    background: "var(--background)",
    color: "var(--text)",
    minHeight: "100vh",
    fontFamily: "Georgia, 'Times New Roman', serif",
  },
  shell: {
    width: "min(1120px, 100%)",
    margin: "0 auto",
  },
  header: {
    background: "linear-gradient(135deg, #218a4d 0%, #39b86b 100%)",
    color: "white",
    borderRadius: "28px 28px 0 0",
    padding: "18px",
    display: "flex",
    gap: "12px",
    alignItems: "center",
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
  eyebrow: {
    fontSize: "12px",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    fontWeight: "700",
    opacity: 0.85,
  },
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
  summaryRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "14px",
    marginBottom: "14px",
    flexWrap: "wrap",
  },
  sectionTitle: { fontSize: "22px", fontWeight: "800", color: "var(--text)" },
  sectionSub: { marginTop: "4px", fontSize: "13px", color: "var(--text-secondary)" },
  countPill: {
    borderRadius: "999px",
    padding: "9px 14px",
    background: "var(--success-soft)",
    color: "var(--success-text)",
    border: "1px solid var(--success-border)",
    fontWeight: "800",
    fontSize: "13px",
  },
  filterCard: {
    background: "var(--card)",
    borderRadius: "18px",
    padding: "14px",
    border: "1px solid var(--app-border)",
    marginBottom: "14px",
  },
  filterGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: "10px",
  },
  select: {
    width: "100%",
    padding: "13px 14px",
    borderRadius: "14px",
    border: "1px solid var(--app-border)",
    background: "var(--input)",
    color: "var(--text)",
    fontSize: "14px",
  },
  search: {
    width: "100%",
    padding: "13px 14px",
    borderRadius: "14px",
    border: "1px solid var(--app-border)",
    background: "var(--input)",
    color: "var(--text)",
    fontSize: "14px",
  },
  scanList: { display: "grid", gap: "14px" },
  scanRow: {
    background: "var(--card)",
    border: "1px solid var(--app-border)",
    borderRadius: "18px",
    padding: "16px",
    boxShadow: "0 10px 24px rgba(42, 82, 52, 0.06)",
  },
  rowTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    alignItems: "flex-start",
    marginBottom: "12px",
    flexWrap: "wrap",
  },
  cowName: { fontWeight: "800", fontSize: "20px", color: "var(--text)" },
  metaLine: { marginTop: "5px", fontSize: "13px", color: "var(--text-secondary)", fontWeight: "600" },
  dateBadge: {
    padding: "8px 12px",
    borderRadius: "12px",
    background: "var(--background)",
    border: "1px solid var(--app-border)",
    fontSize: "12px",
    fontWeight: "700",
    color: "var(--text-secondary)",
  },
  rowMeta: { display: "flex", gap: "8px", alignItems: "center", marginBottom: "12px", flexWrap: "wrap" },
  severity: (tone) => ({
    padding: "7px 11px",
    borderRadius: "999px",
    background: tone.bg,
    color: tone.fg,
    border: `1px solid ${tone.border}`,
    fontWeight: "800",
    fontSize: "12px",
    textTransform: "capitalize",
  }),
  percent: {
    padding: "7px 11px",
    borderRadius: "999px",
    background: "#e0f2fe",
    color: "#075985",
    border: "1px solid #bae6fd",
    fontWeight: "800",
    fontSize: "12px",
  },
  rowBottom: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
  },
  thumbs: { display: "flex", gap: "9px", flexWrap: "wrap" },
  thumb: {
    width: "86px",
    height: "70px",
    objectFit: "cover",
    borderRadius: "12px",
    border: "1px solid var(--app-border)",
    background: "var(--background)",
  },
  actions: { display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" },
  link: {
    padding: "10px 14px",
    borderRadius: "12px",
    background: "linear-gradient(135deg, #219653 0%, #34b566 100%)",
    color: "white",
    textDecoration: "none",
    fontWeight: "800",
    fontSize: "13px",
  },
  outlineBtn: {
    padding: "10px 14px",
    borderRadius: "12px",
    border: "1px solid var(--success-border)",
    background: "var(--background)",
    color: "var(--success-text)",
    fontWeight: "800",
    fontSize: "13px",
    cursor: "pointer",
  },
  muted: { color: "var(--text-secondary)", fontSize: "13px", fontWeight: "700" },
  empty: {
    padding: "24px",
    borderRadius: "18px",
    border: "1px dashed var(--app-border)",
    color: "var(--text-secondary)",
    textAlign: "center",
    display: "grid",
    gap: "12px",
    justifyItems: "center",
    background: "var(--card)",
  },
  emptyTitle: { fontWeight: "800", color: "var(--text)", fontSize: "16px" },
  primaryBtn: {
    padding: "11px 16px",
    borderRadius: "12px",
    border: "none",
    background: "linear-gradient(135deg, #219653 0%, #34b566 100%)",
    color: "white",
    fontWeight: "800",
    cursor: "pointer",
  },
  loadMore: {
    display: "block",
    width: "min(420px, 100%)",
    margin: "16px auto 0",
    padding: "13px",
    borderRadius: "14px",
    border: "1px solid var(--app-border)",
    background: "var(--background)",
    color: "var(--text)",
    fontWeight: "800",
    cursor: "pointer",
  },
  stateCard: {
    background: "var(--card)",
    border: "1px solid var(--app-border)",
    borderRadius: "18px",
    padding: "22px",
    color: "var(--text)",
    boxShadow: "0 14px 30px rgba(42, 82, 52, 0.08)",
  },
};
