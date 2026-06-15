import type { ProjectSettings, TextLayer } from "@/lib/types";
import { inferWorkflowMode } from "@/lib/brands";

export type ProductTheme =
  | "sleep"
  | "pain-relief"
  | "cough-cold"
  | "wellness"
  | "family"
  | "skincare"
  | "general";

export type TextLayerRole = "headline" | "subheadline" | "price" | "cta" | "generic";

interface ThemeCopy {
  narration: string[];
  headline: string[];
  subheadline: string[];
  price: string[];
  cta: string[];
}

const THEME_COPY: Record<ProductTheme, ThemeCopy> = {
  sleep: {
    narration: [
      "Struggling to switch off at night? {product} offers gentle, non-habit forming sleep support you can trust. Ask your pharmacist — available now.",
      "When restless nights affect your whole family, {product} helps you rest easier. Natural herbal support — available at {pharmacy}.",
      "{benefits} Discover {product} at your pharmacy. Speak to your pharmacist about better sleep tonight.",
      "Your pharmacist recommends {product} for quality sleep care. Herbal support for more restful nights — in store now.",
    ],
    headline: [
      "Natural Sleep Support",
      "Restful Nights Start Here",
      "{product}",
    ],
    subheadline: [
      "Gentle, non-habit forming",
      "Herbal support for better rest",
      "Ask your pharmacist tonight",
    ],
    price: ["R129.98", "R149.99", "From R99.99"],
    cta: ["Available Now", "Ask Your Pharmacist", "In Store Today"],
  },
  "cough-cold": {
    narration: [
      "When cough season hits, families need something they can trust. {product} — {benefits} Ask your pharmacist at {pharmacy}.",
      "{product} helps relieve cough and congestion with gentle, pharmacist-recommended care. Available now.",
      "Don't let a cough slow your family down. {product} delivers soothing relief you can count on.",
      "{benefits} Choose {product} from {pharmacy} — trusted care for cough and cold season.",
    ],
    headline: ["Soothing Cough Relief", "Trusted Cold & Cough Care", "{product}"],
    subheadline: [
      "Gentle for the whole family",
      "Pharmacist recommended",
      "Fast soothing relief",
    ],
    price: ["R89.99", "R119.00", "Special R99.99"],
    cta: ["Available Now", "Ask Your Pharmacist", "Get Yours Today"],
  },
  "pain-relief": {
    narration: [
      "Don't let aches slow you down. {product} delivers effective relief your family can rely on. Available at {pharmacy} now.",
      "When discomfort strikes, reach for trusted pharmacy care. {product} — {benefits} Ask your pharmacist today.",
      "{product} is pharmacist recommended for everyday pain support. Visit {pharmacy} today.",
      "{benefits} Get back to what matters with {product}. Available now in store.",
    ],
    headline: ["Trusted Pain Support", "Feel Better Sooner", "{product}"],
    subheadline: [
      "Pharmacist recommended",
      "Gentle on your family",
      "Works fast",
    ],
    price: ["R89.99", "R119.00", "Special R99.99"],
    cta: ["Available Now", "Get Yours Today", "At Your Pharmacy"],
  },
  wellness: {
    narration: [
      "Support your everyday wellness with {product}. {benefits} Available now from {pharmacy}.",
      "Give your body the daily support it deserves. {product} — quality ingredients, trusted advice.",
      "Your wellness routine starts here. {product} helps you feel your best, every day.",
      "{benefits} Discover {product} at {pharmacy} — expert care, proven quality.",
    ],
    headline: ["Daily Wellness Support", "Feel Your Best", "{product}"],
    subheadline: [
      "Natural ingredients, real results",
      "Supports everyday vitality",
      "Trusted by your pharmacist",
    ],
    price: ["R159.99", "R199.00", "Only R129.98"],
    cta: ["Shop Now", "Available In Store", "Ask Your Pharmacist"],
  },
  family: {
    narration: [
      "Caring for your family means choosing products you can trust. {product} — {benefits} Available at {pharmacy}.",
      "From {pharmacy} to your home — {product} supports the people who matter most.",
      "Parents choose pharmacy-trusted care. {product} is gentle, effective, and ready when you need it.",
      "{benefits} Keep your family well with {product}. Ask your pharmacist today.",
    ],
    headline: ["Care For The Whole Family", "Trusted Family Wellness", "{product}"],
    subheadline: [
      "We're here for you!",
      "Gentle enough for everyone",
      "Trusted by parents",
    ],
    price: ["R99.99", "R129.98", "Family Pack R179.99"],
    cta: ["Available Now", "Visit Your Pharmacy", "In Store Today"],
  },
  skincare: {
    narration: [
      "Healthy skin starts with pharmacy-grade care. {product} — {benefits} Available at {pharmacy}.",
      "Reveal your best skin with {product}. Trusted ingredients from your local pharmacy.",
      "{benefits} Add {product} to your daily routine. Ask your pharmacist for advice.",
      "Glow with confidence. {product} delivers visible results — in store today.",
    ],
    headline: ["Healthy Skin Starts Here", "Radiant Skin Care", "{product}"],
    subheadline: [
      "Visible results, gentle formula",
      "Dermatologist trusted",
      "Daily care made simple",
    ],
    price: ["R149.99", "R179.00", "Special R129.98"],
    cta: ["Available Now", "Try It Today", "Ask In Store"],
  },
  general: {
    narration: [
      "Your pharmacist at {pharmacy} recommends {product} for quality you can trust. {benefits} Available now.",
      "Discover {product} at {pharmacy} — expert advice and proven results for your health.",
      "{benefits} Choose {product} for dependable pharmacy care. Ask our team today.",
      "New at {pharmacy}: {product}. Premium quality at a great value. Available now.",
    ],
    headline: ["Pharmacy Quality Care", "Trusted Health Support", "{product}"],
    subheadline: [
      "We're here for you!",
      "Pharmacist recommended",
      "Quality you can trust",
    ],
    price: ["R129.98", "R99.99", "Save 15% — R89.99"],
    cta: ["Available Now", "Ask Your Pharmacist", "In Store Today"],
  },
};

