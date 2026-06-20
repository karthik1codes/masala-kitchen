"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  useLingbot,
  useLingbotChunkComplete,
  useLingbotState,
  type LingbotStateMessage,
} from "@reactor-models/lingbot";
import { KITCHEN_CATEGORIES, type KitchenInteraction } from "../lib/kitchen";
import {
  buildInteractionDialogue,
  previewInteractionDialogue,
} from "../lib/kitchenDialogue";
import {
  notifyVideoChunkComplete,
  playChefDialogue,
  playOrderCallDialogue,
  playServeTooEarlyDialogue,
  playWrongStepDialogue,
} from "../lib/chefDialoguePlayer";
import { useKitchenPlan } from "../context/KitchenPlanContext";
import {
  getRequiredBeforeServe,
  formatTimeLimit,
  isServeStepId,
} from "../lib/kitchenCustom";
import { PrepGuidePanel } from "./PrepGuidePanel";
import { KitchenVoiceBar } from "./KitchenVoiceBar";
import {
  getRecipeStepMeta,
  isRecipeStepOutOfOrder,
} from "../lib/kitchenPrepGuide";
import { WASD_KEYS } from "../hooks/useWasdMovement";

const THROTTLE_MS = 1200;
const WRONG_STEP_PENALTY = 50;

function orderProgress(orderStepIds: string[], completed: string[]): number {
  if (orderStepIds.length === 0) return 0;
  const done = orderStepIds.filter((id) => completed.includes(id)).length;
  return Math.round((done / orderStepIds.length) * 100);
}

