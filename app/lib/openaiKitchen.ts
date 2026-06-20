import "server-only";

import type { KitchenPlan } from "./kitchenCustom";
import { buildKitchenPlanFromAi, type AiKitchenPlanPayload } from "./kitchenPlanFromAi";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY?.trim();
const OPENAI_MODEL = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
const OPENAI_IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL?.trim() || "gpt-image-1";
const OPENAI_IMAGE_SIZE = process.env.OPENAI_IMAGE_SIZE?.trim() || "";
const OPENAI_IMAGE_QUALITY = process.env.OPENAI_IMAGE_QUALITY?.trim() || "medium";

interface CachedEntry {
  expires: number;
  plan: KitchenPlan;
}

const planCache = new Map<string, CachedEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000;

export function isOpenAiKitchenEnabled(): boolean {
  return Boolean(OPENAI_API_KEY);
}

function planCacheKey(dishName: string, withImages: boolean): string {
  return `${dishName.trim().toLowerCase()}|img:${withImages ? "1" : "0"}`;
}

function isDallE3(): boolean {
  return OPENAI_IMAGE_MODEL.includes("dall-e-3");
}

function isGptImageModel(): boolean {
  return OPENAI_IMAGE_MODEL.includes("gpt-image");
}

function imageGenerationSize(): string {
  if (OPENAI_IMAGE_SIZE) return OPENAI_IMAGE_SIZE;
  if (isGptImageModel()) return "1024x1024";
  if (isDallE3()) return "1792x1024";
  return "1024x1024";
}

function gptImageQuality(): string {
  const q = OPENAI_IMAGE_QUALITY.toLowerCase();
  if (q === "hd" || q === "high") return "high";
  if (q === "low" || q === "medium") return q;
  return "medium";
}

async function openAiChatJson<T>(system: string, user: string): Promise<T> {
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.4,
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI chat failed (${res.status}): ${errText.slice(0, 300)}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenAI returned empty plan content");
  return JSON.parse(content) as T;
}

