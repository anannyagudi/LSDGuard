import { useNavigate } from "react-router-dom";

export default function ContactSupport() {
  const navigate = useNavigate();

  return (
    <div style={styles.page}>
      <div style={styles.shell}>
        <div style={styles.header}>
          <button style={styles.backBtn} type="button" onClick={() => navigate(-1)}>{"<-"}</button>
          <div>
            <div style={styles.eyebrow}>Support</div>
            <h1 style={styles.title}>Contact support</h1>
            <p style={styles.sub}>Get help with scans, cattle records, reports, and vaccination tracking.</p>
          </div>
        </div>

        <div style={styles.bodyPanel}>
          <div style={styles.grid}>
            <SupportCard title="Scan or report issue" text="Share the cow name, scan date, and what looked incorrect in the result." />
            <SupportCard title="Cattle record help" text="Use this for missing photos, report uploads, cow profile details, or vaccination records." />
            <SupportCard title="Account support" text="For login, profile, or dashboard access issues, include your registered email or phone." />
          </div>

          <div style={styles.contactBox}>
            <div>
              <h2 style={styles.sectionTitle}>Support details</h2>
              <p style={styles.copy}>Keep your cow name, owner name, and latest scan date ready before contacting support.</p>
            </div>
            <div style={styles.contactList}>
              <span>Email: support@lsdguard.local</span>
              <span>Response: within 24-48 hours</span>
              <span>Emergency: contact a local veterinary doctor directly</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SupportCard({ title, text }) {
  return (
    <article style={styles.card}>
      <h2 style={styles.cardTitle}>{title}</h2>
      <p style={styles.copy}>{text}</p>
    </article>
  );
}

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
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px" },
  card: {
    background: "var(--card)",
    border: "1px solid var(--app-border)",
    borderRadius: "18px",
    padding: "18px",
  },
  cardTitle: { margin: "0 0 8px", color: "var(--text)", fontSize: "19px" },
  sectionTitle: { margin: 0, color: "var(--text)", fontSize: "22px" },
  copy: { margin: 0, color: "var(--text-secondary)", lineHeight: 1.55, fontWeight: 600 },
  contactBox: {
    marginTop: "14px",
    background: "var(--success-soft)",
    border: "1px solid var(--success-border)",
    borderRadius: "18px",
    padding: "18px",
    display: "grid",
    gap: "14px",
  },
  contactList: { display: "grid", gap: "8px", color: "var(--success-text)", fontWeight: 800 },
};
