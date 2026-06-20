/** Shared realism anchors for every Indian restaurant kitchen scene. */
export const KITCHEN_CORE =
  "Ultrarealistic live-action footage inside a busy Indian restaurant kitchen, stainless steel counters, blazing gas burners, hanging ladles and chimtas, stacked steel thalis, wooden masala dabba with colorful spice compartments, documentary authenticity, natural skin tones with visible sweat and pores, steam catching warm tungsten light and blue gas flame glow, turmeric stains on prep boards, fresh coriander bundles, stacked steel plates at the pass.";

export type KitchenVisualProfile =
  | "pass-over-shoulder"
  | "tawa-macro"
  | "kadhai-drama"
  | "prep-board-detail"
  | "stove-line-tracking"
  | "handi-steam-backlit"
  | "street-counter-neon"
  | "documentary-handheld"
  | "chef-portrait-shallow"
  | "overhead-rush"
  | "plating-pass-gloss"
  | "flame-hero-low"
  | "dining-pass-bokeh"
  | "spice-macro-slowmo"
  | "chaotic-wide-angle"
  | "kettle-pour-silhouette"
  | "roti-flame-close";

export const KITCHEN_VISUAL_PROFILES: Record<KitchenVisualProfile, string> = {
  "pass-over-shoulder":
    "Over-the-shoulder shot from behind a chef in a white kurta and checkered apron at the stainless pass, 50mm lens, shallow f/1.8 depth of field, warm key on plated thali, cool fill in shadows, soft bokeh of cooks moving behind.",
  "tawa-macro":
    "Extreme close-up macro on a blistering iron tawa, oil rippling in heat shimmer, 85mm macro lens, dosa edges curling golden, smoke wisps backlit by flame, tactile cast-iron grain visible.",
  "kadhai-drama":
    "Low-angle hero shot of a heavy kadhai over roaring blue gas, ghee foaming at the rim, chef's hand entering frame with chimta, dramatic chiaroscuro, cumin and mustard seeds hitting hot fat in the air.",
  "prep-board-detail":
    "45-degree close shot on a worn steel prep board, knife rhythm and flying onion peelings, overhead practical tungsten, shallow focus on hands with background cooks in soft blur.",
  "stove-line-tracking":
    "Smooth lateral tracking shot along a six-burner stove line, multiple kadhais and tawas in parallel, steam layers stacking in depth, eye-level documentary glide.",
  "handi-steam-backlit":
    "Backlit steam rays pouring from a sealed biryani handi as the lid lifts, saffron haze, rim light on chef's forearms, slow reverent camera push-in.",
  "street-counter-neon":
    "Warm street-food counter energy with neon sign glow on the pass, sizzling tawa gleaming, butter smoke and amber pendant light spill on stainless, slightly wider 28mm lens.",
  "documentary-handheld":
    "Handheld documentary shoulder height, subtle natural sway, 35mm lens look, eye-level immersion among working chefs, realistic motion blur on passing bodies.",
  "chef-portrait-shallow":
    "Tight portrait framing on a senior chef's weathered face mid-instruction, shallow depth of field, steam drifting between camera and subject, catchlights in eyes under hood lights.",
  "overhead-rush":
    "High-angle overview of rush-hour chaos, order chits on the rail, three stations firing at once, wide 24mm lens, deep focus showing coordinated movement patterns.",
  "plating-pass-gloss":
    "Glossy close-up at the pass — chimta, fresh coriander, ghee swirl, finished thali gleaming under warm spots, mirror reflections on steel counter.",
  "flame-hero-low":
    "Low hero angle on open flame under tawa or kadhai, ghee igniting, chef silhouette above, orange fire bloom with realistic heat distortion.",
  "dining-pass-bokeh":
    "Kitchen-side view through the pass window, diners and warm dining room bokeh beyond, chef hands sliding a thali forward, split lighting kitchen cool / dining warm.",
  "spice-macro-slowmo":
    "Macro slow-motion feel as mustard seeds and curry leaves hit hot ghee — spices scattering, audible sizzle implied by visual snap, dark background, single hard light.",
  "chaotic-wide-angle":
    "Wide 24mm rush composition, chefs crossing frame, chits fluttering, flames on every burner, layered steam and motion, controlled documentary chaos.",
  "kettle-pour-silhouette":
    "Backlit chai pour from a steel kettle, long amber stream catching window light, steam rising from the kulhad, warm tones against dark kitchen rear.",
  "roti-flame-close":
    "Close shot of paratha puffing on the tawa, char spots spreading, chimta flipping bread, ember glow at stove edge, heat shimmer on skin.",
};

const REALISM_SUFFIX =
  "8K photorealistic, Arri Alexa color science, natural micro-motion blur, hyper-detailed food textures, no CGI, no cartoon, no illustration, continuous believable motion, lifelike Indian kitchen brigade with expressive faces and busy hands.";

