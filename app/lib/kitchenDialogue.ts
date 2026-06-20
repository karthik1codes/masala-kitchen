import type { KitchenPlan } from "./kitchenCustom";
import { isServeStepId } from "./kitchenCustom";
import type { KitchenInteraction } from "./kitchen";

export type ChefNumber = 1 | 2 | 3;

export interface DialogueLine {
  chef: ChefNumber;
  text: string;
}

export function extractDialogueIngredients(plan: KitchenPlan): string[] {
  return plan.interactions
    .filter((i) => i.category === "ingredients")
    .map((i) => i.label.replace(/^[^\s]+\s/, "").trim())
    .filter(Boolean);
}

const KNOWN_STEP_IDS = [
  "head-chef-briefing",
  "tawa-chef-shout",
  "pass-window-banter",
  "tasting-spoon",
  "apprentice-chop",
  "expeditor-call",
  "flame-show",
  "team-huddle",
  "plating-coach",
  "celebrate-service",
  "serve-customer",
  "rush-hour",
  "happy-customer",
  "ginger-garlic",
  "pressure-cooker",
  "spread-batter",
  "potato-masala",
  "stir-biryani",
  "mash-bhaji",
  "brew-chai",
  "flip-paratha",
  "dosa-plate",
  "biryani-handi",
  "thali",
  "onion",
  "tomato",
  "spices",
  "coriander",
  "batter",
  "rice",
  "tawa",
  "kadhai",
  "chimta",
  "kettle",
  "handi",
  "plate-dish",
  "cook-main",
  "season",
  "potato",
  "marinade",
  "saffron",
  "cream",
  "veggies",
  "masala",
  "chutney",
  "butter",
  "dal",
  "vegetable",
  "dough",
  "ghee",
  "milk",
  "sugar",
  "crisp-edges",
  "layer-biryani",
  "steam-dum",
  "raita-side",
  "naan-side",
  "curry-bowl",
  "street-plate",
  "bread-basket",
  "fry-snack",
  "toast-pav",
  "fryer",
  "simmer-gravy",
  "add-protein",
  "slow-cook",
  "cook-bread",
  "flame-puff",
  "brew",
  "pull-pour",
  "serve-drink",
  "cook-components",
  "fresh-roti",
] as const;

function baseStepId(id: string): string {
  for (const stepId of KNOWN_STEP_IDS) {
    if (id === stepId || id.endsWith(`-${stepId}`)) return stepId;
  }
  return id.includes("-") ? id.slice(id.lastIndexOf("-") + 1) : id;
}

