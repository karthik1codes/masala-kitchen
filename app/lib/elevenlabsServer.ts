import type { ChefNumber, DialogueLine } from "./kitchenDialogue";

export interface ElevenLabsVoiceMap {
  1: string;
  2: string;
  3: string;
}

export interface DialogueInput {
  text: string;
  voice_id: string;
}

/** Indian / Hindi Voice Library picks — work on paid API or after adding to Voice Lab. */
export const INDIAN_VOICE_CATALOG = {
  /** Senior head chef — calm, mature Hindi male */
  VikramS: "SPnt7u3Gb2UpfIV1to5x",
  /** Expeditor — courteous professional Indian male */
  Krishna: "XopCoWNooN3d7LfWZyX5",
  /** Prep / shouts — relatable desi Hindi male */
  RajuRelatable: "zT03pEAEi0VHKciJODfn",
  RajuInsurance: "Jf701ovNUg1ZFQugpfXU",
  Ranga: "pzT3Axu7WJzqmpRAWYc5",
  BrightHindi: "WuePGPKIAIKI8COZpzce",
  RajuWarm: "eyVoIoi3vo6sJoHOKgAc",
  AakashFamous: "N2al4jd45e882svx17SU",
  AmitGupta: "Sxk6njaoa7XLsAFT7WcN",
  AnikaHindi: "broqrJkktxd1CclKTudW",
} as const;

/** Free-tier premade voices that work with Hindi via multilingual model. */
export const FREE_TIER_VOICE_CATALOG = {
  Daniel: "onwK4e9ZLuTAKqWW03F9",
  Adam: "pNInz6obpgDQGcFmaJgB",
  Harry: "SOYHLrjzK2X1ezoPC6cr",
  Callum: "N2lVS1w4EtoT3dr4eOWO",
  Liam: "TX3LPaxmHKxFdv7VOQHJ",
  Chris: "iP95p4xoKVk53GoZ742B",
  Brian: "nPczCjzI2devNBz1zQrb",
  Bill: "pqHfZKP75CvOlQylNhV4",
  Roger: "CwhRBWXzGAHq8TQ4Fs17",
  Charlie: "IKne3meq5aSn9XLyUdCD",
  /** Legacy English defaults — kept as last-resort fallbacks */
  Arnold: "VR6AewLTigWG4xSOukaG",
  Antoni: "ErXwobaYiN019PkySvjV",
  George: "JBFqnCBsd6RMkjVDRZzb",
} as const;

/** Preferred chef → voice mapping (Indian library when API allows). */
export const INDIAN_CHEF_VOICES = {
  chef1: {
    id: INDIAN_VOICE_CATALOG.VikramS,
    name: "Vikram S (senior head chef — Hindi)",
  },
  chef2: {
    id: INDIAN_VOICE_CATALOG.Krishna,
    name: "Krishna (expeditor — Hindi)",
  },
  chef3: {
    id: INDIAN_VOICE_CATALOG.RajuRelatable,
    name: "Raju (prep chef — Hinglish energy)",
  },
} as const;

/** Free-tier premade fallbacks (multilingual v2 + language en). */
export const ENGLISH_PREMADE_CHEF_VOICES = {
  chef1: {
    id: FREE_TIER_VOICE_CATALOG.Daniel,
    name: "Daniel (deep senior — British)",
  },
  chef2: {
    id: FREE_TIER_VOICE_CATALOG.Adam,
    name: "Adam (expeditor)",
  },
  chef3: {
    id: FREE_TIER_VOICE_CATALOG.Harry,
    name: "Harry (energetic prep)",
  },
} as const;

/** @deprecated use ENGLISH_PREMADE_CHEF_VOICES */
export const HINDI_PREMADE_CHEF_VOICES = ENGLISH_PREMADE_CHEF_VOICES;

/** @deprecated use ENGLISH_PREMADE_CHEF_VOICES */
export const FREE_TIER_PREMADE_VOICES = ENGLISH_PREMADE_CHEF_VOICES;

