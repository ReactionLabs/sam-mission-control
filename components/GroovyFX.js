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
//
// The Place pass (2026-11-16): the stack is choreographed as ONE
// composition the visitor travels through, not a pattern that
// restarts per section. Scene states (CSS, keyed off data-scene)
// drift the disc and wave set outward and settle the field into deep
// plum at the demo, bring full color back at the moods, and warm
// into the finale. On top of that, ambient props (coupe, dossier,
// bubbles, glints) cross the viewport inside their own slices of the
// scroll journey, GSAP-scrubbed below.

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

function Sparkle({ style, className }) {
  return (
    <svg className={className || "psy-spark"} style={style} viewBox="0 0 40 40" aria-hidden="true" focusable="false">
      <path d="M20 1 L24 16 L39 20 L24 24 L20 39 L16 24 L1 20 L16 16 Z" fill="currentColor" />
    </svg>
  );
}

// Ambient traveling props (Dip's Starry steer, 2026-11-16): pieces of
// SAM's world that cross the journey over section boundaries. One of
// them, the coupe, is a persistent traveler on the whole descent;
// the rest cross inside their own scroll-depth slices, leaking in
// and out half-cropped at the viewport edges, so crossings feel
// found, not programmed. Atmosphere only: they live in the fixed
// background stack behind all content (so cards and headlines cover
// them and they re-emerge, the layering doing the interleaving),
// pointer-events none, base opacity 0 (GSAP poses them; no GSAP, no
// props), and the whole layer is display:none under reduced motion.
// The grand tourer (redrawn 2026-11-16 after Dip rejected the old
// coupe as a blob): an original 1960s GT profile, long hood,
// fastback roofline flowing into a short deck, low and planted.
// Wheel arches are arcs on the wheel centers (r35 around r27
// wheels at cy 133, ground line 160), so the wheels sit in their
// arches instead of floating near them. The same art is the
// finale's parked car (page.js) and the journey's traveler.
function GrandTourer() {
  const wheel = (cx) => (
    <g key={cx}>
      <circle cx={cx} cy="127" r="33" fill="#0B0612" stroke="rgba(255,243,214,.28)" strokeWidth="1.5" />
      <circle cx={cx} cy="127" r="18" fill="none" stroke="#C9973F" strokeWidth="3.5" />
      {[0, 60, 120].map((a) => (
        <line
          key={a}
          x1={cx - 15.5 * Math.cos((a * Math.PI) / 180)} y1={127 - 15.5 * Math.sin((a * Math.PI) / 180)}
          x2={cx + 15.5 * Math.cos((a * Math.PI) / 180)} y2={127 + 15.5 * Math.sin((a * Math.PI) / 180)}
          stroke="#C9973F" strokeWidth="2"
        />
      ))}
      <circle cx={cx} cy="127" r="5" fill="#C9973F" />
    </g>
  );
  return (
    <svg viewBox="0 0 640 190" aria-hidden="true" focusable="false">
      <ellipse cx="325" cy="163" rx="285" ry="7" fill="rgba(10,2,18,.45)" />
      <path
        d="M38 148 C34 136 36 120 46 112 C60 103 82 97 106 94 C160 76 230 54 292 50 C318 48 338 50 356 55 C392 63 420 76 440 90 C495 95 555 98 592 103 C608 106 616 114 614 126 C612 138 606 146 596 149 L509 150 A41 41 0 0 1 441 150 L189 150 A41 41 0 0 1 121 150 Z"
        fill="#170A28"
      />
      <path
        d="M138 88 C182 68 242 55 298 54 C326 54 346 57 364 62 C394 70 416 80 432 91 C342 83 232 83 138 88 Z"
        fill="#F5E663" opacity=".85"
      />
      <path d="M310 54 L324 55 L332 84 L318 84 Z" fill="#170A28" />
      <path
        d="M46 112 C60 103 82 97 106 94 C160 76 230 54 292 50 C318 48 338 50 356 55 C392 63 420 76 440 90 C495 95 555 98 592 103 C608 106 616 114 614 126"
        fill="none" stroke="rgba(240,127,60,.55)" strokeWidth="2.5" strokeLinecap="round"
      />
      {wheel(155)}
      {wheel(475)}
    </svg>
  );
}

function PropCar() {
  return <GrandTourer />;
}

function PropBubbles() {
  return (
    <svg viewBox="0 0 90 150" aria-hidden="true" focusable="false">
      <circle cx="45" cy="118" r="17" fill="#E86C25" opacity=".85" />
      <circle cx="30" cy="82" r="11" fill="#D5AC40" opacity=".85" />
      <circle cx="56" cy="52" r="13" fill="#FF3EA5" opacity=".7" />
      <circle cx="38" cy="22" r="7" fill="#E86C25" opacity=".8" />
    </svg>
  );
}