/** Hindi / Hinglish kitchen banter — 2 lines per button for fast interactive TTS. */
const INTERACTION_DIALOGUES: Record<string, (dish: string) => DialogueLine[]> = {
  onion: (dish) => [
    { chef: 1, text: `Pehle pyaaz baarik kaato — ${dish} ki buniyaad yahi se banti hai.` },
    { chef: 3, text: `PYAAZ JALDI! LINE MAT ROK!` },
  ],
  tomato: (dish) => [
    { chef: 2, text: `Tamatar kadhai mein daalo — ${dish} ke liye gaadhi gravy chahiye.` },
    { chef: 3, text: `TAMATAR PAK GAYE! AAGE BADHO!` },
  ],
  "ginger-garlic": (dish) => [
    { chef: 1, text: `Adrak-lehsun paste daalo — ${dish} ki khushboo yahi se aayegi.` },
    { chef: 3, text: `ADRAK-LEHSUN TEEZ! KADHAI GARAM HAI!` },
  ],
  spices: (dish) => [
    { chef: 1, text: `Tadka lagao — ${dish} mein masala santulit rakho.` },
    { chef: 3, text: `TADKA ABHI! RAI UDD RAHI HAI!` },
  ],
  coriander: (dish) => [
    { chef: 2, text: `Taaza dhaniya kaat kar sajao — ${dish} par hara rang chahiye.` },
    { chef: 1, text: `Dhaniya upar se, garam plate par.` },
  ],
  batter: (dish) => [
    { chef: 3, text: `Batter taaza hai? ${dish} ke liye kurkura chahiye!` },
    { chef: 1, text: `Thanda batter, garam tawa — yaad rakho.` },
  ],
  rice: (dish) => [
    { chef: 2, text: `Chawal achhe se dho kar bhigo — ${dish} ke liye lambe daane chahiye.` },
    { chef: 3, text: `BASMATI TAIYAAR! AGla KADAM!` },
  ],
  potato: (dish) => [
    { chef: 2, text: `Aloo ubaalo aur masala bharwan — ${dish} ke liye taiyaar karo.` },
    { chef: 3, text: `ALOO TAIYAAR! DOSA MEIN BHARO!` },
  ],
  marinade: (dish) => [
    { chef: 1, text: `Marinade lagao — ${dish} mein masala andar tak jana chahiye.` },
    { chef: 3, text: `MARINADE ABHI! REST TIME DO!` },
  ],
  saffron: (dish) => [
    { chef: 2, text: `Kesar doodh taiyaar karo — ${dish} ki paraton ke liye.` },
    { chef: 1, text: `Sunehra rang, dheere dheere daalo.` },
  ],
  cream: (dish) => [
    { chef: 1, text: `Malai daalo — ${dish} ki gravy silky honi chahiye.` },
    { chef: 3, text: `CREAM SWIRL! PASS READY!` },
  ],
  veggies: (dish) => [
    { chef: 2, text: `Sabzi kaat kar taiyaar karo — ${dish} ke liye.` },
    { chef: 3, text: `SABZI JALDI! TAWA GARAM HAI!` },
  ],
  masala: (dish) => [
    { chef: 3, text: `PAV BHAJI MASALA! ZYADA MAT DAAL!` },
    { chef: 1, text: `${dish} ke liye masala level check karo.` },
  ],
  chutney: (dish) => [
    { chef: 2, text: `Chutney katoris mein — ${dish} ke saath mint aur imli.` },
    { chef: 1, text: `Pass par set karo, garnish ready rakho.` },
  ],
  butter: (dish) => [
    { chef: 3, text: `MAKKHAN DAALO! PAV TAWE PAR!` },
    { chef: 2, text: `${dish} ke liye extra butter, customer ko pasand hai.` },
  ],
  dal: (dish) => [
    { chef: 2, text: `Dal ubaalo — ${dish} thali ka main component hai.` },
    { chef: 3, text: `DAL SIMMER! TADKA READY!` },
  ],
  vegetable: (dish) => [
    { chef: 1, text: `Seasonal sabzi — ${dish} ke liye aloo-gobhi ya beans.` },
    { chef: 2, text: `Tadka lagao, pass par warm rakho.` },
  ],
  dough: (dish) => [
    { chef: 2, text: `Atta gundho — ${dish} ke liye soft dough chahiye.` },
    { chef: 3, text: `DOUGH READY! TAWA GARAM!` },
  ],
  ghee: (dish) => [
    { chef: 1, text: `Ghee brush karo — ${dish} par chamak aani chahiye.` },
    { chef: 3, text: `GHEE LAGAO! FLAME PAR PUFF!` },
  ],
  milk: (dish) => [
    { chef: 2, text: `Doodh daalo — ${dish} ke saath chai ya coffee.` },
    { chef: 1, text: `Garam doodh, overflow mat hone do.` },
  ],
  sugar: (dish) => [
    { chef: 1, text: `Cheeni aur strain — ${dish} ke liye meetha balance.` },
    { chef: 2, text: `Kulhad mein serve, pass saaf rakho.` },
  ],
  tawa: (dish) => [
    { chef: 2, text: `Tawa garam karo — tel chamke tab ${dish} shuru karo.` },
    { chef: 3, text: `TAWA TAIYAAR! ${dish.toUpperCase()} ABHI!` },
  ],
  kadhai: (dish) => [
    { chef: 1, text: `Pehle kadhai garam karo — ${dish} ki gravy yahi banegi.` },
    { chef: 3, text: `KADHAI SE DHUAN! GHEE DAALO!` },
  ],
  "pressure-cooker": (dish) => [
    { chef: 2, text: `Cooker par dheemi aanch — ${dish} ke liye dal achhi tarah pake.` },
    { chef: 3, text: `SITI BAJI! AGla STATION!` },
  ],
  chimta: (dish) => [
    { chef: 3, text: `CHIMTA PAKDO! JALDI PALAT!` },
    { chef: 1, text: `Dono taraf sama rang — ${dish} ke saath garam roti.` },
  ],
  kettle: (dish) => [
    { chef: 1, text: `Kettle ubaalo — ${dish} ke saath achhi chai chahiye.` },
    { chef: 2, text: `Teen minute, phir kulhad mein daalo.` },
  ],
  handi: (dish) => [
    { chef: 2, text: `Handi dum par rakho — ${dish} ki khushboo bahar mat aane do.` },
    { chef: 3, text: `BIRYANI RESTING! KOI MAT CHHUE!` },
  ],
  "spread-batter": (dish) => [
    { chef: 3, text: `DOSA BATTER FAILAO! ${dish.toUpperCase()} KURKURA CHAHIYE!` },
    { chef: 1, text: `Spiral mein failao — kinaare sunehre hone chahiye.` },
  ],
  "potato-masala": (dish) => [
    { chef: 2, text: `Aloo masala tawe par milao — ${dish} ke liye masaledaar bharwan.` },
    { chef: 3, text: `ALOO MASALA TAIYAAR! DOSA MEIN BHARO!` },
  ],
  "stir-biryani": (dish) => [
    { chef: 1, text: `Chawal aur maans ki paraton banao — ${dish} mein kesar ki dhaar.` },
    { chef: 3, text: `BIRYANI DUM PAR! DHAKKAN MAT KHOLO!` },
  ],
  "mash-bhaji": (dish) => [
    { chef: 2, text: `Sabzi maslo — ${dish} ke liye makkhan aur masala achhe se.` },
    { chef: 3, text: `PAV BHAJI TAWE PAR! MAKKHAN DAALO!` },
  ],
  "brew-chai": (dish) => [
    { chef: 1, text: `Masala chai ubaalo — ${dish} ke saath adrak-ilaichi wali.` },
    { chef: 2, text: `Kettle unchi, kulhad mein lambi dhaar.` },
  ],
  "flip-paratha": (dish) => [
    { chef: 3, text: `PARATHA PALTO! ${dish.toUpperCase()} KE SAATH GARAM ROTI!` },
    { chef: 1, text: `Dono taraf sunehre dhabbe — ghee lagate raho.` },
  ],
  "cook-main": (dish) => [
    { chef: 2, text: `${dish} pakao — aanch santulit rakho.` },
    { chef: 3, text: `MUKHYA DISH CHULHE PAR! JALDI!` },
  ],
  season: (dish) => [
    { chef: 1, text: `${dish} chakho — namak aur masala theek hai?` },
    { chef: 2, text: `Thoda aur swaad, phir plate par.` },
  ],
  "dosa-plate": (dish) => [
    { chef: 2, text: `Dosa plate karo — ${dish} ke saath chutney aur sambhar.` },
    { chef: 3, text: `PASS PAR RAKHO! GRAHAK INTZAAR KAR RAHA HAI!` },
  ],
  "biryani-handi": (dish) => [
    { chef: 1, text: `Handi kholo — ${dish} ki sugandh poori rasoi mein.` },
    { chef: 3, text: `BIRYANI PASS PAR! SAJAKAR RAKHO!` },
  ],
  thali: (dish) => [
    { chef: 2, text: `Thali sajao — ${dish} ke saath chawal, dal, sabzi, papad.` },
    { chef: 1, text: `Rang-birangi thali, pass par chamakti.` },
  ],
  "plate-dish": (dish) => [
    { chef: 2, text: `${dish} sajakar pass par rakho — garnish saaf.` },
    { chef: 3, text: `PLATE TAIYAAR! SERVE KARO!` },
  ],
  "serve-customer": (dish) => [
    { chef: 1, text: `${dish} grahak ko do — muskaan ke saath.` },
    { chef: 3, text: `TABLE KO JAO! GARAM-GARAM!` },
  ],
  "rush-hour": (dish) => [
    { chef: 3, text: `RUSH AA GAYA! ${dish.toUpperCase()} AUR DAS ORDER! CHALO!` },
    { chef: 2, text: `Sab station fire! Ek-ek ticket!` },
  ],
  "happy-customer": (dish) => [
    { chef: 1, text: `Grahak khush hai — ${dish} bahut pasand aaya!` },
    { chef: 2, text: `Thumbs up mila! Agla order taiyaar karo.` },
  ],
  "head-chef-briefing": (dish) => [
    { chef: 1, text: `Suno sab — ${dish} prathamikta wala ticket hai.` },
    { chef: 3, text: `MAIN TAWE PAR HOON! FIRE BOLNA!` },
  ],
  "tawa-chef-shout": (dish) => [
    { chef: 3, text: `${dish.toUpperCase()}! EK NUMBER! KURKURA!` },
    { chef: 2, text: `Table chaar intzaar — tez karo!` },
  ],
  "pass-window-banter": (dish) => [
    { chef: 2, text: `${dish} mein mirchi thodi kam daal.` },
    { chef: 3, text: `GRAHAK NE EXTRA SPICE MAANGA THA!` },
  ],
  "tasting-spoon": (dish) => [
    { chef: 1, text: `Chakh kar batao — ${dish} santulit hai?` },
    { chef: 3, text: `MERI SIDE TAIYAAR — PASS PAR RAKHOON?` },
  ],
  "apprentice-chop": (dish) => [
    { chef: 1, text: `Ungliyan modho — ${dish} ki taiyaari shuru.` },
    { chef: 3, text: `MAIN CHHEELUNGA, TU KAT!` },
  ],
  "expeditor-call": (dish) => [
    { chef: 2, text: `SUN LIYA! ${dish.toUpperCase()} TABLE CHAAR! CHALO!` },
    { chef: 3, text: `DO MINUTE MEIN AA RAHA HAI!` },
  ],
  "flame-show": (dish) => [
    { chef: 3, text: `AAG DEKHO! TADKA ABHI!` },
    { chef: 1, text: `Niyantran mein — ${dish} jale nahi.` },
  ],
  "team-huddle": (dish) => [
    { chef: 1, text: `Teen minute mein ${dish} — station clear?` },
    { chef: 3, text: `TAWA AUR KADHAI DONO GARAM! CHALO!` },
  ],
  "plating-coach": (dish) => [
    { chef: 1, text: `Plate symmetry — ${dish} sharp dikhna chahiye.` },
    { chef: 3, text: `PASS PAR! GRAHAK DEKH RAHA HAI!` },
  ],
  "celebrate-service": (dish) => [
    { chef: 1, text: `Shabash — ${dish} bahut achha gaya!` },
    { chef: 2, text: `Grahak khush, agla order taiyaar!` },
  ],
};

