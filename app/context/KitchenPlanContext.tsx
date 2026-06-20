"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  KITCHEN_BY_SHORTCUT,
  KITCHEN_INTERACTIONS,
  KITCHEN_ORDERS,
  type KitchenOrder,
} from "../lib/kitchen";
import {
  buildCustomKitchenPlan,
  hintFromStepIds,
  resolveInteractionId,
  withDishTimeLimit,
  type KitchenPlan,
} from "../lib/kitchenCustom";
import {
  fetchAiKitchenPlan,
} from "../lib/kitchenAiClient";

export type OrderMode = "preset" | "custom";

interface KitchenPlanContextValue {
  mode: OrderMode;
  presetIndex: number;
  customDish: string;
  plan: KitchenPlan;
  planLoading: boolean;
  planError: string | null;
  orderRevision: number;
  setPresetOrder: (index: number) => Promise<KitchenPlan | null>;
  setCustomOrder: (dishName: string) => Promise<KitchenPlan | null>;
  nextPresetOrder: () => Promise<void>;
}

const fallbackPlan = buildCustomKitchenPlan(KITCHEN_ORDERS[0].label)!;

/** Build a plan whose ingredients/equipment/cooking steps match the dish name. */
function buildPlanForDish(dishLabel: string, preset?: KitchenOrder): KitchenPlan {
  const built = buildCustomKitchenPlan(dishLabel);
  if (!built) {
    return preset
      ? {
          order: preset,
          interactions: [...KITCHEN_INTERACTIONS],
          shortcutMap: KITCHEN_BY_SHORTCUT,
        }
      : fallbackPlan;
  }

  if (!preset) return built;

  const resolvedPreset = preset.idealStepIds
    .map((id) => resolveInteractionId(built.interactions, id))
    .filter(Boolean) as string[];

  const minExpected = Math.min(4, preset.idealStepIds.length);
  const baseIds =
    resolvedPreset.length >= minExpected
      ? resolvedPreset
      : built.order.idealStepIds;

  const withServe = baseIds.includes("serve-customer")
    ? baseIds
    : [...baseIds, "serve-customer"];

  return withDishTimeLimit(
    {
      ...built,
      order: {
        ...built.order,
        id: preset.id,
        label: preset.label,
        hint: hintFromStepIds(built.interactions, withServe),
        idealStepIds: withServe,
        timeLimitSec: preset.timeLimitSec,
      },
      interactions: built.interactions,
      shortcutMap: built.shortcutMap,
      source: built.source,
      images: built.images,
      customDialogues: built.customDialogues,
    },
    { presetTime: preset.timeLimitSec },
  );
}

function buildPresetPlan(index: number): KitchenPlan {
  const preset = KITCHEN_ORDERS[index % KITCHEN_ORDERS.length];
  return buildPlanForDish(preset.label, preset);
}

export { buildPresetPlan };

const defaultPlan = buildPresetPlan(0);

const KitchenPlanContext = createContext<KitchenPlanContextValue | null>(null);

export function KitchenPlanProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<OrderMode>("preset");
  const [presetIndex, setPresetIndex] = useState(0);
  const [customDish, setCustomDish] = useState("");
  const [plan, setPlan] = useState<KitchenPlan>(defaultPlan);
  const [planLoading, setPlanLoading] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);
  const [orderRevision, setOrderRevision] = useState(0);
  const [aiBootstrapped, setAiBootstrapped] = useState(false);

  const loadPresetPlan = useCallback(async (index: number) => {
    const preset = KITCHEN_ORDERS[index % KITCHEN_ORDERS.length];
    setPlanLoading(true);
    setPlanError(null);
    setPlan((p) => ({ ...p, images: undefined }));

    try {
      const { plan: aiPlan } = await fetchAiKitchenPlan(preset.label, {
        generateImages: false,
        fresh: true,
      });
      const merged = withDishTimeLimit(
        {
          ...aiPlan,
          order: {
            ...aiPlan.order,
            id: preset.id,
            label: preset.label,
            timeLimitSec: preset.timeLimitSec,
          },
        },
        {
          presetTime: preset.timeLimitSec,
          aiTime: aiPlan.order.timeLimitSec,
        },
      );
      setPlan(merged);
      setMode("preset");
      setPresetIndex(index);
      setOrderRevision((r) => r + 1);
      return merged;
    } catch (e) {
      console.warn("[KitchenPlan] AI preset plan failed, using profile fallback:", e);
      const base = withDishTimeLimit(buildPresetPlan(index), {
        presetTime: KITCHEN_ORDERS[index % KITCHEN_ORDERS.length].timeLimitSec,
      });
      setMode("preset");
      setPresetIndex(index);
      setPlan(base);
      setOrderRevision((r) => r + 1);
      return base;
    } finally {
      setPlanLoading(false);
    }
  }, []);

  useEffect(() => {
    if (aiBootstrapped) return;
    setAiBootstrapped(true);
    void loadPresetPlan(0);
  }, [aiBootstrapped, loadPresetPlan]);

  const setPresetOrder = useCallback(
    async (index: number) => loadPresetPlan(index),
    [loadPresetPlan],
  );

  const setCustomOrder = useCallback(async (dishName: string) => {
    const trimmed = dishName.trim();
    if (!trimmed) return null;

    setPlanLoading(true);
    setPlanError(null);
    setPlan((p) => ({ ...p, images: undefined }));

    try {
      const { plan: aiPlan } = await fetchAiKitchenPlan(trimmed, {
        generateImages: false,
        fresh: true,
      });
      setMode("custom");
      setCustomDish(trimmed);
      setPlan(withDishTimeLimit(aiPlan, { aiTime: aiPlan.order.timeLimitSec }));
      setOrderRevision((r) => r + 1);
      return aiPlan;
    } catch (e) {
      console.warn("[KitchenPlan] AI plan failed, using profile fallback:", e);
      const built = buildCustomKitchenPlan(trimmed);
      if (!built) {
        setPlanError(
          e instanceof Error ? e.message : "Could not build kitchen plan",
        );
        return null;
      }
      setMode("custom");
      setCustomDish(trimmed);
      setPlan(withDishTimeLimit(built));
      setOrderRevision((r) => r + 1);
      return built;
    } finally {
      setPlanLoading(false);
    }
  }, []);

  const nextPresetOrder = useCallback(async () => {
    const next = (presetIndex + 1) % KITCHEN_ORDERS.length;
    await loadPresetPlan(next);
  }, [presetIndex, loadPresetPlan]);

  const value = useMemo(
    () => ({
      mode,
      presetIndex,
      customDish,
      plan,
      planLoading,
      planError,
      orderRevision,
      setPresetOrder,
      setCustomOrder,
      nextPresetOrder,
    }),
    [
      mode,
      presetIndex,
      customDish,
      plan,
      planLoading,
      planError,
      orderRevision,
      setPresetOrder,
      setCustomOrder,
      nextPresetOrder,
    ],
  );

  return (
    <KitchenPlanContext.Provider value={value}>{children}</KitchenPlanContext.Provider>
  );
}

export function useKitchenPlan(): KitchenPlanContextValue {
  const ctx = useContext(KitchenPlanContext);
  if (!ctx) {
    throw new Error("useKitchenPlan must be used within KitchenPlanProvider");
  }
  return ctx;
}

export type { KitchenInteraction, KitchenOrder } from "../lib/kitchen";
export type { KitchenPlan } from "../lib/kitchenCustom";
