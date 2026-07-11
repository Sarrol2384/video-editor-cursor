export type PromptFieldKey =
  | "scenePrompt"
  | "benefitsPrompt"
  | "backgroundPrompt"
  | "subjectPrompt"
  | "motionPrompt"
  | "narrationScript";

export const PROMPT_SUGGESTIONS: Record<PromptFieldKey, string[]> = {
  scenePrompt: [
    "Coloured South African mother and child on sofa in sharp focus, mid-shot, warm evening lamp light, product on side table — plain neutral home, no signs or readable text anywhere.",
    "Coloured South African parent and child in a bright home kitchen, faces sharp, natural morning light — product on counter, empty walls, no logos.",
    "Close mid-shot of Coloured South African caregiver with child, cozy living room — product on side table, blurred bookshelves with no readable titles.",
    "Black South African family in a warm lounge, soft natural light, product on coffee table — no signage or lettering in the room.",
    "Minimal studio backdrop with soft gradient — product-only hero shot, no people, no text or logos.",
  ],
  benefitsPrompt: [
    "Natural sleep support, non-habit forming, herbal ingredients, pharmacist recommended.",
    "Gentle cough and cold relief for children, trusted by parents, pharmacist recommended.",
    "Fast pain relief, anti-inflammatory, suitable for adults, great value.",
    "Daily immune support, vitamins and minerals, supports everyday wellness.",
  ],
  backgroundPrompt: [
    "Warm lifestyle interior with people sharp in mid-ground; only far background softly blurred.",
    "Static wide frame with subtle ambient motion — people in focus, environment gently alive.",
    "Cozy seasonal scene — subjects in clear focus, soft bokeh limited to distant walls and decor.",
    "Clean gradient backdrop for product-only shots with no people.",
  ],
  subjectPrompt: [
    "Product sharp on side table, foreground right; Coloured South African parent and child in sharp focus mid-left — plain home background, no signs or text on walls.",
    "Product held at chest height by Coloured South African caregiver in close mid-shot — neutral blurred background, no logos or lettering.",
    "Coloured South African adult at home, product on table — plain decor only, no readable text in scene.",
    "Product-only hero shot centered, no people — unchanged pack from upload, studio lighting, no added text or logos.",
  ],
  motionPrompt: [
    "Static locked-off camera — only ambient light, curtains, and natural gestures move.",
    "Very slow pull-back — product stays same size or smaller, never zoom toward the pack.",
    "Soft lateral pan with parallax — people move naturally, product pack stays still and unreadable text hidden.",
    "Living scene: curtains sway, light shifts, subtle human movement — no camera push-in.",
    "Gentle orbit at a wide distance — faces sharp, product fixed, no zoom on packaging.",
    "Slow pull-back reveal — warm lamp light shifts, soft conversation gestures, cozy home energy.",
    "Soft pan left to right — plants and decor drift, people in focus, camera does not approach product.",
    "Morning sunlight moves across the room — natural blinks, relaxed posture, static wide camera.",
    "Hands gesture naturally at mid-shot — product on table stays small in frame, no dolly in.",
    "Subtle steam from a mug, gentle hair movement — wide shot, pack not magnified.",
    "Product-only hero: static camera with soft studio light sweep — pack perfectly still.",
    "Garden patio breeze — leaves move softly, people chat, wide framing on table product.",
    "Ambient depth — foreground product unchanged size, background softly alive, no zoom.",
    "Evening golden glow deepens — family on sofa, natural micro-movements, camera holds wide.",
  ],
  narrationScript: [
    "Struggling to switch off at night? Ask your pharmacist about natural sleep support — gentle, non-habit forming. Available now.",
    "When cough season hits, families need trusted pharmacy care. Gentle relief — ask your pharmacist today.",
    "Support your everyday wellness with quality pharmacy care. Ask our team for advice. Available in store.",
    "New at your pharmacy — premium health support at a great value. Ask your pharmacist today.",
  ],
};

