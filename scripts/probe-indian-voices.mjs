import fs from "fs";

const env = fs.readFileSync(".env", "utf8");
const key = env.match(/ELEVENLABS_API_KEY=(.+)/)?.[1]?.trim();
if (!key) {
  console.error("No API key");
  process.exit(1);
}

const INDIAN_CANDIDATES = {
  RajuRelatable: "zT03pEAEi0VHKciJODfn",
  RajuInsurance: "Jf701ovNUg1ZFQugpfXU",
  VikramS: "SPnt7u3Gb2UpfIV1to5x",
  Krishna: "XopCoWNooN3d7LfWZyX5",
  Ranga: "pzT3Axu7WJzqmpRAWYc5",
  BrightHindi: "WuePGPKIAIKI8COZpzce",
  RajuWarm: "eyVoIoi3vo6sJoHOKgAc",
  RajuShorts: "HH8sIQq8WOcER3Nu118i",
  PriyaHindi: "XB0fDUnXU5powFXDhCwa",
  Adam: "pNInz6obpgDQGcFmaJgB",
  Daniel: "onwK4e9ZLuTAKqWW03F9",
  Callum: "N2lVS1w4EtoT3dr4eOWO",
};

const MODELS = ["eleven_turbo_v2_5", "eleven_multilingual_v2"];
const SAMPLE = "Arre bhai, masala dosa ka order aa gaya hai. Jaldi karo table four waiting hai.";

async function probe(name, id, model) {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${id}?output_format=mp3_44100_128`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "xi-api-key": key,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text: SAMPLE,
      model_id: model,
      language_code: "hi",
    }),
  });
  let err = null;
  if (!res.ok) {
    try {
      err = await res.text();
    } catch {
      err = String(res.status);
    }
  }
  return { name, id, model, ok: res.ok, status: res.status, err };
}

try {
  const vr = await fetch("https://api.elevenlabs.io/v1/voices", {
    headers: { "xi-api-key": key },
  });
  console.log("voices list status:", vr.status);
  if (vr.ok) {
    const data = await vr.json();
    const voices = data.voices ?? [];
    const indian = voices.filter((x) =>
      /india|hindi|raju|krishna|vikram|ranga|desi|tarun|priya|ananya|arjun|amit|neha|raj|bengali|tamil|telugu|punjabi|marathi|gujarati|hinglish/i.test(
        `${x.name ?? ""} ${x.labels?.accent ?? ""} ${x.labels?.description ?? ""} ${x.description ?? ""}`,
      ),
    );
    console.log(
      "account voices (indian-ish):",
      JSON.stringify(
        indian.map((x) => ({
          name: x.name,
          id: x.voice_id,
          category: x.category,
          accent: x.labels?.accent,
        })),
        null,
        2,
      ),
    );
  } else {
    console.log("voices list error:", await vr.text());
  }
} catch (e) {
  console.log("list err:", e.message);
}

for (const [name, id] of Object.entries(INDIAN_CANDIDATES)) {
  for (const model of MODELS) {
    const res = await probe(name, id, model);
    console.log(JSON.stringify(res));
  }
}
