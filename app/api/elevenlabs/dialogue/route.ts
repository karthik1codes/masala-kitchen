import { NextResponse } from "next/server";
import { buildCustomKitchenPlan } from "../../../lib/kitchenCustom";
import {
  buildKitchenDialogue,
  buildKitchenDialogueShort,
  dialogueCharCount,
  extractDialogueIngredients,
  type DialogueLine,
} from "../../../lib/kitchenDialogue";
import {
  FREE_TIER_PREMADE_VOICES,
  getCachedResolvedVoices,
  getCachedVoiceSource,
  getElevenLabsLanguage,
  getElevenLabsMode,
  getElevenLabsTtsModel,
  ENGLISH_PREMADE_CHEF_VOICES,
  isElevenLabsConfigured,
  linesToElevenLabsInputs,
  resolveElevenLabsVoiceMap,
  synthesizeChefDialogue,
} from "../../../lib/elevenlabsServer";
import {
  getSarvamLanguage,
  getSarvamModel,
  getSarvamVoiceMap,
  getTtsProvider,
  isSarvamConfigured,
  linesToSarvamInputs,
  synthesizeChefDialogueSarvam,
} from "../../../lib/sarvamServer";

const MAX_CHARS = 2000;

function bufferToBase64(buf: ArrayBuffer): string {
  return Buffer.from(buf).toString("base64");
}

function parseDialogueBody(req: Request): Promise<
  | { ok: true; body: { dishName?: string; lines?: DialogueLine[] } }
  | { ok: false; response: NextResponse }
> {
  return req
    .json()
    .then((body) => ({
      ok: true as const,
      body: body as { dishName?: string; lines?: DialogueLine[] },
    }))
    .catch(() => ({
      ok: false as const,
      response: NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }),
    }));
}

function buildDialogueLines(
  body: { dishName?: string; lines?: DialogueLine[] },
  useShortScript: boolean,
): DialogueLine[] | NextResponse {
  if (body.lines?.length) {
    return body.lines.filter(
      (l) =>
        l.text?.trim() &&
        (l.chef === 1 || l.chef === 2 || l.chef === 3),
    );
  }

  if (body.dishName?.trim()) {
    const dishName = body.dishName.trim();
    const plan = buildCustomKitchenPlan(dishName);
    const ingredients = plan ? extractDialogueIngredients(plan) : [];
    return useShortScript
      ? buildKitchenDialogueShort(dishName, ingredients)
      : buildKitchenDialogue(dishName, ingredients);
  }

  return NextResponse.json(
    { error: "Provide dishName or lines[]" },
    { status: 400 },
  );
}

export async function GET() {
  const provider = getTtsProvider();

  if (provider === "sarvam") {
    const voices = getSarvamVoiceMap();
    return NextResponse.json({
      configured: isSarvamConfigured(),
      provider: "sarvam",
      chefs: 3,
      model: getSarvamModel(),
      language: getSarvamLanguage(),
      activeVoices: voices,
      speakers: {
        chef1: voices[1],
        chef2: voices[2],
        chef3: voices[3],
      },
    });
  }

  const mode = getElevenLabsMode();
  return NextResponse.json({
    configured: isElevenLabsConfigured(),
    provider: "elevenlabs",
    mode,
    chefs: 3,
    dialogueModel: mode === "dialogue" ? "eleven_v3" : null,
    ttsModel: getElevenLabsTtsModel(),
    language: getElevenLabsLanguage(),
    activeVoices: getCachedResolvedVoices(),
    voiceSource: getCachedVoiceSource(),
    freeTierNote:
      "Free tier: uses eleven_multilingual_v2 + language en with Daniel/Adam/Harry premade voices.",
    recommendedEnglishVoices: ENGLISH_PREMADE_CHEF_VOICES,
    legacyRecommendedVoices: FREE_TIER_PREMADE_VOICES,
  });
}

export async function POST(req: Request) {
  const provider = getTtsProvider();
  const parsed = await parseDialogueBody(req);
  if (!parsed.ok) return parsed.response;

  const useShortScript =
    provider === "sarvam" || getElevenLabsMode() === "tts";
  const linesOrError = buildDialogueLines(parsed.body, useShortScript);
  if (linesOrError instanceof NextResponse) return linesOrError;

  const lines = linesOrError;
  if (lines.length === 0) {
    return NextResponse.json({ error: "No dialogue lines to synthesize" }, { status: 400 });
  }

  const charCount = dialogueCharCount(lines);
  if (charCount > MAX_CHARS) {
    return NextResponse.json(
      { error: `Dialogue too long (${charCount} chars, max ${MAX_CHARS})` },
      { status: 400 },
    );
  }

  if (provider === "sarvam") {
    const apiKey = process.env.SARVAM_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Sarvam is not configured. Set SARVAM_API_KEY in .env" },
        { status: 503 },
      );
    }

    const voices = getSarvamVoiceMap();
    const inputs = linesToSarvamInputs(lines, voices);
    const result = await synthesizeChefDialogueSarvam(apiKey, inputs);

    if ("error" in result) {
      console.error("[sarvam/dialogue]", result.error);
      return NextResponse.json({ error: result.error }, { status: 502 });
    }

    return NextResponse.json({
      sequential: true,
      method: result.method,
      contentType: result.contentType,
      parts: result.parts.map(bufferToBase64),
      lineCount: result.parts.length,
    });
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error: "ElevenLabs is not configured. Set ELEVENLABS_API_KEY in .env",
      },
      { status: 503 },
    );
  }

  let voices;
  try {
    voices = await resolveElevenLabsVoiceMap(apiKey);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to resolve voices" },
      { status: 503 },
    );
  }

  const inputs = linesToElevenLabsInputs(lines, voices);
  const result = await synthesizeChefDialogue(apiKey, inputs);

  if ("error" in result) {
    console.error("[elevenlabs/dialogue]", result.error);
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  if (result.kind === "sequential") {
    return NextResponse.json({
      sequential: true,
      method: result.method,
      contentType: result.contentType,
      parts: result.parts.map(bufferToBase64),
      lineCount: result.parts.length,
    });
  }

  const bodyBytes =
    result.audio instanceof Uint8Array
      ? result.audio
      : new Uint8Array(result.audio);

  return new NextResponse(Buffer.from(bodyBytes), {
    status: 200,
    headers: {
      "Content-Type": result.contentType,
      "Cache-Control": "private, max-age=3600",
      "X-Dialogue-Lines": String(lines.length),
      "X-Dish-Name": parsed.body.dishName?.trim() ?? "custom",
      "X-Synthesis-Method": result.method,
    },
  });
}
