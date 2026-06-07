// Script d'éditeur WYSIWYG injecté dans les sites buildés.
// S'active UNIQUEMENT quand la query ?edit=1 est présente dans l'URL.
// En production normale, le script ne fait rien (pas d'overlay, pas de modif DOM).
//
// Édition :
//  - Textes : tout élément avec [data-edit-field] devient contentEditable au clic
//  - Images : clic sur <img data-edit-field> → modal pour saisir nouvelle URL
//  - Couleurs : barre d'outils top → color pickers primaire/secondaire
//
// Persistence :
//  - Les changements s'accumulent dans une Map en mémoire
//  - Bouton "Sauvegarder" → POST /api/sites/{slug}/edits → rebuild → refresh
//
// Identification des éléments :
//  - data-edit-section : identifiant de la section (type, ex "hero", "feature_split.0")
//  - data-edit-field   : chemin du champ (ex "title", "subtitle", "items.0.title", "blocks.1.description")

export function editorScript(slug: string): string {
  return `<script data-editor-injected>
(function() {
  // Active uniquement avec ?edit=1
  if (new URLSearchParams(location.search).get('edit') !== '1') return;

  const SLUG = ${JSON.stringify(slug)};
  const API_URL = '/api/sites/' + SLUG + '/edits';

  // Map<sectionType.fieldPath, newValue>
  const edits = new Map();
  let unsaved = 0;

  // ── Styles d'overlay (injectés dans <head>) ────────────────────
  const style = document.createElement('style');
  style.textContent = \`
    [data-edit-field] {
      outline: 2px dashed transparent !important;
      outline-offset: 4px !important;
      transition: outline-color 0.15s, background-color 0.15s !important;
      cursor: default !important;
    }
    [data-edit-field]:hover {
      outline-color: rgba(99, 102, 241, 0.6) !important;
      background-color: rgba(99, 102, 241, 0.04) !important;
    }
    /* Quand le field est à l'intérieur d'un bouton (<button> ou <a> stylé
       avec bg-* ou border-*), la toolbar/outline encadre déjà tout le bouton
       via la cible visuelle. On supprime l'outline du texte intérieur pour
       éviter le double surlignage. */
    button [data-edit-field]:hover,
    a[class^="bg-"] [data-edit-field]:hover,
    a[class*=" bg-"] [data-edit-field]:hover,
    a[class^="border-"] [data-edit-field]:hover,
    a[class*=" border-"] [data-edit-field]:hover {
      outline-color: transparent !important;
      background-color: transparent !important;
    }
    /* Outline JS-driven sur la cible visuelle. Marqué via data-wp-hovered
       par positionEditTools — fonctionne pour TOUT type d'élément (texte,
       image, bouton wrapper, section), pas de sélecteur par cas. */
    [data-wp-hovered] {
      outline: 2px dashed rgba(99, 102, 241, 0.7) !important;
      outline-offset: 4px !important;
      background-color: rgba(99, 102, 241, 0.05) !important;
      transition: outline-color 0.15s, background-color 0.15s !important;
    }
    /* Outline section au survol — uniquement quand on hover directement
       l'espace de la section (pas un child data-edit-field). */
    [data-edit-section] {
      outline: 2px dashed transparent !important;
      outline-offset: -2px !important;
      transition: outline-color 0.15s !important;
    }
    [data-edit-section]:hover {
      outline-color: rgba(99, 102, 241, 0.4) !important;
    }
    [data-edit-section]:has([data-edit-field]:hover) {
      outline-color: transparent !important;
    }
    [data-edit-field][contenteditable="true"] {
      outline: 2px solid rgb(99 102 241) !important;
      background-color: rgba(99, 102, 241, 0.08) !important;
    }
    img[data-edit-field] { cursor: zoom-in !important; }
    .wp-editor-bar {
      position: fixed; top: 0; left: 0; right: 0; z-index: 99999;
      background: rgb(15, 23, 42); color: white;
      padding: 10px 16px; display: flex; gap: 12px; align-items: center;
      box-shadow: 0 4px 16px rgba(0,0,0,0.4);
      font-family: -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
      font-size: 13px;
    }
    .wp-editor-bar button {
      padding: 6px 14px; border-radius: 6px; border: none; cursor: pointer;
      font-weight: 600; font-size: 12px;
    }
    .wp-editor-bar .wp-save {
      background: rgb(99 102 241); color: white; transition: background 0.15s;
    }
    .wp-editor-bar .wp-save:hover { background: rgb(79 70 229); }
    .wp-editor-bar .wp-save:disabled { background: rgb(51 65 85); cursor: not-allowed; opacity: 0.6; }
    .wp-editor-bar .wp-cancel {
      background: rgb(51 65 85); color: rgb(203 213 225);
    }
    .wp-editor-bar input[type=color] {
      width: 22px; height: 22px; border: 1px solid rgb(51 65 85); border-radius: 4px;
      cursor: pointer; background: transparent; padding: 0;
    }
    .wp-editor-bar label { display: flex; align-items: center; gap: 4px; font-size: 10px; color: rgb(148 163 184); white-space: nowrap; }
    body { padding-top: 52px !important; }
    /* Les heros en h-screen (100vh) débordent en bas à cause du padding-top de
       la barre d'édition → le contenu centré tombe hors viewport. On compense. */
    .h-screen, [class*="min-h-[100vh]"], [class*="min-h-[100svh]"] {
      height: calc(100vh - 52px) !important;
      min-height: calc(100vh - 52px) !important;
    }
    .wp-img-modal {
      position: fixed; inset: 0; background: rgba(15,23,42,0.85); z-index: 99998;
      display: flex; align-items: center; justify-content: center;
    }
    .wp-img-modal-inner {
      background: rgb(15 23 42); padding: 24px; border-radius: 12px; width: 90%; max-width: 480px;
      color: white; font-family: system-ui, sans-serif;
    }
    .wp-img-modal h3 { margin: 0 0 12px; font-size: 16px; }
    .wp-img-modal input {
      width: 100%; padding: 10px; border-radius: 6px; border: 1px solid rgb(51 65 85);
      background: rgb(2 6 23); color: white; font-size: 13px; box-sizing: border-box;
    }
    .wp-img-modal-buttons { display: flex; gap: 8px; margin-top: 12px; justify-content: flex-end; }
    .wp-img-drop {
      display: block; border: 2px dashed rgb(51 65 85); border-radius: 8px;
      padding: 18px; text-align: center; cursor: pointer; transition: all 0.15s;
      background: rgba(99,102,241,0.04); margin-bottom: 12px;
    }
    .wp-img-drop:hover, .wp-img-drop-active {
      border-color: rgb(99 102 241); background: rgba(99,102,241,0.12);
    }
    .wp-img-drop-text { color: rgb(203 213 225); font-size: 13px; }
    .wp-img-drop-text strong { color: white; }
    .wp-img-drop-hint { color: rgb(148 163 184); font-size: 11px; margin-top: 4px; }
    .wp-img-status { font-size: 12px; padding: 4px 0; min-height: 18px; color: rgb(148 163 184); }
    .wp-img-status.wp-ok { color: rgb(74 222 128); }
    .wp-img-status.wp-err { color: rgb(248 113 113); }
    .wp-img-or {
      display: flex; align-items: center; gap: 10px; margin: 4px 0 8px;
      color: rgb(100 116 139); font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em;
    }
    .wp-img-or::before, .wp-img-or::after {
      content: ''; flex: 1; height: 1px; background: rgb(51 65 85);
    }
    .wp-img-ai { display: flex; gap: 8px; align-items: stretch; }
    .wp-img-ai input { flex: 1; }
    .wp-img-ai button { white-space: nowrap; padding: 0 14px; }
    .wp-img-ai button:disabled { opacity: 0.6; cursor: wait; }
    .wp-edit-badge {
      position: fixed; bottom: 16px; right: 16px; z-index: 99997;
      background: rgb(15 23 42); color: white; padding: 8px 14px; border-radius: 999px;
      font-family: system-ui; font-size: 12px; font-weight: 600;
      box-shadow: 0 6px 24px rgba(0,0,0,0.3);
    }
    /* Toolbar d'édition flottante : × + ✎ collés en bas-centre de
       l'élément survolé. Ombre commune, arrondi aux extrémités seulement. */
    .wp-edit-pencil, .wp-edit-del, .wp-edit-add {
      position: absolute; z-index: 99996;
      height: 32px; border-radius: 0;
      border: 2px solid white; border-left-width: 0;
      cursor: pointer; display: none;
      align-items: center; justify-content: center;
      box-shadow: 0 6px 16px rgba(0,0,0,0.35);
      transition: background 0.12s;
      padding: 0; color: white;
      font-family: system-ui; font-weight: 700;
      box-sizing: border-box;
    }
    /* × à gauche → arrondi gauche + sa propre bordure gauche */
    .wp-edit-del {
      width: 32px; background: rgb(239 68 68);
      font-size: 20px; line-height: 1;
      border-radius: 8px 0 0 8px; border-left-width: 2px;
    }
    .wp-edit-del:hover { background: rgb(220 38 38); }
    /* + au centre → pas d'arrondi, pas de bordure gauche */
    .wp-edit-add { width: 32px; background: rgb(16 185 129); }
    .wp-edit-add:hover { background: rgb(5 150 105); }
    .wp-edit-add svg { width: 16px; height: 16px; }
    /* ✎ à droite → arrondi droit (ou complet via .wp-edit-pencil-solo) */
    .wp-edit-pencil {
      width: 32px; background: rgb(99 102 241);
      border-radius: 0 8px 8px 0;
      border-left-width: 0;
    }
    .wp-edit-pencil.wp-edit-pencil-solo {
      border-radius: 8px;
      border-left-width: 2px;
    }
    .wp-edit-pencil:hover { background: rgb(79 70 229); }
    /* Cadre item au hover (en plus du cadre section) */
    [data-wp-item-hover] {
      outline: 2px dashed rgba(99, 102, 241, 0.5);
      outline-offset: 2px;
    }
    /* Modal de choix de section à ajouter */
    .wp-section-picker {
      position: fixed; inset: 0; z-index: 99999;
      display: flex; align-items: center; justify-content: center;
      background: rgba(0,0,0,0.5); backdrop-filter: blur(4px);
    }
    .wp-section-picker-box {
      background: rgb(15 23 42); border-radius: 16px;
      padding: 24px; max-width: 1100px; width: 95%;
      max-height: 85vh; overflow-y: auto;
      box-shadow: 0 30px 60px rgba(0,0,0,0.5);
      color: white; font-family: system-ui;
    }
    .wp-section-picker-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 14px;
      margin-top: 16px;
    }
    @media (max-width: 800px) {
      .wp-section-picker-grid { grid-template-columns: repeat(2, 1fr); }
    }
    .wp-section-picker-loading {
      grid-template-columns: 1fr !important;
      text-align: center; padding: 40px;
      color: rgb(148 163 184); font-size: 12px;
    }
    .wp-section-picker-card {
      background: rgb(15 23 42);
      border: 1px solid rgb(51 65 85);
      border-radius: 12px;
      padding: 14px;
      cursor: pointer;
      transition: border-color 0.15s, transform 0.1s;
      text-align: left;
      display: flex; flex-direction: column;
      gap: 10px;
    }
    .wp-section-picker-card:hover {
      border-color: rgb(99 102 241);
      transform: translateY(-2px);
    }
    .wp-section-thumb {
      background: rgb(30 41 59);
      border-radius: 8px;
      padding: 8px;
      aspect-ratio: 5 / 3;
      display: flex; align-items: center; justify-content: center;
      overflow: hidden;
    }
    .wp-section-thumb svg { width: 100%; height: 100%; }
    .wp-picker-cat {
      font-size: 11px; text-transform: uppercase;
      letter-spacing: 0.08em; font-weight: 700;
      color: rgb(148 163 184);
      margin-top: 12px; padding-bottom: 6px;
      border-bottom: 1px solid rgb(30 41 59);
    }
    .wp-picker-cat:first-child { margin-top: 0; }
    /* ─────── Form Manager (popup unifié) ─────── */
    .wp-fm-box {
      max-width: 720px; width: 95%;
      display: flex; flex-direction: column; gap: 16px;
    }
    .wp-fm-header {
      display: flex; align-items: flex-start; justify-content: space-between; gap: 12px;
    }
    .wp-fm-done {
      padding: 8px 16px; border-radius: 8px; cursor: pointer;
      background: rgb(99 102 241); color: white; border: none;
      font-weight: 700; font-size: 12px; font-family: system-ui;
    }
    .wp-fm-done:hover { background: rgb(79 70 229); }
    .wp-fm-list {
      list-style: none; padding: 0; margin: 0;
      display: flex; flex-direction: column; gap: 8px;
      max-height: 55vh; overflow-y: auto;
    }
    .wp-fm-row {
      display: grid; grid-template-columns: 24px 28px 1fr 32px;
      gap: 10px; align-items: center;
      padding: 12px; border-radius: 10px;
      background: rgb(15 23 42); border: 1px solid rgb(51 65 85);
      transition: background 0.15s, border-color 0.15s;
    }
    .wp-fm-row:hover { background: rgb(30 41 59); border-color: rgb(71 85 105); }
    .wp-fm-row.wp-fm-over { border-color: rgb(99 102 241); background: rgb(30 41 59); }
    .wp-fm-row.wp-fm-dragging { opacity: 0.4; }
    .wp-fm-handle {
      color: rgb(148 163 184); cursor: grab;
      text-align: center; user-select: none;
      font-family: ui-monospace, monospace; font-size: 14px;
    }
    .wp-fm-handle:active { cursor: grabbing; }
    .wp-fm-icon { font-size: 18px; text-align: center; }
    .wp-fm-info { min-width: 0; }
    .wp-fm-display { font-weight: 600; font-size: 13px; color: rgb(241 245 249); }
    .wp-fm-meta {
      font-size: 10px; color: rgb(148 163 184);
      margin-top: 2px; font-family: ui-monospace, monospace;
    }
    .wp-fm-ph {
      margin-top: 8px; width: 100%;
      padding: 6px 10px; border-radius: 6px;
      background: rgb(2 6 23); color: white;
      border: 1px solid rgb(51 65 85);
      font-size: 12px; font-family: system-ui;
    }
    .wp-fm-ph:focus { outline: none; border-color: rgb(99 102 241); }
    .wp-fm-options {
      margin-top: 12px; padding-top: 10px;
      border-top: 1px solid rgb(30 41 59);
      display: flex; flex-direction: column; gap: 6px;
    }
    .wp-fm-options-label {
      font-size: 10px; text-transform: uppercase;
      letter-spacing: 0.08em; font-weight: 700;
      color: rgb(148 163 184);
      margin-bottom: 2px;
    }
    .wp-fm-opt-row {
      display: grid; grid-template-columns: 1fr 28px;
      gap: 6px; align-items: center;
    }
    .wp-fm-opt-input {
      width: 100%; padding: 6px 10px;
      background: rgb(2 6 23); color: white;
      border: 1px solid rgb(51 65 85); border-radius: 6px;
      font-size: 12px; font-family: system-ui;
    }
    .wp-fm-opt-input:focus { outline: none; border-color: rgb(99 102 241); }
    .wp-fm-opt-del {
      width: 28px; height: 28px; border-radius: 6px;
      background: transparent; color: rgb(248 113 113);
      border: 1px solid rgb(127 29 29); cursor: pointer;
      font-size: 14px; line-height: 1; font-weight: 700;
    }
    .wp-fm-opt-del:hover { background: rgb(127 29 29); color: white; }
    .wp-fm-opt-add {
      align-self: stretch; padding: 6px 10px;
      background: rgb(15 23 42); color: rgb(165 180 252);
      border: 1px dashed rgb(67 56 202); border-radius: 6px;
      cursor: pointer; font-size: 11px; font-weight: 600;
      font-family: system-ui;
    }
    .wp-fm-opt-add:hover { background: rgb(30 41 59); }
    .wp-fm-del {
      width: 28px; height: 28px; border-radius: 6px;
      background: transparent; color: rgb(248 113 113);
      border: 1px solid rgb(127 29 29); cursor: pointer;
      font-size: 16px; line-height: 1; font-weight: 700;
      transition: background 0.12s;
    }
    .wp-fm-del:hover { background: rgb(127 29 29); color: white; }
    .wp-fm-add {
      padding: 12px; border-radius: 10px; cursor: pointer;
      background: rgb(30 41 59); color: rgb(241 245 249);
      border: 1px dashed rgb(99 102 241);
      font-weight: 600; font-size: 13px; font-family: system-ui;
    }
    .wp-fm-add:hover { background: rgb(51 65 85); }
    .wp-fm-subpicker {
      position: absolute; inset: 16px;
      background: rgb(15 23 42); border-radius: 12px;
      padding: 16px; overflow-y: auto;
      border: 1px solid rgb(51 65 85);
      display: flex; flex-direction: column; gap: 12px;
    }
    .wp-fm-subpicker-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 10px;
    }
    .wp-fm-sub-item {
      background: rgb(15 23 42); border: 1px solid rgb(51 65 85);
      border-radius: 8px; padding: 8px; cursor: pointer;
      display: flex; flex-direction: column; gap: 6px;
      text-align: center;
    }
    .wp-fm-sub-item:hover { border-color: rgb(99 102 241); }
    .wp-fm-sub-item .wp-section-thumb { padding: 4px; aspect-ratio: 5/3; }
    .wp-fm-sub-label { font-size: 11px; color: rgb(241 245 249); font-weight: 600; }
    .wp-section-picker-card h4 {
      font-size: 13px; font-weight: 700; margin: 0;
      color: rgb(241 245 249);
    }
    .wp-section-picker-card p {
      font-size: 11px; color: rgb(148 163 184);
      margin: 0; line-height: 1.45;
      display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .wp-ctx-menu {
      position: absolute; z-index: 99998; min-width: 240px;
      background: rgb(15 23 42); color: white; border-radius: 10px;
      padding: 12px 14px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);
      font-family: system-ui; font-size: 13px;
      border: 1px solid rgb(51 65 85);
    }
    .wp-ctx-menu-large { width: 360px; max-height: 70vh; overflow-y: auto; }
    .wp-ctx-title {
      font-weight: 700; margin-bottom: 8px; font-size: 12px;
      cursor: move; user-select: none;
      display: flex; align-items: center; gap: 6px;
      padding: 2px 0 6px;
      border-bottom: 1px solid rgb(30 41 59);
    }
    .wp-ctx-title::before {
      content: ""; display: inline-block;
      width: 14px; height: 10px; flex-shrink: 0;
      background-image:
        radial-gradient(circle, rgb(100 116 139) 1px, transparent 1px),
        radial-gradient(circle, rgb(100 116 139) 1px, transparent 1px);
      background-size: 4px 4px;
      background-position: 0 0, 0 6px;
      background-repeat: repeat-x;
      opacity: 0.7;
    }
    .wp-ctx-section { color: rgb(148 163 184); font-weight: 400; font-size: 11px; }
    .wp-ctx-row {
      display: flex; align-items: center; justify-content: space-between;
      gap: 10px; padding: 6px 0; color: rgb(203 213 225); font-size: 12px;
    }
    .wp-ctx-row > span:first-child { flex-shrink: 0; min-width: 80px; }
    .wp-ctx-row input[type=color] {
      width: 32px; height: 28px; border: 1px solid rgb(51 65 85); border-radius: 4px;
      cursor: pointer; background: transparent; padding: 0;
    }
    .wp-ctx-row input[type=number], .wp-ctx-row input[type=url], .wp-ctx-row select {
      flex: 1; min-width: 0; padding: 4px 8px;
      background: rgb(2 6 23); color: white; font-size: 12px;
      border: 1px solid rgb(51 65 85); border-radius: 4px;
    }
    .wp-ctx-row select { padding-right: 18px; }
    .wp-ctx-unit-wrap { display: inline-flex; align-items: center; gap: 4px; flex: 1; min-width: 0; }
    .wp-ctx-unit-wrap input { flex: 1; }
    /* Slider (range) lié à un input number — pour dimensions / opacité */
    .wp-ctx-row-slider {
      display: flex; align-items: center; gap: 10px;
      padding: 6px 0; color: rgb(203 213 225); font-size: 12px;
    }
    .wp-ctx-row-slider > span:first-child { flex-shrink: 0; min-width: 80px; }
    .wp-ctx-slider-wrap {
      display: flex; align-items: center; gap: 10px;
      flex: 1; min-width: 0;
    }
    .wp-ctx-slider {
      flex: 1; min-width: 0;
      height: 4px; padding: 0; margin: 0;
      background: rgb(30 41 59); border-radius: 999px;
      cursor: pointer;
      -webkit-appearance: none; appearance: none;
    }
    .wp-ctx-slider::-webkit-slider-runnable-track {
      height: 4px; background: rgb(30 41 59); border-radius: 999px;
    }
    .wp-ctx-slider::-moz-range-track {
      height: 4px; background: rgb(30 41 59); border-radius: 999px;
    }
    .wp-ctx-slider::-webkit-slider-thumb {
      -webkit-appearance: none; appearance: none;
      width: 16px; height: 16px; border-radius: 50%;
      background: rgb(99 102 241); border: 2px solid white;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      margin-top: -6px; cursor: grab;
    }
    .wp-ctx-slider::-moz-range-thumb {
      width: 16px; height: 16px; border-radius: 50%;
      background: rgb(99 102 241); border: 2px solid white;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3); cursor: grab;
    }
    .wp-ctx-unit-wrap-small { flex: 0 0 80px; }
    .wp-ctx-unit-wrap-small input { width: 100%; }
    /* Color picker enrichi : titre + input color + hue slider + swatches */
    .wp-ctx-color {
      padding: 8px 0;
      border-bottom: 1px solid rgb(30 41 59);
      margin-bottom: 4px;
    }
    .wp-ctx-color-top {
      display: flex; align-items: center; justify-content: space-between;
      gap: 10px; margin-bottom: 8px;
      color: rgb(203 213 225); font-size: 12px;
    }
    .wp-ctx-color-controls {
      display: inline-flex; align-items: center; gap: 6px;
    }
    .wp-ctx-color-input {
      width: 36px; height: 28px; padding: 0;
      border: 1px solid rgb(51 65 85); border-radius: 5px;
      cursor: pointer; background: transparent;
    }
    .wp-ctx-color-hex {
      width: 80px; height: 28px;
      padding: 0 6px;
      background: rgb(2 6 23); color: white;
      border: 1px solid rgb(51 65 85); border-radius: 4px;
      font-family: ui-monospace, "SF Mono", Menlo, monospace;
      font-size: 11px;
      text-transform: lowercase;
    }
    .wp-ctx-color-hex:focus {
      outline: none; border-color: rgb(99 102 241);
    }
    .wp-ctx-overlay {
      padding: 8px 0;
      border-top: 1px solid rgb(30 41 59);
      margin-top: 4px;
    }
    .wp-ctx-hue {
      width: 100%; height: 10px;
      -webkit-appearance: none; appearance: none;
      background: linear-gradient(to right,
        #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%,
        #0000ff 67%, #ff00ff 83%, #ff0000 100%);
      border-radius: 999px;
      cursor: pointer;
      margin: 6px 0;
    }
    .wp-ctx-hue::-webkit-slider-runnable-track { background: transparent; }
    .wp-ctx-hue::-moz-range-track { background: transparent; }
    .wp-ctx-hue::-webkit-slider-thumb {
      -webkit-appearance: none; appearance: none;
      width: 16px; height: 16px; border-radius: 50%;
      background: white; border: 2px solid rgb(15 23 42);
      box-shadow: 0 2px 4px rgba(0,0,0,0.4);
      margin-top: -3px; cursor: grab;
    }
    .wp-ctx-hue::-moz-range-thumb {
      width: 16px; height: 16px; border-radius: 50%;
      background: white; border: 2px solid rgb(15 23 42);
      box-shadow: 0 2px 4px rgba(0,0,0,0.4); cursor: grab;
    }
    .wp-ctx-unit { font-size: 10px; color: rgb(148 163 184); font-family: monospace; }
    .wp-ctx-group { display: inline-flex; gap: 4px; flex-wrap: wrap; }
    .wp-ctx-pill {
      padding: 3px 8px; font-size: 10px;
      background: rgb(30 41 59); color: rgb(203 213 225);
      border: 1px solid rgb(51 65 85); border-radius: 4px;
      cursor: pointer; font-family: system-ui;
    }
    .wp-ctx-pill:hover { background: rgb(51 65 85); color: white; }
    .wp-ctx-pill.active { background: rgb(99 102 241); color: white; border-color: rgb(99 102 241); }
    /* Pills à icônes : carrées, plus grandes, centrent leur contenu SVG/glyph */
    .wp-ctx-pill-icon {
      width: 32px; height: 28px; padding: 0;
      display: inline-flex; align-items: center; justify-content: center;
    }
    .wp-ctx-pill-icon svg { display: block; }
    .wp-ctx-pill-icon span { line-height: 1; }
    .wp-ctx-tabs {
      display: flex; gap: 4px; margin: 4px 0 10px;
      border-bottom: 1px solid rgb(51 65 85); padding-bottom: 8px;
    }
    .wp-ctx-tab {
      flex: 1; padding: 5px 8px; font-size: 11px; font-weight: 600;
      background: transparent; color: rgb(148 163 184);
      border: 1px solid transparent; border-radius: 5px;
      cursor: pointer; font-family: system-ui;
    }
    .wp-ctx-tab:hover { background: rgb(30 41 59); color: white; }
    .wp-ctx-tab.active { background: rgb(99 102 241); color: white; }
    .wp-ctx-empty {
      padding: 18px 8px; text-align: center; color: rgb(100 116 139); font-size: 11px;
    }
    .wp-ctx-row-col { display: flex; flex-direction: column; align-items: stretch; gap: 4px; }
    .wp-ctx-row-col > span:first-child { min-width: 0; }
    .wp-ctx-textarea, .wp-ctx-input-text {
      width: 100%; padding: 8px 10px;
      background: rgb(2 6 23); color: white; font-size: 13px;
      border: 1px solid rgb(51 65 85); border-radius: 5px;
      font-family: inherit; resize: vertical; min-height: 36px;
      box-sizing: border-box;
    }
    .wp-ctx-textarea:focus, .wp-ctx-input-text:focus {
      outline: none; border-color: rgb(99 102 241);
    }
    .wp-ctx-icon-grid {
      display: grid; grid-template-columns: repeat(5, 1fr); gap: 4px;
      padding: 6px 0;
    }
    .wp-ctx-icon-preset {
      aspect-ratio: 1; display: flex; align-items: center; justify-content: center;
      background: rgb(30 41 59); color: rgb(203 213 225);
      border: 1px solid rgb(51 65 85); border-radius: 6px;
      cursor: pointer; padding: 0;
    }
    .wp-ctx-icon-preset:hover {
      background: rgb(99 102 241); color: white; border-color: rgb(99 102 241);
    }
    .wp-ctx-imagebg-btn {
      padding: 5px 12px; font-size: 11px; font-weight: 600;
      background: rgb(99 102 241); color: white; border: none; border-radius: 5px;
      cursor: pointer; font-family: system-ui;
    }
    .wp-ctx-imagebg-btn:hover { background: rgb(79 70 229); }
    .wp-ctx-preview-wrap {
      position: relative; margin: 6px 0 4px;
      border: 1px solid rgb(51 65 85); border-radius: 6px; overflow: hidden;
    }
    .wp-ctx-preview { display: block; width: 100%; height: 80px; object-fit: cover; }
    /* Bloc "Source" en haut de l'onglet Image : grande preview + bouton */
    .wp-ctx-image-replace {
      display: flex; flex-direction: column; gap: 8px;
      margin-bottom: 12px; padding-bottom: 10px;
      border-bottom: 1px solid rgb(30 41 59);
    }
    .wp-ctx-preview-large {
      display: block; width: 100%; height: 120px;
      object-fit: cover; border-radius: 8px;
      border: 1px solid rgb(51 65 85);
    }
    .wp-ctx-no-image {
      height: 120px; border-radius: 8px;
      border: 1px dashed rgb(51 65 85);
      display: flex; align-items: center; justify-content: center;
      color: rgb(148 163 184); font-size: 12px;
      background: rgba(0,0,0,0.2);
    }
    .wp-ctx-clear {
      position: absolute; top: 4px; right: 4px;
      width: 22px; height: 22px; border-radius: 50%;
      background: rgba(0,0,0,0.6); color: white; border: none;
      cursor: pointer; font-size: 14px; line-height: 1;
    }
    .wp-ctx-clear:hover { background: rgb(248 113 113); }
    .wp-ctx-close {
      width: 100%; margin-top: 8px; padding: 6px;
      background: rgb(51 65 85); color: white; border: none; border-radius: 6px;
      cursor: pointer; font-size: 11px; font-weight: 600;
    }
    .wp-ctx-close:hover { background: rgb(71 85 105); }
    .wp-ctx-anchors {
      margin: 4px 0 6px; padding: 6px 8px;
      background: rgba(99,102,241,0.08); border-radius: 6px;
      display: flex; flex-wrap: wrap; gap: 4px; align-items: center;
    }
    .wp-ctx-anchors-label {
      font-size: 10px; color: rgb(148 163 184);
      text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700;
    }
    .wp-ctx-anchor {
      font-size: 11px; padding: 2px 8px; border-radius: 999px;
      background: rgb(51 65 85); color: rgb(199 210 254);
      border: none; cursor: pointer; font-family: monospace;
    }
    .wp-ctx-anchor:hover { background: rgb(99 102 241); color: white; }
    /* Modale dédiée carrousel (clic droit sur HeroSlider) */
    .wp-carousel-picker {
      position: fixed; inset: 0; background: rgba(15,23,42,0.85); z-index: 99998;
      display: flex; align-items: center; justify-content: center;
      font-family: system-ui;
    }
    .wp-cp-inner {
      background: rgb(15 23 42); border: 1px solid rgb(51 65 85); border-radius: 12px;
      padding: 22px 26px; max-width: 720px; width: 92%;
      color: white; box-shadow: 0 20px 60px rgba(0,0,0,0.5);
    }
    .wp-cp-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
    .wp-cp-header h3 { margin: 0; font-size: 16px; }
    .wp-cp-header h3 span { color: rgb(148 163 184); font-weight: 400; font-size: 13px; }
    .wp-cp-x {
      width: 28px; height: 28px; border-radius: 6px;
      background: rgb(51 65 85); color: white; border: none;
      cursor: pointer; font-size: 18px; line-height: 1;
    }
    .wp-cp-x:hover { background: rgb(71 85 105); }
    .wp-cp-thumbs {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 12px; margin-bottom: 14px;
    }
    .wp-cp-thumb {
      position: relative; padding: 0; border: 2px solid rgb(51 65 85); border-radius: 10px;
      background: rgb(2 6 23); cursor: pointer; overflow: hidden;
      transition: all 0.15s; aspect-ratio: 16/10;
    }
    .wp-cp-thumb:hover { border-color: rgb(99 102 241); transform: translateY(-2px); }
    .wp-cp-thumb.active { border-color: rgb(99 102 241); box-shadow: 0 0 0 3px rgba(99,102,241,0.3); }
    .wp-cp-thumb img { display: block; width: 100%; height: 100%; object-fit: cover; }
    .wp-cp-num {
      position: absolute; bottom: 0; left: 0; right: 0;
      background: linear-gradient(to top, rgba(0,0,0,0.85), transparent);
      color: white; padding: 18px 10px 8px; font-size: 11px; font-weight: 600;
      text-align: left;
    }
    .wp-cp-hint { color: rgb(148 163 184); font-size: 12px; margin: 0 0 4px; text-align: center; }
  \`;
  document.head.appendChild(style);

  // ── Barre d'outils top ─────────────────────────────────────────
  const bar = document.createElement('div');
  bar.className = 'wp-editor-bar';
  bar.innerHTML = \`
    <span style="font-weight:700;letter-spacing:.04em;">✎ MODE ÉDITION</span>
    <span style="color:rgb(148 163 184);font-size:11px">— survole un élément et clique le crayon ✎ pour éditer</span>
    <span style="flex:1"></span>
    <label>Primaire <input type="color" id="wp-color-primary"></label>
    <label>Secondaire <input type="color" id="wp-color-secondary"></label>
    <label>Titres <input type="color" id="wp-color-heading"></label>
    <label>Texte <input type="color" id="wp-color-text"></label>
    <label>Fond <input type="color" id="wp-color-bg-page"></label>
    <label>Sections <input type="color" id="wp-color-bg-section"></label>
    <button class="wp-cancel" onclick="location.search='';">Quitter</button>
    <button class="wp-save" id="wp-save" disabled>Sauvegarder (0)</button>
  \`;
  document.body.appendChild(bar);

  const saveBtn = bar.querySelector('#wp-save');
  function refreshSaveBtn() {
    saveBtn.textContent = 'Sauvegarder (' + unsaved + ')';
    saveBtn.disabled = unsaved === 0;
  }

  // ── Couleurs : lit les valeurs CSS actuelles ───────────────────
  const root = getComputedStyle(document.documentElement);
  const primary = root.getPropertyValue('--color-primary').trim() || '#6366f1';
  const secondary = root.getPropertyValue('--color-secondary').trim() || '#ec4899';
  document.getElementById('wp-color-primary').value = primary;
  document.getElementById('wp-color-secondary').value = secondary;
  document.getElementById('wp-color-primary').addEventListener('input', (e) => {
    document.documentElement.style.setProperty('--color-primary', e.target.value);
    edits.set('__theme.primaryColor', e.target.value);
    unsaved = edits.size + mutations.length; refreshSaveBtn();
  });
  document.getElementById('wp-color-secondary').addEventListener('input', (e) => {
    document.documentElement.style.setProperty('--color-secondary', e.target.value);
    edits.set('__theme.secondaryColor', e.target.value);
    unsaved = edits.size + mutations.length; refreshSaveBtn();
  });

  // ── Couleurs avancées (titres/texte/fonds) ─────────────────────
  // On injecte un <style> qui ré-applique les overrides à partir de variables CSS.
  // Cela garantit un rendu immédiat même si l'index.css n'a pas encore le bloc
  // d'overrides (sera persisté par /edits côté serveur).
  // Note: pour les fonds, on exclut les sections "spéciales" (hero sombre, bg-primary,
  // bg-brand-gradient, bg-gray-9xx) afin de ne pas casser leur look.
  const overrideStyle = document.createElement('style');
  overrideStyle.id = 'wp-editor-overrides';
  overrideStyle.textContent = \`
    /* On NE touche PAS les h1/h2/... globalement : les hero blancs sur image sombre
       gardent text-white. On override uniquement quand la classe Tailwind est
       explicitement un gris (cas par défaut des titres/textes sur fond clair). */
    .text-gray-900, .text-gray-800, .text-gray-700 { color: var(--color-heading, inherit) !important; }
    .text-gray-500, .text-gray-600, .text-gray-400 { color: var(--color-text, inherit) !important; }
    html, body { background-color: var(--color-bg-page, inherit) !important; }
    main { background-color: var(--color-bg-page, inherit) !important; }
    main > section:not([class*="bg-primary"]):not([class*="bg-gray-9"]):not([class*="bg-gray-8"]):not([class*="bg-brand"]):not([class*="bg-black"]):not([class*="bg-slate-9"]):not([class*="bg-zinc-9"]):not([class*="bg-neutral-9"]) {
      background-color: var(--color-bg-page, inherit) !important;
    }
    main > section:nth-of-type(2n+3):not([class*="bg-primary"]):not([class*="bg-gray-9"]):not([class*="bg-gray-8"]):not([class*="bg-brand"]):not([class*="bg-black"]):not([class*="bg-slate-9"]):not([class*="bg-zinc-9"]):not([class*="bg-neutral-9"]) {
      background-color: var(--color-bg-section, inherit) !important;
    }
  \`;
  document.head.appendChild(overrideStyle);

  function readVar(name, fallback) {
    return root.getPropertyValue(name).trim() || fallback;
  }
  const advPickers = [
    { id: 'wp-color-heading',    cssVar: '--color-heading',    field: 'headingColor', defaultVal: '#111827' },
    { id: 'wp-color-text',       cssVar: '--color-text',       field: 'textColor',    defaultVal: '#4b5563' },
    { id: 'wp-color-bg-page',    cssVar: '--color-bg-page',    field: 'pageBg',       defaultVal: '#ffffff' },
    { id: 'wp-color-bg-section', cssVar: '--color-bg-section', field: 'sectionBg',    defaultVal: '#f3f4f6' },
  ];
  advPickers.forEach((p) => {
    const el = document.getElementById(p.id);
    el.value = readVar(p.cssVar, p.defaultVal);
    el.addEventListener('input', (e) => {
      document.documentElement.style.setProperty(p.cssVar, e.target.value);
      edits.set('__theme.' + p.field, e.target.value);
      unsaved = edits.size + mutations.length; refreshSaveBtn();
    });
  });

  function openImageModal(img, key, options) {
    // options : { title?, currentUrl?, onApply(url) }. Si non fourni → comportement
    // par défaut (remplacer le src d'un <img> data-edit-field).
    const opts = options || {};
    const initialUrl = opts.currentUrl != null ? opts.currentUrl : (img && img.src ? img.src : '');
    const modalTitle = opts.title || "Remplacer l'image";
    const modal = document.createElement('div');
    modal.className = 'wp-img-modal';
    modal.innerHTML = \`
      <div class="wp-img-modal-inner">
        <h3>\${modalTitle}</h3>
        <label class="wp-img-drop" id="wp-img-drop">
          <input type="file" id="wp-img-file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" hidden>
          <div class="wp-img-drop-text">
            <strong>Cliquer pour choisir</strong> ou glisse une image ici
            <div class="wp-img-drop-hint">JPG, PNG, WEBP, GIF, AVIF — 10 Mo max</div>
          </div>
        </label>
        <div class="wp-img-or"><span>OU générer avec IA</span></div>
        <div class="wp-img-ai">
          <input id="wp-img-prompt" type="text" placeholder="Ex: photographe mariage en Provence au coucher du soleil">
          <button class="wp-save" id="wp-img-gen" style="background:rgb(168 85 247)">✨ Générer</button>
        </div>
        <div class="wp-img-or"><span>OU coller une URL</span></div>
        <input id="wp-img-url" type="url" placeholder="https://images.unsplash.com/..." value="\${initialUrl}">
        <div class="wp-img-status" id="wp-img-status"></div>
        <div class="wp-img-modal-buttons">
          <button class="wp-cancel" id="wp-img-cancel">Annuler</button>
          <button class="wp-save" id="wp-img-ok" style="background:rgb(99 102 241)">\${opts.applyLabel || 'Remplacer'}</button>
        </div>
      </div>
    \`;
    document.body.appendChild(modal);
    const input = modal.querySelector('#wp-img-url');
    const fileInput = modal.querySelector('#wp-img-file');
    const dropZone = modal.querySelector('#wp-img-drop');
    const status = modal.querySelector('#wp-img-status');
    const okBtn = modal.querySelector('#wp-img-ok');

    async function handleFile(file) {
      if (!file) return;
      if (!file.type || file.type.indexOf('image/') !== 0) {
        status.textContent = 'Type non supporté : ' + file.type;
        status.className = 'wp-img-status wp-err';
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        status.textContent = 'Fichier trop gros (max 10 Mo)';
        status.className = 'wp-img-status wp-err';
        return;
      }
      status.textContent = 'Upload en cours…';
      status.className = 'wp-img-status';
      okBtn.disabled = true;
      try {
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch('/api/sites/' + SLUG + '/upload-image', { method: 'POST', body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Upload échoué');
        input.value = data.url;
        status.textContent = '✓ Uploadé — clique "Remplacer" pour appliquer';
        status.className = 'wp-img-status wp-ok';
      } catch (err) {
        status.textContent = 'Erreur : ' + err.message;
        status.className = 'wp-img-status wp-err';
      } finally {
        okBtn.disabled = false;
      }
    }

    fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('wp-img-drop-active'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('wp-img-drop-active'));
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('wp-img-drop-active');
      handleFile(e.dataTransfer.files[0]);
    });

    const genBtn = modal.querySelector('#wp-img-gen');
    const promptInput = modal.querySelector('#wp-img-prompt');
    genBtn.addEventListener('click', async () => {
      const prompt = promptInput.value.trim();
      if (prompt.length < 3) {
        status.textContent = "Décris l'image en quelques mots";
        status.className = 'wp-img-status wp-err';
        return;
      }
      status.textContent = 'Génération IA en cours (15-30s)…';
      status.className = 'wp-img-status';
      genBtn.disabled = true;
      okBtn.disabled = true;
      try {
        const res = await fetch('/api/sites/' + SLUG + '/generate-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Génération échouée');
        input.value = data.url;
        status.textContent = '✓ Générée — clique "Remplacer" pour appliquer';
        status.className = 'wp-img-status wp-ok';
      } catch (err) {
        status.textContent = 'Erreur : ' + err.message;
        status.className = 'wp-img-status wp-err';
      } finally {
        genBtn.disabled = false;
        okBtn.disabled = false;
      }
    });

    modal.querySelector('#wp-img-cancel').addEventListener('click', () => modal.remove());
    okBtn.addEventListener('click', () => {
      const newUrl = input.value.trim();
      if (newUrl) {
        if (typeof opts.onApply === 'function') {
          opts.onApply(newUrl);
        } else if (img && newUrl !== img.src) {
          // Comportement par défaut : replacer img.src + edit Map
          img.src = newUrl;
          edits.set(key, newUrl);
        }
        unsaved = edits.size + mutations.length;
        refreshSaveBtn();
      }
      modal.remove();
    });
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
  }

  saveBtn.addEventListener('click', async () => {
    if (edits.size === 0 && mutations.length === 0) return;
    saveBtn.disabled = true;
    saveBtn.textContent = 'Sauvegarde...';
    try {
      const editPayload = Array.from(edits.entries()).map(([key, value]) => {
        if (key.startsWith('__theme.')) {
          return { kind: 'theme', field: key.replace('__theme.', ''), value };
        }
        if (key.startsWith('__element.')) {
          // Format: __element.{section}.{field|*}.{prop} ex: __element.Hero.title.color
          const rest = key.replace('__element.', '');
          const parts = rest.split('.');
          const prop = parts.pop();
          const section = parts.shift();
          const field = parts.join('.') || '*';
          return { kind: 'element', section, field, prop, value };
        }
        const [section, ...fieldParts] = key.split('.');
        return { kind: 'section', section, field: fieldParts.join('.'), value };
      });
      const mutPayload = mutations.map((m) => ({
        kind: 'mutation',
        op: m.op,
        section: m.section,
        field: m.field,
        itemPrefix: m.itemPrefix,
        itemIndex: m.itemIndex,
        afterSection: m.afterSection,
        sectionType: m.sectionType,
        afterField: m.afterField,
        elementType: m.elementType,
        inputName: m.inputName,
        afterInputName: m.afterInputName,
        fieldType: m.fieldType,
        formIndex: m.formIndex,
        value: m.value || '',
      }));
      const payload = editPayload.concat(mutPayload);
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ edits: payload }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert('Erreur : ' + (data.error || 'inconnue'));
        saveBtn.disabled = false; saveBtn.textContent = 'Sauvegarder (' + unsaved + ')';
        return;
      }
      saveBtn.textContent = '✓ Sauvegardé — rebuild en cours…';
      // Attend que le rebuild Vite finisse, puis recharge
      setTimeout(() => location.reload(), data.rebuildMs || 4000);
    } catch (err) {
      alert('Erreur réseau : ' + err.message);
      saveBtn.disabled = false; saveBtn.textContent = 'Sauvegarder (' + unsaved + ')';
    }
  });

  // ── Menu contextuel couleur (clic droit) ───────────────────────
  // Permet de changer la couleur d'UN texte/titre/liste précis, ou le fond
  // d'UNE section précise. Persisté côté serveur via kind="element".
  function rgbToHex(rgb) {
    const s = String(rgb);
    const start = s.indexOf('(');
    const end = s.indexOf(')');
    if (start < 0 || end < 0) return '#000000';
    const nums = s.slice(start + 1, end).split(',').map((p) => parseInt(p.trim(), 10));
    if (nums.length < 3 || nums.some(isNaN)) return '#000000';
    const h = (n) => n.toString(16).padStart(2, '0');
    return '#' + h(nums[0]) + h(nums[1]) + h(nums[2]);
  }
  function buildElementKey(section, field, prop) {
    return '__element.' + section + '.' + (field || '*') + '.' + prop;
  }
  // <style> qui matérialise les overrides per-element (sera ré-écrit à chaque edit).
  const perElStyle = document.createElement('style');
  perElStyle.id = 'wp-editor-per-element';
  document.head.appendChild(perElStyle);
  // Conversions prop → (CSS property, selector strategy).
  //
  // Cibles possibles :
  // - field lui-même : prop CSS classique (color, font-size, padding, ...)
  // - container (<a>/<button> englobant le field) : prop préfixée "container-"
  // - section entière : prop préfixée "section-" OU prop=bg+field=*
  // - svg d'icône : prop préfixée "icon-" → scope au tag svg (sinon la couleur
  //   se propage par héritage à tout le sous-arbre de la section)
  //
  // Compat avec les anciennes shortcuts : color, bg, containerBg, containerBorder.
  function buildSelectorFor(section, field, prop) {
    if (prop === 'containerBg' || prop === 'containerBorder' || (typeof prop === 'string' && prop.indexOf('container-') === 0)) {
      return '[data-edit-section="' + section + '"] a:has([data-edit-field="' + field + '"]), '
        + '[data-edit-section="' + section + '"] button:has([data-edit-field="' + field + '"])';
    }
    if (typeof prop === 'string' && prop.indexOf('icon-') === 0) {
      // Scope au svg. Trois cas :
      //  - field "_card:X" → scope à la carte qui contient un data-edit-field=X
      //    (utilisé quand l'icône elle-même n'a pas de data-edit-field mais
      //    est dans une carte voisine d'un autre field, ex: Features cards)
      //  - field réel → scope à l'élément qui contient ce field
      //  - rien / "*" → section entière (peu utilisé, cas générique)
      if (typeof field === 'string' && field.indexOf('_card:') === 0) {
        const realField = field.slice(6);
        const cardSel = '[data-edit-section="' + section + '"] *:has(> [data-edit-field="' + realField + '"])';
        return cardSel + ' svg, ' + cardSel + ' svg *';
      }
      if (field && field !== '*') {
        return '[data-edit-section="' + section + '"] [data-edit-field="' + field + '"] svg, '
          + '[data-edit-section="' + section + '"] [data-edit-field="' + field + '"] svg *';
      }
      return '[data-edit-section="' + section + '"] svg, [data-edit-section="' + section + '"] svg *';
    }
    if ((typeof prop === 'string' && prop.indexOf('section-') === 0) || !field || field === '*') {
      return '[data-edit-section="' + section + '"]';
    }
    return '[data-edit-section="' + section + '"] [data-edit-field="' + field + '"]';
  }
  function buildCssPropFor(prop) {
    if (prop === 'bg' || prop === 'containerBg') return 'background-color';
    if (prop === 'containerBorder') return 'border-color';
    if (typeof prop === 'string' && prop.indexOf('container-') === 0) return prop.slice('container-'.length);
    if (typeof prop === 'string' && prop.indexOf('section-') === 0) return prop.slice('section-'.length);
    if (typeof prop === 'string' && prop.indexOf('icon-') === 0) return prop.slice('icon-'.length);
    return prop; // déjà un nom CSS standard (color, font-size, padding, ...)
  }
  function refreshPerElementStyle() {
    const rules = [];
    edits.forEach((value, key) => {
      if (!key.startsWith('__element.')) return;
      const rest = key.replace('__element.', '');
      const parts = rest.split('.');
      const prop = parts.pop();
      const section = parts.shift();
      const field = parts.join('.');
      const selector = buildSelectorFor(section, field, prop);
      const cssProp = buildCssPropFor(prop);
      rules.push(selector + ' { ' + cssProp + ': ' + value + ' !important; }');
    });
    perElStyle.textContent = rules.join('\\n');
  }

  // ── Configuration des champs CSS éditables, organisés en onglets ─────
  // Chaque entrée décrit un input du menu contextuel : à quel onglet il
  // appartient, quelle prop CSS il modifie, et pour quels "kinds" d'éléments
  // il est pertinent.
  const FONT_FAMILIES = [
    { label: 'Hérité', value: '' },
    { label: 'Inter', value: 'Inter, sans-serif' },
    { label: 'Poppins', value: 'Poppins, sans-serif' },
    { label: 'Montserrat', value: 'Montserrat, sans-serif' },
    { label: 'Playfair Display', value: '"Playfair Display", serif' },
    { label: 'Roboto', value: 'Roboto, sans-serif' },
    { label: 'Système', value: 'system-ui, -apple-system, sans-serif' },
    { label: 'Serif', value: 'Georgia, "Times New Roman", serif' },
    { label: 'Mono', value: '"Courier New", monospace' },
  ];
  const FONT_WEIGHTS = ['300','400','500','600','700','800','900'];
  const TEXT_ALIGNS = ['left','center','right','justify'];
  const TEXT_TRANSFORMS = ['none','uppercase','lowercase','capitalize'];
  const TEXT_DECORATIONS = ['none','underline','line-through'];
  const BORDER_STYLES = ['none','solid','dashed','dotted'];

  // Configs : { tab, label, prop, target, type, kinds, options?, unit? }
  // target : 'self' | 'container' | 'section' (pour affichage des labels)
  // prop final côté CSS : prop (pour self), 'container-' + prop (container), 'section-' + prop (section)
  const FIELDS = [
    // ── Onglet Contenu (édition du texte) ──
    { tab: 'content', target: 'self', label: 'Texte', prop: 'textContent', type: 'textarea', kinds: ['text','link','button'] },
    // ── Onglet Texte ──
    { tab: 'text', target: 'self', label: 'Police', prop: 'font-family', type: 'select', options: FONT_FAMILIES, kinds: ['text','link','button'] },
    { tab: 'text', target: 'self', label: 'Taille', prop: 'font-size', type: 'unit', unit: 'px', min: 8, max: 200, slider: true, kinds: ['text','link','button'] },
    { tab: 'text', target: 'self', label: 'Graisse', prop: 'font-weight', type: 'select', options: FONT_WEIGHTS.map((w) => ({ label: w, value: w })), kinds: ['text','link','button'] },
    { tab: 'text', target: 'self', label: 'Interligne', prop: 'line-height', type: 'unit', unit: '', min: 0.8, max: 3, step: 0.05, slider: true, kinds: ['text','link','button'] },
    { tab: 'text', target: 'self', label: 'Lettres', prop: 'letter-spacing', type: 'unit', unit: 'em', min: -0.1, max: 1, step: 0.01, slider: true, kinds: ['text','link','button'] },
    { tab: 'text', target: 'self', label: 'Alignement', prop: 'text-align', type: 'group', options: TEXT_ALIGNS, kinds: ['text','link','button'] },
    { tab: 'text', target: 'self', label: 'Casse', prop: 'text-transform', type: 'group', options: TEXT_TRANSFORMS, kinds: ['text','link','button'] },
    { tab: 'text', target: 'self', label: 'Décoration', prop: 'text-decoration', type: 'group', options: TEXT_DECORATIONS, kinds: ['text','link','button'] },
    // ── Onglet Couleurs ──
    { tab: 'colors', target: 'self', label: 'Couleur du texte', prop: 'color', type: 'color', kinds: ['text','link','button'] },
    { tab: 'colors', target: 'self', label: "Fond de l'élément", prop: 'background-color', type: 'color', kinds: ['text','link','button'] },
    { tab: 'colors', target: 'container', label: 'Fond du bouton', prop: 'background-color', type: 'color', kinds: ['button'] },
    { tab: 'colors', target: 'container', label: 'Bordure', prop: 'border-color', type: 'color', kinds: ['button'] },
    { tab: 'colors', target: 'section', label: 'Fond de la section', prop: 'background-color', type: 'color', kinds: ['section','text','link','button'] },
    { tab: 'colors', target: 'section', label: 'Image de fond', prop: 'background-image', type: 'imageBg', kinds: ['section','text','link','button'] },
    // ── Onglet Boîte ──
    { tab: 'box', target: 'self', label: 'Padding', prop: 'padding', type: 'unit', unit: 'px', min: 0, max: 80, slider: true, kinds: ['text','link','button','image'] },
    { tab: 'box', target: 'self', label: 'Marge', prop: 'margin', type: 'unit', unit: 'px', min: 0, max: 80, slider: true, kinds: ['text','link','button','image'] },
    { tab: 'box', target: 'self', label: 'Border radius', prop: 'border-radius', type: 'unit', unit: 'px', min: 0, max: 200, slider: true, kinds: ['text','link','button','image'] },
    { tab: 'box', target: 'self', label: 'Border épaisseur', prop: 'border-width', type: 'unit', unit: 'px', min: 0, max: 10, slider: true, kinds: ['text','link','image'] },
    { tab: 'box', target: 'self', label: 'Border style', prop: 'border-style', type: 'select', options: BORDER_STYLES.map((s) => ({ label: s, value: s })), kinds: ['text','link','image'] },
    { tab: 'box', target: 'self', label: 'Border couleur', prop: 'border-color', type: 'color', kinds: ['text','link','image'] },
    { tab: 'box', target: 'container', label: 'Padding bouton', prop: 'padding', type: 'unit', unit: 'px', min: 0, max: 60, slider: true, kinds: ['button'] },
    { tab: 'box', target: 'container', label: 'Border radius', prop: 'border-radius', type: 'unit', unit: 'px', min: 0, max: 100, slider: true, kinds: ['button'] },
    { tab: 'box', target: 'container', label: 'Border épaisseur', prop: 'border-width', type: 'unit', unit: 'px', min: 0, max: 10, slider: true, kinds: ['button'] },
    { tab: 'box', target: 'container', label: 'Border style', prop: 'border-style', type: 'select', options: BORDER_STYLES.map((s) => ({ label: s, value: s })), kinds: ['button'] },
    { tab: 'box', target: 'section', label: 'Padding section', prop: 'padding', type: 'unit', unit: 'px', min: 0, max: 200, slider: true, kinds: ['section','text','link','button'] },
    // ── Onglet Image (image-specific) ──
    { tab: 'image', target: 'special', label: 'Source', prop: 'image-replace', type: 'image-replace', kinds: ['image'] },
    { tab: 'image', target: 'self', label: 'Largeur', prop: 'width', type: 'unit', unit: 'px', min: 0, max: 2000, slider: true, kinds: ['image'] },
    { tab: 'image', target: 'self', label: 'Hauteur', prop: 'height', type: 'unit', unit: 'px', min: 0, max: 2000, slider: true, kinds: ['image'] },
    { tab: 'image', target: 'self', label: 'Object-fit', prop: 'object-fit', type: 'select', options: ['cover','contain','fill','none','scale-down'].map((v) => ({ label: v, value: v })), kinds: ['image'] },
    { tab: 'image', target: 'self', label: 'Opacité', prop: 'opacity', type: 'unit', unit: '', min: 0, max: 1, step: 0.05, slider: true, kinds: ['image'] },
    { tab: 'image', target: 'self', label: 'Overlay', prop: 'box-shadow', type: 'overlay', kinds: ['image'] },
    // ── Onglet Icône (target="icon" → selector scopé à svg, ne propage pas
    //    la couleur aux textes par héritage) ──
    { tab: 'icon', target: 'icon', label: 'Couleur', prop: 'color', type: 'color', kinds: ['icon'] },
    { tab: 'icon', target: 'icon', label: 'Largeur', prop: 'width', type: 'unit', unit: 'px', min: 4, max: 200, slider: true, kinds: ['icon'] },
    { tab: 'icon', target: 'icon', label: 'Hauteur', prop: 'height', type: 'unit', unit: 'px', min: 4, max: 200, slider: true, kinds: ['icon'] },
    { tab: 'icon', target: 'icon', label: 'Stroke', prop: 'stroke-width', type: 'unit', unit: '', min: 0.5, max: 6, step: 0.25, slider: true, kinds: ['icon'] },
    { tab: 'icon', target: 'icon', label: 'Remplir', prop: 'fill', type: 'color', kinds: ['icon'] },
    { tab: 'icon', target: 'special', label: "Remplacer l'icône", prop: 'svg-replace', type: 'svg', kinds: ['icon'] },
    // ── Onglet Lien ──
    { tab: 'link', target: 'special', label: 'URL', prop: 'href', type: 'url', kinds: ['text','link','button','image'] },
  ];

  const TABS = [
    { id: 'content', label: 'Contenu',  kinds: ['text','link','button'] },
    { id: 'text',    label: 'Style',    kinds: ['text','link','button'] },
    { id: 'colors',  label: 'Couleurs', kinds: ['text','link','button','section'] },
    { id: 'box',     label: 'Boîte',    kinds: ['text','link','button','section','image'] },
    { id: 'image',   label: 'Image',    kinds: ['image'] },
    { id: 'icon',    label: 'Icône',    kinds: ['icon'] },
    { id: 'link',    label: 'Lien',     kinds: ['text','link','button','image'] },
  ];

  // Parse une valeur numérique CSS (ex "16px" → 16, "1.5" → 1.5, "" → '')
  function parseCssNum(value) {
    if (value == null) return '';
    const m = String(value).match(/^(-?\\d+(\\.\\d+)?)/);
    return m ? m[1] : '';
  }
  // Construit la prop "finale" envoyée à edits/buildSelectorFor selon target
  function propWithTarget(target, prop) {
    if (target === 'container') return 'container-' + prop;
    if (target === 'section') return 'section-' + prop;
    if (target === 'icon') return 'icon-' + prop;
    return prop;
  }
  // Élément DOM à styler immédiatement selon target
  function elementForTarget(target, fieldEl, containerEl, sectionEl) {
    if (target === 'container') return containerEl;
    if (target === 'section') return sectionEl;
    return fieldEl;
  }

  // ── Modale dédiée carrousel ─────────────────────────────────────
  // Affiche les slides en grosses vignettes. Clic sur une vignette =
  // ouvre le modal image (upload/URL/IA) pour ce slide.
  function openCarouselPicker(sectionEl) {
    document.querySelectorAll('.wp-ctx-menu, .wp-carousel-picker, .wp-img-modal').forEach((n) => n.remove());
    const imgs = Array.from(sectionEl.querySelectorAll('img[data-edit-field]'));
    if (imgs.length < 2) return;
    const sectionType = sectionEl.getAttribute('data-edit-section') || '';

    const modal = document.createElement('div');
    modal.className = 'wp-carousel-picker';
    const thumbs = imgs.map((img, i) => {
      const isActive = parseFloat(getComputedStyle(img).opacity) > 0.5;
      return '<button type="button" class="wp-cp-thumb' + (isActive ? ' active' : '') + '" data-slide-idx="' + i + '">'
        + '<img src="' + (img.getAttribute('src') || '').replace(/"/g, '&quot;') + '" alt="Slide ' + (i + 1) + '">'
        + '<span class="wp-cp-num">Slide ' + (i + 1) + (isActive ? ' · actif' : '') + '</span>'
        + '</button>';
    }).join('');
    modal.innerHTML =
      '<div class="wp-cp-inner">'
      + '<div class="wp-cp-header">'
      +   '<h3>Carrousel <span>· ' + imgs.length + ' slides</span></h3>'
      +   '<button type="button" class="wp-cp-x" id="wp-cp-close" aria-label="Fermer">×</button>'
      + '</div>'
      + '<div class="wp-cp-thumbs">' + thumbs + '</div>'
      + '<p class="wp-cp-hint">Clique une vignette pour changer son image.</p>'
      + '</div>';
    document.body.appendChild(modal);

    modal.querySelectorAll('.wp-cp-thumb').forEach((thumb) => {
      thumb.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const idx = parseInt(thumb.getAttribute('data-slide-idx') || '0', 10);
        const img = imgs[idx];
        if (!img) return;
        // Navigue le carrousel vers ce slide pour que l'utilisateur voie le résultat
        const dot = sectionEl.querySelector('button[aria-label="Slide ' + (idx + 1) + '"]');
        if (dot) dot.click();
        modal.remove();
        // Petit délai pour laisser le carrousel se positionner, puis ouvre le modal image
        setTimeout(() => {
          const field = img.getAttribute('data-edit-field');
          const key = sectionType + '.' + field;
          openImageModal(img, key);
        }, 250);
      });
    });

    modal.querySelector('#wp-cp-close').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
  }

  function openColorMenu(target, x, y) {
    document.querySelectorAll('.wp-ctx-menu').forEach((n) => n.remove());
    let field = target.getAttribute('data-edit-field');
    const sectionEl = target.closest('[data-edit-section]');
    if (!sectionEl) return;
    const section = sectionEl.getAttribute('data-edit-section');

    // Cas spécial : input/textarea de formulaire → on synthétise un field
    // basé sur l'attribut name (ex: "_input:name") pour pouvoir éditer son
    // placeholder via le popup et persister.
    const isFormInput = (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')
      && target.getAttribute('type') !== 'hidden';
    if (isFormInput && !field) {
      const inpName = target.getAttribute('name') || ('field' + Math.random().toString(36).slice(2, 6));
      field = '_input:' + inpName;
    }

    const isField = !!field;
    const isImage = target.tagName === 'IMG';
    const isSvg = target.tagName === 'svg' || target.tagName === 'SVG' || target.tagName === 'PATH' || target.tagName === 'path' || target.tagName === 'CIRCLE' || target.tagName === 'circle' || target.tagName === 'RECT' || target.tagName === 'rect';
    // target peut être :
    //   - un field (data-edit-field) → containerEl = son <a>/<button> ancêtre
    //   - un <a>/<button> directement (sans inner field) → containerEl = target
    const targetIsInteractive = target.tagName === 'A' || target.tagName === 'BUTTON';
    const containerEl = (isField && !isImage) ? target.closest('a, button')
      : (targetIsInteractive ? target : null);
    const containerClasses = containerEl ? String(containerEl.className || '').split(' ') : [];
    const isButtonLike = !!containerEl && (
      containerEl.tagName === 'BUTTON'
      || containerClasses.some(function (c) { return c.indexOf('bg-') === 0 || c.indexOf('border-') === 0; })
    );
    const isPlainLink = !!containerEl && !isButtonLike;
    let kind;
    if (isImage) kind = 'image';
    else if (isSvg) kind = 'icon';
    else if (isFormInput) kind = 'text';
    else if (isButtonLike) kind = 'button';
    else if (isPlainLink) kind = 'link';
    else if (!isField) kind = 'section';
    else kind = 'text';

    // Pour kind=icon, on cible le <svg> ancêtre (target peut être un path/circle)
    if (kind === 'icon' && target.tagName !== 'svg' && target.tagName !== 'SVG') {
      const svg = target.closest('svg');
      if (svg) target = svg;
    }

    // Si le SVG n'a pas son propre data-edit-field, on scope l'édition d'icône
    // à la carte voisine (premier data-edit-field trouvé en remontant l'arbre,
    // dans la même section). Empêche un changement de couleur de se propager
    // à TOUTES les icônes de la section (ex: Features avec 6 icônes).
    if (kind === 'icon' && !field) {
      let scope = target.parentElement;
      while (scope && scope !== sectionEl) {
        const neighbor = scope.querySelector('[data-edit-field]');
        if (neighbor) {
          field = '_card:' + neighbor.getAttribute('data-edit-field');
          break;
        }
        scope = scope.parentElement;
      }
    }

    // Tabs visibles pour ce kind
    const visibleTabs = TABS.filter((t) => t.kinds.indexOf(kind) >= 0);
    let activeTab = visibleTabs[0] ? visibleTabs[0].id : null;

    const titleByKind = { section: 'Section', text: 'Texte', link: 'Lien', button: 'Bouton' };
    const titleLabel = (titleByKind[kind] || 'Élément') + (field ? ' · ' + field : '');

    const menu = document.createElement('div');
    menu.className = 'wp-ctx-menu wp-ctx-menu-large';
    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
    document.body.appendChild(menu);

    function renderField(f) {
      const id = 'wp-ctx-' + f.target + '-' + f.prop.replace(/[^a-z0-9]/gi, '');
      const el = elementForTarget(f.target, target, containerEl, sectionEl);
      const cs = el ? getComputedStyle(el) : null;

      if (f.type === 'color') {
        const cur = cs ? rgbToHex(cs[camelize(f.prop)] || cs.getPropertyValue(f.prop)) : '#000000';
        const sliderId = id + '-hue';
        const hexId = id + '-hex';
        // Label + swatch input color + champ hex éditable + slider hue arc-en-ciel.
        return '<div class="wp-ctx-color">'
          + '<div class="wp-ctx-color-top">'
          + '<span>' + f.label + '</span>'
          + '<span class="wp-ctx-color-controls">'
          + '<input type="color" class="wp-ctx-color-input" data-prop="' + propWithTarget(f.target, f.prop) + '" data-target="' + f.target + '" id="' + id + '" value="' + cur + '">'
          + '<input type="text" class="wp-ctx-color-hex" data-hex-for="' + id + '" id="' + hexId + '" value="' + cur + '" maxlength="7" spellcheck="false">'
          + '</span>'
          + '</div>'
          + '<input type="range" class="wp-ctx-hue" data-hue-for="' + id + '" id="' + sliderId + '" min="0" max="360" step="1" value="0">'
          + '</div>';
      }
      if (f.type === 'unit') {
        const num = cs ? parseCssNum(cs.getPropertyValue(f.prop) || cs[camelize(f.prop)]) : '';
        const step = f.step != null ? f.step : 1;
        const numberInput = '<input type="number" data-prop="' + propWithTarget(f.target, f.prop) + '" data-target="' + f.target + '" data-unit="' + (f.unit || '') + '" id="' + id + '" value="' + num + '" step="' + step + '"' + (f.min != null ? ' min="' + f.min + '"' : '') + (f.max != null ? ' max="' + f.max + '"' : '') + '>';
        const unitTxt = f.unit ? '<span class="wp-ctx-unit">' + f.unit + '</span>' : '';
        // Si slider:true ET min/max définis, on ajoute un input range qui
        // pilote l'input number (et inversement).
        if (f.slider && f.min != null && f.max != null) {
          const sliderInput = '<input type="range" class="wp-ctx-slider" data-slider-for="' + id + '" min="' + f.min + '" max="' + f.max + '" step="' + step + '" value="' + (num || f.min) + '">';
          return '<div class="wp-ctx-row wp-ctx-row-slider"><span>' + f.label + '</span><div class="wp-ctx-slider-wrap">' + sliderInput + '<span class="wp-ctx-unit-wrap wp-ctx-unit-wrap-small">' + numberInput + unitTxt + '</span></div></div>';
        }
        return '<label class="wp-ctx-row"><span>' + f.label + '</span><span class="wp-ctx-unit-wrap">' + numberInput + unitTxt + '</span></label>';
      }
      if (f.type === 'select') {
        const cur = cs ? (cs.getPropertyValue(f.prop) || '') : '';
        const opts = f.options.map((opt) => {
          const o = typeof opt === 'string' ? { label: opt, value: opt } : opt;
          const sel = o.value === cur ? ' selected' : '';
          return '<option value="' + o.value.replace(/"/g, '&quot;') + '"' + sel + '>' + o.label + '</option>';
        }).join('');
        return '<label class="wp-ctx-row"><span>' + f.label + '</span><select data-prop="' + propWithTarget(f.target, f.prop) + '" data-target="' + f.target + '" id="' + id + '">' + opts + '</select></label>';
      }
      if (f.type === 'group') {
        const cur = cs ? (cs.getPropertyValue(f.prop) || cs[camelize(f.prop)] || '') : '';
        // Map prop+value → SVG/glyph pour rendu visuel (au lieu du texte brut).
        // Tabler Icons style, stroke currentColor.
        const ICONS = {
          'text-align': {
            'left':    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="16" height="16"><path d="M4 6h16M4 12h10M4 18h13"/></svg>',
            'center':  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="16" height="16"><path d="M4 6h16M7 12h10M5 18h14"/></svg>',
            'right':   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="16" height="16"><path d="M4 6h16M10 12h10M7 18h13"/></svg>',
            'justify': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="16" height="16"><path d="M4 6h16M4 12h16M4 18h16"/></svg>',
          },
          'text-transform': {
            'none':       '<span style="font-family:Georgia,serif;font-size:14px;text-transform:none;">Ag</span>',
            'uppercase':  '<span style="font-family:Georgia,serif;font-size:13px;letter-spacing:0.5px;">AG</span>',
            'lowercase':  '<span style="font-family:Georgia,serif;font-size:14px;">ag</span>',
            'capitalize': '<span style="font-family:Georgia,serif;font-size:14px;">Ab</span>',
          },
          'text-decoration': {
            'none':         '<span style="font-family:Georgia,serif;font-size:14px;">Ag</span>',
            'underline':    '<span style="font-family:Georgia,serif;font-size:14px;text-decoration:underline;">Ag</span>',
            'line-through': '<span style="font-family:Georgia,serif;font-size:14px;text-decoration:line-through;">Ag</span>',
          },
          'font-weight': {
            'normal': '<span style="font-family:Georgia,serif;font-size:14px;font-weight:400;">Ag</span>',
            'bold':   '<span style="font-family:Georgia,serif;font-size:14px;font-weight:700;">Ag</span>',
            '700':    '<span style="font-family:Georgia,serif;font-size:14px;font-weight:700;">Ag</span>',
            '400':    '<span style="font-family:Georgia,serif;font-size:14px;font-weight:400;">Ag</span>',
          },
          'font-style': {
            'normal': '<span style="font-family:Georgia,serif;font-size:14px;">Ag</span>',
            'italic': '<span style="font-family:Georgia,serif;font-size:14px;font-style:italic;">Ag</span>',
          },
        };
        const iconMap = ICONS[f.prop];
        const opts = f.options.map((v) => {
          const active = v === cur ? ' active' : '';
          const icon = iconMap && iconMap[v];
          // Tooltip natif avec la valeur, icône en visuel, fallback texte
          const content = icon || v;
          return '<button type="button" class="wp-ctx-pill wp-ctx-pill-icon' + active + '" data-prop="' + propWithTarget(f.target, f.prop) + '" data-target="' + f.target + '" data-value="' + v + '" title="' + v + '" aria-label="' + v + '">' + content + '</button>';
        }).join('');
        return '<label class="wp-ctx-row"><span>' + f.label + '</span><span class="wp-ctx-group">' + opts + '</span></label>';
      }
      if (f.type === 'imageBg') {
        // Extrait l'URL actuelle du background-image (parse "url(...)")
        const el = elementForTarget(f.target, target, containerEl, sectionEl);
        const bg = el ? getComputedStyle(el).backgroundImage : '';
        const m = String(bg).match(/url\(["']?([^"')]+)["']?\)/);
        const cur = m ? m[1] : '';
        const labelTxt = cur ? 'Modifier image…' : 'Choisir image…';
        return '<label class="wp-ctx-row"><span>' + f.label + '</span><button type="button" id="wp-ctx-image-bg" class="wp-ctx-imagebg-btn">' + labelTxt + '</button></label>'
          + (cur ? '<div class="wp-ctx-preview-wrap"><img src="' + cur.replace(/"/g, '&quot;') + '" class="wp-ctx-preview" alt=""><button type="button" id="wp-ctx-image-bg-clear" class="wp-ctx-clear">×</button></div>' : '');
      }
      if (f.type === 'textarea') {
        // Pour un input/textarea de formulaire on édite le placeholder.
        // Pour les autres éléments, on édite le textContent classique.
        const isInpEl = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
        const cur = isInpEl
          ? (target.getAttribute('placeholder') || '')
          : (target.textContent || '').trim();
        const lbl = isInpEl ? 'Placeholder' : f.label;
        const isLong = cur.length > 60;
        const inputHtml = isLong
          ? '<textarea id="wp-ctx-textcontent" rows="4" class="wp-ctx-textarea">' + cur.replace(/</g, '&lt;') + '</textarea>'
          : '<input id="wp-ctx-textcontent" type="text" value="' + cur.replace(/"/g, '&quot;') + '" class="wp-ctx-input-text">';
        return '<label class="wp-ctx-row wp-ctx-row-col"><span>' + lbl + '</span>' + inputHtml + '</label>';
      }
      if (f.type === 'url') {
        const currentHref = containerEl ? (containerEl.getAttribute('href') || '') : '';
        const isSlug = (id2) => {
          if (!id2 || id2.length < 2 || id2.length > 40) return false;
          if (id2.startsWith('wp-') || id2 === 'root' || id2.indexOf(':') >= 0) return false;
          if (id2.length >= 32 && /[0-9a-f]{8}-/.test(id2)) return false;
          return /^[a-z][a-z0-9-]+$/.test(id2);
        };
        const anchorIds = Array.from(new Set(
          Array.from(document.querySelectorAll('[id]')).map((n) => n.getAttribute('id')).filter(isSlug)
        ));
        const chips = anchorIds.length
          ? '<div class="wp-ctx-anchors"><span class="wp-ctx-anchors-label">Ancres :</span> '
            + anchorIds.map((a) => '<button type="button" class="wp-ctx-anchor" data-anchor="#' + a + '">#' + a + '</button>').join('')
            + '</div>'
          : '';
        return '<label class="wp-ctx-row wp-ctx-link"><span>' + f.label + '</span><input type="url" id="wp-ctx-href" placeholder="https://… ou #ancre" value="' + currentHref.replace(/"/g, '&quot;') + '"></label>' + chips;
      }
      if (f.type === 'overlay') {
        // Parse l'éventuel box-shadow existant pour pré-remplir le picker.
        // Format attendu : "inset 0 0 0 9999px rgba(r,g,b,a)"
        const existing = cs ? String(cs.getPropertyValue('box-shadow') || '') : '';
        let curHex = '#000000';
        let curOpa = 0;
        const m = existing.match(/rgba?\\(\\s*(\\d+)[,\\s]+(\\d+)[,\\s]+(\\d+)(?:[,\\s/]+(\\d*\\.?\\d+))?\\s*\\)/);
        if (m && existing.indexOf('9999px') >= 0) {
          const r = parseInt(m[1], 10), g = parseInt(m[2], 10), b = parseInt(m[3], 10);
          curHex = '#' + [r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('');
          curOpa = m[4] != null ? parseFloat(m[4]) : 1;
        }
        const cId = id + '-overlay-color';
        const oId = id + '-overlay-opa';
        return '<div class="wp-ctx-overlay">'
          + '<div class="wp-ctx-color-top">'
          + '<span>' + f.label + '</span>'
          + '<span class="wp-ctx-color-controls">'
          + '<input type="color" class="wp-ctx-color-input wp-ctx-overlay-color" id="' + cId + '" value="' + curHex + '" data-overlay-pair="' + oId + '" data-overlay-prop="' + propWithTarget(f.target, f.prop) + '" data-overlay-target="' + f.target + '">'
          + '<input type="text" class="wp-ctx-color-hex" data-hex-for="' + cId + '" value="' + curHex + '" maxlength="7" spellcheck="false">'
          + '</span>'
          + '</div>'
          + '<div class="wp-ctx-row wp-ctx-row-slider"><span style="font-size:11px;color:rgb(148 163 184);">Intensité</span>'
          + '<div class="wp-ctx-slider-wrap">'
          + '<input type="range" class="wp-ctx-slider wp-ctx-overlay-opa" id="' + oId + '" min="0" max="1" step="0.05" value="' + curOpa + '" data-overlay-pair="' + cId + '" data-overlay-prop="' + propWithTarget(f.target, f.prop) + '" data-overlay-target="' + f.target + '">'
          + '<span class="wp-ctx-unit-wrap wp-ctx-unit-wrap-small"><input type="number" min="0" max="1" step="0.05" value="' + curOpa + '" class="wp-ctx-overlay-opa-num" data-overlay-pair-slider="' + oId + '"></span>'
          + '</div></div>'
          + '</div>';
      }
      if (f.type === 'image-replace') {
        const cur = (target && (target.tagName === 'IMG' || target.tagName === 'img'))
          ? (target.getAttribute('src') || '')
          : '';
        return '<div class="wp-ctx-image-replace">'
          + (cur
              ? '<img src="' + cur.replace(/"/g, '&quot;') + '" class="wp-ctx-preview-large" alt="" />'
              : '<div class="wp-ctx-no-image">Aucune image</div>')
          + '<button type="button" id="wp-ctx-image-replace" class="wp-ctx-imagebg-btn">'
          + (cur ? "Remplacer l’image…" : "Choisir une image…")
          + '</button>'
          + '</div>';
      }
      if (f.type === 'svg') {
        // Bibliothèque mini de presets Lucide-style (path d). On les rendra
        // en chips cliquables. L'utilisateur peut aussi coller un <path d="..."/>.
        const presets = [
          { name: 'check', d: 'M5 12l5 5 9-11' },
          { name: 'star', d: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z' },
          { name: 'heart', d: 'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 1 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z' },
          { name: 'arrow', d: 'M5 12h14M12 5l7 7-7 7' },
          { name: 'camera', d: 'M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2zM12 18a4 4 0 1 1 0-8 4 4 0 0 1 0 8z' },
          { name: 'mail', d: 'M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6' },
          { name: 'phone', d: 'M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72c.13 1 .37 1.95.7 2.81a2 2 0 0 1-.45 2.11L7.91 9a16 16 0 0 0 6 6l1.09-1.09a2 2 0 0 1 2.11-.45c.86.33 1.81.57 2.81.7A2 2 0 0 1 22 16.92z' },
          { name: 'home', d: 'M3 12l9-9 9 9M5 10v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V10' },
          { name: 'user', d: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z' },
          { name: 'settings', d: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z' },
        ];
        const chips = presets.map((p) =>
          '<button type="button" class="wp-ctx-icon-preset" data-svg-d="' + p.d + '" title="' + p.name + '">'
          + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><path d="' + p.d + '"/></svg>'
          + '</button>'
        ).join('');
        return '<label class="wp-ctx-row"><span>' + f.label + '</span></label>'
          + '<div class="wp-ctx-icon-grid">' + chips + '</div>'
          + '<label class="wp-ctx-row"><span>SVG path d</span><input type="text" id="wp-ctx-svg-d" placeholder="M5 12l5 5..." style="font-family: monospace; font-size: 10px;"></label>';
      }
      return '';
    }

    function camelize(p) {
      return p.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    }

    function render() {
      const tabsHtml = visibleTabs.map((t) =>
        '<button type="button" class="wp-ctx-tab' + (t.id === activeTab ? ' active' : '') + '" data-tab="' + t.id + '">' + t.label + '</button>'
      ).join('');
      const paneFields = FIELDS.filter((f) => f.tab === activeTab && f.kinds.indexOf(kind) >= 0);
      const paneHtml = paneFields.length
        ? paneFields.map(renderField).join('')
        : '<div class="wp-ctx-empty">Aucune option ici pour cet élément.</div>';
      menu.innerHTML =
        '<div class="wp-ctx-title">' + titleLabel + ' <span class="wp-ctx-section">(' + section + ')</span></div>'
        + '<div class="wp-ctx-tabs">' + tabsHtml + '</div>'
        + '<div class="wp-ctx-pane">' + paneHtml + '</div>'
        + '<button class="wp-ctx-close" id="wp-ctx-close">Fermer</button>';
      wire();
    }

    function commitEdit(propTargeted, value, applyDom) {
      applyDom();
      const key = buildElementKey(section, field, propTargeted);
      if (value === '' || value == null) edits.delete(key);
      else edits.set(key, value);
      refreshPerElementStyle();
      unsaved = edits.size + mutations.length; refreshSaveBtn();
    }

    function applyValue(target2, cssProp, value) {
      const el = elementForTarget(target2, target, containerEl, sectionEl);
      if (!el) return;
      if (value === '' || value == null) el.style.removeProperty(cssProp);
      else el.style.setProperty(cssProp, value, 'important');
    }

    function wire() {
      // Onglets
      menu.querySelectorAll('.wp-ctx-tab').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          activeTab = e.currentTarget.getAttribute('data-tab');
          render();
        });
      });
      // Inputs color + unit + select
      menu.querySelectorAll('input[type=color], input[type=number], select').forEach((inp) => {
        inp.addEventListener('input', (e) => {
          const elInp = e.currentTarget;
          const propT = elInp.getAttribute('data-prop');
          const target2 = elInp.getAttribute('data-target') || 'self';
          const unit = elInp.getAttribute('data-unit') || '';
          let v = elInp.value;
          const cssProp = (propT.indexOf('container-') === 0) ? propT.slice(10)
            : (propT.indexOf('section-') === 0) ? propT.slice(8)
            : (propT.indexOf('icon-') === 0) ? propT.slice(5) : propT;
          let cssVal = v;
          if (elInp.type === 'number') {
            if (v === '') { applyValue(target2, cssProp, ''); commitEdit(propT, '', () => {}); return; }
            cssVal = v + unit;
            // Si un slider est lié à ce number, synchronise sa position
            const linkedSlider = menu.querySelector('input[type=range][data-slider-for="' + elInp.id + '"]');
            if (linkedSlider) linkedSlider.value = v;
          }
          commitEdit(propT, cssVal, () => applyValue(target2, cssProp, cssVal));
        });
      });
      // Sliders (input range) : propagent leur valeur au number associé via
      // un event "input" simulé, ce qui re-utilise toute la logique ci-dessus.
      menu.querySelectorAll('input[type=range].wp-ctx-slider').forEach((sl) => {
        sl.addEventListener('input', (e) => {
          const slider = e.currentTarget;
          const targetId = slider.getAttribute('data-slider-for');
          const num = menu.querySelector('#' + targetId);
          if (!num) return;
          num.value = slider.value;
          num.dispatchEvent(new Event('input', { bubbles: true }));
        });
      });
      // Slider hue : convertit la position (0-360°) en couleur HSL (S=80% L=50%)
      // et propage à l'input color associé.
      function hslToHex(h, s, l) {
        s /= 100; l /= 100;
        const k = (n) => (n + h / 30) % 12;
        const a = s * Math.min(l, 1 - l);
        const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
        const toHex = (x) => Math.round(x * 255).toString(16).padStart(2, '0');
        return '#' + toHex(f(0)) + toHex(f(8)) + toHex(f(4));
      }
      menu.querySelectorAll('input[type=range].wp-ctx-hue').forEach((sl) => {
        sl.addEventListener('input', (e) => {
          const slider = e.currentTarget;
          const targetId = slider.getAttribute('data-hue-for');
          const colorInp = menu.querySelector('#' + targetId);
          if (!colorInp) return;
          colorInp.value = hslToHex(parseInt(slider.value, 10), 80, 50);
          colorInp.dispatchEvent(new Event('input', { bubbles: true }));
        });
      });
      // Input hex texte : valide qu'on a un hex propre (#rgb ou #rrggbb)
      // puis met à jour l'input color (qui déclenche la chaîne d'updates).
      menu.querySelectorAll('input.wp-ctx-color-hex').forEach((hex) => {
        hex.addEventListener('input', (e) => {
          let v = e.currentTarget.value.trim();
          if (v && v[0] !== '#') v = '#' + v;
          // #rgb → #rrggbb pour rester compatible avec l'input color natif
          if (/^#[0-9a-f]{3}$/i.test(v)) v = '#' + v[1] + v[1] + v[2] + v[2] + v[3] + v[3];
          if (!/^#[0-9a-f]{6}$/i.test(v)) return; // attend que ce soit valide
          const targetId = e.currentTarget.getAttribute('data-hex-for');
          const colorInp = menu.querySelector('#' + targetId);
          if (!colorInp) return;
          colorInp.value = v.toLowerCase();
          colorInp.dispatchEvent(new Event('input', { bubbles: true }));
        });
      });
      // Quand l'input color change (via picker natif, swatches ou hue), on
      // synchronise aussi le champ hex texte pour qu'il reflète la couleur.
      menu.querySelectorAll('input[type=color].wp-ctx-color-input').forEach((inp) => {
        inp.addEventListener('input', (e) => {
          const colorInp = e.currentTarget;
          const hexInp = menu.querySelector('input.wp-ctx-color-hex[data-hex-for="' + colorInp.id + '"]');
          if (hexInp) hexInp.value = colorInp.value;
        });
      });
      // Boutons "pill" (group)
      menu.querySelectorAll('.wp-ctx-pill').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          const elBtn = e.currentTarget;
          const propT = elBtn.getAttribute('data-prop');
          const target2 = elBtn.getAttribute('data-target') || 'self';
          const v = elBtn.getAttribute('data-value');
          const cssProp = (propT.indexOf('container-') === 0) ? propT.slice(10)
            : (propT.indexOf('section-') === 0) ? propT.slice(8)
            : (propT.indexOf('icon-') === 0) ? propT.slice(5) : propT;
          // toggle active visuel
          menu.querySelectorAll('.wp-ctx-pill[data-prop="' + propT + '"]').forEach((b) => b.classList.remove('active'));
          elBtn.classList.add('active');
          commitEdit(propT, v, () => applyValue(target2, cssProp, v));
        });
      });
      // Texte du contenu (onglet Contenu) : modifie textContent du field
      // (ou placeholder pour input/textarea). Persistance via une mutation
      // dédiée si c'est un input form (pas de data-edit-field source).
      const textInput = menu.querySelector('#wp-ctx-textcontent');
      if (textInput) {
        const isInpEl = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
        // Field "synthétique" : contient un _ ou commence par _ → pas de prop JSX
        // correspondante (élément ajouté au runtime, _eyebrow cosmétique, etc.).
        // Persistance via mutation text-content, pas via JSX patch.
        const isSynthetic = field && (field.indexOf('_') >= 0);
        const applyText = (raw) => {
          const newVal = String(raw || '');
          if (isInpEl) {
            target.setAttribute('placeholder', newVal);
            const inpName = target.getAttribute('name') || '';
            for (let i = mutations.length - 1; i >= 0; i--) {
              const mu = mutations[i];
              if (mu.op === 'form-input-placeholder' && mu.section === section && mu.inputName === inpName) {
                mutations.splice(i, 1);
              }
            }
            mutations.push({ op: 'form-input-placeholder', section: section, inputName: inpName, value: newVal });
            unsaved = edits.size + mutations.length; refreshSaveBtn();
          } else {
            target.textContent = newVal;
            if (!field) {
              unsaved = edits.size + mutations.length; refreshSaveBtn();
              return;
            }
            if (isSynthetic) {
              // Runtime persistance : mutation text-content dédupée par section+field
              for (let i = mutations.length - 1; i >= 0; i--) {
                const mu = mutations[i];
                if (mu.op === 'text-content' && mu.section === section && mu.field === field) {
                  mutations.splice(i, 1);
                }
              }
              mutations.push({ op: 'text-content', section: section, field: field, value: newVal });
              unsaved = edits.size + mutations.length; refreshSaveBtn();
            } else {
              // Field source → JSX patch via edits Map
              const key = section + '.' + field;
              if (newVal.trim()) edits.set(key, newVal);
              else edits.delete(key);
              unsaved = edits.size + mutations.length; refreshSaveBtn();
            }
          }
        };
        textInput.addEventListener('input', (e) => applyText(e.target.value));
      }
      // URL input
      const hrefInput = menu.querySelector('#wp-ctx-href');
      if (hrefInput) {
        const applyHref = (raw) => {
          const v = (raw || '').trim();
          applyLinkToElement(target, v);
          const key = buildElementKey(section, field, 'href');
          if (v) edits.set(key, v); else edits.delete(key);
          unsaved = edits.size + mutations.length; refreshSaveBtn();
        };
        hrefInput.addEventListener('change', (e) => applyHref(e.target.value));
        menu.querySelectorAll('.wp-ctx-anchor').forEach((btn) => {
          btn.addEventListener('click', (e) => {
            e.preventDefault();
            const anchor = e.currentTarget.getAttribute('data-anchor');
            hrefInput.value = anchor;
            applyHref(anchor);
          });
        });
      }
      // Remplacer le SVG par un preset ou un path d
      function applySvgPath(d) {
        if (!d || target.tagName !== 'svg' && target.tagName !== 'SVG') return;
        // Vide le svg et insère un nouveau <path>
        target.setAttribute('viewBox', target.getAttribute('viewBox') || '0 0 24 24');
        target.innerHTML = '<path d="' + d.replace(/"/g, '&quot;') + '"/>';
        // Persiste via le préfixe svg- (CSS-only ne marche pas pour ça, on
        // stocke le path d dans la link map en abusant un peu — utilisera un
        // futur "shape map" si besoin). Pour l'instant : DOM uniquement.
        // (TODO: ajouter une vraie persistance pour le SVG path.)
      }
      menu.querySelectorAll('.wp-ctx-icon-preset').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          const d = e.currentTarget.getAttribute('data-svg-d');
          applySvgPath(d);
          const dInput = menu.querySelector('#wp-ctx-svg-d');
          if (dInput) dInput.value = d;
        });
      });
      const svgDInput = menu.querySelector('#wp-ctx-svg-d');
      if (svgDInput) svgDInput.addEventListener('change', (e) => applySvgPath(e.target.value));

      // Image de fond : ouvre le modal upload/URL/IA, applique en CSS background-image
      function applyBgImage(url) {
        if (url) {
          sectionEl.style.setProperty('background-image', 'url("' + url.replace(/"/g, '\\\\"') + '")', 'important');
          sectionEl.style.setProperty('background-size', 'cover', 'important');
          sectionEl.style.setProperty('background-position', 'center', 'important');
          const key = buildElementKey(section, null, 'background-image');
          edits.set(key, 'url("' + url + '")');
        } else {
          sectionEl.style.removeProperty('background-image');
          const key = buildElementKey(section, null, 'background-image');
          edits.delete(key);
        }
        refreshPerElementStyle();
        unsaved = edits.size + mutations.length; refreshSaveBtn();
        render();
      }
      const bgBtn = menu.querySelector('#wp-ctx-image-bg');
      if (bgBtn) {
        bgBtn.addEventListener('click', (e) => {
          e.preventDefault();
          const bg = getComputedStyle(sectionEl).backgroundImage;
          const m = String(bg).match(/url\\(["']?([^"')]+)["']?\\)/);
          const cur = m ? m[1] : '';
          openImageModal(null, null, {
            title: 'Image de fond de section',
            currentUrl: cur,
            applyLabel: 'Appliquer',
            onApply: (url) => applyBgImage(url),
          });
        });
      }
      const bgClear = menu.querySelector('#wp-ctx-image-bg-clear');
      if (bgClear) {
        bgClear.addEventListener('click', (e) => { e.preventDefault(); applyBgImage(''); });
      }

      // Overlay : un VRAI voile coloré au-dessus de l'image. Chrome ne rend pas
      // box-shadow inset sur <img>, donc on wrap l'img dans un <span> avec un
      // sibling <span> absolu en superposition. Persistance via mutation
      // 'image-overlay' (rejouée au runtime sur la prochaine ouverture).
      function applyImageOverlay(imgEl, rgba) {
        if (!imgEl || (imgEl.tagName !== 'IMG' && imgEl.tagName !== 'img')) return;
        const field = imgEl.getAttribute('data-edit-field') || '';
        const cs = getComputedStyle(imgEl);
        const isAbs = cs.position === 'absolute' || cs.position === 'fixed';

        if (isAbs) {
          // Mode "img absolu" (Hero, ServiceTiles…) : on ajoute un sibling
          // avec la même positioning. PAS de wrap, qui casserait le layout.
          const parent = imgEl.parentNode;
          if (!parent) return;
          let veil = parent.querySelector(':scope > .wp-veil[data-veil-for="' + field + '"]');
          if (!rgba) {
            if (veil) veil.remove();
            return;
          }
          if (!veil) {
            veil = document.createElement('span');
            veil.className = 'wp-veil';
            veil.setAttribute('data-veil-for', field);
            veil.setAttribute('aria-hidden', 'true');
            // Copie la position de l'img pour couvrir EXACTEMENT la même zone
            veil.style.cssText = 'position:' + cs.position
              + ';top:' + cs.top + ';right:' + cs.right
              + ';bottom:' + cs.bottom + ';left:' + cs.left
              + ';width:' + cs.width + ';height:' + cs.height
              + ';pointer-events:none;';
            // Insère JUSTE après l'img pour rester sous les autres overlays
            imgEl.parentNode.insertBefore(veil, imgEl.nextSibling);
          }
          veil.style.backgroundColor = rgba;
          return;
        }

        // Mode "img en flow normal" (élément inséré via la lib) : wrap.
        let wrap = imgEl.parentElement;
        const isWrap = wrap && wrap.classList && wrap.classList.contains('wp-veil-wrap');
        if (!rgba) {
          if (isWrap) {
            const veil = wrap.querySelector(':scope > .wp-veil');
            if (veil) veil.remove();
            wrap.parentNode.insertBefore(imgEl, wrap);
            wrap.remove();
          }
          return;
        }
        if (!isWrap) {
          const newWrap = document.createElement('span');
          newWrap.className = 'wp-veil-wrap';
          newWrap.style.cssText = 'position:relative;display:inline-block;line-height:0;';
          imgEl.parentNode.insertBefore(newWrap, imgEl);
          newWrap.appendChild(imgEl);
          wrap = newWrap;
        }
        let veil = wrap.querySelector(':scope > .wp-veil');
        if (!veil) {
          veil = document.createElement('span');
          veil.className = 'wp-veil';
          veil.style.cssText = 'position:absolute;inset:0;pointer-events:none;';
          wrap.appendChild(veil);
        }
        veil.style.backgroundColor = rgba;
      }

      function applyOverlay(menuEl) {
        const colorInp = menuEl.querySelector('input.wp-ctx-overlay-color');
        const opaInp = menuEl.querySelector('input.wp-ctx-overlay-opa');
        if (!colorInp || !opaInp) return;
        const hex = colorInp.value || '#000000';
        const opa = parseFloat(opaInp.value || '0');
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        const rgba = (opa <= 0) ? '' : 'rgba(' + r + ',' + g + ',' + b + ',' + opa + ')';
        // 1) Visuel : wrap/voile sur l'img
        applyImageOverlay(target, rgba);
        // 2) Persistance : mutation image-overlay (dédupe par section+field)
        const fieldName = target.getAttribute('data-edit-field') || '';
        // Retire les éventuelles mutations overlay précédentes sur ce field
        for (let i = mutations.length - 1; i >= 0; i--) {
          const mu = mutations[i];
          if (mu.op === 'image-overlay' && mu.section === section && mu.field === fieldName) {
            mutations.splice(i, 1);
          }
        }
        if (rgba) {
          mutations.push({ op: 'image-overlay', section: section, field: fieldName, value: rgba });
        } else {
          // Stocke une mutation "vide" pour effacer un overlay précédent
          mutations.push({ op: 'image-overlay', section: section, field: fieldName, value: '' });
        }
        unsaved = edits.size + mutations.length;
        refreshSaveBtn();
      }
      menu.querySelectorAll('input.wp-ctx-overlay-color, input.wp-ctx-overlay-opa').forEach((inp) => {
        inp.addEventListener('input', () => applyOverlay(menu));
      });
      // Num input du % d'opacité (synchronise avec le slider)
      menu.querySelectorAll('input.wp-ctx-overlay-opa-num').forEach((num) => {
        num.addEventListener('input', (e) => {
          const sliderId = e.currentTarget.getAttribute('data-overlay-pair-slider');
          const slider = menu.querySelector('#' + sliderId);
          if (!slider) return;
          slider.value = e.currentTarget.value;
          applyOverlay(menu);
        });
      });
      // Slider → num input (sync visuel)
      menu.querySelectorAll('input.wp-ctx-overlay-opa').forEach((sl) => {
        sl.addEventListener('input', (e) => {
          const num = menu.querySelector('input.wp-ctx-overlay-opa-num[data-overlay-pair-slider="' + e.currentTarget.id + '"]');
          if (num) num.value = e.currentTarget.value;
        });
      });

      // Bouton "Remplacer l'image" dans l'onglet Image : ouvre le modal
      // existant (URL / upload / IA) sur l'élément <img> cible.
      const replaceBtn = menu.querySelector('#wp-ctx-image-replace');
      if (replaceBtn) {
        replaceBtn.addEventListener('click', (e) => {
          e.preventDefault();
          if (!target || (target.tagName !== 'IMG' && target.tagName !== 'img')) return;
          const fieldName = target.getAttribute('data-edit-field') || '';
          const key = section + '.' + fieldName;
          // Ferme le popup et ouvre le modal image
          menu.remove();
          openImageModal(target, key);
        });
      }

      // Fermer
      const closeBtn = menu.querySelector('#wp-ctx-close');
      if (closeBtn) closeBtn.addEventListener('click', () => menu.remove());
    }

    render();

    // Repositionne le menu pour qu'il ne déborde jamais : flip à gauche
    // si pas la place à droite, idem verticalement. À ne faire qu'une fois
    // à l'ouverture (pas à chaque changement d'onglet, sinon le popup
    // saute pendant qu'on l'utilise).
    (function clampMenuPosition() {
      const w = menu.offsetWidth;
      const h = menu.offsetHeight;
      const sx = window.scrollX;
      const sy = window.scrollY;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      let left = parseFloat(menu.style.left) || x;
      let top = parseFloat(menu.style.top) || y;
      if (left + w > sx + vw - 8) {
        const flipped = x - w - 8;
        left = flipped >= sx + 8 ? flipped : Math.max(sx + 8, sx + vw - w - 8);
      }
      if (top + h > sy + vh - 8) {
        const flipped = y - h - 8;
        top = flipped >= sy + 8 ? flipped : Math.max(sy + 8, sy + vh - h - 8);
      }
      left = Math.max(sx + 8, left);
      top = Math.max(sy + 8, top);
      menu.style.left = left + 'px';
      menu.style.top = top + 'px';
    })();

    // Drag du menu via la barre de titre. On délègue depuis le menu pour
    // que ça continue de marcher après chaque re-render (innerHTML détruit
    // les listeners). On suspend le closer global pendant le drag.
    menu.addEventListener('mousedown', (e) => {
      const handle = e.target instanceof Element ? e.target.closest('.wp-ctx-title') : null;
      if (!handle || !menu.contains(handle)) return;
      e.preventDefault();
      e.stopPropagation();
      const startX = e.clientX;
      const startY = e.clientY;
      const startLeft = parseFloat(menu.style.left) || 0;
      const startTop = parseFloat(menu.style.top) || 0;
      menu.style.transition = 'none';
      function onMove(ev) {
        const nl = startLeft + (ev.clientX - startX);
        const nt = startTop + (ev.clientY - startY);
        // Clamp dans la fenêtre (avec marge de 8px)
        const w = menu.offsetWidth;
        const h = menu.offsetHeight;
        const sx = window.scrollX;
        const sy = window.scrollY;
        const minL = sx + 8;
        const maxL = sx + window.innerWidth - w - 8;
        const minT = sy + 8;
        const maxT = sy + window.innerHeight - h - 8;
        menu.style.left = Math.max(minL, Math.min(maxL, nl)) + 'px';
        menu.style.top = Math.max(minT, Math.min(maxT, nt)) + 'px';
      }
      function onUp() {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      }
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });

    // Flag pour suspendre le closer pendant une nav carrousel programmatique
    let skipCloser = false;
    menu.__wpSkipCloser = (fn) => { skipCloser = true; try { fn(); } finally { setTimeout(() => { skipCloser = false; }, 0); } };

    setTimeout(() => {
      const closer = (ev) => {
        if (skipCloser) return;
        if (!menu.contains(ev.target)) { menu.remove(); document.removeEventListener('click', closer, true); }
      };
      document.addEventListener('click', closer, true);
    }, 0);
  }

  // Wrappe l'élément dans un <a> (ou met à jour le <a> parent existant) avec
  // la nouvelle URL. Si url est vide, retire le <a> wrapping (s'il a été créé
  // par l'éditeur — détecté via data-wp-link-wrapper).
  // Externe (http(s)://, //) → _blank ; ancre (#) ou relatif → même fenêtre.
  function isExternalUrl(url) {
    return /^(https?:)?\/\//i.test(url);
  }
  function applyLinkToElement(el, url) {
    const parent = el.closest('a');
    if (url) {
      const external = isExternalUrl(url);
      if (parent) {
        parent.setAttribute('href', url);
        if (external) parent.setAttribute('target', '_blank');
        else parent.removeAttribute('target');
      } else {
        const a = document.createElement('a');
        a.setAttribute('href', url);
        if (external) a.setAttribute('target', '_blank');
        a.setAttribute('data-wp-link-wrapper', '1');
        el.parentNode.insertBefore(a, el);
        a.appendChild(el);
      }
    } else if (parent && parent.getAttribute('data-wp-link-wrapper') === '1') {
      // unwrap : on remet l'élément à la place du <a>
      const grand = parent.parentNode;
      grand.insertBefore(el, parent);
      grand.removeChild(parent);
    } else if (parent) {
      parent.removeAttribute('href');
    }
  }

  // Routage unique pour clic-droit ET clic sur le crayon flottant.
  // Sélectionne quel popup ouvrir selon l'élément ciblé.
  function routeEditAction(t, x, y) {
    if (!(t instanceof Element)) return;

    // Helper : détecte si une section est de type HeroSlider (originale ou
    // ajoutée via le picker, ex. "HeroSlider_xxx"). Seul cas où le picker
    // de slides remplace l'éditeur d'image individuelle.
    function isCarouselSection(secEl) {
      if (!secEl) return false;
      const name = secEl.getAttribute('data-edit-section') || '';
      return name === 'HeroSlider' || name.indexOf('HeroSlider_') === 0;
    }

    // Input / textarea / select / élément quelconque DANS un <form> →
    // ouvre le FORM MANAGER (popup unifié pour gérer tout le formulaire).
    const formCtx = t.closest && t.closest('form');
    if (formCtx && formCtx.closest('[data-edit-section]')) {
      openFormManager(formCtx);
      return;
    }
    if ((t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')
        && t.getAttribute && t.getAttribute('type') !== 'hidden'
        && t.closest('[data-edit-section]')) {
      openColorMenu(t, x, y);
      return;
    }

    // Image cliquée directement : si elle est dans un HeroSlider, on ouvre
    // le picker de slides. Sinon (Gallery, ServiceTiles, etc.) on ouvre
    // l'éditeur de l'image survolée précisément.
    if (t.tagName === 'IMG' && t.hasAttribute('data-edit-field')) {
      const parentSection = t.closest('[data-edit-section]');
      if (isCarouselSection(parentSection)) {
        openCarouselPicker(parentSection);
        return;
      }
      openColorMenu(t, x, y);
      return;
    }
    // SVG / icon
    const svg = t.closest('svg');
    const insideEditSection = t.closest('[data-edit-section]');
    if (svg && insideEditSection) {
      openColorMenu(svg, x, y);
      return;
    }
    // <a>/<button> : si data-edit-field intérieur → cible l'inner field.
    // Sinon, si "button-like" (bg-*/border-*) → on cible le wrapper lui-même
    // pour permettre l'édition des styles bouton (couleur de fond, padding…).
    const interactive = t.closest('a, button');
    if (interactive && interactive.closest('[data-edit-section]')) {
      const innerField = interactive.querySelector('[data-edit-field]');
      if (innerField) {
        openColorMenu(innerField, x, y);
        return;
      }
      const iClasses = String(interactive.className || '').split(' ');
      const iButtonLike = interactive.tagName === 'BUTTON'
        || iClasses.some(function (c) { return c.indexOf('bg-') === 0 || c.indexOf('border-') === 0; });
      if (iButtonLike) {
        openColorMenu(interactive, x, y);
        return;
      }
    }
    // Sinon : data-edit-field direct, sinon section
    const field = t.closest('[data-edit-field]');
    const section = t.closest('[data-edit-section]');
    if (!field && !section) return;
    // Carrousel : seulement pour HeroSlider, pas pour les autres sections
    if (!field && section && isCarouselSection(section)) {
      openCarouselPicker(section);
      return;
    }
    openColorMenu(field || section, x, y);
  }

  // (Le clic droit a été retiré au profit du crayon flottant. Le menu
  // natif du navigateur reste disponible — utile pour Inspect Element, etc.)

  // ── Crayon flottant au survol ────────────────────────────────
  // Quand la souris survole un élément éditable, affiche un bouton crayon
  // au coin top-right. Clic sur le crayon = ouvre le popup d'édition
  // (équivalent au clic droit, mais plus discoverable).
  const pencilBtn = document.createElement('button');
  pencilBtn.className = 'wp-edit-pencil';
  pencilBtn.setAttribute('type', 'button');
  pencilBtn.setAttribute('aria-label', "Éditer cet élément");
  pencilBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
  pencilBtn.style.display = 'none';
  document.body.appendChild(pencilBtn);

  let pencilTarget = null;
  let pencilHideTimer = null;

  function findEditableTarget(el) {
    if (!(el instanceof Element)) return null;
    // Si on hover un <img data-edit-field> dans un carrousel, on cible quand
    // même l'img (route ouvrira le picker).
    if (el.tagName === 'IMG' && el.hasAttribute('data-edit-field')) return el;
    // Élément à l'intérieur d'un <form> dans une section éditable :
    // on cible le FORM entier (un seul crayon pour gérer tout le formulaire).
    const enclosingForm = el.closest('form');
    if (enclosingForm && enclosingForm.closest('[data-edit-section]')) {
      return enclosingForm;
    }
    // Inputs / textarea hors form (rare) : éditables individuellement
    if ((el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')
        && el.closest('[data-edit-section]')
        && el.getAttribute('type') !== 'hidden') {
      return el;
    }
    // Priorité 1 : un data-edit-field direct (h3, p, span). Cas typique :
    // carte ServiceTiles dont le <a> wrap contient un h3 — on doit pouvoir
    // cibler le texte précis et non la carte entière.
    const field = el.closest('[data-edit-field]');
    if (field) return field;
    // Priorité 2 : un <svg> (icône)
    const svg = el.closest('svg');
    if (svg && svg.closest('[data-edit-section]')) return svg;
    // Priorité 3 : un <a>/<button> CTA. On accepte deux cas :
    //   - il contient un data-edit-field (cas standard)
    //   - il est "button-like" (bg-* / border-* / <button>) ET dans une section
    //     éditable. Couvre les CTAs qui n'ont pas de span data-edit-field
    //     intérieur (ex: text direct dans <a class="bg-primary">).
    const interactive = el.closest('a, button');
    if (interactive) {
      if (interactive.querySelector('[data-edit-field]')) return interactive;
      const iClasses = String(interactive.className || '').split(' ');
      const iButtonLike = interactive.tagName === 'BUTTON'
        || iClasses.some(function (c) { return c.indexOf('bg-') === 0 || c.indexOf('border-') === 0; });
      if (iButtonLike && interactive.closest('[data-edit-section]')) return interactive;
    }
    // Fallback : la section entière
    return el.closest('[data-edit-section]');
  }

  // Cible "visuelle" pour l'outline/positionnement/suppression. Si pencilTarget
  // est un texte (data-edit-field) à l'intérieur d'un <a>/<button> qui est
  // visuellement un bouton (background ou border explicite, ou <button>),
  // on retourne le wrapper — la toolbar et le surlignage encadrent ainsi le
  // bouton entier, pas juste le texte intérieur. ✎ ouvre quand même le popup
  // du texte (routeEditAction gère ça via interactive.querySelector).
  function getVisualTarget(el) {
    if (!el || !(el instanceof Element)) return el;
    // Sections, images, svg → eux-mêmes
    if (el.hasAttribute('data-edit-section')) return el;
    if (el.tagName === 'IMG' || el.tagName === 'svg' || el.tagName === 'SVG') return el;
    const interactive = el.closest('a, button');
    if (!interactive || interactive === el || !interactive.contains(el)) return el;
    // Détection "button-like" via split sur l'espace simple (les regex avec
    // \\s ne survivent pas au pipeline TS-template → regen brut). Les classNames
    // Tailwind sont séparés par des espaces simples, donc split(' ') marche.
    const classes = String(interactive.className || '').split(' ');
    const isButtonLike = interactive.tagName === 'BUTTON'
      || classes.some(function (c) { return c.indexOf('bg-') === 0 || c.indexOf('border-') === 0; });
    return isButtonLike ? interactive : el;
  }

  function positionPencil(el) {
    // Délègue à positionEditTools : les 3 boutons (×, ✎, +) sont placés
    // côte à côte en bas-centre de l'élément, comme une toolbar unique.
    if (el !== pencilTarget) pencilTarget = el;
    positionEditTools();
  }

  document.addEventListener('mouseover', (e) => {
    // Ignore si la souris est sur le crayon / × / + ou dans un popup éditeur
    if (e.target === pencilBtn || (e.target instanceof Element && (e.target.closest('.wp-edit-pencil') || e.target.closest('.wp-edit-del') || e.target.closest('.wp-edit-add') || e.target.closest('.wp-editor-bar') || e.target.closest('.wp-ctx-menu') || e.target.closest('.wp-carousel-picker') || e.target.closest('.wp-img-modal') || e.target.closest('.wp-section-picker') || e.target.closest('.wp-element-picker')))) {
      clearTimeout(pencilHideTimer);
      return;
    }
    const target = findEditableTarget(e.target);
    if (target) {
      // Toujours annuler le timer de disparition tant qu'on est sur un éditable,
      // même si c'est la même cible que précédemment (mouseover bubble depuis
      // les enfants → ne pas annuler causerait un flicker).
      clearTimeout(pencilHideTimer);
      if (target !== pencilTarget) {
        // Si on a déjà ciblé un sous-élément précis (texte, image, bouton…) et
        // que le nouveau target est juste la SECTION qui le contient (cas où
        // la souris passe au-dessus du padding ou du bg du card en route vers
        // la toolbar), on ne change pas — sinon la toolbar saute au bord bas
        // de la section et l'utilisateur ne peut plus cliquer le crayon.
        const newIsSection = target.hasAttribute && target.hasAttribute('data-edit-section');
        const curIsSpecific = pencilTarget && !(pencilTarget.hasAttribute && pencilTarget.hasAttribute('data-edit-section'));
        if (newIsSection && curIsSpecific && target.contains(pencilTarget)) {
          return;
        }
        pencilTarget = target;
        positionPencil(target);
        // Démarre la boucle RAF pour suivre les animations framer-motion
        // (whileHover translate, etc.) qui décalent l'élément après le hover.
        startPositionLoop();
      }
    }
  });

  document.addEventListener('mouseout', (e) => {
    // Seulement programmer la disparition si on sort vraiment du document
    // ou vers un élément non éditable. mouseout bubble depuis les enfants
    // donc on doit vérifier la relatedTarget pour éviter le flicker.
    const to = e.relatedTarget;
    if (to instanceof Element) {
      // On reste dans le crayon / × / + ou un popup → ne pas cacher
      if (to === pencilBtn || to.closest('.wp-edit-pencil') || to.closest('.wp-edit-del') || to.closest('.wp-edit-add') || to.closest('.wp-editor-bar') || to.closest('.wp-ctx-menu') || to.closest('.wp-carousel-picker') || to.closest('.wp-img-modal') || to.closest('.wp-section-picker') || to.closest('.wp-element-picker')) return;
      // On reste à l'intérieur d'un éditable (même ou différent) → mouseover s'en chargera
      if (findEditableTarget(to)) return;
    }
    clearTimeout(pencilHideTimer);
    pencilHideTimer = setTimeout(() => {
      pencilBtn.style.display = 'none';
      hideDelAdd();
      pencilTarget = null;
    }, 400);
  });

  pencilBtn.addEventListener('mouseenter', () => { clearTimeout(pencilHideTimer); });
  pencilBtn.addEventListener('mouseleave', () => {
    pencilHideTimer = setTimeout(() => {
      pencilBtn.style.display = 'none';
      hideDelAdd();
      pencilTarget = null;
    }, 400);
  });

  pencilBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!pencilTarget) return;
    routeEditAction(pencilTarget, e.pageX, e.pageY);
    pencilBtn.style.display = 'none';
    hideDelAdd();
    pencilTarget = null;
  });

  // Repositionner le crayon au scroll/resize si visible
  window.addEventListener('scroll', () => { if (pencilTarget) positionPencil(pencilTarget); }, true);
  window.addEventListener('resize', () => { if (pencilTarget) positionPencil(pencilTarget); });

  // ── Boutons × (supprimer) et + (ajouter) au survol ─────────────
  // ×/+ partagent la cible du crayon (pencilTarget) : un data-edit-field
  // (titre, texte, image, bouton, icône) OU une section. × supprime, +
  // ouvre la bibliothèque appropriée (éléments si on est sur un field,
  // sections si on est sur une section).
  const mutations = [];

  const delBtn = document.createElement('button');
  delBtn.className = 'wp-edit-del';
  delBtn.setAttribute('type', 'button');
  delBtn.setAttribute('aria-label', 'Supprimer');
  delBtn.textContent = '×';
  delBtn.style.display = 'none';
  document.body.appendChild(delBtn);

  const addBtn = document.createElement('button');
  addBtn.className = 'wp-edit-add';
  addBtn.setAttribute('type', 'button');
  addBtn.setAttribute('aria-label', 'Ajouter');
  addBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>';
  addBtn.style.display = 'none';
  document.body.appendChild(addBtn);

  function positionEditTools() {
    // Place les 3 boutons (× ✎ +) côte à côte en bas-centre de pencilTarget,
    // comme une toolbar. Clamp dans le viewport pour les éléments qui
    // débordent (sections hautes).
    if (!pencilTarget) {
      delBtn.style.display = 'none';
      pencilBtn.style.display = 'none';
      addBtn.style.display = 'none';
      document.querySelectorAll('[data-wp-hovered]').forEach((n) => n.removeAttribute('data-wp-hovered'));
      return;
    }
    // Utilise la cible "visuelle" pour le positionnement : un texte dans un
    // bouton se voit encadré par le bouton entier.
    const el = getVisualTarget(pencilTarget);
    // Outline JS-driven : on marque l'élément visé avec data-wp-hovered. Une
    // règle CSS unique applique l'outline, quel que soit le type d'élément
    // (text, image, bouton wrapper, section). Plus robuste que des sélecteurs
    // CSS par cas (button:has(...), a[class*=" bg-"]:has(...), etc.).
    document.querySelectorAll('[data-wp-hovered]').forEach((n) => {
      if (n !== el) n.removeAttribute('data-wp-hovered');
    });
    if (el && el.setAttribute) el.setAttribute('data-wp-hovered', '1');
    const rect = el.getBoundingClientRect();
    const sx = window.scrollX;
    const sy = window.scrollY;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    // Définit un aria-label distinct selon le type (section ou élément).
    // Pas de texte visible : juste l'icône + dans un bouton carré.
    const isSection = el.hasAttribute && el.hasAttribute('data-edit-section');
    const isForm = el.tagName === 'FORM';
    addBtn.setAttribute('aria-label', isSection ? 'Ajouter une section' : 'Ajouter un élément');
    addBtn.setAttribute('title', isSection ? 'Ajouter une section' : 'Ajouter un élément');
    pencilBtn.setAttribute('title', isForm ? 'Gérer le formulaire' : 'Éditer cet élément');
    // Affiche pour pouvoir mesurer les dimensions réelles. Pour un FORM,
    // on n'expose que le crayon (gestion via le Form Manager unifié).
    delBtn.style.display = isForm ? 'none' : 'flex';
    pencilBtn.style.display = 'flex';
    addBtn.style.display = isForm ? 'none' : 'flex';
    if (isForm) pencilBtn.classList.add('wp-edit-pencil-solo');
    else pencilBtn.classList.remove('wp-edit-pencil-solo');
    const dw = isForm ? 0 : (delBtn.offsetWidth || 32);
    const aw = isForm ? 0 : (addBtn.offsetWidth || 32);
    const pw = pencilBtn.offsetWidth || 32;
    const h = Math.max(delBtn.offsetHeight, pencilBtn.offsetHeight, addBtn.offsetHeight) || 32;
    const gap = 0;
    // Ordre : ×  +  ✎  (suppression à gauche, ajout au centre, édition à droite)
    const total = dw + gap + aw + gap + pw;
    let leftStart = rect.left + (rect.width / 2) - (total / 2);
    leftStart = Math.max(8, Math.min(leftStart, vw - total - 8));
    let topY;
    if (rect.bottom > vh - 4 || rect.height > vh) {
      topY = vh - h - 12;
    } else if (rect.bottom < h) {
      topY = 8;
    } else {
      topY = rect.bottom - (h / 2);
    }
    const pageTop = sy + topY;
    delBtn.style.top = pageTop + 'px';
    delBtn.style.left = (sx + leftStart) + 'px';
    addBtn.style.top = pageTop + 'px';
    addBtn.style.left = (sx + leftStart + dw + gap) + 'px';
    pencilBtn.style.top = pageTop + 'px';
    pencilBtn.style.left = (sx + leftStart + dw + gap + aw + gap) + 'px';
  }

  // Cache × et + en même temps que le crayon
  function hideDelAdd() {
    delBtn.style.display = 'none';
    addBtn.style.display = 'none';
    if (positionRAF) { cancelAnimationFrame(positionRAF); positionRAF = null; }
  }

  // Boucle de re-positionnement : framer-motion (whileHover, transitions)
  // peut bouger la cible APRÈS le premier positionnement, créant un gap entre
  // l'élément et la toolbar. On suit en continu tant que pencilTarget est set.
  let positionRAF = null;
  function startPositionLoop() {
    if (positionRAF) cancelAnimationFrame(positionRAF);
    function tick() {
      if (!pencilTarget) { positionRAF = null; return; }
      positionEditTools();
      positionRAF = requestAnimationFrame(tick);
    }
    positionRAF = requestAnimationFrame(tick);
  }
  // Mouseenter sur × ou + : annule la disparition (même timer que le crayon)
  delBtn.addEventListener('mouseenter', () => clearTimeout(pencilHideTimer));
  addBtn.addEventListener('mouseenter', () => clearTimeout(pencilHideTimer));
  delBtn.addEventListener('mouseleave', () => {
    pencilHideTimer = setTimeout(() => { pencilBtn.style.display = 'none'; hideDelAdd(); pencilTarget = null; }, 400);
  });
  addBtn.addEventListener('mouseleave', () => {
    pencilHideTimer = setTimeout(() => { pencilBtn.style.display = 'none'; hideDelAdd(); pencilTarget = null; }, 400);
  });

  function pushMutation(m) {
    mutations.push(m);
    unsaved = edits.size + mutations.length;
    refreshSaveBtn();
  }

  // Détecte si pencilTarget est une option de select ou radio.
  // Convention : data-edit-field = "<inputName>_opt<N>" (ou "_opt0" pour le
  // placeholder du select). Retourne info pour add/remove option, ou null.
  function detectOptionTarget(el) {
    if (!el || !el.getAttribute) return null;
    const fld = el.getAttribute('data-edit-field') || '';
    const usIdx = fld.lastIndexOf('_opt');
    if (usIdx < 0) return null;
    const suffix = fld.slice(usIdx + 4);
    if (!suffix || !/^\d+$/.test(suffix)) return null;
    const inputName = fld.slice(0, usIdx);
    const index = parseInt(suffix, 10);
    // Container à supprimer/dupliquer : pour <option> c'est l'élément lui-même,
    // pour un span dans un radio c'est le <label> parent.
    const container = el.tagName === 'OPTION' ? el : (el.closest('label') || el);
    return { inputName, index, field: fld, el, container };
  }

  // Clic × : supprime field, section, ou option (radio/select).
  delBtn.addEventListener('click', (e) => {
    e.preventDefault(); e.stopPropagation();
    if (!pencilTarget) return;
    const t = getVisualTarget(pencilTarget);
    const isSection = t.hasAttribute && t.hasAttribute('data-edit-section');
    if (isSection) {
      const name = t.getAttribute('data-edit-section');
      if (!confirm('Supprimer la section "' + name + '" ?')) return;
      pushMutation({ op: 'remove-section', section: name });
      t.remove();
    } else {
      // Cas spécial : option de select/radio → supprime l'option (label ou option)
      const optInfo = detectOptionTarget(pencilTarget);
      if (optInfo) {
        if (!confirm('Supprimer cette option ?')) return;
        const sectionEl = optInfo.el.closest('[data-edit-section]');
        const sectionName = sectionEl ? sectionEl.getAttribute('data-edit-section') : '';
        pushMutation({ op: 'remove-element', section: sectionName, field: optInfo.field });
        optInfo.container.remove();
        pencilBtn.style.display = 'none';
        hideDelAdd();
        pencilTarget = null;
        return;
      }
      if (!confirm('Supprimer cet élément ?')) return;
      const sectionEl = t.closest('[data-edit-section]');
      const sectionName = sectionEl ? sectionEl.getAttribute('data-edit-section') : '';
      const fieldEl = t.hasAttribute('data-edit-field') ? t : t.querySelector('[data-edit-field]');
      const field = fieldEl ? (fieldEl.getAttribute('data-edit-field') || '') : '';
      pushMutation({ op: 'remove-element', section: sectionName, field: field });
      t.remove();
    }
    pencilBtn.style.display = 'none';
    hideDelAdd();
    pencilTarget = null;
  });

  // Duplique une option de select/radio (clone du container + incrémente l'index).
  function duplicateOption(optInfo) {
    const parent = optInfo.container.parentNode;
    if (!parent) return;
    // Trouve l'index max pour ce groupe d'options
    let maxIdx = optInfo.index;
    parent.querySelectorAll('[data-edit-field]').forEach((el) => {
      const v = el.getAttribute('data-edit-field') || '';
      const us = v.lastIndexOf('_opt');
      if (us < 0) return;
      const sf = v.slice(us + 4);
      if (/^\d+$/.test(sf) && v.slice(0, us) === optInfo.inputName) {
        maxIdx = Math.max(maxIdx, parseInt(sf, 10));
      }
    });
    const newIdx = maxIdx + 1;
    const clone = optInfo.container.cloneNode(true);
    // Re-numérote data-edit-field dans le clone (et sur clone lui-même si applicable)
    const reindex = (el) => {
      if (!el.getAttribute) return;
      const v = el.getAttribute('data-edit-field') || '';
      const us = v.lastIndexOf('_opt');
      if (us < 0) return;
      const sf = v.slice(us + 4);
      if (/^\d+$/.test(sf) && v.slice(0, us) === optInfo.inputName) {
        el.setAttribute('data-edit-field', optInfo.inputName + '_opt' + newIdx);
      }
      el.removeAttribute('data-edit-attached');
      el.removeAttribute('data-edit-key');
      el.removeAttribute('data-edit-original');
    };
    if (clone.nodeType === 1) reindex(clone);
    if (clone.querySelectorAll) clone.querySelectorAll('[data-edit-field]').forEach(reindex);
    // Pour radio : value unique
    const radInp = clone.querySelector ? clone.querySelector('input[type="radio"]') : null;
    if (radInp) radInp.setAttribute('value', 'option' + newIdx);
    // Update text content (heuristique : remplace "Option <num>" si présent)
    const textEl = clone.tagName === 'OPTION'
      ? clone
      : (clone.querySelector ? clone.querySelector('[data-edit-field]') : null);
    if (textEl) {
      const oldText = (textEl.textContent || '').trim();
      const m2 = oldText.match(/^(.*?)\d+\s*$/);
      textEl.textContent = m2 ? (m2[1] + newIdx) : ('Option ' + newIdx);
    }
    parent.insertBefore(clone, optInfo.container.nextSibling);
    // Mutation persistance
    const sectionEl = optInfo.el.closest('[data-edit-section]');
    const sectionName = sectionEl ? sectionEl.getAttribute('data-edit-section') : '';
    pushMutation({
      op: 'add-element',
      section: sectionName,
      afterField: optInfo.field,
      elementType: 'option-clone',
      value: clone.outerHTML,
    });
  }

  // Clic + : ouvre la bonne bibliothèque selon le contexte.
  addBtn.addEventListener('click', (e) => {
    e.preventDefault(); e.stopPropagation();
    if (!pencilTarget) return;
    const t = getVisualTarget(pencilTarget);
    const isSection = t.hasAttribute && t.hasAttribute('data-edit-section');
    if (isSection) {
      openSectionPicker(t.getAttribute('data-edit-section'));
      return;
    }
    // Option d'un select/radio → duplique au lieu d'ouvrir un picker
    const optInfo = detectOptionTarget(pencilTarget);
    if (optInfo) {
      duplicateOption(optInfo);
      return;
    }
    const isFormCtx = t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || !!t.closest('form');
    if (isFormCtx) {
      openFormFieldPicker(t);
    } else {
      openElementPicker(t);
    }
  });

  // ── Bibliothèque de champs de formulaire ──────────────────────
  // Quand l'utilisateur clique + sur un <input>/<textarea> ou à l'intérieur
  // d'un <form>, on ouvre ce picker dédié (text, email, tel, select…) au
  // lieu de la lib d'éléments génériques.
  let FORM_FIELD_LIBRARY_CACHE = null;
  let FORM_FIELD_CATEGORIES_CACHE = null;

  async function loadFormFieldLibrary() {
    if (FORM_FIELD_LIBRARY_CACHE) return { items: FORM_FIELD_LIBRARY_CACHE, categories: FORM_FIELD_CATEGORIES_CACHE };
    try {
      const res = await fetch('/api/form-field-library');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      FORM_FIELD_LIBRARY_CACHE = data.items || [];
      FORM_FIELD_CATEGORIES_CACHE = data.categories || [];
      return { items: FORM_FIELD_LIBRARY_CACHE, categories: FORM_FIELD_CATEGORIES_CACHE };
    } catch (e) {
      console.error('[form-field-library] fetch failed', e);
      return { items: [], categories: [] };
    }
  }

  // ── Form Manager : un SEUL popup pour gérer tout le formulaire ─────
  // Liste les champs existants avec drag-and-drop pour réordonner, édition
  // inline du label/placeholder, suppression, et bouton "+ Ajouter" qui
  // ouvre le picker de types de champs.
  //
  // Persistance : à la fermeture, on capture l'innerHTML final du <form>
  // et on push une mutation "set-form-html" qui rejoue ce HTML au runtime.
  async function openFormManager(formEl) {
    if (!formEl) return;
    const sectionEl = formEl.closest('[data-edit-section]');
    if (!sectionEl) return;
    const sectionName = sectionEl.getAttribute('data-edit-section') || '';

    const overlay = document.createElement('div');
    overlay.className = 'wp-section-picker wp-form-manager';
    overlay.innerHTML =
      '<div class="wp-section-picker-box wp-fm-box">'
      + '<div class="wp-fm-header">'
      + '<div>'
      + '<h3 style="margin:0;font-size:15px;font-weight:700;">Gérer le formulaire</h3>'
      + '<p style="margin:6px 0 0;color:rgb(148 163 184);font-size:11px;">Glisse pour réordonner, clique pour modifier, × pour supprimer.</p>'
      + '</div>'
      + '<button type="button" class="wp-fm-done">Terminé</button>'
      + '</div>'
      + '<ul class="wp-fm-list"></ul>'
      + '<button type="button" class="wp-fm-add">+ Ajouter un champ</button>'
      + '</div>';
    document.body.appendChild(overlay);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeAndPersist(); });

    function fieldRows() {
      // Sélectionne les "rows" du formulaire : inputs, textareas, selects,
      // ainsi que les labels (checkbox) et les divs (radio group) wrappés.
      const result = [];
      const seen = new Set();
      formEl.querySelectorAll('input, textarea, select').forEach((inp) => {
        if (inp.getAttribute('type') === 'hidden' || inp.getAttribute('type') === 'submit') return;
        if (seen.has(inp)) return;
        seen.add(inp);
        // Trouve le wrapper : si l'input est dans un <label>, prends le label.
        // Si c'est un radio, prends le <div> qui contient tous les radios.
        const lbl = inp.closest('label');
        const radio = inp.getAttribute('type') === 'radio';
        let wrapper;
        if (radio) {
          // Pour radio, le wrapper est l'ancêtre commun de tous les radios de ce name
          const rname = inp.getAttribute('name') || '';
          const allRadios = formEl.querySelectorAll('input[type="radio"][name="' + CSS.escape(rname) + '"]');
          if (allRadios.length > 1) {
            // Trouve l'ancêtre commun le plus proche
            let common = allRadios[0].parentElement;
            while (common && !Array.from(allRadios).every((r) => common.contains(r))) {
              common = common.parentElement;
            }
            wrapper = common || lbl || inp;
          } else {
            wrapper = lbl || inp;
          }
          // Marque tous les radios comme déjà vus
          allRadios.forEach((r) => seen.add(r));
        } else if (lbl && lbl.querySelector('input[type="checkbox"]')) {
          wrapper = lbl;
        } else {
          wrapper = inp;
        }
        result.push({ wrapper, input: inp });
      });
      return result;
    }

    const typeIcons = {
      'text': '📝', 'email': '✉️', 'tel': '☎️', 'number': '🔢',
      'url': '🔗', 'textarea': '📄', 'select-one': '▼', 'select': '▼',
      'checkbox': '☐', 'radio': '⦿', 'date': '📅', 'file': '📎',
    };

    function getInputKind(inp) {
      if (inp.tagName === 'TEXTAREA') return 'textarea';
      if (inp.tagName === 'SELECT') return 'select';
      return inp.getAttribute('type') || 'text';
    }

    function inputDisplayName(inp) {
      const kind = getInputKind(inp);
      if (kind === 'checkbox') {
        const lbl = inp.closest('label');
        const span = lbl ? lbl.querySelector('span') : null;
        return span ? (span.textContent || '').trim() : 'Case à cocher';
      }
      if (kind === 'radio') {
        const wrap = inp.closest('div');
        const title = wrap ? wrap.querySelector('[data-edit-field*="_title"]') : null;
        return title ? (title.textContent || '').trim() : 'Groupe de boutons radio';
      }
      return inp.getAttribute('placeholder') || inp.getAttribute('name') || 'Champ';
    }

    // Pour les radio/select, retourne la liste des options éditables.
    // Pour radio : items = les <label> wrapping un input radio
    // Pour select : items = les <option> enfants
    function getOptionItems(row) {
      const kind = getInputKind(row.input);
      if (kind === 'select') {
        return Array.from(row.input.querySelectorAll(':scope > option'));
      }
      if (kind === 'radio') {
        const rname = row.input.getAttribute('name') || '';
        // Le wrapper du groupe
        const radios = formEl.querySelectorAll('input[type="radio"][name="' + CSS.escape(rname) + '"]');
        // Retourne les <label> parents de chaque radio (chaque label = une option)
        return Array.from(radios).map(function (r) { return r.closest('label') || r; });
      }
      return [];
    }

    function getOptionText(item) {
      if (item.tagName === 'OPTION') return (item.textContent || '').trim();
      const span = item.querySelector ? item.querySelector('span[data-edit-field], span') : null;
      return span ? (span.textContent || '').trim() : (item.textContent || '').trim();
    }

    function setOptionText(item, val) {
      if (item.tagName === 'OPTION') { item.textContent = val; return; }
      const span = item.querySelector ? item.querySelector('span[data-edit-field], span') : null;
      if (span) span.textContent = val;
      else item.textContent = val;
    }

    function renderList() {
      const list = overlay.querySelector('.wp-fm-list');
      const rows = fieldRows();
      list.innerHTML = rows.map((r, i) => {
        const kind = getInputKind(r.input);
        const icon = typeIcons[kind] || '🔘';
        const name = (r.input.getAttribute('name') || '').replace(/"/g, '&quot;');
        const ph = (r.input.getAttribute('placeholder') || '').replace(/"/g, '&quot;');
        const display = inputDisplayName(r.input).replace(/</g, '&lt;');
        const showPh = kind !== 'checkbox' && kind !== 'radio' && kind !== 'select';
        const hasOptions = kind === 'radio' || kind === 'select';
        let optionsHtml = '';
        if (hasOptions) {
          const opts = getOptionItems(r);
          optionsHtml = '<div class="wp-fm-options">'
            + '<div class="wp-fm-options-label">Options</div>'
            + opts.map((opt, oi) => '<div class="wp-fm-opt-row">'
                + '<input type="text" class="wp-fm-opt-input" data-row="' + i + '" data-opt="' + oi + '" value="' + (getOptionText(opt) || '').replace(/"/g, '&quot;') + '">'
                + '<button type="button" class="wp-fm-opt-del" data-row="' + i + '" data-opt="' + oi + '" title="Supprimer cette option">×</button>'
                + '</div>').join('')
            + '<button type="button" class="wp-fm-opt-add" data-row="' + i + '">+ Ajouter une option</button>'
            + '</div>';
        }
        return ''
          + '<li class="wp-fm-row" draggable="true" data-row="' + i + '" data-name="' + name + '">'
          + '<div class="wp-fm-handle" title="Glisser pour réordonner">⋮⋮</div>'
          + '<div class="wp-fm-icon">' + icon + '</div>'
          + '<div class="wp-fm-info">'
          + '<div class="wp-fm-display">' + display + '</div>'
          + '<div class="wp-fm-meta">' + kind + ' · name="' + name + '"</div>'
          + (showPh
              ? '<input type="text" class="wp-fm-ph" placeholder="Placeholder…" value="' + ph + '" data-name="' + name + '">'
              : '')
          + optionsHtml
          + '</div>'
          + '<button type="button" class="wp-fm-del" data-name="' + name + '" title="Supprimer">×</button>'
          + '</li>';
      }).join('');
      wireRows();
    }

    function wireRows() {
      // Placeholder inputs
      overlay.querySelectorAll('.wp-fm-ph').forEach((inp) => {
        inp.addEventListener('input', (e) => {
          const nm = e.currentTarget.getAttribute('data-name');
          const target = formEl.querySelector('[name="' + CSS.escape(nm) + '"]');
          if (target) target.setAttribute('placeholder', e.currentTarget.value);
        });
      });

      // Édition du texte d'une option (radio/select)
      overlay.querySelectorAll('.wp-fm-opt-input').forEach((inp) => {
        inp.addEventListener('input', (e) => {
          const rowIdx = parseInt(e.currentTarget.getAttribute('data-row') || '0', 10);
          const optIdx = parseInt(e.currentTarget.getAttribute('data-opt') || '0', 10);
          const rows = fieldRows();
          const row = rows[rowIdx];
          if (!row) return;
          const opts = getOptionItems(row);
          if (opts[optIdx]) setOptionText(opts[optIdx], e.currentTarget.value);
        });
      });

      // Suppression d'une option
      overlay.querySelectorAll('.wp-fm-opt-del').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          const rowIdx = parseInt(e.currentTarget.getAttribute('data-row') || '0', 10);
          const optIdx = parseInt(e.currentTarget.getAttribute('data-opt') || '0', 10);
          const rows = fieldRows();
          const row = rows[rowIdx];
          if (!row) return;
          const opts = getOptionItems(row);
          if (opts[optIdx]) opts[optIdx].remove();
          renderList();
        });
      });

      // Ajout d'une option (clone du dernier item, incrémente l'index)
      overlay.querySelectorAll('.wp-fm-opt-add').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          const rowIdx = parseInt(e.currentTarget.getAttribute('data-row') || '0', 10);
          const rows = fieldRows();
          const row = rows[rowIdx];
          if (!row) return;
          const kind = getInputKind(row.input);
          const opts = getOptionItems(row);
          if (!opts.length) return;
          const lastOpt = opts[opts.length - 1];
          const clone = lastOpt.cloneNode(true);
          // Calcule le nouvel index pour le texte par défaut
          const newIdx = opts.length + 1;
          if (kind === 'select') {
            // Nouvelle option : nouveau value et texte
            clone.setAttribute('value', 'option' + newIdx);
            clone.textContent = 'Option ' + newIdx;
            // Re-numérote data-edit-field si présent
            if (clone.hasAttribute('data-edit-field')) {
              const v = clone.getAttribute('data-edit-field') || '';
              const us = v.lastIndexOf('_opt');
              if (us >= 0) clone.setAttribute('data-edit-field', v.slice(0, us) + '_opt' + newIdx);
            }
            row.input.appendChild(clone);
          } else if (kind === 'radio') {
            // Pour radio : update value et span texte
            const radio = clone.querySelector ? clone.querySelector('input[type="radio"]') : null;
            if (radio) radio.setAttribute('value', 'option' + newIdx);
            const span = clone.querySelector ? clone.querySelector('span') : null;
            if (span) {
              span.textContent = 'Option ' + newIdx;
              if (span.hasAttribute('data-edit-field')) {
                const v = span.getAttribute('data-edit-field') || '';
                const us = v.lastIndexOf('_opt');
                if (us >= 0) span.setAttribute('data-edit-field', v.slice(0, us) + '_opt' + newIdx);
              }
            }
            lastOpt.parentNode.insertBefore(clone, lastOpt.nextSibling);
          }
          renderList();
        });
      });
      // Boutons ×
      overlay.querySelectorAll('.wp-fm-del').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          const nm = e.currentTarget.getAttribute('data-name');
          const target = formEl.querySelector('[name="' + CSS.escape(nm) + '"]');
          if (!target) return;
          // Pour les radios, retire TOUS les radios + le wrapper div
          if (target.getAttribute('type') === 'radio') {
            const radios = formEl.querySelectorAll('input[type="radio"][name="' + CSS.escape(nm) + '"]');
            // Trouve le wrapper commun
            let wrap = radios[0].parentElement;
            while (wrap && !Array.from(radios).every((r) => wrap.contains(r))) wrap = wrap.parentElement;
            if (wrap && wrap !== formEl) wrap.remove();
            else radios.forEach((r) => { const l = r.closest('label'); (l || r).remove(); });
          } else if (target.getAttribute('type') === 'checkbox') {
            const lbl = target.closest('label');
            (lbl || target).remove();
          } else {
            target.remove();
          }
          renderList();
        });
      });
      // Drag-and-drop
      let dragRow = null;
      overlay.querySelectorAll('.wp-fm-row').forEach((row) => {
        row.addEventListener('dragstart', (e) => {
          dragRow = e.currentTarget;
          e.currentTarget.classList.add('wp-fm-dragging');
          if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
        });
        row.addEventListener('dragend', () => {
          if (dragRow) dragRow.classList.remove('wp-fm-dragging');
          dragRow = null;
          overlay.querySelectorAll('.wp-fm-over').forEach((r) => r.classList.remove('wp-fm-over'));
        });
        row.addEventListener('dragover', (e) => {
          e.preventDefault();
          if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
          if (e.currentTarget !== dragRow) e.currentTarget.classList.add('wp-fm-over');
        });
        row.addEventListener('dragleave', (e) => { e.currentTarget.classList.remove('wp-fm-over'); });
        row.addEventListener('drop', (e) => {
          e.preventDefault();
          e.currentTarget.classList.remove('wp-fm-over');
          if (!dragRow || dragRow === e.currentTarget) return;
          const draggedName = dragRow.getAttribute('data-name');
          const targetName = e.currentTarget.getAttribute('data-name');
          // Réordonne dans le DOM du formulaire
          const rows = fieldRows();
          const dragged = rows.find((r) => r.input.getAttribute('name') === draggedName);
          const tgt = rows.find((r) => r.input.getAttribute('name') === targetName);
          if (dragged && tgt) {
            tgt.wrapper.parentNode.insertBefore(dragged.wrapper, tgt.wrapper);
          }
          renderList();
        });
      });
    }

    // Bouton "+ Ajouter un champ" : ouvre le picker form-field
    overlay.querySelector('.wp-fm-add').addEventListener('click', async () => {
      // Trouve un anchor : le dernier champ (avant submit) pour insertion en bas
      const rows = fieldRows();
      const anchor = rows.length ? rows[rows.length - 1].wrapper : null;
      // Petit picker inline plutôt qu'un nouveau modal pour rester dans le manager
      const { items } = await loadFormFieldLibrary();
      if (!items.length) return;
      // Mini-overlay sub-picker
      const sub = document.createElement('div');
      sub.className = 'wp-fm-subpicker';
      sub.innerHTML = '<div class="wp-fm-subpicker-grid">'
        + items.map((it) => '<button type="button" class="wp-fm-sub-item" data-id="' + it.id + '">'
          + '<div class="wp-section-thumb">' + (it.thumbSvg || '') + '</div>'
          + '<div class="wp-fm-sub-label">' + it.label + '</div>'
          + '</button>').join('')
        + '</div>'
        + '<button type="button" class="wp-ctx-close">Annuler</button>';
      overlay.appendChild(sub);
      sub.querySelector('.wp-ctx-close').addEventListener('click', () => sub.remove());
      sub.querySelectorAll('.wp-fm-sub-item').forEach((b) => {
        b.addEventListener('click', () => {
          const id = b.getAttribute('data-id');
          const item = items.find((x) => x.id === id);
          if (!item) return;
          const wrap2 = document.createElement('div');
          wrap2.innerHTML = item.insertHtml;
          const newField = wrap2.firstElementChild;
          if (!newField) return;
          // Insère AVANT le wrapper du submit (qui est souvent un div flex)
          // sinon les champs ajoutés finissent en flex-row côte à côte.
          const submit = formEl.querySelector('button[type="submit"], input[type="submit"]');
          let anchor = submit;
          while (anchor && anchor.parentNode !== formEl) anchor = anchor.parentNode;
          if (anchor) anchor.parentNode.insertBefore(newField, anchor);
          else formEl.appendChild(newField);
          sub.remove();
          renderList();
        });
      });
    });

    // Bouton "Terminé" : ferme et persiste l'état complet du form
    function closeAndPersist() {
      // Mutation set-form-html : capture l'innerHTML du form
      const formHtml = formEl.innerHTML;
      // Index du form dans la section (au cas où plusieurs forms)
      const formIndex = Array.prototype.indexOf.call(
        sectionEl.querySelectorAll('form'), formEl
      );
      // Dédupe par section + formIndex
      for (let i = mutations.length - 1; i >= 0; i--) {
        const mu = mutations[i];
        if (mu.op === 'set-form-html' && mu.section === sectionName && mu.formIndex === formIndex) {
          mutations.splice(i, 1);
        }
      }
      mutations.push({ op: 'set-form-html', section: sectionName, formIndex: formIndex, value: formHtml });
      unsaved = edits.size + mutations.length; refreshSaveBtn();
      overlay.remove();
    }
    overlay.querySelector('.wp-fm-done').addEventListener('click', closeAndPersist);

    renderList();
  }

  async function openFormFieldPicker(afterEl) {
    const sectionEl = afterEl.closest('[data-edit-section]');
    if (!sectionEl) return;
    const sectionName = sectionEl.getAttribute('data-edit-section') || '';
    // Anchor : le champ courant si on a cliqué + sur un input, sinon le
    // dernier input/textarea du form (insertion en bas).
    let anchorEl = afterEl;
    if (afterEl.tagName !== 'INPUT' && afterEl.tagName !== 'TEXTAREA' && afterEl.tagName !== 'SELECT') {
      const form = afterEl.closest('form');
      if (form) {
        const allInputs = form.querySelectorAll('input:not([type="hidden"]):not([type="submit"]), textarea, select');
        if (allInputs.length) anchorEl = allInputs[allInputs.length - 1];
      }
    }
    const anchorName = (anchorEl.tagName === 'INPUT' || anchorEl.tagName === 'TEXTAREA' || anchorEl.tagName === 'SELECT')
      ? (anchorEl.getAttribute('name') || '')
      : '';

    const overlay = document.createElement('div');
    overlay.className = 'wp-section-picker wp-element-picker';
    overlay.innerHTML = '<div class="wp-section-picker-box">'
      + '<h3 style="margin:0;font-size:15px;font-weight:700;">Ajouter un champ</h3>'
      + '<p style="margin:6px 0 0;color:rgb(148 163 184);font-size:11px;">Inséré dans le formulaire, après le champ sélectionné.</p>'
      + '<div class="wp-section-picker-grid wp-section-picker-loading">Chargement…</div>'
      + '<button type="button" class="wp-ctx-close" style="margin-top:16px;" id="wp-ff-close">Annuler</button>'
      + '</div>';
    document.body.appendChild(overlay);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    overlay.querySelector('#wp-ff-close').addEventListener('click', () => overlay.remove());

    const { items, categories } = await loadFormFieldLibrary();
    if (!overlay.parentNode) return;
    const grid = overlay.querySelector('.wp-section-picker-grid');
    if (!items.length) {
      grid.innerHTML = '<p style="color:rgb(248 113 113);grid-column:1/-1;text-align:center;font-size:12px;">Impossible de charger la bibliothèque.</p>';
      return;
    }
    grid.classList.remove('wp-section-picker-loading');
    const cats = (categories && categories.length) ? categories : [{ id: 'all', label: '' }];
    grid.innerHTML = cats.map((cat) => {
      const subset = items.filter((it) => cat.id === 'all' || it.category === cat.id);
      if (!subset.length) return '';
      const header = cat.label
        ? '<div class="wp-picker-cat" style="grid-column:1/-1;">' + cat.label + '</div>'
        : '';
      const cards = subset.map((it) => '<button type="button" class="wp-section-picker-card" data-id="' + it.id + '">'
        + '<div class="wp-section-thumb">' + (it.thumbSvg || '') + '</div>'
        + '<h4>' + it.label + '</h4>'
        + '<p>' + (it.description || '').replace(/"/g, '&quot;') + '</p>'
        + '</button>').join('');
      return header + cards;
    }).join('');
    grid.querySelectorAll('[data-id]').forEach((btn) => {
      btn.addEventListener('click', (ev) => {
        const id = ev.currentTarget.getAttribute('data-id');
        const item = items.find((x) => x.id === id);
        if (!item || !item.insertHtml) return;
        const html = item.insertHtml;
        const wrap = document.createElement('div');
        wrap.innerHTML = html;
        const newEl = wrap.firstElementChild;
        if (newEl && anchorEl.parentNode) {
          anchorEl.parentNode.insertBefore(newEl, anchorEl.nextSibling);
        }
        pushMutation({
          op: 'add-form-field',
          section: sectionName,
          afterInputName: anchorName,
          fieldType: id,
          value: html,
        });
        overlay.remove();
      });
    });
  }

  // ── Bibliothèque d'éléments : fetchée depuis /api/element-library ──
  // Source de vérité : elements-catalog.ts + ElementThumb.tsx + element-
  // insert-templates.ts. Même pattern que la lib de sections.
  let ELEMENT_LIBRARY_CACHE = null;
  let ELEMENT_CATEGORIES_CACHE = null;

  async function loadElementLibrary() {
    if (ELEMENT_LIBRARY_CACHE) return { items: ELEMENT_LIBRARY_CACHE, categories: ELEMENT_CATEGORIES_CACHE };
    try {
      const res = await fetch('/api/element-library');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      ELEMENT_LIBRARY_CACHE = data.items || [];
      ELEMENT_CATEGORIES_CACHE = data.categories || [];
      return { items: ELEMENT_LIBRARY_CACHE, categories: ELEMENT_CATEGORIES_CACHE };
    } catch (e) {
      console.error('[element-library] fetch failed', e);
      return { items: [], categories: [] };
    }
  }

  async function openElementPicker(afterEl) {
    const sectionEl = afterEl.closest('[data-edit-section]');
    if (!sectionEl) return;
    const sectionName = sectionEl.getAttribute('data-edit-section') || '';
    const afterField = afterEl.getAttribute('data-edit-field') || '';
    const overlay = document.createElement('div');
    overlay.className = 'wp-section-picker wp-element-picker';
    overlay.innerHTML = '<div class="wp-section-picker-box">'
      + '<h3 style="margin:0;font-size:15px;font-weight:700;">Ajouter un élément</h3>'
      + '<p style="margin:6px 0 0;color:rgb(148 163 184);font-size:11px;">Inséré juste après l’élément sélectionné. Clique sur une miniature.</p>'
      + '<div class="wp-section-picker-grid wp-section-picker-loading">Chargement…</div>'
      + '<button type="button" class="wp-ctx-close" style="margin-top:16px;" id="wp-ep-close">Annuler</button>'
      + '</div>';
    document.body.appendChild(overlay);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    overlay.querySelector('#wp-ep-close').addEventListener('click', () => overlay.remove());

    const { items, categories } = await loadElementLibrary();
    if (!overlay.parentNode) return;
    const grid = overlay.querySelector('.wp-section-picker-grid');
    if (!items.length) {
      grid.innerHTML = '<p style="color:rgb(248 113 113);grid-column:1/-1;text-align:center;font-size:12px;">Impossible de charger la bibliothèque.</p>';
      return;
    }
    grid.classList.remove('wp-section-picker-loading');
    // Groupe par catégorie. Si plusieurs catégories, on insère un header avant chaque groupe.
    const cats = (categories && categories.length) ? categories : [{ id: 'all', label: '' }];
    grid.innerHTML = cats.map((cat) => {
      const subset = items.filter((it) => cat.id === 'all' || it.category === cat.id);
      if (!subset.length) return '';
      const header = cat.label
        ? '<div class="wp-picker-cat" style="grid-column:1/-1;">' + cat.label + '</div>'
        : '';
      const cards = subset.map((it) => '<button type="button" class="wp-section-picker-card" data-id="' + it.id + '">'
        + '<div class="wp-section-thumb">' + (it.thumbSvg || '') + '</div>'
        + '<h4>' + it.label + '</h4>'
        + '<p>' + (it.description || '').replace(/"/g, '&quot;') + '</p>'
        + '</button>').join('');
      return header + cards;
    }).join('');
    grid.querySelectorAll('[data-id]').forEach((btn) => {
      btn.addEventListener('click', (ev) => {
        const id = ev.currentTarget.getAttribute('data-id');
        const item = items.find((x) => x.id === id);
        if (!item || !item.insertHtml) return;
        const html = item.insertHtml;
        const wrap = document.createElement('div');
        wrap.innerHTML = html;
        const newEl = wrap.firstElementChild;
        if (newEl && afterEl.parentNode) {
          afterEl.parentNode.insertBefore(newEl, afterEl.nextSibling);
        }
        pushMutation({
          op: 'add-element',
          section: sectionName,
          afterField: afterField,
          elementType: id,
          value: html,
        });
        overlay.remove();
      });
    });
  }

  // ── Bibliothèque de sections : fetchée depuis /api/section-library ─
  // Source de vérité : sections-catalog.ts + SectionThumb.tsx + section-
  // insert-templates.ts. Toute modification du catalogue se propage ici
  // sans rebuild du site.
  let SECTION_LIBRARY_CACHE = null; // Array<{id,label,description,category,thumbSvg,insertHtml}>

  async function loadSectionLibrary() {
    if (SECTION_LIBRARY_CACHE) return SECTION_LIBRARY_CACHE;
    try {
      const res = await fetch('/api/section-library');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      SECTION_LIBRARY_CACHE = data.items || [];
      return SECTION_LIBRARY_CACHE;
    } catch (e) {
      console.error('[section-library] fetch failed', e);
      return [];
    }
  }

  async function openSectionPicker(afterSection) {
    const overlay = document.createElement('div');
    overlay.className = 'wp-section-picker';
    overlay.innerHTML = '<div class="wp-section-picker-box">'
      + '<h3 style="margin:0;font-size:15px;font-weight:700;">Ajouter une section</h3>'
      + '<p style="margin:6px 0 0;color:rgb(148 163 184);font-size:11px;">Elle sera ajoutée juste après "' + afterSection + '". Clique sur un layout pour l’insérer.</p>'
      + '<div class="wp-section-picker-grid wp-section-picker-loading">Chargement…</div>'
      + '<button type="button" class="wp-ctx-close" style="margin-top:16px;" id="wp-sp-close">Annuler</button>'
      + '</div>';
    document.body.appendChild(overlay);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    overlay.querySelector('#wp-sp-close').addEventListener('click', () => overlay.remove());

    const items = await loadSectionLibrary();
    if (!overlay.parentNode) return; // l'utilisateur a fermé pendant le fetch
    const grid = overlay.querySelector('.wp-section-picker-grid');
    if (!items.length) {
      grid.innerHTML = '<p style="color:rgb(248 113 113);grid-column:1/-1;text-align:center;font-size:12px;">Impossible de charger la bibliothèque.</p>';
      return;
    }
    grid.classList.remove('wp-section-picker-loading');
    grid.innerHTML = items.map((it) => '<button type="button" class="wp-section-picker-card" data-id="' + it.id + '">'
      + '<div class="wp-section-thumb">' + (it.thumbSvg || '') + '</div>'
      + '<h4>' + it.label + '</h4>'
      + '<p>' + (it.description || '').replace(/"/g, '&quot;') + '</p>'
      + '</button>').join('');
    grid.querySelectorAll('[data-id]').forEach((btn) => {
      btn.addEventListener('click', (ev) => {
        const id = ev.currentTarget.getAttribute('data-id');
        const item = items.find((x) => x.id === id);
        if (!item || !item.insertHtml) {
          alert('Pas de template HTML pour ce layout pour le moment.');
          return;
        }
        const html = item.insertHtml;
        // Insère dans le DOM
        const after = document.querySelector('[data-edit-section="' + afterSection + '"]');
        if (after) {
          const wrap = document.createElement('div');
          wrap.innerHTML = html;
          const newSec = wrap.firstElementChild;
          if (newSec) after.parentNode.insertBefore(newSec, after.nextSibling);
        }
        pushMutation({ op: 'add-section', afterSection: afterSection, sectionType: id, value: html });
        overlay.remove();
      });
    });
  }

  // Bloque la navigation sur tous les <a> en mode édition pour permettre l'édition
  // des CTAs sans déclencher de scroll/navigation. Exception : les ancres (#...)
  // restent fonctionnelles pour permettre de tester la nav et d'aller éditer
  // une section précise sans quitter le mode édition.
  document.addEventListener('click', (e) => {
    const target = e.target;
    if (!(target instanceof Element)) return;
    const anchor = target.closest('a');
    if (!anchor) return;
    if (anchor.closest('.wp-editor-bar') || anchor.closest('.wp-img-modal') || anchor.closest('.wp-ctx-menu')) return;
    const href = anchor.getAttribute('href') || '';
    if (href.startsWith('#')) return; // laisse passer les ancres
    e.preventDefault();
  }, true);

  // Re-attache aux éléments qui apparaissent après le rendu initial
  // (React rend en plusieurs frames, certains composants montent en lazy).
  const observer = new MutationObserver(() => {
    document.querySelectorAll('[data-edit-field]:not([data-edit-attached])').forEach((el) => {
      el.setAttribute('data-edit-attached', '1');
      attachToOne(el);
    });
  });

  function attachToOne(el) {
    const field = el.getAttribute('data-edit-field');
    const section = el.closest('[data-edit-section]')?.getAttribute('data-edit-section') || '';
    const key = section + '.' + field;
    const original = el.tagName === 'IMG' ? el.getAttribute('src') : el.textContent;
    el.dataset.editKey = key;
    el.dataset.editOriginal = original;

    // Champs préfixés "_" (ex: _eyebrow) : texte hardcoded dans le template, donc
    // pas de contenteditable (le patch JSX échouerait). Seul le clic-droit
    // (styles CSS via WP-EDITOR-PER-ELEMENT) est actif.
    const isPseudoField = field && field.indexOf('_') === 0;

    // Tous les types d'éléments (texte, image, pseudo-fields) : édition
    // uniquement via le crayon flottant. Pas de contenteditable au clic.
    // L'utilisateur ouvre le popup et utilise l'onglet Contenu pour le texte,
    // l'onglet Image pour les images, etc.
    el.style.cursor = 'default';
    // Garde la référence à "original" et "key" pour usage futur si besoin
    void original; void key; void isPseudoField;
  }

  // Attach après le rendu React + observe les ajouts futurs
  function bootstrap() {
    document.querySelectorAll('[data-edit-field]:not([data-edit-attached])').forEach((el) => {
      el.setAttribute('data-edit-attached', '1');
      attachToOne(el);
    });
    const count = document.querySelectorAll('[data-edit-field]').length;
    const badge = document.createElement('div');
    badge.className = 'wp-edit-badge';
    badge.textContent = count + ' élément(s) éditable(s)';
    document.body.appendChild(badge);
    setTimeout(() => { badge.style.transition = 'opacity .5s'; badge.style.opacity = '0'; }, 4000);
    observer.observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === 'complete') setTimeout(bootstrap, 200);
  else window.addEventListener('load', () => setTimeout(bootstrap, 200));
})();
</script>`;
}
