"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";

// "Give SAM a Mission": an interactive preview. Clearly labeled as a
// simulation with made-up example records. No real account, no real
// actions, nothing leaves this page. The approval step is real in one
// respect: the preview refuses to finish until the visitor taps
// Approve, which is exactly how SAM treats the owner.

const MISSIONS = [
  {
    id: "inquiries",
    label: "Organize my customer inquiries",
    steps: [
      { title: "Mission received", text: "SAM reads the mission back in plain words, so you both agree on the job." },
      { title: "SAM finds the tools", text: "For this one: the inquiries inbox and the customer list. Nothing else gets touched." },
      { title: "SAM prepares the work", text: "Six example inquiries get sorted into piles: New, Waiting on a quote, and Booked." },
      { title: "Your approval comes first", text: "SAM wants to file the sorted list where your team can see it. Nothing is filed, sent, or changed until you say yes." },
      { title: "Mission result", text: "One tidy list, ready for the morning. Every step is written in the activity record." },
    ],
    result: {
      title: "Example result: the morning list",
      rows: [
        ["New", "2 inquiries, including J. Rivera, pump repair (example)"],
        ["Waiting on a quote", "3 inquiries"],
        ["Booked", "1 job on the calendar"],
      ],
    },
  },
  {
    id: "summary",
    label: "Summarize my business activity",
    steps: [
      { title: "Mission received", text: "SAM reads the mission back in plain words, so you both agree on the job." },
      { title: "SAM finds the tools", text: "For this one: the activity record and this week's missions. Reading only." },
      { title: "SAM prepares the work", text: "The week gets gathered into one short briefing, in the order you would ask about it." },
      { title: "Your approval comes first", text: "SAM wants to pin this briefing to your Mission Control home. It stays a draft until you say yes." },
      { title: "Mission result", text: "A two-minute read that tells you what happened, what is waiting, and what needs you." },
    ],
    result: {
      title: "Example result: the week at Sunny Side Pool Care (a made-up business)",
      rows: [
        ["New inquiries", "4 this week"],
        ["Jobs finished", "2, both marked complete by the owner"],
        ["Waiting on you", "1 quote approval"],
      ],
    },
  },
  {
    id: "followup",
    label: "Help me follow up with customers",
    steps: [
      { title: "Mission received", text: "SAM reads the mission back in plain words, so you both agree on the job." },
      { title: "SAM finds the tools", text: "For this one: the customer list and your past messages, so the note sounds like you." },
      { title: "SAM prepares the work", text: "A short follow-up note gets drafted for each example customer who went quiet." },
      { title: "Your approval comes first", text: "Here are the drafts. SAM does not send a single word until you approve each one." },
      { title: "Mission result", text: "Approved notes are ready to send. The rest stay drafts. Nothing ever sends itself." },
    ],
    result: {
      title: "Example result: follow-up drafts",
      rows: [
        ["Draft ready", "\u201CHi J. Rivera, checking in on your pump repair quote\u2026\u201D (example)"],
        ["Approved by you", "Only the ones you tapped"],
        ["Sent without approval", "None. Ever."],
      ],
    },
  },
];

const STEP_MS = 1100;

