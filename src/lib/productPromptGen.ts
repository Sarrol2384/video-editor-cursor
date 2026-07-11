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
Scene and subject suggestions must describe neutral home settings with ZERO logos, signs, readable text, or retailer branding anywhere in the environment.
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
    "scenePrompt": ["3-4 neutral home scenes — Coloured or Black South African people in sharp mid-shot, product visible, absolutely NO signs, logos, or readable text in the room"],
    "benefitsPrompt": ["3-4 key messages for narration/text — match THIS product only"],
    "subjectPrompt": ["3-4 product placement in home setting — plain background, no signage, no store branding"],
    "narrationScript": ["3-4 voice-over scripts, 25-45 words each, mention ${input.pharmacyName}"],
    "textHeadlines": ["3-4 short headlines for on-screen text"],
    "textSubheadlines": ["3-4 subheadlines"],
    "textCtas": ["3-4 call-to-action lines e.g. Ask Your Pharmacist"]
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

function asStringArray(value: unknown, min = 1): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .map((s) => s.trim())
    .slice(0, 6)
    .filter((_, i, arr) => arr.length >= min || i < min);
}

function normalizeSuggestions(
  raw: Partial<AiPromptSuggestions> | undefined,
  productName: string
): AiPromptSuggestions {
  return {
    scenePrompt: asStringArray(raw?.scenePrompt, 3),
    benefitsPrompt: asStringArray(raw?.benefitsPrompt, 3),
    subjectPrompt: asStringArray(raw?.subjectPrompt, 3),
    narrationScript: asStringArray(raw?.narrationScript, 3),
    textHeadlines: asStringArray(raw?.textHeadlines, 3),
    textSubheadlines: asStringArray(raw?.textSubheadlines, 3),
    textCtas: asStringArray(raw?.textCtas, 3),
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
    if (!Array.isArray(arr) || arr.length < 2) {
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
