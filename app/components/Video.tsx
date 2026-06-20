"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  LingbotMainVideoView,
  useLingbotChunkComplete,
} from "@reactor-models/lingbot";
import { MovementControls } from "./MovementControls";

const MIN_SPEED = 0.5;
const MAX_SPEED = 2.5;
const DEFAULT_SPEED = 1;

export function Video() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [speed, setSpeed] = useState(DEFAULT_SPEED);

  const applySpeed = useCallback((rate: number) => {
    const root = containerRef.current;
    if (!root) return;
    for (const video of root.querySelectorAll("video")) {
      if (video.playbackRate !== rate) {
        video.playbackRate = rate;
      }
    }
  }, []);

  useEffect(() => {
    applySpeed(speed);
  }, [speed, applySpeed]);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    const observer = new MutationObserver(() => applySpeed(speed));
    observer.observe(root, { childList: true, subtree: true, attributes: true });

    return () => observer.disconnect();
  }, [speed, applySpeed]);

  useLingbotChunkComplete(() => {
    applySpeed(speed);
  });

  return (
    <div className="flex h-full min-h-[40vh] flex-col gap-2 lg:min-h-0">
      <div
        ref={containerRef}
        className="relative min-h-0 flex-1 overflow-hidden rounded-lg border border-zinc-800 bg-black"
      >
        <LingbotMainVideoView className="h-full w-full" videoObjectFit="contain" />
      </div>

      <div className="shrink-0 rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <label
            htmlFor="video-speed"
            className="text-[10px] uppercase tracking-wider text-zinc-500"
          >
            Video speed
          </label>
          <span className="font-mono text-[11px] text-brand">{speed.toFixed(1)}×</span>
        </div>
        <input
          id="video-speed"
          type="range"
          min={MIN_SPEED}
          max={MAX_SPEED}
          step={0.1}
          value={speed}
          onChange={(e) => setSpeed(Number(e.target.value))}
          className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-zinc-800 accent-brand"
        />
        <div className="mt-1 flex justify-between text-[9px] text-zinc-600">
          <span>{MIN_SPEED}× slow</span>
          <span>1×</span>
          <span>{MAX_SPEED}× fast</span>
        </div>
      </div>

      <MovementControls />
    </div>
  );
}
