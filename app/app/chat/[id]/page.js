"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { api, getSession } from "../../../../lib/api";
import AppShell from "../../../../components/AppShell";
import Mark from "../../../../components/Mark";
import VoicePanel from "../../../../components/VoicePanel";

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

// The mission chat screen (Dip's spec + mockup, 2026-11-16):
// "What's the mission?" is the first thing you see, the message box
// sits within thumb reach, and the spy styling lives in the screen
// itself (deep plum, warm cream, an orange radar glow behind the
// fedora that fades away once the conversation starts).
const CHIPS = ["Check project status", "Draft a follow-up"];

function ShieldIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: "none" }}>
      <path d="M12 3l7 2.8v5.4c0 4.4-2.9 7.4-7 8.8-4.1-1.4-7-4.4-7-8.8V5.8z" />
      <polyline points="9 11.6 11.2 13.8 15.2 9.9" />
    </svg>
  );
}

export default function ChatPage() {
  const { id } = useParams();
  const router = useRouter();
  const [thread, setThread] = useState(null);
  const [member, setMember] = useState(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  // Hero lifecycle: "show" on a fresh chat, "leaving" for one fade
  // once the conversation starts, then "gone". A chat that loads
  // already started skips the hero entirely (no flash, no fade).
  const [hero, setHero] = useState("show");
  const timer = useRef(null);
  const bodyRef = useRef(null);
  const zoneRef = useRef(null);
  const taRef = useRef(null);
  const heroSeen = useRef(false);

  // A different chat is a different room: the hero lifecycle
  // starts over (the page component is reused across chat ids).
  useEffect(() => {
    heroSeen.current = false;
    setHero("show");
    setThread(null);
    setDraft("");
    setError("");
    setVoiceOpen(false);
  }, [id]);

  // Talk opens the voice call for this chat: the shell's Talk
  // button calls in through the event, and a ?voice=1 arrival
  // (Talk pressed anywhere else) opens it on landing.
  useEffect(() => {
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("voice") === "1") {
      setVoiceOpen(true);
    }
    const open = () => setVoiceOpen(true);
    window.addEventListener("sam:voice-open", open);
    return () => window.removeEventListener("sam:voice-open", open);
  }, [id]);

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

  const started = !!thread && (thread.messages.length > 0 || (thread.queue && thread.queue.length > 0));

  // Hero fade: the radar glow rests while the chat is empty; the
  // moment a first message exists, the hero fades and the thread
  // takes the screen.
  useEffect(() => {
    if (!thread) return;
    if (!started) {
      heroSeen.current = true;
      if (hero === "gone") setHero("show");
      return;
    }
    if (!heroSeen.current) { setHero("gone"); return; }
    if (hero === "show") {
      setHero("leaving");
      const t = setTimeout(() => setHero("gone"), 480);
      return () => clearTimeout(t);
    }
  }, [thread, started, hero]);

  // While SAM is working (or a send is still waiting), keep the
  // thread fresh; the moment it settles, stop polling. The thread
  // scrolls inside its own well now, so scroll the well, not the page.
  useEffect(() => {
    if (!thread) return;
    const active = thread.turnActive || (thread.queue && thread.queue.length > 0) ||
      thread.messages.some((m) => m.queueStatus === "queued");
    const well = bodyRef.current;
    if (well) well.scrollTo({ top: well.scrollHeight, behavior: "smooth" });
    if (!active) return;
    timer.current = setTimeout(() => { load().catch(() => {}); }, 1500);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [thread, load]);

  // Keyboard geometry (iOS): the composer zone is pinned inside
  // the chat column, which is sized to the LAYOUT viewport. When
  // the iPhone keyboard opens, the layout viewport does not
  // shrink; the VISUAL viewport does, and the keyboard covers the
  // layout viewport's bottom strip. So measure the zone's bottom
  // edge in layout coordinates (rect + offsetTop, transform
  // cleared) and translate the zone up by exactly the amount that
  // edge overhangs the visual viewport's bottom edge:
  //   shift = max(0, zoneLayoutBottom - (vv.offsetTop + vv.height))
  // Keyboard closed the overhang is 0 and nothing moves; keyboard
  // open the zone parks directly above the keyboard, and the same
  // math holds if iOS pans the visual viewport while typing.
  // Mobile widths only; on desktop nothing ever moves.
  useEffect(() => {
    const vv = window.visualViewport;
    const zone = zoneRef.current;
    if (!vv || !zone) return undefined;
    const apply = () => {
      if (!window.matchMedia("(max-width: 860px)").matches) {
        zone.style.transform = "";
        return;
      }
      zone.style.transform = "";
      const layoutBottom = zone.getBoundingClientRect().bottom + vv.offsetTop;
      const shift = Math.max(0, layoutBottom - (vv.offsetTop + vv.height));
      zone.style.transform = shift > 0 ? `translateY(${-shift}px)` : "";
    };
    vv.addEventListener("resize", apply);
    vv.addEventListener("scroll", apply);
    apply();
    return () => {
      vv.removeEventListener("resize", apply);
      vv.removeEventListener("scroll", apply);
    };
  }, []);

  // The composer grows with the draft (one line at rest, up to the
  // CSS cap), so a long assignment never hides behind a tiny box.
  const grow = useCallback(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 140) + "px";
  }, []);
  useEffect(() => { grow(); }, [draft, grow]);

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

  // A chip does not send. It fills the composer so the words can be
  // edited first, and puts the cursor at the end, ready to type.
  function fillChip(text) {
    setDraft(text);
    requestAnimationFrame(() => {
      const ta = taRef.current;
      if (!ta) return;
      ta.focus();
      ta.setSelectionRange(text.length, text.length);
      grow();
    });
  }

  return (
    <AppShell email={member ? member.email : ""}>
      <div className="chat-screen">
        <div className="chat-inner">
          <p className="chat-back-row" style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Link href="/app" className="chat-back">← <span>Mission Control</span></Link>
            <button type="button" className="btn small-btn" style={{ marginLeft: "auto" }} onClick={() => setVoiceOpen(true)}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 3a3 3 0 0 1 3 3v5a3 3 0 0 1 -6 0V6a3 3 0 0 1 3-3 Z" />
                <path d="M5 11a7 7 0 0 0 14 0" />
                <line x1="12" y1="18" x2="12" y2="21" />
              </svg>
              Talk
            </button>
          </p>

          {started && (
            <div className="chat-title-row">
              <h1 className="display chat-title">{thread.chat.title}</h1>
              {thread.turnActive && (
                <>
                  <span className="pill"><span className="orb" /> SAM is working</span>
                  <button type="button" className="btn danger small-btn" onClick={reset}>Stop that turn</button>
                </>
              )}
            </div>
          )}

          {error && <div className="notice err chat-error">{error}</div>}

          <div className="chat-body-wrap">
            <div className="chat-body" ref={bodyRef}>
              {!thread && !error && <p className="dim chat-opening">Opening the mission file...</p>}
              {thread && started && (
                <div className="thread chat-thread">
                  {thread.messages.map((m) => (
                    <div key={m.id} className={"msg " + (m.role === "user" ? "user" : "assistant")}>
                      {m.role === "assistant" ? linkifyArtifacts(m.content) : m.content}
                      {m.source === "voice" && <span className="state">Spoken on a call</span>}
                      {m.queueStatus === "queued" && <span className="state">Waiting for SAM...</span>}
                      {m.queueStatus === "failed" && (
                        <span className="state">That message did not get through.{" "}
                          <button type="button" onClick={() => resend(m.queueId)} style={{ background: "none", border: 0, color: "inherit", font: "inherit", fontWeight: 700, cursor: "pointer", textDecoration: "underline", padding: 0 }}>Send it again</button>
                        </span>
                      )}
                      {m.queueStatus === "cancelled" && <span className="state">Stopped before it ran.</span>}
                    </div>
                  ))}
                  {thread.queue.map((q) => (
                    <div key={q.id} className="msg user">
                      {q.content}
                      <span className="state">{q.status === "failed" ? "That message did not get through." : "Waiting for SAM..."}</span>
                      {q.status === "failed" && (
                        <button type="button" onClick={() => resend(q.id)} style={{ background: "none", border: 0, color: "inherit", font: "inherit", fontWeight: 700, cursor: "pointer", textDecoration: "underline", padding: 0 }}>Send it again</button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {thread && hero !== "gone" && (!started || hero === "leaving") && (
              <div className={"mission-hero" + (hero === "leaving" ? " leaving" : "")} aria-hidden={hero === "leaving"}>
                <div className="radar" aria-hidden="true">
                  <span className="radar-glow" />
                  <span className="radar-ring r1" />
                  <span className="radar-ring r2" />
                  <span className="radar-ring r3" />
                  <span className="radar-mark"><Mark size={88} /></span>
                </div>
                <h1 className="display mission-q">What&rsquo;s the mission?</h1>
                <div className="mission-chips">
                  {CHIPS.map((c) => (
                    <button key={c} type="button" className="mission-chip" onClick={() => fillChip(c)}>{c}</button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="composer-zone" ref={zoneRef}>
            <form className="composer-box" onSubmit={send}>
              <textarea ref={taRef} value={draft} onChange={(e) => setDraft(e.target.value)}
                placeholder="Give SAM an assignment..." rows={1}
                aria-label="Give SAM an assignment"
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} />
              <button className="composer-send" type="submit" disabled={sending || !draft.trim()} aria-label="Send">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="12" y1="19" x2="12" y2="5" />
                  <polyline points="5 12 12 5 19 12" />
                </svg>
              </button>
            </form>
            <p className="approval-note"><ShieldIcon /> SAM asks before taking actions that require approval.</p>
          </div>
        </div>
      </div>
      {voiceOpen && (
        <VoicePanel chatId={id} onClose={() => setVoiceOpen(false)} onSaved={load} />
      )}
    </AppShell>
  );
}
