// Templates HTML d'insertion pour chaque type de section du catalogue.
// Quand l'utilisateur choisit un layout dans le picker WYSIWYG, ce template
// est inséré dans le DOM (et persisté comme mutation). Les data-edit-section/
// data-edit-field permettent l'édition ensuite via le crayon.
//
// Style :
//   - Classes Tailwind COURANTES (text-*, py-*, max-w-*, grid, flex, etc.)
//     présentes dans n'importe quel site généré.
//   - Pour les accents primaire/secondaire, on utilise var(--color-primary)
//     en style inline, indépendant du purge Tailwind.
//   - Texte neutre (titres "Nouveau …") → l'utilisateur édite via le popup.

function uid(): string {
  return Math.random().toString(36).slice(2, 8);
}

function placeholder(id: string, label: string): string {
  const u = uid();
  return `<section data-edit-section="${id}_${u}" class="py-16 px-4 bg-gray-50 border-2 border-dashed border-gray-300">
  <div class="max-w-4xl mx-auto text-center">
    <div class="text-xs uppercase tracking-widest text-gray-400 mb-2">Section ${label}</div>
    <h2 data-edit-field="title" class="text-2xl md:text-3xl font-bold mb-3">Nouveau bloc « ${label} »</h2>
    <p data-edit-field="subtitle" class="text-gray-600 mb-6">Édite ce bloc via l’icône crayon. Pour un rendu complet, régénère le site avec ce layout dans la composition.</p>
  </div>
</section>`;
}

/**
 * HTML d'un layout à insérer dans le DOM. Retourne une string complète d'un
 * <section data-edit-section="..."> isolée.
 */
