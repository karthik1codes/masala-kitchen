// Interactive Indian kitchen — prompts and item buttons for LingBot.

import {
  CHEF_INTERACTION_DEFS,
  KITCHEN_BASE,
  KITCHEN_OPENING_SCENES,
  kitchenOpeningPrompt,
  kitchenPrompt,
  type KitchenVisualProfile,
} from "./kitchenVisuals";

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

export interface KitchenInteraction {
  id: string;
  label: string;
  category: "ingredients" | "equipment" | "cooking" | "dishes" | "chefs" | "serve";
  prompt: string;
  sound: KitchenSound;
  shortcut?: string;
}

const DEFAULT_OPENING = KITCHEN_OPENING_SCENES[0];

export const KITCHEN_SCENE = {
  id: "masala-kitchen",
  label: "Masala Kitchen",
  imageUrl: DEFAULT_OPENING.imageUrl,
  initial: {
    title: "Enter the kitchen",
    text: kitchenOpeningPrompt(DEFAULT_OPENING),
  },
};

const CHEF_INTERACTIONS: KitchenInteraction[] = CHEF_INTERACTION_DEFS.map(
  (def) => ({
    id: def.id,
    label: def.label,
    category: "chefs" as const,
    sound: def.sound,
    prompt: kitchenPrompt(def.action, undefined, def.profile),
    ...("shortcut" in def && def.shortcut ? { shortcut: def.shortcut } : {}),
  }),
);

function kp(action: string, profile: KitchenVisualProfile): string {
  return kitchenPrompt(action, undefined, profile);
}