const DEFAULT_INDIAN_VOICE_MAP: ElevenLabsVoiceMap = {
  1: INDIAN_CHEF_VOICES.chef1.id,
  2: INDIAN_CHEF_VOICES.chef2.id,
  3: INDIAN_CHEF_VOICES.chef3.id,
};

const DEFAULT_ENGLISH_PREMADE_MAP: ElevenLabsVoiceMap = {
  1: ENGLISH_PREMADE_CHEF_VOICES.chef1.id,
  2: ENGLISH_PREMADE_CHEF_VOICES.chef2.id,
  3: ENGLISH_PREMADE_CHEF_VOICES.chef3.id,
};

const INDIAN_VOICE_FALLBACK_IDS: string[] = [
  INDIAN_VOICE_CATALOG.VikramS,
  INDIAN_VOICE_CATALOG.Krishna,
  INDIAN_VOICE_CATALOG.RajuRelatable,
  INDIAN_VOICE_CATALOG.RajuInsurance,
  INDIAN_VOICE_CATALOG.Ranga,
  INDIAN_VOICE_CATALOG.BrightHindi,
  INDIAN_VOICE_CATALOG.RajuWarm,
  INDIAN_VOICE_CATALOG.AakashFamous,
  INDIAN_VOICE_CATALOG.AmitGupta,
  INDIAN_VOICE_CATALOG.AnikaHindi,
];

const ENGLISH_PREMADE_FALLBACK_IDS: string[] = [
  FREE_TIER_VOICE_CATALOG.Daniel,
  FREE_TIER_VOICE_CATALOG.Adam,
  FREE_TIER_VOICE_CATALOG.Harry,
  FREE_TIER_VOICE_CATALOG.Callum,
  FREE_TIER_VOICE_CATALOG.Liam,
  FREE_TIER_VOICE_CATALOG.Chris,
  FREE_TIER_VOICE_CATALOG.Brian,
  FREE_TIER_VOICE_CATALOG.Bill,
  FREE_TIER_VOICE_CATALOG.Roger,
  FREE_TIER_VOICE_CATALOG.Charlie,
  FREE_TIER_VOICE_CATALOG.Arnold,
  FREE_TIER_VOICE_CATALOG.Antoni,
  FREE_TIER_VOICE_CATALOG.George,
];

const DIALOGUE_URL = "https://api.elevenlabs.io/v1/text-to-dialogue";
const DEFAULT_TTS_MODEL = "eleven_multilingual_v2";
const DEFAULT_TTS_LANGUAGE = "en";
const MP3_FORMAT = "mp3_44100_128";

export type ChefDialogueResult =
  | {
      kind: "single";
      audio: ArrayBuffer | Uint8Array;
      contentType: string;
      method: "dialogue";
    }
  | {
      kind: "sequential";
      parts: ArrayBuffer[];
      contentType: string;
      method: "tts-sequential";
    }
  | { error: string };

let resolvedVoiceCache: ElevenLabsVoiceMap | null = null;
let resolvedVoiceSource: "indian-library" | "hindi-premade" | "custom-env" | null =
  null;
const voiceProbeCache = new Map<string, boolean>();

export function getElevenLabsMode(): "tts" | "dialogue" {
  const mode = process.env.ELEVENLABS_MODE?.toLowerCase();
  return mode === "dialogue" ? "dialogue" : "tts";
}

export function getElevenLabsTtsModel(): string {
  return process.env.ELEVENLABS_TTS_MODEL?.trim() || DEFAULT_TTS_MODEL;
}

export function getElevenLabsLanguage(): string {
  return process.env.ELEVENLABS_LANGUAGE?.trim() || DEFAULT_TTS_LANGUAGE;
}

export function getElevenLabsVoiceSettings() {
  return {
    stability: 0.42,
    similarity_boost: 0.78,
    style: 0.32,
    use_speaker_boost: true,
  };
}

export function getElevenLabsVoiceMap(): ElevenLabsVoiceMap | null {
  const chef1 = process.env.ELEVENLABS_CHEF_1_VOICE_ID;
  const chef2 = process.env.ELEVENLABS_CHEF_2_VOICE_ID;
  const chef3 = process.env.ELEVENLABS_CHEF_3_VOICE_ID;
  if (!chef1 || !chef2 || !chef3) return null;
  return { 1: chef1, 2: chef2, 3: chef3 };
}

