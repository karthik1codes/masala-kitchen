"use client";

import { useState } from "react";
import { useLingbotCommandError, useLingbotState } from "@reactor-models/lingbot";

export function CommandError() {
  const [error, setError] = useState<{
    command: string;
    reason: string;
  } | null>(null);

  useLingbotCommandError((msg) => {
    setError({ command: msg.command, reason: msg.reason });
  });

  useLingbotState(() => {
    setError(null);
  });

  if (!error) return null;

  return (
    <div className="rounded-lg border border-red-900/50 bg-red-950/20 p-3">
      <span className="text-[10px] uppercase tracking-wider text-red-500">
        {error.command} failed
      </span>
      <p className="mt-1 text-sm text-red-300">{error.reason}</p>
    </div>
  );
}
