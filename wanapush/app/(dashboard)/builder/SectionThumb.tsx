// Mini-mockups SVG des composants du catalogue — affichés dans le builder pour
// que l'utilisateur SAISISSE D'UN COUP D'ŒIL la structure visuelle de chaque
// section sans lire la description.
// Code 100% original : rectangles/cercles abstraits inspirés des layouts.

type Props = {
  id: string;
  className?: string;
  /** Si fourni, le thumbnail se teinte selon le thème et les couleurs choisies. */
  theme?: "light" | "dark";
  primaryColor?: string;
  secondaryColor?: string;
  /** Comment combiner primaire+secondaire :
   *  - "gradient" : dégradé primaire → secondaire sur les surfaces importantes (default)
   *  - "bicolor" : primaire dominante, secondaire utilisée en petits accents (icônes, badges)
   *  - "mono"    : primaire seule, secondaire ignorée. */
  colorMode?: "gradient" | "bicolor" | "mono";
};

const VB = "0 0 200 120"; // ratio 5:3 — colle aux cards du builder

export default function SectionThumb({ id, className, theme, primaryColor, secondaryColor, colorMode }: Props) {
  // Mode "neutre" (par défaut, slate) ou mode "themed" selon les couleurs/thème de l'utilisateur.
  const themed = !!theme;
  const isDark = theme === "dark";

  // En mode themed light, on laisse le PARENT (LayoutPreview wrapper) gérer le fond
  // (#fff ou #f2f2f2 selon l'alternance). En themed dark on garde une teinte slate.
  // En mode neutre (sans theme) on garde le fond slate sombre du builder.
  const bg = themed ? (isDark ? "rgb(15 23 42)" : "transparent") : "rgb(15 23 42)";
  const stroke = themed ? (isDark ? "rgb(203 213 225)" : "rgb(15 23 42)") : "rgb(148 163 184)";
  const fill = themed ? (isDark ? "rgb(51 65 85)" : "rgb(226 232 240)") : "rgb(51 65 85)";
  const muted = themed ? (isDark ? "rgb(71 85 105)" : "rgb(148 163 184)") : "rgb(71 85 105)";
  const accent = primaryColor || "rgb(99 102 241)";
  const accent2 = secondaryColor || "rgb(236 72 153)";
  const mode: NonNullable<Props["colorMode"]> = colorMode ?? "gradient";

  // Helper qui produit les <stop> d'un linearGradient selon le mode choisi.
  // - "gradient": transition lisse primaire → secondaire
  // - "bicolor" : split 50/50 dur (deux bandes de couleurs distinctes)
  // - "mono"   : primaire pleine (secondaire ignorée)
  const stops = (op1 = "1", op2 = "1") => {
    if (mode === "mono") return (
      <>
        <stop offset="0%" stopColor={accent} stopOpacity={op1} />
        <stop offset="100%" stopColor={accent} stopOpacity={op1} />
      </>
    );
    if (mode === "bicolor") return (
      <>
        <stop offset="0%" stopColor={accent} stopOpacity={op1} />
        <stop offset="50%" stopColor={accent} stopOpacity={op1} />
        <stop offset="50%" stopColor={accent2} stopOpacity={op2} />
        <stop offset="100%" stopColor={accent2} stopOpacity={op2} />
      </>
    );
    return (
      <>
        <stop offset="0%" stopColor={accent} stopOpacity={op1} />
        <stop offset="100%" stopColor={accent2} stopOpacity={op2} />
      </>
    );
  };
  // themed light : transparent (parent gère #fff/#f2f2f2)
  // themed dark : slate-900 (dark theme du site final)
  // neutre (gallery non-themed) : slate-950 (fond du builder)
  const wrap = `w-full h-auto rounded-md ${themed ? (isDark ? "bg-zinc-50" : "bg-transparent") : "bg-white"} ${className ?? ""}`;
  // ID unique pour les <linearGradient> SVG (sinon collision si plusieurs thumbs sur la page)
  const gradId = `g-${id}-${themed ? (isDark ? "d" : "l") : "n"}-${(accent + accent2).replace(/[^a-z0-9]/gi, "").slice(0, 8)}`;

  switch (id) {
    // ═══════ HEADERS ═══════
    case "hero":
      return (
        <svg viewBox={VB} className={wrap} aria-hidden>
          <rect x="0" y="0" width="200" height="120" fill={bg} />
          {/* Petit eyebrow en couleur primaire */}
          <rect x="85" y="28" width="30" height="2" rx="1" fill={accent} />
          {/* Titre et sous-titre */}
          <rect x="60" y="38" width="80" height="6" rx="2" fill={stroke} />
          <rect x="40" y="50" width="120" height="3" rx="1" fill={muted} />
          <rect x="50" y="57" width="100" height="3" rx="1" fill={muted} />
          {/* Bouton plein primaire (CTA) */}
          <rect x="75" y="72" width="50" height="11" rx="6" fill={accent} />
        </svg>
      );
    case "hero_split":
      return (
        <svg viewBox={VB} className={wrap} aria-hidden>
          <rect x="0" y="0" width="200" height="120" fill={bg} />
          {/* Eyebrow */}
          <rect x="10" y="28" width="30" height="2" rx="1" fill={accent} />
          {/* Titre + texte gauche */}
          <rect x="10" y="38" width="60" height="6" rx="2" fill={stroke} />
          <rect x="10" y="49" width="80" height="3" rx="1" fill={muted} />
          <rect x="10" y="56" width="70" height="3" rx="1" fill={muted} />
          {/* 2 CTAs : plein primaire + outline */}
          <rect x="10" y="72" width="32" height="9" rx="5" fill={accent} />
          <rect x="46" y="72" width="32" height="9" rx="5" fill="none" stroke={stroke} strokeWidth="1" />
          {/* Mockup neutre à droite (plus de halo coloré) */}
          <rect x="110" y="20" width="80" height="80" rx="6" fill={fill} />
          <circle cx="125" cy="38" r="3" fill={accent} />
          <rect x="118" y="50" width="64" height="3" rx="1" fill={stroke} opacity="0.6" />
          <rect x="118" y="58" width="50" height="3" rx="1" fill={muted} />
        </svg>
      );
    case "hero_slider":
      return (
        <svg viewBox={VB} className={wrap} aria-hidden>
          <rect x="0" y="0" width="200" height="120" fill={bg} />
          <rect x="0" y="0" width="200" height="100" fill={fill} opacity="0.7" />
          <rect x="50" y="35" width="100" height="6" rx="2" fill="white" />
          <rect x="60" y="48" width="80" height="3" rx="1.5" fill="white" opacity="0.7" />
          <rect x="80" y="62" width="40" height="9" rx="3" fill="none" stroke="white" strokeWidth="1" />
          <text x="10" y="55" fontSize="14" fill="white" opacity="0.6">‹</text>
          <text x="184" y="55" fontSize="14" fill="white" opacity="0.6">›</text>
          <circle cx="90" cy="92" r="2" fill="white" />
          <circle cx="100" cy="92" r="2" fill="white" opacity="0.4" />
          <circle cx="110" cy="92" r="2" fill="white" opacity="0.4" />
        </svg>
      );
    case "hero_blob":
      return (
        <svg viewBox={VB} className={wrap} aria-hidden>
          <rect x="0" y="0" width="200" height="120" fill={bg} />
          {/* Blob neutre (forme décorative) */}
          <circle cx="45" cy="60" r="38" fill={fill} />
          {/* Eyebrow + titre + bouton outline accent */}
          <rect x="100" y="32" width="40" height="2" rx="1" fill={accent} />
          <rect x="100" y="42" width="80" height="7" rx="2" fill={stroke} />
          <rect x="100" y="54" width="80" height="7" rx="2" fill={stroke} />
          <rect x="100" y="66" width="60" height="7" rx="2" fill={stroke} />
          <rect x="100" y="82" width="50" height="10" rx="5" fill={accent} />
        </svg>
      );

    // ═══════ SECTIONS ═══════
    case "features":
      return (
        <svg viewBox={VB} className={wrap} aria-hidden>
          <rect x="0" y="0" width="200" height="120" fill={bg} />
          <rect x="60" y="8" width="80" height="4" rx="1" fill={stroke} />
          {/* Grille 3 × 2 = 6 items (vue par défaut, peut être 3 ou 9 selon le contenu) */}
          {[0, 1, 2].map((c) => [0, 1].map((r) => (
            <g key={`${c}-${r}`}>
              <rect x={20 + c * 56} y={24 + r * 42} width="50" height="36" rx="3" fill={fill} />
              <circle cx={28 + c * 56} cy={32 + r * 42} r="3" fill={accent} />
              <rect x={28 + c * 56} y={42 + r * 42} width="36" height="3" rx="1" fill={muted} />
              <rect x={28 + c * 56} y={48 + r * 42} width="24" height="2" rx="1" fill={muted} />
            </g>
          )))}
        </svg>
      );
    case "service_tiles":
      return (
        <svg viewBox={VB} className={wrap} aria-hidden>
          <rect x="0" y="0" width="200" height="120" fill={bg} />
          {[0, 1, 2].map((i) => (
            <g key={i}>
              <rect x={14 + i * 62} y="12" width="56" height="100" rx="4" fill={fill} />
              <rect x={18 + i * 62} y="16" width="48" height="42" rx="3" fill={muted} />
              <rect x={22 + i * 62} y="64" width="40" height="4" rx="1" fill={stroke} />
              <rect x={22 + i * 62} y="72" width="30" height="3" rx="1" fill={muted} />
              <rect x={22 + i * 62} y="92" width="22" height="6" rx="3" fill={accent} />
            </g>
          ))}
        </svg>
      );
    case "highlights":
      return (
        <svg viewBox={VB} className={wrap} aria-hidden>
          <rect x="0" y="0" width="200" height="120" fill={bg} />
          <rect x="14" y="14" width="86" height="42" rx="3" fill={fill} />
          <rect x="110" y="20" width="60" height="4" rx="1" fill={stroke} />
          <rect x="110" y="30" width="76" height="3" rx="1" fill={muted} />
          <rect x="110" y="38" width="64" height="3" rx="1" fill={muted} />
          <rect x="100" y="64" width="86" height="42" rx="3" fill={fill} />
          <rect x="14" y="70" width="60" height="4" rx="1" fill={stroke} />
          <rect x="14" y="80" width="76" height="3" rx="1" fill={muted} />
          <rect x="14" y="88" width="64" height="3" rx="1" fill={muted} />
        </svg>
      );
    case "circles":
      return (
        <svg viewBox={VB} className={wrap} aria-hidden>
          <rect x="0" y="0" width="200" height="120" fill={bg} />
          <rect x="60" y="14" width="80" height="4" rx="1" fill={stroke} />
          {[35, 80, 125, 170].map((cx, i) => (
            <g key={i}>
              <circle cx={cx} cy="60" r="18" fill={fill} />
              <circle cx={cx} cy="60" r="18" fill="none" stroke={accent} strokeWidth="1" strokeOpacity="0.3" />
              <rect x={cx - 16} y="86" width="32" height="3" rx="1" fill={muted} />
            </g>
          ))}
        </svg>
      );
    case "services_grid":
      return (
        <svg viewBox={VB} className={wrap} aria-hidden>
          <rect x="0" y="0" width="200" height="120" fill={bg} />
          {[0, 1, 2].map((i) => (
            <g key={i}>
              <rect x={14 + i * 62} y="24" width="56" height="76" rx="3" fill={fill} />
              <rect x={14 + i * 62} y="24" width="56" height="32" rx="3" fill={muted} />
              <rect x={20 + i * 62} y="62" width="44" height="4" rx="1" fill={stroke} />
              <rect x={20 + i * 62} y="72" width="36" height="3" rx="1" fill={muted} />
              <rect x={20 + i * 62} y="78" width="28" height="3" rx="1" fill={muted} />
            </g>
          ))}
        </svg>
      );
    case "features_phone":
      return (
        <svg viewBox={VB} className={wrap} aria-hidden>
          <rect x="0" y="0" width="200" height="120" fill={bg} />
          <rect x="86" y="14" width="28" height="92" rx="6" fill={muted} />
          <rect x="89" y="18" width="22" height="80" rx="2" fill={fill} />
          {[
            [16, 22], [16, 60], [134, 22], [134, 60],
          ].map(([x, y], i) => (
            <g key={i}>
              <rect x={x} y={y} width="50" height="36" rx="3" fill={fill} />
              <circle cx={x + 8} cy={y + 8} r="3" fill={accent} />
              <rect x={x + 16} y={y + 6} width="28" height="3" rx="1" fill={stroke} />
              <rect x={x + 8} y={y + 16} width="36" height="3" rx="1" fill={muted} />
              <rect x={x + 8} y={y + 22} width="28" height="2" rx="1" fill={muted} />
            </g>
          ))}
        </svg>
      );
    case "feature_split":
      return (
        <svg viewBox={VB} className={wrap} aria-hidden>
          <rect x="0" y="0" width="200" height="120" fill={bg} />

          {/* Bloc 1 : texte gauche + image droite (sans halo coloré) */}
          <rect x="14" y="10" width="34" height="3" rx="1" fill={accent} />
          <rect x="14" y="18" width="72" height="5" rx="1" fill={stroke} />
          <rect x="14" y="28" width="68" height="2.5" rx="1" fill={muted} />
          <rect x="14" y="34" width="60" height="2.5" rx="1" fill={muted} />
          {[42, 48, 54].map((y, i) => (
            <g key={`b1-${i}`}>
              <circle cx="17" cy={y} r="1.6" fill={accent} />
              <path d={`M ${15.5} ${y} L ${16.7} ${y + 0.7} L ${18.5} ${y - 1}`} stroke="white" strokeWidth="0.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              <rect x="22" y={y - 1.5} width={40 - i * 3} height="2" rx="1" fill={muted} />
            </g>
          ))}
          <rect x="100" y="8" width="88" height="44" rx="4" fill={fill} />

          {/* Bloc 2 : texte droite + image gauche (alterné) */}
          <rect x="118" y="68" width="34" height="3" rx="1" fill={accent} />
          <rect x="118" y="76" width="72" height="5" rx="1" fill={stroke} />
          <rect x="118" y="86" width="68" height="2.5" rx="1" fill={muted} />
          <rect x="118" y="92" width="60" height="2.5" rx="1" fill={muted} />
          <rect x="12" y="66" width="88" height="44" rx="4" fill={fill} />
        </svg>
      );
    case "stats":
      return (
        <svg viewBox="0 0 200 80" className={wrap} aria-hidden>
          <rect x="0" y="0" width="200" height="80" fill={bg} />
          {/* 4 valeurs en texte (gros chiffre/mot stylé), label en eyebrow accent */}
          {[0, 1, 2, 3].map((i) => (
            <g key={i}>
              <rect x={20 + i * 45} y="22" width="32" height="10" rx="1" fill={stroke} />
              <rect x={24 + i * 45} y="42" width="24" height="2" rx="1" fill={accent} />
              <rect x={28 + i * 45} y="48" width="18" height="2" rx="1" fill={muted} />
            </g>
          ))}
        </svg>
      );
    case "process":
      return (
        <svg viewBox={VB} className={wrap} aria-hidden>
          <rect x="0" y="0" width="200" height="120" fill={bg} />
          <rect x="60" y="14" width="80" height="4" rx="1" fill={stroke} />
          {[40, 100, 160].map((cx, i) => (
            <g key={i}>
              <circle cx={cx} cy="55" r="14" fill={fill} stroke={accent} strokeWidth="1" />
              <text x={cx - 3} y="59" fontSize="10" fill="white">{i + 1}</text>
              <rect x={cx - 18} y="78" width="36" height="4" rx="1" fill={stroke} />
              <rect x={cx - 16} y="88" width="32" height="3" rx="1" fill={muted} />
              {i < 2 && <line x1={cx + 14} y1="55" x2={cx + 46} y2="55" stroke={muted} strokeWidth="1" strokeDasharray="2 2" />}
            </g>
          ))}
        </svg>
      );
    case "process_vertical":
      return (
        <svg viewBox={VB} className={wrap} aria-hidden>
          <rect x="0" y="0" width="200" height="120" fill={bg} />
          {[15, 50, 85].map((cy, i) => (
            <g key={i}>
              <circle cx="40" cy={cy} r="10" fill={fill} stroke={accent} strokeWidth="1" />
              <text x="37" y={cy + 4} fontSize="9" fill="white">{i + 1}</text>
              <rect x="60" y={cy - 5} width="80" height="4" rx="1" fill={stroke} />
              <rect x="60" y={cy + 2} width="100" height="3" rx="1" fill={muted} />
              <rect x="60" y={cy + 8} width="60" height="3" rx="1" fill={muted} />
              {i < 2 && <line x1="40" y1={cy + 10} x2="40" y2={cy + 25} stroke={muted} strokeWidth="1" strokeDasharray="2 2" />}
            </g>
          ))}
        </svg>
      );
    case "about":
      return (
        <svg viewBox={VB} className={wrap} aria-hidden>
          <rect x="0" y="0" width="200" height="120" fill={bg} />
          <rect x="10" y="20" width="90" height="80" rx="4" fill={fill} />
          <rect x="110" y="24" width="50" height="6" rx="1" fill={stroke} />
          <rect x="110" y="38" width="80" height="3" rx="1" fill={muted} />
          <rect x="110" y="46" width="76" height="3" rx="1" fill={muted} />
          <rect x="110" y="54" width="72" height="3" rx="1" fill={muted} />
          <rect x="110" y="62" width="64" height="3" rx="1" fill={muted} />
          <rect x="110" y="80" width="40" height="8" rx="3" fill={accent} />
        </svg>
      );
    case "about_cards":
      return (
        <svg viewBox={VB} className={wrap} aria-hidden>
          <rect x="0" y="0" width="200" height="120" fill={bg} />
          <rect x="10" y="10" width="60" height="60" rx="3" fill={fill} />
          <rect x="78" y="14" width="40" height="4" rx="1" fill={stroke} />
          <rect x="78" y="24" width="80" height="3" rx="1" fill={muted} />
          <rect x="78" y="32" width="70" height="3" rx="1" fill={muted} />
          <rect x="78" y="40" width="60" height="3" rx="1" fill={muted} />
          {[10, 76, 142].map((x, i) => (
            <g key={i}>
              <rect x={x} y="80" width="50" height="32" rx="3" fill={fill} />
              <circle cx={x + 8} cy="90" r="3" fill={accent} />
              <rect x={x + 6} y="98" width="36" height="3" rx="1" fill={stroke} />
              <rect x={x + 6} y="105" width="26" height="2" rx="1" fill={muted} />
            </g>
          ))}
        </svg>
      );
    case "gallery":
      return (
        <svg viewBox={VB} className={wrap} aria-hidden>
          <rect x="0" y="0" width="200" height="120" fill={bg} />
          <rect x="60" y="6" width="80" height="3" rx="1" fill={stroke} />
          {[0, 1, 2].map((c) => [0, 1, 2].map((r) => (
            <rect key={`${c}-${r}`} x={14 + c * 60} y={16 + r * 32} width="56" height="28" rx="2" fill={fill} />
          )))}
        </svg>
      );
    case "video":
      return (
        <svg viewBox={VB} className={wrap} aria-hidden>
          <rect x="0" y="0" width="200" height="120" fill={bg} />
          <rect x="40" y="14" width="120" height="84" rx="4" fill={fill} />
          <circle cx="100" cy="56" r="14" fill="rgba(0,0,0,0.5)" />
          <polygon points="95,49 95,63 108,56" fill="white" />
          <rect x="55" y="106" width="90" height="3" rx="1" fill={muted} />
        </svg>
      );
    case "promo_split":
      return (
        <svg viewBox={VB} className={wrap} aria-hidden>
          <rect x="0" y="0" width="200" height="120" fill={bg} />
          <rect x="10" y="10" width="80" height="100" rx="4" fill={fill} />
          <rect x="100" y="20" width="60" height="6" rx="1" fill={stroke} />
          <rect x="100" y="36" width="86" height="3" rx="1" fill={muted} />
          <rect x="100" y="44" width="76" height="3" rx="1" fill={muted} />
          <rect x="100" y="52" width="80" height="3" rx="1" fill={muted} />
          <rect x="100" y="64" width="40" height="3" rx="1" fill={accent} />
          <rect x="100" y="80" width="40" height="9" rx="4" fill={accent} />
          <rect x="144" y="80" width="40" height="9" rx="4" fill="none" stroke={stroke} strokeWidth="1" />
        </svg>
      );
    case "actions_grid":
      return (
        <svg viewBox={VB} className={wrap} aria-hidden>
          <rect x="0" y="0" width="200" height="120" fill={bg} />
          <rect x="0" y="0" width="200" height="120" fill={fill} opacity="0.4" />
          <rect x="60" y="14" width="80" height="4" rx="1" fill={stroke} />
          {[[20, 36], [110, 36], [20, 72], [110, 72]].map(([x, y], i) => (
            <rect key={i} x={x} y={y} width="70" height="26" rx="4" fill="rgba(15, 23, 42, 0.85)" stroke={stroke} strokeWidth="1" />
          ))}
        </svg>
      );
    case "logos_bar":
      return (
        <svg viewBox="0 0 200 60" className={wrap} aria-hidden>
          <rect x="0" y="0" width="200" height="60" fill={bg} />
          <rect x="60" y="10" width="80" height="3" rx="1" fill={muted} />
          {[8, 40, 72, 104, 136, 168].map((x, i) => (
            <rect key={i} x={x} y="26" width="24" height="14" rx="2" fill={muted} opacity={0.5 + (i % 2) * 0.3} />
          ))}
        </svg>
      );
    case "testimonials":
      return (
        <svg viewBox={VB} className={wrap} aria-hidden>
          <rect x="0" y="0" width="200" height="120" fill={bg} />
          <rect x="60" y="10" width="80" height="4" rx="1" fill={stroke} />
          {[0, 1, 2].map((i) => (
            <g key={i}>
              <rect x={10 + i * 62} y="24" width="56" height="86" rx="3" fill={fill} />
              <text x={18 + i * 62} y="42" fontSize="20" fill={accent} fontFamily="serif">"</text>
              <rect x={14 + i * 62} y="52" width="48" height="3" rx="1" fill={muted} />
              <rect x={14 + i * 62} y="60" width="40" height="3" rx="1" fill={muted} />
              <rect x={14 + i * 62} y="68" width="44" height="3" rx="1" fill={muted} />
              <circle cx={22 + i * 62} cy="92" r="6" fill={muted} />
              <rect x={32 + i * 62} y="86" width="26" height="3" rx="1" fill={stroke} />
              <rect x={32 + i * 62} y="93" width="20" height="3" rx="1" fill={muted} />
            </g>
          ))}
        </svg>
      );
    case "pricing":
      return (
        <svg viewBox={VB} className={wrap} aria-hidden>
          <rect x="0" y="0" width="200" height="120" fill={bg} />
          {[0, 1, 2].map((i) => (
            <g key={i}>
              <rect x={14 + i * 62} y="14" width="56" height="92" rx="4" fill={fill} stroke={i === 1 ? accent : "none"} strokeWidth={i === 1 ? "1.5" : "0"} />
              <rect x={24 + i * 62} y="22" width="36" height="3" rx="1" fill={stroke} />
              <text x={26 + i * 62} y="44" fontSize="14" fill="white" fontWeight="bold">${(i + 1) * 9}</text>
              {[58, 66, 74, 82].map((y, j) => <rect key={j} x={20 + i * 62} y={y} width="44" height="2" rx="1" fill={muted} />)}
              <rect x={22 + i * 62} y="92" width="40" height="8" rx="3" fill={i === 1 ? accent : "none"} stroke={i === 1 ? "none" : stroke} strokeWidth="1" />
            </g>
          ))}
        </svg>
      );
    case "faq":
      return (
        <svg viewBox={VB} className={wrap} aria-hidden>
          <rect x="0" y="0" width="200" height="120" fill={bg} />
          <rect x="60" y="8" width="80" height="4" rx="1" fill={stroke} />
          {[20, 38, 56, 74, 92].map((y, i) => (
            <g key={i}>
              <line x1="14" y1={y - 2} x2="186" y2={y - 2} stroke={muted} strokeWidth="0.5" />
              <rect x="20" y={y} width="120" height="4" rx="1" fill={stroke} />
              <text x="178" y={y + 4} fontSize="9" fill={muted}>+</text>
            </g>
          ))}
        </svg>
      );
    case "cta":
      return (
        <svg viewBox="0 0 200 80" className={wrap} aria-hidden>
          <rect x="0" y="0" width="200" height="80" fill={bg} />
          {/* Titre centré + sous-titre + bouton plein primaire (pas de bandeau coloré) */}
          <rect x="50" y="16" width="100" height="6" rx="2" fill={stroke} />
          <rect x="40" y="28" width="120" height="3" rx="1" fill={muted} />
          <rect x="50" y="36" width="100" height="3" rx="1" fill={muted} />
          <rect x="74" y="50" width="52" height="14" rx="7" fill={accent} />
        </svg>
      );
    case "contact":
      return (
        <svg viewBox={VB} className={wrap} aria-hidden>
          <rect x="0" y="0" width="200" height="120" fill={bg} />
          <rect x="60" y="8" width="80" height="4" rx="1" fill={stroke} />
          <rect x="14" y="22" width="80" height="86" rx="3" fill={fill} />
          <circle cx="22" cy="32" r="3" fill={accent} />
          <rect x="30" y="30" width="50" height="3" rx="1" fill={stroke} />
          <rect x="22" y="42" width="60" height="2" rx="1" fill={muted} />
          <circle cx="22" cy="58" r="3" fill={accent} />
          <rect x="30" y="56" width="50" height="3" rx="1" fill={stroke} />
          <rect x="22" y="68" width="60" height="2" rx="1" fill={muted} />
          <rect x="106" y="22" width="80" height="86" rx="3" fill={fill} />
          {[30, 48, 66, 84].map((y, i) => (
            <rect key={i} x="114" y={y} width="64" height={i === 3 ? 16 : 8} rx="2" fill="rgb(30 41 59)" />
          ))}
        </svg>
      );

    // ═══ Shop ═══
    case "shop_grid":
      return (
        <svg viewBox={VB} className={wrap} aria-hidden>
          <rect x="0" y="0" width="200" height="120" fill={bg} />
          <rect x="70" y="10" width="60" height="4" rx="1" fill={stroke} />
          {[0, 1, 2, 3].map((i) => {
            const x = 18 + (i % 4) * 42;
            const y = 24;
            return (
              <g key={`r1-${i}`}>
                <rect x={x} y={y} width="36" height="44" rx="3" fill={fill} />
                <rect x={x + 4} y={y + 4} width="28" height="22" rx="2" fill={muted} />
                <rect x={x + 4} y={y + 30} width="20" height="2" rx="1" fill={stroke} />
                <rect x={x + 4} y={y + 35} width="14" height="2" rx="1" fill={accent} />
              </g>
            );
          })}
          {[0, 1, 2, 3].map((i) => {
            const x = 18 + (i % 4) * 42;
            const y = 74;
            return (
              <g key={`r2-${i}`}>
                <rect x={x} y={y} width="36" height="36" rx="3" fill={fill} />
                <rect x={x + 4} y={y + 4} width="28" height="18" rx="2" fill={muted} />
                <rect x={x + 4} y={y + 26} width="20" height="2" rx="1" fill={stroke} />
              </g>
            );
          })}
        </svg>
      );

    case "shop_featured":
      return (
        <svg viewBox={VB} className={wrap} aria-hidden>
          <rect x="0" y="0" width="200" height="120" fill={bg} />
          <rect x="60" y="8" width="80" height="4" rx="1" fill={stroke} />
          <rect x="76" y="18" width="48" height="3" rx="1" fill={accent} />
          {[0, 1, 2].map((i) => {
            const x = 16 + i * 60;
            const y = 28;
            return (
              <g key={i}>
                <rect x={x} y={y} width="52" height="76" rx="4" fill={fill} />
                <rect x={x + 6} y={y + 6} width="40" height="38" rx="3" fill={muted} />
                {/* Badge featured */}
                <circle cx={x + 44} cy={y + 12} r="5" fill={accent2} />
                <text x={x + 44} y={y + 15} fontSize="6" fill="white" textAnchor="middle" fontWeight="bold">★</text>
                <rect x={x + 6} y={y + 50} width="28" height="2" rx="1" fill={stroke} />
                <rect x={x + 6} y={y + 56} width="20" height="2" rx="1" fill={accent} />
                {/* Bouton */}
                <rect x={x + 6} y={y + 64} width="40" height="8" rx="4" fill={accent} />
              </g>
            );
          })}
        </svg>
      );

    case "shop_categories":
      return (
        <svg viewBox={VB} className={wrap} aria-hidden>
          <rect x="0" y="0" width="200" height="120" fill={bg} />
          <rect x="60" y="8" width="80" height="4" rx="1" fill={stroke} />
          {[0, 1, 2, 3].map((i) => {
            const x = 14 + i * 46;
            const y = 22;
            return (
              <g key={i}>
                <rect x={x} y={y} width="42" height="60" rx="6" fill={fill} />
                <rect x={x + 4} y={y + 4} width="34" height="40" rx="4" fill={muted} />
                <rect x={x + 8} y={y + 48} width="26" height="3" rx="1" fill={stroke} />
                <rect x={x + 12} y={y + 54} width="18" height="2" rx="1" fill={muted} />
              </g>
            );
          })}
          {/* Tag "Voir tout" */}
          <rect x="80" y="92" width="40" height="10" rx="5" fill={accent} />
          <rect x="92" y="95" width="16" height="3" rx="1" fill="white" />
        </svg>
      );

    default:
      // Fallback générique : 3 barres horizontales empilées
      return (
        <svg viewBox={VB} className={wrap} aria-hidden>
          <rect x="0" y="0" width="200" height="120" fill={bg} />
          <rect x="14" y="24" width="172" height="20" rx="3" fill={fill} />
          <rect x="14" y="50" width="172" height="20" rx="3" fill={fill} />
          <rect x="14" y="76" width="172" height="20" rx="3" fill={fill} />
        </svg>
      );
  }
}
