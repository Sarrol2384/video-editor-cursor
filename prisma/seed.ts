import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("demo1234", 10);

  const demoUser = await prisma.user.upsert({
    where: { email: "demo@example.com" },
    update: {},
    create: {
      email: "demo@example.com",
      passwordHash,
      name: "Demo User",
      credits: 500,
    },
  });

  await prisma.creditLedger.create({
    data: {
      userId: demoUser.id,
      delta: 500,
      balanceAfter: 500,
      reason: "Starter credits (seed)",
    },
  });

  const templates = [
    {
      industry: "agency",
      name: "VonWillingh Social Ad",
      description:
        "Vertical promo for VonWillingh Online — TikTok, Reels, and social feeds.",
      promptScaffold:
        "Modern office with developer at laptop, clean tech aesthetic, South African business mood.",
      defaultParams: JSON.stringify({
        aspectRatio: "9:16",
        duration: 8,
        resolution: "1080p",
        pharmacyName: "VonWillingh Online",
        productName: "Custom Web Apps",
        scenePrompt:
          "Modern office with developer at laptop in sharp focus, clean tech aesthetic, soft natural light, professional SA business mood.",
        benefitsPrompt:
          "VonWillingh Online builds custom web applications for South African businesses that are fast, reliable, and locally supported from your first discovery call through go-live, hosting, and ongoing care. If generic software is holding you back, contact VonWillingh Online today and book your free quote.",
        subjectPrompt:
          "Laptop screen sharp in foreground showing clean web UI; professional in focus behind.",
        motionPrompt:
          "Cinematic push-in on workspace — screen glow pulses gently, natural ambient motion.",
        narrationScript:
          "Need a custom web app for your business? VonWillingh Online builds tools that fit how you work. Get a free quote today.",
        selectedModelId: "kling-o3-standard",
        postFormat: "cinematic",
        brandId: "vonwillingh",
        workflowMode: "agency",
        textLayers: [],
      }),
    },
    {
      industry: "agency",
      name: "VonWillingh Talking Head",
      description:
        "Presenter lip-syncs your script — ideal for Facebook, TikTok, and Reels.",
      promptScaffold:
        "Coloured South African professional, mid-shot, direct eye contact, modern office.",
      defaultParams: JSON.stringify({
        aspectRatio: "9:16",
        duration: 8,
        resolution: "1080p",
        pharmacyName: "VonWillingh Online",
        productName: "Custom Web Apps",
        scenePrompt:
          "Talking head — Coloured South African professional, mid-shot, direct eye contact, modern Cape Town office, soft natural light.",
        benefitsPrompt:
          "VonWillingh Online builds custom web applications for South African businesses that are fast, reliable, and locally supported from your first discovery call through go-live, hosting, and ongoing care. If generic software is holding you back, contact VonWillingh Online today and book your free quote.",
        subjectPrompt:
          "Talking head — Coloured South African presenter waist-up, face sharp, speaking to camera, confident professional expression.",
        motionPrompt:
          "Natural speaking gestures, subtle head movement, professional presenter energy.",
        narrationScript:
          "Need a custom web app for your business? VonWillingh Online builds tools that fit how you work. Get a free quote today.",
        selectedModelId: "kling-avatar-standard",
        videoGenerationMode: "avatar",
        postFormat: "talking-head",
        brandId: "vonwillingh",
        workflowMode: "agency",
        textLayers: [],
      }),
    },
    {
      industry: "fashion",
      name: "Pomegranate Model Shot",
      description:
        "Fashion lookbook — model wearing your garment for TikTok, Reels, and Facebook.",
      promptScaffold:
        "Clean light-grey studio, professional e-commerce lighting, model wearing the garment.",
      defaultParams: JSON.stringify({
        aspectRatio: "9:16",
        duration: 8,
        resolution: "1080p",
        pharmacyName: "Pomegranate",
        productName: "Pattern Bomber Jacket",
        brandId: "pomegranate",
        workflowMode: "fashion",
        scenePrompt:
          "Clean light-grey fashion studio backdrop, soft even catalog lighting, boutique e-commerce mood.",
        benefitsPrompt:
          "Handmade South African fashion — limited pieces, boutique quality from Pomegranate.",
        subjectPrompt:
          "Female model waist-up, three-quarter angle, jacket fully visible, face sharp and well lit.",
        motionPrompt:
          "Slow cinematic push-in on model — fabric catches light, subtle natural movement.",
        narrationScript:
          "Meet the new pattern bomber from Pomegranate — handmade style you won't find anywhere else. Shop the collection today.",
        selectedModelId: "kling-o3-standard",
        visualStyleId: "fashion-pro-studio",
        selectedImageModelId: "nano-banana-2",
        textLayers: [],
      }),
    },
    {
      industry: "pharmacy",
      name: "Pharmacy Weekly Sale",
      description: "Promote weekly specials with stable price text overlays.",
      promptScaffold:
        "Clean pharmacy shelf background, warm wellness lighting, product centered.",
      defaultParams: JSON.stringify({
        aspectRatio: "9:16",
        duration: 8,
        resolution: "1080p",
        brandId: "ekem",
        workflowMode: "pharmacy",
        pharmacyName: "E-KEM PHARMACY",
        style: "professional",
      }),
    },
    {
      industry: "retail",
      name: "Product Launch",
      description: "Premium product reveal with cinematic motion.",
      promptScaffold:
        "Premium studio lighting, subtle reflections, product hero shot.",
      defaultParams: JSON.stringify({
        aspectRatio: "16:9",
        duration: 12,
        resolution: "1080p",
        style: "premium",
      }),
    },
    {
      industry: "social",
      name: "Social Media Ad",
      description: "Vertical ad optimized for Reels and TikTok.",
      promptScaffold:
        "Vibrant lifestyle scene, energetic mood, social-ready composition.",
      defaultParams: JSON.stringify({
        aspectRatio: "9:16",
        duration: 6,
        resolution: "1080p",
        style: "vibrant",
      }),
    },
    {
      industry: "ecommerce",
      name: "E-Commerce Catalog",
      description: "Clean product showcase for online listings.",
      promptScaffold:
        "Minimal white background, soft shadows, catalog-style presentation.",
      defaultParams: JSON.stringify({
        aspectRatio: "1:1",
        duration: 6,
        resolution: "1080p",
        style: "minimalist",
      }),
    },
    {
      industry: "explainer",
      name: "Explainer Video",
      description: "Short product explainer with narration-ready layout.",
      promptScaffold:
        "Professional explainer style, clear product focus, calm background.",
      defaultParams: JSON.stringify({
        aspectRatio: "16:9",
        duration: 10,
        resolution: "1080p",
        style: "professional",
      }),
    },
  ];

  for (const t of templates) {
    const existing = await prisma.template.findFirst({
      where: { name: t.name },
    });
    if (existing) {
      await prisma.template.update({
        where: { id: existing.id },
        data: {
          description: t.description,
          promptScaffold: t.promptScaffold,
          defaultParams: t.defaultParams,
        },
      });
    } else {
      await prisma.template.create({ data: t });
    }
  }

  console.log("Seed complete. Demo user: demo@example.com / demo1234");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
