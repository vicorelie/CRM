<?php
chdir(dirname(__FILE__));
require_once 'config.inc.php';
$potentialId = isset($_GET['record']) ? intval($_GET['record']) : 0;
if ($potentialId <= 0) die('ID invalide');
$conn = new mysqli($dbconfig['db_server'], $dbconfig['db_username'], $dbconfig['db_password'], $dbconfig['db_name']);
$stmt = $conn->prepare("SELECT potentialname, contact_id FROM vtiger_potential WHERE potentialid = ?");
$stmt->bind_param('i', $potentialId);
$stmt->execute();
$result = $stmt->get_result();
$potential = $result->fetch_assoc();
$potentialName = $potential['potentialname'];
$contactId = $potential['contact_id'] ? intval($potential['contact_id']) : 0;

// Charger tous les produits
$products = [];
$productsQuery = "SELECT p.productid as id, p.productname, p.unit_price
                  FROM vtiger_products p
                  INNER JOIN vtiger_crmentity c ON c.crmid = p.productid
                  WHERE c.deleted = 0
                  ORDER BY p.productname ASC";
$productsResult = $conn->query($productsQuery);
if ($productsResult) {
    while ($row = $productsResult->fetch_assoc()) {
        $products[] = [
            'id' => $row['id'],
            'productname' => $row['productname'],
            'unit_price' => $row['unit_price']
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
        body { font-family: Arial, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; min-height: 100vh; }
        .container { max-width: 900px; margin: 0 auto; background: white; border-radius: 15px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); overflow: hidden; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
        h1 { font-size: 2em; margin-bottom: 10px; }
        .subtitle { opacity: 0.9; font-size: 1.1em; }
        .form-content { padding: 30px; }
        .form-section { margin-bottom: 30px; background: #f8f9fa; border-radius: 10px; padding: 20px; }
        .form-section h3 { color: #667eea; margin-bottom: 15px; font-size: 1.3em; }
        .form-group { margin-bottom: 15px; }
        .form-group label { display: block; margin-bottom: 5px; font-weight: 600; color: #333; }
        .form-group input, .form-group select { width: 100%; padding: 12px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 14px; }
        .form-group input:focus, .form-group select:focus { outline: none; border-color: #667eea; }
        .form-group input[readonly] { background-color: #f0f0f0; }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
        .btn { padding: 12px 30px; border: none; border-radius: 8px; font-size: 16px; cursor: pointer; font-weight: 600; }
        .btn-primary { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
        .btn-success { background: #28a745; color: white; }
        .actions { text-align: center; padding: 20px 30px; background: #f8f9fa; border-top: 1px solid #dee2e6; }
        .required { color: #dc3545; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1><i class="fas fa-file-invoice"></i> Générer un devis</h1>
            <div class="subtitle">Affaire: <?php echo htmlspecialchars($potentialName); ?></div>
        </div>
        <div class="form-content">
            <form id="quoteForm" method="POST" action="index.php">
                <input type="hidden" name="module" value="Quotes">
                <input type="hidden" name="action" value="Save">
                <input type="hidden" name="potential_id" value="<?php echo $potentialId; ?>">
                <input type="hidden" name="contact_id" value="<?php echo $contactId; ?>">
                <input type="hidden" name="sourceRecord" value="<?php echo $potentialId; ?>">
                <input type="hidden" name="sourceModule" value="Potentials">
                <input type="hidden" name="relationOperation" value="true">

                <div class="form-section">
                    <h3>Informations générales</h3>
                    <div class="form-group">
                        <label><span class="required">*</span> Sujet du devis</label>
                        <input type="text" name="subject" value="Dev-<?php echo htmlspecialchars($potentialName); ?>" required>
                    </div>
                    <div class="form-group">
                        <label>Date de validité</label>
                        <input type="date" name="validtill" value="<?php echo date('Y-m-d', strtotime('+7 days')); ?>">
                    </div>
                </div>

                <div class="form-section">
                    <h3>Forfait</h3>
                    <div class="form-group">
                        <label>Type de forfait</label>
                        <select name="cf_1125">
                            <option value="">-- Sélectionnez --</option>
                            <option value="FORFAIT ECO">FORFAIT ECO</option>
                            <option value="FORFAIT ECO PLUS">FORFAIT ECO PLUS</option>
                            <option value="FORFAIT CONFORT">FORFAIT CONFORT</option>
                            <option value="FORFAIT LUXE">FORFAIT LUXE</option>
                        </select>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Forfait Tarif (€)</label>
                            <input type="number" name="cf_1127" value="0" step="0.01" min="0">
                        </div>
                        <div class="form-group">
                            <label>Forfait Supplément (€)</label>
                            <input type="number" name="cf_1129" value="0" step="0.01" min="0">
                        </div>
                    </div>
                </div>

                <div class="form-section">
                    <h3>Produits / Services</h3>
                    <div class="form-group">
                        <label>Rechercher et ajouter un produit</label>
                        <input type="text" id="productSearch" placeholder="Tapez pour rechercher un produit..." style="width:100%;padding:12px;border:2px solid #e0e0e0;border-radius:8px;font-size:14px">
                        <div id="productResults" style="position:relative;background:white;border:1px solid #e0e0e0;border-radius:8px;margin-top:5px;max-height:300px;overflow-y:auto;display:none"></div>
                    </div>

                    <input type="hidden" id="totalProductCount" name="totalProductCount" value="0">
                    <table id="productsTable" style="width:100%;margin-top:15px;border-collapse:collapse;display:none">
                        <thead>
                            <tr style="background:#667eea;color:white">
                                <th style="padding:12px;text-align:left">Produit</th>
                                <th style="padding:12px;text-align:left;width:100px">Quantité</th>
                                <th style="padding:12px;text-align:left;width:120px">Prix unitaire</th>
                                <th style="padding:12px;text-align:left;width:80px">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="productsList"></tbody>
                    </table>
                </div>

                <div class="form-section">
                    <h3>Assurance</h3>
                    <div class="form-group">
                        <label>Montant assurance</label>
                        <select name="cf_1139">
                            <option value="">-- Sélectionnez --</option>
                            <option value="4000">4 000 €</option>
                            <option value="5000">5 000 €</option>
                            <option value="6000">6 000 €</option>
                            <option value="7000">7 000 €</option>
                            <option value="8000">8 000 €</option>
                            <option value="9000">9 000 €</option>
                            <option value="10000">10 000 €</option>
                            <option value="11000">11 000 €</option>
                            <option value="12000">12 000 €</option>
                            <option value="13000">13 000 €</option>
                            <option value="14000">14 000 €</option>
                            <option value="15000">15 000 €</option>
                            <option value="16000">16 000 €</option>
                            <option value="17000">17 000 €</option>
                            <option value="18000">18 000 €</option>
                            <option value="19000">19 000 €</option>
                            <option value="20000">20 000 €</option>
                            <option value="21000">21 000 €</option>
                            <option value="22000">22 000 €</option>
                            <option value="23000">23 000 €</option>
                            <option value="24000">24 000 €</option>
                            <option value="25000">25 000 €</option>
                            <option value="26000">26 000 €</option>
                        </select>
                    </div>
                </div>
            </form>
        </div>
        <div class="actions">
            <button type="submit" form="quoteForm" class="btn btn-primary">
                <i class="fas fa-save"></i> Créer le devis
            </button>
        </div>
    </div>
    <script>
        var productCounter = 0;
        var selectedProducts = {};
        var allProducts = <?php echo json_encode($products); ?>;
        var searchTimeout;

        // Recherche de produits
        document.addEventListener('DOMContentLoaded', function() {
            var searchInput = document.getElementById('productSearch');
            var resultsDiv = document.getElementById('productResults');

            searchInput.addEventListener('input', function() {
                clearTimeout(searchTimeout);
                var query = this.value.toLowerCase();

                searchTimeout = setTimeout(function() {
                    if (query.length === 0) {
                        // Afficher tous les produits si le champ est vide
                        displayResults(allProducts);
                    } else {
                        // Filtrer les produits en fonction de la recherche
                        var filtered = allProducts.filter(function(p) {
                            return p.productname && p.productname.toLowerCase().indexOf(query) !== -1;
                        });
                        displayResults(filtered);
                    }
                }, 200);
            });

            searchInput.addEventListener('focus', function() {
                // Afficher tous les produits au focus
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
                div.innerHTML = '<strong>' + (product.productname || product.name) + '</strong><br><small>' + (parseFloat(product.unit_price || 0).toFixed(2)) + ' €</small>';
                div.onmouseover = function() { this.style.background = '#f0f0f0'; };
                div.onmouseout = function() { this.style.background = 'white'; };
                div.onclick = function() {
                    addProduct({
                        id: product.id || product.productid,
                        name: product.productname || product.name,
                        unit_price: product.unit_price
                    });
                    document.getElementById('productSearch').value = '';
                    resultsDiv.style.display = 'none';
                };
                resultsDiv.appendChild(div);
            });

            resultsDiv.style.display = 'block';
        }

        function addProduct(product) {
            if (selectedProducts[product.id]) {
                alert('Ce produit est déjà dans la liste');
                return;
            }

            productCounter++;
            selectedProducts[product.id] = true;
            var productName = product.name || 'Produit inconnu';
            var unitPrice = parseFloat(product.unit_price || 0).toFixed(2);

            var row = document.createElement('tr');
            row.setAttribute('data-product-id', product.id);
            row.style.borderBottom = '1px solid #dee2e6';
            row.innerHTML = '<td style="padding:10px">' + productName +
                '<input type="hidden" name="hdnProductId' + productCounter + '" value="' + product.id + '">' +
                '<input type="hidden" name="productName' + productCounter + '" value="' + productName + '">' +
                '<input type="hidden" name="comment' + productCounter + '" value="">' +
                '<input type="hidden" name="productDeleted' + productCounter + '" value="0">' +
                '<input type="hidden" name="discount_percent' + productCounter + '" value="0">' +
                '<input type="hidden" name="discount_amount' + productCounter + '" value="0">' +
                '</td><td style="padding:10px"><input type="number" name="qty' + productCounter + '" value="1" step="1" min="1" style="width:100%;padding:8px;border:1px solid #dee2e6;border-radius:5px"></td>' +
                '<td style="padding:10px"><input type="number" name="listPrice' + productCounter + '" value="' + unitPrice + '" step="0.01" min="0" style="width:100%;padding:8px;border:1px solid #dee2e6;border-radius:5px"></td>' +
                '<td style="padding:10px"><button type="button" onclick="removeProduct(this,' + product.id + ')" style="background:#dc3545;color:white;padding:8px 15px;border:none;border-radius:8px;cursor:pointer"><i class="fas fa-trash"></i></button></td>';

            document.getElementById('productsList').appendChild(row);
            document.getElementById('productsTable').style.display = 'table';
            document.getElementById('totalProductCount').value = productCounter;
        }

        function removeProduct(btn, productId) {
            btn.closest('tr').remove();
            delete selectedProducts[productId];

            // Réindexer tous les produits restants
            reindexProducts();

            if (document.getElementById('productsList').children.length === 0) {
                document.getElementById('productsTable').style.display = 'none';
                productCounter = 0;
                document.getElementById('totalProductCount').value = 0;
            }
        }

        function reindexProducts() {
            var rows = document.getElementById('productsList').getElementsByTagName('tr');
            productCounter = 0;

            for (var i = 0; i < rows.length; i++) {
                productCounter++;
                var row = rows[i];

                // Récupérer les valeurs actuelles
                var productId = row.querySelector('input[name^="hdnProductId"]').value;
                var productName = row.querySelector('input[name^="productName"]').value;
                var qty = row.querySelector('input[name^="qty"]').value;
                var listPrice = row.querySelector('input[name^="listPrice"]').value;

                // Mettre à jour tous les noms des champs avec le nouvel index
                row.querySelector('input[name^="hdnProductId"]').name = 'hdnProductId' + productCounter;
                row.querySelector('input[name^="productName"]').name = 'productName' + productCounter;
                row.querySelector('input[name^="comment"]').name = 'comment' + productCounter;
                row.querySelector('input[name^="productDeleted"]').name = 'productDeleted' + productCounter;
                row.querySelector('input[name^="discount_percent"]').name = 'discount_percent' + productCounter;
                row.querySelector('input[name^="discount_amount"]').name = 'discount_amount' + productCounter;
                row.querySelector('input[name^="qty"]').name = 'qty' + productCounter;
                row.querySelector('input[name^="listPrice"]').name = 'listPrice' + productCounter;
            }

            document.getElementById('totalProductCount').value = productCounter;
        }

        // Intercepter la soumission du formulaire pour rediriger vers la page de création de devis
        document.getElementById('quoteForm').addEventListener('submit', function(e) {
            e.preventDefault();

            // Construire l'URL de création de devis avec les paramètres
            var form = this;
            var params = new URLSearchParams();

            // Paramètres de base
            params.append('module', 'Quotes');
            params.append('view', 'Edit');
            params.append('sourceModule', 'Potentials');
            params.append('sourceRecord', '<?php echo $potentialId; ?>');
            params.append('potential_id', '<?php echo $potentialId; ?>');
            <?php if ($contactId > 0): ?>
            params.append('contact_id', '<?php echo $contactId; ?>');
            <?php endif; ?>
            params.append('relationOperation', 'true');

            // Liste des champs à exclure (paramètres de contrôle)
            var excludeFields = ['module', 'action', 'relationOperation', 'potential_id', 'contact_id'];

            // Ajouter les valeurs du formulaire comme paramètres
            var inputs = form.querySelectorAll('input, select, textarea');
            inputs.forEach(function(input) {
                if (input.name &&
                    input.type !== 'submit' &&
                    input.type !== 'button' &&
                    input.value &&
                    !excludeFields.includes(input.name)) {
                    params.append(input.name, input.value);
                }
            });

            // Rediriger la fenêtre parente vers la page de création de devis
            var url = 'index.php?' + params.toString();
            if (window.opener && !window.opener.closed) {
                window.opener.location.href = url;
                window.close();
            } else {
                window.location.href = url;
            }
        });
    </script>
</body>
</html>
