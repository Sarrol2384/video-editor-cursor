# AI Video Studio - Web MVP

A Next.js full-stack web application for creating business-ready video advertisements. This MVP demonstrates the complete pipeline from product photo upload through image enhancement, video generation, audio narration, and export — using mock AI generation (no paid API keys required).

## Features

- **User accounts** with JWT cookie auth (register/login)
- **Credit system** with reserve/charge/refund on generation
- **Guided Studio wizard**: Upload → Enhance → Video → Audio → Export
- **Model routing UI** with cost estimates and recommendations (6 video models)
- **Business controls**: freeze product, freeze text, overlay text, motion intensity
- **Industry templates**: Pharmacy, Retail, Social, E-Commerce, Explainer
- **MP4 export** with burned-in text, mixed narration + music (browser render → server ffmpeg)
- **Asset library** with project and asset persistence (SQLite)

## Tech Stack

- Next.js 14 (App Router) + TypeScript + Tailwind CSS
- Prisma ORM + PostgreSQL (Neon on Vercel; see `.env.example`)
- JWT auth (jose + bcryptjs)
- Local file storage (`public/uploads/`)

## Quick Start

Open a terminal in this folder and run:

```powershell
cd I:\Dev\video-creation-app

# Install dependencies
npm install

# Create database and seed demo data
npx prisma db push
npx prisma db seed

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Demo Login

- **Email:** `demo@example.com`
- **Password:** `demo1234`
- **Credits:** 500

## Usage Flow

1. **Register or log in** (new accounts get 100 free credits)
2. **Dashboard** → pick a template or create a new project
3. **Studio wizard:**
   - **Step 1 - Upload:** drag & drop a product photo
   - **Step 2 - Enhance:** generate style variants (Professional, Lifestyle, Minimalist, Vibrant)
   - **Step 3 - Audio:** write narration script, pick voice and music mood; generate (duration auto-matches narration)
   - **Step 4 - Video:** configure aspect ratio, motion, text overlays; pick an AI model; generate
   - **Step 5 - Export:** preview and download an `.mp4` with text and audio
4. **Library** → view all projects and generated assets

## Project Structure

```
src/
  app/
    api/          # REST API routes (auth, projects, upload, generate, models)
    dashboard/    # Dashboard page
    library/      # Asset library page
    studio/       # Studio wizard
    login/        # Login page
    register/     # Register page
  components/     # UI components (Stepper, CanvasPreview, ExportButton, etc.)
  lib/            # Core logic (auth, credits, models, mockGen, canvas-utils)
prisma/
  schema.prisma   # Database schema
  seed.ts         # Demo user + templates
public/
  uploads/        # Uploaded and generated media files
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run db:push` | Sync Prisma schema to SQLite |
| `npm run db:seed` | Seed demo user and templates |
| `npm run db:studio` | Open Prisma Studio (DB browser) |

## Notes

- **Mock AI:** Image/video/audio generation is simulated with delays. No external API keys needed.
- **Video export:** Renders text + audio in the browser, then converts to `.mp4` via bundled **ffmpeg-static** (falls back to system `ffmpeg` on PATH if needed).
- **Freeze controls:** When enabled, the product stays static while the background animates (simulated via compositing).
- **Credits:** Each generation reserves credits upfront; failed jobs are refunded automatically.

## Environment Variables

Copy `.env.example` to `.env` and adjust:

```
DATABASE_URL="postgresql://..."   # Neon connection string
JWT_SECRET="your-secret-here"
NEXT_PUBLIC_APP_NAME="AI Video Studio"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

`NEXT_PUBLIC_APP_URL` is used for **share links** and absolute video URLs. On Vercel, set it to your deployment URL (e.g. `https://video-editor-cursor.vercel.app`) so copied links are not `localhost`.

## Deploying to Vercel

1. Import the GitHub repo at [vercel.com/new](https://vercel.com/new) (`Sarrol2384/video-editor-cursor`).
2. Framework preset: **Next.js**.
3. Environment variables:
   - `NEXT_PUBLIC_APP_URL` — your Vercel URL (or custom domain)
   - `JWT_SECRET` — strong random string
   - `DATABASE_URL` — hosted Postgres (Neon, Vercel Postgres, etc.)
   - API keys from your local `.env` (e.g. `FAL_KEY`)
4. Deploy.

**Production note:** The MVP uses SQLite and `public/uploads/` on disk. Vercel’s filesystem is ephemeral — uploads and exports will not persist across deploys until you migrate to **hosted Postgres** and **blob storage** (Vercel Blob or S3). Share links need both a public `NEXT_PUBLIC_APP_URL` and videos that remain available at that URL.

## Next Steps (beyond MVP)

- Integrate real AI providers (Kling, Runway, Seedance, etc.)
- Stripe billing for subscriptions and credit packs
- Mobile apps (React Native)
- Batch generation (CSV upload)
- S3/CloudFront for production storage
- PostgreSQL for production database