/** Multi-word phrases score higher than single generic words. */
const THEME_PHRASES: Record<ProductTheme, string[]> = {
  sleep: [
    "sleep support",
    "sleep aid",
    "restful sleep",
    "non-habit forming",
    "centrex",
    "siddhayu",
    "melatonin",
    "bedtime",
    "insomnia",
    "nighttime",
  ],
  "cough-cold": [
    "cough",
    "cold and flu",
    "congestion",
    "phlegm",
    "benylin",
    "sore throat",
    "runny nose",
  ],
  "pain-relief": [
    "pain relief",
    "headache",
    "muscle ache",
    "back pain",
    "inflammation",
    "fever reducer",
  ],
  wellness: [
    "vitamin",
    "immune support",
    "daily supplement",
    "multivitamin",
    "probiotic",
    "energy support",
  ],
  family: ["whole family", "for children", "parents", "kids ages", "family care"],
  skincare: ["skin care", "moistur", "serum", "acne", "dermatolog", "spf"],
  general: [],
};

const THEME_WORDS: Record<ProductTheme, string[]> = {
  sleep: ["sleep", "rest", "night", "dream", "calm", "herbal"],
  "cough-cold": ["cough", "flu", "cold", "throat"],
  "pain-relief": ["pain", "ache", "migraine", "analgesic"],
  wellness: ["wellness", "vitamin", "immune", "supplement", "herbal"],
  family: ["family", "parent", "child", "children", "baby"],
  skincare: ["skin", "face", "glow", "derma"],
  general: [],
};

/** VonWillingh Online — service / offer names for agency posts. */
export const AGENCY_SERVICE_NAME_SUGGESTIONS = [
  "Custom Business Web App",
  "Starter Website Package",
  "Digital Business Card",
  "Client Portal & Dashboard",
  "Bespoke Business Dashboard",
  "Learning Management System",
  "AI Integration Package",
  "E-Commerce Store Setup",
  "Hosting & Care Plan",
  "Website Redesign",
  "Mobile-First Web App",
  "Free Discovery Consultation",
  "API & Automation Package",
  "Custom CRM Solution",
] as const;

export function getAgencyServiceNameSuggestions(): string[] {
  return [...AGENCY_SERVICE_NAME_SUGGESTIONS];
}

const AGENCY_TEXT_COPY: ThemeCopy = {
  narration: [],
  headline: [
    "VonWillingh Online",
    "{product}",
    "Custom Web Apps for SA",
    "Your Business, Online",
  ],
  subheadline: [
    "Custom web apps for SA businesses",
    "Built locally — supported & hosted",
    "From idea to launch",
    "Websites, dashboards & tools",
  ],
  price: [],
  cta: [
    "Get a free quote",
    "Visit vonwillingh.co.za",
    "Contact us today",
    "Book a discovery call",
    "Request a quote",
    "Let's build your app",
  ],
};

