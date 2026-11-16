"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { api, setSession } from "../lib/api";
import { ThemeSwitch } from "./AppBar";
import { Wordmark } from "./Mark";

// Pressed, not clicked (Motion pass, 2026-11-16): sidebar rooms and
// dock items press with weight, the dock TALK button breathes while
// it waits, and page turns inside /app are a quick fade and slide.
// All of it rests under prefers-reduced-motion.
const MotionLink = motion.create(Link);
const pressRoom = { type: "spring", stiffness: 480, damping: 26 };

// The app shell (Dip's order, 2026-11-16): a sidebar is the spine on
// desktop; on mobile a groovy console bar rides the bottom. The rooms
// listed are the ones that exist today: Mission Control is its own
// page, Missions / Approvals / Intel Feed / Memory Vault / Tools are
// rooms on the Mission Control page itself (anchored sections), and
// Settings is its own page. Operatives is not a member surface yet,
// so it is not listed; a dead link would be a lie.
const ROOMS = [
  { href: "/app", label: "Mission Control", flavor: "The Briefing Room", match: (p) => p === "/app" },
  { href: "/app/your-sam", label: "Your Sam", flavor: "Skills, soul, heartbeats", match: (p) => p.startsWith("/app/your-sam") },
  { href: "/app/artifacts", label: "Artifacts", flavor: "Pages and documents SAM made", match: (p) => p.startsWith("/app/artifacts") },
  { href: "/app/files", label: "Files", flavor: "Everything in one place", match: (p) => p === "/app/files" },
  { href: "/app#missions", label: "Missions", flavor: "Work in motion", match: () => false },
  { href: "/app#approvals", label: "Approvals", flavor: "Waiting on you", match: () => false },
  { href: "/app#intel", label: "Intel Feed", flavor: "What SAM has been doing", match: () => false },
  { href: "/app#memory", label: "Memory Vault", flavor: "The filing cabinet", match: () => false },
  { href: "/app#tools", label: "Tools", flavor: "Quartermaster's Desk", match: () => false },
  { href: "/app/settings", label: "Settings", flavor: "Key, tokens, room style", match: (p) => p === "/app/settings" },
];

export default function AppShell({ email, children }) {
  const router = useRouter();
  const pathname = usePathname();
  const reduce = useReducedMotion();
  const [talkBusy, setTalkBusy] = useState(false);

  async function signOut() {
    try { await api("auth/sign-out", { method: "POST", body: {} }); } catch { /* the token dies locally either way */ }
    setSession("");
    router.replace("/login");
  }

  async function talk() {
    if (talkBusy) return;
    setTalkBusy(true);
    try {
      const res = await api("chats", { method: "POST", body: { title: "New mission" } });
      router.push("/app/chat/" + res.chat.id);
    } catch { /* stay here; the page surfaces its own errors */ }
    setTalkBusy(false);
  }

  const onChat = pathname && pathname.startsWith("/app/chat/");

  return (
    <div className="shell">
      <aside className="sidebar" aria-label="Mission Control rooms">
        <Link href="/app" className="side-brand" aria-label="SAM, back to Mission Control">
          <Wordmark size={40} />
        </Link>
        <span className="pill side-duty"><span className="orb" /> SAM is on duty</span>

        <motion.button type="button" className="btn side-talk" onClick={talk} disabled={talkBusy}
          whileTap={reduce ? undefined : { scale: 0.97 }} transition={pressRoom}>
          Talk to SAM
        </motion.button>

        <nav className="side-nav">
          {ROOMS.map((r) => {
            const active = r.match(pathname || "");
            return (
              <MotionLink key={r.href} href={r.href} className={"side-room" + (active ? " active" : "")}
                aria-current={active ? "page" : undefined}
                whileTap={reduce ? undefined : { scale: 0.96 }} transition={pressRoom}>
                <span className="side-room-label">{r.label}</span>
                <span className="side-room-flavor">{r.flavor}</span>
              </MotionLink>
            );
          })}
        </nav>

        <div className="side-themes">
          <div className="eyebrow">Room style</div>
          <ThemeSwitch />
        </div>

        <div className="side-foot">
          {email && <div className="side-email" title={email}>{email}</div>}
          <button type="button" className="btn ghost small-btn" onClick={signOut}>Sign out</button>
        </div>
      </aside>

      <div className="shell-top">
        <Link href="/app" style={{ textDecoration: "none", color: "inherit" }} aria-label="SAM, back to Mission Control">
          <Wordmark size={30} />
        </Link>
        <span className="pill"><span className="orb" /> On duty</span>
        <button type="button" className="btn ghost small-btn" onClick={signOut}>Sign out</button>
      </div>

      <main className="shell-main">
        <motion.div
          key={pathname}
          initial={reduce ? false : { opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
        >
          {children}
        </motion.div>
      </main>

      <nav className="dock" aria-label="Main rooms">
        <MotionLink href="/app" className={"dock-item" + (pathname === "/app" ? " active" : "")}
          whileTap={reduce ? undefined : { scale: 0.92 }} transition={pressRoom}>
          <span className="dock-glyph" aria-hidden="true">◎</span>
          <span className="dock-label">Control</span>
        </MotionLink>
        <MotionLink href="/app#missions" className="dock-item"
          whileTap={reduce ? undefined : { scale: 0.92 }} transition={pressRoom}>
          <span className="dock-glyph" aria-hidden="true">✦</span>
          <span className="dock-label">Missions</span>
        </MotionLink>
        <motion.button type="button" className="dock-talk" onClick={talk} disabled={talkBusy} aria-label="Talk to SAM, start a new mission"
          animate={reduce || talkBusy ? { scale: 1 } : { scale: [1, 1.07, 1] }}
          transition={reduce ? { duration: 0 } : { duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
          whileTap={reduce ? undefined : { scale: 0.88 }}>
          <span className="dock-talk-glyph" aria-hidden="true">✆</span>
          <span className="dock-talk-label">Talk</span>
        </motion.button>
        <MotionLink href="/app#approvals" className="dock-item"
          whileTap={reduce ? undefined : { scale: 0.92 }} transition={pressRoom}>
          <span className="dock-glyph" aria-hidden="true">✓</span>
          <span className="dock-label">Approvals</span>
        </MotionLink>
        <MotionLink href="/app/settings" className={"dock-item" + (pathname === "/app/settings" ? " active" : "")}
          whileTap={reduce ? undefined : { scale: 0.92 }} transition={pressRoom}>
          <span className="dock-glyph" aria-hidden="true">⚙</span>
          <span className="dock-label">Settings</span>
        </MotionLink>
      </nav>
    </div>
  );
}
