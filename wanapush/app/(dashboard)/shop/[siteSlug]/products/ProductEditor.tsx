"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Card, Field, MarkdownTextarea, ValuesInput, inp } from "./_components/Primitives";

type ValueMeta = { value: string; color: string | null; imageUrl: string | null };
type Option = { name: string; values: string[]; valueMeta?: Record<string, { color: string | null; imageUrl: string | null }> };
type Variant = {
  key: string;            // clé locale pour React (combinaison values join "/")
  optionValues: Array<{ optionName: string; value: string }>;
  sku: string;
  barcode: string;
  price: number;
  compareAt: number | null;
  cost: number | null;
  weight: number | null;
  requiresShipping: boolean;
  stock: number;
  imageIndex: number | null; // index dans state.images, null = pas de photo dédiée
};

export type ProductInitial = {
  id?: string;
  title: string;
  description: string;
  excerpt: string;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  productType: "PHYSICAL" | "DIGITAL" | "SERVICE";
  vendor: string;
  featured: boolean;
  metaTitle: string;
  metaDescription: string;
  images: Array<{ url: string; alt: string }>;
  options: Option[];
  variants: Variant[];
  tags: string[];
  categoryIds: string[];
};

type Category = { id: string; name: string; slug: string; parentId: string | null };
type ShopOption = { id: string; name: string; values: ValueMeta[] };

const EMPTY: ProductInitial = {
  title: "",
  description: "",
  excerpt: "",
  status: "DRAFT",
  productType: "PHYSICAL",
  vendor: "",
  featured: false,
  metaTitle: "",
  metaDescription: "",
  images: [],
  options: [],
  variants: [
    { key: "default", optionValues: [], sku: "", barcode: "", price: 0, compareAt: null, cost: null, weight: null, requiresShipping: true, stock: 0, imageIndex: null },
  ],
  tags: [],
  categoryIds: [],
};

// Cartesian product des values des options → liste de combinaisons
function buildVariantsFromOptions(options: Option[]): Variant[] {
  // Une option sans value ni nom est ignorée (sinon le produit cartésien collapse à 0)
  const valid = options.filter((o) => o.name.trim().length > 0 && o.values.length > 0);
  if (valid.length === 0) {
    return [{ ...EMPTY.variants[0] }];
  }
  let combos: Array<Array<{ optionName: string; value: string }>> = [[]];
  for (const opt of valid) {
    const next: Array<Array<{ optionName: string; value: string }>> = [];
    for (const c of combos) {
      for (const v of opt.values) {
        next.push([...c, { optionName: opt.name, value: v }]);
      }
    }
    combos = next;
  }
  return combos.map((c) => ({
    key: c.map((x) => x.value).join(" / ") || "default",
    optionValues: c,
    sku: "",
    barcode: "",
    price: 0,
    compareAt: null,
    cost: null,
    weight: null,
    requiresShipping: true,
    stock: 0,
    imageIndex: null,
  }));
}

