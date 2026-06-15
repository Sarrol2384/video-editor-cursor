import path from "path";
import fs from "fs/promises";
import { v4 as uuidv4 } from "uuid";
import { editImage } from "@/lib/nanoBanana";
import {
  editImageWithFal,
  isFalConfigured,
  runBriaProductShot,
  uploadImageToFal,
} from "@/lib/falClient";
import {
  buildAgencyImagePrompt,
  buildAgencySceneDescription,
  isAgencyImageGeneration,
} from "@/lib/agencyImage";
import {
  buildFashionImagePrompt,
  buildFashionSceneDescription,
  isFashionImageGeneration,
} from "@/lib/fashionImage";
import {
  buildSceneDescription,
  getProductPlacement,
  getProductShotSize,
  PEOPLE_FOCUS_IMAGE_PROMPT,
  sceneIncludesPeople,
} from "@/lib/productShot";
import {
  generateImageVariants,
  type ImageStyle,
  type ImageVariant,
} from "@/lib/mockGen";
import type { ProjectSettings } from "@/lib/types";
import { inferWorkflowMode, POMEGRANATE_LOGO_URL, VONWILLINGH_LOGO_URL } from "@/lib/brands";
import { findVisualStyleSuggestion } from "@/lib/imageStyleSuggestions";
import { getModelById } from "@/lib/models";
import {
  getAspectFramingHint,
  normalizeAspectRatioForFal,
} from "@/lib/aspectRatio";

const STYLE_PROMPTS: { style: ImageStyle; label: string; suffix: string }[] = [
  {
    style: "professional",
    label: "Professional",
    suffix:
      "Premium studio commercial lighting, people in scene sharp and well-lit, soft blur only on distant background elements, high-end advertising photography look.",
  },
  {
    style: "lifestyle",
    label: "Lifestyle",
    suffix:
      "Warm authentic lifestyle setting, natural candid atmosphere, soft natural light, real-world context.",
  },
  {
    style: "minimalist",
    label: "Minimalist",
    suffix:
      "Minimal clean backdrop, generous negative space, soft even lighting, elegant catalog aesthetic.",
  },
  {
    style: "vibrant",
    label: "Vibrant",
    suffix:
      "Bright vibrant scene, rich saturated colors, energetic mood, eye-catching but tasteful lighting.",
  },
];

/** Prompt for Nano Banana edit — background/scene only, product must stay identical. */
export function buildAdImagePrompt(
  settings: Pick<
    ProjectSettings,
    "scenePrompt" | "benefitsPrompt" | "subjectPrompt" | "backgroundPrompt"
  >,
  styleSuffix: string
): string {
  const scene =
    settings.scenePrompt ||
    settings.backgroundPrompt ||
    "Warm wellness lifestyle scene with soft natural lighting";
  const placement =
    settings.subjectPrompt ||
    "Product positioned naturally in the scene, sharp and clearly visible";

  const peopleFocus = sceneIncludesPeople(scene, placement)
    ? PEOPLE_FOCUS_IMAGE_PROMPT
    : "";

  return [
    "Edit this product photo into a professional advertisement scene.",
    "CRITICAL: Keep the product itself EXACTLY as it is in the original photo — do not change, redraw, or restyle the packaging, label, brand name, logos, colors, or any text printed on the product. The product must remain identical and fully recognizable.",
    `Replace and extend ONLY the background/environment into: ${scene}.`,
    `Product placement: ${placement}.`,
    peopleFocus,
    "Do NOT add any text, captions, headlines, prices, logos, badges, stickers, or watermarks anywhere in the image. The scene must contain no added lettering of any kind.",
    "Photorealistic, broadcast-quality commercial photography, natural lighting and shadows that match the new background.",
    styleSuffix,
  ].join(" ");
}

