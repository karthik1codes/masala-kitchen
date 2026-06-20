import fs from "fs";

const env = fs.readFileSync(".env", "utf8");
const key = env.match(/ELEVENLABS_API_KEY=(.+)/)?.[1]?.trim();
if (!key) process.exit(1);

const PREMADE = {
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
  Arnold: "VR6AewLTigWG4xSOukaG",
  Antoni: "ErXwobaYiN019PkySvjV",
  George: "JBFqnCBsd6RMkjVDRZzb",
  Josh: "TxGEqnHWrfWFTfGW9XjX",
  Rachel: "21m00Tcm4TlvDq8ikWAM",
  Domi: "AZnzlk1XvdvUeBnXmlld",
  Elli: "MF3mGyEYCl7XYWbV9V6O",
  Sam: "yoZ06aMxZJJ28mfd3POQ",
  Matilda: "XrExE9yKIg1WjnnlVkGX",
  Bella: "EXAVITQu4vr4xnSDxMaL",
  Emily: "LcfcDJNUP1GQjkzn1xUU",
  Ethan: "g5CIjZEefAph4nQFvHAz",
  Fin: "D38z5RcWu1voky8WS1ja",
  Freya: "jsCqWAovK2LkecY7zXl4",
  Gigi: "jBpfuIE2acCO8z3wKNLl",
  Grace: "oWAxZDx7w5VEj9dCyTzz",
  James: "ZQe5CZNOzWyzPSCn5a3c",
  Jeremy: "bVMeCyTHy58xNoL8hZLS",
  Jessie: "t0jbNlBVZ17f02VDIeMI",
  Joseph: "Zlb1dXrM653N07WRdFW3",
  Michael: "flq6f7yk4E4fJM5XTYuZ",
  Mimi: "zrHiDhphv9ZnVXBqCLjz",
  Nicole: "piTKgcLEGmPE4e6mEKli",
  Patrick: "ODq5zmih8GrVes37Dizd",
  Paul: "5Q0t7uMcjvnagudL9ZmP",
  Serena: "pMsXgVXv3BLzUgSXRplE",
  Thomas: "GBv7mTt0atIp3Br8iCZE",
  Dorothy: "ThT5KcBeYPX3keUQqHPh",
  Clyde: "2EiwWnXFnvU5JabPnv8n",
  Dave: "CYw3kZ02d0566kS1Kg88",
  Glinda: "z9fAnlkpzviPz146aGWa",
  Giovanni: "zcAOhNBS3c14rBihA9P6",
  Sarah: "EXAVITQu4vr4xnSDxMaL",
};

const INDIAN_LIBRARY = {
  "Raju (Relatable Hindi)": "zT03pEAEi0VHKciJODfn",
  "Vikram S": "SPnt7u3Gb2UpfIV1to5x",
  Krishna: "XopCoWNooN3d7LfWZyX5",
  Ranga: "pzT3Axu7WJzqmpRAWYc5",
  "Aakash Aryan": "N2al4jd45e882svx17SU",
  "Amit Gupta": "Sxk6njaoa7XLsAFT7WcN",
};

async function probe(name, id) {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${id}?output_format=mp3_44100_128`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "xi-api-key": key,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text: "ok",
      model_id: "eleven_multilingual_v2",
      language_code: "hi",
    }),
  });
  const reason = res.ok
    ? "ok"
    : res.status === 402
      ? "paid/library only"
      : res.status === 404
        ? "not found"
        : `error ${res.status}`;
  return { name, id, ok: res.ok, reason };
}

const works = [];
const blocked = [];

for (const [name, id] of Object.entries(PREMADE)) {
  const r = await probe(name, id);
  (r.ok ? works : blocked).push(r);
}

console.log("=== FREE TIER PREMADE (works via API) ===");
for (const v of works) console.log(`${v.name}\t${v.id}`);

console.log("\n=== PREMADE BLOCKED ON FREE API ===");
for (const v of blocked) console.log(`${v.name}\t${v.id}\t(${v.reason})`);

console.log("\n=== INDIAN VOICE LIBRARY (sample) ===");
for (const [name, id] of Object.entries(INDIAN_LIBRARY)) {
  const r = await probe(name, id);
  console.log(`${name}\t${r.ok ? "works" : r.reason}`);
}
