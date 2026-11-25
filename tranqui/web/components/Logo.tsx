export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-display text-2xl font-extrabold tracking-tight ${className}`}>
      <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden>
        <defs>
          <linearGradient id="lg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#FFC857" />
            <stop offset="1" stopColor="#FF5F7A" />
          </linearGradient>
        </defs>
        <circle cx="16" cy="14" r="11" fill="url(#lg)" />
        <path d="M2 22c4-2.5 8 2.5 14 0s10-2.5 14 0" stroke="#38E1C7" strokeWidth="2.6" fill="none" strokeLinecap="round" />
        <path d="M4 27c4-2 8 2 12 0s8-2 12 0" stroke="#38E1C7" strokeWidth="2.2" fill="none" strokeLinecap="round" opacity=".6" />
      </svg>
      <span>tranqui<span className="text-coral">.</span></span>
    </span>
  );
}
