const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE) ||
  "http://localhost:5000";

async function requestJson(path) {
  const response = await fetch(`${API_BASE}/api${path}`);
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.message || data?.error || "Request failed");
  }
  return data;
}

export function getCow(id) {
  return requestJson(`/cow/${id}`);
}

export function getCowScans(cowId) {
  return requestJson(`/scan/cow/${cowId}`);
}
