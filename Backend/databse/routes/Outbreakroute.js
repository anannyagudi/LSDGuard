import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle } from "react-leaflet";
import { useNavigate } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const getColor = (percent) => {
  if (percent < 1) return { hex: "#22c55e", label: "Safe", bg: "#dcfce7", text: "#166534" };
  if (percent < 50) return { hex: "#eab308", label: "Moderate Risk", bg: "#fef9c3", text: "#854d0e" };
  return { hex: "#ef4444", label: "High Risk", bg: "#fee2e2", text: "#991b1b" };
};

const createDotIcon = (hex) =>
  new L.DivIcon({
    className: "",
    html: `<div style="width:16px;height:16px;background:${hex};border:3px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.35)"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -12],
  });

const myIcon = new L.DivIcon({
  className: "",
  html: `<div style="width:18px;height:18px;background:#3b82f6;border:3px solid white;border-radius:50%;box-shadow:0 0 0 4px rgba(59,130,246,0.25)"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
  popupAnchor: [0, -13],
});

const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const d2r = Math.PI / 180;
  const dLat = (lat2 - lat1) * d2r;
  const dLon = (lon2 - lon1) * d2r;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * d2r) * Math.cos(lat2 * d2r) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const formatLsdRisk = (value) => {
  const risk = Number(value || 0);
  if (risk <= 0) return "0%";
  if (risk < 1) return "<1%";
  if (risk < 10) return `${risk.toFixed(1)}%`;
  return `${Math.round(risk)}%`;
};

const getFarmerRiskPercent = (farmer) => {
  const cowRisks = (farmer.cowDetails || []).map((cow) => Number(cow.maxLsdPercent || 0));
  return cowRisks.length ? Math.max(...cowRisks) : 0;
};

