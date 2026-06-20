"use client";

import { useState } from "react";
import {
  useLingbot,
  useLingbotState,
  type LingbotStateMessage,
} from "@reactor-models/lingbot";
import { useWasdMovement } from "../hooks/useWasdMovement";

export function MovementControls() {
  const { status } = useLingbot();
  const [snapshot, setSnapshot] = useState<LingbotStateMessage | null>(null);

  useLingbotState((msg) => setSnapshot(msg));

  const isLive = status === "ready" && snapshot?.started === true;
  useWasdMovement(isLive);

  if (!isLive) return null;

  const action = snapshot?.current_action ?? "still";

  return (
    <div className="shrink-0 rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] uppercase tracking-wider text-zinc-500">
          Move · WASD
        </p>
        <span className="font-mono text-[10px] text-brand">{action}</span>
      </div>
      <div className="mx-auto mt-2 grid max-w-[120px] grid-cols-3 gap-1 text-center">
        <span />
        <kbd className="rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-[10px] text-zinc-300">
          W
        </kbd>
        <span />
        <kbd className="rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-[10px] text-zinc-300">
          A
        </kbd>
        <kbd className="rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-[10px] text-zinc-300">
          S
        </kbd>
        <kbd className="rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-[10px] text-zinc-300">
          D
        </kbd>
      </div>
      <p className="mt-2 text-center text-[10px] text-zinc-600">
        Hold keys to walk through the kitchen
      </p>
    </div>
  );
}
