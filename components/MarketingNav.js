"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Wordmark } from "./Mark";

// The marketing header. On desktop the section links ride the bar,
// as they always have. On a phone they used to wrap into a spill
// (Dip's screenshot, 2026-11-16); now the bar carries the brand and
// one Menu button, and the links live in a full-width panel that
// drops under the bar. Tapping a link closes the panel and the
// browser scrolls to the section, the way an anchor always has.
const SECTIONS = [
  { href: "#features", label: "Features" },
  { href: "#how", label: "How It Works" },
  { href: "#owners", label: "For Business Owners" },
  { href: "#pricing", label: "Pricing" },
];

export default function MarketingNav() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open ]);

  return (
    <header className="g-nav">
      <div className="g-nav-in">
        <Wordmark size={42} />
        <nav className="links" aria-label="Marketing">
          {SECTIONS.map((s) => (<a key={s.href} href={s.href}>{s.label}</a>))}
          <Link href="/login" className="btn ghost" style={{ minHeight: 44 }}>Log In</Link>
          <Link href="/signup" className="btn" style={{ minHeight: 44 }}>Get Started</Link>
        </nav>
        <button
          type="button"
          className="g-menu-btn"
          aria-expanded={open}
          aria-controls="g-mobile-menu"
          onClick={() => setOpen((v) => !v)}
        >
          <span className="g-menu-bars" aria-hidden="true"><span /><span /><span /></span>
          {open ? "Close" : "Menu"}
        </button>
      </div>
      <nav id="g-mobile-menu" className={"g-mobile-menu" + (open ? " open" : "")} aria-label="Marketing sections" hidden={!open}>
        {SECTIONS.map((s) => (
          <a key={s.href} href={s.href} className="g-mobile-link" onClick={() => setOpen(false)}>{s.label}</a>
        ))}
        <div className="g-mobile-ctas">
          <Link href="/login" className="btn ghost" onClick={() => setOpen(false)}>Log In</Link>
          <Link href="/signup" className="btn" onClick={() => setOpen(false)}>Get Started</Link>
        </div>
      </nav>
    </header>
  );
}
