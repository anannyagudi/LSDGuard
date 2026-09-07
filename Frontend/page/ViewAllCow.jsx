import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../context/useLanguage";
import { useTranslatedTexts } from "../hooks/useTranslatedText";
import { apiBase, getCowImageUrl } from "../utils/image";

const getStoredUserId = () => {
  try {
    const rawUser = localStorage.getItem("user");
    if (!rawUser) return "";
    const user = JSON.parse(rawUser);
    return user?._id || user?.id || user?.userId || "";
  } catch (error) {
    console.error("Could not parse stored user:", error);
    return "";
  }
};

export default function ViewAllCows({ onClose }) {
  const [cows, setCows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [brokenImages, setBrokenImages] = useState({});
  const [genderFilter, setGenderFilter] = useState("All");
  const [milkFilter, setMilkFilter] = useState("all");
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const { t } = useLanguage();
  const translatedNames = useTranslatedTexts(cows.map((cow) => cow.cowName));
  const translatedNameMap = new Map(
    cows.map((cow, index) => [cow.cowName, translatedNames[index] || cow.cowName]),
  );

  useEffect(() => {
    const userId = getStoredUserId();
    if (!userId) { setLoading(false); return; }
    fetch(`${apiBase}/cow/user/${userId}`)
      .then(async (res) => {
        const data = await res.json().catch(() => []);
        if (!res.ok) throw new Error(data.message || "Failed to fetch cows");
        return data;
      })
      .then((data) => { setError(""); setCows(Array.isArray(data) ? data : []); })
      .catch((err) => { setError(err.message || "Failed to load cows"); setCows([]); })
      .finally(() => setLoading(false));
  }, []);

  const handleClose = () => {
    if (typeof onClose === "function") { onClose(); return; }
    navigate(-1);
  };

  const filtered = cows.filter((cow) => {
    const name = translatedNameMap.get(cow.cowName) || cow.cowName;
    const matchesGender = genderFilter === "All" || cow.gender === genderFilter;
    const matchesSearch = name.toLowerCase().includes(search.toLowerCase());
    const milk = cow.milkProduction || 0;
    const matchesMilk = milkFilter === "all" || 
      (milkFilter === "high" && milk > 15) || 
      (milkFilter === "low" && milk <= 15);
    return matchesGender && matchesSearch && matchesMilk;
  });

  return (
    <div style={styles.page}>
      <div style={styles.shell}>
      {/* Green header — matches scan history */}
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={handleClose}>
          <span style={styles.backArrow}>←</span>
        </button>
        <div style={styles.headerText}>
          <p style={styles.headerEyebrow}>MY HERD</p>
          <h1 style={styles.headerTitle}>VIEW All COWS</h1>
          <p style={styles.headerSub}>Browse and manage your registered cattle</p>
        </div>
      </div>

      <div style={styles.bodyPanel}>
      {/* Filters */}
      <div style={styles.filterRow}>
        <select
          style={styles.select}
          value={genderFilter}
          onChange={(e) => setGenderFilter(e.target.value)}
        >
          <option value="All">All Genders</option>
          <option value="Female">Female</option>
          <option value="Male">Male</option>
        </select>
        <select
          style={styles.select}
          value={milkFilter}
          onChange={(e) => setMilkFilter(e.target.value)}
        >
          <option value="all">All Milk</option>
          <option value="high">High (&gt;15 L)</option>
          <option value="low">Low (≤15 L)</option>
        </select>
      </div>

      {/* Search */}
      <div style={styles.searchWrap}>
        <span style={styles.searchIcon}>🔍</span>
        <input
          style={styles.searchInput}
          placeholder="Search cow..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* List */}
      <div style={styles.list}>
        {loading ? (
          <p style={styles.centerText}>{t("common.loading")}</p>
        ) : error ? (
          <div style={styles.emptyBox}>
            <p>{error}</p>
            <button style={styles.addBtn} onClick={handleClose}>{t("common.back", "Back")}</button>
          </div>
        ) : filtered.length === 0 ? (
          <div style={styles.emptyBox}>
            <p>{cows.length === 0 ? t("viewAllCows.empty") : "No cows match your filter."}</p>
            {cows.length === 0 && (
              <button style={styles.addBtn} onClick={() => navigate("/add-cow")}>
                + {t("viewAllCows.addCow")}
              </button>
            )}
          </div>
        ) : (
          filtered.map((cow) => {
            const displayName = translatedNameMap.get(cow.cowName) || cow.cowName;
            return (
              <div key={cow._id} style={styles.card}>
                <div style={styles.avatar}>
                  {getCowImageUrl(cow) && !brokenImages[cow._id] ? (
                    <img
                      src={getCowImageUrl(cow)}
                      alt={displayName}
                      style={styles.avatarImg}
                      onError={() => setBrokenImages((prev) => ({ ...prev, [cow._id]: true }))}
                    />
                  ) : (
                    <span style={{ fontSize: 38 }}>{cow.gender === "Female" ? "🐄" : "🐂"}</span>
                  )}
                </div>
                <div style={styles.cardBody}>
                  <div style={styles.cardTop}>
                    <span style={styles.cowName}>{displayName}</span>
                    <span style={styles.ownerText}>{cow.ageYears}y {cow.ageMonths}m</span>
                  </div>
                  <div style={styles.cardMid}>
                    <span style={cow.gender === "Female" ? styles.badgeFemale : styles.badgeMale}>
                      {cow.gender}
                    </span>
                    <span style={styles.milkBadge}>
                      {cow.milkProduction} L/day
                    </span>
                  </div>
                </div>
                <div style={styles.cardActions}>
                  <button style={styles.viewBtn} onClick={() => navigate(`/cow/${cow._id}`)}>
                    View
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
      </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "var(--background)",
    color: "var(--text)",
    padding: "16px",
  },
  shell: {
    width: "min(1120px, 100%)",
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    minHeight: "calc(100vh - 32px)",
  },
  bodyPanel: {
    flex: 1,
    minHeight: 0,
    background: "linear-gradient(180deg, var(--card) 0%, var(--background) 100%)",
    border: "1px solid var(--app-border)",
    borderTop: 0,
    borderRadius: "0 0 28px 28px",
    padding: "18px",
    boxShadow: "var(--app-shadow)",
    display: "flex",
    flexDirection: "column",
  },
  // ── Header (matches scan history green bar) ──
  header: {
    background: "linear-gradient(135deg, #2d7a3a 0%, #1e5c28 100%)",
    padding: "20px 22px 24px",
    borderRadius: "28px 28px 0 0",
    display: "flex",
    alignItems: "flex-start",
    gap: "14px",
    flexShrink: 0,
    minHeight: 104,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    border: "none",
    background: "rgba(255,255,255,0.2)",
    color: "#fff",
    fontSize: 18,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    flexShrink: 0,
    marginTop: 4,
  },
  backArrow: {
    lineHeight: 1,
  },
  headerText: {
    flex: 1,
  },
  headerEyebrow: {
    margin: "0 0 2px",
    fontSize: 15,
    fontWeight: 600,
    letterSpacing: "0.08em",
    color: "rgba(255,255,255,0.7)",
  },
  headerTitle: {
    margin: "0 0 4px",
    fontSize: 32,
    fontWeight: 700,
    color: "#fff",
    lineHeight: 1.1,
  },
  headerSub: {
    margin: 0,
    fontSize: 16,
    color: "rgba(255,255,255,0.75)",
  },
  // ── Filters ──
  filterRow: {
    display: "flex",
    gap: 14,
    padding: 0,
    marginBottom: 12,
    flexShrink: 0,
  },
  select: {
    flex: 1,
    padding: "13px 14px",
    borderRadius: 14,
    border: "1px solid var(--app-border)",
    background: "var(--input)",
    fontSize: 16,
    color: "var(--text)",
    cursor: "pointer",
    appearance: "auto",
  },
  // ── Search ──
  searchWrap: {
    margin: "0 0 16px",
    display: "flex",
    alignItems: "center",
    gap: 10,
    background: "var(--input)",
    border: "1px solid var(--app-border)",
    borderRadius: 14,
    padding: "12px 14px",
  },
  searchIcon: {
    fontSize: 17,
    flexShrink: 0,
  },
  searchInput: {
    flex: 1,
    border: "none",
    outline: "none",
    fontSize: 16,
    background: "transparent",
    color: "var(--text)",
  },
  // ── List ──
  list: {
    flex: 1,
    overflowY: "auto",
    padding: 0,
    display: "flex",
    flexDirection: "column",
    gap: 14,
    minHeight: 0,
  },
  card: {
    display: "flex",
    alignItems: "center",
    gap: 18,
    background: "var(--card)",
    borderRadius: 18,
    border: "1px solid var(--app-border)",
    padding: "18px",
    minHeight: 108,
    boxShadow: "0 10px 24px rgba(42, 82, 52, 0.06)",
  },
  avatar: {
    width: 86,
    height: 86,
    borderRadius: 16,
    overflow: "hidden",
    background: "var(--background)",
    border: "1px solid var(--app-border)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  cardBody: {
    flex: 1,
    minWidth: 0,
  },
  cardTop: {
    display: "flex",
    alignItems: "baseline",
    gap: 6,
    marginBottom: 5,
    flexWrap: "wrap",
  },
  cowName: {
    fontSize: 24,
    fontWeight: 800,
    color: "var(--text)",
  },
  ownerText: {
    fontSize: 15,
    color: "var(--text-secondary)",
  },
  cardMid: {
    display: "flex",
    gap: 6,
    flexWrap: "wrap",
    alignItems: "center",
  },
  badgeFemale: {
    fontSize: 14,
    fontWeight: 800,
    padding: "7px 12px",
    borderRadius: 20,
    background: "var(--danger-soft)",
    color: "var(--danger-text)",
  },
  badgeMale: {
    fontSize: 14,
    fontWeight: 800,
    padding: "7px 12px",
    borderRadius: 20,
    background: "#dbeafe",
    color: "#1d4ed8",
  },
  milkBadge: {
    fontSize: 14,
    fontWeight: 800,
    padding: "7px 12px",
    borderRadius: 20,
    background: "var(--success-soft)",
    color: "var(--success-text)",
  },
  cardActions: {
    flexShrink: 0,
  },
  viewBtn: {
    padding: "12px 22px",
    borderRadius: 12,
    border: "1px solid var(--success-border)",
    background: "var(--success-soft)",
    color: "var(--success-text)",
    fontSize: 16,
    fontWeight: 800,
    cursor: "pointer",
  },
  // ── States ──
  centerText: {
    textAlign: "center",
    color: "var(--text-secondary)",
    padding: "32px 0",
    fontSize: 14,
  },
  emptyBox: {
    padding: "40px 20px",
    textAlign: "center",
    color: "var(--text-secondary)",
    fontSize: 14,
  },
  addBtn: {
    marginTop: 12,
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 16px",
    borderRadius: 8,
    border: "1px solid var(--success-border)",
    background: "var(--success-soft)",
    color: "var(--success-text)",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },
};