export const KITCHEN_INTERACTIONS: ReadonlyArray<KitchenInteraction> = [
  {
    id: "onion",
    label: "🧅 Chop Onions",
    category: "ingredients",
    sound: "chop",
    prompt: kp(
      "A chef finely chops golden onions on a steel board with a sharp knife, pieces scattering across the counter. A kadhai waits nearby on the flame.",
      "prep-board-detail",
    ),
  },
  {
    id: "tomato",
    label: "🍅 Add Tomatoes",
    category: "ingredients",
    sound: "sizzle",
    prompt: kp(
      "Ripe red tomatoes are diced and tossed into a sizzling kadhai, juice bubbling and releasing steam. The chef stirs with a long-handled ladle, face lit by stove glow.",
      "kadhai-drama",
    ),
  },
  {
    id: "ginger-garlic",
    label: "🫚 Ginger-Garlic",
    category: "ingredients",
    sound: "sizzle",
    prompt: kp(
      "Fresh ginger-garlic paste is spooned from a steel bowl into the hot kadhai, sizzling loudly on contact. Aromatic steam rises as the chef stirs vigorously.",
      "stove-line-tracking",
    ),
  },
  {
    id: "spices",
    label: "🌶️ Spice Tadka",
    category: "ingredients",
    sound: "pop",
    shortcut: "p",
    prompt: kp(
      "The chef adds mustard seeds, cumin, and curry leaves to hot ghee — a sharp sizzle erupts with fragrant steam. Red chili powder scatters into the pan.",
      "spice-macro-slowmo",
    ),
  },
  {
    id: "coriander",
    label: "🌿 Fresh Coriander",
    category: "ingredients",
    sound: "chop",
    prompt: kp(
      "A handful of fresh coriander is chopped and scattered over a finished dish on the pass, bright green against golden curry. The chef garnishes with practiced hands.",
      "plating-pass-gloss",
    ),
  },
  {
    id: "tawa",
    label: "🔥 Heat Tawa",
    category: "equipment",
    sound: "flame",
    shortcut: "t",
    prompt: kp(
      "The chef cranks the gas flame high under a large iron tawa until the surface glows. A brush of oil spreads and shimmers across the hot griddle, ready for dosa.",
      "flame-hero-low",
    ),
  },
  {
    id: "kadhai",
    label: "🍳 Heat Kadhai",
    category: "equipment",
    sound: "flame",
    prompt: kp(
      "A heavy kadhai sits over roaring blue flame, ghee rippling with heat. The chef tests the temperature with a flick of water that dances and evaporates.",
      "kadhai-drama",
    ),
  },
  {
    id: "pressure-cooker",
    label: "🥘 Pressure Cooker",
    category: "equipment",
    sound: "whistle",
    prompt: kp(
      "A steel pressure cooker whistles on the back burner, steam jetting from the weight valve. The chef adjusts the flame beneath bubbling dal.",
      "documentary-handheld",
    ),
  },
  {
    id: "chimta",
    label: "🔧 Grab Chimta",
    category: "equipment",
    sound: "sizzle",
    prompt: kp(
      "The chef picks up long steel chimta from the hook and turns paratha on the tawa, char spots forming on the bread. Embers glow at the edge of the stove.",
      "roti-flame-close",
    ),
  },
  {
    id: "spread-batter",
    label: "🥞 Spread Dosa Batter",
    category: "cooking",
    sound: "pour",
    shortcut: "d",
    prompt: kp(
      "The chef pours dosa batter onto the screaming-hot tawa and spreads it in a spiral with the back of the ladle, edges crisping golden. Steam rises as the dosa sets.",
      "tawa-macro",
    ),
  },
  {
    id: "potato-masala",
    label: "🥔 Potato Masala",
    category: "cooking",
    sound: "sizzle",
    prompt: kp(
      "Spiced potato masala is mashed and folded on the tawa as the chef stirs with the chimta. Mustard seeds pop and turmeric stains the steel surface golden.",
      "kadhai-drama",
    ),
  },
  {
    id: "stir-biryani",
    label: "🍚 Layer Biryani",
    category: "cooking",
    sound: "sizzle",
    prompt: kp(
      "In a heavy handi, the chef layers fragrant basmati rice over marinated meat, saffron milk drizzled in ribbons. Steam escapes as the lid seals for dum cooking.",
      "handi-steam-backlit",
    ),
  },
  {
    id: "mash-bhaji",
    label: "🫕 Mash Pav Bhaji",
    category: "cooking",
    sound: "sizzle",
    prompt: kp(
      "Mixed vegetables are mashed vigorously on the tawa with pav bhaji masala, the chef's masher working rhythmic folds. A pat of butter melts into the rich red bhaji.",
      "street-counter-neon",
    ),
  },
  {
    id: "brew-chai",
    label: "☕ Brew Chai",
    category: "cooking",
    sound: "pour",
    shortcut: "c",
    prompt: kp(
      "Masala chai boils in a steel kettle with ginger and cardamom. The chef lifts the kettle high and pours a long amber stream into a kulhad, steam curling upward.",
      "kettle-pour-silhouette",
    ),
  },
  {
    id: "flip-paratha",
    label: "🫓 Flip Paratha",
    category: "cooking",
    sound: "sizzle",
    prompt: kp(
      "A stuffed paratha puffs on the tawa as the chef flips it with quick wrist motion, golden layers spreading across the surface. Ghee sizzles on contact.",
      "roti-flame-close",
    ),
  },
  {
    id: "dosa-plate",
    label: "🍽️ Plate Dosa",
    category: "dishes",
    sound: "ding",
    prompt: kp(
      "A crisp golden masala dosa is folded on a banana leaf with coconut chutney and sambar in steel katoris. The dish sits at the service pass gleaming under the lights.",
      "plating-pass-gloss",
    ),
  },
  {
    id: "biryani-handi",
    label: "🍖 Biryani Handi",
    category: "dishes",
    sound: "ding",
    prompt: kp(
      "The biryani handi lid is lifted revealing fragrant saffron rice and tender meat with fried onions on top. Aroma fills the kitchen as the chef portions onto steel plates.",
      "handi-steam-backlit",
    ),
  },
  {
    id: "thali",
    label: "🥗 Assemble Thali",
    category: "dishes",
    sound: "ding",
    prompt: kp(
      "A full South Indian thali is arranged — rice, sambar, rasam, poriyal, papad, and pickle circling the center steel plate. Colourful and complete at the pass.",
      "plating-pass-gloss",
    ),
  },
  ...CHEF_INTERACTIONS,
  {
    id: "serve-customer",
    label: "✅ Serve Customer",
    category: "serve",
    sound: "ding",
    shortcut: "s",
    prompt: kp(
      "The head chef slides a finished thali across the service counter to a waiting customer who smiles with anticipation. The dining room buzz is visible through the pass window.",
      "dining-pass-bokeh",
    ),
  },
  {
    id: "rush-hour",
    label: "⏱️ Rush Hour",
    category: "serve",
    sound: "chatter",
    prompt: kp(
      "The kitchen erupts into rush hour chaos — multiple order chits clip to the rail, flames leap on every burner, three chefs shout orders and dodge past each other between tawa and kadhai. Steam, sweat, and urgency fill the frame.",
      "overhead-rush",
    ),
  },
  {
    id: "happy-customer",
    label: "😊 Happy Customer",
    category: "serve",
    sound: "cheer",
    shortcut: "h",
    prompt: kp(
      "Through the kitchen pass, a customer takes the first bite and nods with delight, giving a thumbs up. The chef wipes hands on apron with a satisfied smile at the counter.",
      "dining-pass-bokeh",
    ),
  },
];

