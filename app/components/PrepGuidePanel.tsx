"use client";

import { useMemo } from "react";
import type { KitchenPlan } from "../lib/kitchenCustom";
import { buildPrepGuide } from "../lib/kitchenPrepGuide";

interface PrepGuidePanelProps {
  plan: KitchenPlan;
  completedStepIds?: string[];
  currentStepId?: string;
  /** Smaller layout for the pre-start order ticket */
  compact?: boolean;
  /** User skipped a step — highlight restart at Step 1 */
  orderViolation?: boolean;
}

export function PrepGuidePanel({
  plan,
  completedStepIds = [],
  currentStepId,
  compact = false,
  orderViolation = false,
}: PrepGuidePanelProps) {
  const guide = useMemo(() => buildPrepGuide(plan), [plan]);

  if (guide.steps.length === 0) return null;

  return (
    <div
      className={`rounded-md border border-zinc-800 bg-zinc-950/60 ${
        compact ? "mt-2 px-2.5 py-2" : "mt-3 px-3 py-2.5"
      }`}
    >
      <p className="text-[10px] uppercase tracking-wider text-brand">
        How to prepare {guide.dish}
      </p>

      {orderViolation && (
        <p className="mt-1.5 rounded border border-red-900/50 bg-red-950/30 px-2 py-1 text-[10px] font-medium text-red-300">
          Wrong order — start again at Step 1.
        </p>
      )}

      <ol className="mt-1.5 space-y-1">
        {guide.steps.map((step) => {
          const done = completedStepIds.includes(step.interactionId);
          const isCurrent = currentStepId === step.interactionId;
          const restartHere = orderViolation && step.number === 1 && !done;
          return (
            <li
              key={step.interactionId}
              className={`flex items-center gap-2 rounded border px-2 py-1 ${
                restartHere
                  ? "border-red-500/60 bg-red-950/25 ring-1 ring-red-500/30 animate-pulse"
                  : isCurrent
                    ? "border-brand/50 bg-brand/5"
                    : done
                      ? "border-emerald-900/40 bg-emerald-950/20"
                      : "border-zinc-800 bg-zinc-900/40"
              }`}
            >
              <span
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${
                  done
                    ? "bg-emerald-900/60 text-emerald-300"
                    : restartHere
                      ? "bg-red-900/60 text-red-300"
                      : isCurrent
                        ? "bg-brand/20 text-brand"
                        : "bg-zinc-800 text-zinc-400"
                }`}
              >
                {done ? "✓" : step.number}
              </span>
              <p
                className={`min-w-0 flex-1 truncate font-medium text-zinc-200 ${
                  compact ? "text-[10px]" : "text-[11px]"
                }`}
              >
                {step.label}
                {step.shortcut && (
                  <span className="ml-1 font-mono text-[9px] font-normal text-zinc-500">
                    [{step.shortcut.toUpperCase()}]
                  </span>
                )}
              </p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
