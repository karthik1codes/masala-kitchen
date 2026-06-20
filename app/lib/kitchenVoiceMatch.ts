import type { KitchenInteraction } from "./kitchen";
import type { KitchenPlan } from "./kitchenCustom";
import { getNextRecipeStepId, getRecipeStepMeta } from "./kitchenPrepGuide";

const NEXT_PHRASES = [
  "next",
  "continue",
  "go",
  "done",
  "ok",
  "okay",
  "yes",
  "proceed",
  "start",
  "karo",
  "haan",
  "han",
  "aage",
  "shuru",
  "chalo",
  "ready",
];

const NUMBER_WORDS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  ek: 1,
  do: 2,
  teen: 3,
  char: 4,
  paanch: 5,
  chhe: 6,
  saat: 7,
  aath: 8,
  nau: 9,
  das: 10,
};

function normalizeSpeech(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripEmoji(label: string): string {
  return label.replace(/^[^\w]*\s*/, "").trim();
}

function tokens(text: string): string[] {
  return text.split(/\s+/).filter((t) => t.length >= 2);
}

function parseStepNumber(normalized: string): number | null {
  const stepMatch = normalized.match(/\b(?:step|number|no)\s*(\d+|one|two|three|four|five|six|seven|eight|nine|ten|ek|do|teen|char|paanch|chhe|saat|aath|nau|das)\b/);
  if (!stepMatch) return null;
  const raw = stepMatch[1];
  if (/^\d+$/.test(raw)) return parseInt(raw, 10);
  return NUMBER_WORDS[raw] ?? null;
}

function isNextPhrase(normalized: string): boolean {
  if (NEXT_PHRASES.some((p) => normalized === p || normalized.startsWith(`${p} `))) {
    return true;
  }
  return /\b(next step|continue|go ahead|step complete)\b/.test(normalized);
}

function scoreMatch(normalized: string, item: KitchenInteraction): number {
  const label = stripEmoji(item.label).toLowerCase();
  const labelParts = tokens(label);
  const idParts = tokens(item.id.replace(/-/g, " "));
  let score = 0;

  if (normalized.includes(label)) score += 100;

  for (const part of labelParts) {
    if (part.length >= 3 && normalized.includes(part)) score += 15;
  }

  for (const part of idParts) {
    if (part.length >= 3 && normalized.includes(part)) score += 10;
  }

  if (item.shortcut && normalized === item.shortcut.toLowerCase()) {
    score += 80;
  }

  if (item.shortcut && new RegExp(`\\b${item.shortcut}\\b`).test(normalized)) {
    score += 40;
  }

  return score;
}

export function voiceHintForNextStep(plan: KitchenPlan, nextStepId?: string): string {
  if (!nextStepId) return 'Say "next" when a step is ready';
  const meta = getRecipeStepMeta(plan, nextStepId);
  if (!meta) return 'Say "next"';
  const short = meta.shortLabel;
  return `Say "next" or "${short}"`;
}

export function resolveVoiceToInteraction(
  transcript: string,
  plan: KitchenPlan,
  completedStepIds: string[],
): KitchenInteraction | null {
  const normalized = normalizeSpeech(transcript);
  if (!normalized) return null;

  const nextStepId = getNextRecipeStepId(plan, completedStepIds);
  const nextItem = nextStepId
    ? plan.interactions.find((i) => i.id === nextStepId)
    : undefined;

  if (nextItem && isNextPhrase(normalized)) {
    return nextItem;
  }

  const spokenStep = parseStepNumber(normalized);
  if (spokenStep !== null && nextItem) {
    const meta = getRecipeStepMeta(plan, nextItem.id);
    if (meta?.number === spokenStep) return nextItem;
  }

  const recipeItems = plan.order.idealStepIds
    .map((id) => plan.interactions.find((i) => i.id === id))
    .filter(Boolean) as KitchenInteraction[];

  let best: KitchenInteraction | null = null;
  let bestScore = 0;

  for (const item of recipeItems) {
    const score = scoreMatch(normalized, item);
    if (score > bestScore) {
      bestScore = score;
      best = item;
    }
  }

  if (best && bestScore >= 15) return best;
  return null;
}
