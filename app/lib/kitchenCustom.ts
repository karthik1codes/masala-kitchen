// Builds a full kitchen interaction plan from a custom dish name.

import type { KitchenInteraction, KitchenOrder, KitchenSound } from "./kitchen";
import { KITCHEN_CATEGORIES, KITCHEN_ORDERS } from "./kitchen";
import { CHEF_INTERACTION_DEFS, kitchenPrompt, profileForStep } from "./kitchenVisuals";

export interface KitchenPlan {
  order: KitchenOrder;
  interactions: KitchenInteraction[];
  shortcutMap: Map<string, KitchenInteraction>;
  source?: "profile" | "openai";
  images?: {
    sceneDataUrl?: string;
    ingredientsDataUrl?: string;
  };
  customDialogues?: Record<string, string[]>;
}

interface StepDef {
  id: string;
  label: string;
  sound: KitchenSound;
  action: string;
  shortcut?: string;
  profile?: import("./kitchenVisuals").KitchenVisualProfile;
}

interface Profile {
  id: string;
  keywords: RegExp;
  timeLimitSec: number;
  ingredients: StepDef[];
  equipment: StepDef[];
  cooking: StepDef[];
  plating: StepDef[];
}

function toInteraction(
  dish: string,
  def: StepDef,
  category: KitchenInteraction["category"],
): KitchenInteraction {
  const profile =
    "profile" in def && def.profile
      ? def.profile
      : profileForStep(category, def.id);
  return {
    id: def.id,
    label: def.label,
    category,
    sound: def.sound,
    shortcut: def.shortcut,
    prompt: kitchenPrompt(def.action, dish, profile),
  };
}

function adaptServeForDish(dish: string, def: StepDef): StepDef {
  switch (def.id) {
    case "serve-customer":
      return {
        ...def,
        label: `✅ Serve ${dish}`,
        action: `The head chef slides the finished ${dish} across the stainless steel pass to a waiting customer who smiles with anticipation. Steam rises from the plated ${dish}, garnish perfect.`,
      };
    case "happy-customer":
      return {
        ...def,
        label: `😊 ${dish} loved!`,
        action: `Through the kitchen pass, a customer takes the first bite of ${dish} and nods with delight, giving an enthusiastic thumbs up. The chef wipes hands on apron, satisfied.`,
      };
    case "rush-hour":
      return {
        ...def,
        label: `⏱️ Rush — more ${dish}!`,
        action: `The kitchen erupts into rush hour — multiple ${dish} tickets clip to the rail alongside other orders. Flames leap on every burner, chefs shout while plating ${dish} and the next ticket.`,
      };
    default:
      return def;
  }
}

export function isServeStepId(id: string): boolean {
  return id === "serve-customer" || id.endsWith("-serve-customer");
}

export function getRequiredBeforeServe(plan: KitchenPlan): string[] {
  return plan.order.idealStepIds.filter((id) => !isServeStepId(id));
}

export function hintFromStepIds(
  interactions: KitchenInteraction[],
  stepIds: readonly string[],
): string {
  return stepIds
    .map((id) => {
      const step = interactions.find((i) => i.id === id);
      return step?.label.replace(/^[^\s]+\s/, "").trim() ?? "Step";
    })
    .join(" → ");
}

function computeIdealStepIds(
  chefs: KitchenInteraction[],
  ingredients: KitchenInteraction[],
  equipment: KitchenInteraction[],
  cooking: KitchenInteraction[],
  plating: KitchenInteraction[],
): string[] {
  const ids: string[] = [];
  if (chefs[0]) ids.push(chefs[0].id);
  if (ingredients[0]) ids.push(ingredients[0].id);
  if (equipment[0]) ids.push(equipment[0].id);
  if (cooking[0]) ids.push(cooking[0].id);
  if (cooking.length > 1) ids.push(cooking[cooking.length - 1]!.id);
  const plateStep = plating[plating.length - 1] ?? plating[0];
  if (plateStep) ids.push(plateStep.id);
  if (chefs[1]) ids.push(chefs[1].id);
  ids.push("serve-customer");
  return ids;
}

