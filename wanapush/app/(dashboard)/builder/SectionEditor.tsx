"use client";

// Panneau d'édition d'une section : titres, sous-titres, CTA, items, image, couleurs.
// Apparait quand l'utilisateur clique sur un thumbnail dans la liste des sections.
// Les valeurs entrées par l'utilisateur sont prioritaires sur ce que l'IA va générer.

import { useState } from "react";

export type SectionData = {
  title?: string;
  subtitle?: string;
  eyebrow?: string;
  badge?: string;
  ctaText?: string;
  ctaHref?: string;
  buttonText?: string;
  buttonHref?: string;
  imageUrl?: string;
  imageKeywords?: string;
  items?: Array<Record<string, string | undefined>>;
  blocks?: Array<Record<string, string | undefined>>;
  logos?: Array<{ name: string }>;
  email?: string;
  phone?: string;
  address?: string;
  /** Override couleur primaire spécifique à cette section (optionnel) */
  primaryColor?: string;
  /** Override couleur secondaire spécifique à cette section (optionnel) */
  secondaryColor?: string;
};

type Props = {
  /** Type de la section (id du registry) */
  sectionType: string;
  /** Label humain (ex "Hero classique") */
  sectionLabel: string;
  /** Index de la section dans la composition (pour l'ordre) */
  index: number;
  /** Données actuelles */
  data: SectionData;
  /** Callback de mise à jour */
  onChange: (data: SectionData) => void;
  /** Callback de fermeture */
  onClose: () => void;
};

