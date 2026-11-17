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
  // Stick-to-bottom: while set, the well keeps the newest message
  // pinned fully in view across resizes and late renders. The
  // well's own scroll handler maintains it (near the bottom =
  // sticking, scrolled up into history = released); send/resend
  // set it so the member's own message always lands in view.
  const stickRef = useRef(true);
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
    stickRef.current = true;
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
  // scrolls inside its own well now, so scroll the well, not the
  // page. The pin is instant and only while sticking: the old
  // unconditional smooth scroll targeted a scrollHeight measured
  // before any concurrent resize and landed short (and it yanked
  // a member who had scrolled up to read history on every poll).
  useEffect(() => {
    if (!thread) return;
    const active = thread.turnActive || (thread.queue && thread.queue.length > 0) ||
      thread.messages.some((m) => m.queueStatus === "queued");
    const well = bodyRef.current;
    if (well && stickRef.current) well.scrollTop = well.scrollHeight;
    if (!active) return;
    timer.current = setTimeout(() => { load().catch(() => {}); }, 1500);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [thread, load]);

  // Late renders move the goalposts: a bubble that arrives by poll,
  // a font swap, an image-free reflow — any of them grows the
  // thread content after the pin that was supposed to reveal it.
  // Watch the well and its content; while sticking, re-pin on any
  // size change so the newest message's END is what rests above
  // the composer, never its sliced-off top.
  useEffect(() => {
    const well = bodyRef.current;
    if (!well || typeof ResizeObserver === "undefined") return undefined;
    let raf = 0;
    const pin = () => {
      raf = 0;
      if (stickRef.current) well.scrollTop = well.scrollHeight;
    };
    const queue = () => { if (!raf) raf = requestAnimationFrame(pin); };
    const ro = new ResizeObserver(queue);
    ro.observe(well);
    if (well.firstElementChild) ro.observe(well.firstElementChild);
    return () => { ro.disconnect(); if (raf) cancelAnimationFrame(raf); };
  }, [thread]);

  // Keyboard geometry (iOS / WKWebView): the chat SHELL tracks
  // the VISUAL viewport through two CSS vars on the root element
  // (--vv-t = visualViewport.offsetTop, --vv-h = its height),
  // which .shell.on-chat consumes under 860px: the shell is
  // position:fixed at top var(--vv-t) with height var(--vv-h),
  // so the whole column (header, thread well, composer) is
  // exactly the area the member can see, in every state. The
  // vars are absolute, not cumulative, so any later event
  // self-corrects, and with no transform on the zone nothing
  // can detach.
  //
  // kb-open (root class) hides the dock and collapses its 98px
  // clearance in the shell's CSS, so while the keyboard is up
  // the composer parks at the bottom of the visible band with
  // nothing of ours between it and the keyboard. The first fix
  // (2026-11-16) drove kb-open from ONE signal, the delta
  // innerHeight - vv.height > 100, and Dip's phone disproved it:
  // in the Muse app's in-app WKWebView the webview FRAME is
  // resized above the app's URL bar, so the layout and visual
  // viewports shrink TOGETHER (~844 -> ~455, offsetTop 0), the
  // delta stays ~0, kb-open never fired, and the dock sat in
  // the band under the approval note (his screenshot, measured
  // in sam-review/kbfix2-proof/NOTES.md). kb-open is now set
  // when ANY of these says the keyboard is up, and cleared only
  // when ALL are clear:
  //   1. the composer textarea holds focus (focusin at once,
  //      focusout after a 250ms grace; activeElement re-checked
  //      on every apply as a backstop);
  //   2. vv.height has shrunk >100px below the largest height
  //      seen while closed (a self-calibrating reference: in a
  //      frame-resizing webview vv.height absolutely shrinks
  //      even when the delta cannot see it);
  //   3. window.innerHeight has shrunk >100px below its own
  //      closed reference (a webview whose vv is missing or
  //      lazy while its frame resizes);
  //   4. the original delta, for pan-style browsers.
  // References grow only while closed and unfocused, and reset
  // on orientationchange, so they fit the device and the host
  // app's chrome instead of a hardcoded height. With no
  // visualViewport at all, signals 1 and 3 still work and the
  // CSS falls back to top 0 / 100dvh, the old closed layout.
  // Desktop widths: vars and class cleared, shell stays in flow.
  //
  // The pin after a resize is deliberately NOT in apply()'s own
  // frame: the first fix assigned scrollTop in the same frame it
  // changed the vars, against pre-reflow geometry, so the pin
  // clamped short by exactly the height the well was losing;
  // and the old smooth-scroll effect targeted a stale maximum
  // and read as "member scrolled up" to the next apply. Pins
  // now run in a double-rAF (post-reflow) and again 150/400ms
  // after any kb-open transition, once the keyboard/frame
  // animation has settled — always gated on the stick flag.
  useEffect(() => {
    const root = document.documentElement;
    const vv = window.visualViewport || null;
    const ta = taRef.current;
    let raf = 0;
    let pinRaf = 0;
    let blurTimer = 0;
    let settleTimers = [];
    let focused = false;
    let kb = false;
    let refH = 0;
    let refInner = 0;

    const pin = () => {
      const well = bodyRef.current;
      if (well && stickRef.current) well.scrollTop = well.scrollHeight;
    };
    const pinAfterReflow = () => {
      if (pinRaf) return;
      pinRaf = requestAnimationFrame(() => {
        pinRaf = requestAnimationFrame(() => { pinRaf = 0; pin(); });
      });
    };
    const pinSettled = () => {
      settleTimers.forEach((t) => clearTimeout(t));
      settleTimers = [setTimeout(pin, 150), setTimeout(pin, 400)];
    };

    const apply = () => {
      raf = 0;
      if (!window.matchMedia("(max-width: 860px)").matches) {
        root.style.removeProperty("--vv-h");
        root.style.removeProperty("--vv-t");
        root.classList.remove("kb-open");
        kb = false;
        return;
      }
      if (ta && document.activeElement === ta) focused = true;
      if (vv) {
        root.style.setProperty("--vv-h", vv.height + "px");
        root.style.setProperty("--vv-t", vv.offsetTop + "px");
      }
      const vvShrink = !!vv && refH > 0 && refH - vv.height > 100;
      const innerShrink = refInner > 0 && refInner - window.innerHeight > 100;
      const delta = !!vv && window.innerHeight - vv.height > 100;
      const nowKb = !!(focused || vvShrink || innerShrink || delta);
      if (!nowKb) {
        if (vv) refH = Math.max(refH, vv.height);
        refInner = Math.max(refInner, window.innerHeight);
      }
      const changed = nowKb !== kb;
      kb = nowKb;
      root.classList.toggle("kb-open", kb);
      pinAfterReflow();
      if (changed) pinSettled();
    };
    const queue = () => { if (!raf) raf = requestAnimationFrame(apply); };

    const onFocusIn = () => {
      if (blurTimer) { clearTimeout(blurTimer); blurTimer = 0; }
      focused = true;
      apply();
    };
    const onFocusOut = () => {
      if (blurTimer) clearTimeout(blurTimer);
      blurTimer = setTimeout(() => { blurTimer = 0; focused = false; apply(); }, 250);
    };
    const onOrientation = () => { refH = 0; refInner = 0; queue(); };

    if (vv) {
      vv.addEventListener("resize", queue);
      vv.addEventListener("scroll", queue);
    }
    window.addEventListener("resize", queue);
    window.addEventListener("orientationchange", onOrientation);
    if (ta) {
      ta.addEventListener("focusin", onFocusIn);
      ta.addEventListener("focusout", onFocusOut);
    }
    apply();
    return () => {
      if (vv) {
        vv.removeEventListener("resize", queue);
        vv.removeEventListener("scroll", queue);
      }
      window.removeEventListener("resize", queue);
      window.removeEventListener("orientationchange", onOrientation);
      if (ta) {
        ta.removeEventListener("focusin", onFocusIn);
        ta.removeEventListener("focusout", onFocusOut);
      }
      if (raf) cancelAnimationFrame(raf);
      if (pinRaf) cancelAnimationFrame(pinRaf);
      if (blurTimer) clearTimeout(blurTimer);
      settleTimers.forEach((t) => clearTimeout(t));
      root.style.removeProperty("--vv-h");
      root.style.removeProperty("--vv-t");
      root.classList.remove("kb-open");
    };
  }, []);

  // The well reports its own position: riding the bottom keeps
  // the stick set, scrolling up into history releases it. A
  // programmatic pin lands at gap 0, so it never releases itself.
  const onWellScroll = (e) => {
    const w = e.currentTarget;
    stickRef.current = w.scrollHeight - w.scrollTop - w.clientHeight <= 48;
  };

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
    stickRef.current = true;
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
    stickRef.current = true;
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
            <div className="chat-body" ref={bodyRef} onScroll={onWellScroll}>
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