export const PROMPT_FIELD_LABELS: Record<PromptFieldKey, { label: string; hint: string }> = {
  scenePrompt: {
    label: "Scene & Setting",
    hint: "Who is in the shot and where — say if people should be in sharp focus (mid-shot), not blurred in the background.",
  },
  benefitsPrompt: {
    label: "Key message",
    hint: "What the ad should communicate — used for narration and on-screen text overlays in the editor, not drawn into the photo.",
  },
  backgroundPrompt: {
    label: "Background Prompt",
    hint: "Background style for video motion and atmosphere.",
  },
  subjectPrompt: {
    label: "Product Placement",
    hint: "Product position plus people framing — e.g. faces sharp in mid-ground, not tiny figures in the back.",
  },
  motionPrompt: {
    label: "Motion Prompt",
    hint: "Describe scene motion without zooming toward the product pack — use static camera or slow pull-back so packaging text is not magnified.",
  },
  narrationScript: {
    label: "Narration Script",
    hint: "Voice-over matched to your key message. Click a suggestion, then edit.",
  },
};

export const AGENCY_PROMPT_SUGGESTIONS: Record<PromptFieldKey, string[]> = {
  scenePrompt: [
    "Talking head — Coloured South African professional, mid-shot, direct eye contact, modern Cape Town office, soft natural light.",
    "Coloured South African developer at laptop in modern Cape Town office — sharp mid-shot, clean tech aesthetic, soft natural light.",
    "Coloured South African business owner reviewing dashboard on tablet — face clear, confident professional mood.",
    "Coloured South African entrepreneur at coworking desk with laptop — sharp focus, modern workspace energy.",
    "Coloured South African team collaborating at desk, faces in focus, bright workspace, innovative startup energy.",
    "Coloured South African consultant presenting a web app on screen to a client — both in sharp focus, modern boardroom.",
    "Coloured South African developer on a video call with a client, laptop and notebook on desk, friendly professional mood.",
    "Coloured South African educator with learners in training centre — LMS on projector, engaged faces, bright natural light.",
    "Coloured South African small business owner at shop counter with tablet booking app, warm local community atmosphere.",
  ],
  benefitsPrompt: [
    "VonWillingh Online builds custom web applications for South African businesses that are fast, reliable, and locally supported from your first discovery call through go-live, hosting, and ongoing care. If generic software is holding you back, contact VonWillingh Online today and book your free quote.",
    "From idea to launch, VonWillingh Online delivers websites, dashboards, and business tools shaped around how your team actually works — not off-the-shelf templates that never quite fit. Ready to simplify your operations? Visit vonwillingh.co.za and request a discovery call with our team.",
    "VonWillingh Online offers affordable starter websites with your branding — professional, mobile-ready, and live in days instead of months, with clear pricing and local support you can reach by phone. Stop putting your online presence on hold — message VonWillingh Online now and get your site quote.",
    "VonWillingh Online creates bespoke dashboards and client portals that automate repetitive admin, save hours every week, and give your customers a smoother, more professional experience from first click to payment. Take the next step — email VonWillingh Online today and ask for a tailored portal demo.",
    "VonWillingh Online digital business cards combine your services, photo gallery, and WhatsApp link on one polished page — ideal for Facebook, TikTok, and Instagram promos, live from R3,500 with fast turnaround. Put your business one tap away — visit vonwillingh.co.za and order your digital card this week.",
    "VonWillingh Online builds mobile-first web apps so your staff and customers can work confidently on any phone or tablet, designed for South African connectivity, real-world speeds, and the way your business actually runs day to day. Start your app brief today — book a free VonWillingh Online consultation and get a clear go-live plan.",
    "VonWillingh Online develops learning management systems for schools, colleges, and training providers — handling enrolments, course content, assessments, and reporting in one secure platform your learners can trust. Upgrade how you teach and track progress — contact VonWillingh Online now for an LMS walkthrough and quote.",
    "VonWillingh Online integrates practical AI into your existing website or app — smarter FAQs, faster support, and helpful automation that supports your team instead of replacing the people who know your customers best. See what is possible for your business — schedule a VonWillingh Online strategy call and get actionable recommendations.",
    "VonWillingh Online hosting and care plans keep your website secure with updates, backups, monitoring, and responsive local support so you can focus on sales instead of server headaches after every plugin change. Protect what you have built — speak to VonWillingh Online today about a care plan that fits your budget.",
    "Book a free discovery call with VonWillingh Online — we listen to your goals, map the features you need, explain options in plain language, and send a transparent quote with a realistic timeline from idea to launch. Do not guess your next digital step — call VonWillingh Online and book your session now.",
    "VonWillingh Online helps Western Cape and national businesses go digital with honest pricing, custom software, and a development team that answers the phone when you need help after go-live, not just during the sales pitch. Partner with people who stay — visit vonwillingh.co.za and start your project enquiry today.",
    "Need a custom web app, client portal, or redesigned website that reflects your brand and workflow? VonWillingh Online designs and builds around you, with South African support from first sketch to long-term maintenance. Turn your idea into something live — request your free VonWillingh Online quote right now.",
  ],
  backgroundPrompt: [
    "Clean tech workspace with soft blue-grey tones, subtle motion in screen glow.",
    "Modern SA city skyline bokeh behind subject, professional corporate mood.",
    "Minimal navy and gold gradient — VonWillingh brand colours, premium feel.",
    "Bright startup office with plants and natural light, energetic but professional.",
    "Soft-focus Cape Town or suburban SA streetscape — local business authenticity.",
  ],
  subjectPrompt: [
    "Talking head — Coloured South African presenter waist-up, face sharp, speaking to camera, confident professional expression.",
    "Coloured South African subject sharp in mid-shot; laptop or phone screen readable in foreground.",
    "Coloured South African founder portrait mid-shot, confident smile, office softly blurred behind.",
    "Coloured South African subject sharp in mid-shot with VonWillingh-branded merchandise or props visible in frame.",
    "Hero device mockup centered — UI screenshot sharp and readable, Coloured SA professional in focus behind.",
    "Coloured South African business owner gesturing toward screen showing custom app — face and screen both clear.",
  ],
  motionPrompt: [
    "Static camera on presenter — natural blinks and gestures, screen glow pulses gently.",
    "Slow pull-back from desk — parallax on items, laptop stays readable, no push toward screen.",
    "Smooth lateral drift with soft light shifts — professional, energetic but not jerky.",
    "Gentle pan across team at work — natural movement, screens and faces stay sharp.",
    "Wide hold on phone mockup — background softens slightly, no zoom on device.",
    "Talking head: natural blinks, subtle head nods — camera locked off.",
    "Slow arc at wide distance around desk — keyboard and notebook gain parallax, no dolly in.",
    "Window light shifts across the office — presenter gestures lightly, camera static.",
    "Wide frame on dashboard — UI feels alive, presenter sharp, no zoom on screen text.",
    "Smooth lateral slide past monitors — team collaboration, faces in focus.",
    "Static wide shot on business card prop — background office softly drifts.",
    "Coffee steam and plant movement — founder speaks to camera, locked-off lens.",
    "Slow pull-back from skyline bokeh to sharp subject — premium corporate feel.",
    "Hand scrolls on tablet while camera holds wide — natural demo motion.",
  ],
  narrationScript: [
    "Need a custom web app for your business? VonWillingh Online builds tools that fit how you work. Get a free quote today.",
    "From dashboards to customer portals — we help South African businesses go digital. Visit vonwillingh.co.za.",
    "Your brand, your workflow, your app. VonWillingh Online — custom development done right. Contact us today.",
    "Tired of spreadsheets and workarounds? We build custom software around how your team actually works. Book a free discovery call.",
    "Digital business cards from R3,500 — your services, gallery, and WhatsApp link in one professional page. Go live in days.",
    "Starter websites from R1,999 — professional, mobile-ready, and yours to grow. VonWillingh Online. Request a quote.",
    "We build custom software for South African businesses — websites, apps, and tools that fit your workflow. Get in touch.",
  ],
};