/** @deprecated use KITCHEN_CORE — kept for imports that expect KITCHEN_BASE */
export const KITCHEN_BASE = `${KITCHEN_CORE} ${KITCHEN_VISUAL_PROFILES["documentary-handheld"]} ${REALISM_SUFFIX}`;

export function kitchenPrompt(
  action: string,
  dish?: string,
  profile: KitchenVisualProfile = "documentary-handheld",
): string {
  const dishBit = dish
    ? ` The brigade is preparing ${dish} for a waiting customer order.`
    : "";
  const look = KITCHEN_VISUAL_PROFILES[profile];
  return `${KITCHEN_CORE} ${look} ${action}${dishBit} ${REALISM_SUFFIX}`;
}

const CATEGORY_PROFILE_POOLS: Record<string, KitchenVisualProfile[]> = {
  ingredients: ["prep-board-detail", "spice-macro-slowmo", "documentary-handheld"],
  equipment: ["flame-hero-low", "kadhai-drama", "tawa-macro", "roti-flame-close"],
  cooking: ["tawa-macro", "stove-line-tracking", "kadhai-drama", "kettle-pour-silhouette"],
  dishes: ["plating-pass-gloss", "handi-steam-backlit", "pass-over-shoulder"],
  chefs: [
    "chef-portrait-shallow",
    "documentary-handheld",
    "pass-over-shoulder",
    "chaotic-wide-angle",
  ],
  serve: ["dining-pass-bokeh", "overhead-rush", "chaotic-wide-angle"],
};

/** Deterministic but varied profile for custom-dish steps. */
export function profileForStep(
  category: string,
  stepId: string,
): KitchenVisualProfile {
  const pool =
    CATEGORY_PROFILE_POOLS[category] ?? ["documentary-handheld"];
  let hash = 0;
  for (let i = 0; i < stepId.length; i++) {
    hash = (hash + stepId.charCodeAt(i) * (i + 1)) % pool.length;
  }
  return pool[hash]!;
}

/** Photorealistic seed image — Indian commercial kitchen reference collage. */
export const KITCHEN_STARTER_IMAGE = "/images/indian-kitchen.png";

/** Distinct ultrarealistic entry scenes for the Indian kitchen. */
export const KITCHEN_OPENING_SCENES = [
  {
    id: "indian-kitchen-brigade",
    label: "Chef Brigade",
    imageUrl: KITCHEN_STARTER_IMAGE,
    profile: "flame-hero-low" as KitchenVisualProfile,
    action:
      "You enter a busy commercial kitchen — three chefs in white toques and jackets work the stove line; the head chef flambés a pan with a tall orange flame, steel thalis wait on the pass, steam and blue gas glow fill the frame.",
  },
  {
    id: "indian-kitchen-pass",
    label: "Pass Window",
    imageUrl: KITCHEN_STARTER_IMAGE,
    profile: "pass-over-shoulder" as KitchenVisualProfile,
    action:
      "You arrive at the stainless pass beside the head chef — order chits clip to the rail, finished thalis steam under warm spots, tawa and kadhai stations glow behind in soft bokeh.",
  },
  {
    id: "indian-kitchen-tawa",
    label: "Tawa Station",
    imageUrl: KITCHEN_STARTER_IMAGE,
    profile: "tawa-macro" as KitchenVisualProfile,
    action:
      "You step up to the blazing iron tawa — a chef spreads dosa batter in a spiral, oil shimmers, edges crisp and lift, blue flame pulses beneath the griddle.",
  },
  {
    id: "indian-kitchen-kadhai",
    label: "Kadhai Line",
    imageUrl: KITCHEN_STARTER_IMAGE,
    profile: "kadhai-drama" as KitchenVisualProfile,
    action:
      "You move along the kadhai line — ghee foams in hot pans, a tall flame leaps as tadka hits the curry, ladles scrape rhythmically, steam rolls toward the camera.",
  },
  {
    id: "indian-kitchen-rush",
    label: "Rush Hour",
    imageUrl: KITCHEN_STARTER_IMAGE,
    profile: "overhead-rush" as KitchenVisualProfile,
    action:
      "Rush hour hits — six burners firing, three chefs shout orders in Hindi-English and weave between stations, chits stack on the rail, the kitchen pulses with coordinated urgency.",
  },
  {
    id: "indian-kitchen-biryani",
    label: "Biryani Handi",
    imageUrl: KITCHEN_STARTER_IMAGE,
    profile: "handi-steam-backlit" as KitchenVisualProfile,
    action:
      "At the biryani station a sealed handi breathes steam — the chef lifts the lid on saffron rice, fried onions wait in a bowl, rich biryani fragrance fills the back kitchen.",
  },
  {
    id: "indian-kitchen-street",
    label: "Street Counter",
    imageUrl: KITCHEN_STARTER_IMAGE,
    profile: "street-counter-neon" as KitchenVisualProfile,
    action:
      "The street-food counter glows — sizzling pav bhaji on the tawa, butter melting into masala, warm neon spill on steel rails, the chef mashes bhaji with rhythmic confidence.",
  },
] as const;

