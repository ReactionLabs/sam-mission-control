// SAM's own mark: an original 1960s secret-agent roundel (Bible
// section 11). A fedora, a raised collar, and the finger-guns
// energy, drawn as simple geometry. It is nobody's likeness.
export default function Mark({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="SAM" style={{ flex: "none" }}>
      <circle cx="32" cy="32" r="30" fill="#392348" />
      <circle cx="32" cy="32" r="30" fill="none" stroke="#D5AC40" strokeWidth="2.5" />
      <circle cx="32" cy="32" r="24.5" fill="#E86C25" />
      <g fill="#1D0F06">
        {/* fedora */}
        <path d="M14 27 L50 27 L47.5 22.5 Q32 17 16.5 22.5 Z" />
        <rect x="24" y="12.5" width="16" height="7" rx="3" />
        {/* head */}
        <path d="M25 27 h14 v6 q0 6 -7 6 q-7 0 -7 -6 Z" />
        {/* shoulders and raised collar */}
        <path d="M13 52 q2 -11 11 -13 l3 5 q3 3 5 3 q2 0 5 -3 l3 -5 q9 2 11 13 v3 H13 Z" />
      </g>
      {/* the pointing hand, simplified to a bold gesture */}
      <path d="M40 44 l12 -3 -1 4 -9 3 Z" fill="#1D0F06" />
      <circle cx="47" cy="30" r="1.8" fill="#FFF3D6" />
    </svg>
  );
}

export function Wordmark({ size = 40, dark = false }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
      <Mark size={size} />
      <span style={{ lineHeight: 1 }}>
        <span className="display" style={{ fontSize: size * 0.62, display: "block", color: dark ? "#1D0F06" : undefined }}>SAM</span>
        <span style={{ fontSize: size * 0.24, letterSpacing: ".18em", fontWeight: 600, textTransform: "uppercase", color: dark ? "#1D0F06" : undefined }}>Secret Agent Man</span>
      </span>
    </span>
  );
}
