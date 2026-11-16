// The app keeps no store of its own (owner ruling, 2026-11-16):
// the session token and the chosen posture live in this browser,
// and every fact comes from SAM's door on the box, through the
// /api/door proxy. Nothing else is persisted anywhere.

export function getSession() {
  try { return localStorage.getItem("sam.session") || ""; } catch { return ""; }
}
export function setSession(token) {
  try {
    if (token) localStorage.setItem("sam.session", token);
    else localStorage.removeItem("sam.session");
  } catch { /* private mode: the page still works until it closes */ }
}

export async function api(path, opts = {}) {
  const headers = { "content-type": "application/json" };
  const session = getSession();
  if (session) headers.authorization = "Bearer " + session;
  const res = await fetch("/api/door/" + path, {
    method: opts.method || "GET",
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch { data = null; }
  if (!res.ok) {
    const message = (data && data.error) || "Something went wrong. Try again.";
    const err = new Error(message);
    err.status = res.status;
    throw err;
  }
  return data;
}

export const THEMES = [
  { id: "command", name: "Command" },
  { id: "headquarters", name: "Headquarters" },
  { id: "discotheque", name: "Discothèque" },
  { id: "swirl", name: "Swirl Light" },
];

export function applyTheme(id) {
  document.documentElement.dataset.theme = id;
  try { localStorage.setItem("sam-theme", id); } catch { /* fine */ }
}
