"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { api, getSession } from "../../../../lib/api";
import { renderMarkdown } from "../../../../lib/markdown";
import AppShell from "../../../../components/AppShell";
import OpeningState from "../../../../components/OpeningState";

// The artifact reader: one deliverable, opened. Documents render
// through the app's escape-first markdown reader; pages run in a
// sealed frame (sandboxed, no same-origin privileges, matching the
// engine's own reading-shell posture) so a page SAM built can be
// lively without ever touching the member's account. Every
// version stays readable: pick one and the reader shows exactly
// what SAM handed over then.

function fmtDate(iso) {
  try { return new Date(iso).toLocaleString(); } catch { return ""; }
}
function fmtBytes(n) {
  if (!Number.isFinite(n)) return "";
  if (n < 1024) return n + " B";
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + " KB";
  return (n / (1024 * 1024)).toFixed(2) + " MB";
}

export default function ArtifactReaderPage() {
  const { id } = useParams();
  const router = useRouter();
  const [member, setMember] = useState(null);
  const [head, setHead] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const me = await api("me");
    setMember(me.member);
    const res = await api("me/artifacts/" + id);
    setHead(res.artifact);
    setViewing(res.artifact);
  }, [id]);

  useEffect(() => {
    if (!getSession()) { router.replace("/login"); return; }
    load().catch((err) => {
      if (err.status === 401) { router.replace("/login"); return; }
      if (err.status === 404) { setError("That artifact is not in your library."); return; }
      setError(err.message || "Something went wrong.");
    });
  }, [load, router]);

  async function readVersion(n) {
    if (!head || n === viewing.version) return;
    setBusy(true);
    setError("");
    try {
      if (n === head.version) { setViewing(head); }
      else {
        const res = await api("me/artifacts/" + id + "/versions/" + n);
        setViewing(res.artifact);
      }
    } catch (err) { setError(err.message || "That version could not be opened."); }
    setBusy(false);
  }

  if (!member) {
    return <OpeningState label="Opening the artifact..." error={error} />;
  }

  const isOld = head && viewing && viewing.version !== head.version;

  return (
    <AppShell email={member.email}>
      <div className="wrap">
        <p style={{ marginTop: 18 }}><Link href="/app/artifacts">← Back to Artifacts</Link></p>
        {error && <div className="notice err">{error}</div>}
        {head && viewing && (
          <>
            <div style={{ display: "flex", alignItems: "baseline", gap: 14, flexWrap: "wrap" }}>
              <h1 className="display" style={{ fontSize: 32, margin: 0, flex: 1 }}>{viewing.title}</h1>
              <span className="badge">{viewing.kind === "html" ? "Page" : "Document"}</span>
              <span className="badge">Version {viewing.version} of {head.version}</span>
            </div>
            <p className="dim small" style={{ marginTop: 8 }}>
              {fmtBytes(viewing.sizeBytes)} · Updated {fmtDate(viewing.updatedAt)}
              {viewing.chatId && <> · Made in <Link href={"/app/chat/" + viewing.chatId}>{viewing.chatTitle || "a chat"}</Link></>}
            </p>

            {isOld && (
              <div className="notice warn" style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ flex: 1, minWidth: 220 }}>You are reading version {viewing.version}. The current version is {head.version}.</span>
                <button type="button" className="btn small-btn" disabled={busy} onClick={() => readVersion(head.version)}>Read the current version</button>
              </div>
            )}

            <div className="card" style={{ marginTop: 16, padding: viewing.kind === "html" ? 0 : 24, overflow: "hidden" }}>
              {viewing.kind === "html" ? (
                <iframe
                  title={viewing.title}
                  className="artifact-frame"
                  sandbox="allow-scripts"
                  srcDoc={viewing.content}
                />
              ) : (
                <div className="md-body" dangerouslySetInnerHTML={{ __html: renderMarkdown(viewing.content) }} />
              )}
            </div>
            {viewing.kind === "html" && (
              <p className="dim small">Pages SAM makes run in a sealed frame: they can show and respond, but they cannot reach the network or your account.</p>
            )}

            {head.versions.length > 1 && (
              <div className="card" style={{ marginTop: 20 }}>
                <div className="eyebrow">History</div>
                <h3 style={{ marginTop: 4 }}>Every version, kept</h3>
                <ul className="list">
                  {[...head.versions].reverse().map((v) => (
                    <li key={v.version} style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                      <span style={{ flex: 1 }}>
                        <strong>Version {v.version}</strong>{" "}
                        <span className="dim small">{v.title} · {fmtBytes(v.sizeBytes)} · {fmtDate(v.createdAt)}</span>
                        {v.version === head.version && <> <span className="badge">Current</span></>}
                      </span>
                      {v.version !== viewing.version && (
                        <button type="button" className="btn ghost small-btn" disabled={busy} onClick={() => readVersion(v.version)}>Read</button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
