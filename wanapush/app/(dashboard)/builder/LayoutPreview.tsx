// Aperçu visuel du layout assemblé.
// Empile les mini-mockups (header + sections) dans l'ordre choisi, teintés avec le
// thème et les couleurs sélectionnés par l'utilisateur. Pas un rendu complet du
// site (besoin de contenu IA pour ça), mais une silhouette qui montre l'allure
// générale du site avant génération.

import SectionThumb from "./SectionThumb";

type Props = {
  headerId: string;
  sectionIds: string[];
  theme: "light" | "dark";
  primaryColor: string;
  secondaryColor: string;
  colorMode?: "gradient" | "bicolor" | "mono";
  brandName?: string;
  /** Callback déclenché au clic sur un thumbnail du preview pour ouvrir l'éditeur */
  onEditHeader?: () => void;
  onEditSection?: (index: number) => void;
};

export default function LayoutPreview({
  headerId,
  sectionIds,
  theme,
  primaryColor,
  secondaryColor,
  colorMode,
  brandName,
  onEditHeader,
  onEditSection,
}: Props) {
  const isDark = theme === "dark";
  const pageBg = isDark ? "bg-zinc-50" : "bg-white";
  const navBg = isDark ? "bg-white/95 border-zinc-200" : "bg-white border-slate-200";
  const navText = isDark ? "text-zinc-900" : "text-slate-900";

  return (
    <div className="relative">
      {/* Faux bordure "fenêtre navigateur" pour donner le feeling site web */}
      <div className={`rounded-xl overflow-hidden shadow-2xl border ${isDark ? "border-zinc-200" : "border-slate-200"} ${pageBg}`}>
        {/* Barre browser fake */}
        <div className={`flex items-center gap-2 px-3 py-2 border-b ${isDark ? "border-zinc-200 bg-white" : "border-slate-200 bg-slate-50"}`}>
          <span className="w-2.5 h-2.5 rounded-full bg-red-400/70" />
          <span className="w-2.5 h-2.5 rounded-full bg-yellow-400/70" />
          <span className="w-2.5 h-2.5 rounded-full bg-green-400/70" />
          <span className={`ml-3 text-[10px] font-mono ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
            {brandName ? `${brandName.toLowerCase().replace(/[^a-z0-9]/g, "")}.com` : "preview.local"}
          </span>
        </div>

        {/* Faux nav du site */}
        <div className={`flex items-center justify-between px-4 py-2.5 border-b ${navBg}`}>
          <div className={`font-bold text-xs ${navText}`}>{brandName || "Ta marque"}</div>
          <div className="flex gap-3">
            <span className={`text-[10px] ${navText} opacity-70`}>Accueil</span>
            <span className="text-[10px]" style={{ color: primaryColor }}>•</span>
          </div>
        </div>

        {/* Header thumbnail (section 1 = #fff en mode light) — cliquable */}
        <button
          type="button"
          onClick={onEditHeader}
          className="block w-full text-left group relative cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand/40"
          style={isDark ? undefined : { backgroundColor: "#ffffff" }}
          title="Cliquer pour éditer le header"
        >
          <SectionThumb
            id={headerId}
            theme={theme}
            primaryColor={primaryColor}
            secondaryColor={secondaryColor}
            colorMode={colorMode}
            className="rounded-none"
          />
          <span className="absolute inset-0 ring-2 ring-brand/0 group-hover:ring-brand/50 transition-all pointer-events-none" />
          <span className="absolute top-1 right-1 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-brand text-white rounded opacity-0 group-hover:opacity-100 transition-opacity">
            ✎ Éditer
          </span>
        </button>

        {/* Sections empilées — alternance #fff/#f2f2f2 en mode light, chaque thumb cliquable */}
        <div>
          {sectionIds.map((id, i) => {
            const isGray = !isDark && i % 2 === 1;
            return (
              <button
                type="button"
                key={`${id}-${i}`}
                onClick={() => onEditSection?.(i)}
                className="block w-full text-left group relative cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand/40"
                style={isDark ? undefined : { backgroundColor: isGray ? "#f2f2f2" : "#ffffff" }}
                title="Cliquer pour éditer cette section"
              >
                <SectionThumb
                  id={id}
                  theme={theme}
                  primaryColor={primaryColor}
                  secondaryColor={secondaryColor}
                  colorMode={colorMode}
                  className="rounded-none"
                />
                <span className="absolute inset-0 ring-2 ring-brand/0 group-hover:ring-brand/50 transition-all pointer-events-none" />
                <span className="absolute top-1 right-1 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-brand text-white rounded opacity-0 group-hover:opacity-100 transition-opacity">
                  ✎ Éditer
                </span>
              </button>
            );
          })}
        </div>

        {/* Faux footer */}
        <div className={`px-4 py-3 ${isDark ? "bg-white" : "bg-zinc-50"} flex items-center justify-between`}>
          <span className="text-[10px] text-zinc-500">© {brandName || "Ta marque"}</span>
          <div className="flex gap-1.5">
            <span className="w-4 h-4 rounded-full bg-zinc-200" />
            <span className="w-4 h-4 rounded-full bg-zinc-200" />
            <span className="w-4 h-4 rounded-full bg-zinc-200" />
          </div>
        </div>
      </div>

      <p className="mt-2 text-[10px] text-zinc-400 text-center italic">
        Aperçu schématique — le rendu final aura tes textes et images réels.
      </p>
    </div>
  );
}
