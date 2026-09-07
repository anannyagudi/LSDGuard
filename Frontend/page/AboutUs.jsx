import { useNavigate } from "react-router-dom";

export default function AboutUs() {
  const navigate = useNavigate();

  return (
    <div style={styles.page}>
      <div style={styles.shell}>
        <div style={styles.header}>
          <button style={styles.backBtn} type="button" onClick={() => navigate(-1)}>{"<-"}</button>
          <div>
            <div style={styles.eyebrow}>About us</div>
            <h1 style={styles.title}>About LSDGuard</h1>
            <p style={styles.sub}>A cattle health record and LSD awareness assistant for organized herd care.</p>
          </div>
        </div>

        <div style={styles.bodyPanel}>
          <section style={styles.intro}>
            <h2 style={styles.sectionTitle}>What LSDGuard does</h2>
            <p style={styles.copy}>
              LSDGuard helps farmers keep cow profiles, scan records, health reports,
              vaccination schedules, and outbreak awareness in one dashboard.
            </p>
          </section>

          <div style={styles.grid}>
            <InfoCard title="Early awareness" text="Image scans and symptom records help farmers notice cattle that may need review." />
            <InfoCard title="Organized history" text="Each cow keeps reports, scan history, vaccination details, and care notes together." />
            <InfoCard title="Decision support" text="The app supports prioritization. It does not replace veterinary diagnosis or treatment." />
          </div>

          <section style={styles.note}>
            <h2 style={styles.sectionTitle}>Important note</h2>
            <p style={styles.copy}>
              LSDGuard is designed as a student project and support tool. For medical care,
              vaccination decisions, or emergency symptoms, farmers should contact a qualified veterinary doctor.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

function InfoCard({ title, text }) {
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
  intro: {
    background: "var(--card)",
    border: "1px solid var(--app-border)",
    borderRadius: "18px",
    padding: "18px",
    marginBottom: "14px",
  },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px" },
  card: {
    background: "var(--card)",
    border: "1px solid var(--app-border)",
    borderRadius: "18px",
    padding: "18px",
  },
  note: {
    marginTop: "14px",
    background: "var(--warning-soft)",
    border: "1px solid var(--warning-border)",
    borderRadius: "18px",
    padding: "18px",
  },
  sectionTitle: { margin: "0 0 8px", color: "var(--text)", fontSize: "22px" },
  cardTitle: { margin: "0 0 8px", color: "var(--text)", fontSize: "19px" },
  copy: { margin: 0, color: "var(--text-secondary)", lineHeight: 1.6, fontWeight: 600 },
};
