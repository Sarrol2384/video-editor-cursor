"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CreditBadge } from "./CreditBadge";

interface NavbarProps {
  credits?: number;
}

export function Navbar({ credits }: NavbarProps) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="text-lg font-bold text-brand-600">
            AI Video Studio
          </Link>
          <nav className="hidden gap-4 sm:flex">
            <Link href="/dashboard" className="text-sm text-gray-600 hover:text-brand-600">
              Dashboard
            </Link>
            <Link href="/library" className="text-sm text-gray-600 hover:text-brand-600">
              Library
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          {credits !== undefined && <CreditBadge credits={credits} />}
          <button onClick={handleLogout} className="btn-secondary text-sm">
            Log out
          </button>
        </div>
      </div>
    </header>
  );
}
