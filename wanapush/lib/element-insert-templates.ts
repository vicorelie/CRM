// HTML statique d'insertion pour chaque élément du catalogue.
// L'élément est inséré en sibling APRÈS l'élément ciblé (data-edit-field).
// Texte neutre → l'utilisateur édite ensuite via le popup crayon.

function uid(): string {
  return Math.random().toString(36).slice(2, 8);
}

export function elementInsertHtml(id: string): string {
  const u = uid();
  switch (id) {
    case "h2":
      return `<h2 data-edit-field="newH2_${u}" class="text-3xl md:text-4xl font-bold my-6">Nouveau titre</h2>`;

    case "h3":
      return `<h3 data-edit-field="newH3_${u}" class="text-xl md:text-2xl font-semibold my-4">Nouveau sous-titre</h3>`;

    case "paragraph":
      return `<p data-edit-field="newP_${u}" class="text-base my-4 leading-relaxed">Tape ici ton texte. Clique sur l’icône crayon pour modifier.</p>`;

    case "lead":
      return `<p data-edit-field="newLead_${u}" class="text-lg md:text-xl my-6 leading-relaxed text-gray-600">Paragraphe d’introduction pour donner le ton de la section.</p>`;

    case "bullets":
      return `<ul data-edit-field="newList_${u}" class="my-6 space-y-2 list-disc pl-6">
  <li>Premier point clé</li>
  <li>Deuxième avantage</li>
  <li>Troisième bénéfice</li>
</ul>`;

    case "quote":
      return `<blockquote data-edit-field="newQuote_${u}" class="my-8 pl-5 italic text-lg" style="border-left:3px solid var(--color-primary, #6366f1); color:#374151;">
  « Une citation qui résume parfaitement la valeur que vous offrez. »
  <footer class="mt-3 text-sm not-italic font-semibold" style="color:var(--color-primary, #6366f1);">— Auteur</footer>
</blockquote>`;

    case "image":
      return `<img data-edit-field="newImg_${u}" src="https://loremflickr.com/800/500?lock=${Math.floor(Math.random() * 9999)}" alt="" class="w-full h-auto rounded-lg my-4" loading="lazy" />`;

    case "image_caption":
      return `<figure class="my-6">
  <img data-edit-field="newImg_${u}" src="https://loremflickr.com/800/500?lock=${Math.floor(Math.random() * 9999)}" alt="" class="w-full h-auto rounded-lg" loading="lazy" />
  <figcaption data-edit-field="newCaption_${u}" class="mt-2 text-sm text-center text-gray-500 italic">Légende de l’image</figcaption>
</figure>`;

    case "video":
      return `<div class="my-6 relative w-full" style="padding-top:56.25%; background:#000; border-radius:14px; overflow:hidden;">
  <img data-edit-field="newPoster_${u}" src="https://loremflickr.com/1280/720?lock=${u}" alt="" class="absolute inset-0 w-full h-full object-cover" loading="lazy" />
  <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
    <div class="w-20 h-20 rounded-full bg-white/90 flex items-center justify-center">
      <svg class="w-8 h-8 ml-1" viewBox="0 0 24 24" fill="black"><path d="M8 5v14l11-7z"/></svg>
    </div>
  </div>
</div>`;

    case "button":
      return `<a data-edit-field="newBtn_${u}" href="#contact" class="inline-block my-4 px-6 py-3 rounded-full font-semibold text-white" style="background:var(--color-primary, #6366f1);">Nouveau bouton</a>`;

    case "button_outline":
      return `<a data-edit-field="newBtnOut_${u}" href="#contact" class="inline-block my-4 px-6 py-3 rounded-full font-semibold border-2" style="border-color:var(--color-primary, #6366f1); color:var(--color-primary, #6366f1);">Bouton outline</a>`;

    case "buttons_pair":
      return `<div class="flex flex-wrap gap-3 my-4">
  <a data-edit-field="newBtnA_${u}" href="#contact" class="inline-block px-6 py-3 rounded-full font-semibold text-white" style="background:var(--color-primary, #6366f1);">Action principale</a>
  <a data-edit-field="newBtnB_${u}" href="#about" class="inline-block px-6 py-3 rounded-full font-semibold border-2" style="border-color:var(--color-primary, #6366f1); color:var(--color-primary, #6366f1);">En savoir plus</a>
</div>`;

    case "divider":
      return `<hr class="my-8 border-t border-gray-200" />`;

    case "spacer":
      return `<div aria-hidden="true" style="height:60px;"></div>`;

    case "two_columns":
      return `<div class="my-8 grid grid-cols-1 md:grid-cols-2 gap-8">
  <div>
    <h3 data-edit-field="col1Title_${u}" class="font-bold text-lg mb-2">Colonne gauche</h3>
    <p data-edit-field="col1Text_${u}" class="text-gray-600 leading-relaxed">Texte de la première colonne.</p>
  </div>
  <div>
    <h3 data-edit-field="col2Title_${u}" class="font-bold text-lg mb-2">Colonne droite</h3>
    <p data-edit-field="col2Text_${u}" class="text-gray-600 leading-relaxed">Texte de la deuxième colonne.</p>
  </div>
</div>`;

    default:
      return `<div data-edit-field="newEl_${u}" class="my-4 p-4 rounded-lg border-2 border-dashed border-gray-300 text-center text-sm text-gray-500">Élément « ${id} »</div>`;
  }
}
