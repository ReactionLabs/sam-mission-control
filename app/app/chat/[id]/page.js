"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { api, getSession } from "../../../../lib/api";
import AppShell from "../../../../components/AppShell";

// When SAM's reply points at an artifact it made (the engine's
// stable /artifact/<id> path), the member's door on that sentence
// is the app's own reader - turn the path into a link that opens
// the artifact right here instead of a dead string.
function linkifyArtifacts(content) {
  const parts = String(content).split(/(\/artifact\/[0-9a-fA-F-]{36})/g);
  if (parts.length === 1) return content;
  return parts.map((part, i) => {
    const match = part.match(/^\/artifact\/([0-9a-fA-F-]{36})$/);
    if (!match) return part;
    return (
      <Link key={i} href={"/app/artifacts/" + match[1]} style={{ color: "inherit", fontWeight: 700, textDecoration: "underline" }}>
        {part}
      </Link>
    );
  });
}

export default function ChatPage() {
  const { id } = useParams();
  const router = useRouter();
  const [thread, setThread] = useState(null);
  const [member, setMember] = useState(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const timer = useRef(null);
  const bottom = useRef(null);

  const load = useCallback(async () => {
    const t = await api("chats/" + id);
    setThread(t);
    return t;
  }, [id]);

  useEffect(() => {
    if (!getSession()) { router.replace("/login"); return; }
    api("me").then((me) => setMember(me.member)).catch(() => {});
    load().catch((err) => {
      if (err.status === 401) router.replace("/login");
      else if (err.status === 404) setError("That chat is not in your Mission Control.");
      else setError(err.message || "Something went wrong.");
    });
  }, [load, router]);

  // While SAM is working (or a send is still waiting), keep the
  // thread fresh; the moment it settles, stop polling.
  useEffect(() => {
    if (!thread) return;
    const active = thread.turnActive || (thread.queue && thread.queue.length > 0) ||
      thread.messages.some((m) => m.queueStatus === "queued");
    if (bottom.current) bottom.current.scrollIntoView({ behavior: "smooth", block: "end" });
    if (!active) return;
    timer.current = setTimeout(() => { load().catch(() => {}); }, 1500);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [thread, load]);

  async function send(e) {
    if (e) e.preventDefault();
    const content = draft.trim();
    if (!content || sending) return;
    setSending(true);
    setError("");
    try {
      const res = await api("chats/" + id + "/messages", { method: "POST", body: { content } });
      setDraft("");
      if (res && res.status === "answered") { await load(); }
      else { await load().catch(() => {}); }
    } catch (err) {
      setError(err.message || "That message could not be sent.");
    }
    setSending(false);
  }

  async function resend(queueId) {
    try {
      await api("chats/" + id + "/queue/" + queueId + "/resend", { method: "POST", body: {} });
      await load();
    } catch (err) { setError(err.message); }
  }

  async function reset() {
    try {
      await api("chats/" + id + "/reset", { method: "POST", body: {} });
      await load();
    } catch (err) { setError(err.message); }
  }

  return (
    <AppShell email={member ? member.email : ""}>
      <div className="wrap" style={{ maxWidth: 860 }}>
        <p style={{ marginTop: 18 }}><Link href="/app">← Back to Mission Control</Link></p>
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <h1 className="display" style={{ fontSize: 30, margin: 0, flex: 1 }}>{thread ? thread.chat.title : "Chat"}</h1>
          {thread && thread.turnActive && (
            <>
              <span className="pill"><span className="orb" /> SAM is working</span>
              <button type="button" className="btn danger small-btn" onClick={reset}>Stop that turn</button>
            </>
          )}
        </div>

        {error && <div className="notice err" style={{ marginTop: 14 }}>{error}</div>}

        <div className="thread">
          {thread && thread.messages.length === 0 && (
            <div className="notice">This is a fresh chat. Tell SAM what needs doing, in your own words.</div>
          )}
          {thread && thread.messages.map((m) => (
            <div key={m.id} className={"msg " + (m.role === "user" ? "user" : "assistant")}>
              {m.role === "assistant" ? linkifyArtifacts(m.content) : m.content}
              {m.queueStatus === "queued" && <span className="state">Waiting for SAM...</span>}
              {m.queueStatus === "failed" && (
                <span className="state">That message did not get through.{" "}
                  <button type="button" onClick={() => resend(m.queueId)} style={{ background: "none", border: 0, color: "inherit", font: "inherit", fontWeight: 700, cursor: "pointer", textDecoration: "underline", padding: 0 }}>Send it again</button>
                </span>
              )}
              {m.queueStatus === "cancelled" && <span className="state">Stopped before it ran.</span>}
            </div>
          ))}
          {thread && thread.queue.map((q) => (
            <div key={q.id} className="msg user">
              {q.content}
              <span className="state">{q.status === "failed" ? "That message did not get through." : "Waiting for SAM..."}</span>
              {q.status === "failed" && (
                <button type="button" onClick={() => resend(q.id)} style={{ background: "none", border: 0, color: "inherit", font: "inherit", fontWeight: 700, cursor: "pointer", textDecoration: "underline", padding: 0 }}>Send it again</button>
              )}
            </div>
          ))}
          <div ref={bottom} />
        </div>

        <form className="composer" onSubmit={send}>
          <textarea value={draft} onChange={(e) => setDraft(e.target.value)}
            placeholder="Tell SAM what needs doing..."
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} />
          <button className="btn" type="submit" disabled={sending || !draft.trim()}>Send</button>
        </form>
        <p className="small dim">SAM asks your approval in Mission Control before anything big happens.</p>
      </div>
    </AppShell>
  );
}
