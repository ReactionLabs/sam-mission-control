"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, getSession } from "../../../lib/api";
import AppShell from "../../../components/AppShell";

// Your Sam (Dip's order, 2026-11-16): the member's own scoped SAM,
// made visible and tunable from a phone first. Four cards, all
// riding the member door: the skills their SAM runs, the two
// standing files (SOUL.md is who their SAM is, AGENTS.md is how it
// works), and their heartbeat jobs with real on/off switches.
// Nothing here is a prop: a save round-trips to the door and the
// read-back is what renders.

function SamSwitch({ on, onToggle, label, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      className={"sam-switch" + (on ? " on" : "")}
      disabled={disabled}
      onClick={() => onToggle(!on)}
    >
      <span className="sam-switch-lamp" aria-hidden="true" />
      <span className="sam-switch-puck" aria-hidden="true" />
      <span className="sam-switch-word" aria-hidden="true">{on ? "On" : "Off"}</span>
    </button>
  );
}

function FileEditor({ kind, title, fileName, blurb }) {
  const [file, setFile] = useState(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await api("me/files/" + kind);
    setFile(res.file);
    setDraft(res.file.content);
  }, [kind]);

  useEffect(() => {
    load().catch((err) => setError(err.message || "That file could not be loaded."));
  }, [load]);

  async function save() {
    setBusy(true); setError(""); setNote("");
    try {
      const res = await api("me/files/" + kind, { method: "PUT", body: { content: draft } });
      setFile(res.file);
      setDraft(res.file.content);
      setNote("Saved. SAM reads this on every job from now on.");
    } catch (err) { setError(err.message); }
    setBusy(false);
  }

  const dirty = file && draft !== file.content;
  return (
    <div className="card anchor-room" id={kind === "soul" ? "soul" : "agents"} style={{ marginBottom: 20 }}>
      <div className="eyebrow">{fileName}</div>
      <h3>{title}</h3>
      <p className="dim">{blurb}</p>
      {error && <div className="notice err">{error}</div>}
      {note && <div className="notice">{note}</div>}
      {!file && !error && <p className="dim">Opening the file...</p>}
      {file && (
        <>
          {file.seeded && (
            <div className="notice warn">
              <strong>Starter text.</strong> This is the standard wording a fresh SAM starts with.
              It is not saved as yours yet: change anything you like, then hit Save and it becomes your file.
            </div>
          )}
          <div className="field">
            <label htmlFor={"file-" + kind}>Your {fileName}</label>
            <textarea
              id={"file-" + kind}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={12}
              maxLength={file.maxChars + 2000}
              style={{ lineHeight: 1.55, fontFamily: '"IBM Plex Mono", monospace', fontSize: 14.5 }}
            />
            <p className="small dim" style={{ margin: "6px 0 0" }}>
              {draft.length} of {file.maxChars} characters. Plain words work best: SAM reads this word for word.
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <button className="btn" onClick={save} disabled={busy || !dirty}>
              {busy ? "Saving..." : file.seeded ? "Save as my file" : "Save"}
            </button>
            {dirty && !busy && <span className="dim small">Unsaved changes</span>}
            {!dirty && file.present && <span className="dim small">Saved. This is the file SAM is running on.</span>}
          </div>
        </>
      )}
    </div>
  );
}

function fmtWhen(iso) {
  if (!iso) return "not yet";
  try { return new Date(iso).toLocaleString(); } catch { return ""; }
}

function everyLabel(minutes) {
  if (minutes % 1440 === 0) { const d = minutes / 1440; return d === 1 ? "every day" : "every " + d + " days"; }
  if (minutes % 60 === 0) { const h = minutes / 60; return h === 1 ? "every hour" : "every " + h + " hours"; }
  return "every " + minutes + " minutes";
}

