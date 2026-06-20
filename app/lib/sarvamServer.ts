import type { ChefNumber, DialogueLine } from "./kitchenDialogue";

export interface SarvamVoiceMap {
  1: string;
  2: string;
  3: string;
}

export interface SarvamDialogueInput {
  text: string;
  speaker: string;
}

const DEFAULT_SPEAKERS: SarvamVoiceMap = {
  1: "shubh",
  2: "ratan",
  3: "sumit",
};

export function getTtsProvider(): "sarvam" | "elevenlabs" {
  const explicit = process.env.TTS_PROVIDER?.toLowerCase();
  if (explicit === "sarvam") return "sarvam";
  if (explicit === "elevenlabs") return "elevenlabs";
  if (process.env.SARVAM_API_KEY?.trim()) return "sarvam";
  return "elevenlabs";
}

export function isSarvamConfigured(): boolean {
  return Boolean(process.env.SARVAM_API_KEY?.trim());
}

export function getSarvamLanguage(): string {
  return process.env.SARVAM_LANGUAGE?.trim() || "hi-IN";
}

export function getSarvamModel(): string {
  return process.env.SARVAM_TTS_MODEL?.trim() || "bulbul:v3";
}

export function getSarvamVoiceMap(): SarvamVoiceMap {
  return {
    1: process.env.SARVAM_CHEF_1_SPEAKER?.trim() || DEFAULT_SPEAKERS[1],
    2: process.env.SARVAM_CHEF_2_SPEAKER?.trim() || DEFAULT_SPEAKERS[2],
    3: process.env.SARVAM_CHEF_3_SPEAKER?.trim() || DEFAULT_SPEAKERS[3],
  };
}

export function linesToSarvamInputs(
  lines: DialogueLine[],
  voices: SarvamVoiceMap,
): SarvamDialogueInput[] {
  return lines.map((line) => ({
    text: line.text,
    speaker: voices[line.chef as ChefNumber],
  }));
}

function parseSarvamError(body: unknown, status: number): string {
  if (body && typeof body === "object" && "error" in body) {
    const err = (body as { error?: { message?: string } }).error;
    if (err?.message) return err.message;
  }
  return `Sarvam returned ${status}`;
}

async function synthesizeLineSarvam(
  apiKey: string,
  input: SarvamDialogueInput,
): Promise<{ mp3: ArrayBuffer } | { error: string }> {
  const res = await fetch("https://api.sarvam.ai/text-to-speech", {
    method: "POST",
    headers: {
      "api-subscription-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: input.text,
      target_language_code: getSarvamLanguage(),
      speaker: input.speaker,
      model: getSarvamModel(),
      output_audio_codec: "mp3",
      speech_sample_rate: "44100",
      pace: 1.05,
      temperature: 0.6,
    }),
  });

  if (!res.ok) {
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      /* ignore */
    }
    return { error: parseSarvamError(body, res.status) };
  }

  const data = (await res.json()) as { audios?: string[] };
  const b64 = data.audios?.[0];
  if (!b64) return { error: "Sarvam returned no audio" };

  const binary = Buffer.from(b64, "base64");
  return {
    mp3: binary.buffer.slice(
      binary.byteOffset,
      binary.byteOffset + binary.byteLength,
    ),
  };
}

export async function synthesizeChefDialogueSarvam(
  apiKey: string,
  inputs: SarvamDialogueInput[],
): Promise<
  | {
      kind: "sequential";
      parts: ArrayBuffer[];
      contentType: string;
      method: "sarvam-sequential";
    }
  | { error: string }
> {
  const parts: ArrayBuffer[] = [];

  for (let i = 0; i < inputs.length; i++) {
    const result = await synthesizeLineSarvam(apiKey, inputs[i]);
    if ("error" in result) {
      return { error: `Line ${i + 1} (${inputs[i].speaker}): ${result.error}` };
    }
    parts.push(result.mp3);
  }

  return {
    kind: "sequential",
    parts,
    contentType: "audio/mpeg",
    method: "sarvam-sequential",
  };
}
