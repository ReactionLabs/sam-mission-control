"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "../../lib/api";
import { Wordmark } from "./Mark";

// One form serves both doors: the first link request creates the
// account, later ones just sign in. The door never says which
// happened in a way that teaches strangers anything; we show the
// same calm check-your-email state either way.
export default function AuthForm({ mode }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState("idle"); // idle | sending | sent | sent-nomail
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setError("");
    setState("sending");
    try {
      const res = await api("auth/request-link", { method: "POST", body: { email } });
      setState(res && res.mailDelivered ? "sent" : "sent-nomail");
    } catch (err) {
      setError(err.message || "Something went wrong. Try again.");
      setState("idle");
    }
  }

  return (
    <div className="wrap" style={{ maxWidth: 520, paddingTop: 48, paddingBottom: 64 }}>
      <p><Link href="/" style={{ textDecoration: "none" }}><Wordmark size={44} /></Link></p>
      <h1 className="display" style={{ fontSize: 36, marginTop: 24 }}>
        {mode === "signup" ? "Get your SAM." : "Welcome back."}
      </h1>
      <p className="dim">
        {mode === "signup"
          ? "Type your email and SAM sends you a sign-in link. Click it and your account is open. No password, no forms to fill twice."
          : "Type your email and SAM sends you a fresh sign-in link. It works once and expires in 30 minutes."}
      </p>

      {state === "sent" && (
        <div className="card" style={{ marginTop: 20 }}>
          <div className="eyebrow">Check your email</div>
          <h3>Your link is on its way to {email}.</h3>
          <p className="dim" style={{ marginBottom: 0 }}>Open it on this device and you land right in your Mission Control. Did not arrive? Check the spam folder, then <button type="button" onClick={() => setState("idle")} style={{ background: "none", border: 0, color: "var(--accent-bright)", font: "inherit", cursor: "pointer", padding: 0, textDecoration: "underline" }}>ask for another</button>.</p>
        </div>
      )}
      {state === "sent-nomail" && (
        <div className="notice warn" style={{ marginTop: 20 }}>
          Your account is ready, but the email could not be sent just now. Try again in a little while, and SAM will send a fresh link.
        </div>
      )}
      {state !== "sent" && (
        <form onSubmit={submit} className="card" style={{ marginTop: 20 }}>
          <div className="field">
            <label htmlFor="email">Your email</label>
            <input id="email" type="email" required autoComplete="email" value={email}
              onChange={(e) => setEmail(e.target.value)} placeholder="you@yourbusiness.com" />
          </div>
          {error && <div className="notice err">{error}</div>}
          <button className="btn" type="submit" disabled={state === "sending"} style={{ width: "100%" }}>
            {state === "sending" ? "Sending your link..." : mode === "signup" ? "Send my sign-in link" : "Send my sign-in link"}
          </button>
          <p className="small dim" style={{ marginBottom: 0, marginTop: 12 }}>
            {mode === "signup"
              ? <>Already have an account? <Link href="/login">Log in</Link>.</>
              : <>New here? <Link href="/signup">Get started free</Link>.</>}
          </p>
        </form>
      )}
      <div className="hero-art" style={{ marginTop: 28 }}>
        <img src="/hero.jpg" alt="SAM headquarters" />
      </div>
    </div>
  );
}
