"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { api, setSession } from "../lib/api";
import { ThemeSwitch } from "./AppBar";
import { Wordmark } from "./Mark";

// The app shell (Dip's order, 2026-11-16): a sidebar is the spine on
// desktop; on mobile a groovy console bar rides the bottom. The rooms
// listed are the ones that exist today: Mission Control is its own
// page, Missions / Approvals / Intel Feed / Memory Vault / Tools are
// rooms on the Mission Control page itself (anchored sections), and
// Settings is its own page. Operatives is not a member surface yet,
// so it is not listed; a dead link would be a lie.
const ROOMS = [
  { href: "/app", label: "Mission Control", flavor: "The Briefing Room", match: (p) => p === "/app" },
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

        <button type="button" className="btn side-talk" onClick={talk} disabled={talkBusy}>
          Talk to SAM
        </button>

        <nav className="side-nav">
          {ROOMS.map((r) => {
            const active = r.match(pathname || "");
            return (
              <Link key={r.href} href={r.href} className={"side-room" + (active ? " active" : "")}
                aria-current={active ? "page" : undefined}>
                <span className="side-room-label">{r.label}</span>
                <span className="side-room-flavor">{r.flavor}</span>
              </Link>
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

      <main className="shell-main">{children}</main>

      <nav className="dock" aria-label="Main rooms">
        <Link href="/app" className={"dock-item" + (pathname === "/app" ? " active" : "")}>
          <span className="dock-glyph" aria-hidden="true">◎</span>
          <span className="dock-label">Control</span>
        </Link>
        <Link href="/app#missions" className="dock-item">
          <span className="dock-glyph" aria-hidden="true">✦</span>
          <span className="dock-label">Missions</span>
        </Link>
        <button type="button" className="dock-talk" onClick={talk} disabled={talkBusy} aria-label="Talk to SAM, start a new mission">
          <span className="dock-talk-glyph" aria-hidden="true">✆</span>
          <span className="dock-talk-label">Talk</span>
        </button>
        <Link href="/app#approvals" className="dock-item">
          <span className="dock-glyph" aria-hidden="true">✓</span>
          <span className="dock-label">Approvals</span>
        </Link>
        <Link href="/app/settings" className={"dock-item" + (pathname === "/app/settings" ? " active" : "")}>
          <span className="dock-glyph" aria-hidden="true">⚙</span>
          <span className="dock-label">Settings</span>
        </Link>
      </nav>
    </div>
  );
}