async function openAiImage(prompt: string): Promise<string> {
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const started = Date.now();
  const body: Record<string, unknown> = {
    model: OPENAI_IMAGE_MODEL,
    prompt: prompt.slice(0, 950),
    n: 1,
    size: imageGenerationSize(),
  };

  if (isDallE3()) {
    body.quality = OPENAI_IMAGE_QUALITY === "hd" ? "hd" : "standard";
    body.response_format = "b64_json";
  } else if (isGptImageModel()) {
    body.quality = gptImageQuality();
    body.output_format = "jpeg";
    body.output_compression = 85;
  } else {
    body.response_format = "b64_json";
  }

  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI image failed (${res.status}): ${errText.slice(0, 300)}`);
  }

  const data = (await res.json()) as {
    data?: { b64_json?: string; url?: string }[];
  };
  const item = data.data?.[0];
  const mime = isGptImageModel() ? "image/jpeg" : "image/png";

  if (item?.b64_json) {
    console.info(
      `[openaiKitchen] image ready in ${Date.now() - started}ms (${body.size}, ${body.quality ?? "default"})`,
    );
    return `data:${mime};base64,${item.b64_json}`;
  }
  if (item?.url) {
    const imgRes = await fetch(item.url, { cache: "no-store" });
    if (!imgRes.ok) throw new Error("Could not download generated image URL");
    const buf = Buffer.from(await imgRes.arrayBuffer());
    console.info(`[openaiKitchen] image ready in ${Date.now() - started}ms (url fetch)`);
    return `data:${mime};base64,${buf.toString("base64")}`;
  }
  throw new Error("OpenAI returned no image data");
}

const PLAN_SYSTEM = `You are an expert Indian chef and kitchen planner for a restaurant simulation game.
Return ONLY valid JSON matching this schema:
{
  "dishName": string,
  "timeLimitSec": number (60-180, dish-specific — chai/filter coffee 60-70, street snacks/pav bhaji 75-85, dosa/paratha 85-95, curries 95-115, biryani/layered rice 120-150, full thali 110-130),
  "ingredients": [{ "id": string (kebab-case), "label": string (emoji + English name), "sound": "chop"|"sizzle"|"pop"|"whistle"|"pour"|"ding"|"cheer"|"flame"|"click"|"chatter", "action": string (1 sentence visual scene for AI video) }],
  "equipment": [{ "id", "label", "sound", "action" }],
  "cooking": [{ "id", "label", "sound", "action" }],
  "plating": [{ "id", "label", "sound", "action" }],
  "idealStepIds": ["id-from-ingredients", "id-from-equipment", "id-from-cooking", "id-from-plating", ...] (ordered prep checklist using exact id fields above, do NOT include serve-customer),
  "hindiDialogues": { "<step-id>": ["Hindi line 1", "Hindi line 2"] }
}
Rules:
- 5-8 ingredients, 3-5 equipment, 4-6 cooking, 2-3 plating steps
- idealStepIds MUST list the player checklist in exact kitchen workflow order — pick the most important steps from your ingredients/equipment/cooking/plating arrays (typically all ingredients in order, then key equipment, then all cooking, then plating)
- Authentic Indian kitchen workflow for the exact dish requested
- Labels start with a relevant emoji
- Actions describe what chefs visibly do (for generative video)
- hindiDialogues: 2 short Hinglish/Hindi lines per step id (ingredients + cooking at minimum)
- id must be unique kebab-case within each category`;

const SCENE_ANGLES = [
  "Over-the-shoulder at the stainless pass, chef hands sliding the plated dish forward",
  "Wide 24mm shot of the full six-burner stove line with multiple chefs in motion",
  "Extreme close-up macro on the tawa or kadhai with visible steam and oil shimmer",
  "45-degree documentary angle at the prep board with chopped aromatics and steel bowls",
  "Low hero angle on open blue gas flame with chef silhouette above the pan",
  "High overhead view of the counter with mise en place bowls arranged in a row",
  "Through the pass window with dining room bokeh beyond the kitchen",
  "Street-counter energy with warm neon spill on a sizzling tawa",
] as const;

function pickSceneAngle(nonce: string): string {
  let hash = 0;
  for (let i = 0; i < nonce.length; i++) {
    hash = (hash + nonce.charCodeAt(i) * (i + 1)) % SCENE_ANGLES.length;
  }
  return SCENE_ANGLES[hash] ?? SCENE_ANGLES[0];
}

function scenePrompt(
  dish: string,
  nonce: string,
  sceneStyle?: string,
  ingredientNames?: string,
): string {
  const order = dish.trim();
  const angle = sceneStyle?.trim() || pickSceneAngle(nonce);
  const ingredients = ingredientNames?.trim();
  const ingredientBit = ingredients
    ? ` Ingredients for this order visible on the counter: ${ingredients}.`
    : "";

  return [
    `Photorealistic INDIAN RESTAURANT KITCHEN with tawa, kadhai, steel thalis, masala dabba, blue flames, steam.`,
    `CUSTOM ORDER: chefs cooking "${order}" — "${order}" visible on pass or stove.`,
    angle + ".",
    `White-uniform brigade prepares ${order}.${ingredientBit} Ref ${nonce.slice(-8)}. No text or logos.`,
  ].join(" ");
}

function ingredientsPrompt(dish: string, ingredientNames: string, nonce: string): string {
  const order = dish.trim();
  return [
    `Top-down mise en place inside an INDIAN KITCHEN on a steel counter.`,
    `Custom order "${order}" — all ingredients needed to cook ${order}: ${ingredientNames}.`,
    `Fresh, colorful, organized in small bowls. Ref ${nonce}. Photorealistic, no text labels, no watermark.`,
  ].join(" ");
}

export async function generateDishSceneImages(
  dishName: string,
  options: {
    ingredientNames?: string;
    includeIngredients?: boolean;
    fresh?: boolean;
    nonce?: string;
    sceneStyle?: string;
  } = {},
): Promise<NonNullable<KitchenPlan["images"]>> {
  const dish = dishName.trim();
  if (!dish) throw new Error("Dish name is required");
  if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured");

  const nonce =
    options.nonce?.trim() ||
    `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

  const ingredientHint = options.ingredientNames?.trim() ?? "";

  const scenePromise = openAiImage(
    scenePrompt(dish, nonce, options.sceneStyle, ingredientHint || undefined),
  );

  let ingredientsDataUrl: string | undefined;
  if (options.includeIngredients === true && ingredientHint) {
    const [sceneDataUrl, ingredientsResult] = await Promise.all([
      scenePromise,
      openAiImage(ingredientsPrompt(dish, ingredientHint, nonce)).catch((e) => {
        console.warn("[openaiKitchen] ingredients image failed:", e);
        return undefined;
      }),
    ]);
    ingredientsDataUrl = ingredientsResult;
    return { sceneDataUrl, ingredientsDataUrl };
  }

  const sceneDataUrl = await scenePromise;
  return { sceneDataUrl, ingredientsDataUrl };
}

export async function generateAiKitchenPlan(
  dishName: string,
  options: {
    generateImages?: boolean;
    fresh?: boolean;
    nonce?: string;
  } = {},
): Promise<KitchenPlan> {
  const dish = dishName.trim();
  if (!dish) throw new Error("Dish name is required");

  const withImages = options.generateImages !== false;
  const fresh = options.fresh !== false;
  const nonce =
    options.nonce?.trim() ||
    `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  const key = planCacheKey(dish, withImages);

  if (!fresh) {
    const cached = planCache.get(key);
    if (cached && cached.expires > Date.now()) {
      return cached.plan;
    }
  }

  const aiPayload = await openAiChatJson<AiKitchenPlanPayload>(
    PLAN_SYSTEM,
    `Create a full kitchen prep and cook plan for: "${dish}"`,
  );

  const ingredientNames = aiPayload.ingredients
    .map((i) => i.label.replace(/^[^\s]+\s/, "").trim())
    .slice(0, 8)
    .join(", ");

  let images: KitchenPlan["images"];
  if (withImages) {
    images = await generateDishSceneImages(dish, {
      ingredientNames,
      includeIngredients: false,
      fresh: true,
      nonce,
    });
  }

  const plan = buildKitchenPlanFromAi(dish, aiPayload, images);

  if (!fresh) {
    planCache.set(key, { expires: Date.now() + CACHE_TTL_MS, plan });
  }
  return plan;
}
