"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";

// The hero entrance (Dip: "GSAP and Framer Motion", 2026-11-16).
// Motion owns the transforms here; the old CSS hero-in keyframes are
// retired so the two systems never fight over the same elements.
// Choreography: the duty pill pops first, the SAM letters settle in
// one by one on springs, the words follow in a stagger, the room art
// rises, and the sample card pops last. prefers-reduced-motion
// renders everything at rest: initial={false}, no movement at all.

const copyVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.2, 0.8, 0.2, 1] } },
};
const pillVariants = {
  hidden: { opacity: 0, scale: 0.5 },
  show: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 320, damping: 15 } },
};
const samVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.12 } },
};
const letterVariants = {
  hidden: { opacity: 0, y: 64, rotate: -5 },
  show: { opacity: 1, y: 0, rotate: 0, transition: { type: "spring", stiffness: 300, damping: 19 } },
};

function LavaLamp() {
  return (
    <svg className="g-lamp" viewBox="0 0 60 112" aria-hidden="true" focusable="false">
      <rect x="23" y="6" width="14" height="8" rx="2" fill="#C9973F" />
      <path d="M22 92 L27.5 16 Q30 9 32.5 16 L38 92 Z" fill="#FF3EA5" opacity=".88" />
      <circle cx="30" cy="70" r="6.5" fill="#E86C25" />
      <circle cx="31" cy="46" r="4.4" fill="#D5AC40" />
      <circle cx="29" cy="28" r="2.8" fill="#E86C25" />
      <ellipse cx="30" cy="86" rx="5.4" ry="3.4" fill="#D5AC40" />
      <path d="M16 106 L44 106 L39 92 L21 92 Z" fill="#392348" stroke="#C9973F" strokeWidth="1.6" />
    </svg>
  );
}

export default function HeroSection() {
  const reduce = useReducedMotion();
  const initial = reduce ? false : "hidden";

  return (
    <section className="g-hero" data-scene="hero">
      <div className="wrap">
        <div className="g-hero-grid">
          <motion.div className="g-hero-copy" variants={copyVariants} initial={initial} animate="show">
            <motion.span className="g-readout" variants={pillVariants}>
              <span className="orb" /> SAM IS ON DUTY
            </motion.span>
            <motion.div className="g-sam" aria-hidden="true" variants={samVariants}>
              {"SAM".split("").map((ch, i) => (
                <motion.span key={i} className="g-sam-letter" variants={letterVariants}>{ch}</motion.span>
              ))}
            </motion.div>
            <motion.h1 variants={fadeUp}>The AI Assistant for the Rest of Us.</motion.h1>
            <motion.p className="sub" variants={fadeUp}>
              SAM is a secret agent for your business. Tell him what needs doing, in plain
              words, and he gets to work: sorting inquiries, drafting follow-ups, keeping
              your missions moving. Before anything big happens, he asks your approval.
            </motion.p>
            <motion.p className="g-hero-ctas" variants={fadeUp}>
              <Link href="/signup" className="btn">Get Started Free</Link>
              <a href="#demo" className="btn ghost" style={{ color: "#FFF3D6", borderColor: "#C9973F" }}>Watch SAM in Action</a>
            </motion.p>
            <motion.p className="small fineprint" variants={fadeUp}>
              Free to start with your own AI key. No card to sign up.
            </motion.p>
          </motion.div>

          <motion.div
            className="g-hero-art"
            initial={reduce ? false : { opacity: 0, y: 56 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <LavaLamp />
            <div className="g-hero-frame">
              <img src="/hero.jpg" alt="SAM headquarters: a 1967 mission control room, imagined the way 1967 thought the future would look" fetchPriority="high" />
            </div>
            <motion.div
              className="g-herocard"
              initial={reduce ? false : { opacity: 0, scale: 0.82, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: 0.85, type: "spring", stiffness: 260, damping: 17 }}
            >
              <div className="hc-eyebrow">Mission Control, sample screen</div>
              <h3>This morning at headquarters</h3>
              <ul>
                <li><span className="dot" style={{ background: "#2E9E63" }} /> 3 new inquiries, sorted and waiting</li>
                <li><span className="dot" style={{ background: "#E8A33D" }} /> 1 quote approval, needs your tap</li>
                <li><span className="dot" style={{ background: "#392348" }} /> 2 missions finished yesterday</li>
              </ul>
              <p className="hc-note">A sample of the home screen. Yours fills with your real work.</p>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