export const KITCHEN_BY_SHORTCUT = new Map(
  KITCHEN_INTERACTIONS.filter((i) => i.shortcut).map((i) => [i.shortcut!, i]),
);

export const KITCHEN_CATEGORIES = [
  { id: "chefs", label: "Chefs" },
  { id: "ingredients", label: "Ingredients" },
  { id: "equipment", label: "Equipment" },
  { id: "cooking", label: "Cooking" },
  { id: "dishes", label: "Plating" },
  { id: "serve", label: "Service" },
] as const;

export interface KitchenOrder {
  id: string;
  label: string;
  hint: string;
  idealStepIds: ReadonlyArray<string>;
  timeLimitSec: number;
}

export const KITCHEN_ORDERS: ReadonlyArray<KitchenOrder> = [
  {
    id: "masala-dosa",
    label: "Masala Dosa + Chutney",
    hint: "Head Chef → Heat Tawa → Spread Dosa Batter → Tawa Chef Shouts → Serve",
    idealStepIds: [
      "head-chef-briefing",
      "tawa",
      "spread-batter",
      "tawa-chef-shout",
      "serve-customer",
    ],
    timeLimitSec: 90,
  },
  {
    id: "chicken-biryani",
    label: "Chicken Biryani + Raita",
    hint: "Team Huddle → Whole Spices → Layer Biryani → Biryani Handi → Serve",
    idealStepIds: [
      "team-huddle",
      "spices",
      "layer-biryani",
      "biryani-handi",
      "serve-customer",
    ],
    timeLimitSec: 120,
  },
  {
    id: "pav-bhaji",
    label: "Pav Bhaji + Pav",
    hint: "Expeditor Call → Heat Kadhai → Mash Pav Bhaji → Pass Banter → Serve",
    idealStepIds: [
      "expeditor-call",
      "kadhai",
      "mash-bhaji",
      "pass-window-banter",
      "serve-customer",
    ],
    timeLimitSec: 75,
  },
  {
    id: "south-thali",
    label: "South Indian Thali",
    hint: "Apprentice Prep → Tasting Spoon → Assemble Thali → Celebrate → Serve",
    idealStepIds: [
      "apprentice-chop",
      "tasting-spoon",
      "thali",
      "celebrate-service",
      "serve-customer",
    ],
    timeLimitSec: 100,
  },
  {
    id: "filter-coffee",
    label: "Filter Coffee + Dosa",
    hint: "Head Chef → Heat Tawa → Flip Paratha → Brew Chai → Serve",
    idealStepIds: [
      "head-chef-briefing",
      "tawa",
      "flip-paratha",
      "brew-chai",
      "serve-customer",
    ],
    timeLimitSec: 80,
  },
];

/** @deprecated use KITCHEN_ORDERS */
export const SAMPLE_ORDERS = KITCHEN_ORDERS.map((o) => o.label);

export const ALL_KITCHEN_PROMPTS = new Set([
  KITCHEN_SCENE.initial.text,
  ...KITCHEN_OPENING_SCENES.map((s) => kitchenOpeningPrompt(s)),
  ...KITCHEN_INTERACTIONS.map((i) => i.prompt),
]);

export function isKitchenPrompt(prompt: string | null | undefined): boolean {
  return !!prompt && ALL_KITCHEN_PROMPTS.has(prompt);
}

export { KITCHEN_BASE, kitchenPrompt };
