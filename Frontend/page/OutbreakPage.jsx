import React, { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ArrowLeft, MapPin, Navigation, Search, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import "./OutbreakPage.css";

const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE) ||
  "http://https://lsdguard-gx3u.onrender.com";

const FALLBACK_LOCATION = { lat: 18.9894, lng: 73.1175 };
const TILE_SIZE = 256;
const MIN_ZOOM = 9;
const MAX_ZOOM = 18;

const riskBands = [
  { hex: "#22c55e", label: "Safe", text: "<1% risk", copy: "No affected cattle reported." },
  { hex: "#f59e0b", label: "Moderate", text: "1-49% risk", copy: "Keep movement and care records updated." },
  { hex: "#ef4444", label: "High Risk", text: "50%+ risk", copy: "Restrict movement and monitor closely." },
  { hex: "#3b82f6", label: "Your Location", text: "5km radius", copy: "Blue point shows your current or approximate location." },
];

const getRisk = (percent) => {
  const risk = Number(percent || 0);
  if (risk < 1) return riskBands[0];
  if (risk < 50) return riskBands[1];
  return riskBands[2];
};

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

const getFarmerRiskPercent = (farmer) => {
  const cowRisks = (farmer.cowDetails || []).map((cow) => Number(cow.maxLsdPercent || 0));
  return cowRisks.length ? Math.max(...cowRisks) : Number(farmer.lsdPercent || 0);
};

const formatRisk = (value) => {
  const risk = Number(value || 0);
  if (risk <= 0) return "0%";
  if (risk < 1) return "<1%";
  if (risk < 10) return `${risk.toFixed(1)}%`;
  return `${Math.round(risk)}%`;
};

const clampLatitude = (lat) => Math.max(-85.05112878, Math.min(85.05112878, Number(lat) || 0));

const normalizeLongitude = (lng) => {
  const value = Number(lng) || 0;
  return ((((value + 180) % 360) + 360) % 360) - 180;
};

const latLngToWorld = (lat, lng, zoom) => {
  const scale = TILE_SIZE * 2 ** zoom;
  const latitude = clampLatitude(lat);
  const longitude = normalizeLongitude(lng);
  const sinLat = Math.sin((latitude * Math.PI) / 180);

  return {
    x: ((longitude + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale,
  };
};

const worldToLatLng = (x, y, zoom) => {
  const scale = TILE_SIZE * 2 ** zoom;
  const lng = (x / scale) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * y) / scale;
  const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));

  return { lat: clampLatitude(lat), lng: normalizeLongitude(lng) };
};

const getFitZoom = (points) => {
  if (points.length <= 1) return 12;

  const lats = points.map((point) => Number(point.lat));
  const lngs = points.map((point) => Number(point.lng));
  const latSpread = Math.max(...lats) - Math.min(...lats);
  const lngSpread = Math.max(...lngs) - Math.min(...lngs);
  const spread = Math.max(latSpread, lngSpread);

  if (spread < 0.015) return 15;
  if (spread < 0.04) return 13;
  if (spread < 0.12) return 12;
  if (spread < 0.35) return 11;
  return 10;
};

