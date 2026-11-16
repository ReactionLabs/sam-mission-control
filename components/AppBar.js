"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { THEMES, applyTheme, api, setSession } from "../lib/api";
import { Wordmark } from "./Mark";

export function ThemeSwitch() {
  const [theme, setTheme] = useState("command");
  useEffect(() => {
    setTheme(document.documentElement.dataset.theme || "command");
  }, []);
  return (
    <div className="theme-switch" role="group" aria-label="Choose the room style">
      {THEMES.map((t) => (
        <button key={t.id} type="button" aria-pressed={theme === t.id}
          onClick={() => { applyTheme(t.id); setTheme(t.id); }}>
          {t.name}
        </button>
      ))}
    </div>
  );
}

export default function AppBar({ email }) {
  const router = useRouter();
  const pathname = usePathname();
  async function signOut() {
    try { await api("auth/sign-out", { method: "POST", body: {} }); } catch { /* the token dies locally either way */ }
    setSession("");
    router.replace("/login");
  }
  return (
    <div className="wrap">
      <div className="appbar">
        <Link href="/app" style={{ textDecoration: "none", color: "inherit" }}><Wordmark size={38} /></Link>
        <span className="pill"><span className="orb" /> SAM is on duty</span>
        <div className="spacer">
          <ThemeSwitch />
          {email && <span className="dim small">{email}</span>}
          <Link href="/app" className="btn ghost small-btn" aria-current={pathname === "/app" ? "page" : undefined}>Mission Control</Link>
          <Link href="/app/settings" className="btn ghost small-btn" aria-current={pathname === "/app/settings" ? "page" : undefined}>Settings</Link>
          <button type="button" className="btn ghost small-btn" onClick={signOut}>Sign out</button>
        </div>
      </div>
    </div>
  );
}
