// Mini-mockups SVG des ÉLÉMENTS insérables. Affichés dans le picker WYSIWYG
// quand l'utilisateur clique "+" sur un élément. Pendant Pourcentage SectionThumb
// montre des sections complètes, ElementThumb montre une seule brique
// (rectangle de titre, ligne de paragraphe, etc.).
//
// Style cohérent avec SectionThumb : rectangles abstraits sur fond slate.

type Props = { id: string; className?: string };

const VB = "0 0 200 120";

export default function ElementThumb({ id, className }: Props) {
  const bg = "rgb(15 23 42)";
  const stroke = "rgb(148 163 184)";
  const fill = "rgb(51 65 85)";
  const muted = "rgb(71 85 105)";
  const accent = "rgb(99 102 241)";

  const wrap = `w-full h-auto rounded-md bg-white ${className ?? ""}`;

  switch (id) {
    case "h2":
      return (
        <svg viewBox={VB} className={wrap} aria-hidden>
          <rect x="0" y="0" width="200" height="120" fill={bg} />
          <rect x="25" y="50" width="150" height="12" rx="2" fill={stroke} />
          <rect x="25" y="68" width="100" height="12" rx="2" fill={stroke} />
        </svg>
      );

    case "h3":
      return (
        <svg viewBox={VB} className={wrap} aria-hidden>
          <rect x="0" y="0" width="200" height="120" fill={bg} />
          <rect x="35" y="55" width="130" height="8" rx="2" fill={stroke} />
          <rect x="35" y="67" width="80" height="8" rx="2" fill={stroke} />
        </svg>
      );

    case "paragraph":
      return (
        <svg viewBox={VB} className={wrap} aria-hidden>
          <rect x="0" y="0" width="200" height="120" fill={bg} />
          <rect x="25" y="35" width="150" height="3" rx="1" fill={muted} />
          <rect x="25" y="44" width="150" height="3" rx="1" fill={muted} />
          <rect x="25" y="53" width="150" height="3" rx="1" fill={muted} />
          <rect x="25" y="62" width="150" height="3" rx="1" fill={muted} />
          <rect x="25" y="71" width="100" height="3" rx="1" fill={muted} />
        </svg>
      );

    case "lead":
      return (
        <svg viewBox={VB} className={wrap} aria-hidden>
          <rect x="0" y="0" width="200" height="120" fill={bg} />
          <rect x="20" y="42" width="160" height="5" rx="2" fill={stroke} />
          <rect x="20" y="55" width="160" height="5" rx="2" fill={stroke} />
          <rect x="20" y="68" width="140" height="5" rx="2" fill={stroke} />
        </svg>
      );

    case "bullets":
      return (
        <svg viewBox={VB} className={wrap} aria-hidden>
          <rect x="0" y="0" width="200" height="120" fill={bg} />
          {[0, 1, 2].map((i) => (
            <g key={i} transform={`translate(0, ${30 + i * 22})`}>
              <circle cx="30" cy="6" r="3" fill={accent} />
              <rect x="42" y="3" width="120" height="3" rx="1" fill={muted} />
              <rect x="42" y="10" width="80" height="3" rx="1" fill={muted} />
            </g>
          ))}
        </svg>
      );

    case "quote":
      return (
        <svg viewBox={VB} className={wrap} aria-hidden>
          <rect x="0" y="0" width="200" height="120" fill={bg} />
          <rect x="25" y="35" width="3" height="50" rx="1" fill={accent} />
          <rect x="38" y="40" width="135" height="4" rx="1" fill={muted} />
          <rect x="38" y="52" width="135" height="4" rx="1" fill={muted} />
          <rect x="38" y="64" width="100" height="4" rx="1" fill={muted} />
          <rect x="38" y="78" width="60" height="3" rx="1" fill={accent} />
        </svg>
      );

    case "image":
      return (
        <svg viewBox={VB} className={wrap} aria-hidden>
          <rect x="0" y="0" width="200" height="120" fill={bg} />
          <rect x="30" y="25" width="140" height="70" rx="4" fill={fill} stroke={stroke} strokeWidth="1" />
          <circle cx="58" cy="50" r="6" fill={muted} />
          <path d="M40 88 L80 65 L110 80 L160 55 L160 88 Z" fill={muted} />
        </svg>
      );

    case "image_caption":
      return (
        <svg viewBox={VB} className={wrap} aria-hidden>
          <rect x="0" y="0" width="200" height="120" fill={bg} />
          <rect x="40" y="20" width="120" height="60" rx="4" fill={fill} />
          <circle cx="62" cy="40" r="5" fill={muted} />
          <path d="M50 72 L80 55 L105 67 L150 45 L150 72 Z" fill={muted} />
          <rect x="60" y="92" width="80" height="3" rx="1" fill={muted} />
          <rect x="75" y="100" width="50" height="3" rx="1" fill={muted} />
        </svg>
      );

    case "video":
      return (
        <svg viewBox={VB} className={wrap} aria-hidden>
          <rect x="0" y="0" width="200" height="120" fill={bg} />
          <rect x="30" y="20" width="140" height="80" rx="4" fill="black" stroke={muted} strokeWidth="1" />
          <circle cx="100" cy="60" r="14" fill="white" opacity="0.9" />
          <path d="M96 53 L96 67 L109 60 Z" fill="black" />
        </svg>
      );

    case "button":
      return (
        <svg viewBox={VB} className={wrap} aria-hidden>
          <rect x="0" y="0" width="200" height="120" fill={bg} />
          <rect x="65" y="50" width="70" height="22" rx="11" fill={accent} />
          <rect x="83" y="58" width="34" height="6" rx="2" fill="white" />
        </svg>
      );

    case "button_outline":
      return (
        <svg viewBox={VB} className={wrap} aria-hidden>
          <rect x="0" y="0" width="200" height="120" fill={bg} />
          <rect x="65" y="50" width="70" height="22" rx="11" fill="transparent" stroke={accent} strokeWidth="2" />
          <rect x="83" y="58" width="34" height="6" rx="2" fill={accent} />
        </svg>
      );

    case "buttons_pair":
      return (
        <svg viewBox={VB} className={wrap} aria-hidden>
          <rect x="0" y="0" width="200" height="120" fill={bg} />
          <rect x="38" y="50" width="60" height="22" rx="11" fill={accent} />
          <rect x="50" y="58" width="36" height="6" rx="2" fill="white" />
          <rect x="106" y="50" width="60" height="22" rx="11" fill="transparent" stroke={accent} strokeWidth="2" />
          <rect x="118" y="58" width="36" height="6" rx="2" fill={accent} />
        </svg>
      );

    case "divider":
      return (
        <svg viewBox={VB} className={wrap} aria-hidden>
          <rect x="0" y="0" width="200" height="120" fill={bg} />
          <rect x="30" y="58" width="140" height="2" rx="1" fill={muted} />
        </svg>
      );

    case "spacer":
      return (
        <svg viewBox={VB} className={wrap} aria-hidden>
          <rect x="0" y="0" width="200" height="120" fill={bg} />
          <rect x="40" y="38" width="120" height="44" rx="4" fill="transparent" stroke={muted} strokeWidth="1" strokeDasharray="4 3" />
          <rect x="78" y="56" width="44" height="3" rx="1" fill={muted} />
          <text x="100" y="73" textAnchor="middle" fontSize="10" fill={muted} fontFamily="system-ui">↕</text>
        </svg>
      );

    case "two_columns":
      return (
        <svg viewBox={VB} className={wrap} aria-hidden>
          <rect x="0" y="0" width="200" height="120" fill={bg} />
          <rect x="20" y="30" width="75" height="3" rx="1" fill={muted} />
          <rect x="20" y="38" width="75" height="3" rx="1" fill={muted} />
          <rect x="20" y="46" width="75" height="3" rx="1" fill={muted} />
          <rect x="20" y="54" width="60" height="3" rx="1" fill={muted} />
          <rect x="105" y="30" width="75" height="3" rx="1" fill={muted} />
          <rect x="105" y="38" width="75" height="3" rx="1" fill={muted} />
          <rect x="105" y="46" width="75" height="3" rx="1" fill={muted} />
          <rect x="105" y="54" width="60" height="3" rx="1" fill={muted} />
        </svg>
      );

    default:
      return (
        <svg viewBox={VB} className={wrap} aria-hidden>
          <rect x="0" y="0" width="200" height="120" fill={bg} />
          <rect x="60" y="50" width="80" height="20" rx="3" fill={muted} />
        </svg>
      );
  }
}
