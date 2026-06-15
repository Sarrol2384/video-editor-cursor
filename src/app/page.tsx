import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50 to-white">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="text-xl font-bold text-brand-600">AI Video Studio</div>
        <div className="flex gap-3">
          <Link href="/login" className="btn-secondary">
            Log in
          </Link>
          <Link href="/register" className="btn-primary">
            Get started
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-16 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
          Business-ready video ads in minutes
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600">
          Upload a product photo, enhance it with AI backgrounds, animate it into
          a short-form video, add narration and music — all in one guided
          workflow.
        </p>
        <div className="mt-10 flex justify-center gap-4">
          <Link href="/register" className="btn-primary px-8 py-3 text-base">
            Start creating
          </Link>
          <Link href="/login" className="btn-secondary px-8 py-3 text-base">
            Demo login
          </Link>
        </div>

        <div className="mt-20 grid gap-6 text-left sm:grid-cols-3">
          <div className="card">
            <h3 className="font-semibold text-brand-600">Image enhancement</h3>
            <p className="mt-2 text-sm text-gray-600">
              Restage products with studio, lifestyle, and seasonal backgrounds.
            </p>
          </div>
          <div className="card">
            <h3 className="font-semibold text-brand-600">Video generation</h3>
            <p className="mt-2 text-sm text-gray-600">
              Animate backgrounds while keeping products and text stable.
            </p>
          </div>
          <div className="card">
            <h3 className="font-semibold text-brand-600">Audio & export</h3>
            <p className="mt-2 text-sm text-gray-600">
              Add narration and music, then export a polished ad.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