export const FASHION_PROMPT_SUGGESTIONS: Record<PromptFieldKey, string[]> = {
  scenePrompt: [
    "Clean light-grey studio backdrop — professional e-commerce catalog shot, soft even lighting.",
    "Warm boutique interior with plants and natural wood — independent fashion brand mood.",
    "Urban street-style setting, soft overcast daylight — TikTok-ready casual energy.",
    "Minimal white seamless backdrop — Pinterest and Instagram lookbook aesthetic.",
    "Golden-hour rooftop terrace — warm sunset light, aspirational lifestyle fashion.",
  ],
  benefitsPrompt: [
    "Handmade in South Africa — limited pieces, boutique quality.",
    "Statement pattern bomber — bold everyday wear from Pomegranate.",
    "New season drop — shop the collection online.",
    "Artisan hair accessories — elevate your everyday look.",
    "Independent slow fashion — designed and made with care.",
  ],
  backgroundPrompt: [
    "Soft studio gradient backdrop with gentle camera drift for video.",
    "Boutique interior bokeh — warm ambient motion, living retail atmosphere.",
    "Street scene parallax — natural pedestrian blur, model stays sharp.",
    "Clean minimal backdrop — subtle light shifts for Reels motion.",
  ],
  subjectPrompt: [
    "Female model waist-up, three-quarter angle, jacket fully visible, face sharp and well lit.",
    "Model full-length front pose, hands in pockets, garment pattern and fit clearly shown.",
    "Close mid-shot — model wearing jacket open over navy top, zipper and cuff details visible.",
    "Model with hair accessory styled up — beauty shot, accessory and face in sharp focus.",
    "Diverse South African model, relaxed confident pose, outfit hero in frame for 9:16 Reels.",
  ],
  motionPrompt: [
    "Static wide shot on model — fabric catches light, subtle hair movement, no zoom.",
    "Gentle camera arc at distance — parallax on studio backdrop, living fashion film feel.",
    "Soft lateral drift with natural model micro-movements — breeze on hair, camera holds wide.",
    "Vertical Reels framing — model turns slightly toward camera, garment stays full in frame.",
    "Model shifts weight — jacket fabric settles, locked-off or slow pull-back camera.",
    "Slow wide orbit — pattern and fit visible, camera never moves closer to garment.",
    "Gentle walk-in-place runway energy — confident stride, wide framing on outfit.",
    "Hair accessory shot at mid distance — model tilts head, soft background drift, no macro zoom.",
    "Golden-hour warmth — model turns to profile, full silhouette in frame.",
    "Street-style wide shot — soft pedestrian blur behind, model and outfit hero in frame.",
    "Boutique mirror reflection at distance — dual angle feel, no zoom on details.",
    "Model adjusts jacket at mid-shot — wide frame, no close-up on zipper or cuffs.",
    "Fabric flutter from breeze — model smiles, full outfit readable, camera static.",
    "Vertical Reels float — subtle camera rise from wide, model looks to lens.",
  ],
  narrationScript: [
    "Meet the new pattern bomber from Pomegranate — handmade style you won't find anywhere else. Shop the collection today.",
    "Your wardrobe deserves something special. Pomegranate creates limited pieces with heart — discover what's new in store.",
    "From statement jackets to artisan accessories — Pomegranate is independent South African fashion done right. Link in bio.",
    "This season's favourite is here. Bold pattern, perfect fit, Pomegranate quality. Available now — don't miss out.",
    "Slow fashion, big personality. Pomegranate — designed for women who dress with intention. Shop online today.",
  ],
};