export function isElevenLabsConfigured(): boolean {
  return Boolean(process.env.ELEVENLABS_API_KEY);
}

export function getCachedResolvedVoices(): ElevenLabsVoiceMap | null {
  return resolvedVoiceCache;
}

export function getCachedVoiceSource():
  | "indian-library"
  | "hindi-premade"
  | "custom-env"
  | null {
  return resolvedVoiceSource;
}

export function linesToElevenLabsInputs(
  lines: DialogueLine[],
  voices: ElevenLabsVoiceMap,
): DialogueInput[] {
  return lines.map((line) => ({
    text: line.text,
    voice_id: voices[line.chef as ChefNumber],
  }));
}

export function parseElevenLabsError(body: unknown, status: number): string {
  if (!body || typeof body !== "object") {
    return `ElevenLabs returned ${status}`;
  }

  const detail = (body as { detail?: unknown }).detail;

  if (typeof detail === "string") return detail;

  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object" && "msg" in item) {
          return String((item as { msg: unknown }).msg);
        }
        return JSON.stringify(item);
      })
      .join("; ");
  }

  if (detail && typeof detail === "object" && "message" in detail) {
    return String((detail as { message: unknown }).message);
  }

  return `ElevenLabs returned ${status}`;
}

export function isLibraryVoiceError(message: string): boolean {
  return (
    /library voices/i.test(message) ||
    /paid_plan_required/i.test(message) ||
    /not found/i.test(message)
  );
}

async function probeVoiceId(
  apiKey: string,
  voiceId: string,
): Promise<boolean> {
  const cached = voiceProbeCache.get(voiceId);
  if (cached !== undefined) return cached;

  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=${MP3_FORMAT}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text: "Right, fish and chips order in — table four waiting.",
        model_id: getElevenLabsTtsModel(),
        language_code: getElevenLabsLanguage(),
        voice_settings: getElevenLabsVoiceSettings(),
      }),
      signal: AbortSignal.timeout(12_000),
    });

    const ok = res.ok;
    voiceProbeCache.set(voiceId, ok);
    return ok;
  } catch {
    voiceProbeCache.set(voiceId, false);
    return false;
  }
}

async function pickDistinctVoices(
  apiKey: string,
  preferredByChef: ElevenLabsVoiceMap,
  pool: string[],
): Promise<ElevenLabsVoiceMap | null> {
  const used = new Set<string>();
  const resolved: Partial<ElevenLabsVoiceMap> = {};

  for (const chef of [1, 2, 3] as ChefNumber[]) {
    const candidates = [
      preferredByChef[chef],
      ...pool.filter((id) => id !== preferredByChef[chef]),
    ];

    let picked: string | null = null;
    for (const id of candidates) {
      if (used.has(id)) continue;
      if (await probeVoiceId(apiKey, id)) {
        picked = id;
        break;
      }
    }

    if (!picked) return null;
    resolved[chef] = picked;
    used.add(picked);
  }

  return resolved as ElevenLabsVoiceMap;
}

/** Pick 3 distinct English premade voices that work on this API key. */
export async function resolveElevenLabsVoiceMap(
  apiKey: string,
): Promise<ElevenLabsVoiceMap> {
  if (resolvedVoiceCache) return resolvedVoiceCache;

  const envMap = getElevenLabsVoiceMap();
  const envHasAll =
    envMap &&
    envMap[1]?.trim() &&
    envMap[2]?.trim() &&
    envMap[3]?.trim();

  if (envHasAll) {
    const chefs = [1, 2, 3] as const;
    const probeResults = await Promise.all(
      chefs.map((chef) => probeVoiceId(apiKey, envMap[chef])),
    );

    if (probeResults.every(Boolean)) {
      resolvedVoiceCache = envMap;
      resolvedVoiceSource = "custom-env";
      return resolvedVoiceCache;
    }
  }

  const premade = await pickDistinctVoices(
    apiKey,
    DEFAULT_ENGLISH_PREMADE_MAP,
    ENGLISH_PREMADE_FALLBACK_IDS,
  );
  if (premade) {
    resolvedVoiceCache = premade;
    resolvedVoiceSource = "hindi-premade";
    return resolvedVoiceCache;
  }

  if (envHasAll) {
    resolvedVoiceCache = envMap;
    resolvedVoiceSource = "custom-env";
    console.warn(
      "[elevenlabs] Voice probe failed — using configured env voice IDs anyway:",
      envMap,
    );
    return resolvedVoiceCache;
  }

  throw new Error(
    "No working voices found. Set ELEVENLABS_CHEF_1/2/3_VOICE_ID to Daniel/Adam/Harry and ELEVENLABS_LANGUAGE=en.",
  );
}

