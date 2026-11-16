"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, getSession } from "../../../lib/api";
import AppShell from "../../../components/AppShell";
import OpeningState from "../../../components/OpeningState";

// Files (maturity pass, 2026-11-16): one organized home for
// everything a member's SAM keeps for them - the artifacts it made
// (each with the chat that made it) and the two standing files
// that steer it, which live in Your Sam. The door's /me/files
// listing is the single source; this page groups it, makes it
// searchable by title, and says plainly when a standing file is
// still the starter text SAM shipped with, never dressed up as
// something the member wrote.

function fmtDate(iso) {
  if (!iso) return "";
  try { return new Date(iso).toLocaleString(); } catch { return ""; }
}
function fmtBytes(n) {
  if (!Number.isFinite(n)) return "";
  if (n < 1024) return n + " B";
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + " KB";
  return (n / (1024 * 1024)).toFixed(2) + " MB";
}

function FileRow({ entry }) {
  return (
    <li style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
      <span style={{ flex: 1, minWidth: 200 }}>
        <Link href={entry.href} style={{ fontWeight: 600 }}>{entry.title}</Link>{" "}
        <span className="badge">{entry.group === "artifact" ? (entry.kind === "html" ? "Page" : "Document") : "Standing file"}</span>
        <br />
        <span className="dim small">
          {entry.group === "artifact" && <>Version {entry.version} · </>}
          {fmtBytes(entry.sizeBytes)}
          {entry.updatedAt && <> · {entry.group === "standing" ? "Saved" : "Updated"} {fmtDate(entry.updatedAt)}</>}
          {entry.chatTitle && <> · Made in {entry.chatTitle}</>}
          {entry.group === "standing" && !entry.present && <> · Starter text, not saved yet</>}
        </span>
      </span>
      <Link href={entry.href} className="btn ghost small-btn">{entry.group === "standing" ? "Open in Your Sam" : "Open"}</Link>
    </li>
  );
}

export default function FilesPage() {
  const router = useRouter();
  const [member, setMember] = useState(null);
  const [files, setFiles] = useState(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const me = await api("me");
    setMember(me.member);
    const res = await api("me/files");
    setFiles(res.files);
  }, []);

  useEffect(() => {
    if (!getSession()) { router.replace("/login"); return; }
    load().catch((err) => {
      if (err.status === 401) { router.replace("/login"); return; }
      setError(err.message || "Something went wrong.");
    });
  }, [load, router]);

  const shown = useMemo(() => {
    if (!files) return null;
    const q = query.trim().toLowerCase();
    if (!q) return files;
    return files.filter((f) => f.title.toLowerCase().includes(q) || (f.chatTitle ?? "").toLowerCase().includes(q));
  }, [files, query]);

  if (!member) {
    return <OpeningState label="Opening your files..." error={error} />;
  }

  const artifacts = shown ? shown.filter((f) => f.group === "artifact") : [];
  const standing = shown ? shown.filter((f) => f.group === "standing") : [];

  return (
    <AppShell email={member.email}>
      <div className="wrap">
        <div style={{ display: "flex", alignItems: "baseline", gap: 16, flexWrap: "wrap", marginTop: 22 }}>
          <h1 className="display" style={{ fontSize: 38, margin: 0 }}>Files</h1>
          <span className="dim">One home for everything</span>
        </div>
        <p className="dim" style={{ marginTop: 6 }}>Everything your SAM made and keeps for you, in one organized place: the artifacts from your chats, and the two files that steer your SAM.</p>

        {error && <div className="notice err">{error}</div>}

        <div className="field" style={{ marginTop: 10 }}>
          <label htmlFor="file-search">Search by title</label>
          <input id="file-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Try a title, or the chat that made it" />
        </div>

        {!shown && !error && (
          <p className="loading-line"><span className="orb" /> Opening the cabinet...</p>
        )}

        {shown && shown.length === 0 && (
          <div className="notice">Nothing matches that search. <button type="button" onClick={() => setQuery("")} style={{ background: "none", border: 0, color: "inherit", font: "inherit", fontWeight: 700, cursor: "pointer", textDecoration: "underline", padding: 0 }}>Clear the search</button></div>
        )}

        {shown && artifacts.length > 0 && (
          <div className="card" style={{ marginTop: 8 }}>
            <div className="eyebrow">Artifacts</div>
            <h3 style={{ marginTop: 4 }}>What SAM made for you</h3>
            <ul className="list">
              {artifacts.map((f) => <FileRow key={f.key} entry={f} />)}
            </ul>
          </div>
        )}

        {shown && artifacts.length === 0 && !query && (
          <div className="card" style={{ marginTop: 8 }}>
            <div className="eyebrow">Artifacts</div>
            <h3 style={{ marginTop: 4 }}>What SAM made for you</h3>
            <p className="dim" style={{ marginBottom: 0 }}>None yet. Ask SAM in a chat to make you a brief, a page, or a plan, and it will be filed here and on the <Link href="/app/artifacts">Artifacts</Link> shelf.</p>
          </div>
        )}

        {shown && standing.length > 0 && (
          <div className="card" style={{ marginTop: 20 }}>
            <div className="eyebrow">Standing files</div>
            <h3 style={{ marginTop: 4 }}>The files that steer your SAM</h3>
            <ul className="list">
              {standing.map((f) => <FileRow key={f.key} entry={f} />)}
            </ul>
            <p className="dim small" style={{ marginBottom: 0 }}>SOUL.md is who your SAM is; AGENTS.md is how it works. Both are read and edited in <Link href="/app/your-sam">Your Sam</Link>.</p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