export default function OutbreakPage() {
  const navigate = useNavigate();
  const [farmers, setFarmers] = useState([]);
  const [myLocation, setMyLocation] = useState(null);
  const [locationSource, setLocationSource] = useState("checking");
  const [activeTab, setActiveTab] = useState("nearby");
  const [mapStyle, setMapStyle] = useState("normal");
  const [searchQuery, setSearchQuery] = useState("");
  const [expanded, setExpanded] = useState({});
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const user = storedUser ? JSON.parse(storedUser) : null;
    const token = localStorage.getItem("token");

    if (!navigator.geolocation) {
      setMyLocation(FALLBACK_LOCATION);
      setLocationSource("approximate");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const nextLocation = { lat: coords.latitude, lng: coords.longitude };
        setMyLocation(nextLocation);
        setLocationSource("gps");

        if (!user?._id) return;

        try {
          await fetch(`${API_BASE}/api/user/save-location`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ userId: user._id, ...nextLocation }),
          });
        } catch (error) {
          console.warn("Could not save location:", error);
        }
      },
      () => {
        setMyLocation(FALLBACK_LOCATION);
        setLocationSource("approximate");
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  useEffect(() => {
    let active = true;

    fetch(`${API_BASE}/api/user/outbreak-data`)
      .then((response) => response.json())
      .then((data) => {
        if (!active) return;
        setFarmers(Array.isArray(data) ? data : []);
      })
      .catch((error) => {
        console.error("Failed to load outbreak data:", error);
        if (active) setFarmers([]);
      })
      .finally(() => {
        if (active) setLoadingData(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const enrichedFarmers = useMemo(() => {
    return farmers
      .filter((farmer) => farmer.lat && farmer.lng)
      .map((farmer) => {
        const risk = getFarmerRiskPercent(farmer);
        return {
          ...farmer,
          risk,
          distance: myLocation
            ? getDistance(myLocation.lat, myLocation.lng, farmer.lat, farmer.lng)
            : null,
        };
      });
  }, [farmers, myLocation]);

  const nearbyFarmers = useMemo(
    () =>
      enrichedFarmers
        .filter((farmer) => farmer.distance != null && farmer.distance <= 5)
        .sort((a, b) => b.risk - a.risk || a.distance - b.distance),
    [enrichedFarmers]
  );

  const filteredFarmers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return enrichedFarmers
      .filter(
        (farmer) =>
          !query ||
          farmer.name?.toLowerCase().includes(query) ||
          farmer.location?.toLowerCase().includes(query)
      )
      .sort((a, b) => b.risk - a.risk);
  }, [enrichedFarmers, searchQuery]);

  const totals = useMemo(() => {
    const affectedFarmers = enrichedFarmers.filter((farmer) => Number(farmer.lsdCows || 0) > 0).length;
    const affectedCows = enrichedFarmers.reduce((sum, farmer) => sum + Number(farmer.lsdCows || 0), 0);

    return {
      farmers: enrichedFarmers.length,
      affectedFarmers,
      affectedCows,
      nearby: nearbyFarmers.length,
    };
  }, [enrichedFarmers, nearbyFarmers.length]);

  const mapLocation = myLocation || FALLBACK_LOCATION;

  return (
    <main className="outbreak-page">
      <section className="outbreak-phone-shell">
        <div className="outbreak-map-card">
          <button className="outbreak-back" type="button" onClick={() => navigate("/home")}>
            <ArrowLeft size={16} />
            Back
          </button>

          <div className="outbreak-title-pill">
            <ShieldCheck size={14} />
            Outbreak Monitoring
          </div>

          <div className={`outbreak-location-pill ${locationSource}`}>
            <Navigation size={13} />
            {locationSource === "gps" ? "Live GPS" : locationSource === "checking" ? "Checking GPS" : "Approximate"}
          </div>

          <OutbreakMap
            mapLocation={mapLocation}
            farmers={enrichedFarmers}
            mapStyle={mapStyle}
          />
        </div>

        <div className="outbreak-panel">
          <div className="outbreak-stats">
            <StatBox value={totals.farmers} label="Farmers" tone="green" />
            <StatBox value={totals.affectedFarmers} label="Affected" tone="red" />
            <StatBox value={totals.affectedCows} label="Affected Cows" tone="amber" />
            <StatBox value={totals.nearby} label="Within 5km" tone="blue" />
          </div>

          <div className="outbreak-map-controls">
            <span>Map Style</span>
            <div>
              {["normal", "dark", "satellite"].map((style) => (
                <button
                  key={style}
                  type="button"
                  className={mapStyle === style ? "active" : ""}
                  onClick={() => setMapStyle(style)}
                >
                  {style}
                </button>
              ))}
            </div>
          </div>

          <div className="outbreak-tabs">
            {[
              { key: "nearby", label: `Nearby (${nearbyFarmers.length})` },
              { key: "overall", label: `Overall (${enrichedFarmers.length})` },
              { key: "legend", label: "Category" },
              { key: "tips", label: "Tips" },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={activeTab === tab.key ? "active" : ""}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="outbreak-tab-content">
            {activeTab === "nearby" && (
              <FarmerList
                farmers={nearbyFarmers}
                loading={loadingData}
                expanded={expanded}
                setExpanded={setExpanded}
                emptyTitle="No affected farms within 5 km"
                emptyCopy="Nearby outbreak warnings will appear here when database records contain affected cattle."
                showDistance
              />
            )}

            {activeTab === "overall" && (
              <>
                <label className="outbreak-search">
                  <Search size={16} />
                  <input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search farmer or location..."
                  />
                </label>
                <p className="outbreak-sort-note">
                  Sorted by highest LSD risk first from database scan records.
                </p>
                <FarmerList
                  farmers={filteredFarmers}
                  loading={loadingData}
                  expanded={expanded}
                  setExpanded={setExpanded}
                  emptyTitle="No matching outbreak records"
                  emptyCopy="Try another farmer name or location."
                />
              </>
            )}

            {activeTab === "legend" && (
              <div className="outbreak-legend-panel">
                <div className="outbreak-legend-head">
                  <h3>Risk Categories</h3>
                  <p>Color guide for farmer markers and nearby alerts.</p>
                </div>

                <div className="outbreak-legend-list">
                  {riskBands.map((band) => (
                    <div
                      className="outbreak-legend-row"
                      key={band.label}
                      style={{ "--legend-color": band.hex }}
                    >
                      <span />
                      <div>
                        <strong>{band.text}</strong>
                        <p>{band.copy}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "tips" && (
              <div className="outbreak-tips-card">
                <h3>Prevention in high-risk areas</h3>
                <p>Use these actions when nearby farmer records show red or amber outbreak points.</p>
                <ul>
                  <li>Avoid moving cattle from red zones.</li>
                  <li>Increase vaccination and follow-up checks.</li>
                  <li>Apply insect repellents twice daily.</li>
                  <li>Record new suspected cases within 24 hours.</li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function OutbreakMap({ mapLocation, farmers, mapStyle }) {
  const frameRef = useRef(null);
  const dragRef = useRef(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(12);
  const [center, setCenter] = useState(mapLocation);

  const mapPoints = useMemo(
    () => [
      mapLocation,
      ...farmers.map((farmer) => ({ lat: farmer.lat, lng: farmer.lng })),
    ],
    [farmers, mapLocation]
  );

  const mapPointsKey = useMemo(
    () => mapPoints.map((point) => `${Number(point.lat).toFixed(5)},${Number(point.lng).toFixed(5)}`).join("|"),
    [mapPoints]
  );

  useEffect(() => {
    const element = frameRef.current;
    if (!element) return undefined;

    const updateSize = () => {
      setSize({ width: element.clientWidth, height: element.clientHeight });
    };

    updateSize();

    if (!window.ResizeObserver) {
      window.addEventListener("resize", updateSize);
      return () => window.removeEventListener("resize", updateSize);
    }

    const observer = new ResizeObserver(updateSize);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const validPoints = mapPoints.filter((point) => point.lat && point.lng);
    if (!validPoints.length) return;

    const centerLat = validPoints.reduce((sum, point) => sum + Number(point.lat), 0) / validPoints.length;
    const centerLng = validPoints.reduce((sum, point) => sum + Number(point.lng), 0) / validPoints.length;

    setCenter({ lat: centerLat, lng: centerLng });
    setZoom(getFitZoom(validPoints));
  }, [mapPointsKey]);

  const centerWorld = latLngToWorld(center.lat, center.lng, zoom);
  const topLeft = {
    x: centerWorld.x - size.width / 2,
    y: centerWorld.y - size.height / 2,
  };
  const worldSize = TILE_SIZE * 2 ** zoom;
  const tileCount = 2 ** zoom;
  const startX = Math.floor(topLeft.x / TILE_SIZE) - 1;
  const endX = Math.floor((topLeft.x + size.width) / TILE_SIZE) + 1;
  const startY = Math.max(0, Math.floor(topLeft.y / TILE_SIZE) - 1);
  const endY = Math.min(tileCount - 1, Math.floor((topLeft.y + size.height) / TILE_SIZE) + 1);
  const tiles = [];

  for (let x = startX; x <= endX; x += 1) {
    for (let y = startY; y <= endY; y += 1) {
      const wrappedX = ((x % tileCount) + tileCount) % tileCount;
      tiles.push({
        key: `${zoom}-${x}-${y}`,
        url: `https://tile.openstreetmap.org/${zoom}/${wrappedX}/${y}.png`,
        left: x * TILE_SIZE - topLeft.x,
        top: y * TILE_SIZE - topLeft.y,
      });
    }
  }

  const projectPoint = (point) => {
    const world = latLngToWorld(point.lat, point.lng, zoom);
    let x = world.x - topLeft.x;

    if (x < -worldSize / 2) x += worldSize;
    if (x > worldSize / 2) x -= worldSize;

    return { left: x, top: world.y - topLeft.y };
  };

  const radiusCenter = projectPoint(mapLocation);
  const metersPerPixel = (156543.03392 * Math.cos((clampLatitude(mapLocation.lat) * Math.PI) / 180)) / 2 ** zoom;
  const radiusPixels = Math.max(18, 5000 / metersPerPixel);

  const handleWheel = (event) => {
    event.preventDefault();
    const nextZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom + (event.deltaY < 0 ? 1 : -1)));
    if (nextZoom === zoom) return;
    setZoom(nextZoom);
  };

  const handlePointerDown = (event) => {
    frameRef.current?.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      centerWorld,
    };
  };

  const handlePointerMove = (event) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const nextWorldX = drag.centerWorld.x - (event.clientX - drag.startX);
    const nextWorldY = drag.centerWorld.y - (event.clientY - drag.startY);
    const maxY = TILE_SIZE * 2 ** zoom;
    setCenter(worldToLatLng(nextWorldX, Math.max(0, Math.min(maxY, nextWorldY)), zoom));
  };

  const handlePointerUp = (event) => {
    if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null;
    }
  };

  return (
    <div
      className={`outbreak-map-frame ${mapStyle}`}
      ref={frameRef}
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <div className="outbreak-map-tiles" aria-hidden="true">
        {tiles.map((tile) => (
          <img
            key={tile.key}
            src={tile.url}
            alt=""
            draggable="false"
            style={{ left: tile.left, top: tile.top }}
          />
        ))}
      </div>

      <div
        className="outbreak-radius-ring"
        style={{
          left: radiusCenter.left,
          top: radiusCenter.top,
          width: radiusPixels * 2,
          height: radiusPixels * 2,
        }}
      />

      <MapMarker
        point={radiusCenter}
        color="#3b82f6"
        label="You"
        location={`${Number(mapLocation.lat).toFixed(4)}, ${Number(mapLocation.lng).toFixed(4)}`}
        riskText="5km monitoring radius"
        current
      />
      {farmers.map((farmer) => {
        const band = getRisk(farmer.risk);
        return (
          <MapMarker
            key={farmer._id}
            point={projectPoint(farmer)}
            color={band.hex}
            label={farmer.name}
            risk={farmer.risk}
            riskText={`${formatRisk(farmer.risk)} risk`}
            location={farmer.location}
            distance={farmer.distance}
          />
        );
      })}

      <div className="outbreak-map-zoom" aria-label="Map zoom controls">
        <button type="button" onClick={() => setZoom((current) => Math.min(MAX_ZOOM, current + 1))}>+</button>
        <button type="button" onClick={() => setZoom((current) => Math.max(MIN_ZOOM, current - 1))}>-</button>
      </div>
    </div>
  );
}

function MapMarker({ point, color, label, risk, riskText, location, distance, current }) {
  return (
    <button
      type="button"
      className={`outbreak-map-marker ${current ? "current" : ""}`}
      style={{
        left: point.left,
        top: point.top,
        "--marker-color": color,
      }}
      onPointerDown={(event) => event.stopPropagation()}
      title={current ? "Your location" : `${label}: ${formatRisk(risk)} risk`}
    >
      <span className="outbreak-marker-dot" />
      <span className="outbreak-marker-tooltip">
        <strong>{current ? "Your Location" : label}</strong>
        <span>{riskText || `${formatRisk(risk)} risk`}</span>
        {location && <small>{location}</small>}
        {distance != null && <em>{distance.toFixed(1)} km away</em>}
      </span>
    </button>
  );
}

function StatBox({ value, label, tone }) {
  return (
    <article className={`outbreak-stat ${tone}`}>
      <strong>{value}</strong>
      <span>{label}</span>
    </article>
  );
}

function FarmerList({ farmers, loading, expanded, setExpanded, emptyTitle, emptyCopy, showDistance }) {
  if (loading) {
    return <div className="outbreak-empty">Loading outbreak data...</div>;
  }

  if (!farmers.length) {
    return (
      <div className="outbreak-empty">
        <AlertTriangle size={24} />
        <strong>{emptyTitle}</strong>
        <p>{emptyCopy}</p>
      </div>
    );
  }

  return (
    <div className="outbreak-farmer-list">
      {farmers.map((farmer) => (
        <FarmerCard
          key={farmer._id}
          farmer={farmer}
          expanded={expanded}
          setExpanded={setExpanded}
          showDistance={showDistance}
        />
      ))}
    </div>
  );
}

function FarmerCard({ farmer, expanded, setExpanded, showDistance }) {
  const risk = getFarmerRiskPercent(farmer);
  const band = getRisk(risk);
  const isOpen = !!expanded[farmer._id];
  const cows = farmer.cowDetails || [];

  return (
    <article className="outbreak-farmer-card" style={{ "--farmer-color": band.hex }}>
      <div className="outbreak-farmer-top">
        <div>
          <span className="outbreak-risk-dot" style={{ background: band.hex }} />
          <strong>{farmer.name}</strong>
          {farmer.location && (
            <p>
              <MapPin size={12} />
              {farmer.location}
            </p>
          )}
        </div>
        <div className="outbreak-farmer-meta">
          <span style={{ color: band.hex, background: `${band.hex}1f` }}>{band.label}</span>
          {showDistance && farmer.distance != null && <small>{farmer.distance.toFixed(1)} km</small>}
        </div>
      </div>

      <div className="outbreak-risk-bar">
        <span style={{ width: `${Math.min(100, risk)}%`, background: band.hex }} />
      </div>

      <p className="outbreak-risk-copy">
        {formatRisk(risk)} highest risk | total cows: {farmer.totalCows || 0} | affected cows: {farmer.lsdCows || 0}
      </p>

      {cows.length > 0 && (
        <>
          <button
            className="outbreak-expand"
            type="button"
            onClick={() => setExpanded((current) => ({ ...current, [farmer._id]: !current[farmer._id] }))}
          >
            {isOpen ? "Hide cow details" : `Show ${cows.length} cow${cows.length === 1 ? "" : "s"}`}
          </button>
          {isOpen && (
            <div className="outbreak-cow-list">
              {cows.map((cow, index) => {
                const cowRisk = Number(cow.maxLsdPercent || 0);
                const cowBand = getRisk(cowRisk);
                return (
                  <div key={`${cow.cowName}-${index}`}>
                    <span>{cow.cowName}</span>
                    <small style={{ color: cowBand.hex }}>{cow.hasLSD ? `LSD ${formatRisk(cowRisk)}` : "OK"}</small>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </article>
  );
}
