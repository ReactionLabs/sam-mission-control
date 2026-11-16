"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { api } from "../lib/api";
import Mark from "./Mark";
import MmVoicePanel from "./MmVoicePanel";

// Talk, for real (Dip ruling 2026-11-16): voice with the
// member's SAM, in two modes chosen by the keys the member
// holds. The live call below rides the member's OWN OpenAI key:
// the door mints a short-lived Realtime secret server-side; this
// panel receives only that secret and carries the WebRTC call
// straight to OpenAI. The words stream in here as they are
// spoken, and when the call ends the transcript is saved into
// the chat, so the conversation continues in text where the
// call left off. With only a MiniMax chat key, Talk opens the
// turn-by-turn voice instead (MmVoicePanel) - no second key.
//
// Voice is for talking in v1: building, research, and tool work
// stay in the text chat, and the panel says so out loud rather
// than letting anyone guess.

const STATE_LINES = {
  starting: "Waking SAM up...",
  connecting: "Connecting the call...",
  listening: "Listening. Go ahead.",
  talking: "SAM is talking.",
  saving: "Saving the call to the chat...",
  ended: "Call ended. It is saved in the chat.",
};

export default function VoicePanel({ chatId, onClose, onSaved }) {
  // Two voice modes, chosen by which keys the member holds
  // (Dip, 2026-11-16): an OpenAI voice key buys the live call
  // below; the MiniMax chat key alone buys the turn-by-turn
  // voice (MmVoicePanel). The live call stays the default when
  // both exist, and either panel can switch to the other.
  const [member, setMember] = useState(null);
  const [mode, setMode] = useState(null);
  const [state, setState] = useState("starting");
  const [note, setNote] = useState("");
  const [lines, setLines] = useState([]);
  const [attempt, setAttempt] = useState(0);
  const pcRef = useRef(null);
  const streamRef = useRef(null);
  const audioRef = useRef(null);
  const entriesRef = useRef([]);
  const draftRef = useRef("");
  const endedRef = useRef(false);

  const teardown = useCallback(() => {
    try { pcRef.current && pcRef.current.close(); } catch { /* already gone */ }
    pcRef.current = null;
    try { streamRef.current && streamRef.current.getTracks().forEach((t) => t.stop()); } catch { /* fine */ }
    streamRef.current = null;
  }, []);

  useEffect(() => {
    let live = true;
    api("me")
      .then((res) => {
        if (!live) return;
        const m = (res && res.member) || {};
        setMember(m);
        const mm = !!m.hasMmVoice || (!!m.hasKey && m.provider && m.provider.kind === "minimax");
        if (m.hasVoiceKey) setMode("realtime");
        else if (mm) setMode("minimax");
        else setMode("nokey");
      })
      .catch(() => {
        // If the member view will not load, fall back to the
        // shipped behavior: try the call, and let the mint's own
        // plain words explain a missing key.
        if (live) setMode("realtime");
      });
    return () => { live = false; };
  }, []);

  useEffect(() => {
    if (mode !== "realtime") return;
    endedRef.current = false;
    let cancelled = false;

    function pushLine(role, content, partial) {
      const text = (content || "").trim();
      if (!text) return;
      if (!partial) entriesRef.current = [...entriesRef.current, { role, content: text }];
      setLines((prev) => {
        const base = prev.filter((l) => !l.partial);
        return partial ? [...base, { role, content: text, partial: true }] : [...base, { role, content: text }];
      });
    }

    function handleEvent(raw) {
      let ev = null;
      try { ev = JSON.parse(raw); } catch { return; }
      if (!ev || !ev.type) return;
      switch (ev.type) {
        case "input_audio_buffer.speech_started":
          setState((s) => (s === "connecting" || s === "listening" ? "listening" : s));
          break;
        case "conversation.item.input_audio_transcription.completed":
          pushLine("user", ev.transcript, false);
          break;
        case "response.created":
          draftRef.current = "";
          setState("talking");
          break;
        case "response.output_audio_transcript.delta":
          draftRef.current += ev.delta || "";
          pushLine("assistant", draftRef.current, true);
          break;
        case "response.output_audio_transcript.done":
          pushLine("assistant", ev.transcript || draftRef.current, false);
          draftRef.current = "";
          break;
        case "response.done":
          setState((s) => (s === "talking" ? "listening" : s));
          break;
        case "error":
          setNote((ev.error && ev.error.message) || "Something hiccuped on the call. You can keep talking, or end and try again.");
          break;
        default:
          break;
      }
    }

    async function start() {
      setState("starting");
      setNote("");
      let session = null;
      try {
        const res = await api("me/voice/session", { method: "POST", body: { chatId } });
        session = res.session;
      } catch (err) {
        if (cancelled) return;
        if (/OpenAI key first/i.test(err.message || "")) { setState("nokey"); return; }
        setNote(err.message || "Voice could not start.");
        setState("error");
        return;
      }
      if (cancelled) return;
      let stream = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch {
        if (!cancelled) setState("denied");
        return;
      }
      if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
      streamRef.current = stream;
      setState("connecting");
      try {
        const pc = new RTCPeerConnection();
        pcRef.current = pc;
        for (const track of stream.getTracks()) pc.addTrack(track, stream);
        pc.ontrack = (e) => {
          if (audioRef.current && e.streams && e.streams[0]) audioRef.current.srcObject = e.streams[0];
        };
        const dc = pc.createDataChannel("oai-events");
        dc.onopen = () => { if (!cancelled) setState("listening"); };
        dc.onmessage = (e) => handleEvent(e.data);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        const res = await fetch(session.callsUrl, {
          method: "POST",
          body: offer.sdp,
          headers: { authorization: "Bearer " + session.clientSecret, "content-type": "application/sdp" },
        });
        if (!res.ok) throw new Error("The call could not be set up (HTTP " + res.status + ").");
        const answerSdp = await res.text();
        await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });
      } catch (err) {
        if (!cancelled) {
          setNote(err.message || "The call could not be set up.");
          setState("error");
          teardown();
        }
      }
    }

    start();
    return () => { cancelled = true; teardown(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId, attempt, mode]);

  async function endCall(closePanel) {
    if (endedRef.current) return;
    endedRef.current = true;
    teardown();
    const entries = entriesRef.current;
    if (entries.length) {
      setState("saving");
      try {
        await api("chats/" + chatId + "/voice-transcript", { method: "POST", body: { entries } });
        if (onSaved) await onSaved();
      } catch {
        setNote("The call ended, but its words could not be saved to the chat.");
        setState("error");
        return;
      }
    }
    setState("ended");
    if (closePanel) setTimeout(() => { if (onClose) onClose(); }, 900);
  }
  function end() { void endCall(true); }
  async function switchToMm() {
    await endCall(false);
    setMode("minimax");
  }

  const live = state === "listening" || state === "talking";
  const mmReady = !!member && (!!member.hasMmVoice || (!!member.hasKey && member.provider && member.provider.kind === "minimax"));

  if (mode === "minimax") {
    return (
      <MmVoicePanel
        chatId={chatId}
        onClose={onClose}
        onSaved={onSaved}
        onSwitchToRealtime={member && member.hasVoiceKey ? () => setMode("realtime") : undefined}
      />
    );
  }
  if (mode === null) {
    return (
      <div className="fixed inset-0 z-[70] flex flex-col bg-[#180722] text-[#fff3d6]" role="dialog" aria-label="Voice with SAM">
        <div className="mx-auto flex w-full max-w-[860px] flex-1 flex-col px-5 pb-6 pt-4 min-h-0">
          <div className="flex items-center gap-3">
            <span className="pill"><span className="orb" /> Voice</span>
            <button type="button" className="btn ghost small-btn ml-auto" onClick={onClose}>Close</button>
          </div>
          <div className="flex flex-col items-center pt-6 text-center">
            <div className="radar" aria-hidden="true">
              <span className="radar-glow" />
              <span className="radar-ring r1" />
              <span className="radar-ring r2" />
              <span className="radar-ring r3" />
              <span className="radar-mark"><Mark size={88} /></span>
            </div>
            <h2 className="display mt-3 text-[34px] leading-tight">Waking SAM up...</h2>
          </div>
        </div>
      </div>
    );
  }
  if (mode === "nokey") {
    return (
      <div className="fixed inset-0 z-[70] flex flex-col bg-[#180722] text-[#fff3d6]" role="dialog" aria-label="Voice with SAM">
        <div className="mx-auto flex w-full max-w-[860px] flex-1 flex-col px-5 pb-6 pt-4 min-h-0">
          <div className="flex items-center gap-3">
            <span className="pill"><span className="orb" /> Voice</span>
            <button type="button" className="btn ghost small-btn ml-auto" onClick={onClose}>Close</button>
          </div>
          <div className="flex flex-col items-center pt-6 text-center">
            <div className="radar" aria-hidden="true">
              <span className="radar-glow" />
              <span className="radar-ring r1" />
              <span className="radar-ring r2" />
              <span className="radar-ring r3" />
              <span className="radar-mark"><Mark size={88} /></span>
            </div>
            <h2 className="display mt-3 text-[34px] leading-tight">Voice needs a key first</h2>
          </div>
          <div className="card mt-4">
            <p style={{ marginTop: 0 }}>
              There are two ways to talk to SAM, and each one rides a key of yours. Turn by turn:
              your MiniMax chat key carries it - tap, say your piece, and SAM answers out loud.
              A live call: an OpenAI key makes Talk a real-time conversation. Add either key once
              in Settings and voice stays on from then on.
            </p>
            <Link className="btn" href="/app/settings">Add a key in Settings</Link>
          </div>
          <p className="approval-note justify-center text-center">
            Voice is for talking. For building and research, type it in the chat and SAM will get to work.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-[#180722] text-[#fff3d6]" role="dialog" aria-label="Voice call with SAM">
      <audio ref={audioRef} autoPlay />
      <div className="mx-auto flex w-full max-w-[860px] flex-1 flex-col px-5 pb-6 pt-4 min-h-0">
        <div className="flex items-center gap-3">
          <span className="pill"><span className="orb" /> Voice call</span>
          <span className="dim small">Your OpenAI key carries this call</span>
          {mmReady && (
            <button type="button" className="btn ghost small-btn ml-auto" onClick={() => void switchToMm()} disabled={state === "saving"}>
              Turn by turn instead
            </button>
          )}
          <button type="button" className={"btn ghost small-btn" + (mmReady ? "" : " ml-auto")} onClick={end} disabled={state === "saving"}>
            {live || state === "connecting" || state === "starting" ? "End call" : "Close"}
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
            {state === "nokey" ? "Voice needs a key first" : state === "denied" ? "SAM cannot hear you" : (STATE_LINES[state] || "On the call")}
          </h2>
          {state === "talking" && <p className="dim">Talk over SAM any time; it will stop and listen.</p>}
        </div>

        {state === "nokey" && (
          <div className="card mt-4">
            <p style={{ marginTop: 0 }}>
              A live call rides your own OpenAI key, the one from your ChatGPT platform account.
              Add the voice key once and Talk works from then on.
              {mmReady && " Or skip the call entirely: your MiniMax chat key already carries the turn-by-turn voice."}
            </p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Link className="btn" href="/app/settings">Add my voice key in Settings</Link>
              {mmReady && (
                <button type="button" className="btn ghost" onClick={() => setMode("minimax")}>
                  Use turn-by-turn voice instead
                </button>
              )}
            </div>
          </div>
        )}
        {state === "denied" && (
          <div className="card mt-4">
            <p style={{ marginTop: 0 }}>
              The microphone is blocked, so SAM cannot hear a word. Allow the microphone for this site
              in your browser, then try the call again.
            </p>
            <button type="button" className="btn" onClick={() => setAttempt((a) => a + 1)}>Try again</button>
          </div>
        )}
        {state === "error" && (
          <div className="notice err mt-4">
            {note || "Something went wrong on the call."}{" "}
            <button type="button" onClick={() => setAttempt((a) => a + 1)}
              style={{ background: "none", border: 0, color: "inherit", font: "inherit", fontWeight: 700, cursor: "pointer", textDecoration: "underline", padding: 0 }}>
              Try the call again
            </button>
          </div>
        )}
        {note && state !== "error" && <div className="notice mt-4">{note}</div>}

        <div className="mt-5 min-h-0 flex-1 overflow-y-auto" aria-live="polite">
          {lines.length === 0 && live && (
            <p className="dim text-center">What you both say will appear here, and it is saved to the chat when you hang up.</p>
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

        <p className="approval-note justify-center text-center">
          Voice is for talking. For building and research, type it in the chat and SAM will get to work.
        </p>
      </div>
    </div>
  );
}