function Props() {
  return (
    <div className="psy-props">
      <div className="prop prop--glint"><img src="/swirl-disc.webp" alt="" /></div>
      <div className="prop prop--coupe"><PropCar /></div>
      <div className="prop prop--dossier">
        <div className="prop-folder">
          <span className="prop-folder-tab" />
          <span className="prop-stamp">Filed</span>
        </div>
      </div>
      <div className="prop prop--bubbles"><PropBubbles /></div>
      <Sparkle className="prop prop--spark-a" />
      <Sparkle className="prop prop--spark-b" />
    </div>
  );
}

export default function GroovyFX() {
  const ref = useRef(null);

  useEffect(() => {
    const root = ref.current?.closest(".groovy");
    if (!root) return undefined;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Stagger: children of a card group arrive in sequence instead of
    // all at once. The delay is cleared once the reveal lands, so it
    // never taxes the hover transitions on the same elements.
    root.querySelectorAll(".g-feats, .g-steps, .g-folders, .g-paths").forEach((group) => {
      group.querySelectorAll("[data-reveal]").forEach((el, i) => {
        el.style.transitionDelay = `${Math.min(i, 5) * 80}ms`;
      });
    });

    // Reveal-on-scroll for content blocks.
    const revealIO = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            revealIO.unobserve(e.target);
            window.setTimeout(() => { e.target.style.transitionDelay = ""; }, 1000);
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

    // GSAP ScrollTrigger (Dip: "GSAP and Framer Motion", 2026-11-16):
    // scroll position itself turns the pinwheel disc and drifts the
    // wave bands sideways, scrubbed, transforms only. GSAP is loaded
    // lazily so only this page pays for it; it writes the transform
    // property, which composes with (never clobbers) the CSS
    // translate/rotate properties the parallax and spin already use.
    // If the load fails, the CSS machine above still carries the page.
    let gsapCtx = null;
    let cancelled = false;
    (async () => {
      try {
        const gsapMod = await import("gsap");
        const stMod = await import("gsap/ScrollTrigger");
        if (cancelled) return;
        const gsap = gsapMod.gsap || gsapMod.default || gsapMod;
        gsap.registerPlugin(stMod.ScrollTrigger);
        gsapCtx = gsap.context(() => {
          const st = { trigger: root, start: "top top", end: "bottom bottom", scrub: 1.1 };
          gsap.to(".psy-disc", { rotation: 150, ease: "none", scrollTrigger: st });
          gsap.to(".psy-waves--back", { x: -34, ease: "none", scrollTrigger: st });
          gsap.to(".psy-waves--mid", { x: 44, ease: "none", scrollTrigger: st });
          gsap.to(".psy-waves--front", { x: -58, ease: "none", scrollTrigger: st });

          // Traveling props (Starry mechanics, distilled 2026-11-16):
          // every prop's motion is a pure function of scroll depth,
          // scrubbed and fully reversible, with no idle animation.
          // Props leak in and out HALF-CROPPED at the viewport edges;
          // any fade is confined to the edge crossing itself, so
          // nothing ever pops into existence mid-screen.
          const max = () => Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
          // Edge-leak crossing: fully out -> half-cropped at the edge
          // (fade completes here) -> across -> half-cropped at the far
          // edge -> fully out. from/to are the half-cropped poses;
          // outFrom/outTo push one element-width further out.
          const prop = (sel, a, b, from, to, outFrom, outTo, peak = 0.9) => {
            const el = root.querySelector(sel);
            if (!el) return;
            const tl = gsap.timeline({
              scrollTrigger: {
                start: () => max() * a,
                end: () => max() * b,
                scrub: 1,
                invalidateOnRefresh: true,
              },
            });
            tl.fromTo(el, { ...outFrom, opacity: 0 }, { ...from, opacity: peak, ease: "none", duration: 0.1 }, 0)
              .to(el, { ...to, ease: "none", duration: 0.8 }, 0.1)
              .to(el, { ...outTo, opacity: 0, ease: "none", duration: 0.1 }, 0.9);
          };
          prop(".prop--glint", 0.03, 0.2,
            { x: "-4vw", y: "8vh", rotation: 0 }, { x: "97vw", y: "27vh", rotation: 260 },
            { x: "-11vw", y: "6vh", rotation: -30 }, { x: "104vw", y: "29vh", rotation: 290 }, 0.75);
          prop(".prop--spark-a", 0.14, 0.38,
            { x: "-3vw", y: "66vh", rotation: 0 }, { x: "98vw", y: "20vh", rotation: 140 },
            { x: "-7vw", y: "69vh", rotation: -25 }, { x: "102vw", y: "17vh", rotation: 165 }, 0.9);
          prop(".prop--dossier", 0.47, 0.72,
            { x: "84vw", y: "-5vh", rotation: -9 }, { x: "58vw", y: "94vh", rotation: 7 },
            { x: "85vw", y: "-13vh", rotation: -12 }, { x: "57vw", y: "102vh", rotation: 10 }, 0.95);
          prop(".prop--bubbles", 0.6, 0.86,
            { x: "10vw", y: "7vh" }, { x: "22vw", y: "-88vh" },
            { x: "9vw", y: "15vh" }, { x: "23vw", y: "-96vh" }, 0.85);
          prop(".prop--spark-b", 0.66, 0.93,
            { x: "98vw", y: "22vh", rotation: 0 }, { x: "-3vw", y: "55vh", rotation: -160 },
            { x: "102vw", y: "19vh", rotation: 25 }, { x: "-7vw", y: "58vh", rotation: -185 }, 0.9);

          // THE persistent traveler: one coupe, the whole descent.
          // It belongs to no section. It drives the hero floor, slips
          // behind the demo panel and is covered by it, re-emerges,
          // gets covered by cards and headlines again on the way
          // down, grows as it heads home toward the finale (where the
          // in-scene car waits in front of the panel), slides behind
          // that panel, and slips out at the end to park, small, at
          // the footer. One scrubbed timeline, start to end of page.
          const coupe = root.querySelector(".prop--coupe");
          if (coupe) {
            const drive = gsap.timeline({
              scrollTrigger: { start: 0, end: () => max(), scrub: 1, invalidateOnRefresh: true },
            });
            const leg = (at, dur, vars) => drive.to(coupe, { ease: "none", duration: dur, ...vars }, at);
            drive.fromTo(coupe,
              { x: "-6vw", y: "76vh", scale: 0.55, rotation: 0, opacity: 0.9 },
              { x: "52vw", y: "74vh", scale: 0.52, rotation: -1, ease: "none", duration: 0.1 }, 0);
            leg(0.1, 0.1, { x: "97vw", y: "66vh", scale: 0.44, rotation: -3 });
            leg(0.2, 0.12, { x: "30vw", y: "58vh", scale: 0.4, rotation: 2 });
            leg(0.32, 0.13, { x: "-13vw", y: "62vh", scale: 0.46, rotation: -4 });
            // Parked offscreen 0.45-0.52: the same car is passing in
            // FRONT of the page on the foreground layer (below), big
            // and low. One car, one place at a time.
            leg(0.45, 0.07, { x: "-13vw", y: "64vh", scale: 0.46, rotation: -4 });
            leg(0.52, 0.1, { x: "58vw", y: "70vh", scale: 0.38, rotation: 3 });
            leg(0.62, 0.1, { x: "97vw", y: "60vh", scale: 0.42, rotation: -2 });
            leg(0.72, 0.13, { x: "38vw", y: "68vh", scale: 0.55, rotation: 0 });
            leg(0.85, 0.09, { x: "40vw", y: "74vh", scale: 0.62, rotation: 0 });
            leg(0.94, 0.06, { x: "6vw", y: "82vh", scale: 0.34, rotation: -2 });
          }

          // The foreground pass: once, during the how-it-works
          // stretch, the coupe leaves the background and drives
          // across the front of the page, low and half-cropped by
          // the viewport's bottom edge, like a car passing the
          // camera. Pure scroll function, like everything else here.
          const fg = root.querySelector(".fg-coupe");
          if (fg) {
            const pass = gsap.timeline({
              scrollTrigger: {
                start: () => max() * 0.44,
                end: () => max() * 0.52,
                scrub: 1,
                invalidateOnRefresh: true,
              },
            });
            pass.fromTo(fg, { x: "-24vw", opacity: 0 }, { x: "106vw", ease: "none", duration: 1 }, 0)
              .to(fg, { opacity: 1, duration: 0.05, ease: "none" }, 0.02)
              .to(fg, { opacity: 0, duration: 0.05, ease: "none" }, 0.95);
          }
        }, root);
      } catch { /* the CSS parallax remains the fallback */ }
    })();

    return () => {
      cancelled = true;
      if (gsapCtx) gsapCtx.revert();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      revealIO.disconnect();
      sceneIO.disconnect();
    };
  }, []);

  return (
    <>
    <div className="groovy-fg" aria-hidden="true">
      <div className="fg-coupe"><GrandTourer /></div>
    </div>
    <div className="psy" ref={ref} aria-hidden="true">
      <div className="psy-field" />
      <div className="psy-disc-drift"><div className="psy-disc" /></div>
      <div className="psy-rings psy-rings--a" />
      <div className="psy-rings psy-rings--b" />
      <div className="psy-waveset">
        <WaveBand className="psy-waves psy-waves--back" fill="#FF3EA5" opacity={0.34} />
        <WaveBand className="psy-waves psy-waves--mid" fill="#E86C25" opacity={0.5} flip />
        <WaveBand className="psy-waves psy-waves--front" fill="#392348" opacity={0.85} />
      </div>
      <Props />
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
    </>
  );
}
