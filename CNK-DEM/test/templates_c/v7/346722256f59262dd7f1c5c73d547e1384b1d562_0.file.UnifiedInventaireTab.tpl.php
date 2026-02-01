<?php
/* Smarty version 4.5.5, created on 2026-02-01 23:57:38
  from '/var/www/CNK-DEM/layouts/v7/modules/Potentials/UnifiedInventaireTab.tpl' */

/* @var Smarty_Internal_Template $_smarty_tpl */
if ($_smarty_tpl->_decodeProperties($_smarty_tpl, array (
  'version' => '4.5.5',
  'unifunc' => 'content_697fcc52daa445_17863470',
  'has_nocache_code' => false,
  'file_dependency' => 
  array (
    '346722256f59262dd7f1c5c73d547e1384b1d562' => 
    array (
      0 => '/var/www/CNK-DEM/layouts/v7/modules/Potentials/UnifiedInventaireTab.tpl',
      1 => 1769983050,
      2 => 'file',
    ),
  ),
  'includes' => 
  array (
  ),
),false)) {
function content_697fcc52daa445_17863470 (Smarty_Internal_Template $_smarty_tpl) {
?><div class="inventaire-tab-container" id="inventaireTabContainer" data-record-id="<?php echo $_smarty_tpl->tpl_vars['RECORD_ID']->value;?>
"data-saved-volume="<?php echo (($tmp = $_smarty_tpl->tpl_vars['SAVED_VOLUME']->value ?? null)===null||$tmp==='' ? 0 ?? null : $tmp);?>
"data-saved-volume-final="<?php echo (($tmp = $_smarty_tpl->tpl_vars['SAVED_VOLUME_FINAL']->value ?? null)===null||$tmp==='' ? 0 ?? null : $tmp);?>
"data-saved-boxes="<?php echo (($tmp = $_smarty_tpl->tpl_vars['SAVED_BOXES']->value ?? null)===null||$tmp==='' ? 0 ?? null : $tmp);?>
"data-saved-inventory-b64="<?php echo $_smarty_tpl->tpl_vars['SAVED_INVENTORY_B64']->value;?>
"><div class="inventory-toolbar"><div class="toolbar-search"><i class="fa fa-search"></i><input type="text" id="unified-inventory-search" placeholder="Rechercher un article..."><div id="unified-inventory-search-results"></div></div><button class="btn btn-purple btn-sm" onclick="UnifiedInventaire.toggleNewArticleForm()"><i class="fa fa-plus"></i> Nouvel article</button><div class="toolbar-spacer"></div><div class="toolbar-volume volume-purple"><span class="volume-label">Volume inventaire</span><div class="volume-input-group"><input type="text" class="volume-input volume-readonly" id="unified-totalVolume" value="0" readonly><span class="volume-unit">m³</span></div></div><div class="toolbar-volume volume-orange"><span class="volume-label">Volume final</span><div class="volume-input-group"><input type="number" class="volume-input" id="unified-volumeFinal" value="<?php echo $_smarty_tpl->tpl_vars['SAVED_VOLUME_FINAL']->value;?>
" step="0.01" min="0"><span class="volume-unit">m³</span></div></div></div><div id="unified-new-article-form" class="new-article-form"><div class="form-title"><i class="fa fa-plus-circle"></i> Creer un nouvel article (categorie Divers)</div><div class="form-row-4"><div class="form-group"><label>Nom de l'article</label><input type="text" id="unified-new-article-name" placeholder="Ex: Carton special"></div><div class="form-group"><label>Volume (m3)</label><input type="number" id="unified-new-article-volume" placeholder="0.00" step="0.01" min="0"></div><div class="form-group"><label>Quantite</label><input type="number" id="unified-new-article-quantity" placeholder="1" min="0" value="1"></div><div class="form-group" style="display: flex; align-items: flex-end; gap: 10px;"><button class="btn btn-default" onclick="UnifiedInventaire.toggleNewArticleForm()"><i class="fa fa-times"></i></button><button class="btn btn-purple" onclick="UnifiedInventaire.createNewArticle()"><i class="fa fa-check"></i> Creer</button></div></div></div><div id="unified-categories-container"><div class="loading-indicator"><div class="spinner"></div><p>Chargement des articles...</p></div></div><div class="inventory-save-bar"><button class="btn btn-purple btn-lg" onclick="UnifiedInventaire.save()"><i class="fa fa-save"></i> Enregistrer l'inventaire</button></div></div>

<style>
.inventory-toolbar {
    display: flex;
    align-items: center;
    gap: 12px;
    background: #fff;
    padding: 12px 15px;
    border-radius: 10px;
    margin-bottom: 20px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    border: 1px solid #e0e0e0;
}

.toolbar-search {
    position: relative;
    flex: 2;
    min-width: 300px;
}

.toolbar-search > i.fa-search {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: #999;
    z-index: 1;
}

.toolbar-search input {
    width: 100%;
    padding: 10px 14px 10px 36px;
    border: 2px solid #e0e0e0;
    border-radius: 8px;
    font-size: 14px;
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
    font-size: 13px;
    z-index: 10;
    padding: 5px 10px;
    box-shadow: 0 4px 10px rgba(0,0,0,0.1);
}

.inventory-toolbar .btn {
    white-space: nowrap;
    padding: 10px 18px;
}

.toolbar-volume {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding: 10px 20px;
    border-radius: 8px;
    color: white;
    font-size: 14px;
    min-width: 160px;
    text-align: center;
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

.toolbar-volume .volume-value {
    font-size: 1.2em;
    font-weight: 700;
}

.toolbar-volume .volume-input {
    width: 70px;
    padding: 6px 8px;
    border: none;
    border-radius: 5px;
    font-size: 1em;
    font-weight: 700;
    text-align: center;
    background: rgba(255, 255, 255, 0.95);
    color: #333;
}

.toolbar-volume .volume-unit {
    font-weight: 600;
    font-size: 13px;
}

.toolbar-volume .volume-input-group {
    display: flex;
    align-items: center;
    gap: 5px;
}

.toolbar-volume .volume-input.volume-readonly {
    background: rgba(255, 255, 255, 0.3);
    cursor: default;
    color: white;
    font-weight: 700;
}

.toolbar-spacer {
    flex: 1;
}

.new-article-form {
    display: none;
    background: #fff;
    padding: 20px;
    border-radius: 12px;
    margin-bottom: 20px;
    border: 2px solid #667eea;
    box-shadow: 0 4px 15px rgba(102, 126, 234, 0.2);
}

.new-article-form .form-title {
    font-weight: 600;
    color: #667eea;
    margin-bottom: 15px;
    font-size: 15px;
}

/* Fixed Save Bar at bottom of screen */
.inventory-save-bar {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    padding: 15px 25px;
    display: flex;
    justify-content: center;
    align-items: center;
    box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.15);
    z-index: 1000;
    border-radius: 0;
}

/* Add padding at bottom of container to prevent content being hidden behind fixed bar */
.inventaire-tab-container {
    padding-bottom: 80px;
}

.inventory-save-bar .btn {
    background: white;
    color: #667eea;
    border: none;
    padding: 12px 40px;
    font-size: 16px;
    font-weight: 700;
    border-radius: 25px;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
    transition: all 0.3s ease;
}

.inventory-save-bar .btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
}

.inventory-save-bar .btn i {
    margin-right: 8px;
}

@media (max-width: 1100px) {
    .inventory-toolbar {
        flex-wrap: wrap;
    }

    .toolbar-search {
        flex: 1 1 100%;
        max-width: 100%;
        order: 1;
        margin-bottom: 10px;
    }

    .toolbar-spacer {
        display: none;
    }

    .inventory-toolbar .btn {
        order: 2;
    }

    .toolbar-volume.volume-purple {
        order: 3;
        margin-left: auto;
    }

    .toolbar-volume.volume-orange {
        order: 4;
    }
}

@media (max-width: 600px) {
    .inventory-toolbar {
        flex-direction: column;
        align-items: stretch;
    }

    .toolbar-search {
        max-width: 100%;
    }

    .inventory-toolbar .btn {
        width: 100%;
        justify-content: center;
    }

    .toolbar-volume {
        min-width: auto;
        width: 100%;
    }

    .toolbar-volume.volume-purple {
        margin-left: 0;
    }
}

/* Auto-save visual feedback */
#inventaireTabContainer.saving {
    position: relative;
}

#inventaireTabContainer.saving::after {
    content: 'Sauvegarde...';
    position: fixed;
    bottom: 80px;
    right: 20px;
    background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%);
    color: white;
    padding: 10px 20px;
    border-radius: 25px;
    font-size: 13px;
    font-weight: 600;
    z-index: 1001;
    box-shadow: 0 4px 15px rgba(243, 156, 18, 0.4);
    animation: pulse 1s infinite;
}

#inventaireTabContainer.saved::after {
    content: 'Sauvegardé ✓';
    position: fixed;
    bottom: 80px;
    right: 20px;
    background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%);
    color: white;
    padding: 10px 20px;
    border-radius: 25px;
    font-size: 13px;
    font-weight: 600;
    z-index: 1001;
    box-shadow: 0 4px 15px rgba(39, 174, 96, 0.4);
}

#inventaireTabContainer.save-error::after {
    content: 'Erreur de sauvegarde';
    position: fixed;
    bottom: 80px;
    right: 20px;
    background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
    color: white;
    padding: 10px 20px;
    border-radius: 25px;
    font-size: 13px;
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