function genericByCategory(
  category: KitchenInteraction["category"],
  dish: string,
  action: string,
): DialogueLine[] {
  switch (category) {
    case "ingredients":
      return [
        { chef: 2, text: `${action} shuru karo — ${dish} ke liye zaroori hai.` },
        { chef: 3, text: `JALDI! SAMAGRI TAIYAAR KARO!` },
      ];
    case "equipment":
      return [
        { chef: 1, text: `Pehle ${action} — ${dish} bina iske nahi banega.` },
        { chef: 3, text: `STATION TAIYAAR! AAG CHECK KARO!` },
      ];
    case "cooking":
      return [
        { chef: 2, text: `${action} — ${dish} chulhe par pak raha hai.` },
        { chef: 3, text: `TEZ! ${dish.toUpperCase()} JALDI CHAHIYE!` },
      ];
    case "dishes":
      return [
        { chef: 1, text: `${action} — ${dish} sajakar pass par.` },
        { chef: 3, text: `PLATE TAIYAAR! SERVE KARO!` },
      ];
    case "serve":
      return [
        { chef: 1, text: `${action} — ${dish} grahak ko.` },
        { chef: 3, text: `JALDI! GRAHAK WAIT KAR RAHA HAI!` },
      ];
    case "chefs":
      return [
        { chef: 1, text: `${dish} par focus — ticket board par hai.` },
        { chef: 3, text: `CHALO! ORDER PENDING HAI!` },
      ];
    default:
      return [
        { chef: 1, text: `${dish} — agla kadam.` },
        { chef: 2, text: `Taiyaar raho, kitchen chal rahi hai.` },
      ];
  }
}

