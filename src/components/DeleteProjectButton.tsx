"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface DeleteProjectButtonProps {
  projectId: string;
  projectName: string;
  className?: string;
}

export function DeleteProjectButton({
  projectId,
  projectName,
  className = "",
}: DeleteProjectButtonProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();

    if (deleting) return;

    const confirmed = window.confirm(
      `Delete "${projectName}"? This cannot be undone.`
    );
    if (!confirmed) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(data.error || "Failed to delete project");
        return;
      }

      router.refresh();
    } catch {
      alert("Failed to delete project");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={deleting}
      className={`text-xs font-medium text-red-600 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      aria-label={`Delete ${projectName}`}
    >
      {deleting ? "Deleting…" : "Delete"}
    </button>
  );
}
