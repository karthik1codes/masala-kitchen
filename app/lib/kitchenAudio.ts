export type KitchenSound =
  | "chop"
  | "sizzle"
  | "pop"
  | "whistle"
  | "pour"
  | "ding"
  | "cheer"
  | "flame"
  | "click"
  | "chatter";

/** Kitchen synth effects are disabled — no-op stubs keep imports stable. */
export async function playKitchenSound(_sound: KitchenSound): Promise<void> {}

export async function playChefChatterBurst(
  _intensity: "low" | "medium" | "high" = "medium",
): Promise<void> {}

export async function startKitchenAmbient(): Promise<void> {}

export function stopKitchenAmbient(): void {}

export function setKitchenMuted(_next: boolean): void {}

export function setKitchenVolume(_next: number): void {}

export function setChefChatterEnabled(_next: boolean): void {}

export function getKitchenAudioState() {
  return { muted: true, volume: 0, chefChatterEnabled: false };
}