function actionLabel(item: KitchenInteraction): string {
  return item.label.replace(/^[^\s]+\s/, "").trim();
}

export function buildInteractionDialogue(
  item: KitchenInteraction,
  dishName: string,
  customDialogues?: Record<string, string[]>,
): DialogueLine[] {
  const dish = dishName.trim() || "vishesh order";
  const stepId = baseStepId(item.id);

  const custom = customDialogues?.[stepId] ?? customDialogues?.[item.id];
  if (custom?.length) {
    return custom.slice(0, 3).map((text, i) => ({
      chef: ((i % 3) + 1) as ChefNumber,
      text,
    }));
  }

  const builder = INTERACTION_DIALOGUES[stepId];
  if (builder) return builder(dish);
  return genericByCategory(item.category, dish, actionLabel(item));
}

export function previewInteractionDialogue(
  item: KitchenInteraction,
  dishName: string,
  customDialogues?: Record<string, string[]>,
): string {
  const lines = buildInteractionDialogue(item, dishName, customDialogues);
  return lines[0]?.text ?? "Chef bol rahe hain…";
}

/** Chef scolds the player for skipping prep steps — reset to Step 1. */
export function buildWrongStepDialogue(
  plan: KitchenPlan,
  expected: { number: number; shortLabel: string },
): DialogueLine[] {
  const dish = plan.order.label.trim() || "vishesh order";
  const firstId = plan.order.idealStepIds[0];
  const firstStep = firstId
    ? plan.interactions.find((i) => i.id === firstId)?.label.replace(/^[^\s]+\s/, "").trim()
    : "pehla step";

  return [
    {
      chef: 3,
      text: `RUKO! Galat step! Pehle Step ${expected.number} karo — ${expected.shortLabel}!`,
    },
    {
      chef: 1,
      text: `${dish} ke liye order follow karo. Shuru se phir se — Step 1 se: ${firstStep ?? "taiyaari"}.`,
    },
    { chef: 3, text: `STEP 1 SE SHURU! LINE MAT BIGAD!` },
  ];
}