const CHEF_STEPS: StepDef[] = CHEF_INTERACTION_DEFS.map((def) => ({
  id: def.id,
  label: def.label,
  sound: def.sound,
  action: def.action,
  profile: def.profile,
  ...("shortcut" in def && def.shortcut ? { shortcut: def.shortcut } : {}),
}));

const SERVE_STEPS: StepDef[] = [
  {
    id: "serve-customer",
    label: "✅ Serve Customer",
    sound: "ding",
    shortcut: "s",
    action:
      "The chef slides the finished dish across the service counter to a waiting customer who smiles with anticipation.",
  },
  {
    id: "rush-hour",
    label: "⏱️ Rush Hour",
    sound: "chatter",
    action:
      "The kitchen erupts into rush hour chaos — multiple order chits clip to the rail, flames leap on every burner, and three chefs shout orders while dodging between tawa and kadhai.",
  },
  {
    id: "happy-customer",
    label: "😊 Happy Customer",
    sound: "cheer",
    shortcut: "h",
    action:
      "Through the kitchen pass, a customer takes the first bite and nods with delight, giving a thumbs up.",
  },
];

const PROFILES: Profile[] = [
  {
    id: "dosa-idli",
    keywords: /\b(dosa|idli|uttapam|vada|sambar|chutney|upma|pesarattu)\b/i,
    timeLimitSec: 90,
    ingredients: [
      { id: "onion", label: "🧅 Chop Onions", sound: "chop", action: "Golden onions are finely chopped for masala filling and garnish." },
      { id: "potato", label: "🥔 Boil Potatoes", sound: "chop", action: "Potatoes are boiled and mashed for dosa masala filling." },
      { id: "batter", label: "🥣 Ferment Batter", sound: "pour", action: "Fermented rice-lentil batter is whisked smooth in a steel bucket, ready for the tawa." },
      { id: "spices", label: "🌶️ Spice Tadka", sound: "pop", shortcut: "p", action: "Mustard seeds and curry leaves crackle in hot ghee for the masala." },
    ],
    equipment: [
      { id: "tawa", label: "🔥 Heat Tawa", sound: "flame", shortcut: "t", action: "The iron tawa roars to temperature, oil shimmering across the surface." },
      { id: "pressure-cooker", label: "🥘 Sambar Pot", sound: "whistle", action: "A pot of sambar simmers on the back burner with drumstick and tamarind." },
    ],
    cooking: [
      { id: "spread-batter", label: "🥞 Spread Dosa Batter", sound: "pour", shortcut: "d", action: "Batter is poured and spread in a spiral on the hot tawa until edges crisp golden." },
      { id: "potato-masala", label: "🥔 Potato Masala", sound: "sizzle", action: "Spiced potato masala is folded onto the dosa as it cooks on the tawa." },
      { id: "crisp-edges", label: "✨ Crisp Edges", sound: "sizzle", action: "The dosa is folded with a chimta, steam rising as golden edges crackle." },
    ],
    plating: [
      { id: "dosa-plate", label: "🍽️ Plate Dosa", sound: "ding", action: "Masala dosa is plated on a banana leaf with coconut chutney and sambar katoris." },
    ],
  },
  {
    id: "biryani-rice",
    keywords: /\b(biryani|pulao|jeera rice|basmati|fried rice|khichdi|tahari|pulav)\b/i,
    timeLimitSec: 120,
    ingredients: [
      { id: "rice", label: "🍚 Soak Basmati", sound: "chop", action: "Long-grain basmati is rinsed and soaked for fluffy biryani layers." },
      { id: "marinade", label: "🧅 Marinate Meat", sound: "sizzle", action: "Chicken is marinated with yogurt, ginger-garlic, and biryani masala in a steel tray." },
      { id: "spices", label: "🌶️ Whole Spices", sound: "pop", shortcut: "p", action: "Cinnamon, cardamom, and cloves are toasted and ground for biryani masala." },
      { id: "saffron", label: "🌸 Saffron Milk", sound: "pour", action: "Saffron strands steep in warm milk, turning deep golden for layering." },
      { id: "onion", label: "🧅 Fry Onions", sound: "sizzle", action: "Onions are sliced and fried until crisp and caramelised for biryani topping." },
    ],
    equipment: [
      { id: "handi", label: "🔥 Heat Handi", sound: "flame", shortcut: "t", action: "A heavy biryani handi heats over low flame, ghee melting at the base." },
      { id: "kadhai", label: "🍳 Fry Pan", sound: "flame", action: "A kadhai heats for browning marinated meat before layering." },
    ],
    cooking: [
      { id: "layer-biryani", label: "🍚 Layer Biryani", sound: "sizzle", shortcut: "d", action: "Rice and meat are layered in the handi with saffron milk and fried onions." },
      { id: "steam-dum", label: "💨 Dum Steam", sound: "whistle", action: "Steam escapes as the handi lid seals for slow dum cooking on low flame." },
    ],
    plating: [
      { id: "biryani-handi", label: "🍖 Biryani Handi", sound: "ding", action: "The handi lid lifts revealing fragrant saffron biryani, plated with raita on the side." },
      { id: "raita-side", label: "🥒 Raita Side", sound: "ding", action: "Cool cucumber raita is spooned into a katori beside the biryani at the pass." },
    ],
  },
  {
    id: "curry-gravy",
    keywords: /\b(curry|dal|paneer|masala|gravy|korma|tikka|saag|chole|rajma|sambar|fish|machhi|mutton|chicken|murg)\b/i,
    timeLimitSec: 100,
    ingredients: [
      { id: "onion", label: "🧅 Chop Onions", sound: "chop", action: "Onions are chopped and begin browning in the kadhai base." },
      { id: "tomato", label: "🍅 Add Tomatoes", sound: "sizzle", action: "Tomatoes are added and cooked down into a rich masala gravy." },
      { id: "ginger-garlic", label: "🫚 Ginger-Garlic", sound: "sizzle", action: "Ginger-garlic paste sizzles in hot ghee, releasing aromatic steam." },
      { id: "spices", label: "🌶️ Spice Tadka", sound: "pop", shortcut: "p", action: "Garam masala, turmeric, and red chili are stirred into the simmering gravy." },
      { id: "cream", label: "🥛 Cream Finish", sound: "pour", action: "Fresh cream is swirled in, enriching the curry to a silky finish." },
    ],
    equipment: [
      { id: "kadhai", label: "🍳 Heat Kadhai", sound: "flame", shortcut: "t", action: "A heavy kadhai heats over blue flame with ghee foaming on the surface." },
    ],
    cooking: [
      { id: "simmer-gravy", label: "🫕 Simmer Gravy", sound: "sizzle", shortcut: "d", action: "The curry bubbles and thickens as the chef stirs with a long ladle." },
      { id: "add-protein", label: "🍗 Add Paneer", sound: "sizzle", action: "Paneer cubes are added to the gravy and simmered until soft." },
      { id: "slow-cook", label: "🔥 Slow Cook", sound: "sizzle", action: "The curry slow-cooks until rich and clinging, ready for plating." },
    ],
    plating: [
      { id: "curry-bowl", label: "🍲 Serve Curry Bowl", sound: "ding", action: "The curry is ladled into a steel bowl with naan stacked on the side." },
      { id: "naan-side", label: "🫓 Naan Side", sound: "ding", action: "Fresh naan is brushed with butter and placed beside the curry at the pass." },
    ],
  },
  {
    id: "street-snack",
    keywords: /\b(pav|bhaji|vada|chaat|samosa|pakora|bhel|puri|kachori|roll|golgappa)\b/i,
    timeLimitSec: 75,
    ingredients: [
      { id: "veggies", label: "🥕 Chop Vegetables", sound: "chop", action: "Mixed vegetables are chopped for pav bhaji or chaat prep." },
      { id: "masala", label: "🌶️ Pav Bhaji Masala", sound: "pop", shortcut: "p", action: "Pav bhaji masala is sprinkled over the sizzling vegetable mix." },
      { id: "chutney", label: "🥫 Mint Chutney", sound: "chop", action: "Green mint chutney and tamarind chutney are set in steel katoris at the pass." },
      { id: "butter", label: "🧈 Butter Pav", sound: "sizzle", action: "A generous pat of butter melts and sizzles on the tawa for pav toasting." },
    ],
    equipment: [
      { id: "tawa", label: "🔥 Heat Tawa", sound: "flame", shortcut: "t", action: "The street-style tawa roars to life under high flame." },
      { id: "fryer", label: "🫧 Kadhai Fry", sound: "sizzle", action: "Oil in the kadhai heats to a rolling bubble for samosas and pakoras." },
    ],
    cooking: [
      { id: "mash-bhaji", label: "🫕 Mash Pav Bhaji", sound: "sizzle", shortcut: "d", action: "Vegetables are mashed on the tawa with butter and pav bhaji masala." },
      { id: "fry-snack", label: "🥟 Fry Samosa", sound: "sizzle", action: "Samosas fry golden in hot oil, lifted carefully with a slotted chimta." },
      { id: "toast-pav", label: "🍞 Toast Pav", sound: "sizzle", action: "Pav buns are buttered and toasted on the tawa until crisp." },
    ],
    plating: [
      { id: "street-plate", label: "🍽️ Street Plate", sound: "ding", action: "Pav bhaji is plated with buttered pav, chopped onion, and lemon wedge at the pass." },
    ],
  },
  {
    id: "bread-roti",
    keywords: /\b(naan|paratha|roti|chapati|kulcha|thepla|bhatura|puri)\b/i,
    timeLimitSec: 80,
    ingredients: [
      { id: "dough", label: "🫓 Knead Dough", sound: "chop", action: "Soft atta dough is kneaded on a steel surface to smooth elasticity." },
      { id: "ghee", label: "🧈 Brush Ghee", sound: "pour", action: "Melted ghee is brushed across the paratha before flipping on the tawa." },
      { id: "spices", label: "🌶️ Ajwain & Salt", sound: "pop", action: "Ajwain and salt are kneaded into the dough for flavour." },
    ],
    equipment: [
      { id: "tawa", label: "🔥 Heat Tawa", sound: "flame", shortcut: "t", action: "The tawa heats until the surface glows, ready for roti." },
      { id: "chimta", label: "🔧 Grab Chimta", sound: "sizzle", action: "Steel chimta is grabbed to flip naan on the tawa." },
    ],
    cooking: [
      { id: "cook-bread", label: "🫓 Cook Roti", sound: "sizzle", shortcut: "d", action: "Roti puffs on the tawa as the chef presses with a cloth, golden spots forming." },
      { id: "flame-puff", label: "🔥 Flame Puff", sound: "flame", action: "Naan is lifted with chimta and puffed directly over the open flame until charred." },
    ],
    plating: [
      { id: "bread-basket", label: "🧺 Bread Basket", sound: "ding", action: "Warm rotis are stacked in a steel basket with ghee brushed on top at the pass." },
    ],
  },
  {
    id: "beverage",
    keywords: /\b(chai|tea|coffee|filter coffee|lassi|jaljeera|nimbu|sharbat|buttermilk|chaas)\b/i,
    timeLimitSec: 60,
    ingredients: [
      { id: "spices", label: "🫚 Ginger & Cardamom", sound: "chop", action: "Fresh ginger and cardamom pods are crushed for masala chai." },
      { id: "milk", label: "🥛 Fresh Milk", sound: "pour", action: "Fresh milk is poured into the boiling chai, frothing at the rim." },
      { id: "sugar", label: "🍬 Sugar & Strain", sound: "click", action: "Sugar is stirred in and the chai is strained into a kulhad." },
    ],
    equipment: [
      { id: "kettle", label: "☕ Heat Kettle", sound: "flame", shortcut: "t", action: "A steel kettle or filter coffee decoction pot heats on the burner." },
    ],
    cooking: [
      { id: "brew", label: "☕ Brew Chai", sound: "pour", shortcut: "d", action: "Masala chai boils vigorously, milk frothing as the chef pulls and pours." },
      { id: "pull-pour", label: "✨ Pull & Pour", sound: "pour", action: "The chef pulls filter coffee between davara and tumbler in a long amber stream." },
    ],
    plating: [
      { id: "serve-drink", label: "🥤 Serve Drink", sound: "ding", action: "The finished chai or filter coffee is placed on a saucer at the counter." },
    ],
  },
  {
    id: "thali-meal",
    keywords: /\b(thali|platter|meal|combo|banquet|feast|south indian|north indian)\b/i,
    timeLimitSec: 110,
    ingredients: [
      { id: "onion", label: "🧅 Prep Aromatics", sound: "chop", action: "Onions, ginger, and garlic are prepped for multiple thali components." },
      { id: "dal", label: "🫘 Cook Dal", sound: "sizzle", action: "Yellow dal simmers in a kadhai with turmeric and cumin tadka." },
      { id: "vegetable", label: "🥬 Seasonal Sabzi", sound: "sizzle", action: "Seasonal vegetables are tempered with mustard seeds and curry leaves." },
      { id: "spices", label: "🌶️ Spice Each", sound: "pop", shortcut: "p", action: "Each thali component is seasoned at the pass before assembly." },
    ],
    equipment: [
      { id: "tawa", label: "🔥 Heat Tawa", sound: "flame", shortcut: "t", action: "The tawa heats for papad and roti while burners hold dal and sabzi." },
      { id: "kadhai", label: "🍳 Kadhai", sound: "flame", action: "A kadhai holds the main curry component of the thali." },
    ],
    cooking: [
      { id: "cook-components", label: "🍳 Cook Components", sound: "sizzle", shortcut: "d", action: "Multiple thali components cook simultaneously across the stove line." },
      { id: "fresh-roti", label: "🫓 Fresh Roti", sound: "sizzle", action: "Fresh rotis puff on the tawa and are stacked in a steel basket." },
    ],
    plating: [
      { id: "thali", label: "🥗 Assemble Thali", sound: "ding", action: "A full thali is arranged — rice, dal, sabzi, roti, papad, pickle, and sweet on a steel plate." },
    ],
  },
];

