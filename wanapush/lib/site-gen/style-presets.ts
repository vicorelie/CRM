// Presets CSS par designProfile.
// Au lieu d'attendre que l'IA génère un customCss (qu'elle oublie souvent), on injecte
// en code un preset qui personnalise fortement le rendu visuel selon le profile.

type DesignProfile =
  | "minimal" | "bold-vibrant" | "trust-corporate" | "luxury-elegant"
  | "playful-startup" | "editorial" | "tech-modern" | "wellness-soft";

const PRESETS: Record<DesignProfile, string> = {
  "minimal": `
/* MINIMAL — épuré, lignes fines, peu d'ombres */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
body { font-family: 'Inter', sans-serif; }
.font-heading { font-family: 'Inter', sans-serif; letter-spacing: -0.02em; }
section { padding-top: 5rem !important; padding-bottom: 5rem !important; }
[class*="rounded-2xl"], [class*="rounded-3xl"] { border-radius: 0.5rem !important; }
.shadow-sm, .shadow, .shadow-md { box-shadow: none !important; border: 1px solid rgba(0,0,0,0.06) !important; }
.shadow-lg, .shadow-xl, .shadow-2xl { box-shadow: 0 4px 12px rgba(0,0,0,0.05) !important; }
`,

  "bold-vibrant": `
/* BOLD-VIBRANT — couleurs saturées, gradients, ombres marquées */
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;700;800&display=swap');
body { font-family: 'Plus Jakarta Sans', sans-serif; }
.font-heading { font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 800; letter-spacing: -0.03em; }
.bg-primary { background-image: linear-gradient(135deg, var(--color-primary), var(--color-secondary)) !important; }
.shadow-lg, .shadow-xl, .shadow-2xl { box-shadow: 0 20px 50px rgba(0,0,0,0.12) !important; }
[class*="rounded-2xl"], [class*="rounded-3xl"] { border-radius: 1.5rem !important; }
button, .rounded-full { transition: transform .25s ease, box-shadow .25s ease; }
button:hover, .rounded-full:hover { transform: translateY(-2px); }
`,

  "trust-corporate": `
/* TRUST-CORPORATE — pro, structuré, ombres subtiles, bleu */
@import url('https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;500;600;700&display=swap');
body { font-family: 'Source Sans 3', sans-serif; }
.font-heading { font-family: 'Source Sans 3', sans-serif; font-weight: 700; letter-spacing: -0.01em; }
[class*="rounded-2xl"] { border-radius: 0.5rem !important; }
[class*="rounded-3xl"] { border-radius: 0.75rem !important; }
[class*="rounded-full"] { border-radius: 9999px !important; }
button, a[class*="bg-primary"] { border-radius: 0.375rem !important; }
.shadow-sm { box-shadow: 0 1px 2px rgba(0,0,0,0.04) !important; border: 1px solid rgba(0,0,0,0.06) !important; }
.shadow-md, .shadow-lg { box-shadow: 0 4px 12px rgba(0,0,0,0.06) !important; }
`,

  "luxury-elegant": `
/* LUXURY-ELEGANT — serif, dorés, raffiné */
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=Inter:wght@300;400;500;600&display=swap');
body { font-family: 'Inter', sans-serif; font-weight: 300; }
.font-heading { font-family: 'Playfair Display', serif; font-weight: 500; letter-spacing: 0.005em; }
h1, h2 { font-weight: 500 !important; letter-spacing: -0.01em; }
section { padding-top: 6rem !important; padding-bottom: 6rem !important; }
[class*="rounded-2xl"], [class*="rounded-3xl"] { border-radius: 0.25rem !important; }
button, .rounded-full { letter-spacing: 0.15em; text-transform: uppercase; font-size: 0.75rem; }
.bg-primary { background-image: linear-gradient(135deg, var(--color-primary), color-mix(in srgb, var(--color-secondary) 70%, var(--color-primary))) !important; }
`,

  "playful-startup": `
/* PLAYFUL-STARTUP — fun, arrondi, gradients vifs */
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;900&display=swap');
body { font-family: 'DM Sans', sans-serif; }
.font-heading { font-family: 'DM Sans', sans-serif; font-weight: 900; letter-spacing: -0.04em; }
[class*="rounded-2xl"], [class*="rounded-3xl"], [class*="rounded-xl"] { border-radius: 2rem !important; }
button, .rounded-full { transition: transform .2s; }
button:hover { transform: scale(1.05) rotate(-1deg); }
.bg-primary { background-image: linear-gradient(135deg, var(--color-primary), var(--color-secondary)) !important; }
.shadow-lg, .shadow-xl, .shadow-2xl { box-shadow: 0 15px 35px rgba(0,0,0,0.1) !important; }
`,

  "editorial": `
/* EDITORIAL — magazine, sans ombres, lignes fines, serif élégant */
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=Inter:wght@300;400;500&display=swap');
body { font-family: 'Inter', sans-serif; font-weight: 300; }
.font-heading { font-family: 'Cormorant Garamond', serif; font-weight: 500; letter-spacing: -0.005em; }
h1, h2, h3 { font-weight: 500 !important; }
[class*="rounded-2xl"], [class*="rounded-3xl"] { border-radius: 0 !important; }
[class*="rounded-xl"] { border-radius: 0.125rem !important; }
.shadow-sm, .shadow, .shadow-md { box-shadow: none !important; border-bottom: 1px solid rgba(0,0,0,0.1) !important; }
.shadow-lg, .shadow-xl, .shadow-2xl { box-shadow: none !important; border: 1px solid rgba(0,0,0,0.08) !important; }
button, .rounded-full { border-radius: 0 !important; letter-spacing: 0.2em; text-transform: uppercase; font-size: 0.7rem; }
section { padding-top: 7rem !important; padding-bottom: 7rem !important; }
`,

  "tech-modern": `
/* TECH-MODERN — sombre, accents néon, monospace headings */
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Inter:wght@400;500;700&display=swap');
body { font-family: 'Inter', sans-serif; }
.font-heading { font-family: 'Inter', sans-serif; font-weight: 700; letter-spacing: -0.02em; }
h1, h2 { letter-spacing: -0.03em; }
code, pre, .font-mono { font-family: 'JetBrains Mono', monospace; }
[class*="rounded-2xl"], [class*="rounded-3xl"] { border-radius: 0.75rem !important; }
.bg-primary { background-image: linear-gradient(135deg, var(--color-primary), color-mix(in srgb, var(--color-secondary, var(--color-primary)) 50%, var(--color-primary))) !important; }
.text-primary { text-shadow: 0 0 24px color-mix(in srgb, var(--color-primary) 40%, transparent); }
button, a[class*="bg-primary"] {
  box-shadow: 0 0 0 1px var(--color-primary), 0 8px 24px color-mix(in srgb, var(--color-primary) 30%, transparent);
}
`,

  "wellness-soft": `
/* WELLNESS-SOFT — doux, terreux, espacé, ombres très subtiles */
@import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@300;400;500;600&family=Inter:wght@300;400;500&display=swap');
body { font-family: 'Inter', sans-serif; font-weight: 300; }
.font-heading { font-family: 'Fraunces', serif; font-weight: 400; letter-spacing: -0.01em; }
h1, h2, h3 { font-weight: 400 !important; }
[class*="rounded-2xl"], [class*="rounded-3xl"] { border-radius: 1.75rem !important; }
.shadow-sm, .shadow, .shadow-md { box-shadow: 0 2px 16px rgba(120,90,70,0.05) !important; }
.shadow-lg, .shadow-xl, .shadow-2xl { box-shadow: 0 8px 40px rgba(120,90,70,0.08) !important; }
section { padding-top: 6rem !important; padding-bottom: 6rem !important; }
button, .rounded-full { letter-spacing: 0.05em; }
`,
};

export function getStylePreset(designProfile: string | undefined | null): string {
  if (!designProfile) return PRESETS["minimal"];
  return PRESETS[designProfile as DesignProfile] ?? PRESETS["minimal"];
}
