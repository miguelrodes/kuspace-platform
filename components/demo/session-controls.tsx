"use client";

import { useEffect, useState } from "react";
import { readDemoSession, startDemoSession } from "@/lib/demo/browser-session";
import type { DemoRole } from "@/lib/demo/sandbox";

export function SessionControls() {
  const [role, setRole] = useState<DemoRole | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  useEffect(() => {
    try {
      setRole(readDemoSession()?.role ?? null);
    } catch {
      setError("Demo storage is unavailable. Return to the start page.");
    }
  }, []);
  async function reset() {
    if (!role) return;
    setConfirmReset(false);
    setPending(true);
    try {
      await startDemoSession(role);
      window.location.assign(role === "recruiter" ? "/rechome" : "/conshome");
    } catch {
      setError("Could not reset the demo. Please try again.");
      setPending(false);
    }
  }
  return (
    <div className="text-muted text-xs">
      {role ? (
        <>
          <span>Your edits stay in this tab. </span>
          <button
            className="hover:text-fg underline"
            disabled={pending}
            onClick={() => setConfirmReset(true)}
          >
            Reset demo
          </button>
          <span> | </span>
          <a className="hover:text-fg underline" href="/">
            Change role
          </a>
        </>
      ) : null}
      {confirmReset ? (
        <p role="alert">
          Discard this tab&apos;s edits?{" "}
          <button className="underline" onClick={() => void reset()}>
            Confirm reset
          </button>{" "}
          |{" "}
          <button className="underline" onClick={() => setConfirmReset(false)}>
            Keep editing
          </button>
        </p>
      ) : null}
      {error ? (
        <p role="alert">
          {error} <a href="/">Choose a demo</a>
        </p>
      ) : null}
    </div>
  );
}