const GENERIC_PROFILE: Profile = {
  id: "generic",
  keywords: /.*/,
  timeLimitSec: 90,
  ingredients: [
    { id: "onion", label: "🧅 Chop Onions", sound: "chop", action: "Onions are finely chopped on a steel board as prep begins." },
    { id: "tomato", label: "🍅 Add Tomatoes", sound: "sizzle", action: "Tomatoes are diced and added to the cooking base." },
    { id: "ginger-garlic", label: "🫚 Ginger-Garlic", sound: "sizzle", action: "Ginger-garlic paste sizzles in hot ghee." },
    { id: "spices", label: "🌶️ Spice Tadka", sound: "pop", shortcut: "p", action: "Mustard seeds and garam masala are added at the pass." },
    { id: "coriander", label: "🌿 Fresh Coriander", sound: "chop", action: "Fresh coriander is chopped for garnish." },
  ],
  equipment: [
    { id: "tawa", label: "🔥 Heat Tawa", sound: "flame", shortcut: "t", action: "The tawa is heated over high flame." },
    { id: "kadhai", label: "🍳 Heat Kadhai", sound: "flame", action: "A kadhai heats with ghee foaming on the surface." },
  ],
  cooking: [
    { id: "cook-main", label: "👨‍🍳 Cook Dish", sound: "sizzle", shortcut: "d", action: "The main dish is cooked with careful stirring and seasoning." },
    { id: "season", label: "✨ Season & Taste", sound: "sizzle", action: "The chef seasons, stirs, and adjusts flavours until the dish is perfect." },
  ],
  plating: [
    { id: "plate-dish", label: "🍽️ Plate Dish", sound: "ding", action: "The finished dish is beautifully plated and garnished at the service pass." },
  ],
};