/** Chef blocks serve before prep/cook/plate is complete. */
export function buildServeTooEarlyDialogue(
  plan: KitchenPlan,
  pendingCount: number,
): DialogueLine[] {
  const dish = plan.order.label.trim() || "vishesh order";
  return [
    {
      chef: 3,
      text: `ABHI SERVE NAHI! ${dish} mein abhi ${pendingCount} step baaki hain!`,
    },
    {
      chef: 1,
      text: `Pehle poori taiyaari karo — prep guide ke hisaab se step-by-step chalo.`,
    },
  ];
}

/** Opening call when an order ticket arrives — walks through numbered prep steps. */
export function buildOrderCallDialogue(plan: KitchenPlan): DialogueLine[] {
  const dish = plan.order.label.trim() || "vishesh order";
  const steps = plan.order.idealStepIds
    .map((id) => plan.interactions.find((i) => i.id === id))
    .filter(Boolean) as KitchenInteraction[];

  const prepSteps = steps.filter((s) => !isServeStepId(s.id));
  const serveStep = steps.find((s) => isServeStepId(s.id));

  const first = prepSteps[0]?.label.replace(/^[^\s]+\s/, "").trim() ?? "taiyaari";
  const numbered = prepSteps
    .slice(0, 4)
    .map((s, i) => `${i + 1}) ${s.label.replace(/^[^\s]+\s/, "").trim()}`)
    .join(", ");

  const lines: DialogueLine[] = [
    { chef: 2, text: `Suniye sab — ${dish} ka ticket board par aa gaya hai!` },
    {
      chef: 1,
      text: `Taiyaari ka order: ${numbered}${prepSteps.length > 4 ? ", aur baaki steps" : ""}. Pehle step se shuru — ${first}.`,
    },
  ];

  if (serveStep) {
    lines.push({
      chef: 1,
      text: `Sab steps ke baad ${serveStep.label.replace(/^[^\s]+\s/, "").trim()} — tabhi ${dish} table par jayega.`,
    });
  }

  lines.push({ chef: 3, text: `${dish.toUpperCase()}! LINE CHALU! JALDI!` });
  return lines;
}

