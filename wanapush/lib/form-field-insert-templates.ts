// HTML d'insertion des champs de formulaire. Style cohérent avec le form
// par défaut généré dans Contact.tsx :
//   classes "w-full px-5 py-4 bg-white rounded-xl border border-gray-200
//   text-gray-900 placeholder-gray-500 focus:outline-none focus:border-primary
//   focus:ring-2 focus:ring-primary/20 text-sm transition-all"
// On utilise les mêmes classes pour que le nouvel input s'intègre visuellement.

const BASE_INPUT_CLS = "w-full px-5 py-4 bg-white rounded-xl border border-gray-200 text-gray-900 placeholder-gray-500 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-sm transition-all";
const BASE_TEXTAREA_CLS = BASE_INPUT_CLS + " resize-y min-h-[120px]";

function uid(prefix: string): string {
  return prefix + "_" + Math.random().toString(36).slice(2, 7);
}

export function formFieldInsertHtml(id: string): string {
  const name = uid("field");
  switch (id) {
    case "text":
      return `<input type="text" name="${name}" placeholder="Texte" class="${BASE_INPUT_CLS}" />`;

    case "email":
      return `<input type="email" name="${name}" placeholder="votre@email.com" class="${BASE_INPUT_CLS}" />`;

    case "tel":
      return `<input type="tel" name="${name}" placeholder="06 12 34 56 78" class="${BASE_INPUT_CLS}" />`;

    case "number":
      return `<input type="number" name="${name}" placeholder="0" class="${BASE_INPUT_CLS}" />`;

    case "url":
      return `<input type="url" name="${name}" placeholder="https://exemple.com" class="${BASE_INPUT_CLS}" />`;

    case "textarea":
      return `<textarea name="${name}" placeholder="Votre message…" rows="4" class="${BASE_TEXTAREA_CLS}"></textarea>`;

    case "select":
      return `<select name="${name}" class="${BASE_INPUT_CLS}">
  <option value="" data-edit-field="${name}_opt0">Choisir une option…</option>
  <option value="option1" data-edit-field="${name}_opt1">Option 1</option>
  <option value="option2" data-edit-field="${name}_opt2">Option 2</option>
  <option value="option3" data-edit-field="${name}_opt3">Option 3</option>
</select>`;

    case "checkbox":
      return `<label class="flex items-start gap-3 text-sm text-gray-700 cursor-pointer">
  <input type="checkbox" name="${name}" class="mt-1 w-4 h-4 accent-primary cursor-pointer" />
  <span data-edit-field="${name}_label">J'accepte les conditions d'utilisation.</span>
</label>`;

    case "radio":
      return `<div class="space-y-2 text-sm text-gray-700">
  <div data-edit-field="${name}_title" class="font-semibold text-gray-900 mb-1">Choisissez une option</div>
  <label class="flex items-center gap-2 cursor-pointer">
    <input type="radio" name="${name}" value="option1" class="w-4 h-4 accent-primary cursor-pointer" />
    <span data-edit-field="${name}_opt1">Option 1</span>
  </label>
  <label class="flex items-center gap-2 cursor-pointer">
    <input type="radio" name="${name}" value="option2" class="w-4 h-4 accent-primary cursor-pointer" />
    <span data-edit-field="${name}_opt2">Option 2</span>
  </label>
  <label class="flex items-center gap-2 cursor-pointer">
    <input type="radio" name="${name}" value="option3" class="w-4 h-4 accent-primary cursor-pointer" />
    <span data-edit-field="${name}_opt3">Option 3</span>
  </label>
</div>`;

    case "date":
      return `<input type="date" name="${name}" class="${BASE_INPUT_CLS}" />`;

    case "file":
      return `<label class="block">
  <span class="block mb-2 text-sm font-semibold text-gray-700">Fichier à joindre</span>
  <input type="file" name="${name}" class="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary/90 cursor-pointer" />
</label>`;

    default:
      return `<input type="text" name="${name}" placeholder="Nouveau champ" class="${BASE_INPUT_CLS}" />`;
  }
}
