"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { api, getSession } from "../../../../lib/api";
import { blobToBase64, createWavRecorder } from "../../../../lib/wav-recorder";
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

// Dictation auto-stop tuning: speech is a chunk RMS at or above
// 0.02; once the member has spoken, about 1.8 seconds of quiet
// below that threshold stops the recording on its own.
const DICT_SPEECH_THRESHOLD = 0.02;
const DICT_SILENCE_MS = 1800;
const DICT_CAP_SECONDS = 120;

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
  const [dictPhase, setDictPhase] = useState("idle"); // idle | recording | transcribing
  const [dictError, setDictError] = useState("");
  const [dictNote, setDictNote] = useState("");
  const [dictLevel, setDictLevel] = useState(0);
  const [dictSeconds, setDictSeconds] = useState(0);
  // Hero lifecycle: "show" on a fresh chat, "leaving" for one fade
  // once the conversation starts, then "gone". A chat that loads
  // already started skips the hero entirely (no flash, no fade).
  const [hero, setHero] = useState("show");
  const timer = useRef(null);
  const bodyRef = useRef(null);
  const taRef = useRef(null);
  const heroSeen = useRef(false);
  const dictStreamRef = useRef(null);
  const dictRecorderRef = useRef(null);
  const dictTimerRef = useRef(null);
  const dictCheckRef = useRef(null);
  const dictHasSpokenRef = useRef(false);
  const dictLastSpeechRef = useRef(0);
  const dictStoppingRef = useRef(false);
  const dictCancelledRef = useRef(false);
  const dictStartedAtRef = useRef(0);
  const draftRef = useRef("");
  useEffect(() => { draftRef.current = draft; }, [draft]);

  // A different chat is a different room: the hero lifecycle
  // starts over (the page component is reused across chat ids).
  useEffect(() => {
    heroSeen.current = false;
    setHero("show");
    setThread(null);
    setDraft("");
    setError("");
    setVoiceOpen(false);
    setDictPhase("idle");
    setDictError("");
    setDictNote("");
    setDictLevel(0);
    setDictSeconds(0);
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

  // Keyboard geometry (iOS / WKWebView): the chat SHELL tracks
  // the VISUAL viewport through two CSS vars on the root element
  // (--vv-t = visualViewport.offsetTop, --vv-h = its height),
  // which .shell.on-chat consumes under 860px: the shell is
  // position:fixed at top var(--vv-t) with height var(--vv-h),
  // so the whole column (header, thread well, composer) is
  // exactly the area the member can see, in every state.
  //
  // This replaces the old lift-the-composer math (2026-11-16,
  // removed same day): the column stayed layout-viewport height
  // (100dvh) and the composer was translated up by an overhang
  // computed from one event's height/offsetTop pair. A real
  // WKWebView delivers the keyboard transition in pieces (height
  // and offset arrive on different events, transient heights
  // mid-animation, no guaranteed final corrective event), so
  // the zone parked wherever the last event's math put it: in
  // Dip's report it flew to the top of the screen, over the
  // header and title, with the dock stranded mid-screen. The
  // vars are absolute, not cumulative, so any later event
  // self-corrects, and with no transform on the zone nothing
  // can detach.
  //
  // kb-open (root class, set when the visual viewport is more
  // than 100px shorter than the layout viewport) hides the dock
  // and collapses its clearance in the shell's CSS: while the
  // keyboard is up the composer parks directly above it, with
  // the approval note under the box and nothing overlapping.
  // No visualViewport: no vars, the CSS falls back to
  // top 0 / 100dvh and the layout is exactly the old closed
  // state. Desktop widths: vars cleared, shell stays in flow.
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return undefined;
    const root = document.documentElement;
    let raf = 0;
    const apply = () => {
      raf = 0;
      if (!window.matchMedia("(max-width: 860px)").matches) {
        root.style.removeProperty("--vv-h");
        root.style.removeProperty("--vv-t");
        root.classList.remove("kb-open");
        return;
      }
      // Was the thread riding the bottom BEFORE this resize? Read
      // with the old geometry still in effect: if the member was
      // at (or near) the newest message, keep them there after
      // the column resizes, so the newest message stays visible
      // above the composer instead of sliding underneath it. A
      // member scrolled up into history is left alone.
      const well = bodyRef.current;
      const wasAtBottom = well
        ? well.scrollHeight - well.scrollTop - well.clientHeight < 160
        : false;
      root.style.setProperty("--vv-h", vv.height + "px");
      root.style.setProperty("--vv-t", vv.offsetTop + "px");
      root.classList.toggle("kb-open", window.innerHeight - vv.height > 100);
      if (well && wasAtBottom) well.scrollTop = well.scrollHeight;
    };
    const queue = () => { if (!raf) raf = requestAnimationFrame(apply); };
    vv.addEventListener("resize", queue);
    vv.addEventListener("scroll", queue);
    window.addEventListener("resize", queue);
    apply();
    return () => {
      vv.removeEventListener("resize", queue);
      vv.removeEventListener("scroll", queue);
      window.removeEventListener("resize", queue);
      if (raf) cancelAnimationFrame(raf);
      root.style.removeProperty("--vv-h");
      root.style.removeProperty("--vv-t");
      root.classList.remove("kb-open");
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

  // --- In-chat dictation (mic in the composer) ---
  // Tap the mic, speak, and the words land as editable text in
  // the box. Nothing sends until the member hits Send.
  const clearDictTimers = useCallback(() => {
    if (dictTimerRef.current) { clearInterval(dictTimerRef.current); dictTimerRef.current = null; }
    if (dictCheckRef.current) { clearInterval(dictCheckRef.current); dictCheckRef.current = null; }
  }, []);
  const stopDictStream = useCallback(() => {
    try { dictStreamRef.current && dictStreamRef.current.getTracks().forEach((t) => t.stop()); } catch { /* fine */ }
    dictStreamRef.current = null;
  }, []);
  const cleanupDictation = useCallback(() => {
    dictCancelledRef.current = true;
    clearDictTimers();
    dictStoppingRef.current = false;
    const rec = dictRecorderRef.current;
    dictRecorderRef.current = null;
    if (rec) { rec.stop().catch(() => {}); }
    stopDictStream();
  }, [clearDictTimers, stopDictStream]);

  // Cleanup on unmount and on chat change.
  useEffect(() => {
    dictCancelledRef.current = false;
    return () => { cleanupDictation(); };
  }, [id, cleanupDictation]);

  const stopDictation = useCallback(async (reason) => {
    if (dictStoppingRef.current) return;
    dictStoppingRef.current = true;
    clearDictTimers();
    const isCap = reason === "cap";
    setDictPhase("transcribing");
    let blob = null;
    try { blob = dictRecorderRef.current ? await dictRecorderRef.current.stop() : null; } catch { blob = null; }
    dictRecorderRef.current = null;
    stopDictStream();
    if (dictCancelledRef.current) { dictStoppingRef.current = false; return; }
    if (!blob || blob.size < 2000) {
      setDictError("That was too short to hear. Tap the mic and give SAM a full sentence.");
      setDictNote("");
      setDictPhase("idle");
      dictStoppingRef.current = false;
      return;
    }
    try {
      const audio = await blobToBase64(blob);
      const res = await api("chats/" + id + "/dictate", {
        method: "POST",
        body: { audio, filename: "speech.wav", mime: "audio/wav" },
      });
      if (dictCancelledRef.current) { dictStoppingRef.current = false; return; }
      const transcript = ((res && res.transcript) || "").trim();
      if (!transcript) {
        setDictError("SAM could not hear that. Try again.");
      } else {
        const base = draftRef.current || "";
        const trimmedBase = base.replace(/\s+$/, "");
        const next = trimmedBase ? trimmedBase + " " + transcript : transcript;
        setDraft(next);
        draftRef.current = next;
        if (isCap) setDictNote("That hit the two-minute mark, so SAM stopped listening there. Your words are in the box, ready to edit.");
        requestAnimationFrame(() => {
          const ta = taRef.current;
          if (ta) {
            ta.focus();
            try { ta.setSelectionRange(next.length, next.length); } catch { /* fine */ }
          }
          grow();
        });
      }
    } catch (err) {
      if (!dictCancelledRef.current) setDictError(err.message || "SAM could not hear that. Try again.");
    }
    setDictPhase("idle");
    setDictLevel(0);
    dictStoppingRef.current = false;
  }, [id, clearDictTimers, stopDictStream, grow]);

  const startDictation = useCallback(async () => {
    if (dictPhase !== "idle") return;
    setDictError("");
    setDictNote("");
    dictCancelledRef.current = false;
    let stream = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setDictError("The microphone is blocked, so SAM cannot hear you. Allow the microphone for this site in your browser, then tap the mic again.");
      return;
    }
    if (dictCancelledRef.current) {
      try { stream.getTracks().forEach((t) => t.stop()); } catch { /* fine */ }
      return;
    }
    dictStreamRef.current = stream;
    dictHasSpokenRef.current = false;
    dictLastSpeechRef.current = 0;
    dictStoppingRef.current = false;
    dictStartedAtRef.current = Date.now();
    let lastLevelAt = 0;
    let lastLevelShown = 0;
    try {
      dictRecorderRef.current = createWavRecorder(stream, {
        onLevel: (rms) => {
          if (rms >= DICT_SPEECH_THRESHOLD) {
            dictHasSpokenRef.current = true;
            dictLastSpeechRef.current = Date.now();
          }
          // The meter does not need every chunk: throttling the
          // state update keeps the main thread (and the silence
          // check riding it) on time.
          const now = Date.now();
          if (now - lastLevelAt >= 120 && Math.abs(rms - lastLevelShown) > 0.02) {
            lastLevelAt = now;
            lastLevelShown = rms;
            setDictLevel(rms);
          }
        },
      });
    } catch {
      stopDictStream();
      setDictError("This browser could not start recording.");
      return;
    }
    setDictSeconds(0);
    setDictLevel(0);
    setDictPhase("recording");
    if (dictTimerRef.current) clearInterval(dictTimerRef.current);
    dictTimerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - dictStartedAtRef.current) / 1000);
      setDictSeconds(elapsed);
    }, 250);
    if (dictCheckRef.current) clearInterval(dictCheckRef.current);
    dictCheckRef.current = setInterval(() => {
      const elapsedSec = (Date.now() - dictStartedAtRef.current) / 1000;
      if (elapsedSec >= DICT_CAP_SECONDS) { void stopDictation("cap"); return; }
      // Auto-stop only after speech: initial silence never stops it.
      if (dictHasSpokenRef.current && dictLastSpeechRef.current && Date.now() - dictLastSpeechRef.current >= DICT_SILENCE_MS) {
        void stopDictation("auto");
      }
    }, 200);
  }, [dictPhase, stopDictation, stopDictStream]);

  function onDictButton() {
    if (dictPhase === "recording") { void stopDictation("manual"); return; }
    if (dictPhase === "transcribing") return;
    void startDictation();
  }

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
              <h1 className="display chat-title" title={thread.chat.title}>{thread.chat.title}</h1>
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
              {!thread && !error && <p className="chat-opening"><span className="orb" /> Opening the mission file...</p>}
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

          <div className="composer-zone">
            <form className="composer-box" onSubmit={send}>
              <textarea ref={taRef} value={draft} onChange={(e) => { setDraft(e.target.value); if (dictError) setDictError(""); }}
                placeholder="Give SAM an assignment..." rows={1}
                aria-label="Give SAM an assignment"
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} />
              <button type="button" className={"composer-mic" + (dictPhase === "recording" ? " recording" : "")}
                onClick={onDictButton} disabled={dictPhase === "transcribing"}
                aria-label={dictPhase === "recording" ? "Stop dictation" : "Dictate a message"}>
                {dictPhase === "recording" ? (
                  <>
                    <span className="composer-mic-pulse" aria-hidden="true" />
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor"
                      strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="6" y="6" width="12" height="12" rx="2" />
                    </svg>
                  </>
                ) : (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 3a3 3 0 0 1 3 3v5a3 3 0 0 1 -6 0V6a3 3 0 0 1 3-3 Z" />
                    <path d="M5 11a7 7 0 0 0 14 0" />
                    <line x1="12" y1="18" x2="12" y2="21" />
                  </svg>
                )}
              </button>
              <button className="composer-send" type="submit" disabled={sending || !draft.trim()} aria-label="Send">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="12" y1="19" x2="12" y2="5" />
                  <polyline points="5 12 12 5 19 12" />
                </svg>
              </button>
            </form>
            {dictPhase === "recording" && (
              <div className="dict-status" role="status" aria-live="polite">
                <span className="orb dict-orb" aria-hidden="true" />
                <span className="dict-clock">{Math.floor(dictSeconds / 60) + ":" + String(dictSeconds % 60).padStart(2, "0")}</span>
                <span className="dict-meter" aria-hidden="true"><span className="dict-meter-fill" style={{ width: Math.round(Math.min(1, dictLevel * 4) * 100) + "%" }} /></span>
                <span>Listening - stops on its own when you stop talking</span>
              </div>
            )}
            {dictPhase === "transcribing" && (
              <div className="dict-status" role="status" aria-live="polite">
                <span className="orb dict-orb" aria-hidden="true" />
                <span>Writing it down...</span>
              </div>
            )}
            {dictError && dictPhase === "idle" && <div className="dict-line dict-error">{dictError}</div>}
            {dictNote && dictPhase === "idle" && <div className="dict-line">{dictNote}</div>}
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
