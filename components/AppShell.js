"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { api, setSession } from "../lib/api";
import { ThemeSwitch } from "./AppBar";
import { Wordmark } from "./Mark";

// Dock icons: one family (Dip's mockup, 2026-11-16). A single line
// style for all five rooms: same viewBox, same stroke weight, round
// caps and joins, drawn in currentColor so the dock's cream carries
// every room the same way.
function DockIcon({ children, size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}
const IconControl = () => (
  <DockIcon>
    <circle cx="12" cy="12" r="8.2" />
    <circle cx="12" cy="12" r="3.6" />
  </DockIcon>
);
const IconMissions = () => (
  <DockIcon>
    <path d="M12 3.5 L13.9 10.1 L20.5 12 L13.9 13.9 L12 20.5 L10.1 13.9 L3.5 12 L10.1 10.1 Z" />
  </DockIcon>
);
const IconTalk = ({ size = 26 }) => (
  <DockIcon size={size}>
    <path d="M20.5 11.6 a8.4 8.4 0 0 1 -8.4 8.3 c-1.2 0 -2.4 -.3 -3.4 -.8 L3.5 20.5 l1.5 -4.9 a8.3 8.3 0 0 1 -1.3 -4 A8.4 8.4 0 0 1 12 3.4 a8.4 8.4 0 0 1 8.5 8.2 Z" />
  </DockIcon>
);
const IconApprovals = () => (
  <DockIcon>
    <rect x="4" y="4" width="16" height="16" rx="4" />
    <polyline points="8.4 12.4 11 15 15.6 9.8" />
  </DockIcon>
);
const IconSettings = () => (
  <DockIcon>
    <circle cx="12" cy="12" r="3.1" />
    <g strokeWidth="3">
      <line x1="12" y1="3.4" x2="12" y2="6" />
      <line x1="12" y1="18" x2="12" y2="20.6" />
      <line x1="3.4" y1="12" x2="6" y2="12" />
      <line x1="18" y1="12" x2="20.6" y2="12" />
      <line x1="5.9" y1="5.9" x2="7.8" y2="7.8" />
      <line x1="16.2" y1="16.2" x2="18.1" y2="18.1" />
      <line x1="18.1" y1="5.9" x2="16.2" y2="7.8" />
      <line x1="7.8" y1="16.2" x2="5.9" y2="18.1" />
    </g>
  </DockIcon>
);

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
    <div className={"shell" + (onChat ? " on-chat" : "")}>
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
      </div>

      <main className="shell-main">{children}</main>

      <nav className="dock" aria-label="Main rooms">
        <Link href="/app" className={"dock-item" + (pathname === "/app" ? " active" : "")}>
          <span className="dock-glyph" aria-hidden="true"><IconControl /></span>
          <span className="dock-label">Control</span>
        </Link>
        <Link href="/app#missions" className="dock-item">
          <span className="dock-glyph" aria-hidden="true"><IconMissions /></span>
          <span className="dock-label">Missions</span>
        </Link>
        <button type="button" className="dock-talk" onClick={talk} disabled={talkBusy} aria-label="Talk to SAM, start a new mission">
          <span className="dock-talk-glyph" aria-hidden="true"><IconTalk /></span>
          <span className="dock-talk-label">Talk</span>
        </button>
        <Link href="/app#approvals" className="dock-item">
          <span className="dock-glyph" aria-hidden="true"><IconApprovals /></span>
          <span className="dock-label">Approvals</span>
        </Link>
        <Link href="/app/settings" className={"dock-item" + (pathname === "/app/settings" ? " active" : "")}>
          <span className="dock-glyph" aria-hidden="true"><IconSettings /></span>
          <span className="dock-label">Settings</span>
        </Link>
      </nav>
    </div>
  );
}
