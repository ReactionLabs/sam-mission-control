"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import Mark from "./Mark";

// "One Machine. Three Moods." One shared interface, three visual
// token sets. Switching the preview changes only the dress: the
// layout, the words, and the work are identical in every room, which
// is the truth about SAM's themes. The Approve button inside the
// preview stamps the preview card, and nothing else anywhere.

const THEMES = [
  { id: "headquarters", name: "Headquarters", line: "The classic command center." },
  { id: "discotheque", name: "Discoth\u00e8que", line: "After-hours energy, same mission." },
  { id: "swirl", name: "Swirl Light", line: "Bright, clean, and far out." },
];

export default function ThemePreview() {
  const reduce = useReducedMotion();
  const [theme, setTheme] = useState("headquarters");
  const [stamped, setStamped] = useState(false);

  const pick = (id) => {
    setTheme(id);
    setStamped(false);
  };

  return (
    <div className="tp-wrap">
      <div className="tp-switch" role="group" aria-label="Choose a theme to preview">
        {THEMES.map((t) => (
          <button
            key={t.id}
            type="button"
            className="tp-btn"
            aria-pressed={theme === t.id}
            onClick={() => pick(t.id)}
          >
            {t.name}
          </button>
        ))}
      </div>

      <div className={`tp tp--${theme}`}>
        <div className="tp-atmo" aria-hidden="true" />
        <motion.div
          key={theme}
          initial={reduce ? false : { opacity: 0.3, rotateY: 7 }}
          animate={{ opacity: 1, rotateY: 0 }}
          transition={{ duration: 0.38, ease: "easeOut" }}
          style={{ transformPerspective: 900 }}
        >
        <div className="tp-bar">
          <span className="tp-brand"><Mark size={26} /> SAM</span>
          <span className="tp-pill"><span className="tp-orb" /> On duty</span>
        </div>
        <div className="tp-body">
          <div className="tp-msg tp-msg--user">What came in today?</div>
          <div className="tp-msg tp-msg--sam">
            Three new inquiries. One quote is ready for your approval, and the rest is filed.
          </div>
          <div className="tp-card">
            <div className="tp-card-eyebrow">Approval requested</div>
            <p>Send the quote follow-up to the example customer?</p>
            <div className="tp-card-actions">
              <button type="button" className="tp-approve" onClick={() => setStamped(true)}>
                Approve
              </button>
              <button type="button" className="tp-notyet" onClick={() => setStamped(false)}>
                Not yet
              </button>
            </div>
            {stamped && <span className="tp-stamp">Approved</span>}
          </div>
          <div className="tp-composer" aria-hidden="true">
            <span>Tell SAM what needs doing{"\u2026"}</span>
            <span className="tp-send">Send</span>
          </div>
        </div>
        </motion.div>
      </div>

      <p className="tp-caption">
        {THEMES.find((t) => t.id === theme).line} Same SAM in every room: the look changes, the work does not.
      </p>
    </div>
  );
}
