import { NextResponse } from "next/server";
import {
  generateDishSceneImages,
  isOpenAiKitchenEnabled,
} from "../../../lib/openaiKitchen";

export const maxDuration = 120;

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      dishName?: string;
      ingredientNames?: string;
      fresh?: boolean;
      includeIngredients?: boolean;
      nonce?: string;
      sceneStyle?: string;
    };

    const dishName = body.dishName?.trim();
    if (!dishName) {
      return NextResponse.json({ error: "dishName is required" }, { status: 400 });
    }

    if (!isOpenAiKitchenEnabled()) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is not configured", aiAvailable: false },
        { status: 503 },
      );
    }

    const nonce = body.nonce?.trim() || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const started = Date.now();
    const includeIngredients = body.includeIngredients === true;

    const images = await generateDishSceneImages(dishName, {
      ingredientNames: includeIngredients ? body.ingredientNames : undefined,
      includeIngredients,
      fresh: body.fresh !== false,
      nonce,
      sceneStyle: body.sceneStyle,
    });

    console.info(`[kitchen/scene] ${dishName} in ${Date.now() - started}ms`);

    return NextResponse.json({ images, aiAvailable: true, nonce });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Scene image generation failed";
    console.error("[kitchen/scene]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
