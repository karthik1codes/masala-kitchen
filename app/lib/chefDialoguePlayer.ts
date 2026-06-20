"use client";

import type { DialogueLine } from "./kitchenDialogue";
import {
  buildOrderCallDialogue,
  buildServeTooEarlyDialogue,
  buildWrongStepDialogue,
} from "./kitchenDialogue";
import type { KitchenPlan } from "./kitchenCustom";
import { playChefChatterBurst } from "./kitchenAudio";

const CHUNK_SYNC_TIMEOUT_MS = 9000;

let currentAudio: HTMLAudioElement | null = null;
let currentObjectUrl: string | null = null;
let inflight: AbortController | null = null;
let sequentialAbort = false;

const blobCache = new Map<string, string>();
const sequentialCache = new Map<string, { parts: string[]; contentType: string }>();

type DialoguePayload =
  | { kind: "sequential"; parts: string[]; contentType: string }
  | { kind: "blob"; url: string };

interface PendingSync {
  expectedPrompt: string;
  prefetch: Promise<DialoguePayload | null>;
  timeoutId: ReturnType<typeof setTimeout>;
}

let pendingSync: PendingSync | null = null;

function cacheKey(dishName: string, interactionId?: string): string {
  const base = dishName.trim().toLowerCase();
  return interactionId ? `${base}:${interactionId}` : base;
}

function revokeObjectUrl(url: string | null) {
  if (url) URL.revokeObjectURL(url);
}

function stopCurrentPlayback() {
  sequentialAbort = true;
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.src = "";
    currentAudio.onended = null;
    currentAudio = null;
  }
}

function stopInflightFetch() {
  inflight?.abort();
  inflight = null;
}

export function stopChefDialogue() {
  cancelSyncedChefDialogue();
  stopInflightFetch();
  stopCurrentPlayback();
}

export function cancelSyncedChefDialogue() {
  if (!pendingSync) return;
  clearTimeout(pendingSync.timeoutId);
  pendingSync = null;
}

function promptsMatch(active: string, expected: string): boolean {
  return active.trim() === expected.trim();
}

function base64ToBlob(base64: string, contentType: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: contentType });
}

async function playSequentialParts(
  parts: string[],
  contentType: string,
): Promise<void> {
  sequentialAbort = false;

  for (const part of parts) {
    if (sequentialAbort) return;

    const url = URL.createObjectURL(base64ToBlob(part, contentType));
    currentObjectUrl = url;
    currentAudio = new Audio(url);
    currentAudio.volume = getChefDialogueVolume();

    await new Promise<void>((resolve, reject) => {
      if (!currentAudio) {
        resolve();
        return;
      }
      currentAudio.onended = () => {
        revokeObjectUrl(url);
        resolve();
      };
      currentAudio.onerror = () => {
        revokeObjectUrl(url);
        reject(new Error("Audio playback failed"));
      };
      void currentAudio.play().catch(reject);
    });
  }
}

interface SequentialResponse {
  sequential: true;
  parts: string[];
  contentType: string;
}

function isSequentialResponse(data: unknown): data is SequentialResponse {
  return (
    typeof data === "object" &&
    data !== null &&
    (data as SequentialResponse).sequential === true &&
    Array.isArray((data as SequentialResponse).parts)
  );
}

async function fetchDialoguePayload(
  dishName: string,
  options?: {
    lines?: DialogueLine[];
    interactionId?: string;
    signal?: AbortSignal;
  },
): Promise<DialoguePayload | null> {
  const dish = dishName.trim();
  if (!dish) return null;

  const key = cacheKey(dish, options?.interactionId);
  const cachedSeq = sequentialCache.get(key);
  if (cachedSeq) {
    return { kind: "sequential", ...cachedSeq };
  }

  const cachedBlob = blobCache.get(key);
  if (cachedBlob) {
    return { kind: "blob", url: cachedBlob };
  }

  const body = options?.lines?.length
    ? { lines: options.lines, dishName: dish }
    : { dishName: dish };

  const res = await fetch("/api/elevenlabs/dialogue", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: options?.signal,
  }).catch(() => null);

  if (!res) return null;

  if (!res.ok) return null;

  const contentType = res.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const data = (await res.json()) as unknown;
    if (!isSequentialResponse(data)) return null;
    sequentialCache.set(key, {
      parts: data.parts,
      contentType: data.contentType,
    });
    return {
      kind: "sequential",
      parts: data.parts,
      contentType: data.contentType,
    };
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  blobCache.set(key, url);
  return { kind: "blob", url };
}

