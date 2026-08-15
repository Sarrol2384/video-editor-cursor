import type { AiProductContext, AiPromptSuggestions } from "@/lib/types";
import { isFalConfigured, runVisionLlm, uploadImageToFal } from "@/lib/falClient";

export interface ProductPromptGenInput {
  productName: string;
  pharmacyName: string;
  sourceImageUrl: string;
}

export interface ProductPromptGenResult {
  suggestions: AiPromptSuggestions;
  productContext: AiProductContext;
}

interface RawAiResponse {
  productContext?: AiProductContext;
  suggestions?: Partial<AiPromptSuggestions>;
}

const SYSTEM_PROMPT = `You analyze pharmacy product packaging photos for South African pharmacy video ads.
Respond with ONLY valid JSON — no markdown fences, no commentary.
Do not invent medical claims beyond what is visible on the pack or widely known for the named product.
Use pharmacist-recommended, compliant language. Avoid cure claims.
Scene and subject suggestions must describe everyday South African lifestyle settings — mix of home AND outdoor/public-friendly places (garden patio, park picnic, coastal promenade, cafe patio, office balcony break, after exercise in a park). ZERO logos, signs, readable text, or retailer branding anywhere in the environment. Never pharmacy or retail store interiors.
Product placement suggestions must ground the pack on a real table/counter/picnic surface/bench with a contact shadow — never floating, hovering, or held in mid-air.
People in lifestyle scenes: mostly Coloured South African adults/families (~90%); occasionally Black South African adults/families (~10%). Never in-store scenes. Never mention pharmacy names in scene or subject suggestions.`;

function buildUserPrompt(input: ProductPromptGenInput): string {
  return `Product name entered by user: "${input.productName}"
Pharmacy / brand name: "${input.pharmacyName}"

Read the attached pack photo. Identify the product, category, and visible label text.

Return JSON in exactly this shape:
{
  "productContext": {
    "identifiedName": "name from pack if readable",
    "category": "e.g. cough & cold, sleep support, pain relief",
    "keyBenefits": ["benefit 1", "benefit 2"],
    "targetAudience": "e.g. adults, families with children",
    "regulatoryNote": "e.g. ask your pharmacist, schedule status if visible"
  },
  "suggestions": {
    "scenePrompt": ["10 varied lifestyle scenes — mix home AND outdoor (garden, park, patio, promenade, cafe outdoor, balcony, backyard, stoep, hike rest). Coloured or Black South African people sharp mid-shot, product on a surface, NO signs/logos/readable text"],
    "benefitsPrompt": ["6-8 key messages for narration/text — match THIS product only"],
    "subjectPrompt": ["6-8 placements with the pack RESTING on a table/picnic surface/bench with contact shadow — never floating; match each scene"],
    "narrationScript": ["6-8 voice-over scripts, 25-45 words each, mention ${input.pharmacyName}"],
    "textHeadlines": ["4-6 short headlines for on-screen text"],
    "textSubheadlines": ["4-6 subheadlines"],
    "textCtas": ["4-6 call-to-action lines e.g. Ask Your Pharmacist"]
  }
}

Every suggestion must be specific to this product — not generic sleep/cough templates.`;
}

function extractJson(text: string): string {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) return fenceMatch[1].trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return trimmed.slice(start, end + 1);
  }
  return trimmed;
}

function asStringArray(value: unknown, min = 1, max = 12): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .map((s) => s.trim())
    .slice(0, max)
    .filter((_, i, arr) => arr.length >= min || i < min);
}

function normalizeSuggestions(
  raw: Partial<AiPromptSuggestions> | undefined,
  productName: string
): AiPromptSuggestions {
  return {
    scenePrompt: asStringArray(raw?.scenePrompt, 6, 12),
    benefitsPrompt: asStringArray(raw?.benefitsPrompt, 3, 10),
    subjectPrompt: asStringArray(raw?.subjectPrompt, 4, 10),
    narrationScript: asStringArray(raw?.narrationScript, 3, 10),
    textHeadlines: asStringArray(raw?.textHeadlines, 3, 8),
    textSubheadlines: asStringArray(raw?.textSubheadlines, 3, 8),
    textCtas: asStringArray(raw?.textCtas, 3, 8),
    generatedAt: new Date().toISOString(),
    sourceProductName: productName.trim(),
  };
}

function validateResult(
  suggestions: AiPromptSuggestions
): void {
  const required: (keyof AiPromptSuggestions)[] = [
    "scenePrompt",
    "benefitsPrompt",
    "subjectPrompt",
    "narrationScript",
  ];
  for (const key of required) {
    const arr = suggestions[key];
    const minCount = key === "scenePrompt" ? 6 : 2;
    if (!Array.isArray(arr) || arr.length < minCount) {
      throw new Error(`AI returned insufficient ${key} suggestions`);
    }
  }
}

export async function generateProductPrompts(
  input: ProductPromptGenInput
): Promise<ProductPromptGenResult> {
  if (!isFalConfigured()) {
    throw new Error("FAL_KEY is not configured — add it to .env and restart the server.");
  }

  const falImageUrl = await uploadImageToFal(input.sourceImageUrl);
  const rawText = await runVisionLlm({
    prompt: buildUserPrompt(input),
    systemPrompt: SYSTEM_PROMPT,
    imageUrls: [falImageUrl],
  });

  let parsed: RawAiResponse;
  try {
    parsed = JSON.parse(extractJson(rawText)) as RawAiResponse;
  } catch {
    throw new Error("Could not parse AI response — try again or edit prompts manually.");
  }

  const suggestions = normalizeSuggestions(
    parsed.suggestions,
    input.productName
  );
  validateResult(suggestions);

  const productContext: AiProductContext = {
    identifiedName:
      parsed.productContext?.identifiedName?.trim() || input.productName.trim(),
    category: parsed.productContext?.category?.trim(),
    keyBenefits: asStringArray(parsed.productContext?.keyBenefits, 0),
    targetAudience: parsed.productContext?.targetAudience?.trim(),
    regulatoryNote: parsed.productContext?.regulatoryNote?.trim(),
  };

  return { suggestions, productContext };
}