export function KitchenControls() {
  const { status, setPrompt } = useLingbot();
  const { mode, plan, planLoading, setCustomOrder, nextPresetOrder, orderRevision } = useKitchenPlan();
  const { order, interactions, shortcutMap } = plan;

  const [snapshot, setSnapshot] = useState<LingbotStateMessage | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [liveCustomInput, setLiveCustomInput] = useState("");
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [orderViolation, setOrderViolation] = useState(false);
  const lastClickRef = useRef(0);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const orderAnnouncedRef = useRef<string | null>(null);

  useLingbotState((msg) => setSnapshot(msg));

  useLingbotChunkComplete((msg) => {
    notifyVideoChunkComplete(msg.active_prompt);
  });

  const isLive = status === "ready" && snapshot?.started === true;
  const requiredBeforeServe = useMemo(
    () => getRequiredBeforeServe(plan),
    [plan],
  );
  const canServe = requiredBeforeServe.every((id) => completedSteps.includes(id));
  const nextStepId = order.idealStepIds.find((id) => !completedSteps.includes(id));
  const progress = orderProgress([...order.idealStepIds], completedSteps);

  useEffect(() => {
    if (status !== "ready") {
      setSnapshot(null);
      setActiveId(null);
    }
  }, [status]);

  useEffect(() => {
    if (!isLive) return;
    setTimeLeft(order.timeLimitSec);
    setCompletedSteps([]);
    setCombo(0);
    setScore(0);
    setActiveId(null);
    setOrderViolation(false);
  }, [isLive, order.id, order.label, order.timeLimitSec, orderRevision]);

  useEffect(() => {
    if (!isLive || timeLeft <= 0) return;
    const t = setInterval(() => setTimeLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [isLive, timeLeft, order.id]);

  useEffect(() => {
    if (!isLive) {
      orderAnnouncedRef.current = null;
      return;
    }
    const key = `${order.id}:${order.label}`;
    if (orderAnnouncedRef.current === key) return;
    orderAnnouncedRef.current = key;
    playOrderCallDialogue(plan);
  }, [isLive, order.id, order.label, plan]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 2200);
  }, []);

  const interact = useCallback(
    async (item: KitchenInteraction) => {
      const now = Date.now();
      if (now - lastClickRef.current < THROTTLE_MS) return;
      lastClickRef.current = now;

      const outOfOrder = isRecipeStepOutOfOrder(plan, completedSteps, item.id);
      if (outOfOrder.wrong) {
        const expected = outOfOrder.expected;
        showToast(
          `⚠️ Wrong step! Step ${expected.number} first — reset to Step 1 (−${WRONG_STEP_PENALTY} pts).`,
        );
        setCompletedSteps([]);
        setCombo(0);
        setScore((s) => Math.max(0, s - WRONG_STEP_PENALTY));
        setActiveId(null);
        setOrderViolation(true);
        setSpeakingId("wrong-step");
        void playWrongStepDialogue(plan, expected).finally(() => {
          setSpeakingId((current) => (current === "wrong-step" ? null : current));
        });
        return;
      }

      if (isServeStepId(item.id) && !canServe) {
        const pending = requiredBeforeServe.filter(
          (id) => !completedSteps.includes(id),
        ).length;
        showToast(
          `Pehle ${order.label} poora banao — ${pending} step baaki hain`,
        );
        setSpeakingId("serve-blocked");
        void playServeTooEarlyDialogue(plan, pending).finally(() => {
          setSpeakingId((current) => (current === "serve-blocked" ? null : current));
        });
        return;
      }

      setActiveId(item.id);
      setOrderViolation(false);
      setCompletedSteps((prev) =>
        prev.includes(item.id) ? prev : [...prev, item.id],
      );

      const isIdeal = order.idealStepIds.includes(item.id);
      const comboBonus = combo >= 3 ? 20 : combo >= 2 ? 10 : 0;
      let points = 10;
      if (item.category === "dishes") points = 75;
      else if (item.category === "serve") points = 150;
      else if (item.category === "chefs") points = 35;
      else if (item.category === "cooking") points = 25;
      if (isIdeal) points += 15;
      points += comboBonus;

      setCombo((c) => c + 1);
      setScore((s) => s + points);

      showToast(
        `${previewInteractionDialogue(item, order.label, plan.customDialogues)}${isIdeal ? " ✓" : ""}${comboBonus ? ` +${comboBonus}` : ""}`,
      );

      await setPrompt({ prompt: item.prompt });

      const lines = buildInteractionDialogue(item, order.label, plan.customDialogues);
      setSpeakingId(item.id);
      void playChefDialogue(order.label, {
        lines,
        interactionId: item.id,
      }).finally(() => {
        setSpeakingId((current) => (current === item.id ? null : current));
      });

      if (isServeStepId(item.id)) {
        const recipeDone = order.idealStepIds
          .filter((id) => !isServeStepId(id))
          .every((id) => [...completedSteps, item.id].includes(id));
        if (recipeDone && timeLeft > 0) {
          const timeBonus = Math.floor(timeLeft * 2);
          setScore((s) => s + 200 + timeBonus);
          showToast(`Perfect ${order.label}! +${200 + timeBonus} bonus`);
        }
      }
    },
    [
      setPrompt,
      order,
      combo,
      completedSteps,
      timeLeft,
      showToast,
      plan.customDialogues,
      canServe,
      requiredBeforeServe,
      plan,
    ],
  );

  const interactRef = useRef(interact);
  interactRef.current = interact;

  const onVoiceAction = useCallback((item: KitchenInteraction) => {
    void interactRef.current(item);
  }, []);

  useEffect(() => {
    if (!isLive) return;

    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      const key = e.key.toLowerCase();
      if (WASD_KEYS.has(key)) return;

      const item = shortcutMap.get(key);
      if (item) {
        e.preventDefault();
        interact(item);
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isLive, interact, shortcutMap]);

  if (!isLive) return null;

  const timerTone =
    timeLeft <= 10 ? "text-red-400" : timeLeft <= 30 ? "text-amber-400" : "text-zinc-400";

  const shortcutLegend = [...shortcutMap.entries()]
    .map(([k, v]) => `${k.toUpperCase()}=${v.label.replace(/^[^\s]+\s/, "")}`)
    .join(" · ");

  async function applyLiveCustom() {
    const dish = liveCustomInput.trim();
    if (!dish || planLoading) return;
    const loaded = await setCustomOrder(dish);
    if (loaded) {
      setLiveCustomInput("");
      showToast(`Naya order: ${dish}`);
      playOrderCallDialogue(loaded);
    }
  }

  return (
    <div className="relative rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
      {toast && (
        <div className="absolute -top-2 left-1/2 z-10 -translate-x-1/2 translate-y-[-100%] animate-pulse rounded-full border border-brand/40 bg-zinc-900 px-3 py-1 text-[11px] font-medium text-brand shadow-lg">
          {toast}
        </div>
      )}

      <div className="flex items-start justify-between gap-2">
        <label className="text-[10px] uppercase tracking-wider text-zinc-500">
          Interactive kitchen · Hindi voices
        </label>
        <div className="text-right">
          <span className="block text-[11px] font-medium text-brand">{score} pts</span>
          {combo >= 2 && (
            <span className="text-[10px] text-amber-500">×{combo} combo</span>
          )}
        </div>
      </div>

      <div className="mt-2 rounded-md border border-amber-900/40 bg-amber-950/20 px-2.5 py-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] uppercase tracking-wider text-amber-600">
            Order · {mode === "custom" ? "custom" : "preset"}
          </p>
          <span className={`font-mono text-[11px] ${timerTone}`}>
            {formatTimeLimit(timeLeft)} / {formatTimeLimit(order.timeLimitSec)}
          </span>
        </div>
        <p className="mt-0.5 text-xs font-medium text-amber-100">{order.label}</p>
        <p className="mt-1 text-[10px] text-amber-700/80">{order.hint}</p>
        {nextStepId && (
          <p className="mt-1 text-[10px] text-brand/90">
            Next:{" "}
            {interactions.find((i) => i.id === nextStepId)?.label.replace(
              /^[^\s]+\s/,
              "",
            ) ?? "Continue recipe"}
          </p>
        )}
        {!canServe && (
          <p className="mt-0.5 text-[10px] text-zinc-500">
            Complete prep, cook &amp; plate before serving {order.label}
          </p>
        )}
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-amber-950">
          <div
            className="h-full bg-amber-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-1 text-[10px] text-amber-600">{progress}% recipe complete</p>

        <PrepGuidePanel
          plan={plan}
          completedStepIds={completedSteps}
          currentStepId={nextStepId}
          orderViolation={orderViolation}
          compact
        />

        <KitchenVoiceBar
          enabled={isLive}
          plan={plan}
          completedStepIds={completedSteps}
          nextStepId={nextStepId}
          onVoiceAction={onVoiceAction}
        />

        <div className="mt-2 flex gap-1">
          <input
            type="text"
            value={liveCustomInput}
            onChange={(e) => setLiveCustomInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void applyLiveCustom()}
            placeholder="New custom dish…"
            className="min-w-0 flex-1 rounded border border-amber-900/30 bg-amber-950/40 px-2 py-1 text-[11px] text-amber-100 placeholder:text-amber-800 focus:border-brand focus:outline-none"
          />
          <button
            type="button"
            disabled={!liveCustomInput.trim() || planLoading}
            onClick={() => void applyLiveCustom()}
            className="shrink-0 rounded border border-amber-800/50 px-2 py-1 text-[10px] text-amber-400 hover:text-amber-200 disabled:opacity-40"
          >
            Swap
          </button>
          <button
            type="button"
            onClick={() => {
              if (mode === "preset") void nextPresetOrder();
              else {
                setCompletedSteps([]);
                setCombo(0);
                setOrderViolation(false);
              }
            }}
            className="shrink-0 text-[10px] text-amber-500 hover:text-amber-300"
          >
            Next →
          </button>
        </div>
      </div>

      {shortcutLegend && (
        <p className="mt-2 text-[10px] text-zinc-600">Shortcuts: {shortcutLegend}</p>
      )}

      <div className="mt-3 space-y-3">
        {KITCHEN_CATEGORIES.map((cat) => {
          const items = interactions.filter((i) => i.category === cat.id);
          if (items.length === 0) return null;
          return (
            <div key={cat.id}>
              <p className="text-[10px] uppercase tracking-wider text-zinc-600">
                {cat.label}
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {items.map((item) => {
                  const onRecipe = order.idealStepIds.includes(item.id);
                  const done = completedSteps.includes(item.id);
                  const isNext = item.id === nextStepId;
                  const serveLocked =
                    isServeStepId(item.id) && !canServe && !done;
                  const stepLocked =
                    onRecipe && !done && !isNext && !isServeStepId(item.id);
                  const nextMeta = nextStepId
                    ? getRecipeStepMeta(plan, nextStepId)
                    : null;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => interact(item)}
                      disabled={serveLocked}
                      title={
                        serveLocked
                          ? `Finish preparing ${order.label} before serving`
                          : stepLocked && nextMeta
                            ? `Do Step ${nextMeta.number} first: ${nextMeta.shortLabel} (skipping resets to Step 1)`
                            : item.prompt
                      }
                      className={`rounded-md border px-2 py-1 text-[11px] font-medium transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-35 ${
                        stepLocked
                          ? "border-zinc-800/60 bg-zinc-950/50 text-zinc-500 opacity-60"
                          : ""
                      } ${
                        speakingId === item.id
                          ? "border-violet-500 bg-violet-950/40 text-violet-300 ring-1 ring-violet-500/40 animate-pulse"
                          : speakingId === "wrong-step" && isNext
                            ? "border-red-500 bg-red-950/40 text-red-300 ring-1 ring-red-500/40 animate-pulse"
                          : isNext && orderViolation
                            ? "border-red-500/70 bg-red-950/30 text-red-200 ring-1 ring-red-500/50"
                          : isNext
                            ? "border-brand bg-brand/10 text-brand ring-1 ring-brand/40"
                          : activeId === item.id
                          ? "border-brand bg-zinc-900 text-brand ring-1 ring-brand/30"
                          : done
                            ? "border-emerald-900/50 bg-emerald-950/30 text-emerald-400"
                            : onRecipe
                              ? "border-amber-900/40 bg-zinc-950 text-zinc-200 hover:border-brand"
                              : "border-zinc-800 bg-zinc-950 text-zinc-300 hover:border-brand hover:text-brand"
                      }`}
                    >
                      {item.shortcut && (
                        <span className="mr-1 font-mono text-[9px] text-zinc-600">
                          [{item.shortcut.toUpperCase()}]
                        </span>
                      )}
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