async function playDialoguePayload(payload: DialoguePayload): Promise<boolean> {
  stopCurrentPlayback();

  try {
    if (payload.kind === "sequential") {
      await playSequentialParts(payload.parts, payload.contentType);
      return true;
    }

    currentObjectUrl = payload.url;
    currentAudio = new Audio(payload.url);
    currentAudio.volume = getChefDialogueVolume();
    currentAudio.onended = () => {
      if (currentObjectUrl === payload.url) currentObjectUrl = null;
    };
    await currentAudio.play();
    return true;
  } catch {
    return false;
  }
}

async function flushPendingSync(fallbackSynth: boolean): Promise<void> {
  const pending = pendingSync;
  if (!pending) return;

  pendingSync = null;
  clearTimeout(pending.timeoutId);

  const payload = await pending.prefetch;
  if (!payload) {
    return;
  }

  const played = await playDialoguePayload(payload);
  if (!played && fallbackSynth) await playChefChatterBurst("high");
}

/** Prefetch dialogue, then play after the matching video chunk completes. */
export function scheduleSyncedChefDialogue(params: {
  dishName: string;
  expectedPrompt: string;
  lines?: DialogueLine[];
  interactionId?: string;
  fallbackSynth?: boolean;
}): void {
  cancelSyncedChefDialogue();
  stopInflightFetch();

  const controller = new AbortController();
  inflight = controller;

  const prefetch = fetchDialoguePayload(params.dishName, {
    lines: params.lines,
    interactionId: params.interactionId,
    signal: controller.signal,
  }).catch(() => null);

  const fallbackSynth = params.fallbackSynth === true;

  pendingSync = {
    expectedPrompt: params.expectedPrompt,
    prefetch,
    timeoutId: setTimeout(() => {
      void flushPendingSync(fallbackSynth);
    }, CHUNK_SYNC_TIMEOUT_MS),
  };
}

/** Call when LingBot emits chunk_complete — plays dialogue once scene matches. */
export function notifyVideoChunkComplete(activePrompt: string): void {
  if (!pendingSync) return;
  if (!promptsMatch(activePrompt, pendingSync.expectedPrompt)) return;
  void flushPendingSync(false);
}

export async function playChefDialogue(
  dishName: string,
  options?: {
    fallbackSynth?: boolean;
    lines?: DialogueLine[];
    interactionId?: string;
    syncToVideo?: boolean;
    expectedPrompt?: string;
  },
): Promise<"played" | "cached" | "scheduled" | "fallback" | "skipped" | "failed"> {
  const dish = dishName.trim();
  if (!dish) return "skipped";

  if (options?.syncToVideo && options.expectedPrompt) {
    scheduleSyncedChefDialogue({
      dishName: dish,
      expectedPrompt: options.expectedPrompt,
      lines: options.lines,
      interactionId: options.interactionId,
      fallbackSynth: options.fallbackSynth,
    });
    return "scheduled";
  }

  cancelSyncedChefDialogue();
  stopInflightFetch();
  stopCurrentPlayback();

  const controller = new AbortController();
  inflight = controller;
  sequentialAbort = false;

  try {
    const payload = await fetchDialoguePayload(dish, {
      lines: options?.lines,
      interactionId: options?.interactionId,
      signal: controller.signal,
    });

    if (!payload) {
      if (options?.fallbackSynth === true) {
        await playChefChatterBurst("high");
        return "fallback";
      }
      return "failed";
    }

    if (controller.signal.aborted || sequentialAbort) return "skipped";

    const key = cacheKey(dish, options?.interactionId);
    const wasCached =
      sequentialCache.has(key) || blobCache.has(key);

    const played = await playDialoguePayload(payload);
    if (!played) {
      if (options?.fallbackSynth === true) {
        await playChefChatterBurst("high");
        return "fallback";
      }
      return "failed";
    }

    return wasCached ? "cached" : "played";
  } catch (e) {
    if ((e as Error).name === "AbortError") return "skipped";
    if (options?.fallbackSynth === true) {
      await playChefChatterBurst("high");
      return "fallback";
    }
    return "failed";
  } finally {
    if (inflight === controller) inflight = null;
  }
}

