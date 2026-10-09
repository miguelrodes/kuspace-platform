"use client";

import { useState } from "react";
import { startDemoSession } from "@/lib/demo/browser-session";
import { SANDBOX_STORAGE, type DemoRole } from "@/lib/demo/sandbox";

export function DemoEntry() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [requestedRole, setRequestedRole] = useState<DemoRole | null>(null);
  async function enter(role: DemoRole, confirmed = false) {
    try {
      if (!confirmed && sessionStorage.getItem(SANDBOX_STORAGE)) {
        setRequestedRole(role);
        return;
      }
    } catch {
      setError("Allow browser session storage to use the demo.");
      return;
    }
    setPending(true);
    setRequestedRole(null);
    setError("");
    try {
      await startDemoSession(role);
      window.location.assign(role === "recruiter" ? "/rechome" : "/conshome");
    } catch {
      setError(
        "Could not start the demo. Allow browser session storage and try again.",
      );
      setPending(false);
    }
  }
  return (
    <>
      <button
        type="button"
        disabled={pending}
        onClick={() => void enter("recruiter")}
        className="text-body inline-flex min-h-11 min-w-[12rem] items-center justify-center rounded-[var(--radius-button-tag)] px-5 tracking-[0.08em] uppercase transition hover:opacity-80 disabled:opacity-50"
        style={{ color: "var(--accent-hex)" }}
      >
        Explore as a nightclub / event label
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => void enter("consumer")}
        className="text-body text-fg inline-flex min-h-11 min-w-[12rem] items-center justify-center rounded-[var(--radius-button-tag)] px-5 tracking-[0.08em] uppercase transition hover:opacity-80 disabled:opacity-50"
        style={{ color: "#00A8FF" }}
      >
        Explore as a clubgoer
      </button>
      {pending ? (
        <p role="status" className="text-muted text-sm">
          Preparing your demo...
        </p>
      ) : null}
      {requestedRole ? (
        <p role="alert" className="text-muted text-sm">
          Start fresh and discard this tab&apos;s edits?{" "}
          <button
            className="underline"
            onClick={() => void enter(requestedRole, true)}
          >
            Start fresh
          </button>{" "}
          |{" "}
          <button className="underline" onClick={() => setRequestedRole(null)}>
            Cancel
          </button>
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-muted text-sm">
          {error}
        </p>
      ) : null}
    </>
  );
}
