"use client";

import { useEffect, useState } from "react";
import { useLingbot, useLingbotState, type LingbotStateMessage } from "@reactor-models/lingbot";
import { KITCHEN_ORDERS } from "../lib/kitchen";
import { playOrderCallDialogue } from "../lib/chefDialoguePlayer";
import {
  getPlanIngredients,
  formatTimeLimit,
  matchProfileId,
} from "../lib/kitchenCustom";
import { useKitchenPlan } from "../context/KitchenPlanContext";
import { PrepGuidePanel } from "./PrepGuidePanel";

export function CustomOrderSetup() {
  const { status } = useLingbot();
  const [snapshot, setSnapshot] = useState<LingbotStateMessage | null>(null);
  const [customInput, setCustomInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const {
    mode,
    presetIndex,
    customDish,
    plan,
    planLoading,
    planError,
    setPresetOrder,
    setCustomOrder,
  } = useKitchenPlan();

  useLingbotState((msg) => setSnapshot(msg));

  useEffect(() => {
    if (status !== "ready") setSnapshot(null);
  }, [status]);

  if (status === "ready" && snapshot?.started) return null;

  const ready = status === "ready";
  const ingredients = getPlanIngredients(plan);
  const profileId = matchProfileId(
    mode === "custom" ? customDish : plan.order.label,
  );

  async function applyCustom() {
    setError(null);
    const dish = customInput.trim();
    if (!dish) {
      setError("Enter a dish name (e.g. Masala Dosa, Pav Bhaji, Chicken Biryani)");
      return;
    }
    const loaded = await setCustomOrder(dish);
    if (!loaded) {
      setError(planError ?? "Could not load plan for this dish");
      return;
    }
    setCustomInput(dish);
    playOrderCallDialogue(loaded);
  }

  async function selectPreset(index: number) {
    const loaded = await setPresetOrder(index);
    if (loaded) playOrderCallDialogue(loaded);
  }

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
      <label className="text-[10px] uppercase tracking-wider text-zinc-500">
        Order ticket
      </label>
      <p className="mt-1 text-[11px] text-zinc-500">
        Type any dish — ChatGPT builds ingredients, steps, and reference images.
        Chefs speak Hindi on every tap.
      </p>

      <div className="mt-2 flex flex-wrap gap-1">
        {KITCHEN_ORDERS.map((o, i) => (
          <button
            key={o.id}
            type="button"
            disabled={!ready || planLoading}
            onClick={() => void selectPreset(i)}
            className={`rounded-md border px-2 py-1 text-[10px] transition-colors disabled:opacity-40 ${
              mode === "preset" && presetIndex === i
                ? "border-brand bg-zinc-900 text-brand"
                : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-brand"
            }`}
            title={`${formatTimeLimit(o.timeLimitSec)} to complete`}
          >
            {o.label.split("+")[0].trim()}
            <span className="ml-1 font-mono text-[9px] text-zinc-600">
              {formatTimeLimit(o.timeLimitSec)}
            </span>
          </button>
        ))}
      </div>

      <label className="mt-3 block text-[10px] uppercase tracking-wider text-zinc-500">
        Custom dish
      </label>
      <div className="mt-1.5 flex gap-1.5">
        <input
          type="text"
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void applyCustom()}
          disabled={!ready || planLoading}
          placeholder="e.g. Hyderabadi Biryani, Rogan Josh, Samosa…"
          className="min-w-0 flex-1 rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-brand focus:outline-none disabled:opacity-40"
        />
        <button
          type="button"
          disabled={!ready || planLoading || !customInput.trim()}
          onClick={() => void applyCustom()}
          className="shrink-0 rounded-md bg-brand px-2.5 py-1.5 text-xs font-medium text-brand-fg hover:opacity-90 disabled:opacity-40"
        >
          {planLoading ? "Loading…" : "Load"}
        </button>
      </div>

      {(error || planError) && (
        <p className="mt-1.5 text-[11px] text-red-400">{error ?? planError}</p>
      )}

      {planLoading && (
        <p className="mt-1.5 text-[11px] text-brand animate-pulse">
          ChatGPT is building ingredients, steps, and images…
        </p>
      )}

      <div className="mt-2 rounded-md border border-zinc-800 bg-zinc-950/80 px-2.5 py-2">
        <p className="text-[10px] uppercase tracking-wider text-zinc-600">
          Active order {mode === "custom" ? "· custom" : "· preset"}
          {plan.source === "openai" ? " · AI plan" : ""}
        </p>
        <p className="mt-0.5 text-xs font-medium text-zinc-200">
          {mode === "custom" ? customDish : plan.order.label}
        </p>
        <p className="mt-1 text-[10px] text-zinc-500">{plan.order.hint}</p>
        <p className="mt-1 text-[10px] text-amber-600/90">
          ⏱ {formatTimeLimit(plan.order.timeLimitSec)} for this dish
        </p>

        {plan.images?.ingredientsDataUrl && (
          <div className="mt-2 overflow-hidden rounded border border-zinc-800">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={plan.images.ingredientsDataUrl}
              alt={`Ingredients for ${plan.order.label}`}
              className="aspect-video w-full object-cover"
            />
            <p className="px-2 py-1 text-[10px] text-zinc-500">
              AI ingredient reference (DALL-E)
            </p>
          </div>
        )}

        <p className="mt-1.5 text-[10px] uppercase tracking-wider text-zinc-600">
          Ingredients for this order
        </p>
        <div className="mt-1 flex flex-wrap gap-1">
          {ingredients.map((item) => (
            <span
              key={item.id}
              className="rounded border border-zinc-800 bg-zinc-900 px-1.5 py-0.5 text-[10px] text-zinc-400"
            >
              {item.label.replace(/^[^\s]+\s/, "")}
            </span>
          ))}
        </div>
        <p className="mt-1.5 text-[10px] text-zinc-600">
          Profile: {profileId.replace(/-/g, " ")} ·{" "}
          {plan.interactions.filter((i) => i.category !== "serve").length} actions
        </p>

        <PrepGuidePanel plan={plan} compact />
      </div>
    </div>
  );
}