function matchProfile(dish: string): Profile {
  const normalized = dish.trim();
  for (const profile of PROFILES) {
    if (profile.id !== "generic" && profile.keywords.test(normalized)) {
      return profile;
    }
  }
  return GENERIC_PROFILE;
}

const TIME_MIN_SEC = 60;
const TIME_MAX_SEC = 240;

function clampTimeLimit(sec: number): number {
  return Math.max(TIME_MIN_SEC, Math.min(TIME_MAX_SEC, Math.round(sec)));
}

/** Extra seconds per checklist step beyond a typical 6-step order (incl. serve). */
function scaleTimeByStepCount(baseSec: number, stepCount: number): number {
  const extraSteps = Math.max(0, stepCount - 6);
  return clampTimeLimit(baseSec + extraSteps * 10);
}

function presetTimeForDish(dishLabel: string): number | undefined {
  const normalized = dishLabel.trim().toLowerCase();
  const slug = slugify(dishLabel);
  return KITCHEN_ORDERS.find(
    (o) =>
      o.label.toLowerCase() === normalized ||
      o.id === slug ||
      normalized.includes(o.label.split("+")[0].trim().toLowerCase()),
  )?.timeLimitSec;
}

/** Resolve a fair countdown for the dish type and recipe length. */
export function resolveTimeLimitForOrder(
  dishLabel: string,
  idealStepIds: readonly string[],
  options: { presetTime?: number; aiTime?: number } = {},
): number {
  const stepCount = idealStepIds.length || 6;
  const presetBase = options.presetTime ?? presetTimeForDish(dishLabel);
  if (presetBase != null) {
    return scaleTimeByStepCount(presetBase, stepCount);
  }

  if (
    typeof options.aiTime === "number" &&
    options.aiTime >= TIME_MIN_SEC
  ) {
    return scaleTimeByStepCount(Math.min(options.aiTime, TIME_MAX_SEC), stepCount);
  }

  const profileBase = matchProfile(dishLabel).timeLimitSec;
  return scaleTimeByStepCount(profileBase, stepCount);
}

