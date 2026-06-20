"use client";

import type { KitchenPlan } from "../lib/kitchenCustom";
import { voiceHintForNextStep } from "../lib/kitchenVoiceMatch";
import { useKitchenVoiceControl } from "../hooks/useKitchenVoiceControl";
import type { KitchenInteraction } from "../lib/kitchen";

interface KitchenVoiceBarProps {
  enabled: boolean;
  plan: KitchenPlan;
  completedStepIds: string[];
  nextStepId?: string;
  onVoiceAction: (item: KitchenInteraction, transcript: string) => void;
}

export function KitchenVoiceBar({
  enabled,
  plan,
  completedStepIds,
  nextStepId,
  onVoiceAction,
}: KitchenVoiceBarProps) {
  const { supported, listening, transcript, error, toggleListening } =
    useKitchenVoiceControl({
      enabled,
      plan,
      completedStepIds,
      onMatch: onVoiceAction,
    });

  if (!supported) {
    return (
      <p className="mt-2 text-[10px] text-zinc-600">
        Voice control needs Chrome or Edge (Web Speech API).
      </p>
    );
  }

  const hint = voiceHintForNextStep(plan, nextStepId);

  return (
    <div className="mt-2 rounded-md border border-violet-900/40 bg-violet-950/20 px-2.5 py-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] uppercase tracking-wider text-violet-400">
          Voice control
        </p>
        <button
          type="button"
          onClick={toggleListening}
          className={`rounded-full border px-2.5 py-1 text-[10px] font-medium transition-colors ${
            listening
              ? "border-violet-500 bg-violet-500/20 text-violet-200 animate-pulse"
              : "border-violet-800/50 text-violet-400 hover:border-violet-600"
          }`}
        >
          {listening ? "🎤 Listening…" : "🎤 Start voice"}
        </button>
      </div>
      <p className="mt-1 text-[10px] text-violet-300/90">{hint}</p>
      {transcript && (
        <p className="mt-1 truncate text-[10px] italic text-zinc-500">
          Heard: &ldquo;{transcript}&rdquo;
        </p>
      )}
      {error && (
        <p className="mt-1 text-[10px] text-red-400">{error}</p>
      )}
    </div>
  );
}
