export default function ScanCard({ scan, onDelete }) {
  const risk = Math.round(Number(scan?.lsd_percent || 0));
  const createdAt = scan?.createdAt
    ? new Date(scan.createdAt).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : scan?.reportDate || "Not dated";
  const remedies = Array.isArray(scan?.remedies) ? scan.remedies : [];

  return (
    <article style={styles.card}>
      <div style={styles.top}>
        <div>
          <div style={styles.title}>LSD Risk: {risk}%</div>
          <div style={styles.meta}>{createdAt}</div>
        </div>
        <span style={styles.badge}>{scan?.severity || "None"}</span>
      </div>

      <div style={styles.grid}>
        <Info label="Average confidence" value={`${Number(scan?.avg_score || 0).toFixed(2)}%`} />
        <Info label="Village" value={scan?.villageName || "Unknown"} />
      </div>

      {remedies.length > 0 && (
        <div style={styles.remedies}>
          <strong>Remedies</strong>
          {remedies.slice(0, 2).map((item, index) => (
            <p key={`${item.title}-${index}`} style={styles.remedyText}>
              {item.title}: {item.steps}
            </p>
          ))}
        </div>
      )}

      <div style={styles.actions}>
        {scan?.reportFile && (
          <a href={scan.reportFile} target="_blank" rel="noreferrer" style={styles.link}>
            Open report
          </a>
        )}
        {scan?._id && (
          <button type="button" onClick={() => onDelete?.(scan._id)} style={styles.deleteButton}>
            Delete
          </button>
        )}
      </div>
    </article>
  );
}

function Info({ label, value }) {
  return (
    <div style={styles.info}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

const styles = {
  card: { display: "grid", gap: 12 },
  top: { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" },
  title: { fontSize: 16, fontWeight: 800, color: "var(--text)" },
  meta: { marginTop: 4, fontSize: 12, color: "var(--text-secondary)" },
  badge: { borderRadius: 999, padding: "6px 10px", background: "var(--success-soft)", color: "var(--success-text)", fontWeight: 800, fontSize: 12 },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 },
  info: { padding: 10, borderRadius: 12, background: "var(--background)", border: "1px solid var(--app-border)", display: "grid", gap: 4, fontSize: 12, color: "var(--text-secondary)" },
  remedies: { padding: 10, borderRadius: 12, background: "#f0fdf4", border: "1px solid #bbf7d0", color: "var(--text)", fontSize: 12 },
  remedyText: { margin: "6px 0 0", color: "var(--text-secondary)", lineHeight: 1.45 },
  actions: { display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" },
  link: { color: "#1d4ed8", fontWeight: 800, textDecoration: "none" },
  deleteButton: { border: "1px solid #fecaca", color: "#b91c1c", background: "#fef2f2", borderRadius: 10, padding: "7px 10px", fontWeight: 800, cursor: "pointer" },
};