export function sectionInsertHtml(id: string): string {
  const u = uid();
  switch (id) {
    case "hero":
    case "hero_split":
    case "hero_blob":
      return `<section data-edit-section="${id}_${u}" class="py-20 md:py-28 px-4 text-center" style="background:linear-gradient(135deg, var(--color-primary, #6366f1), var(--color-secondary, #ec4899)); color:white;">
  <div class="max-w-3xl mx-auto">
    <div data-edit-field="eyebrow" class="inline-block text-xs uppercase tracking-widest mb-4" style="opacity:0.8;">— Bienvenue</div>
    <h1 data-edit-field="title" class="text-4xl md:text-6xl font-extrabold mb-5 leading-tight">Un titre qui accroche</h1>
    <p data-edit-field="subtitle" class="text-lg md:text-xl mb-8 max-w-2xl mx-auto" style="opacity:0.9;">Sous-titre clair et percutant qui explique ta proposition de valeur.</p>
    <div class="flex flex-wrap gap-3 justify-center">
      <a data-edit-field="ctaText" href="#contact" class="inline-block px-7 py-3 rounded-full font-semibold" style="background:white; color:var(--color-primary, #6366f1);">Commencer</a>
      <a data-edit-field="ctaSecondaryText" href="#about" class="inline-block px-7 py-3 rounded-full font-semibold border-2 border-white">En savoir plus</a>
    </div>
  </div>
</section>`;

    case "hero_slider":
      return `<section data-edit-section="HeroSlider_${u}" class="py-24 md:py-32 px-4 text-center" style="background:linear-gradient(135deg, var(--color-primary, #6366f1), var(--color-secondary, #ec4899)); color:white;">
  <div class="max-w-3xl mx-auto">
    <h1 data-edit-field="slides.0.title" class="text-4xl md:text-6xl font-extrabold mb-5">Slide 1</h1>
    <p data-edit-field="slides.0.subtitle" class="text-lg mb-8" style="opacity:0.9;">Description du slide</p>
    <a data-edit-field="slides.0.ctaText" href="#contact" class="inline-block px-7 py-3 rounded-full font-semibold" style="background:white; color:var(--color-primary, #6366f1);">Découvrir</a>
  </div>
</section>`;

    case "features":
      return `<section data-edit-section="Features_${u}" class="py-16 md:py-20 px-4">
  <div class="max-w-6xl mx-auto">
    <div class="text-center mb-12 max-w-2xl mx-auto">
      <h2 data-edit-field="title" class="text-3xl md:text-4xl font-bold mb-3">Nos atouts</h2>
      <p data-edit-field="subtitle" class="text-gray-600">Ce qui nous distingue.</p>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      ${[0,1,2,3,4,5].map(i => `<div class="p-6 rounded-2xl border border-gray-200 bg-white">
        <div class="w-12 h-12 rounded-xl mb-4 flex items-center justify-center text-white text-xl" style="background:var(--color-primary, #6366f1);">★</div>
        <h3 data-edit-field="items.${i}.title" class="font-bold text-lg mb-2">Atout ${i+1}</h3>
        <p data-edit-field="items.${i}.description" class="text-gray-600 text-sm leading-relaxed">Bénéfice clair qui parle au client.</p>
      </div>`).join("")}
    </div>
  </div>
</section>`;

    case "service_tiles":
      return `<section data-edit-section="ServiceTiles_${u}" class="py-16 md:py-20 px-4 bg-white">
  <div class="max-w-7xl mx-auto">
    <div class="text-center mb-10 max-w-2xl mx-auto">
      <h2 data-edit-field="title" class="text-3xl md:text-4xl font-bold">Nos services</h2>
      <p data-edit-field="subtitle" class="text-gray-600 mt-3">Des solutions adaptées à votre projet.</p>
    </div>
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      ${[0,1,2,3].map(i => `<a href="#contact" class="group relative block aspect-[3/4] overflow-hidden">
        <img data-edit-field="items.${i}.imageUrl" src="https://loremflickr.com/600/800/business,office?lock=${1000+i}" alt="" class="absolute inset-0 w-full h-full object-cover" loading="lazy" />
        <div class="absolute inset-0" style="background:linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(0,0,0,0.85));"></div>
        <div class="absolute inset-0 flex flex-col items-center justify-center p-6 text-white text-center">
          <h3 data-edit-field="items.${i}.title" class="font-bold text-sm uppercase tracking-widest mb-3">Service ${i+1}</h3>
          <p data-edit-field="items.${i}.description" class="text-xs mb-5" style="opacity:0.9;">Description courte du service.</p>
          <span data-edit-field="items.${i}.ctaText" class="inline-block px-5 py-2 border border-white text-xs font-bold uppercase tracking-widest">En savoir plus</span>
        </div>
      </a>`).join("")}
    </div>
  </div>
</section>`;

    case "services_grid":
      return `<section data-edit-section="ServicesGrid_${u}" class="py-16 md:py-20 px-4">
  <div class="max-w-6xl mx-auto">
    <div class="text-center mb-12 max-w-2xl mx-auto">
      <h2 data-edit-field="title" class="text-3xl md:text-4xl font-bold mb-3">Nos services</h2>
      <p data-edit-field="subtitle" class="text-gray-600">Une offre complète et structurée.</p>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      ${[0,1,2].map(i => `<div class="rounded-2xl overflow-hidden border border-gray-200 bg-white">
        <img data-edit-field="items.${i}.imageUrl" src="https://loremflickr.com/600/400/business?lock=${2000+i}" alt="" class="w-full h-48 object-cover" loading="lazy" />
        <div class="p-6">
          <h3 data-edit-field="items.${i}.title" class="font-bold text-lg mb-2">Service ${i+1}</h3>
          <p data-edit-field="items.${i}.description" class="text-gray-600 text-sm leading-relaxed">Description du service.</p>
        </div>
      </div>`).join("")}
    </div>
  </div>
</section>`;

    case "highlights":
      return `<section data-edit-section="Highlights_${u}" class="py-16 md:py-20 px-4">
  <div class="max-w-6xl mx-auto space-y-16">
    ${[0,1].map(i => `<div class="grid grid-cols-1 md:grid-cols-2 gap-10 items-center ${i%2 ? 'md:[direction:rtl]' : ''}">
      <img data-edit-field="items.${i}.imageUrl" src="https://loremflickr.com/700/500?lock=${3000+i}" alt="" class="w-full h-auto rounded-2xl shadow-lg" loading="lazy" />
      <div>
        <h3 data-edit-field="items.${i}.title" class="text-2xl md:text-3xl font-bold mb-4">Argument ${i+1}</h3>
        <p data-edit-field="items.${i}.description" class="text-gray-600 leading-relaxed">Texte qui développe l’argument et explique en détail.</p>
      </div>
    </div>`).join("")}
  </div>
</section>`;

    case "circles":
      return `<section data-edit-section="Circles_${u}" class="py-16 md:py-20 px-4">
  <div class="max-w-5xl mx-auto">
    <h2 data-edit-field="title" class="text-3xl md:text-4xl font-bold text-center mb-12">Catégories</h2>
    <div class="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
      ${[0,1,2,3].map(i => `<div>
        <div class="w-32 h-32 mx-auto rounded-full overflow-hidden mb-4 shadow-lg">
          <img data-edit-field="items.${i}.imageUrl" src="https://loremflickr.com/300/300?lock=${4000+i}" alt="" class="w-full h-full object-cover" loading="lazy" />
        </div>
        <h3 data-edit-field="items.${i}.label" class="font-semibold">Catégorie ${i+1}</h3>
      </div>`).join("")}
    </div>
  </div>
</section>`;

    case "stats":
      return `<section data-edit-section="Stats_${u}" class="py-16 px-4 bg-gray-50">
  <div class="max-w-6xl mx-auto">
    <h2 data-edit-field="title" class="text-2xl md:text-3xl font-bold text-center mb-12">Nos chiffres</h2>
    <div class="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
      ${[{v:"+250",l:"Clients"},{v:"98%",l:"Satisfaction"},{v:"15 ans",l:"Expérience"},{v:"4.9/5",l:"Note"}].map((s,i) => `<div>
        <div data-edit-field="items.${i}.value" class="text-4xl font-bold mb-1" style="color:var(--color-primary, #6366f1);">${s.v}</div>
        <div data-edit-field="items.${i}.label" class="text-sm text-gray-600">${s.l}</div>
      </div>`).join("")}
    </div>
  </div>
</section>`;

    case "process":
    case "process_vertical":
      return `<section data-edit-section="Process_${u}" class="py-16 md:py-20 px-4 bg-gray-50">
  <div class="max-w-6xl mx-auto">
    <div class="text-center mb-12">
      <h2 data-edit-field="title" class="text-3xl md:text-4xl font-bold mb-3">Notre méthode</h2>
      <p data-edit-field="subtitle" class="text-gray-600">Étape par étape.</p>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      ${[0,1,2].map(i => `<div class="bg-white rounded-2xl p-6 border border-gray-200">
        <div class="text-3xl font-bold mb-3" style="color:var(--color-primary, #6366f1);">0${i+1}</div>
        <h3 data-edit-field="steps.${i}.title" class="font-bold text-lg mb-2">Étape ${i+1}</h3>
        <p data-edit-field="steps.${i}.desc" class="text-gray-600 text-sm leading-relaxed">Description de l’étape.</p>
      </div>`).join("")}
    </div>
  </div>
</section>`;

    case "about":
      return `<section data-edit-section="About_${u}" class="py-16 md:py-20 px-4">
  <div class="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
    <img data-edit-field="imageUrl" src="https://loremflickr.com/700/500/team,office?lock=${u}" alt="" class="w-full h-auto rounded-2xl shadow-lg" loading="lazy" />
    <div>
      <h2 data-edit-field="title" class="text-3xl md:text-4xl font-bold mb-5">À propos</h2>
      <p data-edit-field="paragraphs.0" class="text-gray-600 leading-relaxed mb-4">Premier paragraphe sur l’entreprise, son histoire, ses valeurs.</p>
      <p data-edit-field="paragraphs.1" class="text-gray-600 leading-relaxed">Deuxième paragraphe pour développer.</p>
    </div>
  </div>
</section>`;

    case "about_cards":
      return `<section data-edit-section="AboutCards_${u}" class="py-16 md:py-20 px-4">
  <div class="max-w-6xl mx-auto">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-10 items-center mb-12">
      <img data-edit-field="imageUrl" src="https://loremflickr.com/700/500/team?lock=${u}" alt="" class="w-full h-auto rounded-2xl shadow-lg" loading="lazy" />
      <div>
        <h2 data-edit-field="title" class="text-3xl md:text-4xl font-bold mb-5">Qui sommes-nous</h2>
        <p data-edit-field="paragraphs.0" class="text-gray-600 leading-relaxed">Une équipe passionnée au service de vos projets.</p>
      </div>
    </div>
    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
      ${[0,1,2,3].map(i => `<div class="p-5 rounded-xl bg-gray-50 border border-gray-200">
        <h3 data-edit-field="cards.${i}.title" class="font-bold mb-2">Valeur ${i+1}</h3>
        <p data-edit-field="cards.${i}.description" class="text-sm text-gray-600">Description courte.</p>
      </div>`).join("")}
    </div>
  </div>
</section>`;

    case "gallery":
      return `<section data-edit-section="Gallery_${u}" class="py-16 md:py-20 px-4">
  <div class="max-w-6xl mx-auto">
    <h2 data-edit-field="title" class="text-3xl md:text-4xl font-bold text-center mb-10">Galerie</h2>
    <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
      ${[0,1,2,3,4,5,6,7,8].map(i => `<img data-edit-field="images.${i}" src="https://loremflickr.com/500/500?lock=${5000+i}" alt="" class="w-full aspect-square object-cover rounded-lg" loading="lazy" />`).join("")}
    </div>
  </div>
</section>`;

    case "video":
      return `<section data-edit-section="Video_${u}" class="py-16 md:py-20 px-4">
  <div class="max-w-4xl mx-auto text-center">
    <h2 data-edit-field="title" class="text-3xl md:text-4xl font-bold mb-3">Vidéo</h2>
    <p data-edit-field="subtitle" class="text-gray-600 mb-8">Découvrez en images.</p>
    <div class="relative w-full" style="padding-top:56.25%; background:#000; border-radius:14px; overflow:hidden;">
      <img data-edit-field="poster" src="https://loremflickr.com/1280/720?lock=${u}" alt="" class="absolute inset-0 w-full h-full object-cover" loading="lazy" />
      <div class="absolute inset-0 flex items-center justify-center">
        <div class="w-20 h-20 rounded-full bg-white/90 flex items-center justify-center">
          <svg class="w-8 h-8 ml-1" viewBox="0 0 24 24" fill="black"><path d="M8 5v14l11-7z"/></svg>
        </div>
      </div>
    </div>
  </div>
</section>`;

    case "promo_split":
      return `<section data-edit-section="PromoSplit_${u}" class="py-16 md:py-20 px-4">
  <div class="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
    <img data-edit-field="imageUrl" src="https://loremflickr.com/700/500?lock=${u}" alt="" class="w-full h-auto rounded-2xl shadow-lg" loading="lazy" />
    <div>
      <h2 data-edit-field="title" class="text-3xl md:text-4xl font-bold mb-4">Offre exclusive</h2>
      <p data-edit-field="description" class="text-gray-600 leading-relaxed mb-3">Profitez d’une promotion limitée.</p>
      <p data-edit-field="highlight" class="text-2xl font-bold mb-6" style="color:var(--color-primary, #6366f1);">-30% jusqu’au 31</p>
      <a data-edit-field="ctaText" href="#contact" class="inline-block px-7 py-3 rounded-full font-semibold text-white" style="background:var(--color-primary, #6366f1);">J’en profite</a>
    </div>
  </div>
</section>`;

    case "logos_bar":
      return `<section data-edit-section="LogosBar_${u}" class="py-12 px-4 bg-gray-50">
  <div class="max-w-6xl mx-auto">
    <h3 data-edit-field="title" class="text-center text-sm uppercase tracking-widest text-gray-500 mb-6">Ils nous font confiance</h3>
    <div class="flex flex-wrap items-center justify-center gap-x-12 gap-y-4">
      ${[0,1,2,3,4].map(i => `<div data-edit-field="logos.${i}.name" class="text-xl font-bold text-gray-400">Logo ${i+1}</div>`).join("")}
    </div>
  </div>
</section>`;

    case "testimonials":
      return `<section data-edit-section="Testimonials_${u}" class="py-16 md:py-20 px-4">
  <div class="max-w-6xl mx-auto">
    <h2 data-edit-field="title" class="text-3xl md:text-4xl font-bold text-center mb-12">Témoignages</h2>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      ${[0,1,2].map(i => `<div class="bg-white rounded-2xl p-6 border border-gray-200">
        <div class="text-3xl mb-3" style="color:var(--color-primary, #6366f1);">”</div>
        <p data-edit-field="items.${i}.quote" class="text-gray-700 mb-4 leading-relaxed">Un avis client positif qui rassure.</p>
        <div data-edit-field="items.${i}.author" class="font-semibold">Client ${i+1}</div>
        <div data-edit-field="items.${i}.role" class="text-sm text-gray-500">Rôle</div>
      </div>`).join("")}
    </div>
  </div>
</section>`;

    case "pricing":
      return `<section data-edit-section="Pricing_${u}" class="py-16 md:py-20 px-4 bg-gray-50">
  <div class="max-w-6xl mx-auto">
    <h2 data-edit-field="title" class="text-3xl md:text-4xl font-bold text-center mb-12">Tarifs</h2>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      ${[0,1,2].map(i => `<div class="bg-white rounded-2xl p-8 border ${i===1 ? 'border-2' : 'border-gray-200'}" ${i===1 ? `style="border-color:var(--color-primary, #6366f1);"` : ''}>
        <h3 data-edit-field="plans.${i}.name" class="font-bold text-lg mb-2">Plan ${i+1}</h3>
        <div data-edit-field="plans.${i}.price" class="text-4xl font-extrabold mb-4" style="color:var(--color-primary, #6366f1);">${[19, 49, 99][i]}€<span class="text-sm text-gray-500 font-normal">/mois</span></div>
        <ul class="space-y-2 mb-6 text-sm">
          <li data-edit-field="plans.${i}.features.0">✓ Feature 1</li>
          <li data-edit-field="plans.${i}.features.1">✓ Feature 2</li>
          <li data-edit-field="plans.${i}.features.2">✓ Feature 3</li>
        </ul>
        <a data-edit-field="plans.${i}.ctaText" href="#contact" class="block text-center px-5 py-2.5 rounded-full font-semibold ${i===1 ? 'text-white' : 'border-2'}" style="${i===1 ? 'background:var(--color-primary, #6366f1);' : 'border-color:var(--color-primary, #6366f1); color:var(--color-primary, #6366f1);'}">Choisir</a>
      </div>`).join("")}
    </div>
  </div>
</section>`;

    case "faq":
      return `<section data-edit-section="Faq_${u}" class="py-16 md:py-20 px-4">
  <div class="max-w-3xl mx-auto">
    <h2 data-edit-field="title" class="text-3xl md:text-4xl font-bold text-center mb-10">Questions fréquentes</h2>
    <div class="space-y-3">
      ${[0,1,2,3].map(i => `<details class="bg-gray-50 rounded-xl p-5 border border-gray-200">
        <summary data-edit-field="items.${i}.q" class="font-semibold cursor-pointer">Question ${i+1} ?</summary>
        <p data-edit-field="items.${i}.a" class="text-gray-600 mt-3 text-sm leading-relaxed">Réponse à la question ${i+1}.</p>
      </details>`).join("")}
    </div>
  </div>
</section>`;

    case "cta":
      return `<section data-edit-section="Cta_${u}" class="py-16 md:py-20 px-4 text-center" style="background:var(--color-primary, #6366f1); color:white;">
  <div class="max-w-3xl mx-auto">
    <h2 data-edit-field="title" class="text-3xl md:text-4xl font-bold mb-4">Prêt à démarrer ?</h2>
    <p data-edit-field="subtitle" class="text-lg mb-8" style="opacity:0.9;">Contactez-nous pour discuter de votre projet.</p>
    <a data-edit-field="buttonText" href="#contact" class="inline-block px-8 py-3 rounded-full font-semibold" style="background:white; color:var(--color-primary, #6366f1);">Nous contacter</a>
  </div>
</section>`;

    case "contact":
      return `<section data-edit-section="Contact_${u}" class="py-16 md:py-20 px-4 bg-gray-50">
  <div class="max-w-5xl mx-auto">
    <h2 data-edit-field="title" class="text-3xl md:text-4xl font-bold text-center mb-3">Contact</h2>
    <p data-edit-field="subtitle" class="text-center text-gray-600 mb-10">Une question ? Écrivez-nous.</p>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
      <div><div class="text-3xl mb-2">📞</div><div data-edit-field="phone" class="font-semibold">01 23 45 67 89</div></div>
      <div><div class="text-3xl mb-2">✉️</div><div data-edit-field="email" class="font-semibold">contact@exemple.fr</div></div>
      <div><div class="text-3xl mb-2">📍</div><div data-edit-field="address" class="font-semibold">Paris, France</div></div>
    </div>
  </div>
</section>`;

    // ═══ Sections SHOP ═══
    // Les sections shop sont des React components (ShopGrid, ShopFeatured,
    // ShopCategories) déjà bundlés dans le site. ShopHydrator scanne le DOM
    // pour les markers data-shop-section et y monte les composants via
    // createPortal. Les props sont passées via data-prop-* attributes.
    // Le marker contient un placeholder visuel pour le mode édition.
    case "shop_grid":
      return `<section data-edit-section="ShopGrid_${u}" data-shop-section="grid" data-prop-limit="12" data-prop-columns="4" data-prop-title="Notre boutique" data-prop-subtitle="Découvrez notre sélection." class="py-16 md:py-20 px-4 bg-white">
  <div class="max-w-7xl mx-auto">
    <div class="text-center mb-10 max-w-2xl mx-auto">
      <h2 class="text-3xl md:text-4xl font-bold mb-3 text-gray-900">Notre boutique</h2>
      <p class="text-gray-600">Découvrez notre sélection.</p>
    </div>
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
      <div class="aspect-[3/4] bg-gray-100 rounded-2xl animate-pulse"></div>
      <div class="aspect-[3/4] bg-gray-100 rounded-2xl animate-pulse"></div>
      <div class="aspect-[3/4] bg-gray-100 rounded-2xl animate-pulse"></div>
      <div class="aspect-[3/4] bg-gray-100 rounded-2xl animate-pulse"></div>
    </div>
  </div>
</section>`;

    case "shop_featured":
      return `<section data-edit-section="ShopFeatured_${u}" data-shop-section="featured" data-prop-limit="6" data-prop-title="Sélection du moment" data-prop-subtitle="Nos produits les plus appréciés." data-prop-eyebrow="— Coups de cœur" class="py-16 md:py-20 px-4">
  <div class="max-w-6xl mx-auto">
    <div class="text-center mb-10 max-w-2xl mx-auto">
      <div class="inline-block text-xs uppercase tracking-widest font-semibold mb-3" style="color:var(--color-primary, #6366f1);">— Coups de cœur</div>
      <h2 class="text-3xl md:text-4xl font-bold mb-3 text-gray-900">Sélection du moment</h2>
      <p class="text-gray-600">Nos produits les plus appréciés.</p>
    </div>
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      <div class="aspect-[3/4] bg-gray-100 rounded-2xl animate-pulse"></div>
      <div class="aspect-[3/4] bg-gray-100 rounded-2xl animate-pulse"></div>
      <div class="aspect-[3/4] bg-gray-100 rounded-2xl animate-pulse"></div>
    </div>
  </div>
</section>`;

    case "shop_categories":
      return `<section data-edit-section="ShopCategories_${u}" data-shop-section="categories" data-prop-title="Catégories" data-prop-subtitle="Trouve ce qui te plaît." class="py-16 md:py-20 px-4 bg-gray-50">
  <div class="max-w-6xl mx-auto">
    <div class="text-center mb-10 max-w-2xl mx-auto">
      <h2 class="text-3xl md:text-4xl font-bold mb-3 text-gray-900">Catégories</h2>
      <p class="text-gray-600">Trouve ce qui te plaît.</p>
    </div>
    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      <div class="aspect-square bg-gray-200 rounded-2xl animate-pulse"></div>
      <div class="aspect-square bg-gray-200 rounded-2xl animate-pulse"></div>
      <div class="aspect-square bg-gray-200 rounded-2xl animate-pulse"></div>
      <div class="aspect-square bg-gray-200 rounded-2xl animate-pulse"></div>
    </div>
  </div>
</section>`;

    case "features_phone":
    case "feature_split":
    case "actions_grid":
      return placeholder(id, id);

    default:
      return placeholder(id, id);
  }
}