export function kitchenOpeningPrompt(
  scene: (typeof KITCHEN_OPENING_SCENES)[number],
  dish?: string,
): string {
  return kitchenPrompt(scene.action, dish, scene.profile);
}

/** Chef-focused interactions — each with its own camera profile. */
export const CHEF_INTERACTION_DEFS = [
  {
    id: "head-chef-briefing",
    label: "👨‍🍳 Head Chef Briefing",
    sound: "chatter" as const,
    shortcut: "1",
    profile: "chef-portrait-shallow" as KitchenVisualProfile,
    action:
      "The senior head chef in a crisp white kurta and checkered apron turns toward the camera, gesturing at the order chit on the pass while explaining the dish — weathered face, confident eyes, steam drifting between you and the stove line.",
  },
  {
    id: "tawa-chef-shout",
    label: "🔥 Tawa Chef Shouts",
    sound: "chatter" as const,
    shortcut: "2",
    profile: "tawa-macro" as KitchenVisualProfile,
    action:
      "At the blazing tawa station, a muscular chef in rolled sleeves shouts the order over the sizzle, pointing at the dosa and flame — mouth open mid-call, smoke backlit, other cooks ducking past in soft focus.",
  },
  {
    id: "pass-window-banter",
    label: "💬 Pass Window Banter",
    sound: "chatter" as const,
    profile: "dining-pass-bokeh" as KitchenVisualProfile,
    action:
      "Two chefs lean on opposite sides of the stainless pass window debating spice level — one shakes his head, the other grins and taps the chit rail; diners blur beyond the opening, kitchen clatter sharp in foreground.",
  },
  {
    id: "tasting-spoon",
    label: "🥄 Tasting Spoon",
    sound: "click" as const,
    shortcut: "3",
    profile: "chef-portrait-shallow" as KitchenVisualProfile,
    action:
      "The head chef offers a steaming tasting spoon toward the camera, blowing gently on the curry before nodding for approval — close-up hands, ladles, and rich gravy texture, expectant expression under hood lights.",
  },
  {
    id: "apprentice-chop",
    label: "🔪 Apprentice at Board",
    sound: "chop" as const,
    profile: "prep-board-detail" as KitchenVisualProfile,
    action:
      "A young commis chef chops onions fast on a steel board while the chef de partie corrects his grip from behind — knife rhythm, flying peelings, mentor's hand on shoulder, both faces lit by overhead tungsten.",
  },
  {
    id: "expeditor-call",
    label: "📋 Expeditor Calls Order",
    sound: "chatter" as const,
    profile: "chaotic-wide-angle" as KitchenVisualProfile,
    action:
      "The expeditor reads the order chit aloud, stabbing the rail with a pen and making eye contact down the line — chit paper fluttering, three cooks snap to attention at their stations, urgency in every gesture.",
  },
  {
    id: "flame-show",
    label: "🌋 Tadka Flambé",
    sound: "flame" as const,
    profile: "kadhai-drama" as KitchenVisualProfile,
    action:
      "A chef tosses tadka into a roaring kadhai and a tall orange flame leaps up, illuminating his focused face — dramatic fire reflection on stainless steel, crew stepping back then surging forward again.",
  },
  {
    id: "team-huddle",
    label: "🤝 Team Huddle",
    sound: "chatter" as const,
    shortcut: "4",
    profile: "documentary-handheld" as KitchenVisualProfile,
    action:
      "Three chefs gather at the pass for a quick huddle — senior chef assigns stations with pointed fingers, others nod and split toward tawa, kadhai, and prep board, coordinated rush-hour choreography.",
  },
  {
    id: "plating-coach",
    label: "🍽️ Plating Coach",
    sound: "ding" as const,
    profile: "plating-pass-gloss" as KitchenVisualProfile,
    action:
      "The sous chef guides a junior cook's hands as they garnish a thali — chimta placing coriander, ghee swirl on dal, both leaning over the pass, finished dishes gleaming in a row under warm lights.",
  },
  {
    id: "celebrate-service",
    label: "🙌 Celebrate Service",
    sound: "cheer" as const,
    profile: "pass-over-shoulder" as KitchenVisualProfile,
    action:
      "The kitchen crew breaks into brief celebration after a perfect service — chefs clap chimtas, wipe brows, laugh together at the pass, satisfied smiles, steam still rising while the dining room buzz glows through the window.",
  },
] as const;

/** Legacy profile aliases for any cached prompts */
export const LEGACY_PROFILE_ALIASES: Record<string, KitchenVisualProfile> = {
  "grill-macro": "tawa-macro",
  "saute-drama": "kadhai-drama",
  "oven-steam-backlit": "handi-steam-backlit",
  "bar-counter-warm": "street-counter-neon",
  "seasoning-macro-slowmo": "spice-macro-slowmo",
  "tea-pour-silhouette": "kettle-pour-silhouette",
  "bread-grill-close": "roti-flame-close",
};