function isAgencySettings(settings: ProjectSettings): boolean {
  return inferWorkflowMode(settings) === "agency";
}

function isFashionSettings(settings: ProjectSettings): boolean {
  return inferWorkflowMode(settings) === "fashion";
}

export const FASHION_PRODUCT_NAME_SUGGESTIONS = [
  "Pattern Bomber Jacket",
  "Navy Bomber Jacket",
  "Mustard Duster Cardigan",
  "Tiered Black Dress",
  "Pearl Hair Clip Set",
  "Silk Head Scarf",
  "Statement Earrings",
  "Woven Tote Bag",
  "Limited Edition Coat",
  "New Season Collection",
] as const;

export function getFashionProductNameSuggestions(): string[] {
  return [...FASHION_PRODUCT_NAME_SUGGESTIONS];
}

const FASHION_TEXT_COPY: ThemeCopy = {
  narration: [],
  headline: [
    "Pomegranate",
    "{product}",
    "New Season Drop",
    "Handmade With Care",
  ],
  subheadline: [
    "Independent South African fashion",
    "Limited pieces — shop online",
    "Artisan jackets & accessories",
    "Designed and made with heart",
  ],
  price: ["From R899", "New arrival", "Limited stock"],
  cta: [
    "Shop the collection",
    "Link in bio",
    "DM to order",
    "Available now",
    "Shop Pomegranate",
  ],
};

function buildFashionTextSuggestions(
  settings: ProjectSettings,
  layer: TextLayer
): string[] {
  if (layer.layerType === "image") return [];

  const role = inferTextLayerRole(layer);
  const product = productLabel(settings);
  const brand = pharmacyLabel(settings);
  const withNames = (items: string[]) =>
    uniqueStrings(items.map((item) => fillTemplate(item, settings)));

  switch (role) {
    case "headline":
      return uniqueStrings([
        brand,
        product !== "this product" ? product : "",
        ...withNames(FASHION_TEXT_COPY.headline),
      ]);
    case "subheadline":
      return withNames(FASHION_TEXT_COPY.subheadline);
    case "cta":
      return FASHION_TEXT_COPY.cta;
    case "price":
      return FASHION_TEXT_COPY.price;
    default:
      return uniqueStrings([
        ...withNames(FASHION_TEXT_COPY.headline.slice(0, 3)),
        ...FASHION_TEXT_COPY.cta.slice(0, 3),
      ]);
  }
}

function buildAgencyTextSuggestions(
  settings: ProjectSettings,
  layer: TextLayer
): string[] {
  if (layer.layerType === "image") return [];

  const role = inferTextLayerRole(layer);
  const product = productLabel(settings);
  const brand = pharmacyLabel(settings);
  const withNames = (items: string[]) =>
    uniqueStrings(items.map((item) => fillTemplate(item, settings)));

  switch (role) {
    case "headline":
      return uniqueStrings([
        brand,
        product !== "this product" ? product : "",
        ...withNames(AGENCY_TEXT_COPY.headline),
      ]);
    case "subheadline":
      return withNames(AGENCY_TEXT_COPY.subheadline);
    case "cta":
      return AGENCY_TEXT_COPY.cta;
    case "price":
      return [];
    default:
      return uniqueStrings([
        ...withNames(AGENCY_TEXT_COPY.headline.slice(0, 3)),
        ...AGENCY_TEXT_COPY.cta.slice(0, 3),
      ]);
  }
}

