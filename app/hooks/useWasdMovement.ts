"use client";

import { useCallback, useEffect, useRef } from "react";
import { useLingbot } from "@reactor-models/lingbot";

export const WASD_KEYS = new Set(["w", "a", "s", "d"]);

type Movement = "idle" | "forward" | "back" | "strafe_left" | "strafe_right";

function movementFromKeys(keys: Set<string>): Movement {
  if (keys.has("w")) return "forward";
  if (keys.has("s")) return "back";
  if (keys.has("a")) return "strafe_left";
  if (keys.has("d")) return "strafe_right";
  return "idle";
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  return (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.isContentEditable
  );
}

/** Hold W/A/S/D to walk through the LingBot kitchen scene. */
export function useWasdMovement(enabled: boolean) {
  const { setMovement } = useLingbot();
  const keysRef = useRef(new Set<string>());
  const movementRef = useRef<Movement>("idle");

  const syncMovement = useCallback(() => {
    const next = movementFromKeys(keysRef.current);
    if (next === movementRef.current) return;
    movementRef.current = next;
    void setMovement({ movement: next });
  }, [setMovement]);

  const stopMovement = useCallback(() => {
    keysRef.current.clear();
    if (movementRef.current === "idle") return;
    movementRef.current = "idle";
    void setMovement({ movement: "idle" });
  }, [setMovement]);

  useEffect(() => {
    if (!enabled) {
      stopMovement();
      return;
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      const key = e.key.toLowerCase();
      if (!WASD_KEYS.has(key)) return;
      if (keysRef.current.has(key)) return;
      keysRef.current.add(key);
      e.preventDefault();
      syncMovement();
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (!WASD_KEYS.has(key)) return;
      keysRef.current.delete(key);
      syncMovement();
    };

    const onBlur = () => stopMovement();

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      stopMovement();
    };
  }, [enabled, syncMovement, stopMovement]);
}
