"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { api, setSession } from "../../../lib/api";
import { Wordmark } from "../../../components/Mark";

function VerifyInner() {
  const params = useSearchParams();
  const [state, setState] = useState("working");
  const [error, setError] = useState("");

  useEffect(() => {
    const token = params.get("token") || "";
    if (!token) { setState("failed"); setError("That link is missing its key. Ask for a fresh one."); return; }
    let live = true;
    api("auth/redeem", { method: "POST", body: { token } })
      .then((res) => {
        if (!live) return;
        setSession(res.sessionToken);
        window.location.replace("/app");
      })
      .catch((err) => {
        if (!live) return;
        setError(err.message || "That link did not work.");
        setState("failed");
      });
    return () => { live = false; };
  }, [params]);

  return (
    <div className="auth-screen">
    <div className="wrap" style={{ maxWidth: 520, paddingTop: 64, paddingBottom: 64, textAlign: "center" }}>
      <Wordmark size={52} />
      {state === "working" && (
        <>
          <h1 className="display" style={{ fontSize: 34, marginTop: 26 }}>Opening your door...</h1>
          <p className="dim">Checking your link and letting you in.</p>
        </>
      )}
      {state === "failed" && (
        <>
          <h1 className="display" style={{ fontSize: 34, marginTop: 26 }}>That link did not work.</h1>
          <p className="dim">{error}</p>
          <p><Link href="/login" className="btn">Ask for a fresh link</Link></p>
        </>
      )}
    </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="auth-screen"><div className="wrap" style={{ paddingTop: 64 }}>Opening your door...</div></div>}>
      <VerifyInner />
    </Suspense>
  );
}
