"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, getSession, setSession } from "../../../lib/api";
import { ThemeSwitch } from "../../../components/AppBar";
import AppShell from "../../../components/AppShell";
import OpeningState from "../../../components/OpeningState";

// Mirror of the member door's MINIMAX_MODELS list (sam repo,
// src/members.ts): the current MiniMax chat models, picked from a
// dropdown, never typed. The door validates against the same list.
const MINIMAX_MODELS = ["MiniMax-M2.5", "MiniMax-M2.5-highspeed", "MiniMax-M3", "MiniMax-M3.1-Flash", "MiniMax-M2.7", "MiniMax-M2.7-highspeed"];

export default function SettingsPage() {
  const router = useRouter();
  const [member, setMember] = useState(null);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [kind, setKind] = useState("minimax");
  const [apiKey, setApiKey] = useState("");
  const [endpoint, setEndpoint] = useState("");
  const [model, setModel] = useState("");
  const [tokens, setTokens] = useState([]);
  const [tokenName, setTokenName] = useState("");
  const [freshToken, setFreshToken] = useState("");
  const [dev, setDev] = useState(null);
  const [busy, setBusy] = useState("");

  const load = useCallback(async () => {
    const me = await api("me");
    setMember(me.member);
    if (me.member.provider) { setKind(me.member.provider.kind); setModel(me.member.provider.model || ""); }
    const t = await api("me/api-tokens");
    setTokens(t.tokens);
    const d = await api("developer");
    setDev(d);
  }, []);

  useEffect(() => {
    if (!getSession()) { router.replace("/login"); return; }
    load().catch((err) => {
      if (err.status === 401) router.replace("/login");
      else setError(err.message || "Something went wrong.");
    });
  }, [load, router]);

  async function saveKey(e) {
    e.preventDefault();
    setBusy("key"); setError(""); setNote("");
    try {
      const body = { apiKey, kind };
      if (kind === "custom") { body.endpoint = endpoint; body.model = model; }
      else { body.model = MINIMAX_MODELS.includes(model) ? model : "MiniMax-M2.5"; }
      const res = await api("me/key", { method: "POST", body });
      setMember(res.member);
      setApiKey("");
      setNote("Your key is saved in the vault. SAM can think now.");
    } catch (err) { setError(err.message); }
    setBusy("");
  }

  async function removeKey() {
    setBusy("key"); setError("");
    try {
      const res = await api("me/key", { method: "DELETE" });
      setMember(res.member);
      setNote("Your key was removed. SAM cannot think until a key is connected again.");
    } catch (err) { setError(err.message); }
    setBusy("");
  }

  async function chooseSource(source) {
    setBusy("source"); setError(""); setNote("");
    try {
      const res = await api("me/key-source", { method: "POST", body: { source } });
      setMember(res.member);
    } catch (err) { setError(err.message); }
    setBusy("");
  }

  async function mintToken(e) {
    e.preventDefault();
    setBusy("token"); setError("");
    try {
      const res = await api("me/api-tokens", { method: "POST", body: { name: tokenName } });
      setFreshToken(res.token);
      setTokenName("");
      const t = await api("me/api-tokens");
      setTokens(t.tokens);
    } catch (err) { setError(err.message); }
    setBusy("");
  }

  async function revokeToken(id) {
    setBusy(id); setError("");
    try {
      await api("me/api-tokens/" + id, { method: "DELETE" });
      const t = await api("me/api-tokens");
      setTokens(t.tokens);
    } catch (err) { setError(err.message); }
    setBusy("");
  }

  // Sign out lives here now (Dip's header slimming, 2026-11-16):
  // the header keeps the mark and the duty light, and leaving the
  // app is a Settings act, one dock tap away.
  async function signOut() {
    try { await api("auth/sign-out", { method: "POST", body: {} }); } catch { /* the token dies locally either way */ }
    setSession("");
    router.replace("/login");
  }

  if (!member) {
    return <OpeningState label="Opening Settings..." error={error} />;
  }

  return (
    <AppShell email={member.email}>
      <div className="wrap" style={{ maxWidth: 860 }}>
        <h1 className="display" style={{ fontSize: 38, marginTop: 22 }}>Settings</h1>
        <p className="dim">Signed in as {member.email}. Your key, your tokens, your room style.</p>
        {error && <div className="notice err">{error}</div>}
        {note && <div className="notice">{note}</div>}

        <div className="card" style={{ marginBottom: 20 }}>
          <div className="eyebrow">SAM's key</div>
          <h3>{member.hasKey ? "Your key is connected." : "SAM needs a key to think."}</h3>
          <p className="dim">
            SAM thinks with an AI key, the way a car runs on its own key. Yours is kept in a locked vault,
            it is never shown back to anyone (not even you, once saved), and it is spent only on your missions.
            {member.provider && <> Connected now: {member.provider.kind === "minimax" ? "a MiniMax key" : "a custom provider"}, model <span className="mono">{member.provider.model}</span>.</>}
          </p>
          <div className="field">
            <label>Which power source?</label>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button type="button" className={"btn small-btn" + (member.keySource === "own" ? "" : " ghost")} disabled={busy === "source"} onClick={() => chooseSource("own")}>My own key</button>
              <button type="button" className={"btn small-btn" + (member.keySource === "managed" ? "" : " ghost")} disabled={busy === "source"} onClick={() => chooseSource("managed")}>Run it on SAM's key</button>
            </div>
            {member.keySource === "managed" && !member.managed.enabled && (
              <p className="small dim">Running on SAM's key is not open yet. Pick "My own key" and connect yours below; SAM is ready the moment it lands.</p>
            )}
            {member.keySource === "managed" && member.managed.enabled && (
              <p className="small dim">Today: <span className="mono">{member.managed.turnsUsed}</span> of <span className="mono">{member.managed.maxTurns}</span> turns used.</p>
            )}
          </div>
          {member.keySource === "own" && (
            <form onSubmit={saveKey}>
              <div className="field">
                <label htmlFor="kind">Key kind</label>
                <select id="kind" value={kind} onChange={(e) => setKind(e.target.value)}>
                  <option value="minimax">MiniMax key (the easy path)</option>
                  <option value="custom">Another provider (bring an endpoint)</option>
                </select>
              </div>
              {kind === "minimax" && (
                <p className="small dim">Getting a MiniMax key, step by step: open <span className="mono">platform.minimax.io</span>, sign in, open API Keys, make a key, copy it, and paste it here. That is the whole job.</p>
              )}
              {kind === "custom" && (
                <>
                  <div className="field">
                    <label htmlFor="endpoint">Provider endpoint (chat completions address)</label>
                    <input id="endpoint" value={endpoint} onChange={(e) => setEndpoint(e.target.value)} placeholder="https://your-provider.example/v1/chat/completions" />
                  </div>
                  <div className="field">
                    <label htmlFor="model2">Model name</label>
                    <input id="model2" value={model} onChange={(e) => setModel(e.target.value)} placeholder="model-name" />
                  </div>
                </>
              )}
              {kind === "minimax" && (
                <div className="field">
                  <label htmlFor="model">Which MiniMax model should SAM think with?</label>
                  <select id="model" value={MINIMAX_MODELS.includes(model) ? model : "MiniMax-M2.5"} onChange={(e) => setModel(e.target.value)}>
                    {MINIMAX_MODELS.map((m) => (
                      <option key={m} value={m}>{m === "MiniMax-M2.5" ? "MiniMax-M2.5 (the standard one)" : m}</option>
                    ))}
                  </select>
                  <p className="small dim">Pick the model your key runs. MiniMax-M2.5 is the standard one, and it is already picked for you.</p>
                </div>
              )}
              <div className="field">
                <label htmlFor="key">Your key</label>
                <input id="key" type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} autoComplete="off" placeholder="Paste your key here" required />
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button className="btn" type="submit" disabled={busy === "key" || !apiKey}>{member.hasKey ? "Replace my key" : "Save my key"}</button>
                {member.hasKey && <button className="btn danger" type="button" disabled={busy === "key"} onClick={removeKey}>Remove my key</button>}
              </div>
            </form>
          )}
        </div>

        <div className="card" style={{ marginBottom: 20 }}>
          <div className="eyebrow">Room style</div>
          <h3>Make it as groovy as you want.</h3>
          <p className="dim">It starts serious, in Command. The other rooms are the same SAM in a different mood, and the choice is remembered on this device.</p>
          <ThemeSwitch />
        </div>

        <div className="card" style={{ marginBottom: 20 }}>
          <div className="eyebrow">For developers</div>
          <h3>API tokens</h3>
          <p className="dim">A token lets your own scripts talk to your SAM. It carries exactly your account's reach, nothing more. A token is shown once, when it is made; keep it like a key.</p>
          {freshToken && (
            <div className="notice">
              Your new token (copy it now, it is not shown again):<br />
              <span className="mono" style={{ wordBreak: "break-all" }}>{freshToken}</span>
            </div>
          )}
          <form onSubmit={mintToken} style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
            <input value={tokenName} onChange={(e) => setTokenName(e.target.value)} placeholder="Name it (like: my laptop script)" style={{ flex: 1, minWidth: 220, minHeight: 48, padding: "10px 14px", borderRadius: 10, border: "1px solid var(--line)", background: "var(--panel-2)", color: "var(--tx)", font: "inherit" }} />
            <button className="btn" type="submit" disabled={busy === "token"}>Make a token</button>
          </form>
          {tokens.length === 0 && <p className="dim" style={{ marginBottom: 0 }}>No tokens yet.</p>}
          <ul className="list">
            {tokens.map((t) => (
              <li key={t.id} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ flex: 1 }}><strong>{t.name}</strong> <span className="dim small">made {new Date(t.createdAt).toLocaleDateString()}</span></span>
                <button className="btn danger small-btn" disabled={busy === t.id} onClick={() => revokeToken(t.id)}>Revoke</button>
              </li>
            ))}
          </ul>
          {dev && (
            <div style={{ marginTop: 16 }}>
              <div className="eyebrow">The command line</div>
              <p className="dim small">The full SAM command line drives the same engine this app does:</p>
              <p className="mono small cmd-line">{dev.cli.install}</p>
              <p className="dim small">{dev.api.note} {dev.logs.note}</p>
            </div>
          )}
        </div>

        <div className="card" style={{ marginBottom: 20 }}>
          <div className="eyebrow">Leaving</div>
          <h3>Sign out of SAM</h3>
          <p className="dim">Signs this device out. Your SAM, your chats, and your key stay right where they are.</p>
          <button className="btn ghost" type="button" onClick={signOut}>Sign out</button>
        </div>
      </div>
    </AppShell>
  );
}