export function getPromptSuggestions(
  field: PromptFieldKey,
  brandName?: string
): string[] {
  if (/vonwillingh/i.test(brandName || "")) {
    return AGENCY_PROMPT_SUGGESTIONS[field];
  }
  if (/pomegranate/i.test(brandName || "")) {
    return FASHION_PROMPT_SUGGESTIONS[field];
  }
  return PROMPT_SUGGESTIONS[field];
}

export function getPromptFieldMeta(
  field: PromptFieldKey,
  brandName?: string
): { label: string; hint: string } {
  const base = PROMPT_FIELD_LABELS[field];
  if (/vonwillingh/i.test(brandName || "")) {
    if (field === "benefitsPrompt") {
      return {
        label: "On-screen caption (optional)",
        hint: "Short line for text overlays on Export — not spoken. At least 32 words for VonWillingh suggestion chips. End with a clear call to action.",
      };
    }
  }
  if (/pomegranate/i.test(brandName || "")) {
    if (field === "subjectPrompt") {
      return {
        label: "Model & pose",
        hint: "Who wears the piece and how — garment must stay sharp and fully visible.",
      };
    }
    if (field === "benefitsPrompt") {
      return {
        label: "Key message",
        hint: "Caption and narration mood — used for voice-over and text overlays, not drawn into the photo.",
      };
    }
    if (field === "scenePrompt") {
      return {
        label: "Scene & setting",
        hint: "Studio, street, or boutique backdrop — describe lighting and atmosphere for the model shot.",
      };
    }
  }
  return base;
}
