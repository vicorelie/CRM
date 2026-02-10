<?php
/* Smarty version 4.5.5, created on 2026-02-10 14:41:52
  from '/var/www/CNK-DEM/layouts/v7/modules/Potentials/UnifiedInventaireTab.tpl' */

/* @var Smarty_Internal_Template $_smarty_tpl */
if ($_smarty_tpl->_decodeProperties($_smarty_tpl, array (
  'version' => '4.5.5',
  'unifunc' => 'content_698b27907f5d74_45647056',
  'has_nocache_code' => false,
  'file_dependency' => 
  array (
    '346722256f59262dd7f1c5c73d547e1384b1d562' => 
    array (
      0 => '/var/www/CNK-DEM/layouts/v7/modules/Potentials/UnifiedInventaireTab.tpl',
      1 => 1770727307,
      2 => 'file',
    ),
  ),
  'includes' => 
  array (
  ),
),false)) {
function content_698b27907f5d74_45647056 (Smarty_Internal_Template $_smarty_tpl) {
?><div class="inventaire-tab-container" id="inventaireTabContainer" data-record-id="<?php echo $_smarty_tpl->tpl_vars['RECORD_ID']->value;?>
"data-saved-volume="<?php echo (($tmp = $_smarty_tpl->tpl_vars['SAVED_VOLUME']->value ?? null)===null||$tmp==='' ? 0 ?? null : $tmp);?>
"data-saved-volume-final="<?php echo (($tmp = $_smarty_tpl->tpl_vars['SAVED_VOLUME_FINAL']->value ?? null)===null||$tmp==='' ? 0 ?? null : $tmp);?>
"data-saved-boxes="<?php echo (($tmp = $_smarty_tpl->tpl_vars['SAVED_BOXES']->value ?? null)===null||$tmp==='' ? 0 ?? null : $tmp);?>
"data-saved-inventory-b64="<?php echo $_smarty_tpl->tpl_vars['SAVED_INVENTORY_B64']->value;?>
"><div class="inventory-toolbar"><div class="toolbar-search"><i class="fa fa-search"></i><input type="text" id="unified-inventory-search" placeholder="Rechercher un article..."><div id="unified-inventory-search-results"></div></div><button class="btn btn-purple btn-sm" onclick="UnifiedInventaire.toggleNewArticleForm()"><i class="fa fa-plus"></i> Nouvel article</button><div class="toolbar-spacer"></div><div class="toolbar-volume volume-purple"><span class="volume-label">Volume inventaire</span><div class="volume-input-group"><input type="text" class="volume-input volume-readonly" id="unified-totalVolume" value="0" readonly><span class="volume-unit">m³</span></div></div><div class="toolbar-volume volume-orange"><span class="volume-label">Volume final</span><div class="volume-input-group"><input type="number" class="volume-input" id="unified-volumeFinal" value="<?php echo $_smarty_tpl->tpl_vars['SAVED_VOLUME_FINAL']->value;?>
" step="0.01" min="0"><span class="volume-unit">m³</span></div></div></div><div id="unified-new-article-form" class="new-article-form"><div class="form-title"><i class="fa fa-plus-circle"></i> Creer un nouvel article (categorie Divers)</div><div class="form-row-4"><div class="form-group"><label>Nom de l'article</label><input type="text" id="unified-new-article-name" placeholder="Ex: Carton special"></div><div class="form-group"><label>Volume (m3)</label><input type="number" id="unified-new-article-volume" placeholder="0.00" step="0.01" min="0"></div><div class="form-group"><label>Quantite</label><input type="number" id="unified-new-article-quantity" placeholder="1" min="0" value="1"></div><div class="form-group" style="display: flex; align-items: flex-end; gap: 10px;"><button class="btn btn-default" onclick="UnifiedInventaire.toggleNewArticleForm()"><i class="fa fa-times"></i></button><button class="btn btn-purple" onclick="UnifiedInventaire.createNewArticle()"><i class="fa fa-check"></i> Creer</button></div></div></div><div class="inventory-columns"><div class="inventory-col inventory-col-left"><div class="col-header"><i class="fa fa-list"></i> Articles disponibles</div><div id="unified-available-items"><div class="loading-indicator"><div class="spinner"></div><p>Chargement...</p></div></div></div><div class="inventory-col inventory-col-right"><div class="col-header"><i class="fa fa-check-circle"></i> Selection</div><div id="unified-selected-items"><div class="empty-selection"><i class="fa fa-arrow-left"></i><p>Cliquez sur un article pour l'ajouter</p></div></div></div></div></div>

<style>
/* Toolbar */
.inventory-toolbar {
    display: flex;
    align-items: center;
    gap: 12px;
    background: #fff;
    padding: 10px 12px;
    border-radius: 10px;
    margin-bottom: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    border: 1px solid #e0e0e0;
}
.toolbar-search {
    position: relative;
    flex: 2;
    min-width: 200px;
}
.toolbar-search > i.fa-search {
    position: absolute;
    left: 10px;
    top: 50%;
    transform: translateY(-50%);
    color: #999;
    z-index: 1;
}
.toolbar-search input {
    width: 100%;
    padding: 8px 12px 8px 32px;
    border: 2px solid #e0e0e0;
    border-radius: 8px;
    font-size: 13px;
    background: #f8f9fa;
    transition: all 0.3s;
}
.toolbar-search input:focus {
    outline: none;
    border-color: #667eea;
    background: #fff;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}
#unified-inventory-search-results {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: white;
    border-radius: 0 0 8px 8px;
    font-size: 12px;
    z-index: 10;
    padding: 4px 10px;
    box-shadow: 0 4px 10px rgba(0,0,0,0.1);
}
.inventory-toolbar .btn {
    white-space: nowrap;
    padding: 8px 14px;
    font-size: 13px;
}
.toolbar-volume {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 14px;
    border-radius: 8px;
    color: white;
    font-size: 13px;
    white-space: nowrap;
}
.toolbar-volume.volume-purple {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
.toolbar-volume.volume-orange {
    background: linear-gradient(135deg, #e67e22 0%, #d35400 100%);
}
.toolbar-volume .volume-label {
    font-size: 12px;
    opacity: 0.9;
}
.toolbar-volume .volume-input {
    width: 60px;
    padding: 4px 6px;
    border: none;
    border-radius: 4px;
    font-size: 13px;
    font-weight: 700;
    text-align: center;
    background: rgba(255, 255, 255, 0.95);
    color: #333;
}
.toolbar-volume .volume-unit {
    font-weight: 600;
    font-size: 12px;
}
.toolbar-volume .volume-input-group {
    display: flex;
    align-items: center;
    gap: 4px;
}
.toolbar-volume .volume-input.volume-readonly {
    background: rgba(255, 255, 255, 0.3);
    cursor: default;
    color: white;
    font-weight: 700;
}
.toolbar-spacer { flex: 1; }

/* New Article Form */
.new-article-form {
    display: none;
    background: #fff;
    padding: 15px;
    border-radius: 10px;
    margin-bottom: 12px;
    border: 2px solid #667eea;
    box-shadow: 0 4px 15px rgba(102, 126, 234, 0.2);
}
.new-article-form .form-title {
    font-weight: 600;
    color: #667eea;
    margin-bottom: 10px;
    font-size: 14px;
}

/* Two Column Layout */
.inventory-columns {
    display: flex;
    gap: 12px;
    min-height: 400px;
}
.inventory-col {
    flex: 1;
    background: #fff;
    border-radius: 10px;
    border: 1px solid #e0e0e0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
}
.inventory-col .col-header {
    padding: 8px 12px;
    font-size: 13px;
    font-weight: 600;
    color: #555;
    border-bottom: 1px solid #e0e0e0;
    background: #f8f9fa;
}
.inventory-col .col-header i {
    margin-right: 6px;
    color: #667eea;
}
.inventory-col-right .col-header i {
    color: #27ae60;
}
#unified-available-items,
#unified-selected-items {
    flex: 1;
    overflow-y: auto;
    max-height: 600px;
}

/* Available Items (left) */
.avail-item {
    display: flex;
    align-items: center;
    padding: 5px 10px;
    cursor: pointer;
    border-bottom: 1px solid #f0f0f0;
    font-size: 13px;
    transition: background 0.15s;
    gap: 8px;
}
.avail-item:hover {
    background: #f0f4ff;
}
.avail-item.already-added {
    background: #f0faf0;
}
.avail-name {
    flex: 1;
    font-weight: 500;
    color: #333;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.avail-vol {
    color: #888;
    font-size: 12px;
    white-space: nowrap;
}
.avail-qty {
    background: #667eea;
    color: white;
    border-radius: 10px;
    padding: 1px 7px;
    font-size: 11px;
    font-weight: 700;
    min-width: 20px;
    text-align: center;
}
.avail-add {
    color: #667eea;
    font-size: 12px;
}

/* Selected Items (right) */
.selected-item {
    display: flex;
    align-items: center;
    padding: 5px 10px;
    border-bottom: 1px solid #f0f0f0;
    font-size: 13px;
    gap: 6px;
}
.sel-name {
    flex: 1;
    font-weight: 500;
    color: #333;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.sel-vol {
    color: #888;
    font-size: 12px;
    white-space: nowrap;
}
.sel-qty-controls {
    display: flex;
    align-items: center;
    gap: 2px;
}
.sel-qty-controls .btn-qty {
    width: 26px;
    height: 26px;
    border: 1px solid #ddd;
    background: #f8f9fa;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 700;
    color: #555;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s;
}
.sel-qty-controls .btn-qty:hover {
    background: #667eea;
    color: white;
    border-color: #667eea;
}
.sel-qty-controls .qty-input {
    width: 45px;
    padding: 3px 4px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 13px;
    font-weight: 600;
    text-align: center;
    -moz-appearance: textfield;
}
.sel-qty-controls .qty-input::-webkit-outer-spin-button,
.sel-qty-controls .qty-input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
}
.btn-remove {
    background: none;
    border: none;
    color: #ccc;
    cursor: pointer;
    padding: 2px 4px;
    font-size: 12px;
    transition: color 0.15s;
}
.btn-remove:hover {
    color: #e74c3c;
}

/* Empty state */
.empty-selection {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px 20px;
    color: #bbb;
    text-align: center;
}
.empty-selection i {
    font-size: 28px;
    margin-bottom: 10px;
}
.empty-selection p {
    font-size: 13px;
    margin: 0;
}

/* Responsive */
@media (max-width: 1100px) {
    .inventory-toolbar { flex-wrap: wrap; }
    .toolbar-search { flex: 1 1 100%; order: 1; margin-bottom: 8px; }
    .toolbar-spacer { display: none; }
    .inventory-toolbar .btn { order: 2; }
    .toolbar-volume.volume-purple { order: 3; margin-left: auto; }
    .toolbar-volume.volume-orange { order: 4; }
}
@media (max-width: 900px) {
    .inventory-columns { flex-direction: column; }
    #unified-available-items, #unified-selected-items { max-height: 350px; }
}
@media (max-width: 600px) {
    .inventory-toolbar { flex-direction: column; align-items: stretch; }
    .toolbar-search { max-width: 100%; min-width: auto; }
    .inventory-toolbar .btn { width: 100%; justify-content: center; }
    .toolbar-volume { min-width: auto; width: 100%; }
    .toolbar-volume.volume-purple { margin-left: 0; }
}

/* Auto-save feedback */
#inventaireTabContainer.saving::after {
    content: 'Sauvegarde...';
    position: fixed;
    bottom: 70px;
    right: 20px;
    background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%);
    color: white;
    padding: 8px 16px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 600;
    z-index: 1001;
    box-shadow: 0 4px 15px rgba(243, 156, 18, 0.4);
    animation: pulse 1s infinite;
}
#inventaireTabContainer.saved::after {
    content: 'Sauvegarde OK';
    position: fixed;
    bottom: 70px;
    right: 20px;
    background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%);
    color: white;
    padding: 8px 16px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 600;
    z-index: 1001;
    box-shadow: 0 4px 15px rgba(39, 174, 96, 0.4);
}
#inventaireTabContainer.save-error::after {
    content: 'Erreur sauvegarde';
    position: fixed;
    bottom: 70px;
    right: 20px;
    background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
    color: white;
    padding: 8px 16px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 600;
    z-index: 1001;
    box-shadow: 0 4px 15px rgba(231, 76, 60, 0.4);
}
@keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.8; transform: scale(0.98); }
}
</style>
<?php }
}
