<?php
chdir(dirname(__FILE__));
require_once 'config.inc.php';

// S'assurer que la session est démarrée
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Charger le système CSRF de VTiger pour obtenir le token
include_once 'libraries/csrf-magic/csrf-magic.php';
$csrfToken = '';
if (function_exists('csrf_get_tokens')) {
    $csrfToken = csrf_get_tokens();
}

$potentialId = isset($_GET['record']) ? intval($_GET['record']) : 0;
if ($potentialId <= 0) die('ID invalide');

// Récupérer l'utilisateur connecté depuis la session VTiger
$currentUserId = 1; // Défaut: admin
if (isset($_SESSION['authenticated_user_id'])) {
    $currentUserId = intval($_SESSION['authenticated_user_id']);
}

$conn = new mysqli($dbconfig['db_server'], $dbconfig['db_username'], $dbconfig['db_password'], $dbconfig['db_name']);
$stmt = $conn->prepare("SELECT potentialname, contact_id FROM vtiger_potential WHERE potentialid = ?");
$stmt->bind_param('i', $potentialId);
$stmt->execute();
$result = $stmt->get_result();
$potential = $result->fetch_assoc();
$potentialName = $potential['potentialname'];
$contactId = $potential['contact_id'] ? intval($potential['contact_id']) : 0;

// Charger les devis existants de l'affaire
$quotes = [];
$quotesQuery = "SELECT q.quoteid, q.quote_no, q.subject, q.quotestage, q.total,
                       qcf.cf_1125, qcf.cf_1127, qcf.cf_1129, qcf.cf_1139,
                       DATE_FORMAT(c.createdtime, '%d/%m/%Y') as created_date
                FROM vtiger_quotes q
                LEFT JOIN vtiger_quotescf qcf ON qcf.quoteid = q.quoteid
                INNER JOIN vtiger_crmentity c ON c.crmid = q.quoteid
                WHERE q.potentialid = ? AND c.deleted = 0
                ORDER BY c.createdtime DESC";
$stmt = $conn->prepare($quotesQuery);
$stmt->bind_param('i', $potentialId);
$stmt->execute();
$quotesResult = $stmt->get_result();
while ($row = $quotesResult->fetch_assoc()) {
    $quotes[] = $row;
}

// Charger tous les produits avec leurs pourcentages acompte/solde
$products = [];
$productsQuery = "SELECT p.productid as id, p.productname, p.unit_price,
                         COALESCE(pcf.cf_1051, 43) as pct_acompte,
                         COALESCE(pcf.cf_1053, 57) as pct_solde
                  FROM vtiger_products p
                  INNER JOIN vtiger_crmentity c ON c.crmid = p.productid
                  LEFT JOIN vtiger_productcf pcf ON pcf.productid = p.productid
                  WHERE c.deleted = 0
                  ORDER BY p.productname ASC";
