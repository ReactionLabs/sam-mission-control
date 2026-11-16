"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, getSession } from "../../../lib/api";
import AppShell from "../../../components/AppShell";

// Artifacts (maturity pass, 2026-11-16): the member's deliverables
// as their own room. SAM makes these in chat through its artifact
// hand; this page is the library shelf - every artifact the
// member's SAM made for them, newest first, each opening into the
// reader. The data is the door's /me/artifacts: the member's own
// profile's records, never anyone else's.

function fmtDate(iso) {
  try { return new Date(iso).toLocaleString(); } catch { return ""; }
}
function fmtBytes(n) {
  if (!Number.isFinite(n)) return "";
  if (n < 1024) return n + " B";
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + " KB";
  return (n / (1024 * 1024)).toFixed(2) + " MB";
}

export default function ArtifactsPage() {
  const router = useRouter();
  const [member, setMember] = useState(null);
  const [artifacts, setArtifacts] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const me = await api("me");
    setMember(me.member);
    const res = await api("me/artifacts");
    setArtifacts(res.artifacts);
  }, []);

  useEffect(() => {
    if (!getSession()) { router.replace("/login"); return; }
    load().catch((err) => {
      if (err.status === 401) { router.replace("/login"); return; }
      setError(err.message || "Something went wrong.");
    });
  }, [load, router]);

  if (!member) {
    return <div className="wrap" style={{ paddingTop: 64 }}>{error ? <div className="notice err">{error}</div> : "Opening your artifacts..."}</div>;
  }

  return (
    <AppShell email={member.email}>
      <div className="wrap">
        <div style={{ display: "flex", alignItems: "baseline", gap: 16, flexWrap: "wrap", marginTop: 22 }}>
          <h1 className="display" style={{ fontSize: 38, margin: 0 }}>Artifacts</h1>
          <span className="dim">Evidence, kept</span>
        </div>
        <p className="dim" style={{ marginTop: 6 }}>Pages and documents your SAM built for you in chat, kept at a stable home. Ask SAM to revise one and the same artifact moves to its next version, right here.</p>

        {error && <div className="notice err">{error}</div>}

        {artifacts && artifacts.length === 0 && (
          <div className="notice">
            <strong>Nothing here yet.</strong> When you ask SAM in a chat to make you something you will keep, a brief, a page, a plan, it lands on this shelf.{" "}
            <Link href="/app">Start from Mission Control</Link>
          </div>
        )}

        {artifacts && artifacts.length > 0 && (
          /* Same Tailwind grid as Mission Control home (adoption
             proof, 2026-11-16): identical layout values to the old
             .grid rule, in utilities. */
          <div className="grid grid-cols-1 min-[901px]:grid-cols-2 gap-5 my-5">
            {artifacts.map((a) => (
              <Link key={a.id} href={"/app/artifacts/" + a.id} className="card" style={{ textDecoration: "none", color: "inherit", display: "block" }}>
                <div className="eyebrow">{a.kind === "html" ? "Page" : "Document"}</div>
                <h3 style={{ marginTop: 4 }}>{a.title}</h3>
                <p className="dim small" style={{ margin: "6px 0 0" }}>
                  Version {a.version} · {fmtBytes(a.sizeBytes)} · Updated {fmtDate(a.updatedAt)}
                </p>
                {a.chatTitle && (
                  <p className="dim small" style={{ margin: "4px 0 0" }}>
                    Made in <span style={{ fontWeight: 600 }}>{a.chatTitle}</span>
                  </p>
                )}
                <span className="btn small-btn" style={{ marginTop: 14 }}>Open</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
