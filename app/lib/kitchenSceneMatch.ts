import { matchProfileId } from "./kitchenCustom";
import { IMAGE_SCENES, type Scene } from "./prompts";

/** Map dish profile → best-matching preset opening scene (prompt + seed reference). */
const PROFILE_SCENE_ID: Record<string, string> = {
  "dosa-idli": "indian-kitchen-tawa",
  "biryani-rice": "indian-kitchen-biryani",
  "curry-gravy": "indian-kitchen-kadhai",
  "street-snack": "indian-kitchen-street",
  "bread-roti": "indian-kitchen-tawa",
  beverage: "indian-kitchen-pass",
  "thali-meal": "indian-kitchen-brigade",
  generic: "indian-kitchen-brigade",
};

/** Short camera hint for image gen — not the full LingBot video prompt. */
const SCENE_CAMERA_HINT: Record<string, string> = {
  "indian-kitchen-brigade": "Wide shot of the full stove line with multiple chefs in motion",
  "indian-kitchen-tawa": "Close-up macro on a blazing tawa with steam and oil shimmer",
  "indian-kitchen-biryani": "Low hero angle on handi steam with layered biryani at the pass",
  "indian-kitchen-kadhai": "45-degree angle on a bubbling kadhai with curry splatter",
  "indian-kitchen-street": "Street-counter energy with warm neon on a sizzling tawa",
  "indian-kitchen-pass": "Over-the-shoulder at the stainless pass window",
  "indian-kitchen": "Documentary wide shot of a busy commercial kitchen pass",
};

export function pickClosestOpeningScene(dishName: string): Scene {
  const profileId = matchProfileId(dishName);
  const sceneId = PROFILE_SCENE_ID[profileId] ?? PROFILE_SCENE_ID.generic;
  return IMAGE_SCENES.find((s) => s.id === sceneId) ?? IMAGE_SCENES[0];
}

export function sceneCameraHintForScene(sceneId: string): string | undefined {
  return SCENE_CAMERA_HINT[sceneId];
}

export function sceneCameraHintForDish(dishName: string): string | undefined {
  const scene = pickClosestOpeningScene(dishName);
  return sceneCameraHintForScene(scene.id);
}