$productsResult = $conn->query($productsQuery);
if ($productsResult) {
    while ($row = $productsResult->fetch_assoc()) {
        $products[] = [
            'id' => $row['id'],
            'productname' => $row['productname'],
            'unit_price' => $row['unit_price'],
            'pct_acompte' => floatval($row['pct_acompte']) ?: 43,
            'pct_solde' => floatval($row['pct_solde']) ?: 57
        ];
    }
}
?>
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Générer un devis - <?php echo htmlspecialchars($potentialName); ?></title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 12px; min-height: 100vh; }
        .container { max-width: 1000px; margin: 0 auto; background: white; border-radius: 10px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); overflow: hidden; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px; text-align: center; }
        h1 { font-size: 1.5em; margin-bottom: 3px; }
        .subtitle { opacity: 0.9; font-size: 1em; }
        .form-content { padding: 18px; }
        .form-section { margin-bottom: 12px; background: #f8f9fa; border-radius: 8px; padding: 15px; border-left: 4px solid #667eea; }
        .form-section.section-info { border-left-color: #3498db; }
        .form-section.section-forfait { border-left-color: #9b59b6; }
        .form-section.section-products { border-left-color: #27ae60; }
        .form-group { margin-bottom: 10px; }
        .form-group label { display: block; margin-bottom: 4px; font-weight: 600; color: #333; font-size: 13px; }
        .form-group input, .form-group select { width: 100%; padding: 9px; border: 2px solid #e0e0e0; border-radius: 6px; font-size: 14px; }
        .form-group input:focus, .form-group select:focus { outline: none; border-color: #667eea; }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .form-row-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; }
        .form-row-4 { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 14px; }
        .btn { padding: 11px 28px; border: none; border-radius: 6px; font-size: 15px; cursor: pointer; font-weight: 600; margin: 4px; }
        .btn-primary { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
        .btn-success { background: #28a745; color: white; }
        .actions { text-align: center; padding: 12px 18px; background: #f8f9fa; border-top: 1px solid #dee2e6; }
        .required { color: #dc3545; }
        /* Désactiver les flèches de spinner sur les champs number */
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button {
            -webkit-appearance: none;
            margin: 0;
        }
        input[type="number"] {
            -moz-appearance: textfield;
        }
        .quotes-section { padding: 12px 18px; background: #e9ecef; border-bottom: 1px solid #dee2e6; }
        .quotes-section h3 { color: #667eea; margin-bottom: 10px; font-size: 1.1em; }
        .quotes-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; }
        .quote-card { background: white; border-radius: 8px; padding: 10px; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.1); transition: all 0.3s; border: 2px solid transparent; }
        .quote-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.2); border-color: #667eea; }
        .quote-card.selected { border-color: #28a745; background: #f0fff0; }
        .quote-number { font-weight: bold; color: #667eea; font-size: 0.95em; margin-bottom: 3px; }
        .quote-subject { font-size: 0.85em; color: #333; margin-bottom: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .quote-total { font-weight: bold; color: #28a745; font-size: 1em; }
        .quote-date { font-size: 0.8em; color: #666; margin-top: 3px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header" style="display: flex; justify-content: center; align-items: center; gap: 15px;">
            <h1 style="margin: 0;"><i class="fas fa-file-invoice"></i> Générer un devis</h1>
            <span style="opacity: 0.7;">|</span>
            <div class="subtitle" style="margin: 0;">Affaire: <?php echo htmlspecialchars($potentialName); ?></div>
        </div>

        <?php if (count($quotes) > 0): ?>
        <div class="quotes-section">
            <h3><i class="fas fa-folder-open"></i> Devis existants (<?php echo count($quotes); ?>) - Cliquez pour charger</h3>
            <div class="quotes-grid">
                <?php foreach ($quotes as $quote): ?>
                <div class="quote-card" onclick="loadQuote(<?php echo $quote['quoteid']; ?>)" data-quoteid="<?php echo $quote['quoteid']; ?>">
                    <div class="quote-number"><?php echo htmlspecialchars($quote['quote_no']); ?></div>
                    <div class="quote-subject" title="<?php echo htmlspecialchars($quote['subject']); ?>"><?php echo htmlspecialchars($quote['subject']); ?></div>
                    <div class="quote-total"><?php echo number_format($quote['total'], 2, ',', ' '); ?> €</div>
                    <div class="quote-date"><?php echo $quote['created_date']; ?></div>
                </div>
                <?php endforeach; ?>
            </div>
        </div>
        <?php endif; ?>

        <!-- Formulaire caché qui sera soumis vers VTiger (redirige le popup) -->
        <form id="quoteForm" method="POST" action="/index.php" target="_self">
            <input type="hidden" name="module" value="Quotes">
            <input type="hidden" name="action" value="Save">
            <input type="hidden" name="record" id="recordId" value="">
            <input type="hidden" name="potential_id" value="<?php echo $potentialId; ?>">
            <input type="hidden" name="contact_id" value="<?php echo $contactId; ?>">
            <input type="hidden" name="sourceRecord" value="<?php echo $potentialId; ?>">
            <input type="hidden" name="sourceModule" value="Potentials">
            <input type="hidden" name="relationOperation" value="true">
            <input type="hidden" name="currency_id" value="1">
            <input type="hidden" name="assigned_user_id" value="<?php echo $currentUserId; ?>">

            <!-- Champs du formulaire -->
            <input type="hidden" name="subject" id="hidden_subject" value="">
            <input type="hidden" name="cf_1005" id="hidden_cf_1005" value="">
            <input type="hidden" name="quotestage" id="hidden_quotestage" value="Created">
            <input type="hidden" name="cf_1125" id="hidden_cf_1125" value="">
            <input type="hidden" name="cf_1127" id="hidden_cf_1127" value="0">
            <input type="hidden" name="cf_1129" id="hidden_cf_1129" value="0">
            <input type="hidden" name="cf_1139" id="hidden_cf_1139" value="">
            <input type="hidden" name="cf_1141" value="14">
            <input type="hidden" name="cf_1133" value="43">
            <input type="hidden" name="cf_1135" value="57">
            <input type="hidden" name="cf_1269" id="hidden_cf_1269" value="">

            <!-- Produits - seront ajoutés dynamiquement -->
            <input type="hidden" name="totalProductCount" id="hidden_totalProductCount" value="0">
            <div id="hiddenProductsContainer"></div>
        </form>

        <div class="form-content">
            <input type="hidden" id="selectedQuoteId" value="">

            <div class="form-section section-info">
                <div class="form-row">
                    <div class="form-group">
                        <label><span class="required">*</span> Sujet du devis</label>
                        <input type="text" id="subject" value="Dev-<?php echo htmlspecialchars($potentialName); ?>" required>
                    </div>
                    <div class="form-group">
                        <label>Date de validité</label>
                        <input type="date" id="cf_1005" value="<?php echo date('Y-m-d', strtotime('+7 days')); ?>">
                    </div>
                </div>
            </div>

            <div class="form-section section-forfait">
                <div class="form-row">
                    <div class="form-group">
                        <label>Type de forfait</label>
                        <select id="cf_1125">
                            <option value="">-- Sélectionnez --</option>
                            <option value="ECO">ECO</option>
                            <option value="ECO PLUS">ECO PLUS</option>
                            <option value="CONFORT">CONFORT</option>
                            <option value="LUXE">LUXE</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Type de déménagement</label>
                        <select id="cf_1269">
                            <option value="">-- Sélectionnez --</option>
                            <option value="Groupage">Groupage</option>
                            <option value="Spécial" selected>Spécial</option>
                        </select>
                    </div>
                </div>
                <div class="form-row" style="margin-top: 10px;">
                    <div class="form-group">
                        <label>Forfait Tarif HT (€)</label>
                        <input type="number" id="cf_1127" value="" placeholder="0.00" step="0.01" min="0" onchange="updateFromHT()" oninput="updateFromHT()">
                    </div>
                    <div class="form-group">
                        <label>Forfait Supplément (€)</label>
                        <input type="number" id="cf_1129" value="" placeholder="0.00" step="0.01" min="0" onchange="updateTotalTTC()" oninput="updateTotalTTC()">
                    </div>
                </div>
                <div class="form-row" style="margin-top: 10px;">
                    <div class="form-group">
                        <label style="color: #8e44ad;">Forfait Tarif TTC (€)</label>
                        <input type="number" id="cf_1127_ttc" value="" placeholder="0.00" step="0.01" min="0" onchange="updateFromTTC()" oninput="updateFromTTC()" style="border-color: #8e44ad;">
                    </div>
                    <div class="form-group">
                        <label style="color: #2e7d32;">Forfait + Supplément TTC (€)</label>
                        <input type="number" id="forfait_total_ttc" value="0" step="0.01" readonly style="background: #e8f5e9; border-color: #2e7d32; color: #2e7d32; font-weight: bold;">
                    </div>
                </div>
                <div class="form-row" style="margin-top: 15px; padding-top: 12px; border-top: 1px dashed #dee2e6;">
                    <div class="form-group">
                        <label style="color: #667eea; font-weight: bold;">Montant Total HT (€)</label>
                        <input type="text" id="montant_total_ht" value="0.00" readonly style="background: #e8eaf6; border-color: #667eea; color: #667eea; font-weight: bold; font-size: 14px; text-align: right;">
                    </div>
                    <div class="form-group">
                        <label style="color: #764ba2; font-weight: bold;">Montant Total TTC (€)</label>
                        <input type="text" id="montant_total_ttc" value="0.00" readonly style="background: #f3e5f5; border-color: #764ba2; color: #764ba2; font-weight: bold; font-size: 14px; text-align: right;">
                    </div>
                </div>
                <div class="form-row" style="margin-top: 12px;">
                    <div class="form-group">
                        <label style="color: #27ae60; font-weight: bold;">Acompte TTC (€)</label>
                        <input type="text" id="acompte_ttc" value="0.00" readonly style="background: #e8f6e8; border-color: #27ae60; color: #27ae60; font-weight: bold; font-size: 14px; text-align: right;">
                    </div>
                    <div class="form-group">
                        <label style="color: #e67e22; font-weight: bold;">Solde TTC (€)</label>
                        <input type="text" id="solde_ttc" value="0.00" readonly style="background: #fef5e7; border-color: #e67e22; color: #e67e22; font-weight: bold; font-size: 14px; text-align: right;">
                    </div>
                </div>
            </div>

            <div class="form-section section-products">
                <div class="form-row">
                    <div class="form-group">
                        <label>Rechercher et ajouter un produit</label>
                        <input type="text" id="productSearch" placeholder="Tapez pour rechercher un produit...">
                        <div id="productResults" style="position:relative;background:white;border:1px solid #e0e0e0;border-radius:8px;margin-top:5px;max-height:300px;overflow-y:auto;display:none"></div>
                    </div>
                    <div class="form-group">
                        <label>Montant assurance</label>
                        <select id="cf_1139" onchange="updateMontantTotal()">
                            <option value="">-- Sélectionnez --</option>
                            <?php for ($i = 4000; $i <= 26000; $i += 1000): ?>
                            <option value="<?php echo $i; ?>"><?php echo number_format($i, 0, ',', ' '); ?> €</option>
                            <?php endfor; ?>
                        </select>
                    </div>
                </div>
                <table id="productsTable" style="width:100%;margin-top:15px;border-collapse:collapse;display:none">
                    <thead>
                        <tr style="background:#667eea;color:white">
                            <th style="padding:12px;text-align:left">Produit</th>
                            <th style="padding:12px;text-align:left;width:100px">Quantité</th>
                            <th style="padding:12px;text-align:left;width:120px">Prix unitaire</th>
                            <th style="padding:12px;text-align:left;width:100px">Total HT</th>
                            <th style="padding:12px;text-align:left;width:80px">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="productsList"></tbody>
                </table>
            </div>

        </div>

        <div class="actions">
            <button type="button" id="btnSave" class="btn btn-success" style="display:none;" onclick="saveQuote()">
                <i class="fas fa-save"></i> Sauvegarder
            </button>
            <button type="button" class="btn btn-primary" onclick="createQuote()">
                <i class="fas fa-plus"></i> Créer un devis
            </button>
        </div>
    </div>

    <script>
        var productCounter = 0;
        var selectedProducts = {};
        var productsData = [];
        var allProducts = <?php echo json_encode($products); ?>;
        var potentialId = <?php echo $potentialId; ?>;
        var contactId = <?php echo $contactId; ?>;
        var TVA_RATE = 1.20; // TVA 20%

        // Fonctions de calcul HT/TTC
        function updateFromHT() {
            var ht = parseFloat(document.getElementById('cf_1127').value) || 0;
            var ttc = ht * TVA_RATE;
            document.getElementById('cf_1127_ttc').value = ttc.toFixed(2);
            updateTotalTTC();
        }

        function updateFromTTC() {
            var ttc = parseFloat(document.getElementById('cf_1127_ttc').value) || 0;
            var ht = ttc / TVA_RATE;
            document.getElementById('cf_1127').value = ht.toFixed(2);
            updateTotalTTC();
        }

        function updateTotalTTC() {
            var forfaitHT = parseFloat(document.getElementById('cf_1127').value) || 0;
            var supplementHT = parseFloat(document.getElementById('cf_1129').value) || 0;
            var totalTTC = (forfaitHT + supplementHT) * TVA_RATE;
            document.getElementById('forfait_total_ttc').value = totalTTC.toFixed(2);
            updateMontantTotal();
        }

        function updateMontantTotal() {
            // Pourcentages par défaut pour le forfait (cf_1133 = 43%, cf_1135 = 57%)
            var PCT_ACOMPTE_FORFAIT = 43;
            var PCT_SOLDE_FORFAIT = 57;

            // Forfait
            var forfaitHT = parseFloat(document.getElementById('cf_1127').value) || 0;
            var supplementHT = parseFloat(document.getElementById('cf_1129').value) || 0;

            // Total des produits - calculé produit par produit avec leurs pourcentages
            var produitsHT = 0;
            var produitsAcompteHT = 0;
            var produitsSoldeHT = 0;

            var productRows = document.querySelectorAll('#productsList tr');
            productRows.forEach(function(row) {
                var totalCell = row.querySelector('.product-total');
                if (totalCell) {
                    var lineTotal = parseFloat(totalCell.textContent) || 0;
                    produitsHT += lineTotal;

                    // Récupérer les pourcentages spécifiques du produit
                    var pctAcompte = parseFloat(row.getAttribute('data-pct-acompte')) || 43;

                    // Le solde est toujours le complément à 100%
                    var pctSolde = 100 - pctAcompte;

                    // Calculer la contribution de ce produit
                    produitsAcompteHT += lineTotal * pctAcompte / 100;
                    produitsSoldeHT += lineTotal * pctSolde / 100;
                }
            });

            // Assurance : formule ((Assurance - 4000) / 1000) * 14
            var assuranceValue = parseFloat(document.getElementById('cf_1139').value) || 0;
            var assuranceHT = assuranceValue > 0 ? ((assuranceValue - 4000) / 1000) * 14 : 0;

            // Calcul Acompte HT:
            // - Forfait: réparti selon pourcentage acompte (43%)
            // - Supplément: 100% à l'acompte
            // - Assurance: 100% à l'acompte
            // - Produits: répartis selon leurs pourcentages individuels
            var forfaitAcompteHT = (forfaitHT * PCT_ACOMPTE_FORFAIT / 100) + supplementHT;
            var totalAcompteHT = forfaitAcompteHT + produitsAcompteHT + assuranceHT;

            // Calcul Solde HT:
            // - Forfait: réparti selon pourcentage solde (57%)
            // - Produits: répartis selon leurs pourcentages individuels
            var forfaitSoldeHT = forfaitHT * PCT_SOLDE_FORFAIT / 100;
            var totalSoldeHT = forfaitSoldeHT + produitsSoldeHT;

            // Calculer les montants TTC (TVA 20%)
            var acompteTTC = totalAcompteHT * TVA_RATE;
            var soldeTTC = totalSoldeHT * TVA_RATE;

            // Montant Total
            var totalHT = forfaitHT + supplementHT + produitsHT + assuranceHT;
            var totalTTC = totalHT * TVA_RATE;

            document.getElementById('acompte_ttc').value = acompteTTC.toFixed(2);
            document.getElementById('solde_ttc').value = soldeTTC.toFixed(2);
            document.getElementById('montant_total_ht').value = totalHT.toFixed(2);
            document.getElementById('montant_total_ttc').value = totalTTC.toFixed(2);
        }

        // Charger les données d'un devis existant
        function loadQuote(quoteId) {
            document.querySelectorAll('.quote-card').forEach(function(card) {
                card.classList.remove('selected');
            });
            document.querySelector('.quote-card[data-quoteid="' + quoteId + '"]').classList.add('selected');
            document.getElementById('selectedQuoteId').value = quoteId;
            document.getElementById('btnSave').style.display = 'inline-block';

            fetch('get_quote_data.php?quoteid=' + quoteId)
                .then(function(response) { return response.json(); })
                .then(function(data) {
                    if (!data.success) {
                        alert('Erreur: ' + data.message);
                        return;
                    }

                    var quote = data.quote;
                    console.log('[QUOTE] Données chargées:', quote);
                    console.log('[QUOTE] cf_1005 (validité):', quote.cf_1005);
                    console.log('[QUOTE] cf_1125:', quote.cf_1125);
                    console.log('[QUOTE] cf_1269:', quote.cf_1269);

                    document.getElementById('subject').value = quote.subject || '';
                    document.getElementById('cf_1005').value = quote.cf_1005 || '';
                    document.getElementById('cf_1125').value = quote.cf_1125 || '';
                    document.getElementById('cf_1269').value = quote.cf_1269 || '';
                    document.getElementById('cf_1127').value = quote.cf_1127 || 0;
                    document.getElementById('cf_1129').value = quote.cf_1129 || 0;
                    document.getElementById('cf_1139').value = quote.cf_1139 || '';

                    // Mettre à jour les champs TTC
                    updateFromHT();

                    // Afficher les valeurs Acompte et Solde si elles existent
                    if (quote.cf_1055) {
                        document.getElementById('acompte_ttc').value = parseFloat(quote.cf_1055).toFixed(2);
                    }
                    if (quote.cf_1057) {
                        document.getElementById('solde_ttc').value = parseFloat(quote.cf_1057).toFixed(2);
                    }

                    // Charger les produits
                    document.getElementById('productsList').innerHTML = '';
                    productCounter = 0;
                    selectedProducts = {};
                    productsData = data.products || [];

                    productsData.forEach(function(product) {
                        if (product.productid) {
                            addProduct({
                                id: product.productid,
                                name: product.productname,
                                unit_price: product.listprice,
                                pct_acompte: product.pct_acompte || 43,
                                pct_solde: product.pct_solde || 57
                            }, product.quantity);
                        }
                    });

                    document.querySelector('.form-content').scrollIntoView({ behavior: 'smooth' });
                })
                .catch(function(error) {
                    console.error('Erreur:', error);
                    alert('Erreur lors du chargement du devis');
                });
        }

        // Soumettre le formulaire via AJAX et gérer la redirection manuellement
        function submitToVtiger(recordId) {
            console.log('[QUOTE POPUP] Soumission vers VTiger, recordId:', recordId);

            // Mettre à jour le champ record (vide = nouveau, avec ID = mise à jour)
            document.getElementById('recordId').value = recordId || '';

            // Copier les valeurs visibles vers les champs cachés
            var subjectVal = document.getElementById('subject').value;
            var cf1005Val = document.getElementById('cf_1005').value;
            var cf1125Val = document.getElementById('cf_1125').value;
            var cf1269Val = document.getElementById('cf_1269').value;

            document.getElementById('hidden_subject').value = subjectVal;
            document.getElementById('hidden_cf_1005').value = cf1005Val;
            document.getElementById('hidden_cf_1125').value = cf1125Val;
            document.getElementById('hidden_cf_1269').value = cf1269Val;
            document.getElementById('hidden_cf_1127').value = document.getElementById('cf_1127').value || '0';
            document.getElementById('hidden_cf_1129').value = document.getElementById('cf_1129').value || '0';
            document.getElementById('hidden_cf_1139').value = document.getElementById('cf_1139').value;

            // Préparer les produits
            var container = document.getElementById('hiddenProductsContainer');
            container.innerHTML = '';

            var rows = document.getElementById('productsList').getElementsByTagName('tr');
            var productCount = rows.length;
            document.getElementById('hidden_totalProductCount').value = productCount;

            for (var i = 0; i < rows.length; i++) {
                var idx = i + 1;
                var row = rows[i];
                var productId = row.getAttribute('data-product-id');
                var productName = row.querySelector('input[name^="productName"]').value;
                var qty = row.querySelector('input[name^="qty"]').value;
                var listPrice = row.querySelector('input[name^="listPrice"]').value;

                var fields = [
                    {name: 'hdnProductId' + idx, value: productId},
                    {name: 'productName' + idx, value: productName},
                    {name: 'productDescription' + idx, value: productName},
                    {name: 'qty' + idx, value: qty},
                    {name: 'listPrice' + idx, value: listPrice},
                    {name: 'comment' + idx, value: ''},
                    {name: 'discount_percent' + idx, value: '0'},
                    {name: 'discount_amount' + idx, value: '0'},
                    {name: 'productDeleted' + idx, value: '0'},
                    {name: 'lineItemType' + idx, value: 'Products'},
                    {name: 'subproduct_ids' + idx, value: ''}
                ];

                fields.forEach(function(field) {
                    var input = document.createElement('input');
                    input.type = 'hidden';
                    input.name = field.name;
                    input.value = field.value;
                    container.appendChild(input);
                });
            }

            // Afficher l'indicateur de chargement
            showLoadingOverlay();

            // Soumettre via AJAX pour capturer la redirection
            var form = document.getElementById('quoteForm');
            var formData = new FormData(form);

            console.log('[QUOTE POPUP] Envoi AJAX...');

            fetch('/index.php', {
                method: 'POST',
                body: formData,
                credentials: 'include',
                redirect: 'follow'
            })
            .then(function(response) {
                console.log('[QUOTE POPUP] Réponse reçue, URL finale:', response.url);
                console.log('[QUOTE POPUP] Status:', response.status);

                // Le devis a été sauvegardé avec succès (VTiger redirige vers la page Potentials)
                console.log('[QUOTE POPUP] Devis sauvegardé, redirection vers liste des devis...');

                var quotesListUrl = '/index.php?module=Potentials&relatedModule=Quotes&view=Detail&record=' + potentialId + '&mode=showRelatedList&relationId=35&tab_label=Quotes&app=SALES';

                if (window.opener && !window.opener.closed) {
                    window.opener.location.href = quotesListUrl;
                    window.close();
                } else {
                    window.location.href = quotesListUrl;
                }
            })
            .catch(function(error) {
                console.error('[QUOTE POPUP] Erreur:', error);
                hideLoadingOverlay();
                alert('Erreur lors de la sauvegarde: ' + error.message);
            });
        }

        function showLoadingOverlay() {
            var overlay = document.createElement('div');
            overlay.id = 'loadingOverlay';
            overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);display:flex;flex-direction:column;justify-content:center;align-items:center;z-index:9999;';
            overlay.innerHTML = '<div style="background:white;padding:40px;border-radius:15px;text-align:center;box-shadow:0 10px 40px rgba(0,0,0,0.3);">' +
                '<div style="width:50px;height:50px;border:4px solid #f3f3f3;border-top:4px solid #667eea;border-radius:50%;animation:spin 1s linear infinite;margin:0 auto 20px;"></div>' +
                '<p style="color:#333;font-size:18px;margin:0;">Enregistrement en cours...</p>' +
                '<p style="color:#666;font-size:14px;margin-top:10px;">Veuillez patienter</p>' +
                '</div>' +
                '<style>@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}</style>';
            document.body.appendChild(overlay);
        }

        // Sauvegarder le devis existant (mise à jour)
        function saveQuote() {
            var quoteId = document.getElementById('selectedQuoteId').value;
            if (!quoteId) {
                alert('Veuillez d\'abord sélectionner un devis à modifier');
                return;
            }
            console.log('[QUOTE POPUP] Sauvegarde du devis existant ID:', quoteId);
            submitToVtiger(quoteId);
        }

        // Créer un nouveau devis
        function createQuote() {
            console.log('[QUOTE POPUP] Création d\'un nouveau devis');
            submitToVtiger('');
        }

        function redirectToQuote(quoteUrl) {
            console.log('[QUOTE POPUP] Redirection vers:', quoteUrl);
            hideLoadingOverlay();

            // Rediriger l'opener vers le devis et fermer le popup
            if (window.opener && !window.opener.closed) {
                // L'opener navigue vers le devis
                window.opener.location.href = quoteUrl;
                // Fermer le popup
                window.close();
            } else {
                // Pas d'opener, rediriger le popup lui-même
                window.location.href = quoteUrl;
            }
        }

        function hideLoadingOverlay() {
            var overlay = document.getElementById('loadingOverlay');
            if (overlay) overlay.remove();
        }

        // Désactiver le scroll sur les champs number
        document.addEventListener('wheel', function(e) {
            if (document.activeElement.type === 'number') {
                document.activeElement.blur();
            }
        }, { passive: true });

        // Recherche de produits
        document.addEventListener('DOMContentLoaded', function() {
            var searchInput = document.getElementById('productSearch');
            var resultsDiv = document.getElementById('productResults');
            var searchTimeout;

            searchInput.addEventListener('input', function() {
                clearTimeout(searchTimeout);
                var query = this.value.toLowerCase();
                searchTimeout = setTimeout(function() {
                    var filtered = query.length === 0 ? allProducts : allProducts.filter(function(p) {
                        return p.productname && p.productname.toLowerCase().indexOf(query) !== -1;
                    });
                    displayResults(filtered);
                }, 200);
            });

            searchInput.addEventListener('focus', function() {
                displayResults(allProducts);
            });

            document.addEventListener('click', function(e) {
                if (!searchInput.contains(e.target) && !resultsDiv.contains(e.target)) {
                    resultsDiv.style.display = 'none';
                }
            });
        });

        function displayResults(products) {
            var resultsDiv = document.getElementById('productResults');
            resultsDiv.innerHTML = '';
            if (products.length === 0) {
                resultsDiv.innerHTML = '<div style="padding:10px;color:#999">Aucun produit trouvé</div>';
                resultsDiv.style.display = 'block';
                return;
            }
            products.forEach(function(product) {
                var div = document.createElement('div');
                div.style.cssText = 'padding:10px;cursor:pointer;border-bottom:1px solid #eee';
                div.innerHTML = '<strong>' + product.productname + '</strong><br><small>' + parseFloat(product.unit_price || 0).toFixed(2) + ' € | Acompte: ' + (product.pct_acompte || 43) + '% / Solde: ' + (product.pct_solde || 57) + '%</small>';
                div.onmouseover = function() { this.style.background = '#f0f0f0'; };
                div.onmouseout = function() { this.style.background = 'white'; };
                div.onclick = function() {
                    addProduct({
                        id: product.id,
                        name: product.productname,
                        unit_price: product.unit_price,
                        pct_acompte: product.pct_acompte || 43,
                        pct_solde: product.pct_solde || 57
                    }, 1);
                    document.getElementById('productSearch').value = '';
                    resultsDiv.style.display = 'none';
                };
                resultsDiv.appendChild(div);
            });
            resultsDiv.style.display = 'block';
        }

        function addProduct(product, qty) {
            if (selectedProducts[product.id]) {
                alert('Ce produit est déjà dans la liste');
                return;
            }
            productCounter++;
            selectedProducts[product.id] = true;
            var productName = product.name || 'Produit inconnu';
            var unitPrice = parseFloat(product.unit_price || 0).toFixed(2);
            var quantity = qty || 1;
            var lineTotal = (parseFloat(unitPrice) * parseInt(quantity)).toFixed(2);
            var pctAcompte = product.pct_acompte || 43;
            var pctSolde = product.pct_solde || 57;

            var row = document.createElement('tr');
            row.setAttribute('data-product-id', product.id);
            row.setAttribute('data-pct-acompte', pctAcompte);
            row.setAttribute('data-pct-solde', pctSolde);
            row.style.borderBottom = '1px solid #dee2e6';
            row.innerHTML =
                '<td style="padding:10px"><input type="text" name="productName' + productCounter + '" value="' + productName.replace(/"/g, '&quot;') + '" style="width:100%;padding:8px;border:1px solid #dee2e6;border-radius:5px"></td>' +
                '<td style="padding:10px"><input type="number" name="qty' + productCounter + '" value="' + quantity + '" step="1" min="1" style="width:100%;padding:8px;border:1px solid #dee2e6;border-radius:5px" onchange="updateLineTotal(this)" oninput="updateLineTotal(this)"></td>' +
                '<td style="padding:10px"><input type="number" name="listPrice' + productCounter + '" value="' + unitPrice + '" step="0.01" min="0" style="width:100%;padding:8px;border:1px solid #dee2e6;border-radius:5px" onchange="updateLineTotal(this)" oninput="updateLineTotal(this)"></td>' +
                '<td style="padding:10px"><span class="product-total" style="font-weight:bold;color:#667eea;">' + lineTotal + '</span> €</td>' +
                '<td style="padding:10px"><button type="button" onclick="removeProduct(this,' + product.id + ')" style="background:#dc3545;color:white;padding:8px 15px;border:none;border-radius:8px;cursor:pointer"><i class="fas fa-trash"></i></button></td>';

            document.getElementById('productsList').appendChild(row);
            document.getElementById('productsTable').style.display = 'table';
            updateMontantTotal();
        }

        function updateLineTotal(input) {
            var row = input.closest('tr');
            var qtyInput = row.querySelector('input[name^="qty"]');
            var priceInput = row.querySelector('input[name^="listPrice"]');
            var totalSpan = row.querySelector('.product-total');

            var qty = parseFloat(qtyInput.value) || 0;
            var price = parseFloat(priceInput.value) || 0;
            var total = (qty * price).toFixed(2);

            totalSpan.textContent = total;
            updateMontantTotal();
        }

        function removeProduct(btn, productId) {
            btn.closest('tr').remove();
            delete selectedProducts[productId];
            if (document.getElementById('productsList').children.length === 0) {
                document.getElementById('productsTable').style.display = 'none';
            }
            updateMontantTotal();
        }
    </script>
</body>
</html>
