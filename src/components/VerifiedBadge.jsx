// Sleek pink "Verified Creator" checkmark badge — shown next to a username
// anywhere it appears across the site when the user has is_verified = true.
export default function VerifiedBadge({ size = 14, className = "" }) {
  return (
    <span
      className={`inline-flex items-center justify-center shrink-0 rounded-full bg-gradient-to-br from-pink-400 to-pink-600 shadow-sm ${className}`}
      style={{ width: size, height: size }}
      title="Verified creator"
      data-testid="badge-verified-creator"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        style={{ width: size * 0.62, height: size * 0.62 }}
      >
        <path
          d="M5 13l4 4L19 7"
          stroke="white"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
