"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { api } from "../lib/api";
import { blobToBase64, createWavRecorder } from "../lib/wav-recorder";
import { splitSentences } from "../lib/speech";
import Mark from "./Mark";

// Voice on the member's MiniMax key: the turn-by-turn kind.
// MiniMax has no live speech-to-speech call, so this panel is
// honest about its shape: tap, say your piece, tap again; SAM
// hears it (transcription), thinks (an ordinary chat turn on
// the same key), and answers out loud sentence by sentence
// (synthesis). The whole exchange is saved into the chat as it
// happens by the door, stamped as spoken, so nothing here has
// to save anything at the end - closing the panel mid-exchange
// loses nothing.

const PHASE_LINES = {
  idle: "Say your piece.",
  sending: "Heard you. Writing it down...",
  thinking: "SAM is thinking...",
  speaking: "SAM is talking.",
  denied: "SAM cannot hear you",
  error: "That did not go through",
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export default function MmVoicePanel({ chatId, onClose, onSaved, onSwitchToRealtime }) {
  const [phase, setPhase] = useState("idle");
  const [note, setNote] = useState("");
  const [lines, setLines] = useState([]);
  const [seconds, setSeconds] = useState(0);
  const streamRef = useRef(null);
  const recorderRef = useRef(null);
  const timerRef = useRef(null);
  const audioRef = useRef(null);
  const cancelledRef = useRef(false);
  const replyLineRef = useRef(-1);
  const spokenRef = useRef(0);
  const speakChainRef = useRef(Promise.resolve());

  const stopStream = useCallback(() => {
    try { streamRef.current && streamRef.current.getTracks().forEach((t) => t.stop()); } catch { /* fine */ }
    streamRef.current = null;
  }, []);

  useEffect(() => {
    cancelledRef.current = false;
    return () => {
      cancelledRef.current = true;
      if (timerRef.current) clearInterval(timerRef.current);
      stopStream();
      try { audioRef.current && audioRef.current.pause(); } catch { /* fine */ }
    };
  }, [stopStream]);

  function pushUserLine(content) {
    replyLineRef.current = -1;
    setLines((prev) => [...prev, { role: "user", content }]);
  }
  function feedReply(content, isFinal) {
    const text = (content || "").trim();
    if (!text) return;
    setLines((prev) => {
      const next = [...prev];
      if (replyLineRef.current >= 0 && next[replyLineRef.current]) {
        next[replyLineRef.current] = { role: "assistant", content: text, partial: !isFinal };
      } else {
        replyLineRef.current = next.length;
        next.push({ role: "assistant", content: text, partial: !isFinal });
      }
      return next;
    });
    const sentences = splitSentences(text);
    const complete = isFinal ? sentences : sentences.slice(0, -1);
    while (spokenRef.current < complete.length) {
      const sentence = complete[spokenRef.current];
      spokenRef.current += 1;
      queueSentence(sentence);
    }
  }

  function queueSentence(sentence) {
    speakChainRef.current = speakChainRef.current.then(async () => {
      if (cancelledRef.current) return;
      setPhase((p) => (p === "thinking" || p === "speaking" ? "speaking" : p));
      try {
        const res = await api("chats/" + chatId + "/mm-voice/speak", { method: "POST", body: { text: sentence } });
        if (cancelledRef.current) return;
        await playAudio(res.audio, res.mime);
      } catch {
        // One sentence that will not speak does not end the
        // exchange: its words are on the screen either way.
      }
    });
  }

  function playAudio(b64, mime) {
    return new Promise((resolve) => {
      let settled = false;
      const done = () => { if (!settled) { settled = true; resolve(); } };
      try {
        const binary = atob(b64 || "");
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const url = URL.createObjectURL(new Blob([bytes], { type: mime || "audio/mpeg" }));
        const audio = audioRef.current;
        if (!audio) { URL.revokeObjectURL(url); done(); return; }
        audio.onended = () => { URL.revokeObjectURL(url); done(); };
        audio.onerror = () => { URL.revokeObjectURL(url); done(); };
        audio.src = url;
        const played = audio.play();
        if (played && played.catch) played.catch(done);
        setTimeout(done, 90000);
      } catch { done(); }
    });
  }

  async function pollExchange(baselineIds, transcript, startedAt) {
    let failedPolls = 0;
    for (;;) {
      if (cancelledRef.current) return;
      if (Date.now() - startedAt > 240000) {
        setNote("SAM is taking a very long time on that one. The chat keeps the words either way; check the thread in a bit.");
        setPhase("error");
        return;
      }
      await sleep(900);
      if (cancelledRef.current) return;
      let thread = null;
      try { thread = await api("chats/" + chatId); } catch { continue; }
      const messages = thread.messages || [];
      const fresh = baselineIds
        ? messages.filter((m) => !baselineIds.has(m.id))
        : messages.slice(-6);
      const userRow = fresh.find((m) => m.role === "user" && m.content === transcript) || fresh.find((m) => m.role === "user");
      const assistantRow = fresh.find((m) => m.role === "assistant");
      if (assistantRow) {
        const isFinal = !assistantRow.partial;
        feedReply(assistantRow.content, isFinal);
        if (isFinal) {
          await speakChainRef.current;
          if (cancelledRef.current) return;
          setPhase("idle");
          if (onSaved) onSaved();
          return;
        }
      } else if (userRow && userRow.queueStatus === "failed") {
        failedPolls += 1;
        if (failedPolls > 6) {
          setNote("SAM could not answer that one. It is marked failed in the chat, and you can resend it from there.");
          setPhase("error");
          return;
        }
      }
    }
  }

  async function startRecording() {
    setNote("");
    let stream = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setPhase("denied");
      return;
    }
    streamRef.current = stream;
    try {
      recorderRef.current = createWavRecorder(stream);
    } catch {
      stopStream();
      setNote("This browser could not start recording.");
      setPhase("error");
      return;
    }
    setSeconds(0);
    setPhase("recording");
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
  }

  async function stopRecording() {
    if (timerRef.current) clearInterval(timerRef.current);
    setPhase("sending");
    let blob = null;
    try {
      blob = recorderRef.current ? await recorderRef.current.stop() : null;
    } catch { blob = null; }
    recorderRef.current = null;
    stopStream();
    if (!blob || blob.size < 2000) {
      setNote("That was too short to hear. Tap and talk again, and give SAM a full sentence.");
      setPhase("idle");
      return;
    }
    let baselineIds = null;
    try {
      const thread = await api("chats/" + chatId);
      baselineIds = new Set((thread.messages || []).map((m) => m.id));
    } catch { baselineIds = null; }
    let res = null;
    try {
      const audio = await blobToBase64(blob);
      res = await api("chats/" + chatId + "/mm-voice", {
        method: "POST",
        body: { audio, filename: "speech.wav", mime: "audio/wav" },
      });
    } catch (err) {
      setNote(err.message || "SAM could not hear that. Try again.");
      setPhase("error");
      return;
    }
    if (cancelledRef.current) return;
    pushUserLine(res.transcript);
    if (res.note) {
      setNote(res.note);
      setPhase("idle");
      return;
    }
    spokenRef.current = 0;
    speakChainRef.current = Promise.resolve();
    if (res.reply) {
      feedReply(res.reply, true);
      await speakChainRef.current;
      if (cancelledRef.current) return;
      setPhase("idle");
      if (onSaved) onSaved();
      return;
    }
    setPhase("thinking");
    void pollExchange(baselineIds, res.transcript, Date.now());
  }

  function close() {
    cancelledRef.current = true;
    if (timerRef.current) clearInterval(timerRef.current);
    stopStream();
    try { audioRef.current && audioRef.current.pause(); } catch { /* fine */ }
    if (onClose) onClose();
  }

  const busy = phase === "sending" || phase === "thinking" || phase === "speaking";
  const clock = Math.floor(seconds / 60) + ":" + String(seconds % 60).padStart(2, "0");

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-[#180722] text-[#fff3d6]" role="dialog" aria-label="Voice with SAM, turn by turn">
      <audio ref={audioRef} />
      <div className="mx-auto flex w-full max-w-[860px] flex-1 flex-col px-5 pb-6 pt-4 min-h-0">
        <div className="flex items-center gap-3">
          <span className="pill"><span className="orb" /> Voice, turn by turn</span>
          <span className="dim small">Your MiniMax key carries this voice</span>
          <button type="button" className="btn ghost small-btn ml-auto" onClick={close}>
            {busy || phase === "recording" ? "End" : "Close"}
          </button>
        </div>

        <div className="flex flex-col items-center pt-6 text-center">
          <div className="radar" aria-hidden="true">
            <span className="radar-glow" />
            <span className="radar-ring r1" />
            <span className="radar-ring r2" />
            <span className="radar-ring r3" />
            <span className="radar-mark"><Mark size={88} /></span>
          </div>
          <h2 className="display mt-3 text-[34px] leading-tight">
            {phase === "recording" ? "Listening. Tap when you are done." : (PHASE_LINES[phase] || "Say your piece.")}
          </h2>
          {phase === "recording" && <p className="dim">{clock} - SAM hears the whole piece, then answers.</p>}
          {phase === "speaking" && <p className="dim">Your turn comes when SAM finishes.</p>}
          {onSwitchToRealtime && phase === "idle" && (
            <button type="button" className="btn ghost small-btn mt-2" onClick={onSwitchToRealtime}>
              Switch to a live call instead
            </button>
          )}
        </div>

        {phase === "denied" && (
          <div className="card mt-4">
            <p style={{ marginTop: 0 }}>
              The microphone is blocked, so SAM cannot hear a word. Allow the microphone for this site
              in your browser, then try again.
            </p>
            <button type="button" className="btn" onClick={startRecording}>Try again</button>
          </div>
        )}
        {phase === "error" && (
          <div className="notice err mt-4">
            {note || "Something went wrong with that one."}{" "}
            <button type="button" onClick={() => { setNote(""); setPhase("idle"); }}
              style={{ background: "none", border: 0, color: "inherit", font: "inherit", fontWeight: 700, cursor: "pointer", textDecoration: "underline", padding: 0 }}>
              Back to talk
            </button>
          </div>
        )}
        {note && phase !== "error" && <div className="notice mt-4">{note}</div>}

        <div className="mt-5 min-h-0 flex-1 overflow-y-auto" aria-live="polite">
          {lines.length === 0 && phase === "idle" && (
            <p className="dim text-center">What you say and what SAM says back will appear here, and all of it is saved to the chat as you go.</p>
          )}
          <div className="thread">
            {lines.map((l, i) => (
              <div key={i} className={"msg " + (l.role === "user" ? "user" : "assistant")}>
                {l.content}
                {l.partial && <span className="state">SAM is saying this now...</span>}
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-center gap-2 pt-3">
          {phase === "recording" ? (
            <button type="button" className="btn" onClick={stopRecording} style={{ minWidth: 220 }}>
              Tap to stop - {clock}
            </button>
          ) : (
            <button type="button" className="btn" onClick={startRecording} disabled={busy} style={{ minWidth: 220 }}>
              {busy ? "One moment..." : "Tap and talk"}
            </button>
          )}
          <p className="approval-note justify-center text-center">
            This voice takes turns: you talk, SAM listens, thinks, and answers out loud. For a live call,
            add an OpenAI voice key in <Link href="/app/settings" style={{ color: "inherit", fontWeight: 700 }}>Settings</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