export default function OutbreakPage() {
  const [farmers, setFarmers] = useState([]);
  const [myLocation, setMyLocation] = useState(null);
  const [nearbyList, setNearbyList] = useState([]);
  const [locationSrc, setLocationSrc] = useState("");
  const [expanded, setExpanded] = useState({});
  const [activeTab, setActiveTab] = useState("nearby");
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setMyLocation({ lat, lng });
        setLocationSrc("gps");
        try {
          await fetch("http://localhost:5000/api/user/save-location", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ lat, lng }),
          });
        } catch (e) {
          console.warn("Could not save location:", e);
        }
      },
      () => {
        setLocationSrc("denied");
        setMyLocation({ lat: 18.9894, lng: 73.1175 });
      }
    );
  }, []);

  useEffect(() => {
    fetch("http://localhost:5000/api/user/outbreak-data")
      .then((r) => r.json())
      .then(setFarmers)
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!myLocation || farmers.length === 0) return;
    const nearby = farmers
      .filter((f) => f.lat && f.lng)
      .map((f) => ({
        ...f,
        distance: getDistance(myLocation.lat, myLocation.lng, f.lat, f.lng),
      }))
      .filter((f) => f.distance <= 5)
      .sort((a, b) => a.distance - b.distance);
    setNearbyList(nearby);
  }, [myLocation, farmers]);

  if (!myLocation) {
    return (
      <div style={S.loading}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 40 }}>📍</div>
          <p style={{ color: "#6b7280", marginTop: 10, fontFamily: "sans-serif" }}>
            Getting your location...
          </p>
        </div>
      </div>
    );
  }

  const totalInfected = farmers.reduce((s, f) => s + (f.lsdCows || 0), 0);
  const affectedFarmers = farmers.filter((f) => (f.lsdCows || 0) > 0).length;

  const filteredFarmers = farmers
    .filter(
      (f) =>
        f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (f.location || "").toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => getFarmerRiskPercent(b) - getFarmerRiskPercent(a));

  return (
    <div style={S.page}>
      <div style={S.mapWrap}>
        <button style={S.backBtn} onClick={() => navigate(-1)}>
          Back
        </button>

        {locationSrc === "denied" && (
          <div style={S.floatBanner("#fef9c3", "#854d0e")}>Using approximate location</div>
        )}
        {locationSrc === "gps" && (
          <div style={S.floatBanner("#dcfce7", "#166534")}>Live GPS</div>
        )}

        <MapContainer center={[myLocation.lat, myLocation.lng]} zoom={13} style={S.map}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <Circle
            center={[myLocation.lat, myLocation.lng]}
            radius={5000}
            pathOptions={{
              color: "#3b82f6",
              fillColor: "#3b82f6",
              fillOpacity: 0.06,
              weight: 1.5,
              dashArray: "6 4",
            }}
          />
          <Marker position={[myLocation.lat, myLocation.lng]} icon={myIcon}>
            <Popup>
              <b>You are here</b>
              <div
                style={{
                  fontSize: 11,
                  color: locationSrc === "gps" ? "#16a34a" : "#d97706",
                  marginTop: 4,
                }}
              >
                {locationSrc === "gps" ? "Live GPS" : "Approximate"}
              </div>
            </Popup>
          </Marker>

          {farmers.map((f) => {
            if (!f.lat || !f.lng) return null;
            const percent = getFarmerRiskPercent(f);
            const { hex, label, bg, text } = getColor(percent);
            const dist = getDistance(myLocation.lat, myLocation.lng, f.lat, f.lng).toFixed(1);

            return (
              <Marker key={f._id} position={[f.lat, f.lng]} icon={createDotIcon(hex)}>
                <Popup>
                  <div style={{ fontFamily: "sans-serif", minWidth: 190 }}>
                    <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 4 }}>{f.name}</div>
                    {f.location && (
                      <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>
                        📌 {f.location}
                      </div>
                    )}
                    <div style={{ fontSize: 12, fontWeight: 700, color: text, marginBottom: 2 }}>
                      {formatLsdRisk(percent)} highest LSD risk
                    </div>
                    <div
                      style={{
                        height: 6,
                        background: "#f3f4f6",
                        borderRadius: 99,
                        overflow: "hidden",
                        marginBottom: 8,
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${percent}%`,
                          background: hex,
                          borderRadius: 99,
                        }}
                      />
                    </div>
                    <div style={{ marginBottom: 2 }}>
                      Total: <b>{f.totalCows}</b>
                    </div>
                    <div style={{ marginBottom: 2 }}>
                      Affected: <b>{f.lsdCows}</b>
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      Distance: <b>{dist} km</b>
                    </div>
                    <span
                      style={{
                        background: bg,
                        color: text,
                        padding: "3px 10px",
                        borderRadius: 20,
                        fontSize: 11,
                        fontWeight: 700,
                      }}
                    >
                      {label}
                    </span>
                    {f.cowDetails && f.cowDetails.length > 0 && (
                      <div style={{ marginTop: 10, borderTop: "1px solid #f3f4f6", paddingTop: 8 }}>
                        <div
                          style={{
                            fontSize: 10,
                            fontWeight: 800,
                            color: "#9ca3af",
                            marginBottom: 6,
                          }}
                        >
                          COWS
                        </div>
                        {f.cowDetails.map((cow, i) => (
                          <div
                            key={i}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              fontSize: 12,
                              marginBottom: 4,
                            }}
                          >
                            <span>🐮 {cow.cowName}</span>
                            {cow.hasLSD ? (
                              <span style={{ color: "#dc2626", fontWeight: 700 }}>
                                LSD ({formatLsdRisk(cow.maxLsdPercent)})
                              </span>
                            ) : (
                              <span style={{ color: "#16a34a", fontWeight: 700 }}>OK</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      <div style={S.bottomPanel}>
        <div style={S.statRow}>
          <div style={S.statCard}>
            <div style={S.statNum}>{farmers.length}</div>
            <div style={S.statLbl}>Farmers</div>
          </div>
          <div style={{ ...S.statCard, background: "#fee2e2" }}>
            <div style={{ ...S.statNum, color: "#dc2626" }}>{affectedFarmers}</div>
            <div style={S.statLbl}>Affected</div>
          </div>
          <div style={{ ...S.statCard, background: "#fef9c3" }}>
            <div style={{ ...S.statNum, color: "#d97706" }}>{totalInfected}</div>
            <div style={S.statLbl}>Affected Cows</div>
          </div>
          <div style={{ ...S.statCard, background: "#dbeafe" }}>
            <div style={{ ...S.statNum, color: "#1d4ed8" }}>{nearbyList.length}</div>
            <div style={S.statLbl}>Within 5km</div>
          </div>
        </div>

        <div style={S.tabRow}>
          {[
            { key: "nearby", label: `Nearby (${nearbyList.length})` },
            { key: "overall", label: `Overall (${farmers.length})` },
            { key: "legend", label: "Legend" },
            { key: "tips", label: "Tips" },
          ].map((t) => (
            <button
              key={t.key}
              style={{ ...S.tab, ...(activeTab === t.key ? S.tabActive : {}) }}
              onClick={() => setActiveTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div style={S.tabContent}>
          {activeTab === "nearby" &&
            (nearbyList.length === 0 ? (
              <div style={S.emptyState}>
                <span style={{ fontSize: 24 }}>✅</span>
                <span style={{ fontWeight: 700, color: "#111827" }}>
                  No Affected Cows Within 5 km
                </span>
                <span style={{ fontSize: 12, color: "#6b7280" }}>
                  No nearby farmers currently have affected cows
                </span>
              </div>
            ) : (
              <div style={S.farmerScroll}>
                {nearbyList.map((f) => (
                  <FarmerCard
                    key={f._id}
                    f={f}
                    expanded={expanded}
                    setExpanded={setExpanded}
                    showDistance
                  />
                ))}
              </div>
            ))}

          {activeTab === "overall" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <input
                style={S.searchInput}
                placeholder="Search farmer or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />

              <div style={{ fontSize: 11, color: "#9ca3af", paddingLeft: 2 }}>
                Sorted by highest LSD risk first | {filteredFarmers.length} farmers
              </div>

              <div style={S.farmerScroll}>
                {filteredFarmers.length === 0 ? (
                  <div style={S.emptyState}>
                    <span style={{ fontSize: 22 }}>🔍</span>
                    <span style={{ fontSize: 13, color: "#6b7280" }}>
                      No farmers match your search
                    </span>
                  </div>
                ) : (
                  filteredFarmers.map((f) => (
                    <FarmerCard key={f._id} f={f} expanded={expanded} setExpanded={setExpanded} />
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === "legend" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { hex: "#22c55e", label: "<1% risk", sub: "Safe - does not count as affected" },
                { hex: "#eab308", label: "1-49% risk", sub: "Moderate risk" },
                { hex: "#ef4444", label: "50%+ risk", sub: "High risk" },
                { hex: "#3b82f6", label: "Your location", sub: "Blue dot with 5km radius ring" },
              ].map(({ hex, label, sub }) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: "50%",
                      background: hex,
                      border: "2px solid white",
                      boxShadow: "0 0 0 1px rgba(0,0,0,0.1)",
                      flexShrink: 0,
                    }}
                  />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: "#111827" }}>{label}</div>
                    <div style={{ fontSize: 12, color: "#6b7280" }}>{sub}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === "tips" && (
            <div style={S.tipsCard}>
              <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 10 }}>
                Prevention in High-Risk Areas
              </div>
              {[
                "Avoid movement of cattle from red zones",
                "Increase vaccination coverage immediately",
                "Apply insect repellents 2x daily",
                "Report new cases within 24 hours",
              ].map((tip) => (
                <div key={tip} style={{ fontSize: 13, marginBottom: 8, display: "flex", gap: 8 }}>
                  <span>•</span>
                  <span>{tip}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FarmerCard({ f, expanded, setExpanded, showDistance }) {
  const percent = getFarmerRiskPercent(f);
  const { hex, label, bg, text } = getColor(percent);
  const isOpen = !!expanded[f._id];

  return (
    <div style={S.farmerCard}>
      <div style={S.farmerTop}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ ...S.dot, background: hex }} />
          <div>
            <div style={S.farmerName}>{f.name}</div>
            {f.location && <div style={{ fontSize: 11, color: "#9ca3af" }}>📌 {f.location}</div>}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3 }}>
          <span style={{ ...S.chip, background: bg, color: text }}>{label}</span>
          {showDistance && f.distance != null && (
            <span style={{ fontSize: 11, color: "#6b7280" }}>📏 {f.distance.toFixed(1)} km</span>
          )}
        </div>
      </div>

      <div style={{ height: 5, background: "#f3f4f6", borderRadius: 99, overflow: "hidden", margin: "6px 0 2px" }}>
        <div style={{ height: "100%", width: `${percent}%`, background: hex, borderRadius: 99, transition: "width 0.4s ease" }} />
      </div>
      <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>
        {formatLsdRisk(percent)} highest risk | total cows: {f.totalCows} | affected cows: {f.lsdCows}
      </div>

      {f.cowDetails && f.cowDetails.length > 0 && (
        <>
          <button
            style={S.expandBtn}
            onClick={() => setExpanded((e) => ({ ...e, [f._id]: !e[f._id] }))}
          >
            {isOpen ? "▲ Hide cows" : `▼ Show ${f.cowDetails.length} cows`}
          </button>
          {isOpen && (
            <div style={{ marginTop: 8, borderTop: "1px solid #f3f4f6", paddingTop: 6 }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 1fr 1fr 1fr",
                  fontSize: 10,
                  fontWeight: 800,
                  color: "#9ca3af",
                  marginBottom: 4,
                  padding: "0 2px",
                }}
              >
                <span>Name</span>
                <span>Gender</span>
                <span>Age</span>
                <span>Status</span>
              </div>
              {f.cowDetails.map((cow, i) => (
                <div
                  key={i}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "2fr 1fr 1fr 1fr",
                    fontSize: 12,
                    color: "#374151",
                    padding: "3px 2px",
                    borderBottom: "1px solid #f9fafb",
                    alignItems: "center",
                  }}
                >
                  <span>🐮 {cow.cowName}</span>
                  <span style={{ color: "#6b7280" }}>{cow.gender}</span>
                  <span style={{ color: "#6b7280" }}>
                    {cow.ageYears > 0 ? `${cow.ageYears}y` : ""}
                    {cow.ageMonths > 0 ? ` ${cow.ageMonths}m` : ""}
                  </span>
                  <span>
                    {cow.hasLSD ? (
                      <span
                        style={{
                          ...S.chip,
                          background: "#fee2e2",
                          color: "#991b1b",
                          fontSize: 10,
                        }}
                      >
                        LSD {formatLsdRisk(cow.maxLsdPercent)}
                      </span>
                    ) : (
                      <span
                        style={{
                          ...S.chip,
                          background: "#dcfce7",
                          color: "#166534",
                          fontSize: 10,
                        }}
                      >
                        OK
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

const S = {
  page: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    width: "100%",
    fontFamily: "sans-serif",
    background: "#f9fafb",
  },
  loading: { height: "100vh", display: "flex", alignItems: "center", justifyContent: "center" },
  mapWrap: { position: "relative", flex: "1 1 0", minHeight: 0 },
  map: { height: "100%", width: "100%" },
  backBtn: {
    position: "absolute",
    top: 12,
    left: 12,
    zIndex: 1000,
    background: "#166534",
    color: "white",
    border: "none",
    borderRadius: 10,
    padding: "8px 14px",
    fontWeight: 700,
    cursor: "pointer",
    fontSize: 13,
    boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
  },
  floatBanner: (bg, color) => ({
    position: "absolute",
    top: 12,
    right: 54,
    zIndex: 1000,
    background: bg,
    color,
    border: `1px solid ${color}33`,
    borderRadius: 20,
    padding: "5px 12px",
    fontSize: 12,
    fontWeight: 600,
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
  }),
  bottomPanel: {
    flexShrink: 0,
    background: "white",
    borderTop: "1px solid #e5e7eb",
    padding: "12px 16px 16px",
    display: "flex",
    flexDirection: "column",
    gap: 10,
    maxHeight: "44vh",
    overflow: "hidden",
  },
  statRow: { display: "flex", gap: 8 },
  statCard: { flex: 1, background: "#dcfce7", borderRadius: 10, padding: "8px 6px", textAlign: "center" },
  statNum: { fontWeight: 800, fontSize: 20, color: "#166534" },
  statLbl: { fontSize: 10, color: "#6b7280", marginTop: 1 },
  tabRow: { display: "flex", gap: 5 },
  tab: {
    flex: 1,
    padding: "6px 2px",
    fontSize: 11,
    fontWeight: 600,
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    background: "white",
    cursor: "pointer",
    color: "#374151",
    whiteSpace: "nowrap",
  },
  tabActive: { background: "#166534", color: "white", border: "1px solid #166534" },
  tabContent: { overflowY: "auto", flex: 1 },
  searchInput: {
    width: "100%",
    padding: "8px 12px",
    borderRadius: 8,
    border: "1px solid #e5e7eb",
    fontSize: 13,
    outline: "none",
    boxSizing: "border-box",
    background: "#f9fafb",
  },
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 4,
    padding: "16px",
    textAlign: "center",
  },
  farmerScroll: { display: "flex", flexDirection: "column", gap: 8 },
  farmerCard: { background: "#f9fafb", borderRadius: 10, border: "1px solid #e5e7eb", padding: "10px 12px" },
  farmerTop: { display: "flex", justifyContent: "space-between", alignItems: "flex-start" },
  farmerName: { fontWeight: 700, fontSize: 13, color: "#111827" },
  dot: {
    width: 11,
    height: 11,
    borderRadius: "50%",
    border: "2px solid white",
    boxShadow: "0 0 0 1px rgba(0,0,0,0.12)",
    flexShrink: 0,
    marginTop: 2,
  },
  chip: { borderRadius: 20, padding: "2px 8px", fontSize: 11, fontWeight: 700 },
  expandBtn: {
    marginTop: 6,
    background: "none",
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    padding: "3px 10px",
    fontSize: 11,
    cursor: "pointer",
    color: "#374151",
  },
  tipsCard: { background: "#166534", color: "white", borderRadius: 12, padding: "14px 16px" },
};
