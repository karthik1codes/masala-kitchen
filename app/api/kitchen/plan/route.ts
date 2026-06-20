import { NextResponse } from "next/server";
import { buildCustomKitchenPlan } from "../../../lib/kitchenCustom";
import {
  generateAiKitchenPlan,
  generateDishSceneImages,
  isOpenAiKitchenEnabled,
} from "../../../lib/openaiKitchen";

export const maxDuration = 120;

function serializePlan(plan: ReturnType<typeof buildCustomKitchenPlan>) {
  if (!plan) return null;
  return {
    ...plan,
    shortcutMap: [...plan.shortcutMap.entries()],
  };
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      dishName?: string;
      generateImages?: boolean;
      preferAi?: boolean;
      fresh?: boolean;
      nonce?: string;
    };

    const dishName = body.dishName?.trim();
    if (!dishName) {
      return NextResponse.json({ error: "dishName is required" }, { status: 400 });
    }

    const generateImages = body.generateImages !== false;
    const preferAi = body.preferAi !== false;
    const fresh = body.fresh !== false;
    const nonce = body.nonce?.trim() || String(Date.now());

    if (preferAi && isOpenAiKitchenEnabled()) {
      try {
        const plan = await generateAiKitchenPlan(dishName, {
          generateImages,
          fresh,
          nonce,
        });
        return NextResponse.json({
          plan: serializePlan(plan),
          source: "openai",
        });
      } catch (e) {
        console.error("[kitchen/plan] OpenAI failed, falling back to profile:", e);
      }
    }

    const fallback = buildCustomKitchenPlan(dishName);
    if (!fallback) {
      return NextResponse.json({ error: "Invalid dish name" }, { status: 400 });
    }

    if (generateImages && isOpenAiKitchenEnabled()) {
      try {
        const ingredientNames = fallback.interactions
          .filter((i) => i.category === "ingredients")
          .map((i) => i.label.replace(/^[^\s]+\s/, "").trim())
          .slice(0, 8)
          .join(", ");
        const images = await generateDishSceneImages(dishName, {
          ingredientNames,
          fresh: true,
          nonce,
          includeIngredients: false,
        });
        fallback.images = images;
      } catch (e) {
        console.warn("[kitchen/plan] fallback scene images failed:", e);
      }
    }

    return NextResponse.json({
      plan: serializePlan(fallback),
      source: "profile",
      aiAvailable: isOpenAiKitchenEnabled(),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Kitchen plan failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
