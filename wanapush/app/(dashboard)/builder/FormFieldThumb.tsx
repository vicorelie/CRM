// Mini-mockups SVG des CHAMPS DE FORMULAIRE. Style cohérent avec
// SectionThumb / ElementThumb : rectangles abstraits sur fond slate.

type Props = { id: string; className?: string };

const VB = "0 0 200 120";

export default function FormFieldThumb({ id, className }: Props) {
  const bg = "rgb(15 23 42)";
  const stroke = "rgb(148 163 184)";
  const fill = "rgb(51 65 85)";
  const muted = "rgb(71 85 105)";
  const accent = "rgb(99 102 241)";
  const wrap = `w-full h-auto rounded-md bg-white ${className ?? ""}`;

  // Helper : un input rectangulaire centré
  const InputRect = ({ children }: { children?: React.ReactNode }) => (
    <g>
      <rect x="20" y="44" width="160" height="32" rx="6" fill="transparent" stroke={stroke} strokeWidth="1.5" />
      {children}
    </g>
  );

  switch (id) {
    case "text":
      return (
        <svg viewBox={VB} className={wrap} aria-hidden>
          <rect x="0" y="0" width="200" height="120" fill={bg} />
          <rect x="20" y="32" width="40" height="4" rx="1" fill={muted} />
          <InputRect>
            <rect x="30" y="56" width="70" height="3" rx="1" fill={muted} />
            <rect x="170" y="58" width="2" height="6" fill={accent} />
          </InputRect>
        </svg>
      );

    case "email":
      return (
        <svg viewBox={VB} className={wrap} aria-hidden>
          <rect x="0" y="0" width="200" height="120" fill={bg} />
          <rect x="20" y="32" width="50" height="4" rx="1" fill={muted} />
          <InputRect>
            <text x="32" y="63" fontSize="11" fill={stroke} fontFamily="system-ui">@</text>
            <rect x="48" y="58" width="80" height="3" rx="1" fill={muted} />
          </InputRect>
        </svg>
      );

    case "tel":
      return (
        <svg viewBox={VB} className={wrap} aria-hidden>
          <rect x="0" y="0" width="200" height="120" fill={bg} />
          <rect x="20" y="32" width="60" height="4" rx="1" fill={muted} />
          <InputRect>
            <text x="32" y="64" fontSize="10" fill={stroke} fontFamily="system-ui">☎</text>
            <rect x="48" y="58" width="90" height="3" rx="1" fill={muted} />
          </InputRect>
        </svg>
      );

    case "number":
      return (
        <svg viewBox={VB} className={wrap} aria-hidden>
          <rect x="0" y="0" width="200" height="120" fill={bg} />
          <rect x="20" y="32" width="40" height="4" rx="1" fill={muted} />
          <InputRect>
            <text x="30" y="64" fontSize="12" fill={stroke} fontFamily="ui-monospace, monospace">123</text>
            <path d="M168 53 l4 -4 l4 4" stroke={muted} strokeWidth="1.5" fill="none" />
            <path d="M168 67 l4 4 l4 -4" stroke={muted} strokeWidth="1.5" fill="none" />
          </InputRect>
        </svg>
      );

    case "url":
      return (
        <svg viewBox={VB} className={wrap} aria-hidden>
          <rect x="0" y="0" width="200" height="120" fill={bg} />
          <rect x="20" y="32" width="30" height="4" rx="1" fill={muted} />
          <InputRect>
            <text x="30" y="63" fontSize="9" fill={stroke} fontFamily="ui-monospace, monospace">https://</text>
            <rect x="68" y="58" width="80" height="3" rx="1" fill={muted} />
          </InputRect>
        </svg>
      );

    case "textarea":
      return (
        <svg viewBox={VB} className={wrap} aria-hidden>
          <rect x="0" y="0" width="200" height="120" fill={bg} />
          <rect x="20" y="20" width="60" height="4" rx="1" fill={muted} />
          <rect x="20" y="32" width="160" height="78" rx="6" fill="transparent" stroke={stroke} strokeWidth="1.5" />
          <rect x="30" y="44" width="120" height="3" rx="1" fill={muted} />
          <rect x="30" y="54" width="100" height="3" rx="1" fill={muted} />
          <rect x="30" y="64" width="130" height="3" rx="1" fill={muted} />
          <rect x="30" y="74" width="80" height="3" rx="1" fill={muted} />
        </svg>
      );

    case "select":
      return (
        <svg viewBox={VB} className={wrap} aria-hidden>
          <rect x="0" y="0" width="200" height="120" fill={bg} />
          <rect x="20" y="32" width="60" height="4" rx="1" fill={muted} />
          <InputRect>
            <rect x="30" y="58" width="80" height="3" rx="1" fill={muted} />
            <path d="M165 57 l5 6 l5 -6" stroke={stroke} strokeWidth="1.5" fill="none" />
          </InputRect>
        </svg>
      );

    case "checkbox":
      return (
        <svg viewBox={VB} className={wrap} aria-hidden>
          <rect x="0" y="0" width="200" height="120" fill={bg} />
          <rect x="30" y="50" width="16" height="16" rx="3" fill={accent} stroke={accent} />
          <path d="M34 58 l3 3 l6 -6" stroke="white" strokeWidth="1.8" fill="none" />
          <rect x="56" y="54" width="100" height="3" rx="1" fill={stroke} />
          <rect x="56" y="62" width="70" height="3" rx="1" fill={muted} />
        </svg>
      );

    case "radio":
      return (
        <svg viewBox={VB} className={wrap} aria-hidden>
          <rect x="0" y="0" width="200" height="120" fill={bg} />
          <g transform="translate(0, 32)">
            <circle cx="38" cy="10" r="6" fill="transparent" stroke={accent} strokeWidth="1.5" />
            <circle cx="38" cy="10" r="3" fill={accent} />
            <rect x="52" y="8" width="80" height="3" rx="1" fill={stroke} />
          </g>
          <g transform="translate(0, 56)">
            <circle cx="38" cy="10" r="6" fill="transparent" stroke={stroke} strokeWidth="1.5" />
            <rect x="52" y="8" width="60" height="3" rx="1" fill={muted} />
          </g>
          <g transform="translate(0, 80)">
            <circle cx="38" cy="10" r="6" fill="transparent" stroke={stroke} strokeWidth="1.5" />
            <rect x="52" y="8" width="70" height="3" rx="1" fill={muted} />
          </g>
        </svg>
      );

    case "date":
      return (
        <svg viewBox={VB} className={wrap} aria-hidden>
          <rect x="0" y="0" width="200" height="120" fill={bg} />
          <rect x="20" y="32" width="40" height="4" rx="1" fill={muted} />
          <InputRect>
            <text x="30" y="64" fontSize="10" fill={stroke} fontFamily="ui-monospace, monospace">JJ/MM/AAAA</text>
            <rect x="158" y="52" width="18" height="16" rx="2" fill="transparent" stroke={muted} strokeWidth="1.2" />
            <rect x="160" y="50" width="2" height="4" fill={muted} />
            <rect x="172" y="50" width="2" height="4" fill={muted} />
            <rect x="158" y="57" width="18" height="1" fill={muted} />
          </InputRect>
        </svg>
      );

    case "file":
      return (
        <svg viewBox={VB} className={wrap} aria-hidden>
          <rect x="0" y="0" width="200" height="120" fill={bg} />
          <rect x="20" y="36" width="160" height="48" rx="6" fill="transparent" stroke={stroke} strokeWidth="1.5" strokeDasharray="4 3" />
          <path d="M94 52 l6 -8 l6 8 M100 44 l0 18" stroke={accent} strokeWidth="2" fill="none" strokeLinecap="round" />
          <rect x="78" y="68" width="44" height="3" rx="1" fill={muted} />
        </svg>
      );

    default:
      return (
        <svg viewBox={VB} className={wrap} aria-hidden>
          <rect x="0" y="0" width="200" height="120" fill={bg} />
          <rect x="60" y="48" width="80" height="24" rx="4" fill={muted} />
        </svg>
      );
  }
}
