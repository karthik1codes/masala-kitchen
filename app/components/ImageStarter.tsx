"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  useLingbot,
  useLingbotState,
  useLingbotImageAccepted,
  type LingbotStateMessage,
} from "@reactor-models/lingbot";
import { IMAGE_SCENES, type Scene } from "../lib/prompts";
import { pickClosestOpeningScene, sceneCameraHintForDish, sceneCameraHintForScene } from "../lib/kitchenSceneMatch";
import { toReactorImageBlob } from "../lib/rasterizeImage";
import { playOrderCallDialogue } from "../lib/chefDialoguePlayer";
import { fetchDishSceneImages } from "../lib/kitchenAiClient";
import { useKitchenPlan } from "../context/KitchenPlanContext";

const SEED_IMAGE_OPTS = { maxWidth: 1792, maxHeight: 1024, quality: 0.95 };

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return res.blob();
}

export function ImageStarter() {
  const { plan, planLoading, planError, orderRevision } = useKitchenPlan();
  const { status, uploadFile, setImage, setPrompt, start, reset } = useLingbot();
  const [snapshot, setSnapshot] = useState<LingbotStateMessage | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const imageReadyRef = useRef<(() => void) | null>(null);
  const startingRef = useRef(false);
  const lastOrderRevisionRef = useRef(orderRevision);

  useLingbotState((msg) => setSnapshot(msg));

  useLingbotImageAccepted(() => {
    if (imageReadyRef.current) {
      imageReadyRef.current();
      imageReadyRef.current = null;
    }
  });

  useEffect(() => {
    if (status !== "ready") setSnapshot(null);
  }, [status]);

  useEffect(() => {
    setPreviewUrl(null);
  }, [orderRevision]);

  /** New order → reset LingBot so we upload a fresh seed image (never reuse the last one). */
  useEffect(() => {
    if (orderRevision === 0) return;
    if (orderRevision === lastOrderRevisionRef.current) return;

    const hadSession =
      lastOrderRevisionRef.current > 0 &&
      (snapshot?.started === true || snapshot?.has_image === true);

    lastOrderRevisionRef.current = orderRevision;
    startingRef.current = false;
    setPreviewUrl(null);
    setError(null);

    if (hadSession) {
      void reset();
    }
  }, [orderRevision, reset, snapshot?.started, snapshot?.has_image]);

  const ready = status === "ready";
  const started = snapshot?.started === true;
  const closestScene = pickClosestOpeningScene(plan.order.label);
  const sceneCameraHint = sceneCameraHintForDish(plan.order.label);

  const startWithBlob = useCallback(
    async (blob: Blob, fileName: string, startPrompt: string) => {
      const jpeg = await toReactorImageBlob(blob, SEED_IMAGE_OPTS);
      const ref = await uploadFile(jpeg, { name: fileName });

      const imageReady = new Promise<void>((resolve) => {
        imageReadyRef.current = resolve;
      });

      await setImage({ image: ref });
      await imageReady;
      await setPrompt({ prompt: startPrompt });
      await start();
      playOrderCallDialogue(plan);
    },
    [uploadFile, setImage, setPrompt, start, plan],
  );

  const startWithFreshSeed = useCallback(
    async (sceneStyle?: string) => {
      setBusy(`Generating unique scene · ${plan.order.label}`);
      setError(null);
      const startPrompt = `Ultrarealistic INDIAN RESTAURANT KITCHEN — busy commercial kitchen with tawa, kadhai, steel thalis, and masala dabba. CUSTOM ORDER: the brigade is actively cooking ${plan.order.label}. ${plan.order.label} is visible on the pass or stove. Steam, flames, warm lighting. Guest ticket for ${plan.order.label} waits at the pass.`;

      try {
        const images = await fetchDishSceneImages(plan.order.label, plan, {
          fresh: true,
          includeIngredients: false,
          sceneStyle,
        });
        if (!images?.sceneDataUrl) {
          throw new Error("OpenAI returned no scene image");
        }

        const sceneDataUrl = images.sceneDataUrl;
        setPreviewUrl(sceneDataUrl);
        const raw = await dataUrlToBlob(sceneDataUrl);
        await startWithBlob(
          raw,
          `${plan.order.id}-${Date.now()}.jpg`,
          startPrompt,
        );
      } catch (e) {
        const msg =
          e instanceof Error
            ? e.message
            : "Could not generate a new scene image";
        setError(msg);
        console.error("[ImageStarter]", e);
        throw e;
      } finally {
        setBusy(null);
      }
    },
    [plan, startWithBlob],
  );

  const startFromSceneStyle = useCallback(
    async (scene: Scene) => {
      setError(null);
      try {
        await startWithFreshSeed(sceneCameraHintForScene(scene.id));
      } catch {
        /* error already set */
      }
    },
    [startWithFreshSeed],
  );

  /** Auto-start with a brand-new DALL-E image when an order is loaded (or after Reset). */
  useEffect(() => {
    if (!ready || started || planLoading || busy || orderRevision === 0) return;
    if (startingRef.current) return;
    if (planError) return;

    startingRef.current = true;
    void startWithFreshSeed(sceneCameraHint).finally(() => {
      startingRef.current = false;
    });
  }, [
    ready,
    started,
    planLoading,
    busy,
    orderRevision,
    planError,
    startWithFreshSeed,
    sceneCameraHint,
  ]);

  async function uploadCustomImage(file: File) {
    setBusy(file.name);
    setError(null);
    try {
      const jpeg = await toReactorImageBlob(file, SEED_IMAGE_OPTS);
      const ref = await uploadFile(jpeg, {
        name: file.name.replace(/\.[^.]+$/, "") + ".jpg",
      });

      const imageReady = new Promise<void>((resolve) => {
        imageReadyRef.current = resolve;
      });

      await setImage({ image: ref });
      await imageReady;
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "Could not upload image";
      setError(msg);
      console.error("[ImageStarter]", e);
    } finally {
      setBusy(null);
    }
  }

  if (ready && started) return null;

  const customImageSet = snapshot?.has_image === true;

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
      <label className="text-[10px] uppercase tracking-wider text-zinc-500">
        Enter the kitchen
      </label>
      <p className="mt-1 text-[10px] text-zinc-600">
        Every new order generates a fresh AI kitchen scene (~45–60s) — never
        reuses the previous image.
      </p>

      {(planLoading || busy) && (
        <p className="mt-2 text-[11px] text-brand animate-pulse">
          {planLoading
            ? "Building order plan from ChatGPT…"
            : busy}
        </p>
      )}

      {(error || planError) && (
        <div className="mt-2 space-y-2">
          <p className="text-[11px] text-red-400">{error ?? planError}</p>
          <button
            type="button"
            disabled={!ready || busy !== null || planLoading}
            onClick={() => void startWithFreshSeed(sceneCameraHint)}
            className="rounded-md border border-red-900/50 px-2 py-1 text-[10px] text-red-300 hover:border-red-700 disabled:opacity-40"
          >
            Retry — generate new image
          </button>
        </div>
      )}

      {previewUrl && (
        <div className="group relative mt-2 aspect-video w-full overflow-hidden rounded-md border border-brand/50 bg-zinc-950">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt={`Unique AI scene for ${plan.order.label}`}
            className="h-full w-full object-cover"
          />
          <span className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent px-2 py-1.5 text-[11px] font-medium text-brand">
            ✨ Unique HD seed · {plan.order.label}
          </span>
        </div>
      )}

      <p className="mt-2 text-[10px] text-zinc-500">
        Style hint: {closestScene.label} (new image each time)
      </p>

      <div className="mt-2 flex flex-wrap gap-1">
        {IMAGE_SCENES.map((scene) => (
          <button
            key={scene.id}
            type="button"
            disabled={!ready || busy !== null || planLoading}
            onClick={() => void startFromSceneStyle(scene)}
            className={`rounded-md border px-2 py-1 text-[10px] transition-colors disabled:opacity-40 ${
              scene.id === closestScene.id
                ? "border-brand/50 bg-brand/10 text-brand"
                : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-brand"
            }`}
          >
            {scene.label}
          </button>
        ))}
      </div>

      <label
        className={`mt-2 flex cursor-pointer items-center justify-center rounded-md border border-dashed border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-400 hover:border-brand hover:text-brand ${
          !ready || busy !== null || planLoading ? "pointer-events-none opacity-40" : ""
        }`}
      >
        {busy
          ? busy
          : customImageSet
            ? "Replace your image"
            : "Upload your own image"}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          disabled={!ready || busy !== null || planLoading}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) uploadCustomImage(file);
            e.target.value = "";
          }}
        />
      </label>
    </div>
  );
}