async function readImageInput(sourceImageUrl: string): Promise<string> {
  if (sourceImageUrl.startsWith("data:")) return sourceImageUrl;

  if (sourceImageUrl.startsWith("http://") || sourceImageUrl.startsWith("https://")) {
    return sourceImageUrl;
  }

  const relative = sourceImageUrl.startsWith("/")
    ? sourceImageUrl.slice(1)
    : sourceImageUrl;
  const filePath = path.join(process.cwd(), "public", relative);
  const buffer = await fs.readFile(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const mime =
    ext === ".png"
      ? "image/png"
      : ext === ".webp"
        ? "image/webp"
        : ext === ".gif"
          ? "image/gif"
          : "image/jpeg";
  return `data:${mime};base64,${buffer.toString("base64")}`;
}

async function saveBase64Image(b64: string, uploadDir: string): Promise<string> {
  const raw = b64.startsWith("data:") ? b64.split(",")[1] : b64;
  const filename = `${uuidv4()}.png`;
  await fs.writeFile(path.join(uploadDir, filename), Buffer.from(raw, "base64"));
  return `/uploads/${filename}`;
}

async function downloadAndSave(url: string, uploadDir: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to download generated image: ${url}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  const filename = `${uuidv4()}.png`;
  await fs.writeFile(path.join(uploadDir, filename), buffer);
  return `/uploads/${filename}`;
}

function resolveStylePreset(style?: ImageStyle) {
  if (style) {
    return (
      STYLE_PROMPTS.find((preset) => preset.style === style) || STYLE_PROMPTS[0]
    );
  }
  return STYLE_PROMPTS[0];
}

function resolveStyleSuffix(
  settings: Pick<ProjectSettings, "visualStyleId" | "workflowMode" | "brandId" | "pharmacyName">,
  baseSuffix: string
): string {
  const workflow = inferWorkflowMode(settings);
  const visual = findVisualStyleSuggestion(settings.visualStyleId, workflow);
  if (visual) {
    return `${baseSuffix} ${visual.hint}`;
  }
  return baseSuffix;
}

async function generateSingleVariantViaFal(
  sourceImageUrl: string,
  settings: ProjectSettings,
  uploadDir: string,
  style?: ImageStyle,
  imageModelId = "nano-banana"
): Promise<{ variant: ImageVariant; provider: ImageProvider }> {
  const { style: presetStyle, suffix } = resolveStylePreset(style);
  const styleSuffix = resolveStyleSuffix(settings, suffix);
  const falImageUrl = await uploadImageToFal(sourceImageUrl);
  const agency = isAgencyImageGeneration(settings, sourceImageUrl);
  const fashion = isFashionImageGeneration(settings);
  const model = getModelById(imageModelId);
  const falModelId = model?.falModelId || "fal-ai/nano-banana/edit";
  const isNb2 = imageModelId === "nano-banana-2";
  const withLogoReference = (agency || fashion) && isNb2;

  const promptOptions = { withLogoReference };
  const sceneDescription = fashion
    ? buildFashionSceneDescription(settings, styleSuffix)
    : agency
      ? buildAgencySceneDescription(settings, styleSuffix, promptOptions)
      : buildSceneDescription(settings, styleSuffix);
  const shotSize = getProductShotSize(settings.aspectRatio);
  const placement = getProductPlacement(settings.subjectPrompt);

  let storageUrl = sourceImageUrl;
  let provider: ImageProvider = isNb2 ? "nano-banana-2" : "nano-banana";
  const prompt = fashion
    ? buildFashionImagePrompt(settings, styleSuffix, promptOptions)
    : agency
      ? buildAgencyImagePrompt(settings, styleSuffix, promptOptions)
      : buildAdImagePrompt(settings, styleSuffix);

  const referenceImageUrls: string[] = [];
  if (withLogoReference) {
    const logoUrl = fashion ? POMEGRANATE_LOGO_URL : VONWILLINGH_LOGO_URL;
    referenceImageUrls.push(await uploadImageToFal(logoUrl));
  }

  const falAspectRatio = normalizeAspectRatioForFal(settings.aspectRatio || "9:16");
  const aspectHint = getAspectFramingHint(settings.aspectRatio);
  const promptWithAspect = aspectHint ? `${prompt} ${aspectHint}` : prompt;

  try {
    const results = await editImageWithFal({
      prompt: promptWithAspect,
      imageUrl: falImageUrl,
      referenceImageUrls,
      falModelId,
      aspectRatio: falAspectRatio,
      resolution: isNb2 ? "1K" : undefined,
    });
    const result = results[0];
    if (result?.url) {
      storageUrl = await downloadAndSave(result.url, uploadDir);
    }
  } catch (nanoErr) {
    console.error("Nano Banana failed, falling back to Bria product shot:", nanoErr);
    provider = "bria";
    const resultUrl = await runBriaProductShot({
      imageUrl: falImageUrl,
      sceneDescription,
      shotSize,
      placement,
    });
    storageUrl = await downloadAndSave(resultUrl, uploadDir);
  }

  return {
    provider,
    variant: {
      id: uuidv4(),
      style: presetStyle,
      label: "",
      filter: "",
      background: "",
      storageUrl,
      prompt: promptWithAspect,
    },
  };
}

async function generateSingleVariantViaAikit(
  sourceImageUrl: string,
  settings: ProjectSettings,
  uploadDir: string,
  style?: ImageStyle
): Promise<ImageVariant> {
  const { style: presetStyle, label, suffix } = resolveStylePreset(style);
  const styleSuffix = resolveStyleSuffix(settings, suffix);
  const imageInput = await readImageInput(sourceImageUrl);
  const aspectRatio = settings.aspectRatio || "1:1";
  const agency = isAgencyImageGeneration(settings, sourceImageUrl);
  const fashion = isFashionImageGeneration(settings);
  const prompt = fashion
    ? buildFashionImagePrompt(settings, styleSuffix)
    : agency
      ? buildAgencyImagePrompt(settings, styleSuffix)
      : buildAdImagePrompt(settings, styleSuffix);
  const results = await editImage({
    prompt,
    image: imageInput,
    aspectRatio,
    n: 1,
    responseFormat: "b64_json",
  });

  const result = results[0];
  let storageUrl = sourceImageUrl;

  if (result?.b64_json) {
    storageUrl = await saveBase64Image(result.b64_json, uploadDir);
  } else if (result?.url) {
    storageUrl = await downloadAndSave(result.url, uploadDir);
  }

  return {
    id: uuidv4(),
    style: presetStyle,
    label,
    filter: "",
    background: "",
    storageUrl,
    prompt,
  };
}

export type ImageProvider = "bria" | "nano-banana" | "nano-banana-2" | "aikit" | "mock";

function isFalImageModel(modelId: string): boolean {
  return modelId === "nano-banana" || modelId === "nano-banana-2";
}

function isBalanceError(err: unknown): boolean {
  const message = err instanceof Error ? err.message.toLowerCase() : String(err);
  return (
    message.includes("balance") ||
    message.includes("forbidden") ||
    message.includes("locked") ||
    message.includes("403")
  );
}

export async function generateMockOrRealVariants(
  sourceImageUrl: string,
  settings: ProjectSettings,
  uploadDir: string,
  imageModelId: string,
  style?: ImageStyle
): Promise<{
  variants: ImageVariant[];
  provider: ImageProvider;
  warning?: string;
}> {
  const selectedStyle = (style || settings.imageStyle) as ImageStyle | undefined;
  let falBalanceExhausted = false;

  if (isFalImageModel(imageModelId)) {
    if (isFalConfigured()) {
      try {
        const { variant, provider } = await generateSingleVariantViaFal(
          sourceImageUrl,
          settings,
          uploadDir,
          selectedStyle,
          imageModelId
        );
        return { variants: [variant], provider };
      } catch (err) {
        falBalanceExhausted = isBalanceError(err);
        console.error("fal image generation failed, trying aikit endpoint:", err);
      }
    }

    try {
      const variant = await generateSingleVariantViaAikit(
        sourceImageUrl,
        settings,
        uploadDir,
        selectedStyle
      );
      return {
        variants: [variant],
        provider: "aikit",
        warning: falBalanceExhausted
          ? "Your fal.ai balance is exhausted, so we used a backup generator that may not preserve the exact product. Top up at fal.ai/dashboard/billing for accurate, product-locked results."
          : "Used a backup image generator that may not preserve the exact product.",
      };
    } catch (err) {
      console.error("Nano Banana generation failed, falling back to mock:", err);
    }
  }

  return {
    variants: generateImageVariants(sourceImageUrl, selectedStyle),
    provider: "mock",
    warning: falBalanceExhausted
      ? "fal.ai balance exhausted — showing a mock preview. Top up at fal.ai/dashboard/billing."
      : undefined,
  };
}