function buildHaystack(settings: ProjectSettings): string {
  return [
    settings.productName,
    settings.pharmacyName,
    settings.benefitsPrompt,
    settings.scenePrompt,
    settings.subjectPrompt,
    settings.narrationScript,
    ...settings.textLayers.map((l) => l.text),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function detectProductTheme(settings: ProjectSettings): ProductTheme {
  const text = buildHaystack(settings);
  const scores: Record<ProductTheme, number> = {
    sleep: 0,
    "cough-cold": 0,
    "pain-relief": 0,
    wellness: 0,
    family: 0,
    skincare: 0,
    general: 0,
  };

  for (const theme of Object.keys(THEME_PHRASES) as ProductTheme[]) {
    if (theme === "general") continue;
    for (const phrase of THEME_PHRASES[theme]) {
      if (text.includes(phrase)) scores[theme] += 3;
    }
    for (const word of THEME_WORDS[theme]) {
      if (text.includes(word)) scores[theme] += 1;
    }
  }

  let best: ProductTheme = "general";
  let bestScore = 0;
  for (const theme of Object.keys(scores) as ProductTheme[]) {
    if (theme === "general") continue;
    if (scores[theme] > bestScore) {
      bestScore = scores[theme];
      best = theme;
    }
  }

  return bestScore > 0 ? best : "general";
}

export function productLabel(settings: ProjectSettings): string {
  const name = settings.productName?.trim();
  if (name) return name;
  return "this product";
}

export function pharmacyLabel(settings: ProjectSettings): string {
  return settings.pharmacyName?.trim() || "your pharmacy";
}

function fillTemplate(template: string, settings: ProjectSettings): string {
  return template
    .replace(/\{product\}/g, productLabel(settings))
    .replace(/\{pharmacy\}/g, pharmacyLabel(settings))
    .replace(/\{benefits\}/g, settings.benefitsPrompt?.trim() || "trusted pharmacy care");
}

function uniqueStrings(items: string[]): string[] {
  return [...new Set(items.filter(Boolean))];
}

export function buildNarrationSuggestions(settings: ProjectSettings): string[] {
  if (isAgencySettings(settings)) {
    const product = productLabel(settings);
    const brand = pharmacyLabel(settings);
    return [
      `Need a custom web app for your business? ${brand} builds tools that fit how you work. Get a free quote today.`,
      `From dashboards to customer portals — ${brand} helps South African businesses go digital.`,
      `${product !== "this product" ? product + " — " : ""}Your brand, your workflow, your app. Contact ${brand} today.`,
      `Starter websites and custom apps — locally built and supported. Visit vonwillingh.co.za.`,
      `Book a free discovery call with ${brand}. We scope your needs and quote a clear path to go-live.`,
    ];
  }
  if (isFashionSettings(settings)) {
    const product = productLabel(settings);
    const brand = pharmacyLabel(settings);
    return [
      `Meet ${product !== "this product" ? product : "the latest piece"} from ${brand} — handmade South African fashion you'll love. Shop the collection today.`,
      `Your wardrobe deserves something special. ${brand} creates limited jackets and accessories with heart. Link in bio.`,
      `Slow fashion, big personality. Discover what's new at ${brand} — designed for women who dress with intention.`,
      `${settings.benefitsPrompt?.trim() || "Statement style, boutique quality."} Shop ${brand} online today.`,
      `From bold patterns to artisan accessories — ${brand} is independent fashion done right. Available now.`,
    ];
  }
  const theme = detectProductTheme(settings);
  return THEME_COPY[theme].narration.map((t) => fillTemplate(t, settings));
}

export function inferTextLayerRole(layer: TextLayer): TextLayerRole {
  if (layer.layerType === "image") return "generic";
  if (layer.y <= 0.11) return "headline";
  if (layer.y <= 0.2) return "subheadline";
  if (layer.y >= 0.85) return "cta";
  if (/^R\d|^\$|€|£|save\s+\d|%\s*off|only\s+r/i.test(layer.text.trim())) return "price";
  if (layer.y >= 0.4 && layer.y <= 0.7 && layer.align === "right") return "price";
  return "generic";
}

export function buildTextSuggestions(
  settings: ProjectSettings,
  layer: TextLayer
): string[] {
  if (layer.layerType === "image") return [];
  if (isAgencySettings(settings)) {
    return buildAgencyTextSuggestions(settings, layer);
  }
  if (isFashionSettings(settings)) {
    return buildFashionTextSuggestions(settings, layer);
  }

  const theme = detectProductTheme(settings);
  const role = inferTextLayerRole(layer);
  const copy = THEME_COPY[theme];
  const product = productLabel(settings);
  const pharmacy = pharmacyLabel(settings);

  const withNames = (items: string[]) =>
    uniqueStrings(items.map((item) => fillTemplate(item, settings)));

  switch (role) {
    case "headline":
      return uniqueStrings([
        pharmacy,
        product !== "this product" ? product : "",
        ...withNames(copy.headline),
      ]);
    case "subheadline":
      return withNames(copy.subheadline);
    case "price":
      return copy.price;
    case "cta":
      return copy.cta;
    default:
      return uniqueStrings([
        ...withNames(copy.headline.slice(0, 2)),
        ...copy.cta.slice(0, 2),
      ]);
  }
}
