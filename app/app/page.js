"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, getSession } from "../../lib/api";
import AppShell from "../../components/AppShell";
import OpeningState from "../../components/OpeningState";

function fmtDate(iso) {
  try { return new Date(iso).toLocaleString(); } catch { return ""; }
}

export default function AccountHome() {
  const router = useRouter();
  const [member, setMember] = useState(null);
  const [panels, setPanels] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  const load = useCallback(async () => {
    const me = await api("me");
    setMember(me.member);
    const p = await api("panels");
    setPanels(p);
  }, []);

  useEffect(() => {
    if (!getSession()) { router.replace("/login"); return; }
    load().catch((err) => {
      if (err.status === 401) { router.replace("/login"); return; }
      setError(err.message || "Something went wrong.");
    });
  }, [load, router]);

  async function newChat() {
    setBusy("chat");
    try {
      const res = await api("chats", { method: "POST", body: { title: "New mission" } });
      router.push("/app/chat/" + res.chat.id);
    } catch (err) { setError(err.message); setBusy(""); }
  }

  async function decide(id, approve) {
    setBusy(id);
    try {
      await api("actions/" + id + "/decide", { method: "POST", body: { approve } });
      await load();
    } catch (err) { setError(err.message); }
    setBusy("");
  }

  if (!member) {
    return <OpeningState label="Opening Mission Control..." error={error} />;
  }

  const cannotThink = member.status !== "active"
    ? "This account is paused. Talk to the operator to turn it back on."
    : member.keySource === "managed"
      ? (member.managed.enabled
        ? (member.managed.spent ? "Today's included usage is used up. Add your own key in Settings to keep going." : null)
        : "Running on our key is not open yet. Add your own key in Settings and SAM is ready today.")
      : (!member.hasKey ? "SAM cannot think yet: SAM needs a key to think with. Add yours in Settings and SAM is ready." : null);

  return (
    <AppShell email={member.email}>
      <div className="wrap">
        <div style={{ display: "flex", alignItems: "baseline", gap: 16, flexWrap: "wrap", marginTop: 22 }}>
          <h1 className="display" style={{ fontSize: 38, margin: 0 }}>Mission Control</h1>
          <span className="dim">The Briefing Room</span>
        </div>
        <p className="dim" style={{ marginTop: 6 }}>Signed in as {member.email}. Everything below is your SAM's own record, nobody else's.</p>

        {error && <div className="notice err">{error}</div>}
        {cannotThink && (
          <div className="notice warn">
            <strong>One thing first.</strong> {cannotThink}{" "}
            <Link href="/app/settings">Open Settings</Link>
          </div>
        )}

        <div className="card" style={{ marginTop: 8 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 240 }}>
              <div className="eyebrow">Talk to SAM</div>
              <h3 style={{ marginBottom: 4 }}>Start a mission, or pick one back up.</h3>
              <p className="dim small" style={{ margin: 0 }}>Tell SAM what needs doing in your own words. SAM asks before anything big happens.</p>
            </div>
            <button className="btn" onClick={newChat} disabled={busy === "chat"}>Start a new chat</button>
          </div>
          {panels && panels.chats.length > 0 && (
            <ul className="list" style={{ marginTop: 10 }}>
              {panels.chats.map((c) => (
                <li key={c.id} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <Link href={"/app/chat/" + c.id} style={{ flex: 1, fontWeight: 600 }}>{c.title}</Link>
                  <span className="dim small">{fmtDate(c.updatedAt)}</span>
                </li>
              ))}
            </ul>
          )}
          {panels && panels.chats.length === 0 && <p className="dim" style={{ marginBottom: 0 }}>No chats yet. Your first mission is one tap away.</p>}
        </div>

        <div className="card" style={{ marginTop: 20 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 240 }}>
              <div className="eyebrow">Your Sam</div>
              <h3 style={{ marginBottom: 4 }}>Tune the agent itself.</h3>
              <p className="dim small" style={{ margin: 0 }}>See the skills your SAM runs, edit the two files that steer it (who it is, how it works), and set heartbeats it keeps on its own.</p>
            </div>
            <Link href="/app/your-sam" className="btn">Open Your Sam</Link>
          </div>
        </div>

        <div className="card" style={{ marginTop: 20 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 240 }}>
              <div className="eyebrow">Files</div>
              <h3 style={{ marginBottom: 4 }}>Everything SAM made for you, in one place.</h3>
              <p className="dim small" style={{ margin: 0 }}>The pages and documents from your chats, each with its history, plus the files that steer your SAM. One home, searchable.</p>
            </div>
            <span style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Link href="/app/files" className="btn">Open Files</Link>
              <Link href="/app/artifacts" className="btn ghost">Artifacts</Link>
            </span>
          </div>
        </div>

        {!panels && !error && (
          <p className="loading-line"><span className="orb" /> Opening your rooms...</p>
        )}

        {panels && (
          /* The first surface on Tailwind utilities (adoption proof,
             2026-11-16): this grid's layout spacing is exactly what
             the old .grid rule said - one column to 900px, two past
             it, 20px gaps, 20px vertical margin - said in utilities
             that resolve to the same values. */
          <div className="grid grid-cols-1 min-[901px]:grid-cols-2 gap-5 my-5">
            <div className="card anchor-room" id="approvals">
              <div className="eyebrow">Approvals</div>
              <h3>Waiting on you {panels.approvals.length > 0 && <span className="badge">{panels.approvals.length}</span>}</h3>
              {panels.approvals.length === 0 && <p className="dim" style={{ marginBottom: 0 }}>Nothing is waiting. When SAM wants to do something that matters, it lands here first, in plain words.</p>}
              {panels.approvals.map((a) => (
                <div key={a.id} style={{ background: "var(--paper)", color: "var(--paper-tx)", borderRadius: 12, padding: 16, marginBottom: 12 }}>
                  <div className="mono small" style={{ marginBottom: 6 }}>{a.kind} · {fmtDate(a.createdAt)}</div>
                  <div style={{ fontWeight: 600 }}>{a.title}</div>
                  <p className="small" style={{ whiteSpace: "pre-wrap" }}>{a.detail}</p>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button className="btn ok small-btn" disabled={busy === a.id} onClick={() => decide(a.id, true)}>Approve</button>
                    <button className="btn danger small-btn" disabled={busy === a.id} onClick={() => decide(a.id, false)}>Deny</button>
                  </div>
                </div>
              ))}
            </div>

            <div className="card anchor-room" id="missions">
              <div className="eyebrow">Missions</div>
              <h3>Work in motion</h3>
              {panels.missions.length === 0 && <p className="dim" style={{ marginBottom: 0 }}>No missions running. Missions are bigger jobs SAM works on in the background.</p>}
              <ul className="list">
                {panels.missions.map((m) => (
                  <li key={m.id}><strong>{m.title}</strong> <span className="badge">{m.status}</span><br /><span className="dim small">{fmtDate(m.createdAt)}</span></li>
                ))}
              </ul>
            </div>

            <div className="card anchor-room" id="intel">
              <div className="eyebrow">Intel Feed</div>
              <h3>What SAM has been doing</h3>
              {panels.intel.length === 0 && <p className="dim" style={{ marginBottom: 0 }}>Nothing yet. This feed is SAM's own activity record, written as it works.</p>}
              <ul className="list">
                {panels.intel.slice(0, 12).map((line, i) => (
                  <li key={i}><span className="mono small dim">{fmtDate(line.at)}</span><br />{line.summary}</li>
                ))}
              </ul>
            </div>

            <div className="card anchor-room" id="memory">
              <div className="eyebrow">Memory Vault</div>
              <h3>The filing cabinet</h3>
              {panels.memory.length === 0 && <p className="dim" style={{ marginBottom: 0 }}>Nothing filed yet. As you and SAM work, the things worth keeping land here.</p>}
              <ul className="list">
                {panels.memory.slice(0, 10).map((r) => (
                  <li key={r.id}><span className="badge">{r.kind}</span> <span className="small">{r.preview}</span></li>
                ))}
              </ul>
              <div className="eyebrow" style={{ marginTop: 18 }}>Evidence</div>
              <h3>Artifacts SAM made for you</h3>
              {panels.artifacts.length === 0 && <p className="dim" style={{ marginBottom: 0 }}>None yet. Pages and documents SAM builds for you are kept here.</p>}
              <ul className="list">
                {panels.artifacts.map((a) => (
                  <li key={a.id}><Link href={"/app/artifacts/" + a.id} style={{ fontWeight: 600 }}>{a.title}</Link> <span className="dim small">({a.kind}, version {a.version})</span></li>
                ))}
              </ul>
              {panels.artifacts.length > 0 && <p className="small" style={{ marginBottom: 0 }}><Link href="/app/files">See everything in Files</Link></p>}
              <div id="tools" className="anchor-room">
                <div className="eyebrow" style={{ marginTop: 18 }}>Tools</div>
                <h3>Quartermaster's Desk</h3>
                {panels.skills.length === 0 && <p className="dim" style={{ marginBottom: 0 }}>No extra tools installed yet.</p>}
                <ul className="list">
                  {panels.skills.map((s) => (<li key={s.name}>{s.name} <span className="dim small">from {s.source}</span></li>))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
