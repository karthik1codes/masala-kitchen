import type { KitchenInteraction } from "./kitchen";
import type { KitchenPlan } from "./kitchenCustom";

export interface PrepGuideStep {
  number: number;
  label: string;
  interactionId: string;
  shortcut?: string;
}

export interface PrepGuide {
  dish: string;
  intro: string;
  steps: PrepGuideStep[];
}

export function buildPrepGuide(plan: KitchenPlan): PrepGuide {
  const dish = plan.order.label.trim() || "your dish";
  const steps: PrepGuideStep[] = [];

  plan.order.idealStepIds.forEach((id, index) => {
    const item = plan.interactions.find((i) => i.id === id);
    if (!item) return;

    steps.push({
      number: index + 1,
      label: item.label,
      interactionId: id,
      shortcut: item.shortcut,
    });
  });

  return {
    dish,
    intro: `Follow in order — skipping resets to Step 1.`,
    steps,
  };
}

export function getNextRecipeStepId(
  plan: KitchenPlan,
  completedStepIds: string[],
): string | undefined {
  return plan.order.idealStepIds.find((id) => !completedStepIds.includes(id));
}

function stepLabel(item: KitchenInteraction): string {
  return item.label.replace(/^[^\s]+\s/, "").trim();
}

export function getRecipeStepMeta(
  plan: KitchenPlan,
  stepId: string,
): { number: number; label: string; shortLabel: string } | null {
  const index = plan.order.idealStepIds.indexOf(stepId);
  if (index < 0) return null;
  const item = plan.interactions.find((i) => i.id === stepId);
  if (!item) return null;
  return {
    number: index + 1,
    label: item.label,
    shortLabel: stepLabel(item),
  };
}

/** True when the user taps a recipe step before completing earlier ones. */
export function isRecipeStepOutOfOrder(
  plan: KitchenPlan,
  completedStepIds: string[],
  stepId: string,
): { wrong: true; expectedStepId: string; expected: { number: number; label: string; shortLabel: string } } | { wrong: false } {
  if (!plan.order.idealStepIds.includes(stepId)) return { wrong: false };
  if (completedStepIds.includes(stepId)) return { wrong: false };

  const expectedStepId = getNextRecipeStepId(plan, completedStepIds);
  if (!expectedStepId || expectedStepId === stepId) return { wrong: false };

  const expected = getRecipeStepMeta(plan, expectedStepId);
  if (!expected) return { wrong: false };

  return { wrong: true, expectedStepId, expected };
}