export default function MissionDemo() {
  const reduce = useReducedMotion();
  const [missionId, setMissionId] = useState(MISSIONS[0].id);
  const [phase, setPhase] = useState(0); // 0 idle, 1..5 steps shown, 6 done
  const [running, setRunning] = useState(false);
  const [primed, setPrimed] = useState(false); // arrived via the hero button
  const timer = useRef(null);

  const mission = MISSIONS.find((m) => m.id === missionId);
  const APPROVAL_STEP = 4; // 1-based index of the approval step

  const clear = () => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = null;
  };

  const schedule = (next) => {
    clear();
    timer.current = window.setTimeout(() => setPhase(next), STEP_MS);
  };

  useEffect(() => {
    if (!running) return undefined;
    if (phase >= 1 && phase < APPROVAL_STEP) schedule(phase + 1);
    else if (phase === 5) schedule(6);
    return clear;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, running]);

  useEffect(() => clear, []);

  const pick = (id) => {
    clear();
    setMissionId(id);
    setPhase(0);
    setRunning(false);
    setPrimed(false);
  };

  const run = () => {
    clear();
    setPhase(1);
    setRunning(true);
  };

  // "Watch SAM in Action" (hero) pays off in one click: the hero
  // dispatches sam:watch-demo, and the customer-inquiry example
  // starts running on its own. Reduced motion: the example is
  // selected and presented at rest with the Run button waiting,
  // so the payoff is one tap instead of a moving show.
  useEffect(() => {
    const start = () => {
      clear();
      setMissionId(MISSIONS[0].id);
      setPrimed(true);
      if (reduce) {
        setPhase(0);
        setRunning(false);
      } else {
        setPhase(1);
        setRunning(true);
      }
    };
    window.addEventListener("sam:watch-demo", start);
    return () => window.removeEventListener("sam:watch-demo", start);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduce]);

  const approve = () => {
    if (phase === APPROVAL_STEP) {
      setPhase(APPROVAL_STEP + 1);
      setRunning(true);
    }
  };

  const status =
    phase === 0 ? (primed ? "Your example is loaded. Run the preview when you are ready." : "Pick a mission, then run the preview.") :
    phase === APPROVAL_STEP ? "Waiting for your approval. SAM always stops here." :
    phase >= 6 ? "Mission complete. That is the whole loop." :
    "SAM is working the mission\u2026";

  return (
    <div className="demo">
      <div className="demo-pick" role="group" aria-label="Choose an example mission">
        {MISSIONS.map((m, i) => (
          <button
            key={m.id}
            type="button"
            className="demo-choice"
            aria-pressed={missionId === m.id}
            onClick={() => pick(m.id)}
          >
            <span className="demo-choice-num mono">0{i + 1}</span>
            {m.label}
          </button>
        ))}
      </div>

      <div className="demo-stage">
        <div className="demo-stage-head">
          <span className="pill"><span className="orb" /> Interactive preview</span>
          <span className="demo-status" role="status" aria-live="polite">{status}</span>
        </div>

        <ol className="demo-steps">
          {mission.steps.map((s, i) => {
            const n = i + 1;
            const state = phase >= 6 || n < phase ? "done" : n === phase ? "active" : "todo";
            const isApproval = n === APPROVAL_STEP;
            return (
              <li key={s.title} className={`demo-step demo-step--${state}${isApproval ? " demo-step--approval" : ""}`}>
                <span className="demo-step-dot mono" aria-hidden="true">
                  {state === "done" ? "\u2713" : n}
                </span>
                <div>
                  <h3>
                    {s.title}
                    {isApproval && state === "active" && <span className="demo-gate-tag">Waiting on you</span>}
                  </h3>
                  <p>{s.text}</p>
                  {isApproval && state === "active" && (
                    <p className="demo-approve">
                      <button type="button" className="btn" onClick={approve}>Approve</button>
                      <span className="small dim" style={{ color: "#D9C39A" }}>In real life this tap is yours alone. SAM waits.</span>
                    </p>
                  )}
                  {isApproval && state === "done" && (
                    <p className="demo-approved mono">APPROVED BY YOU, IN THE PREVIEW</p>
                  )}
                  {isApproval && state === "done" && (
                    <motion.span
                      className="demo-stamp"
                      aria-hidden="true"
                      initial={reduce ? false : { opacity: 0, scale: 1.6, rotate: -8 }}
                      animate={{ opacity: 1, scale: 1, rotate: -8 }}
                      transition={{ duration: 0.28, ease: [0.2, 2.2, 0.4, 1] }}
                    >
                      Approved
                    </motion.span>
                  )}
                </div>
              </li>
            );
          })}
        </ol>

        {phase >= 6 && (
          <motion.div
            className="demo-result"
            initial={reduce ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          >
            <h3>{mission.result.title}</h3>
            <dl>
              {mission.result.rows.map(([k, v]) => (
                <div key={k} className="demo-result-row">
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          </motion.div>
        )}

        <div className="demo-controls">
          {phase === 0 || phase >= 6 ? (
            <button type="button" className="btn" onClick={run}>
              {phase >= 6 ? "Run it again" : "Run the preview"}
            </button>
          ) : (
            <button type="button" className="btn ghost demo-stop" onClick={() => { clear(); setPhase(0); setRunning(false); setPrimed(false); }}>
              Start over
            </button>
          )}
          <span className="small" style={{ color: "#D9C39A" }}>
            A simulation with made-up example records. No real account, no real actions.
          </span>
        </div>
      </div>
    </div>
  );
}
