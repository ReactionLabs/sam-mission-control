"use client";

import { useEffect, useRef } from "react";

// Operation Groovy: the layered psychedelic background system.
// One fixed layer stack behind everything (transforms only, no
// background-attachment tricks). A passive scroll listener feeds two
// CSS variables (--psy-y in px, --psy-p as 0..1 progress) through a
// rAF throttle; each layer multiplies them at its own rate, so the
// world drifts at different speeds while content stays put.
// An IntersectionObserver watches [data-scene] sections and crossfades
// the color field between scenes, and a second observer reveals
// [data-reveal] blocks as they arrive. prefers-reduced-motion turns
// the whole machine off: no listener, no animation, static field.

function WaveBand({ className, fill, opacity, flip }) {
  return (
    <svg
      className={className}
      viewBox="0 0 2400 320"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
      style={flip ? { transform: "scaleX(-1)" } : undefined}
    >
      <path
        fill={fill}
        opacity={opacity}
        d="M0,150 C200,70 420,220 700,150 C980,80 1200,230 1480,150 C1760,70 1980,220 2400,140 L2400,320 L0,320 Z"
      />
      <path
        fill={fill}
        opacity={opacity * 0.55}
        d="M0,205 C260,140 520,265 820,205 C1120,145 1360,270 1660,205 C1960,145 2160,250 2400,200 L2400,320 L0,320 Z"
      />
    </svg>
  );
}

function Sparkle({ style }) {
  return (
    <svg className="psy-spark" style={style} viewBox="0 0 40 40" aria-hidden="true" focusable="false">
      <path d="M20 1 L24 16 L39 20 L24 24 L20 39 L16 24 L1 20 L16 16 Z" fill="currentColor" />
    </svg>
  );
}

export default function GroovyFX() {
  const ref = useRef(null);

  useEffect(() => {
    const root = ref.current?.closest(".groovy");
    if (!root) return undefined;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Reveal-on-scroll for content blocks.
    const revealIO = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            revealIO.unobserve(e.target);
          }
        }
      },
      { threshold: 0.12 }
    );
    root.querySelectorAll("[data-reveal]").forEach((el) => revealIO.observe(el));

    // Scene tracking: the section nearest the middle of the viewport
    // names the scene; the color field crossfades to match.
    const sceneIO = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) root.dataset.scene = e.target.dataset.scene;
        }
      },
      { rootMargin: "-42% 0px -42% 0px" }
    );
    root.querySelectorAll("[data-scene]").forEach((el) => sceneIO.observe(el));

    if (reduce) {
      root.querySelectorAll("[data-reveal]").forEach((el) => el.classList.add("in"));
      return () => {
        revealIO.disconnect();
        sceneIO.disconnect();
      };
    }

    // Parallax driver: passive scroll + rAF, writes CSS vars only.
    let ticking = false;
    const update = () => {
      ticking = false;
      const y = window.scrollY || 0;
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      root.style.setProperty("--psy-y", `${Math.round(y)}px`);
      root.style.setProperty("--psy-p", (y / max).toFixed(4));
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(update);
      }
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      revealIO.disconnect();
      sceneIO.disconnect();
    };
  }, []);

  return (
    <div className="psy" ref={ref} aria-hidden="true">
      <div className="psy-field" />
      <div className="psy-disc" />
      <div className="psy-rings psy-rings--a" />
      <div className="psy-rings psy-rings--b" />
      <WaveBand className="psy-waves psy-waves--back" fill="#FF3EA5" opacity={0.34} />
      <WaveBand className="psy-waves psy-waves--mid" fill="#E86C25" opacity={0.5} flip />
      <WaveBand className="psy-waves psy-waves--front" fill="#392348" opacity={0.85} />
      <div className="psy-stars">
        <Sparkle style={{ top: "12%", left: "6%", width: 26, color: "#D5AC40" }} />
        <Sparkle style={{ top: "30%", left: "92%", width: 18, color: "#FFF3D6" }} />
        <Sparkle style={{ top: "58%", left: "3%", width: 16, color: "#FF3EA5" }} />
        <Sparkle style={{ top: "72%", left: "95%", width: 24, color: "#D5AC40" }} />
        <Sparkle style={{ top: "86%", left: "10%", width: 14, color: "#86E29A" }} />
      </div>
      <div className="psy-glow" />
      <div className="psy-grain" />
    </div>
  );
}
