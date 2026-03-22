<?php
/**
 * Page d'inventaire client publique - accessible sans connexion VTiger
 * URL : /client-inventory.php?token=XXXXX
 */

require_once 'config.inc.php';

// Récupérer et valider le token
$token = isset($_GET['token']) ? preg_replace('/[^a-f0-9]/', '', $_GET['token']) : '';
$error = '';
$potentialId = 0;
$clientName = '';
$savedVolume = 0;
$savedVolumeFinal = 0;
$savedBoxes = 0;
$savedInventoryB64 = '';
$isLocked = false;

if (empty($token)) {
    $error = 'Lien invalide. Veuillez contacter votre conseiller CNK DEM.';
} else {
    $conn = new mysqli($dbconfig['db_server'], $dbconfig['db_username'], $dbconfig['db_password'], $dbconfig['db_name']);
    $conn->set_charset('utf8');

    if ($conn->connect_error) {
        $error = 'Erreur de connexion. Veuillez réessayer.';
    } else {
        // Valider le token
        $stmt = $conn->prepare("SELECT potential_id FROM vtiger_client_inventory_tokens WHERE token = ? AND expires_at > NOW() LIMIT 1");
        $stmt->bind_param('s', $token);
        $stmt->execute();
        $result = $stmt->get_result();

        if ($result->num_rows === 0) {
            $error = 'Ce lien est expiré ou invalide. Veuillez contacter votre conseiller CNK DEM.';
        } else {
            $row = $result->fetch_assoc();
            $potentialId = $row['potential_id'];

            // Récupérer les données de l'affaire
            $stmt2 = $conn->prepare("
                SELECT p.potentialname, c.firstname, c.lastname, a.accountname,
                       pcf.cf_939, pcf.cf_1259, pcf.cf_963, pcf.cf_969
                FROM vtiger_potential p
                LEFT JOIN vtiger_potentialscf pcf ON pcf.potentialid = p.potentialid
                LEFT JOIN vtiger_crmentity ce ON ce.crmid = p.potentialid
                LEFT JOIN vtiger_contactdetails c ON c.contactid = p.related_to
                LEFT JOIN vtiger_account a ON a.accountid = p.related_to
                WHERE p.potentialid = ? AND ce.deleted = 0
            ");
            $stmt2->bind_param('i', $potentialId);
            $stmt2->execute();
            $affaire = $stmt2->get_result()->fetch_assoc();

            if (!$affaire) {
                $error = 'Affaire introuvable.';
            } else {
                // Nom du client
                if (!empty($affaire['firstname']) || !empty($affaire['lastname'])) {
                    $clientName = trim(($affaire['firstname'] ?? '') . ' ' . ($affaire['lastname'] ?? ''));
                } elseif (!empty($affaire['accountname'])) {
                    $clientName = $affaire['accountname'];
                } else {
                    $clientName = $affaire['potentialname'];
                }

                $savedVolume = floatval($affaire['cf_939'] ?? 0);
                $savedVolumeFinal = floatval($affaire['cf_1259'] ?? 0);
                $savedBoxes = intval($affaire['cf_963'] ?? 0);
                $inventoryJson = $affaire['cf_969'] ?: '{}';
                $inventoryJson = html_entity_decode($inventoryJson, ENT_QUOTES, 'UTF-8');
                $savedInventoryB64 = base64_encode($inventoryJson);

                // Vérifier si l'affaire est validée (cf_1164 = checkbox)
                $stmtLock = $conn->prepare("SELECT cf_1164 FROM vtiger_potentialscf WHERE potentialid = ?");
                $stmtLock->bind_param('i', $potentialId);
                $stmtLock->execute();
                $lockRow = $stmtLock->get_result()->fetch_assoc();
                if ($lockRow && $lockRow['cf_1164'] == '1') {
                    $isLocked = true;
                }
                $stmtLock->close();
            }
        }
        $conn->close();
    }
}
?><!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Inventaire - CNK DEM</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css">
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f0f2f5; color: #333; min-height: 100vh; }

        /* Header */
        .page-header {
            background: linear-gradient(135deg, #1F314D 0%, #2c4a7a 100%);
            color: white;
            padding: 16px 20px;
            display: flex;
            align-items: center;
            gap: 16px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        }
        .page-header .logo { font-size: 22px; font-weight: 800; letter-spacing: 1px; }
        .page-header .client-info { flex: 1; }
        .page-header .client-name { font-size: 17px; font-weight: 600; }
        .page-header .page-subtitle { font-size: 12px; opacity: 0.8; margin-top: 2px; }

        /* Main content */
        .page-content { padding: 16px; max-width: 1400px; margin: 0 auto; }

        /* Error page */
        .error-box {
            background: white;
            border-radius: 12px;
            padding: 48px 32px;
            text-align: center;
            max-width: 500px;
            margin: 60px auto;
            box-shadow: 0 4px 20px rgba(0,0,0,0.08);
        }
        .error-box i { font-size: 48px; color: #e74c3c; margin-bottom: 20px; }
        .error-box h2 { color: #333; margin-bottom: 12px; }
        .error-box p { color: #666; font-size: 14px; }

        /* Inventory toolbar (from UnifiedInventaireTab.tpl) */
        .inventory-toolbar {
            display: flex; align-items: center; gap: 12px;
            background: #fff; padding: 10px 12px; border-radius: 10px;
            margin-bottom: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);
            border: 1px solid #e0e0e0; flex-wrap: wrap;
        }
        .toolbar-search { position: relative; flex: 2; min-width: 200px; }
        .toolbar-search > i.fa-search {
            position: absolute; left: 10px; top: 50%; transform: translateY(-50%);
            color: #999; z-index: 1;
        }
        .toolbar-search input {
            width: 100%; padding: 8px 12px 8px 32px; border: 2px solid #e0e0e0;
            border-radius: 8px; font-size: 13px; background: #f8f9fa; transition: all 0.3s;
        }
        .toolbar-search input:focus { outline: none; border-color: #667eea; background: #fff; box-shadow: 0 0 0 3px rgba(102,126,234,0.1); }
        #unified-inventory-search-results {
            position: absolute; top: 100%; left: 0; right: 0; background: white;
            border-radius: 0 0 8px 8px; font-size: 12px; z-index: 10;
            padding: 4px 10px; box-shadow: 0 4px 10px rgba(0,0,0,0.1);
        }
        .toolbar-volume {
            display: flex; align-items: center; gap: 8px; padding: 8px 14px;
            border-radius: 8px; color: white; font-size: 13px; white-space: nowrap;
        }
        .toolbar-volume.volume-purple { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
        .toolbar-volume.volume-orange { background: linear-gradient(135deg, #e67e22 0%, #d35400 100%); }
        .toolbar-volume .volume-label { font-size: 12px; opacity: 0.9; }
        .toolbar-volume .volume-input {
            width: 60px; padding: 4px 6px; border: none; border-radius: 4px;
            font-size: 13px; font-weight: 700; text-align: center;
            background: rgba(255,255,255,0.95); color: #333;
        }
        .toolbar-volume .volume-input.volume-readonly { background: rgba(255,255,255,0.3); cursor: default; color: white; font-weight: 700; }
        .toolbar-volume .volume-unit { font-weight: 600; font-size: 12px; }
        .toolbar-volume .volume-input-group { display: flex; align-items: center; gap: 4px; }
        .toolbar-spacer { flex: 1; }
        .btn {
            display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px;
            border: none; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 500;
            white-space: nowrap; transition: all 0.2s;
        }
        .btn-purple { background: linear-gradient(135deg, #667eea, #764ba2); color: white; }
        .btn-purple:hover { opacity: 0.9; transform: translateY(-1px); }
        .btn-default { background: #f0f0f0; color: #555; }
        .btn-default:hover { background: #e0e0e0; }

        /* New article form */
        .new-article-form {
            display: none; background: #fff; padding: 15px; border-radius: 10px;
            margin-bottom: 12px; border: 2px solid #667eea;
            box-shadow: 0 4px 15px rgba(102,126,234,0.2);
        }
        .new-article-form .form-title { font-weight: 600; color: #667eea; margin-bottom: 10px; font-size: 14px; }
        .form-row-4 { display: flex; gap: 12px; flex-wrap: wrap; }
        .form-group { display: flex; flex-direction: column; gap: 4px; flex: 1; min-width: 120px; }
        .form-group label { font-size: 12px; color: #666; font-weight: 500; }
        .form-group input {
            padding: 7px 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 13px;
        }
        .form-group input:focus { outline: none; border-color: #667eea; box-shadow: 0 0 0 2px rgba(102,126,234,0.1); }

        /* Two columns */
        .inventory-columns { display: flex; gap: 12px; min-height: 400px; }
        .inventory-col {
            flex: 1; background: #fff; border-radius: 10px;
            border: 1px solid #e0e0e0; overflow: hidden; display: flex; flex-direction: column;
        }
        .inventory-col .col-header {
            padding: 8px 12px; font-size: 13px; font-weight: 600;
            color: #555; border-bottom: 1px solid #e0e0e0; background: #f8f9fa;
        }
        .inventory-col .col-header i { margin-right: 6px; color: #667eea; }
        .inventory-col-right .col-header i { color: #27ae60; }
        #unified-available-items, #unified-selected-items { flex: 1; overflow-y: auto; max-height: 600px; }

        /* Available items */
        .avail-item {
            display: flex; align-items: center; padding: 5px 10px; cursor: pointer;
            border-bottom: 1px solid #f0f0f0; font-size: 13px; transition: background 0.15s; gap: 8px;
        }
        .avail-item:hover { background: #f0f4ff; }
        .avail-item.already-added { background: #f0faf0; }
        .avail-name { flex: 1; font-weight: 500; color: #333; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .avail-vol { color: #888; font-size: 12px; white-space: nowrap; }
        .avail-qty { background: #667eea; color: white; border-radius: 10px; padding: 1px 7px; font-size: 11px; font-weight: 700; min-width: 20px; text-align: center; }
        .avail-add { color: #667eea; font-size: 12px; }

        /* Selected items */
        .selected-item { display: flex; align-items: center; padding: 5px 10px; border-bottom: 1px solid #f0f0f0; font-size: 13px; gap: 6px; }
        .sel-name { flex: 1; font-weight: 500; color: #333; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .sel-vol { color: #888; font-size: 12px; white-space: nowrap; }
        .sel-qty-controls { display: flex; align-items: center; gap: 2px; }
        .sel-qty-controls .btn-qty {
            width: 26px; height: 26px; border: 1px solid #ddd; background: #f8f9fa;
            border-radius: 4px; cursor: pointer; font-size: 14px; font-weight: 700;
            color: #555; display: flex; align-items: center; justify-content: center; transition: all 0.15s;
        }
        .sel-qty-controls .btn-qty:hover { background: #667eea; color: white; border-color: #667eea; }
        .sel-qty-controls .qty-input {
            width: 45px; padding: 3px 4px; border: 1px solid #ddd; border-radius: 4px;
            font-size: 13px; font-weight: 600; text-align: center; -moz-appearance: textfield;
        }
        .sel-qty-controls .qty-input::-webkit-outer-spin-button,
        .sel-qty-controls .qty-input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        .btn-remove { background: none; border: none; color: #ccc; cursor: pointer; padding: 2px 4px; font-size: 12px; transition: color 0.15s; }
        .btn-remove:hover { color: #e74c3c; }
        .empty-selection { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px 20px; color: #bbb; text-align: center; }
        .empty-selection i { font-size: 28px; margin-bottom: 10px; }
        .empty-selection p { font-size: 13px; margin: 0; }
        .loading-indicator { display: flex; flex-direction: column; align-items: center; padding: 40px; color: #999; }

        /* Save feedback */
        #inventaireTabContainer.saving::after {
            content: 'Sauvegarde...'; position: fixed; bottom: 20px; right: 20px;
            background: linear-gradient(135deg, #f39c12, #e67e22); color: white;
            padding: 8px 16px; border-radius: 20px; font-size: 12px; font-weight: 600;
            z-index: 1001; box-shadow: 0 4px 15px rgba(243,156,18,0.4);
        }
        #inventaireTabContainer.saved::after {
            content: 'Inventaire sauvegardé ✓'; position: fixed; bottom: 20px; right: 20px;
            background: linear-gradient(135deg, #27ae60, #2ecc71); color: white;
            padding: 8px 16px; border-radius: 20px; font-size: 12px; font-weight: 600;
            z-index: 1001; box-shadow: 0 4px 15px rgba(39,174,96,0.4);
        }
        #inventaireTabContainer.save-error::after {
            content: 'Erreur de sauvegarde'; position: fixed; bottom: 20px; right: 20px;
            background: linear-gradient(135deg, #e74c3c, #c0392b); color: white;
            padding: 8px 16px; border-radius: 20px; font-size: 12px; font-weight: 600;
            z-index: 1001; box-shadow: 0 4px 15px rgba(231,76,60,0.4);
        }

        /* Responsive */
        @media (max-width: 900px) { .inventory-columns { flex-direction: column; } #unified-available-items, #unified-selected-items { max-height: 350px; } }
        @media (max-width: 600px) {
            .inventory-toolbar { gap: 6px; }
            .toolbar-search { flex: 1 1 100%; order: 3; }
            .toolbar-search input { font-size: 16px !important; }
            .inventory-toolbar .btn { width: 100%; justify-content: center; order: 4; }
            .toolbar-volume { min-width: auto; width: calc(50% - 3px); flex: 0 0 auto; }
            .toolbar-volume.volume-purple { margin-left: 0; order: 1; }
            .toolbar-volume.volume-orange { order: 2; }
            .toolbar-volume .volume-label { font-size: 10px; }
            .toolbar-volume .volume-input { width: 50px; font-size: 12px; }
            .form-row-4 { flex-direction: column; }
        }
    </style>
</head>
<body>

<div class="page-header">
    <div class="logo">CNK DEM</div>
    <div class="client-info">
        <?php if ($error): ?>
            <div class="client-name">Inventaire en ligne</div>
        <?php else: ?>
            <div class="client-name"><?php echo htmlspecialchars($clientName); ?></div>
            <div class="page-subtitle">Inventaire de déménagement — remplissez les articles à déménager</div>
        <?php endif; ?>
    </div>
</div>

<?php if ($error): ?>
<div class="page-content">
    <div class="error-box">
        <i class="fa fa-exclamation-circle"></i>
        <h2>Lien invalide</h2>
        <p><?php echo htmlspecialchars($error); ?></p>
    </div>
</div>
<?php else: ?>

<div class="page-content">
    <?php if ($isLocked): ?>
    <div style="background:#BD3733; color:#fff; text-align:center; padding:14px 20px; font-size:15px; font-weight:600;">
        <i class="fa fa-lock"></i> Votre dossier a été validé — l'inventaire n'est plus modifiable.
    </div>
    <?php endif; ?>
    <div class="inventaire-tab-container" id="inventaireTabContainer"
         data-record-id="<?php echo $potentialId; ?>"
         data-saved-volume="<?php echo $savedVolume; ?>"
         data-saved-volume-final="<?php echo $savedVolumeFinal; ?>"
         data-saved-boxes="<?php echo $savedBoxes; ?>"
         data-saved-inventory-b64="<?php echo htmlspecialchars($savedInventoryB64); ?>"
         data-locked="<?php echo $isLocked ? '1' : '0'; ?>">

        <!-- Toolbar -->
        <div class="inventory-toolbar">
            <div class="toolbar-search">
                <i class="fa fa-search"></i>
                <input type="text" id="unified-inventory-search" placeholder="Rechercher un article...">
                <div id="unified-inventory-search-results"></div>
            </div>
            <button class="btn btn-purple" onclick="ClientInventaire.toggleNewArticleForm()">
                <i class="fa fa-plus"></i> Nouvel article
            </button>
            <div class="toolbar-spacer"></div>
            <div class="toolbar-volume volume-purple">
                <span class="volume-label">Vol inv</span>
                <div class="volume-input-group">
                    <input type="text" class="volume-input volume-readonly" id="unified-totalVolume" value="0" readonly>
                    <span class="volume-unit">m³</span>
                </div>
            </div>
            <div class="toolbar-volume volume-orange">
                <span class="volume-label">Vol fin</span>
                <div class="volume-input-group">
                    <input type="number" class="volume-input" id="unified-volumeFinal" value="<?php echo $savedVolumeFinal; ?>" step="0.01" min="0">
                    <span class="volume-unit">m³</span>
                </div>
            </div>
        </div>

        <!-- Formulaire nouvel article -->
        <div id="unified-new-article-form" class="new-article-form">
            <div class="form-title"><i class="fa fa-plus-circle"></i> Créer un nouvel article (catégorie Divers)</div>
            <div class="form-row-4">
                <div class="form-group">
                    <label>Nom de l'article</label>
                    <input type="text" id="unified-new-article-name" placeholder="Ex: Carton spécial">
                </div>
                <div class="form-group">
                    <label>Volume (m³)</label>
                    <input type="number" id="unified-new-article-volume" placeholder="0.00" step="0.01" min="0">
                </div>
                <div class="form-group">
                    <label>Quantité</label>
                    <input type="number" id="unified-new-article-quantity" placeholder="1" min="0" value="1">
                </div>
                <div class="form-group" style="display:flex;align-items:flex-end;gap:10px;">
                    <button class="btn btn-default" onclick="ClientInventaire.toggleNewArticleForm()"><i class="fa fa-times"></i></button>
                    <button class="btn btn-purple" onclick="ClientInventaire.createNewArticle()"><i class="fa fa-check"></i> Créer</button>
                </div>
            </div>
        </div>

        <!-- Deux colonnes -->
        <div class="inventory-columns">
            <div class="inventory-col inventory-col-left">
                <div class="col-header"><i class="fa fa-list"></i> Articles disponibles</div>
                <div id="unified-available-items">
                    <div class="loading-indicator"><p>Chargement...</p></div>
                </div>
            </div>
            <div class="inventory-col inventory-col-right">
                <div class="col-header"><i class="fa fa-check-circle"></i> Sélection</div>
                <div id="unified-selected-items">
                    <div class="empty-selection"><i class="fa fa-arrow-left"></i><p>Cliquez sur un article pour l'ajouter</p></div>
                </div>
            </div>
        </div>

    </div>
</div>

<script>
var CLIENT_INVENTORY_TOKEN = <?php echo json_encode($token); ?>;

window.ClientInventaire = {
    recordId: null,
    inventory: {},
    itemsDb: {},
    categoriesInfo: {},
    autoSaveTimeout: null,
    isSaving: false,
    isLocked: false,

    showNotification: function(msg, type) {
        var el = document.createElement('div');
        el.textContent = msg;
        el.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);padding:10px 20px;border-radius:20px;color:white;font-size:14px;font-weight:600;z-index:9999;box-shadow:0 4px 15px rgba(0,0,0,0.2);';
        el.style.background = type === 'error' ? '#e74c3c' : '#27ae60';
        document.body.appendChild(el);
        setTimeout(function() { el.remove(); }, 3000);
    },

    triggerDebouncedAutoSave: function() {
        if (this.isLocked) return;
        var self = this;
        clearTimeout(this.autoSaveTimeout);
        this.autoSaveTimeout = setTimeout(function() { self.autoSave(); }, 1000);
    },

    init: function() {
        var self = this;
        var container = jQuery('#inventaireTabContainer');
        if (!container.length) return;

        this.recordId = container.data('record-id');
        var savedInventoryB64 = container.attr('data-saved-inventory-b64') || '';

        var savedInventory = {};
        if (savedInventoryB64) {
            try { savedInventory = JSON.parse(atob(savedInventoryB64)); } catch(e) {}
        }

        this.isLocked = container.data('locked') === 1;

        this.loadItemsFromDatabase().then(function() {
            if (savedInventory && Object.keys(savedInventory).length > 0) {
                self.inventory = savedInventory;
            } else {
                self.initEmptyInventory();
            }
            self.renderAllCategories();
            self.updateTotalVolume();
            self.initSearch();

            if (self.isLocked) {
                // Désactiver tous les inputs et boutons
                jQuery('#inventaireTabContainer input, #inventaireTabContainer button, #inventaireTabContainer select').prop('disabled', true);
                jQuery('.qty-input').prop('disabled', true);
                jQuery('.inventory-toolbar').css('pointer-events', 'none').css('opacity', '0.6');
                jQuery('#unified-new-article-form').hide();
            } else {
                jQuery('#unified-volumeFinal').off('change blur').on('change blur', function() {
                    self.triggerDebouncedAutoSave();
                });
            }
        });
    },

    loadItemsFromDatabase: function() {
        var self = this;
        return jQuery.ajax({ url: 'get_inventory_items.php', dataType: 'json' }).then(function(data) {
            if (data && data.success) {
                self.itemsDb = data.items;
                self.categoriesInfo = data.categories;
            }
        });
    },

    initEmptyInventory: function() {
        var self = this;
        Object.keys(this.itemsDb).forEach(function(cat) {
            self.inventory[cat] = {};
            self.itemsDb[cat].forEach(function(item) { self.inventory[cat][item.name] = 0; });
        });
    },

    renderAllCategories: function() {
        this.renderAvailableItems();
        this.renderSelectedItems();
    },

    renderAvailableItems: function() {
        var self = this;
        var html = '';
        Object.keys(this.itemsDb).forEach(function(catId) {
            self.itemsDb[catId].forEach(function(item) {
                var safeName = item.name.replace(/'/g, "\\'");
                var qty = self.inventory[catId] ? (self.inventory[catId][item.name] || 0) : 0;
                html += '<div class="avail-item' + (qty > 0 ? ' already-added' : '') + '" onclick="ClientInventaire.addItemToSelection(\'' + catId + '\', \'' + safeName + '\')">';
                html += '<span class="avail-name">' + item.name + '</span>';
                html += '<span class="avail-vol">' + item.volume + ' m\u00b3</span>';
                if (qty > 0) html += '<span class="avail-qty">' + qty + '</span>';
                html += '<i class="fa fa-plus avail-add"></i></div>';
            });
        });
        jQuery('#unified-available-items').html(html);
    },

    renderSelectedItems: function() {
        var self = this;
        var html = '';
        var hasItems = false;
        Object.keys(this.inventory).forEach(function(catId) {
            if (!self.itemsDb[catId]) return;
            self.itemsDb[catId].forEach(function(item) {
                var qty = self.inventory[catId][item.name] || 0;
                if (qty > 0) {
                    hasItems = true;
                    var safeName = item.name.replace(/'/g, "\\'");
                    var safeId = 'sel_' + catId + '_' + item.name.replace(/[^a-z0-9]/gi, '_');
                    html += '<div class="selected-item">';
                    html += '<span class="sel-name">' + item.name + '</span>';
                    html += '<span class="sel-vol">' + item.volume + ' m\u00b3</span>';
                    html += '<div class="sel-qty-controls">';
                    html += '<button class="btn-qty" onclick="ClientInventaire.changeQty(\'' + catId + '\', \'' + safeName + '\', -1)">\u2212</button>';
                    html += '<input type="number" class="qty-input" id="' + safeId + '" value="' + qty + '" min="0" onchange="ClientInventaire.setQty(\'' + catId + '\', \'' + safeName + '\', this.value)">';
                    html += '<button class="btn-qty" onclick="ClientInventaire.changeQty(\'' + catId + '\', \'' + safeName + '\', 1)">+</button>';
                    html += '</div>';
                    html += '<button class="btn-remove" onclick="ClientInventaire.removeItemFromSelection(\'' + catId + '\', \'' + safeName + '\')"><i class="fa fa-times"></i></button>';
                    html += '</div>';
                }
            });
        });
        if (!hasItems) html = '<div class="empty-selection"><i class="fa fa-arrow-left"></i><p>Cliquez sur un article pour l\'ajouter</p></div>';
        jQuery('#unified-selected-items').html(html);
    },

    addItemToSelection: function(cat, itemName) {
        if (!this.inventory[cat]) this.inventory[cat] = {};
        this.inventory[cat][itemName] = (this.inventory[cat][itemName] || 0) + 1;
        this.renderAllCategories();
        this.updateTotalVolume();
        this.triggerDebouncedAutoSave();
    },

    removeItemFromSelection: function(cat, itemName) {
        if (this.inventory[cat]) this.inventory[cat][itemName] = 0;
        this.renderAllCategories();
        this.updateTotalVolume();
        this.triggerDebouncedAutoSave();
    },

    changeQty: function(cat, itemName, delta) {
        if (!this.inventory[cat]) this.inventory[cat] = {};
        var newQty = Math.max(0, (this.inventory[cat][itemName] || 0) + delta);
        this.inventory[cat][itemName] = newQty;
        if (newQty === 0) { this.renderAllCategories(); } else {
            var safeId = 'sel_' + cat + '_' + itemName.replace(/[^a-z0-9]/gi, '_');
            jQuery('#' + safeId).val(newQty);
            this.renderAvailableItems();
        }
        this.updateTotalVolume();
        this.triggerDebouncedAutoSave();
    },

    setQty: function(cat, itemName, value) {
        if (!this.inventory[cat]) this.inventory[cat] = {};
        var newQty = Math.max(0, parseInt(value) || 0);
        this.inventory[cat][itemName] = newQty;
        if (newQty === 0) { this.renderAllCategories(); } else { this.renderAvailableItems(); }
        this.updateTotalVolume();
        this.triggerDebouncedAutoSave();
    },

    updateTotalVolume: function() {
        var self = this;
        var totalVolume = 0;
        Object.keys(this.inventory).forEach(function(cat) {
            if (self.itemsDb[cat]) {
                self.itemsDb[cat].forEach(function(item) {
                    totalVolume += (self.inventory[cat][item.name] || 0) * item.volume;
                });
            }
        });
        jQuery('#unified-totalVolume').val(totalVolume.toFixed(2));
    },

    initSearch: function() {
        jQuery('#unified-inventory-search').on('input', function() {
            var term = jQuery(this).val().toLowerCase().trim();
            var items = jQuery('#unified-available-items .avail-item');
            if (!term) { items.show(); jQuery('#unified-inventory-search-results').text(''); return; }
            var count = 0;
            items.each(function() {
                var match = jQuery(this).find('.avail-name').text().toLowerCase().indexOf(term) !== -1;
                jQuery(this).toggle(match);
                if (match) count++;
            });
            jQuery('#unified-inventory-search-results')
                .text(count === 0 ? 'Aucun article trouvé' : count + ' article(s) trouvé(s)')
                .css('color', count === 0 ? '#e74c3c' : '#27ae60');
        });
    },

    toggleNewArticleForm: function() {
        var form = jQuery('#unified-new-article-form');
        form.toggle();
        if (form.is(':visible')) jQuery('#unified-new-article-name').focus();
    },

    createNewArticle: function() {
        var self = this;
        var name = jQuery('#unified-new-article-name').val().trim();
        var volume = parseFloat(jQuery('#unified-new-article-volume').val());
        var quantity = parseInt(jQuery('#unified-new-article-quantity').val()) || 1;

        if (!name) { self.showNotification('Veuillez entrer un nom d\'article', 'error'); return; }
        if (isNaN(volume) || volume < 0) { self.showNotification('Veuillez entrer un volume valide', 'error'); return; }

        jQuery.post('client-inventory-create-article.php', {
            token: CLIENT_INVENTORY_TOKEN,
            productname: name,
            unit_price: volume
        }, function(result) {
            if (result.success) {
                self.showNotification('Article créé avec succès !', 'success');
                self.toggleNewArticleForm();
                self.loadItemsFromDatabase().then(function() {
                    if (!self.inventory['divers']) self.inventory['divers'] = {};
                    self.inventory['divers'][name] = quantity;
                    self.renderAllCategories();
                    self.updateTotalVolume();
                    self.triggerDebouncedAutoSave();
                });
            } else {
                self.showNotification('Erreur : ' + (result.error || 'Erreur inconnue'), 'error');
            }
        }, 'json').fail(function() {
            self.showNotification('Erreur lors de la création', 'error');
        });
    },

    autoSave: function() {
        var self = this;
        if (this.isSaving) return;
        this.isSaving = true;

        var totalVolume = 0;
        Object.keys(this.inventory).forEach(function(cat) {
            if (self.itemsDb[cat]) {
                self.itemsDb[cat].forEach(function(item) {
                    totalVolume += (self.inventory[cat][item.name] || 0) * item.volume;
                });
            }
        });

        var volumeFinal = parseFloat(jQuery('#unified-volumeFinal').val()) || 0;
        var totalBoxes = Math.ceil(totalVolume * 7);

        jQuery('#inventaireTabContainer').addClass('saving');

        jQuery.ajax({
            url: 'client-inventory-save.php',
            type: 'POST',
            data: {
                token: CLIENT_INVENTORY_TOKEN,
                volume: totalVolume.toFixed(2),
                volume_final: volumeFinal.toFixed(2),
                boxes: totalBoxes,
                inventory: JSON.stringify(this.inventory)
            },
            success: function(response) {
                self.isSaving = false;
                var result = typeof response === 'string' ? JSON.parse(response) : response;
                jQuery('#inventaireTabContainer').removeClass('saving').addClass('saved');
                setTimeout(function() { jQuery('#inventaireTabContainer').removeClass('saved'); }, 2000);
                if (!result.success) {
                    jQuery('#inventaireTabContainer').addClass('save-error');
                    setTimeout(function() { jQuery('#inventaireTabContainer').removeClass('save-error'); }, 3000);
                }
            },
            error: function() {
                self.isSaving = false;
                jQuery('#inventaireTabContainer').removeClass('saving').addClass('save-error');
                setTimeout(function() { jQuery('#inventaireTabContainer').removeClass('save-error'); }, 3000);
            }
        });
    }
};

jQuery(document).ready(function() {
    ClientInventaire.init();
});
</script>

<?php endif; ?>
</body>
</html>