export function formatTimeLimit(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Apply dish-specific time limit to a plan (preset, profile, AI, or step count). */
export function withDishTimeLimit(
  plan: KitchenPlan,
  options: { presetTime?: number; aiTime?: number } = {},
): KitchenPlan {
  const timeLimitSec = resolveTimeLimitForOrder(
    plan.order.label,
    plan.order.idealStepIds,
    {
      presetTime: options.presetTime,
      aiTime: options.aiTime ?? plan.order.timeLimitSec,
    },
  );
  if (timeLimitSec === plan.order.timeLimitSec) return plan;
  return { ...plan, order: { ...plan.order, timeLimitSec } };
}

function slugify(dish: string): string {
  return dish
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || "custom-dish";
}

/** Tailor protein / marinade steps to the dish name (e.g. paneer vs chicken biryani). */
function adaptStepForDish(dish: string, def: StepDef): StepDef {
  const d = dish.toLowerCase();

  if (def.id === "marinade") {
    if (/\b(fish|machhi|meen|prawn|jhinga)\b/.test(d)) {
      return {
        ...def,
        label: "🐟 Marinate Fish",
        action:
          "Fish is marinated with turmeric, chili, and lemon in a steel tray before cooking.",
      };
    }
    if (/\b(mutton|lamb|gosht|beef)\b/.test(d)) {
      return {
        ...def,
        label: "🥩 Marinate Meat",
        action:
          "Mutton is marinated with yogurt, ginger-garlic, and biryani masala in a steel tray.",
      };
    }
    if (/\b(paneer|tofu)\b/.test(d)) {
      return {
        ...def,
        label: "🧀 Marinate Paneer",
        action:
          "Paneer cubes are marinated with spices and yogurt before layering or grilling.",
      };
    }
  }

  if (def.id === "add-protein") {
    if (/\b(fish|machhi|meen|prawn|jhinga)\b/.test(d)) {
      return {
        ...def,
        label: "🐟 Add Fish",
        action: "Fish pieces are added to the gravy and simmered until flaky.",
      };
    }
    if (/\b(chicken|murg|murgh)\b/.test(d)) {
      return {
        ...def,
        label: "🍗 Add Chicken",
        action: "Chicken pieces are added to the gravy and simmered until tender.",
      };
    }
    if (/\b(mutton|lamb|gosht)\b/.test(d)) {
      return {
        ...def,
        label: "🥩 Add Mutton",
        action: "Mutton is added to the gravy and slow-cooked until tender.",
      };
    }
  }

  return def;
}

export function matchProfileId(dishName: string): string {
  return matchProfile(dishName.trim()).id;
}

/** Map preset step ids → profile-based interaction suffixes on the built plan. */
const PRESET_STEP_ALIASES: Record<string, readonly string[]> = {
  "stir-biryani": ["layer-biryani", "stir-biryani"],
  "plating-coach": ["biryani-handi", "raita-side", "thali", "plate-dish", "plating-coach"],
  "team-huddle": ["team-huddle", "head-chef-briefing"],
  "flip-paratha": ["flip-paratha", "spread-batter", "fresh-roti"],
  "brew-chai": ["brew-chai", "brew", "pull-pour"],
  thali: ["thali", "plate-dish"],
  "mash-bhaji": ["mash-bhaji", "cook-main"],
  kadhai: ["kadhai", "handi", "tawa"],
  tawa: ["tawa", "handi"],
};

export function resolveInteractionId(
  interactions: KitchenInteraction[],
  baseId: string,
): string | undefined {
  const candidates = [baseId, ...(PRESET_STEP_ALIASES[baseId] ?? [])];
  for (const candidate of candidates) {
    const found = interactions.find(
      (i) => i.id === candidate || i.id.endsWith(`-${candidate}`),
    )?.id;
    if (found) return found;
  }
  return undefined;
}

export function getPlanIngredients(plan: KitchenPlan): KitchenInteraction[] {
  return plan.interactions.filter((i) => i.category === "ingredients");
}

export function assembleKitchenPlan(params: {
  dish: string;
  slug: string;
  timeLimitSec: number;
  ingredients: StepDef[];
  equipment: StepDef[];
  cooking: StepDef[];
  plating: StepDef[];
  source?: KitchenPlan["source"];
  images?: KitchenPlan["images"];
}): KitchenPlan {
  const { dish, slug, timeLimitSec, source, images } = params;

  const ingredients = params.ingredients.map((raw) => {
    const def = adaptStepForDish(dish, raw);
    return toInteraction(dish, { ...def, id: `${slug}-${def.id}` }, "ingredients");
  });
  const equipment = params.equipment.map((raw) => {
    const def = adaptStepForDish(dish, raw);
    return toInteraction(dish, { ...def, id: `${slug}-${def.id}` }, "equipment");
  });
  const cooking = params.cooking.map((raw) => {
    const def = adaptStepForDish(dish, raw);
    return toInteraction(dish, { ...def, id: `${slug}-${def.id}` }, "cooking");
  });
  const plating = params.plating.map((raw) => {
    const def = adaptStepForDish(dish, raw);
    return toInteraction(dish, { ...def, id: `${slug}-${def.id}` }, "dishes");
  });
  const chefs = CHEF_STEPS.map((d) => toInteraction(dish, d, "chefs"));
  const serve = SERVE_STEPS.map((d) =>
    toInteraction(dish, adaptServeForDish(dish, d), "serve"),
  );

  const interactions = [
    ...chefs,
    ...ingredients,
    ...equipment,
    ...cooking,
    ...plating,
    ...serve,
  ];

  const idealStepIds = computeIdealStepIds(
    chefs,
    ingredients,
    equipment,
    cooking,
    plating,
  );

  const hintParts = idealStepIds.map((id) => {
    const step = interactions.find((i) => i.id === id);
    return step?.label.replace(/^[^\s]+\s/, "").trim() ?? "Step";
  });

  return {
    order: {
      id: slug,
      label: dish,
      hint: hintParts.join(" → "),
      idealStepIds,
      timeLimitSec,
    },
    interactions,
    shortcutMap: new Map(
      interactions.filter((i) => i.shortcut).map((i) => [i.shortcut!, i]),
    ),
    source,
    images,
  };
}

export function buildCustomKitchenPlan(dishName: string): KitchenPlan | null {
  const dish = dishName.trim();
  if (!dish) return null;

  const profile = matchProfile(dish);
  const slug = slugify(dish);

  return withDishTimeLimit(
    assembleKitchenPlan({
      dish,
      slug,
      timeLimitSec: profile.timeLimitSec,
      ingredients: profile.ingredients,
      equipment: profile.equipment,
      cooking: profile.cooking,
      plating: profile.plating,
      source: profile.id === "generic" ? "profile" : "profile",
    }),
  );
}

export { KITCHEN_CATEGORIES };
