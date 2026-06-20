# The Masala Kitchen

An interactive **Indian restaurant kitchen simulator** built on [**LingBot**](https://reactor.inc) — Reactor's real-time, navigable world model. Pick a dish (preset or custom), enter a freshly generated kitchen scene, then tap recipe steps to steer live AI video while Hindi chef dialogue plays over the stream.

Built with Next.js and the typed [`@reactor-models/lingbot`](https://www.npmjs.com/package/@reactor-models/lingbot) SDK, plus **OpenAI integrations**:

- **ChatGPT** (`OPENAI_MODEL`, default `gpt-4o-mini`) — generates custom dish recipe plans (ingredients, equipment, cooking steps, plating, ideal step order) when you type any dish name.
- **OpenAI image model** (`OPENAI_IMAGE_MODEL`, default `gpt-image-1`) — generates a unique photorealistic Indian-kitchen seed image per order that LingBot uses as its starting frame.

Set `OPENAI_API_KEY` in `.env` to enable both. Without it, custom orders fall back to built-in dish profiles and scene generation is disabled.

```
┌──────────────────────────┬──────────────────────────────────────┐
│  Connect · ready         │                                      │
│                          │                                      │
│  Order ticket            │                                      │
│  [Masala Dosa] [Biryani] │         live LingBot video           │
│  Custom dish input       │         (LingbotMainVideoView)       │
│                          │                                      │
│  Prep guide + steps      │         WASD to walk the kitchen     │
│  Ingredients · Cook ·    │                                      │
│  Plate · Serve           │                                      │
│  Voice control · Snap    │                                      │
└──────────────────────────┴──────────────────────────────────────┘
```

## Quick start

**Required:** a Reactor API key from [reactor.inc/account/api-keys](https://www.reactor.inc/account/api-keys) (starts with `rk_`).

```bash
cp .env.example .env   # or create .env manually
# REACTOR_API_KEY=rk_...

npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), click **Connect**, choose an order, and wait for the AI kitchen scene to generate (~45–60s on first load).

Use `npm run dev:clean` if you hit stale Next.js cache issues.

**Optional but recommended:** add `OPENAI_API_KEY` to unlock ChatGPT-powered custom orders and AI-generated kitchen seed images.

## OpenAI: ChatGPT + image model

| Integration | Env vars | What it does |
| ----------- | -------- | ------------ |
| **ChatGPT** | `OPENAI_API_KEY`, `OPENAI_MODEL` | Calls `/api/kitchen/plan` to build a full interactive recipe from any dish name — step labels, actions, sounds, and prep order. Implemented in [`app/lib/openaiKitchen.ts`](app/lib/openaiKitchen.ts). |
| **Image model** | `OPENAI_API_KEY`, `OPENAI_IMAGE_MODEL`, `OPENAI_IMAGE_SIZE`, `OPENAI_IMAGE_QUALITY` | Calls `/api/kitchen/scene` to generate a fresh HD kitchen reference image for each order (~45–60s). Used by [`ImageStarter`](app/components/ImageStarter.tsx) as the LingBot seed image. |

If ChatGPT is unavailable, the app falls back to keyword-matched profiles in [`kitchenCustom.ts`](app/lib/kitchenCustom.ts). Image generation requires OpenAI — there is no offline fallback for seed scenes.

## What you can do

- **Preset orders** — Masala Dosa, Chicken Biryani, Pav Bhaji, South Indian Thali, Filter Coffee + Dosa. Each maps to a dish profile with ingredients, equipment, cooking, and plating steps.
- **Custom dishes (ChatGPT)** — type any dish name; ChatGPT builds ingredients, steps, and prep order via `/api/kitchen/plan` (profile fallback if the API is unavailable).
- **Live kitchen controls** — tap steps in order to send LingBot prompts; the video updates on each chunk. Score points, combo bonuses, and a countdown timer.
- **Prep guide** — numbered checklist in the sidebar; skipping steps resets progress to Step 1.
- **Serve gate** — the serve button unlocks only after all prep, cook, and plate steps are complete.
- **Hindi chef dialogue** — Sarvam (Bulbul v3) or ElevenLabs TTS on order calls and every step tap, synced to video chunks.
- **Voice control** — Chrome/Edge Web Speech API matches spoken step names to kitchen actions.
- **Fresh seed scenes (image model)** — each new order generates a unique OpenAI image (`gpt-image-1` by default) via `/api/kitchen/scene`; LingBot starts from that seed.
- **WASD movement** — walk through the generated kitchen between recipe steps.
- **Snap a clip** — capture the last N seconds of the live stream and download MP4 via the Reactor SDK.
- **Pause / Resume / Reset** — standard LingBot transport controls.

## Environment variables

| Variable | Required | Purpose |
| -------- | -------- | ------- |
| `REACTOR_API_KEY` | **Yes** | Mint short-lived JWTs for LingBot sessions |
| `OPENAI_API_KEY` | No* | Enables **ChatGPT** dish plans and **OpenAI image model** seed scenes |
| `OPENAI_MODEL` | No | **ChatGPT** model for custom plans (default: `gpt-4o-mini`) |
| `OPENAI_IMAGE_MODEL` | No | **Image model** for kitchen seeds (default: `gpt-image-1`) |
| `OPENAI_IMAGE_SIZE` | No | e.g. `1024x1024` |
| `OPENAI_IMAGE_QUALITY` | No | e.g. `medium` |
| `TTS_PROVIDER` | No | `sarvam` or `elevenlabs` (auto-detects if unset) |
| `SARVAM_API_KEY` | No | Hindi TTS via [Sarvam AI](https://dashboard.sarvam.ai) |
| `SARVAM_TTS_MODEL` | No | default: `bulbul:v3` |
| `SARVAM_LANGUAGE` | No | default: `hi-IN` |
| `SARVAM_CHEF_1/2/3_SPEAKER` | No | Chef voice speakers |
| `ELEVENLABS_API_KEY` | No | Alternative Hindi/multilingual TTS |
| `ELEVENLABS_*` | No | Voice IDs, model, language overrides |

\*Without OpenAI, custom orders fall back to keyword-matched dish profiles in `kitchenCustom.ts`. Scene images still require OpenAI.

The Reactor key is server-only. The browser receives short-lived JWTs from `/api/reactor/token`.

## How it works

1. **Connect** — `LingbotProvider` opens a WebRTC session (`disconnected → connecting → waiting → ready`).
2. **Load order** — `KitchenPlanProvider` builds or fetches a recipe plan (preset, profile, or OpenAI).
3. **Enter kitchen** — `ImageStarter` generates a seed image, uploads it, sets the opening prompt, and calls `start()`.
4. **Play** — `KitchenControls` sends `setPrompt()` per step; LingBot renders the next video chunk (~16 fps).
5. **Audio** — `chefDialoguePlayer` fetches TTS from `/api/elevenlabs/dialogue` and syncs to chunk boundaries.
6. **Serve** — complete all prep/cook/plate steps, then tap serve for bonus points.

## Architecture

| Phase | When | Sidebar shows |
| ----- | ---- | ------------- |
| **Setup** | connected, not started | Order ticket, prep guide, image starter |
| **Live** | generation running | Now playing, kitchen controls, movement, snap clip |

Components subscribe to LingBot state snapshots and self-hide by phase — no central orchestrator.

## Code tour

| File | Role |
| ---- | ---- |
| [`app/page.tsx`](app/page.tsx) | Gates on `REACTOR_API_KEY`; renders `LingbotAppLoader` or `SetupRequired` |
| [`app/LingbotApp.tsx`](app/LingbotApp.tsx) | Root layout: `LingbotProvider` + `KitchenPlanProvider` + sidebar + video |
| [`app/context/KitchenPlanContext.tsx`](app/context/KitchenPlanContext.tsx) | Preset/custom order state, plan loading, scene image enrichment |
| [`app/api/reactor/token/route.ts`](app/api/reactor/token/route.ts) | GET route minting cacheable Reactor JWTs |
| [`app/api/kitchen/plan/route.ts`](app/api/kitchen/plan/route.ts) | OpenAI custom dish plan endpoint |
| [`app/api/kitchen/scene/route.ts`](app/api/kitchen/scene/route.ts) | DALL-E kitchen seed image generation |
| [`app/api/elevenlabs/dialogue/route.ts`](app/api/elevenlabs/dialogue/route.ts) | Sarvam / ElevenLabs Hindi chef TTS |
| [`app/lib/kitchen.ts`](app/lib/kitchen.ts) | Preset orders, static interactions, categories |
| [`app/lib/kitchenCustom.ts`](app/lib/kitchenCustom.ts) | Dish profiles, plan assembly, serve gating |
| [`app/lib/kitchenVisuals.ts`](app/lib/kitchenVisuals.ts) | Photorealistic prompt templates and camera profiles |
| [`app/lib/kitchenDialogue.ts`](app/lib/kitchenDialogue.ts) | Hindi dialogue scripts per step |
| [`app/lib/chefDialoguePlayer.ts`](app/lib/chefDialoguePlayer.ts) | Client audio playback + chunk sync |
| [`app/lib/openaiKitchen.ts`](app/lib/openaiKitchen.ts) | OpenAI plan + image generation (server-only) |
| [`app/components/CustomOrderSetup.tsx`](app/components/CustomOrderSetup.tsx) | Preset picker + custom dish input (setup phase) |
| [`app/components/ImageStarter.tsx`](app/components/ImageStarter.tsx) | Auto-starts session with fresh DALL-E seed per order |
| [`app/components/KitchenControls.tsx`](app/components/KitchenControls.tsx) | Interactive recipe panel, scoring, voice bar |
| [`app/components/Video.tsx`](app/components/Video.tsx) | `LingbotMainVideoView` + playback speed slider |
| [`app/components/MovementControls.tsx`](app/components/MovementControls.tsx) | WASD movement via `useWasdMovement` |
| [`app/components/SnapClip.tsx`](app/components/SnapClip.tsx) | SDK clip capture + MP4 download |

## Tech stack

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · [`@reactor-models/lingbot`](https://www.npmjs.com/package/@reactor-models/lingbot) · [`@reactor-team/js-sdk`](https://www.npmjs.com/package/@reactor-team/js-sdk) · [`@reactor-team/ui`](https://www.npmjs.com/package/@reactor-team/ui) · **OpenAI ChatGPT** (custom dish plans) · **OpenAI image model** (`gpt-image-1` seed scenes) · Sarvam / ElevenLabs (Hindi TTS) · [`hls.js`](https://www.npmjs.com/package/hls.js) (clip preview)

## Scripts

| Command | Description |
| ------- | ----------- |
| `npm run dev` | Start dev server |
| `npm run dev:clean` | Clear `.next` cache, then dev |
| `npm run build` | Production build |
| `npm run start` | Run production server |

## Notes

- **`skill/SKILL.md`** still documents the original Helios example patterns; this app has been extended for LingBot and the kitchen game loop.
- Pin SDK versions in production — Reactor APIs are in beta.
- After changing prompts or env vars, **Reset** the LingBot session or reload to pick up fresh state.
