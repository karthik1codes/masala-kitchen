// Scene registry for LingBot image starters.

import { KITCHEN_SCENE } from "./kitchen";
import { KITCHEN_OPENING_SCENES, kitchenOpeningPrompt } from "./kitchenVisuals";

export interface Prompt {
  title: string;
  text: string;
}

export interface Scene {
  id: string;
  label: string;
  initial: Prompt;
  imageUrl: string;
}

export const SCENES: ReadonlyArray<Scene> = [
  {
    id: KITCHEN_SCENE.id,
    label: KITCHEN_SCENE.label,
    imageUrl: KITCHEN_SCENE.imageUrl,
    initial: KITCHEN_SCENE.initial,
  },
  ...KITCHEN_OPENING_SCENES.map((opening) => ({
    id: opening.id,
    label: opening.label,
    imageUrl: opening.imageUrl,
    initial: {
      title: opening.label,
      text: kitchenOpeningPrompt(opening),
    },
  })),
];

export const IMAGE_SCENES: ReadonlyArray<Scene> = SCENES;

export function findSceneForPrompt(
  prompt: string | null | undefined,
): Scene | null {
  if (!prompt) return null;
  return SCENES.find((s) => s.initial.text === prompt) ?? null;
}