function Heartbeats() {
  const [jobs, setJobs] = useState(null);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState("");
  const [name, setName] = useState("");
  const [minutes, setMinutes] = useState("60");
  const [prompt, setPrompt] = useState("");

  const load = useCallback(async () => {
    const res = await api("me/heartbeats");
    setJobs(res.heartbeats);
  }, []);

  useEffect(() => {
    load().catch((err) => setError(err.message || "Heartbeats could not be loaded."));
  }, [load]);

  async function add(e) {
    e.preventDefault();
    setBusy("add"); setError(""); setNote("");
    try {
      await api("me/heartbeats", {
        method: "POST",
        body: { name: name.trim(), minutes: Number(minutes), prompt: prompt.trim() },
      });
      setName(""); setMinutes("60"); setPrompt("");
      setNote("Heartbeat set. SAM will run it on the rhythm you picked.");
      await load();
    } catch (err) { setError(err.message); }
    setBusy("");
  }

  async function toggle(job, on) {
    setBusy(job.id); setError("");
    try {
      await api("me/heartbeats/" + job.id, { method: "PUT", body: { enabled: on } });
      await load();
    } catch (err) { setError(err.message); }
    setBusy("");
  }

  async function remove(job) {
    setBusy(job.id); setError("");
    try {
      await api("me/heartbeats/" + job.id, { method: "DELETE" });
      await load();
    } catch (err) { setError(err.message); }
    setBusy("");
  }

  return (
    <div className="card anchor-room" id="heartbeats" style={{ marginBottom: 20 }}>
      <div className="eyebrow">Heartbeats</div>
      <h3>SAM, working on a rhythm</h3>
      <p className="dim">
        A heartbeat is a job SAM runs on its own, again and again: check something, watch something,
        report back when there is news. The result lands in a chat named after the job, and in your Intel Feed.
        A heartbeat runs on your key, like everything else your SAM does.
      </p>
      {error && <div className="notice err">{error}</div>}
      {note && <div className="notice">{note}</div>}
      {!jobs && !error && <p className="dim">Loading your heartbeats...</p>}
      {jobs && jobs.length === 0 && <p className="dim">No heartbeats yet. Set your first one below.</p>}
      {jobs && jobs.map((job) => (
        <div key={job.id} style={{ borderTop: "1px solid var(--line)", padding: "14px 0" }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <strong>{job.name}</strong>{" "}
              <span className="badge">{everyLabel(job.minutes)}</span>
              <div className="small dim" style={{ marginTop: 2 }}>{job.prompt}</div>
              <div className="small dim">
                Last ran: {fmtWhen(job.lastRun)}
                {job.enabled && <> · Next: {fmtWhen(job.nextRun)}</>}
                {!job.enabled && <> · Switched off</>}
              </div>
            </div>
            <SamSwitch on={job.enabled} label={"Turn " + job.name + (job.enabled ? " off" : " on")}
              disabled={busy === job.id} onToggle={(on) => toggle(job, on)} />
          </div>
          <div style={{ marginTop: 8 }}>
            <button className="btn danger small-btn" disabled={busy === job.id} onClick={() => remove(job)}>Delete</button>
          </div>
        </div>
      ))}
      <form onSubmit={add} style={{ borderTop: jobs && jobs.length ? "1px solid var(--line)" : "none", paddingTop: 16, marginTop: 4 }}>
        <div className="eyebrow" style={{ marginBottom: 10 }}>Add a heartbeat</div>
        <div className="field">
          <label htmlFor="hb-name">Name it</label>
          <input id="hb-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Like: Morning check" required />
        </div>
        <div className="field">
          <label htmlFor="hb-minutes">How often, in minutes</label>
          <input id="hb-minutes" type="number" min="5" max="10080" step="1" value={minutes} onChange={(e) => setMinutes(e.target.value)} required />
          <p className="small dim" style={{ margin: "6px 0 0" }}>60 is hourly, 1440 is daily. The fastest rhythm is every 5 minutes.</p>
        </div>
        <div className="field">
          <label htmlFor="hb-prompt">What should SAM do each time?</label>
          <textarea id="hb-prompt" value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={3} placeholder="Like: Check my open missions and tell me anything that changed." required />
        </div>
        <button className="btn" type="submit" disabled={busy === "add"}>{busy === "add" ? "Setting it..." : "Set this heartbeat"}</button>
      </form>
    </div>
  );
}

export default function YourSamPage() {
  const router = useRouter();
  const [member, setMember] = useState(null);
  const [skills, setSkills] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!getSession()) { router.replace("/login"); return; }
    (async () => {
      try {
        const me = await api("me");
        setMember(me.member);
        const s = await api("me/skills");
        setSkills(s.skills);
      } catch (err) {
        if (err.status === 401) { router.replace("/login"); return; }
        setError(err.message || "Something went wrong.");
      }
    })();
  }, [router]);

  if (!member) {
    return <div className="wrap" style={{ paddingTop: 64 }}>{error ? <div className="notice err">{error}</div> : "Opening Your Sam..."}</div>;
  }

  return (
    <AppShell email={member.email}>
      <div className="wrap" style={{ maxWidth: 860 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 16, flexWrap: "wrap", marginTop: 22 }}>
          <h1 className="display" style={{ fontSize: 38, margin: 0 }}>Your Sam</h1>
          <span className="dim">The agent, tuned by you</span>
        </div>
        <p className="dim" style={{ marginTop: 6 }}>
          This is your SAM's own kit: the skills it runs, the two files that steer it, and the heartbeats
          it keeps. Everything here is yours alone. <Link href="/app">Back to Mission Control</Link>
        </p>
        {error && <div className="notice err">{error}</div>}

        <div className="card anchor-room" id="skills" style={{ marginBottom: 20 }}>
          <div className="eyebrow">Skills</div>
          <h3>Playbooks your SAM can run</h3>
          <p className="dim">A skill is a written playbook: when a job matches one, SAM follows it and says which one it is using.</p>
          {!skills && <p className="dim">Loading skills...</p>}
          {skills && skills.length === 0 && (
            <p className="dim" style={{ marginBottom: 0 }}>
              No skills installed on your SAM yet. As SAM learns your work, the playbooks it picks up will be listed here.
            </p>
          )}
          {skills && skills.length > 0 && (
            <ul className="list">
              {skills.map((s) => (
                <li key={s.name}>
                  <strong>{s.name}</strong>
                  <div className="small dim">{s.description}</div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <FileEditor kind="soul" title="Who your SAM is" fileName="SOUL.md"
          blurb="SAM's personality and voice: how it talks to you, what it cares about, how it carries itself. This is the file that makes your SAM yours." />
        <FileEditor kind="agents" title="How your SAM works" fileName="AGENTS.md"
          blurb="Your standing operating rules: how work gets done, what to check first, what always needs your okay before it happens." />
        <Heartbeats />
      </div>
    </AppShell>
  );
}
