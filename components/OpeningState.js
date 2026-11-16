import Mark from "./Mark";

// The full-page opening state (beauty pass, 2026-11-16): every
// room's bare loading screen wears the same furniture - the
// roundel, a breathing duty orb, and the words - so a member
// never stares at unstyled text while the door answers.
export default function OpeningState({ label, error }) {
  if (error) {
    return (
      <div className="opening-state">
        <div className="notice err">{error}</div>
      </div>
    );
  }
  return (
    <div className="opening-state">
      <Mark size={46} />
      <span className="opening-label"><span className="orb" />{label}</span>
    </div>
  );
}