let dialogueVolume = 0.85;

export function setChefDialogueVolume(v: number) {
  dialogueVolume = Math.max(0, Math.min(1, v));
  if (currentAudio) currentAudio.volume = dialogueVolume;
}

export function getChefDialogueVolume(): number {
  return dialogueVolume;
}

export interface ChefDialogueStatus {
  configured: boolean;
  provider?: "sarvam" | "elevenlabs";
  label?: string;
}

export async function checkChefDialogueConfigured(): Promise<ChefDialogueStatus> {
  try {
    const res = await fetch("/api/elevenlabs/dialogue").catch(() => null);
    if (!res?.ok) return { configured: false };
    const data = (await res.json()) as {
      configured?: boolean;
      provider?: "sarvam" | "elevenlabs";
      speakers?: { chef1?: string; chef2?: string; chef3?: string };
    };
    if (!data.configured) return { configured: false, provider: data.provider };

    if (data.provider === "sarvam" && data.speakers) {
      const { chef1, chef2, chef3 } = data.speakers;
      return {
        configured: true,
        provider: "sarvam",
        label: `Sarvam · ${chef1}, ${chef2}, ${chef3}`,
      };
    }

    return {
      configured: true,
      provider: data.provider ?? "elevenlabs",
      label: "ElevenLabs · 3 chef voices",
    };
  } catch {
    return { configured: false };
  }
}

/** @deprecated use checkChefDialogueConfigured */
export async function checkElevenLabsConfigured(): Promise<boolean> {
  const status = await checkChefDialogueConfigured();
  return status.configured;
}

export function isSyncedDialoguePending(): boolean {
  return pendingSync !== null;
}

/** Play the order-ticket call — announces dish and recipe step sequence. */
export function playOrderCallDialogue(plan: KitchenPlan): void {
  const lines = buildOrderCallDialogue(plan);
  void playChefDialogue(plan.order.label, {
    lines,
    interactionId: `order-call-${plan.order.id}`,
  });
}

/** Stop kitchen audio and play a game-rule warning (wrong step, serve too early). */
export function playGameWarningDialogue(
  plan: KitchenPlan,
  lines: DialogueLine[],
  reason: "wrong-step" | "serve-blocked",
): ReturnType<typeof playChefDialogue> {
  stopChefDialogue();
  return playChefDialogue(plan.order.label, {
    lines,
    interactionId: `${reason}-${plan.order.id}-${Date.now()}`,
  });
}

export function playWrongStepDialogue(
  plan: KitchenPlan,
  expected: { number: number; shortLabel: string },
): ReturnType<typeof playChefDialogue> {
  return playGameWarningDialogue(
    plan,
    buildWrongStepDialogue(plan, expected),
    "wrong-step",
  );
}

export function playServeTooEarlyDialogue(
  plan: KitchenPlan,
  pendingCount: number,
): ReturnType<typeof playChefDialogue> {
  return playGameWarningDialogue(
    plan,
    buildServeTooEarlyDialogue(plan, pendingCount),
    "serve-blocked",
  );
}
