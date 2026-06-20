import type { KitchenSound } from "./kitchen";
import {
  assembleKitchenPlan,
  hintFromStepIds,
  resolveInteractionId,
  resolveTimeLimitForOrder,
  withDishTimeLimit,
  type KitchenPlan,
} from "./kitchenCustom";
import type { KitchenInteraction } from "./kitchen";

export interface AiKitchenStep {
  id: string;
  label: string;
  sound?: string;
  action: string;
  shortcut?: string;
}

export interface AiKitchenPlanPayload {
  dishName?: string;
  timeLimitSec?: number;
  ingredients: AiKitchenStep[];
  equipment: AiKitchenStep[];
  cooking: AiKitchenStep[];
  plating: AiKitchenStep[];
  /** Ordered checklist of step ids (from ingredients/equipment/cooking/plating) ending before serve. */
  idealStepIds?: string[];
  hindiDialogues?: Record<string, string[]>;
}

const VALID_SOUNDS = new Set<KitchenSound>([
  "chop",
  "sizzle",
  "pop",
  "whistle",
  "pour",
  "ding",
  "cheer",
  "flame",
  "click",
  "chatter",
]);

const SOUND_ALIASES: Record<string, KitchenSound> = {
  steam: "sizzle",
  flip: "sizzle",
  grind: "chop",
  kettle: "whistle",
  boil: "whistle",
  fry: "sizzle",
};

function normalizeSound(raw?: string): KitchenSound {
  if (!raw) return "chop";
  const key = raw.toLowerCase().trim();
  if (VALID_SOUNDS.has(key as KitchenSound)) {
    return key as KitchenSound;
  }
  return SOUND_ALIASES[key] ?? "chop";
}

function slugify(dish: string): string {
  return dish
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "custom-dish";
}

function normalizeStep(step: AiKitchenStep, fallbackId: string) {
  const id = (step.id || fallbackId)
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);

  const label = step.label?.trim() || fallbackId;
  const emoji = label.match(/^(\p{Extended_Pictographic})/u)?.[1] ?? "🍽️";
  const hasEmoji = /^\p{Extended_Pictographic}/u.test(label);

  return {
    id: id || fallbackId,
    label: hasEmoji ? label : `${emoji} ${label}`,
    sound: normalizeSound(step.sound),
    action: step.action?.trim() || `The chef prepares ${label} for the dish.`,
    ...(step.shortcut ? { shortcut: step.shortcut.slice(0, 1) } : {}),
  };
}

function normalizeSteps(steps: AiKitchenStep[] | undefined, prefix: string) {
  if (!Array.isArray(steps) || steps.length === 0) return [];
  return steps.map((s, i) => normalizeStep(s, `${prefix}-${i + 1}`));
}

function resolveAiStepId(
  slug: string,
  stepId: string,
  interactions: KitchenInteraction[],
): string | undefined {
  const trimmed = stepId.trim();
  if (!trimmed) return undefined;
  if (trimmed === "serve-customer") {
    return interactions.find((i) => i.id === "serve-customer")?.id;
  }
  return (
    resolveInteractionId(interactions, trimmed) ??
    interactions.find((i) => i.id === `${slug}-${trimmed}`)?.id ??
    interactions.find((i) => i.id.endsWith(`-${trimmed}`))?.id
  );
}

/** Build the prep checklist strictly from ChatGPT step order. */
export function buildIdealStepIdsFromAi(
  slug: string,
  ai: AiKitchenPlanPayload,
  interactions: KitchenInteraction[],
  normalized: {
    ingredients: ReturnType<typeof normalizeSteps>;
    equipment: ReturnType<typeof normalizeSteps>;
    cooking: ReturnType<typeof normalizeSteps>;
    plating: ReturnType<typeof normalizeSteps>;
  },
): string[] {
  const ids: string[] = [];

  const appendFromAiList = (list: string[] | undefined) => {
    for (const rawId of list ?? []) {
      const resolved = resolveAiStepId(slug, rawId, interactions);
      if (resolved && !ids.includes(resolved)) ids.push(resolved);
    }
  };

  if (ai.idealStepIds?.length) {
    appendFromAiList(ai.idealStepIds);
  } else {
    for (const step of normalized.ingredients) {
      const resolved = resolveAiStepId(slug, step.id, interactions);
      if (resolved) ids.push(resolved);
    }
    for (const step of normalized.equipment) {
      const resolved = resolveAiStepId(slug, step.id, interactions);
      if (resolved && !ids.includes(resolved)) ids.push(resolved);
    }
    for (const step of normalized.cooking) {
      const resolved = resolveAiStepId(slug, step.id, interactions);
      if (resolved && !ids.includes(resolved)) ids.push(resolved);
    }
    for (const step of normalized.plating) {
      const resolved = resolveAiStepId(slug, step.id, interactions);
      if (resolved && !ids.includes(resolved)) ids.push(resolved);
    }
  }

  if (!ids.includes("serve-customer")) {
    ids.push("serve-customer");
  }

  return ids;
}

export function buildKitchenPlanFromAi(
  dishName: string,
  ai: AiKitchenPlanPayload,
  images?: KitchenPlan["images"],
): KitchenPlan {
  const dish = dishName.trim();
  const slug = slugify(dish);

  const ingredients = normalizeSteps(ai.ingredients, "ingredient");
  const equipment = normalizeSteps(ai.equipment, "equipment");
  const cooking = normalizeSteps(ai.cooking, "cook");
  const plating = normalizeSteps(ai.plating, "plate");

  const aiTime =
    typeof ai.timeLimitSec === "number" && ai.timeLimitSec >= 60
      ? Math.min(ai.timeLimitSec, 240)
      : undefined;

  const customDialogues = ai.hindiDialogues ?? {};

  const base = assembleKitchenPlan({
    dish,
    slug,
    timeLimitSec: aiTime ?? resolveTimeLimitForOrder(dish, []),
    ingredients,
    equipment,
    cooking,
    plating,
    source: "openai",
    images,
  });

  const idealStepIds = buildIdealStepIdsFromAi(slug, ai, base.interactions, {
    ingredients,
    equipment,
    cooking,
    plating,
  });

  return withDishTimeLimit(
    {
      ...base,
      order: {
        ...base.order,
        idealStepIds,
        hint: hintFromStepIds(base.interactions, idealStepIds),
      },
      customDialogues,
      source: "openai" as const,
    },
    { aiTime },
  );
}