export function ProductEditor({
  siteSlug,
  initial,
  productId,
  currency,
}: {
  siteSlug: string;
  initial?: Partial<ProductInitial>;
  productId?: string;
  currency: string;
}) {
  const [state, setState] = useState<ProductInitial>({ ...EMPTY, ...initial });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newTag, setNewTag] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [shopOptions, setShopOptions] = useState<ShopOption[]>([]);
  const [showOptionPicker, setShowOptionPicker] = useState(false);
  const [discountModes, setDiscountModes] = useState<Record<string, "€" | "%">>({});
  const [bulkPrice, setBulkPrice] = useState<string>("");
  const [bulkDiscount, setBulkDiscount] = useState<string>("");
  const [bulkDiscountMode, setBulkDiscountMode] = useState<"€" | "%">("€");
  const [bulkStock, setBulkStock] = useState<string>("");
  const [imagePickerForVariant, setImagePickerForVariant] = useState<number | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSuccess, setAiSuccess] = useState(false);

  // Compresse une dataURL en JPEG ≤ 1024px pour passer le payload limit côté API
  async function compressDataUrl(dataUrl: string, maxSize = 1024, quality = 0.85): Promise<string> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const ratio = Math.min(1, maxSize / Math.max(img.width, img.height));
        const w = Math.round(img.width * ratio);
        const h = Math.round(img.height * ratio);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(dataUrl);
        ctx.drawImage(img, 0, 0, w, h);
        try { resolve(canvas.toDataURL("image/jpeg", quality)); }
        catch { resolve(dataUrl); }
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  }

  async function runAiGenerate() {
    if (state.images.length === 0) return;
    setAiGenerating(true);
    setAiError(null);
    setAiSuccess(false);
    try {
      const max = Math.min(state.images.length, 6);
      const compressed = await Promise.all(state.images.slice(0, max).map((img) => compressDataUrl(img.url)));
      const res = await fetch(`/api/shop/${siteSlug}/products/ai-generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          images: compressed,
          vendor: state.vendor || undefined,
          hint: state.title || state.excerpt || undefined,
        }),
      });
      const txt = await res.text();
      let data: { error?: string; title?: string; excerpt?: string; description?: string; productType?: string; metaTitle?: string; metaDescription?: string; tags?: string[]; options?: Array<{ name: string; values: string[] }> } = {};
      try { data = JSON.parse(txt); }
      catch {
        setAiError(`Réponse serveur invalide (${res.status}). ${txt.slice(0, 100)}`);
        return;
      }
      if (!res.ok) { setAiError(data?.error ?? `Erreur ${res.status}`); return; }

      // Construit les nouvelles options (sans écraser celles déjà saisies).
      // Compare via une forme normalisée (lowercase + strip accents + singulier)
      // pour éviter les doublons type "Couleur" vs "Couleurs".
      const normalize = (s: string) =>
        s.toLowerCase().trim().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/(s|x)$/, "");
      let newOptions = state.options;
      if (Array.isArray(data.options) && data.options.length > 0) {
        // Index : nom normalisé → nom canonique (priorité aux options déjà sur le produit,
        // puis aux options du catalogue boutique)
        const canonicalByNorm = new Map<string, string>();
        for (const o of shopOptions) canonicalByNorm.set(normalize(o.name), o.name);
        for (const o of state.options) canonicalByNorm.set(normalize(o.name), o.name);
        const existingNorms = new Set(state.options.map((o) => normalize(o.name)));
        for (const opt of data.options) {
          if (!opt.name || !Array.isArray(opt.values) || opt.values.length === 0) continue;
          const norm = normalize(opt.name);
          if (existingNorms.has(norm)) continue;
          const canonical = canonicalByNorm.get(norm) ?? opt.name;
          newOptions = [...newOptions, { name: canonical, values: opt.values }];
          existingNorms.add(norm);
        }
      }
      const newVariants = newOptions !== state.options ? buildVariantsFromOptions(newOptions) : state.variants;

      setState((s) => ({
        ...s,
        title: data.title || s.title,
        excerpt: data.excerpt || s.excerpt,
        description: data.description || s.description,
        productType: (data.productType as ProductInitial["productType"]) || s.productType,
        metaTitle: data.metaTitle || s.metaTitle,
        metaDescription: data.metaDescription || s.metaDescription,
        tags: Array.from(new Set([...s.tags, ...(Array.isArray(data.tags) ? data.tags.map((t: string) => t.toLowerCase()) : [])])),
        options: newOptions,
        variants: newVariants,
      }));
      setAiSuccess(true);
      setTimeout(() => setAiSuccess(false), 4000);
    } catch (e) {
      setAiError(e instanceof Error ? e.message : String(e));
    } finally {
      setAiGenerating(false);
    }
  }

  useEffect(() => {
    fetch(`/api/shop/${siteSlug}/categories`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.categories) setCategories(d.categories); })
      .catch(() => {});
    fetch(`/api/shop/${siteSlug}/options`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.options) setShopOptions(d.options); })
      .catch(() => {});
  }, [siteSlug]);

  // Ajoute une option du catalogue avec toutes ses valeurs cochées par défaut
  function addOptionFromLibrary(libOpt: ShopOption) {
    if (state.options.some((o) => o.name.toLowerCase() === libOpt.name.toLowerCase())) {
      setShowOptionPicker(false);
      return;
    }
    const valueMeta: Record<string, { color: string | null; imageUrl: string | null }> = {};
    for (const v of libOpt.values) {
      valueMeta[v.value] = { color: v.color, imageUrl: v.imageUrl };
    }
    setOptions([...state.options, {
      name: libOpt.name,
      values: libOpt.values.map((v) => v.value),
      valueMeta,
    }], true);
    setShowOptionPicker(false);
  }

  function toggleCategory(id: string) {
    setState((s) => ({
      ...s,
      categoryIds: s.categoryIds.includes(id)
        ? s.categoryIds.filter((c) => c !== id)
        : [...s.categoryIds, id],
    }));
  }

  // Quand on modifie les options, on recalcule les variantes
  function setOptions(opts: Option[], preserveExisting = true) {
    const newVariants = buildVariantsFromOptions(opts);
    if (preserveExisting) {
      // Préserve les valeurs des variantes existantes par même key
      const byKey = new Map(state.variants.map((v) => [v.key, v]));
      newVariants.forEach((nv, i) => {
        const existing = byKey.get(nv.key);
        if (existing) newVariants[i] = { ...existing, key: nv.key, optionValues: nv.optionValues };
      });
    }
    setState({ ...state, options: opts, variants: newVariants });
  }

  function addOption() {
    setOptions([...state.options, { name: "", values: [] }], false);
  }
  function updateOption(i: number, patch: Partial<Option>) {
    const next = [...state.options];
    next[i] = { ...next[i], ...patch };
    setOptions(next);
  }
  function removeOption(i: number) {
    const next = state.options.filter((_, idx) => idx !== i);
    setOptions(next, false);
  }

  function updateVariant(i: number, patch: Partial<Variant>) {
    const next = [...state.variants];
    next[i] = { ...next[i], ...patch };
    setState({ ...state, variants: next });
  }

  // ─── Helpers prix / remise ─────────────────────────────────────────────
  function variantPriceRef(v: Variant): number {
    return v.compareAt != null ? Number(v.compareAt) : Number(v.price);
  }
  function variantDiscount(v: Variant, mode: "€" | "%"): number {
    if (v.compareAt == null) return 0;
    const ref = Number(v.compareAt);
    const diff = ref - Number(v.price);
    if (diff <= 0) return 0;
    return mode === "€" ? diff : ref > 0 ? (diff / ref) * 100 : 0;
  }
  function getMode(key: string): "€" | "%" {
    return discountModes[key] ?? "€";
  }
  function setMode(key: string, mode: "€" | "%") {
    setDiscountModes((d) => ({ ...d, [key]: mode }));
  }
  function setPriceRef(i: number, newRef: number) {
    const v = state.variants[i];
    const currentDiff = v.compareAt != null ? Number(v.compareAt) - Number(v.price) : 0;
    if (currentDiff > 0) {
      updateVariant(i, { compareAt: newRef, price: Math.max(0, newRef - currentDiff) });
    } else {
      updateVariant(i, { price: newRef, compareAt: null });
    }
  }
  function setDiscount(i: number, newDisc: number, mode: "€" | "%") {
    const v = state.variants[i];
    const ref = variantPriceRef(v);
    if (!newDisc || newDisc <= 0) {
      updateVariant(i, { price: ref, compareAt: null });
      return;
    }
    const finalPrice = mode === "€"
      ? Math.max(0, ref - newDisc)
      : Math.max(0, ref * (1 - newDisc / 100));
    updateVariant(i, { compareAt: ref, price: parseFloat(finalPrice.toFixed(2)) });
  }

  // ─── Bulk : applique les valeurs par défaut à toutes les variantes ──────
  function applyBulk() {
    const p = bulkPrice ? parseFloat(bulkPrice) : null;
    const d = bulkDiscount ? parseFloat(bulkDiscount) : null;
    const s = bulkStock ? parseInt(bulkStock, 10) : null;
    if (p == null && d == null && s == null) return;
    const next = state.variants.map((v) => {
      const newV = { ...v };
      // Prix (et reset de la promo si pas de discount défini)
      if (p != null) {
        if (d != null && d > 0) {
          const finalPrice = bulkDiscountMode === "€"
            ? Math.max(0, p - d)
            : Math.max(0, p * (1 - d / 100));
          newV.compareAt = p;
          newV.price = parseFloat(finalPrice.toFixed(2));
        } else {
          newV.price = p;
          newV.compareAt = null;
        }
      } else if (d != null) {
        // Discount seul → on applique sur le prix existant comme ref
        const ref = variantPriceRef(v);
        if (d > 0 && ref > 0) {
          const finalPrice = bulkDiscountMode === "€"
            ? Math.max(0, ref - d)
            : Math.max(0, ref * (1 - d / 100));
          newV.compareAt = ref;
          newV.price = parseFloat(finalPrice.toFixed(2));
        } else {
          newV.price = ref;
          newV.compareAt = null;
        }
      }
      if (s != null) newV.stock = s;
      return newV;
    });
    setState({ ...state, variants: next });
    // Reset des champs bulk
    setBulkPrice(""); setBulkDiscount(""); setBulkStock("");
  }

  async function uploadImageFile(file: File): Promise<string | null> {
    // Upload simple en base64 pour Phase 1 (à remplacer par S3/Cloudinary plus tard)
    // On utilise une route existante ? Sinon FileReader → dataURL inline.
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  }

  async function handleImageUpload(files: FileList | null) {
    if (!files) return;
    const arr: Array<{ url: string; alt: string }> = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const dataUrl = await uploadImageFile(f);
      if (dataUrl) arr.push({ url: dataUrl, alt: f.name.replace(/\.[^.]+$/, "") });
    }
    setState({ ...state, images: [...state.images, ...arr] });
  }

  function removeImage(i: number) {
    // Décale les imageIndex des variantes qui pointaient sur cette image (ou après)
    const newVariants = state.variants.map((v) => {
      if (v.imageIndex == null) return v;
      if (v.imageIndex === i) return { ...v, imageIndex: null };
      if (v.imageIndex > i) return { ...v, imageIndex: v.imageIndex - 1 };
      return v;
    });
    setState({ ...state, images: state.images.filter((_, idx) => idx !== i), variants: newVariants });
  }

  function addTag() {
    const t = newTag.trim().toLowerCase();
    if (!t || state.tags.includes(t)) { setNewTag(""); return; }
    setState({ ...state, tags: [...state.tags, t] });
    setNewTag("");
  }
  function removeTag(t: string) {
    setState({ ...state, tags: state.tags.filter((x) => x !== t) });
  }

  async function save(asStatus?: "DRAFT" | "ACTIVE") {
    setSaving(true);
    setError(null);
    // Bloque si une option est nommée mais sans valeur → l'API les filtrerait silencieusement
    const incompleteOption = state.options.find((o) => o.name.trim().length > 0 && o.values.length === 0);
    if (incompleteOption) {
      setError(`L'option "${incompleteOption.name}" n'a aucune valeur. Tape une valeur (ex. S, M, L) puis appuie sur Entrée, ou supprime cette option.`);
      setSaving(false);
      return;
    }
    try {
      const payload = {
        title: state.title,
        description: state.description,
        excerpt: state.excerpt,
        status: asStatus ?? state.status,
        productType: state.productType,
        vendor: state.vendor || undefined,
        featured: state.featured,
        metaTitle: state.metaTitle || undefined,
        metaDescription: state.metaDescription || undefined,
        images: state.images.map((img) => ({ url: img.url, alt: img.alt })),
        options: state.options
          .filter((o) => o.name.trim().length > 0 && o.values.length > 0)
          .map((o) => ({
            name: o.name.trim(),
            values: o.values.map((val) => {
              const meta = o.valueMeta?.[val];
              return meta && (meta.color || meta.imageUrl)
                ? { value: val, color: meta.color ?? null, imageUrl: meta.imageUrl ?? null }
                : val;
            }),
          })),
        variants: state.variants.map((v) => ({
          optionValues: v.optionValues,
          sku: v.sku || null,
          barcode: v.barcode || null,
          price: Number(v.price) || 0,
          compareAt: v.compareAt == null ? null : Number(v.compareAt),
          cost: v.cost == null ? null : Number(v.cost),
          weight: v.weight == null ? null : Number(v.weight),
          requiresShipping: v.requiresShipping,
          stock: Number(v.stock) || 0,
          imageIndex: v.imageIndex,
        })),
        tags: state.tags,
        categoryIds: state.categoryIds,
      };
      const url = productId
        ? `/api/shop/${siteSlug}/products/${productId}`
        : `/api/shop/${siteSlug}/products`;
      const res = await fetch(url, {
        method: productId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) { setError(json?.error ?? "Erreur"); return; }
      // Redirige vers l'éditeur du produit créé/sauvegardé
      const id = json.product?.id ?? productId;
      if (id) window.location.href = `/shop/${siteSlug}/products/${id}`;
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  }

  const hasOptions = state.options.length > 0;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href={`/shop/${siteSlug}/products`} className="text-sm text-zinc-500 hover:text-emerald-700 inline-flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            Retour aux produits
          </Link>
          <h1 className="text-3xl font-bold tracking-tight mt-2">
            {productId ? "Modifier le produit" : "Nouveau produit"}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => save("DRAFT")}
            disabled={saving || !state.title.trim()}
            className="px-4 py-2 rounded-lg bg-zinc-100 hover:bg-zinc-200 disabled:opacity-50 text-sm font-semibold"
          >
            Brouillon
          </button>
          <button
            onClick={() => save("ACTIVE")}
            disabled={saving || !state.title.trim()}
            className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-sm font-semibold text-white"
          >
            {saving ? "Enregistrement…" : "Publier"}
          </button>
        </div>
      </header>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">⚠ {error}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonne principale */}
        <div className="lg:col-span-2 space-y-6">
          <Card title="Identité">
            <Field label="Titre du produit *">
              <input
                type="text"
                value={state.title}
                onChange={(e) => setState({ ...state, title: e.target.value })}
                placeholder="Ex: T-shirt manche courte coton bio"
                className={inp}
              />
            </Field>
            <Field label="Description complète" hint="Markdown : **gras**, *italique*, ## titre, - liste, [lien](url).">
              <MarkdownTextarea
                value={state.description}
                onChange={(v) => setState({ ...state, description: v })}
              />
            </Field>
            <Field label="Résumé court" hint="Affiché dans la fiche aperçu + meta description par défaut.">
              <input
                type="text"
                value={state.excerpt}
                onChange={(e) => setState({ ...state, excerpt: e.target.value })}
                maxLength={200}
                placeholder="Ex: 100% coton bio, certifié OEKO-TEX."
                className={inp}
              />
            </Field>
          </Card>

          <Card title="Photos" hint="Glisse-dépose ou clique pour ajouter. La première image est l'image principale.">
            <label className="flex items-center justify-center gap-2 px-4 py-6 rounded-lg border-2 border-dashed border-zinc-200 hover:border-emerald-500 hover:bg-emerald-50 cursor-pointer transition-colors">
              <input
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={(e) => handleImageUpload(e.target.files)}
              />
              <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M12 5v14M5 12h14" strokeLinecap="round" />
              </svg>
              <span className="text-sm text-zinc-500">Ajouter des images</span>
            </label>
            {state.images.length > 0 && (
              <>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mt-4">
                  {state.images.map((img, i) => (
                    <div key={i} className="relative group aspect-square rounded-lg overflow-hidden bg-zinc-100 border border-zinc-200">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.url} alt={img.alt} className="w-full h-full object-cover" />
                      {i === 0 && (
                        <div className="absolute top-1 left-1 text-[9px] uppercase tracking-widest font-bold bg-emerald-500 text-white px-1.5 py-0.5 rounded">
                          Principale
                        </div>
                      )}
                      <button
                        onClick={() => removeImage(i)}
                        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 w-6 h-6 rounded-full bg-red-500 text-white text-xs flex items-center justify-center transition-opacity"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>

                {/* Bouton IA pour générer le contenu automatiquement */}
                <div className="mt-4 rounded-xl border border-brand/30 bg-gradient-to-br from-indigo-500/10 to-purple-500/5 p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">✨</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-zinc-900 text-sm">Génération IA</div>
                      <p className="text-xs text-zinc-500 leading-relaxed">
                        L&apos;IA analyse la 1ʳᵉ photo et remplit titre, description, tags, SEO automatiquement. Tu pourras tout retoucher après.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={runAiGenerate}
                    disabled={aiGenerating}
                    className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold transition-all"
                  >
                    {aiGenerating ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M21 12a9 9 0 11-6.219-8.56" strokeLinecap="round" /></svg>
                        L&apos;IA analyse la photo… (10-20s)
                      </>
                    ) : (
                      <>✨ Générer titre + description + SEO avec l&apos;IA</>
                    )}
                  </button>
                  {aiSuccess && (
                    <div className="text-xs text-emerald-700 flex items-center gap-1.5">
                      <span>✓</span> Fiche produit générée. Vérifie et ajuste si besoin.
                    </div>
                  )}
                  {aiError && (
                    <div className="text-xs text-red-700 rounded-lg bg-red-50 border border-red-200 px-3 py-2">
                      ⚠ {aiError}
                    </div>
                  )}
                </div>
              </>
            )}
          </Card>

          <Card
            title="Prix, stock et variantes"
            hint="Sans option : un seul prix pour tout le produit. Ajoute des options (Taille, Couleur, Matière…) pour créer plusieurs variantes avec leurs propres prix et stocks."
          >
            {state.options.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-emerald-500/30 bg-emerald-50 p-5 text-center space-y-3">
                <div className="text-3xl">🎨</div>
                <div>
                  <div className="font-bold text-zinc-900 mb-1">Ce produit a plusieurs déclinaisons ?</div>
                  <p className="text-xs text-zinc-500 max-w-md mx-auto leading-relaxed">
                    Pioche une option depuis ton catalogue (Taille, Couleur…) ou crée-en une spécifique à ce produit.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {shopOptions.length > 0 && (
                    <button
                      onClick={() => setShowOptionPicker(true)}
                      type="button"
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-bold transition-colors"
                    >
                      📚 Piocher depuis le catalogue
                    </button>
                  )}
                  <button
                    onClick={addOption}
                    type="button"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 text-zinc-800 text-sm font-bold transition-colors"
                  >
                    + Option custom
                  </button>
                </div>
                {shopOptions.length === 0 && (
                  <p className="text-[10px] text-zinc-400">
                    Astuce : crée tes options réutilisables dans <a href={`/shop/${siteSlug}/options`} className="underline text-emerald-700 hover:text-emerald-200">Options & variantes</a> pour gagner du temps sur tes prochains produits.
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {state.options.map((opt, i) => (
                  <div key={i} className="rounded-lg bg-white/60 border border-zinc-200 p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="text-[10px] uppercase tracking-widest font-bold text-emerald-700 w-16">
                        Option {i + 1}
                      </div>
                      <input
                        type="text"
                        value={opt.name}
                        onChange={(e) => updateOption(i, { name: e.target.value })}
                        placeholder="Nom de l'option (ex: Taille, Couleur, Matière…)"
                        className={`${inp} flex-1`}
                      />
                      <button onClick={() => removeOption(i)} className="text-red-700 hover:text-red-700 text-xs">
                        Supprimer
                      </button>
                    </div>
                    <ValuesInput
                      values={opt.values}
                      onChange={(values) => updateOption(i, { values })}
                      suggestions={(() => {
                        if (!opt.name.trim()) return [];
                        const normalize = (s: string) =>
                          s.toLowerCase().trim().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/(s|x)$/, "");
                        const norm = normalize(opt.name);
                        const match = shopOptions.find((so) => normalize(so.name) === norm);
                        return match ? match.values.map((v) => v.value) : [];
                      })()}
                    />
                  </div>
                ))}
                {state.options.length < 3 && (
                  <div className="flex flex-wrap gap-2">
                    {shopOptions.length > 0 && (
                      <button
                        onClick={() => setShowOptionPicker(true)}
                        type="button"
                        className="flex-1 min-w-[12rem] inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-emerald-50 hover:bg-emerald-50 border border-emerald-500/40 hover:border-emerald-400 text-sm font-semibold text-emerald-200 transition-colors"
                      >
                        📚 Depuis le catalogue
                      </button>
                    )}
                    <button
                      onClick={addOption}
                      type="button"
                      className="flex-1 min-w-[12rem] inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-zinc-100/60 hover:bg-zinc-200/60 border border-zinc-200 text-sm font-semibold text-zinc-800 transition-colors"
                    >
                      + Option custom
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Picker modal pour piocher dans le catalogue */}
            {showOptionPicker && (
              <div
                onClick={() => setShowOptionPicker(false)}
                className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
              >
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="bg-zinc-50 border border-zinc-200 rounded-2xl w-full max-w-lg p-6 space-y-4"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-zinc-900">Piocher une option</h3>
                      <p className="text-xs text-zinc-500 mt-1">Sélectionne une option pour l&apos;ajouter à ce produit avec toutes ses valeurs.</p>
                    </div>
                    <button onClick={() => setShowOptionPicker(false)} className="text-zinc-500 hover:text-zinc-800 text-2xl leading-none">×</button>
                  </div>
                  <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                    {shopOptions.map((libOpt) => {
                      const alreadyAdded = state.options.some((o) => o.name.toLowerCase() === libOpt.name.toLowerCase());
                      return (
                        <button
                          key={libOpt.id}
                          onClick={() => addOptionFromLibrary(libOpt)}
                          disabled={alreadyAdded}
                          className="w-full text-left rounded-lg border border-zinc-200 hover:border-emerald-500/60 bg-white/60 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all p-3"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="font-bold text-zinc-900">{libOpt.name}</div>
                            {alreadyAdded && <span className="text-[10px] uppercase tracking-widest text-amber-800">Déjà ajoutée</span>}
                          </div>
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {libOpt.values.slice(0, 8).map((v) => (
                              <span key={v.value} className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 border border-emerald-500/30 text-emerald-200 pl-1 pr-1.5 py-0.5 rounded-full">
                                {v.imageUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={v.imageUrl} alt="" className="w-3 h-3 rounded-full object-cover" />
                                ) : v.color ? (
                                  <span className="w-3 h-3 rounded-full border border-zinc-200" style={{ backgroundColor: v.color }} />
                                ) : null}
                                {v.value}
                              </span>
                            ))}
                            {libOpt.values.length > 8 && (
                              <span className="text-[10px] text-zinc-400">+{libOpt.values.length - 8}</span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <a
                    href={`/shop/${siteSlug}/options`}
                    className="block text-center text-xs text-emerald-700 hover:text-emerald-200 underline"
                  >
                    Gérer le catalogue d&apos;options →
                  </a>
                </div>
              </div>
            )}

            {/* Bulk : applique des valeurs par défaut à toutes les variantes */}
            {hasOptions && state.variants.length > 1 && (
              <div className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-50 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-base">⚡</span>
                  <div>
                    <div className="font-bold text-zinc-900 text-sm">Tout d&apos;un coup</div>
                    <p className="text-[10px] text-zinc-500">Renseigne ici une fois — les champs remplis s&apos;appliqueront à toutes les {state.variants.length} variantes.</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 items-end">
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest text-zinc-400 font-semibold mb-1">Prix ({currency})</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={bulkPrice}
                      onChange={(e) => setBulkPrice(e.target.value)}
                      placeholder="—"
                      className={`${inp} w-full`}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest text-zinc-400 font-semibold mb-1">Remise</label>
                    <div className="inline-flex items-stretch rounded-lg border border-zinc-200 overflow-hidden w-full">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={bulkDiscount}
                        onChange={(e) => setBulkDiscount(e.target.value)}
                        placeholder="—"
                        className="flex-1 bg-white px-2 py-1.5 text-sm text-zinc-900 focus:outline-none min-w-0"
                      />
                      <div className="flex bg-zinc-50 border-l border-zinc-200">
                        <button type="button" onClick={() => setBulkDiscountMode("€")} className={`px-2 text-xs font-bold ${bulkDiscountMode === "€" ? "bg-emerald-500 text-white" : "text-zinc-500"}`}>€</button>
                        <button type="button" onClick={() => setBulkDiscountMode("%")} className={`px-2 text-xs font-bold ${bulkDiscountMode === "%" ? "bg-emerald-500 text-white" : "text-zinc-500"}`}>%</button>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest text-zinc-400 font-semibold mb-1">Stock</label>
                    <input
                      type="number"
                      min="0"
                      value={bulkStock}
                      onChange={(e) => setBulkStock(e.target.value)}
                      placeholder="—"
                      className={`${inp} w-full`}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={applyBulk}
                    disabled={!bulkPrice && !bulkDiscount && !bulkStock}
                    className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold whitespace-nowrap"
                  >
                    ↓ Appliquer aux {state.variants.length}
                  </button>
                </div>
              </div>
            )}

            {/* Helper rendu d'une ligne variante (utilisé en mode flat ET groupé) */}
            {(() => {
              const firstOptName = hasOptions ? state.options[0]?.name : undefined;
              const grouped = !!firstOptName && state.options.length >= 2;

              // Sublabel = clé moins la valeur du 1er groupe
              function sublabel(v: Variant) {
                if (!grouped) return v.key === "default" ? "Produit unique" : v.key;
                const parts = v.optionValues.filter((ov) => ov.optionName !== firstOptName).map((ov) => ov.value);
                return parts.length > 0 ? parts.join(" / ") : v.key;
              }

              const renderRow = (v: Variant, i: number) => {
                const mode = getMode(v.key);
                const ref = variantPriceRef(v);
                const disc = variantDiscount(v, mode);
                const hasPromo = v.compareAt != null && Number(v.compareAt) > Number(v.price);
                const img = v.imageIndex != null ? state.images[v.imageIndex] : null;
                return (
                  <tr key={v.key} className="border-b border-zinc-200/60 last:border-0">
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => setImagePickerForVariant(i)}
                        title={img ? "Changer la photo" : "Choisir une photo pour cette variante"}
                        className={`w-12 h-12 rounded-lg overflow-hidden border-2 transition-all flex items-center justify-center ${img ? "border-emerald-500/60 hover:border-emerald-400" : "border-dashed border-zinc-200 hover:border-emerald-500/60 text-zinc-400 hover:text-emerald-700"}`}
                      >
                        {img ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={img.url} alt={img.alt} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-lg">+</span>
                        )}
                      </button>
                    </td>
                    <td className="px-3 py-2 font-semibold text-zinc-900">{sublabel(v)}</td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        step="0.01"
                        value={ref || ""}
                        onChange={(e) => setPriceRef(i, parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        className={`${inp} w-24`}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <div className="inline-flex items-stretch rounded-lg border border-zinc-200 overflow-hidden">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={disc > 0 ? Number(disc.toFixed(2)) : ""}
                          onChange={(e) => setDiscount(i, parseFloat(e.target.value) || 0, mode)}
                          placeholder="0"
                          className="bg-white w-16 px-2 py-1.5 text-sm text-zinc-900 focus:outline-none"
                        />
                        <div className="flex bg-zinc-50 border-l border-zinc-200">
                          <button type="button" onClick={() => setMode(v.key, "€")} className={`px-2 text-xs font-bold ${mode === "€" ? "bg-emerald-500 text-white" : "text-zinc-500 hover:text-zinc-800"}`}>€</button>
                          <button type="button" onClick={() => setMode(v.key, "%")} className={`px-2 text-xs font-bold ${mode === "%" ? "bg-emerald-500 text-white" : "text-zinc-500 hover:text-zinc-800"}`}>%</button>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className={`font-mono font-semibold ${hasPromo ? "text-emerald-700" : "text-zinc-400"}`}>
                        {Number(v.price).toFixed(2)}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        value={v.stock}
                        onChange={(e) => updateVariant(i, { stock: parseInt(e.target.value, 10) || 0 })}
                        className={`${inp} w-20`}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={v.sku}
                        onChange={(e) => updateVariant(i, { sku: e.target.value })}
                        placeholder="—"
                        className={`${inp} w-32`}
                      />
                    </td>
                  </tr>
                );
              };

              const tableHeader = (
                <thead className="bg-white/80 border-b border-zinc-200">
                  <tr className="text-left text-xs uppercase tracking-widest text-zinc-400">
                    <th className="px-3 py-2 font-semibold">Photo</th>
                    <th className="px-3 py-2 font-semibold">{hasOptions ? "Variante" : "Produit"}</th>
                    <th className="px-3 py-2 font-semibold">Prix ({currency})</th>
                    <th className="px-3 py-2 font-semibold">Remise</th>
                    <th className="px-3 py-2 font-semibold">Prix promo</th>
                    <th className="px-3 py-2 font-semibold">Stock</th>
                    <th className="px-3 py-2 font-semibold">SKU</th>
                  </tr>
                </thead>
              );

              if (!grouped) {
                return (
                  <div className="mt-6 rounded-lg border border-zinc-200 overflow-hidden">
                    <table className="w-full text-sm">
                      {tableHeader}
                      <tbody>
                        {state.variants.map((v, i) => renderRow(v, i))}
                      </tbody>
                    </table>
                  </div>
                );
              }

              // Mode groupé : index → group
              const groups = new Map<string, number[]>();
              state.variants.forEach((v, i) => {
                const firstVal = v.optionValues.find((ov) => ov.optionName === firstOptName)?.value ?? "—";
                if (!groups.has(firstVal)) groups.set(firstVal, []);
                groups.get(firstVal)!.push(i);
              });

              return (
                <div className="mt-6 space-y-3">
                  {Array.from(groups.entries()).map(([groupName, indices]) => {
                    const collapsed = collapsedGroups[groupName] ?? false;
                    // Aperçu si replié : nb variantes + range stocks
                    const stocks = indices.map((idx) => state.variants[idx].stock);
                    const totalStock = stocks.reduce((s, n) => s + n, 0);
                    return (
                      <div key={groupName} className="rounded-lg border border-zinc-200 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setCollapsedGroups((g) => ({ ...g, [groupName]: !collapsed }))}
                          className="w-full flex items-center justify-between px-4 py-3 bg-white/80 hover:bg-zinc-50 transition-colors text-left"
                        >
                          <div className="flex items-center gap-3">
                            <svg className={`w-4 h-4 text-zinc-500 transition-transform ${collapsed ? "" : "rotate-90"}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            <div>
                              <div className="font-bold text-zinc-900">
                                <span className="text-[10px] uppercase tracking-widest text-emerald-700 font-semibold mr-2">{firstOptName}</span>
                                {groupName}
                              </div>
                              <div className="text-xs text-zinc-400">
                                {indices.length} variante{indices.length > 1 ? "s" : ""} · stock total {totalStock}
                              </div>
                            </div>
                          </div>
                        </button>
                        {!collapsed && (
                          <table className="w-full text-sm">
                            {tableHeader}
                            <tbody>
                              {indices.map((i) => renderRow(state.variants[i], i))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {/* Modal picker photo par variante */}
            {imagePickerForVariant != null && (
              <div
                onClick={() => setImagePickerForVariant(null)}
                className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
              >
                <div onClick={(e) => e.stopPropagation()} className="bg-zinc-50 border border-zinc-200 rounded-2xl w-full max-w-2xl p-6 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-zinc-900">Photo pour cette variante</h3>
                      <p className="text-xs text-zinc-500 mt-1">Sélectionne une image du produit. Elle remplacera la photo principale quand le client choisira cette variante.</p>
                    </div>
                    <button onClick={() => setImagePickerForVariant(null)} className="text-zinc-500 hover:text-zinc-800 text-2xl leading-none">×</button>
                  </div>

                  {state.images.length === 0 ? (
                    <div className="text-center py-10 text-zinc-400 text-sm">
                      Aucune image dans ce produit. Ajoute d&apos;abord des images dans la section &laquo; Images &raquo; ci-dessus.
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-[50vh] overflow-y-auto">
                        <button
                          type="button"
                          onClick={() => { updateVariant(imagePickerForVariant!, { imageIndex: null }); setImagePickerForVariant(null); }}
                          className="aspect-square rounded-lg border-2 border-dashed border-zinc-200 hover:border-emerald-500 flex flex-col items-center justify-center gap-1 text-zinc-400 hover:text-emerald-700 transition-colors"
                        >
                          <span className="text-2xl">∅</span>
                          <span className="text-[10px] uppercase tracking-widest">Aucune</span>
                        </button>
                        {state.images.map((img, idx) => {
                          const current = state.variants[imagePickerForVariant!]?.imageIndex === idx;
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => { updateVariant(imagePickerForVariant!, { imageIndex: idx }); setImagePickerForVariant(null); }}
                              className={`aspect-square rounded-lg overflow-hidden border-2 transition-all relative ${current ? "border-emerald-500 ring-2 ring-offset-2 ring-emerald-500 ring-offset-slate-900" : "border-zinc-200 hover:border-emerald-500/60"}`}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={img.url} alt={img.alt} className="w-full h-full object-cover" />
                              {idx === 0 && (
                                <span className="absolute top-1 left-1 text-[9px] uppercase tracking-widest font-bold bg-emerald-500 text-white px-1.5 py-0.5 rounded">Principale</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

          </Card>

          <Card title="SEO" hint="Optimise l'affichage dans Google. Laisse vide pour utiliser le titre du produit.">
            <Field label="Meta title">
              <input
                type="text"
                value={state.metaTitle}
                onChange={(e) => setState({ ...state, metaTitle: e.target.value })}
                maxLength={70}
                className={inp}
              />
            </Field>
            <Field label="Meta description">
              <textarea
                value={state.metaDescription}
                onChange={(e) => setState({ ...state, metaDescription: e.target.value })}
                rows={3}
                maxLength={160}
                className={`${inp} resize-y min-h-[80px]`}
              />
            </Field>
          </Card>
        </div>

        {/* Colonne side */}
        <div className="space-y-6">
          <Card title="Statut">
            <Field label="État">
              <select
                value={state.status}
                onChange={(e) => setState({ ...state, status: e.target.value as ProductInitial["status"] })}
                className={inp}
              >
                <option value="DRAFT">Brouillon (non visible)</option>
                <option value="ACTIVE">Actif (en ligne)</option>
                <option value="ARCHIVED">Archivé</option>
              </select>
            </Field>
            <label className="flex items-center gap-3 mt-3 cursor-pointer">
              <input
                type="checkbox"
                checked={state.featured}
                onChange={(e) => setState({ ...state, featured: e.target.checked })}
                className="w-4 h-4 accent-emerald-500"
              />
              <span className="text-sm text-zinc-700">Mettre en avant (featured)</span>
            </label>
          </Card>

          <Card title="Type & vendeur">
            <Field label="Type">
              <select
                value={state.productType}
                onChange={(e) => setState({ ...state, productType: e.target.value as ProductInitial["productType"] })}
                className={inp}
              >
                <option value="PHYSICAL">Physique (livré)</option>
                <option value="DIGITAL">Numérique (téléchargement)</option>
                <option value="SERVICE">Service / réservation</option>
              </select>
            </Field>
            <Field label="Vendeur / marque">
              <input
                type="text"
                value={state.vendor}
                onChange={(e) => setState({ ...state, vendor: e.target.value })}
                className={inp}
              />
            </Field>
          </Card>

          <Card title="Catégories" hint="Coche les catégories dans lesquelles classer ce produit.">
            {categories.length === 0 ? (
              <div className="text-xs text-zinc-400 leading-relaxed">
                Aucune catégorie pour le moment.{" "}
                <Link href={`/shop/${siteSlug}/categories`} className="text-emerald-700 hover:text-emerald-200 underline">
                  Crée ta première catégorie →
                </Link>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                {categories.map((c) => {
                  const checked = state.categoryIds.includes(c.id);
                  const depth = c.parentId ? 1 : 0;
                  return (
                    <label
                      key={c.id}
                      className={`flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-zinc-100/40 cursor-pointer text-sm ${
                        checked ? "bg-emerald-50" : ""
                      }`}
                      style={{ paddingLeft: `${0.5 + depth * 1}rem` }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleCategory(c.id)}
                        className="w-4 h-4 accent-emerald-500"
                      />
                      <span className="text-zinc-800">{c.name}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </Card>

          <Card title="Tags" hint="Pour filtrer et grouper. Tapez puis Entrée.">
            <div className="flex flex-wrap gap-1.5 mb-3">
              {state.tags.map((t) => (
                <span key={t} className="inline-flex items-center gap-1 text-xs bg-zinc-100 px-2 py-1 rounded-full text-zinc-700">
                  {t}
                  <button onClick={() => removeTag(t)} className="text-zinc-400 hover:text-red-700">×</button>
                </span>
              ))}
            </div>
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
              placeholder="Ajouter un tag"
              className={inp}
            />
          </Card>
        </div>
      </div>
    </div>
  );
}