export function buildStepDialogue(
  plan: KitchenPlan,
  stepId: string,
): DialogueLine[] | null {
  const item = plan.interactions.find((i) => i.id === stepId);
  if (!item) return null;
  return buildInteractionDialogue(item, plan.order.label, plan.customDialogues);
}

export function buildKitchenDialogue(
  dishName: string,
  ingredients: string[] = [],
): DialogueLine[] {
  const dish = dishName.trim() || "vishesh order";
  const ing1 = ingredients[0]?.trim() || "pyaaz";
  const ing2 = ingredients[1]?.trim() || "adrak-lehsun";
  const ing3 = ingredients[2]?.trim() || "masala";
  const ing4 = ingredients[3]?.trim() || "dhaniya";

  return [
    { chef: 1, text: `Arre bhai, ${dish} ka order aa gaya hai.` },
    { chef: 2, text: `Pehle ${ing1} aur ${ing2} taiyaar karo — table chaar wait kar rahi hai.` },
    { chef: 3, text: `${dish.toUpperCase()}! PASS PAR! JALDI!` },
    { chef: 1, text: `${ing1} kaat liya, ${ing2} bhi ready hai.` },
    { chef: 2, text: `Table chaar — ${dish.toUpperCase()}! Masala level sahi rakhna!` },
    { chef: 3, text: `${ing3} aur ${ing4} chahiye garnish ke liye.` },
    { chef: 1, text: `Aag thodi kam karo — ${dish} jalna nahi chahiye.` },
    { chef: 3, text: `PASS PAR RAKHO! ${dish.toUpperCase()} READY!` },
  ];
}

export function buildKitchenDialogueShort(
  dishName: string,
  ingredients: string[] = [],
): DialogueLine[] {
  const dish = dishName.trim() || "vishesh order";
  const ing1 = ingredients[0]?.trim() || "pyaaz";
  const ing2 = ingredients[1]?.trim() || "masala";

  return [
    { chef: 1, text: `${dish} ka order abhi aaya hai.` },
    { chef: 3, text: `${dish.toUpperCase()}! JALDI KARO!` },
    { chef: 2, text: `${ing1} aur ${ing2} ready karo — table chaar waiting.` },
    { chef: 3, text: `PASS PAR! ${dish.toUpperCase()} READY!` },
  ];
}

export function dialogueCharCount(lines: DialogueLine[]): number {
  return lines.reduce((n, l) => n + l.text.length, 0);
}