async function synthesizeLineTts(
  apiKey: string,
  input: DialogueInput,
): Promise<{ mp3: ArrayBuffer } | { error: string }> {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${input.voice_id}?output_format=${MP3_FORMAT}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text: input.text,
      model_id: getElevenLabsTtsModel(),
      language_code: getElevenLabsLanguage(),
      voice_settings: getElevenLabsVoiceSettings(),
    }),
  });

  if (!res.ok) {
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      /* ignore */
    }
    return { error: parseElevenLabsError(body, res.status) };
  }

  return { mp3: await res.arrayBuffer() };
}

export async function synthesizeDialogueViaTts(
  apiKey: string,
  inputs: DialogueInput[],
): Promise<
  | { kind: "sequential"; parts: ArrayBuffer[]; contentType: string; method: "tts-sequential" }
  | { error: string }
> {
  const parts: ArrayBuffer[] = [];

  for (let i = 0; i < inputs.length; i++) {
    const result = await synthesizeLineTts(apiKey, inputs[i]);
    if ("error" in result) {
      voiceProbeCache.delete(inputs[i].voice_id);
      resolvedVoiceCache = null;
      resolvedVoiceSource = null;

      const hint = isLibraryVoiceError(result.error)
        ? " Indian Voice Library needs a paid plan — app falls back to Hindi multilingual premade voices."
        : "";
      return { error: `Line ${i + 1}: ${result.error}${hint}` };
    }
    parts.push(result.mp3);
  }

  return {
    kind: "sequential",
    parts,
    contentType: "audio/mpeg",
    method: "tts-sequential",
  };
}

export async function synthesizeTextToDialogue(
  apiKey: string,
  inputs: DialogueInput[],
): Promise<
  | { audio: ArrayBuffer; contentType: string; method: "dialogue" }
  | { error: string; status: number }
> {
  const url = `${DIALOGUE_URL}?output_format=${MP3_FORMAT}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      inputs,
      model_id: "eleven_v3",
    }),
  });

  if (!res.ok) {
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      /* ignore */
    }
    return {
      error: parseElevenLabsError(body, res.status),
      status: res.status,
    };
  }

  return {
    audio: await res.arrayBuffer(),
    contentType: "audio/mpeg",
    method: "dialogue",
  };
}

export async function synthesizeChefDialogue(
  apiKey: string,
  inputs: DialogueInput[],
): Promise<ChefDialogueResult> {
  const mode = getElevenLabsMode();

  if (mode === "tts") {
    const tts = await synthesizeDialogueViaTts(apiKey, inputs);
    if ("error" in tts) return { error: tts.error };
    return tts;
  }

  const dialogue = await synthesizeTextToDialogue(apiKey, inputs);

  if ("audio" in dialogue) {
    return {
      kind: "single",
      audio: dialogue.audio,
      contentType: dialogue.contentType,
      method: "dialogue",
    };
  }

  console.warn("[elevenlabs] Text to Dialogue failed, trying TTS:", dialogue.error);

  const fallback = await synthesizeDialogueViaTts(apiKey, inputs);
  if ("error" in fallback) {
    return {
      error: `${dialogue.error}. TTS fallback: ${fallback.error}. Set ELEVENLABS_MODE=tts in .env for free tier.`,
    };
  }

  return fallback;
}
