"use client";

import { getPlanIngredients, type KitchenPlan } from "./kitchenCustom";

interface SerializedPlan extends Omit<KitchenPlan, "shortcutMap"> {
  shortcutMap: [string, KitchenPlan["interactions"][number]][];
}

interface PlanApiResponse {
  plan: SerializedPlan | null;
  source: "openai" | "profile";
  aiAvailable?: boolean;
  error?: string;
}

function newImageNonce(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function deserializePlan(data: SerializedPlan): KitchenPlan {
  return {
    ...data,
    shortcutMap: new Map(data.shortcutMap),
  };
}

export async function fetchAiKitchenPlan(
  dishName: string,
  options: { generateImages?: boolean; fresh?: boolean } = {},
): Promise<{ plan: KitchenPlan; source: "openai" | "profile" }> {
  const res = await fetch("/api/kitchen/plan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify({
      dishName,
      generateImages: options.generateImages !== false,
      preferAi: true,
      fresh: options.fresh !== false,
      nonce: newImageNonce(),
    }),
  });

  const data = (await res.json()) as PlanApiResponse;
  if (!res.ok || !data.plan) {
    throw new Error(data.error ?? `Plan request failed (${res.status})`);
  }

  return {
    plan: deserializePlan(data.plan),
    source: data.source,
  };
}

/** Generate a unique HD scene image for this dish (never served from browser cache). */
export async function fetchDishSceneImages(
  dishName: string,
  plan?: KitchenPlan,
  options: {
    fresh?: boolean;
    includeIngredients?: boolean;
    sceneStyle?: string;
  } = {},
): Promise<KitchenPlan["images"]> {
  const ingredientNames = plan
    ? getPlanIngredients(plan)
        .map((i) => i.label.replace(/^[^\s]+\s/, "").trim())
        .slice(0, 8)
        .join(", ")
    : undefined;

  const res = await fetch("/api/kitchen/scene", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify({
      dishName,
      ...(options.includeIngredients === true && ingredientNames
        ? { ingredientNames }
        : {}),
      fresh: options.fresh !== false,
      includeIngredients: options.includeIngredients === true,
      nonce: newImageNonce(),
      sceneStyle: options.sceneStyle,
    }),
  });

  const data = (await res.json()) as {
    images?: KitchenPlan["images"];
    error?: string;
  };

  if (!res.ok || !data.images?.sceneDataUrl) {
    throw new Error(data.error ?? `Scene image failed (${res.status})`);
  }

  return data.images;
}

export async function enrichPlanWithSceneImages(
  plan: KitchenPlan,
  options: { fresh?: boolean; sceneStyle?: string } = {},
): Promise<KitchenPlan> {
  const images = await fetchDishSceneImages(plan.order.label, plan, {
    fresh: options.fresh !== false,
    includeIngredients: false,
    sceneStyle: options.sceneStyle,
  });
  return { ...plan, images, source: plan.source ?? "openai" };
}

export { newImageNonce };
