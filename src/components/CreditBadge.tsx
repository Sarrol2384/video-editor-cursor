interface CreditBadgeProps {
  credits: number;
}

export function CreditBadge({ credits }: CreditBadgeProps) {
  return (
    <div className="flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-700">
      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
        <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6z" />
      </svg>
      {credits} credits
    </div>
  );
}