export default function SectionEditor({ sectionType, sectionLabel, index, data, onChange, onClose }: Props) {
  const update = <K extends keyof SectionData>(key: K, value: SectionData[K]) => {
    onChange({ ...data, [key]: value });
  };

  // Catégorisation pour afficher les bons champs
  const isHero = ["hero", "hero_split", "hero_slider", "hero_blob"].includes(sectionType);
  const isCta = sectionType === "cta";
  const isContact = sectionType === "contact";
  const isLogosBar = sectionType === "logos_bar";
  const hasItems = ["features", "service_tiles", "highlights", "circles", "services_grid", "features_phone", "actions_grid", "process", "process_vertical", "stats", "testimonials"].includes(sectionType);
  const hasBlocks = sectionType === "feature_split";
  const hasImage = ["hero", "hero_split", "hero_blob", "about", "about_cards", "promo_split", "actions_grid", "video"].includes(sectionType);

  return (
    <div className="fixed inset-0 z-50 bg-white/80 backdrop-blur-sm flex items-start justify-center p-6 overflow-y-auto">
      <div className="bg-zinc-50 border border-zinc-200 rounded-xl w-full max-w-2xl my-8 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-200">
          <div>
            <div className="text-xs text-zinc-400 uppercase tracking-wider font-semibold">
              Section {index + 1}
            </div>
            <h2 className="text-xl font-bold text-white">{sectionLabel}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-500 hover:text-white text-2xl leading-none w-8 h-8 flex items-center justify-center rounded hover:bg-zinc-100"
            aria-label="Fermer"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Eyebrow / Badge (pour heroes) */}
          {(isHero || sectionType === "feature_split") && (
            <FieldText
              label={sectionType === "hero_split" ? "Badge" : "Eyebrow (suréléva)"}
              value={(data.badge ?? data.eyebrow) ?? ""}
              placeholder="NOUVEAU"
              onChange={(v) => update(sectionType === "hero_split" ? "badge" : "eyebrow", v)}
              hint="Petit label en majuscules au-dessus du titre. Laisse vide pour omettre."
            />
          )}

          {/* Titre */}
          <FieldText
            label="Titre"
            value={data.title ?? ""}
            placeholder="Ton titre principal"
            onChange={(v) => update("title", v)}
            hint={isHero ? "5-9 mots max pour rester lisible sur le hero." : undefined}
          />

          {/* Sous-titre */}
          {!isLogosBar && (
            <FieldTextarea
              label="Sous-titre / Description"
              value={data.subtitle ?? ""}
              placeholder="Phrase descriptive…"
              rows={2}
              onChange={(v) => update("subtitle", v)}
            />
          )}

          {/* CTA (boutons) */}
          {(isHero || isCta) && (
            <>
              <FieldText
                label={isCta ? "Texte du bouton" : "Texte du CTA"}
                value={isCta ? (data.buttonText ?? "") : (data.ctaText ?? "")}
                placeholder="Commencer"
                onChange={(v) => update(isCta ? "buttonText" : "ctaText", v)}
              />
              <FieldText
                label="Lien du bouton"
                value={isCta ? (data.buttonHref ?? "") : (data.ctaHref ?? "")}
                placeholder="#contact"
                onChange={(v) => update(isCta ? "buttonHref" : "ctaHref", v)}
              />
            </>
          )}

          {/* Image (URL ou upload via URL) */}
          {hasImage && (
            <>
              <FieldText
                label="URL de l'image (laisse vide pour Unsplash auto)"
                value={data.imageUrl ?? ""}
                placeholder="https://exemple.com/photo.jpg"
                onChange={(v) => update("imageUrl", v)}
              />
              <FieldText
                label="Mots-clés Unsplash (anglais, si pas d'URL)"
                value={data.imageKeywords ?? ""}
                placeholder="modern workspace, plant care"
                onChange={(v) => update("imageKeywords", v)}
                hint="3-5 mots en anglais. Servent à l'IA pour trouver une image Unsplash pertinente."
              />
            </>
          )}

          {/* Items array (features, services, highlights, etc.) */}
          {hasItems && <ItemsEditor data={data} onChange={onChange} sectionType={sectionType} />}

          {/* Blocks (feature_split) */}
          {hasBlocks && <BlocksEditor data={data} onChange={onChange} />}

          {/* Logos (logos_bar) */}
          {isLogosBar && <LogosEditor data={data} onChange={onChange} />}

          {/* Contact info */}
          {isContact && (
            <>
              <FieldText label="Email" value={data.email ?? ""} placeholder="contact@marque.com" onChange={(v) => update("email", v)} />
              <FieldText label="Téléphone" value={data.phone ?? ""} placeholder="+33 6 12 34 56 78" onChange={(v) => update("phone", v)} />
              <FieldText label="Adresse" value={data.address ?? ""} placeholder="Ville, pays" onChange={(v) => update("address", v)} />
            </>
          )}

          {/* Override couleurs section */}
          <details className="border border-zinc-200 rounded-lg p-3">
            <summary className="text-xs font-semibold text-zinc-700 cursor-pointer select-none">
              Couleurs spécifiques à cette section (optionnel)
            </summary>
            <div className="mt-3 space-y-3">
              <FieldColor
                label="Couleur primaire"
                value={data.primaryColor ?? ""}
                onChange={(v) => update("primaryColor", v)}
              />
              <FieldColor
                label="Couleur secondaire"
                value={data.secondaryColor ?? ""}
                onChange={(v) => update("secondaryColor", v)}
              />
            </div>
          </details>

          <div className="text-[11px] text-zinc-400 italic pt-2 border-t border-zinc-200">
            Les champs laissés vides seront remplis automatiquement par l&apos;IA au moment de la génération.
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 border-t border-zinc-200 bg-white/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-zinc-700 hover:text-white rounded-lg hover:bg-zinc-100"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────

function FieldText({
  label, value, placeholder, hint, onChange,
}: { label: string; value: string; placeholder?: string; hint?: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-zinc-700 mb-1.5">{label}</span>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white/60 border border-zinc-200 rounded-lg text-zinc-900 text-sm px-3 py-2 focus:outline-none focus:border-brand"
      />
      {hint && <span className="block text-[11px] text-zinc-400 mt-1">{hint}</span>}
    </label>
  );
}

function FieldTextarea({
  label, value, placeholder, rows = 3, onChange,
}: { label: string; value: string; placeholder?: string; rows?: number; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-zinc-700 mb-1.5">{label}</span>
      <textarea
        value={value}
        placeholder={placeholder}
        rows={rows}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white/60 border border-zinc-200 rounded-lg text-zinc-900 text-sm px-3 py-2 focus:outline-none focus:border-brand resize-y"
      />
    </label>
  );
}

function FieldColor({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-zinc-700 mb-1.5">{label}</span>
      <div className="flex gap-2 items-center">
        <input
          type="color"
          value={value || "#6366f1"}
          onChange={(e) => onChange(e.target.value)}
          className="w-10 h-8 rounded border border-zinc-200 cursor-pointer bg-transparent"
        />
        <input
          value={value}
          placeholder="(vide = utilise la couleur globale)"
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 bg-white/60 border border-zinc-200 rounded-lg text-zinc-900 text-xs font-mono px-3 py-2"
        />
      </div>
    </label>
  );
}

// ─── Items editor (array de {title, desc, imageKeywords}) ────────────

function ItemsEditor({
  data, onChange, sectionType,
}: { data: SectionData; onChange: (d: SectionData) => void; sectionType: string }) {
  const items = data.items ?? [];
  const isStats = sectionType === "stats";
  const isProcess = sectionType === "process" || sectionType === "process_vertical";
  const isTestimonials = sectionType === "testimonials";

  const addItem = () => {
    onChange({ ...data, items: [...items, {}] });
  };
  const updateItem = (idx: number, key: string, value: string) => {
    const next = items.map((it, i) => (i === idx ? { ...it, [key]: value } : it));
    onChange({ ...data, items: next });
  };
  const removeItem = (idx: number) => {
    onChange({ ...data, items: items.filter((_, i) => i !== idx) });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-zinc-700">
          {isStats ? "Statistiques" : isProcess ? "Étapes" : isTestimonials ? "Témoignages" : "Items"}
        </span>
        <button
          type="button"
          onClick={addItem}
          className="text-xs bg-brand hover:bg-brand-600 text-white px-2.5 py-1 rounded"
        >
          + Ajouter
        </button>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-zinc-400 italic">Aucun item — l&apos;IA en générera. Clique &quot;+ Ajouter&quot; pour les définir toi-même.</p>
      ) : (
        <div className="space-y-3">
          {items.map((it, i) => (
            <div key={i} className="p-3 bg-white/60 border border-zinc-200 rounded-lg space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-zinc-400 font-mono">#{i + 1}</span>
                <button
                  type="button"
                  onClick={() => removeItem(i)}
                  className="text-red-700 hover:text-red-700 text-sm"
                  aria-label="Retirer"
                >
                  ×
                </button>
              </div>
              {isStats ? (
                <>
                  <FieldText label="Valeur" value={String(it.value ?? "")} placeholder="12+" onChange={(v) => updateItem(i, "value", v)} />
                  <FieldText label="Label" value={String(it.label ?? "")} placeholder="années d'expérience" onChange={(v) => updateItem(i, "label", v)} />
                </>
              ) : isTestimonials ? (
                <>
                  <FieldText label="Nom" value={String(it.name ?? it.author ?? "")} placeholder="Marie L." onChange={(v) => updateItem(i, "name", v)} />
                  <FieldText label="Rôle" value={String(it.role ?? "")} placeholder="Cliente" onChange={(v) => updateItem(i, "role", v)} />
                  <FieldTextarea label="Texte" value={String(it.text ?? it.quote ?? "")} rows={2} onChange={(v) => updateItem(i, "text", v)} />
                </>
              ) : (
                <>
                  <FieldText label="Titre" value={String(it.title ?? "")} onChange={(v) => updateItem(i, "title", v)} />
                  <FieldTextarea label="Description" value={String(it.desc ?? it.description ?? "")} rows={2} onChange={(v) => updateItem(i, "desc", v)} />
                  <FieldText label="Mots-clés image (anglais, optionnel)" value={String(it.imageKeywords ?? "")} placeholder="modern office" onChange={(v) => updateItem(i, "imageKeywords", v)} />
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Blocks editor (feature_split) ───────────────────────────────────

function BlocksEditor({ data, onChange }: { data: SectionData; onChange: (d: SectionData) => void }) {
  const blocks = data.blocks ?? [];
  const addBlock = () => onChange({ ...data, blocks: [...blocks, {}] });
  const updateBlock = (idx: number, key: string, value: string) => {
    const next = blocks.map((b, i) => (i === idx ? { ...b, [key]: value } : b));
    onChange({ ...data, blocks: next });
  };
  const removeBlock = (idx: number) => {
    onChange({ ...data, blocks: blocks.filter((_, i) => i !== idx) });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-zinc-700">Blocs (texte + mockup alternés)</span>
        <button
          type="button"
          onClick={addBlock}
          className="text-xs bg-brand hover:bg-brand-600 text-white px-2.5 py-1 rounded"
        >
          + Ajouter
        </button>
      </div>
      {blocks.length === 0 ? (
        <p className="text-xs text-zinc-400 italic">Aucun bloc — l&apos;IA en générera 2-3.</p>
      ) : (
        <div className="space-y-3">
          {blocks.map((b, i) => (
            <div key={i} className="p-3 bg-white/60 border border-zinc-200 rounded-lg space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-zinc-400 font-mono">Bloc #{i + 1}</span>
                <button type="button" onClick={() => removeBlock(i)} className="text-red-700 hover:text-red-700 text-sm">×</button>
              </div>
              <FieldText label="Eyebrow" value={String(b.eyebrow ?? "")} onChange={(v) => updateBlock(i, "eyebrow", v)} />
              <FieldText label="Titre" value={String(b.title ?? "")} onChange={(v) => updateBlock(i, "title", v)} />
              <FieldTextarea label="Description" value={String(b.description ?? "")} rows={2} onChange={(v) => updateBlock(i, "description", v)} />
              <FieldText label="Mots-clés image" value={String(b.imageKeywords ?? "")} onChange={(v) => updateBlock(i, "imageKeywords", v)} />
              <FieldTextarea label="Code snippet (optionnel)" value={String(b.codeSnippet ?? "")} rows={3} onChange={(v) => updateBlock(i, "codeSnippet", v)} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Logos editor ───────────────────────────────────────────────────

function LogosEditor({ data, onChange }: { data: SectionData; onChange: (d: SectionData) => void }) {
  const logos = data.logos ?? [];
  const [draft, setDraft] = useState("");
  const addLogo = () => {
    if (!draft.trim()) return;
    onChange({ ...data, logos: [...logos, { name: draft.trim() }] });
    setDraft("");
  };
  const removeLogo = (i: number) => onChange({ ...data, logos: logos.filter((_, j) => j !== i) });

  return (
    <div>
      <span className="block text-xs font-semibold text-zinc-700 mb-2">Logos / partenaires</span>
      <div className="flex gap-2 mb-2">
        <input
          value={draft}
          placeholder="Nom de marque"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addLogo(); } }}
          className="flex-1 bg-white/60 border border-zinc-200 rounded-lg text-zinc-900 text-sm px-3 py-2"
        />
        <button type="button" onClick={addLogo} className="text-xs bg-brand hover:bg-brand-600 text-white px-3 py-2 rounded">+</button>
      </div>
      {logos.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {logos.map((l, i) => (
            <span key={i} className="inline-flex items-center gap-1.5 bg-zinc-100 text-zinc-800 text-xs px-2 py-1 rounded">
              {l.name}
              <button type="button" onClick={() => removeLogo(i)} className="text-zinc-500 hover:text-red-700">×</button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
