// export const apiBase =
//   (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE
//     ? `${import.meta.env.VITE_API_BASE}/api`
//     : "http://localhost:5000/api");
export const apiBase =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE
    ? `${import.meta.env.VITE_API_BASE}/api`
    : "https://lsdguard-gx3u.onrender.com/api");

const rootBase = apiBase.replace(/\/api\/?$/, "");

export function getCowImageUrl(cow = {}) {
  const value = cow.photo || cow.image || cow.cowImage || "";
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  const normalized = String(value).replace(/^\/+/, "");
  return `${rootBase}/${normalized}`;
}

export function getUploadedFileUrl(value = "") {
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  const normalized = String(value).replace(/^\/+/, "");
  return `${rootBase}/${normalized}`;
}
