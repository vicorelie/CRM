<?php
/*+**********************************************************************************
 * Page standalone pour générer un devis rapidement
 ***********************************************************************************/

chdir(dirname(__FILE__));
require_once 'config.inc.php';

$potentialId = isset($_GET['record']) ? intval($_GET['record']) : 0;

if ($potentialId <= 0) {
    die('ID d\'affaire invalide');
}

$conn = new mysqli($dbconfig['db_server'], $dbconfig['db_username'], $dbconfig['db_password'], $dbconfig['db_name']);

if ($conn->connect_error) {
    die('Erreur de connexion');
}

$stmt = $conn->prepare("SELECT potentialname, related_to, contact_id, assigned_user_id FROM vtiger_potential WHERE potentialid = ?");
$stmt->bind_param('i', $potentialId);
$stmt->execute();
$result = $stmt->get_result();
$potential = $result->fetch_assoc();

if (!$potential) {
    die('Affaire non trouvée');
}

$potentialName = $potential['potentialname'];
$accountId = $potential['related_to'] ?? 0;
$contactId = $potential['contact_id'] ?? 0;
$assignedUserId = $potential['assigned_user_id'] ?? 1;
$stmt->close();

$contactName = '';
if ($contactId > 0) {
    $stmt = $conn->prepare("SELECT firstname, lastname FROM vtiger_contactdetails WHERE contactid = ?");
    $stmt->bind_param('i', $contactId);
    $stmt->execute();
    $result = $stmt->get_result();
    $contact = $result->fetch_assoc();
    if ($contact) {
        $contactName = trim($contact['firstname'] . ' ' . $contact['lastname']);
    }
    $stmt->close();
}

$validityDate = date('Y-m-d', strtotime('+7 days'));
$conn->close();
?>
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Générer un devis - <?php echo htmlspecialchars($potentialName); ?></title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px;
            min-height: 100vh;
        }
        .container {
            max-width: 900px;
            margin: 0 auto;
            background: white;
            border-radius: 15px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        h1 { font-size: 2em; margin-bottom: 10px; }
        .subtitle { opacity: 0.9; font-size: 1.1em; }
        .form-content { padding: 30px; }
        .form-section {
            margin-bottom: 30px;
            background: #f8f9fa;
            border-radius: 10px;
            padding: 20px;
        }
        .form-section h3 {
            color: #667eea;
            margin-bottom: 15px;
            font-size: 1.3em;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .form-group { margin-bottom: 15px; }
        .form-group label {
            display: block;
            margin-bottom: 5px;
            font-weight: 600;
            color: #333;
        }
        .form-group input, .form-group select {
            width: 100%;
            padding: 12px;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            font-size: 14px;
            transition: border-color 0.3s;
        }
        .form-group input:focus, .form-group select:focus {
            outline: none;
            border-color: #667eea;
        }
        .form-group input[readonly] {
            background-color: #f0f0f0;
            cursor: not-allowed;
        }
        .form-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
        }
        .btn {
            padding: 12px 30px;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            cursor: pointer;
            transition: all 0.3s;
            font-weight: 600;
        }
        .btn-primary {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
        }
        .btn-success {
            background: #28a745;
            color: white;
        }
        .btn-success:hover { background: #218838; }
        .btn-danger {
            background: #dc3545;
            color: white;
            padding: 8px 15px;
            font-size: 14px;
        }
        .btn-danger:hover { background: #c82333; }
        .actions {
            text-align: center;
            padding: 20px 30px;
            background: #f8f9fa;
            border-top: 1px solid #dee2e6;
        }
        .products-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
            display: none;
        }
        .products-table.show { display: table; }
        .products-table th {
            background: #667eea;
            color: white;
            padding: 12px;
            text-align: left;
        }
        .products-table td {
            padding: 10px;
            border-bottom: 1px solid #dee2e6;
        }
        .products-table input {
            width: 100%;
            padding: 8px;
            border: 1px solid #dee2e6;
            border-radius: 5px;
        }
        .required { color: #dc3545; }
        .success-message {
            background: #d4edda;
            color: #155724;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
            display: none;
        }
        .error-message {
            background: #f8d7da;
            color: #721c24;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
            display: none;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1><i class="fas fa-file-invoice"></i> Générer un devis</h1>
            <div class="subtitle">Affaire: <?php echo htmlspecialchars($potentialName); ?></div>
        </div>

        <div class="form-content">
            <div id="successMessage" class="success-message"></div>
            <div id="errorMessage" class="error-message"></div>

            <form id="quoteForm" method="POST">
                <input type="hidden" name="module" value="Quotes">
                <input type="hidden" name="action" value="Save">
                <input type="hidden" name="potential_id" value="<?php echo $potentialId; ?>">
                <input type="hidden" name="account_id" value="<?php echo $accountId; ?>">
                <input type="hidden" name="contact_id" value="<?php echo $contactId; ?>">
                <input type="hidden" name="sourceRecord" value="<?php echo $potentialId; ?>">
                <input type="hidden" name="sourceModule" value="Potentials">
                <input type="hidden" name="relationOperation" value="true">
                <input type="hidden" name="assigned_user_id" value="<?php echo $assignedUserId; ?>">
                <input type="hidden" name="cf_1133" value="43">
                <input type="hidden" name="cf_1135" value="57">
                <input type="hidden" id="totalProductCount" name="totalProductCount" value="0">

                <div class="form-section">
                    <h3><i class="fas fa-info-circle"></i> Informations générales</h3>
                    <div class="form-group">
                        <label>Nom de l'affaire</label>
                        <input type="text" value="<?php echo htmlspecialchars($potentialName); ?>" readonly>
                    </div>
                    <div class="form-group">
                        <label><span class="required">*</span> Sujet du devis</label>
                        <input type="text" name="subject" value="Dev-<?php echo htmlspecialchars($potentialName); ?>" required>
                    </div>
                    <div class="form-group">
                        <label>Contact</label>
                        <input type="text" value="<?php echo htmlspecialchars($contactName); ?>" readonly>
                    </div>
                    <div class="form-group">
                        <label>Date de validité</label>
                        <input type="date" name="validtill" value="<?php echo $validityDate; ?>">
                    </div>
                </div>

                <div class="form-section">
                    <h3><i class="fas fa-box"></i> Forfait</h3>
                    <div class="form-group">
                        <label>Type de forfait</label>
                        <select name="cf_1125">
                            <option value="">-- Sélectionnez --</option>
                            <option value="ECO">ECO</option>
                            <option value="MEDIUM">MEDIUM</option>
                            <option value="PREMIUM">PREMIUM</option>
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
                    <h3><i class="fas fa-shopping-cart"></i> Produits / Services</h3>
                    <button type="button" class="btn btn-success" onclick="openProductPopup()">
                        <i class="fas fa-plus"></i> Ajouter un produit
                    </button>
                    <table class="products-table" id="productsTable">
                        <thead>
                            <tr>
                                <th>Produit / Service</th>
                                <th style="width: 100px;">Quantité</th>
                                <th style="width: 120px;">Prix unitaire</th>
                                <th style="width: 80px;">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="productsList"></tbody>
                    </table>
                </div>

                <div class="form-section">
                    <h3><i class="fas fa-shield-alt"></i> Assurance</h3>
                    <div class="form-group">
                        <label>Montant assurance</label>
                        <select name="cf_1145">
                            <option value="">-- Sélectionnez --</option>
                            <option value="4000">4 000 €</option>
                            <option value="8000">8 000 €</option>
                            <option value="12000">12 000 €</option>
                            <option value="16000">16 000 €</option>
                            <option value="20000">20 000 €</option>
                        </select>
                    </div>
                </div>
            </form>
        </div>

        <div class="actions">
            <button type="button" class="btn btn-primary" onclick="saveQuote()">
                <i class="fas fa-save"></i> Générer le devis
            </button>
        </div>
    </div>

    <script>
        var productCounter = 0;
        var selectedProducts = {};

        function openProductPopup() {
            var url = 'index.php?module=Products&view=Popup&src_module=Quotes&src_field=productSelect&multi_select=true';
            window.open(url, 'product_popup', 'width=1000,height=600,scrollbars=yes,resizable=yes');
        }

        window.selectProductsCallback = function(products) {
            addProductsToTable(products);
        };

        function addProductsToTable(products) {
            if (!Array.isArray(products)) {
                products = [products];
            }

            products.forEach(function(product) {
                if (selectedProducts[product.id]) {
                    return;
                }

                productCounter++;
                selectedProducts[product.id] = true;

                var productName = product.name || product.label || 'Produit inconnu';
                var unitPrice = parseFloat(product.unit_price || product.listprice || 0).toFixed(2);

                var row = document.createElement('tr');
                row.setAttribute('data-product-id', product.id);
                row.innerHTML =
                    '<td>' +
                        productName +
                        '<input type="hidden" name="hdnProductId' + productCounter + '" value="' + product.id + '">' +
                        '<input type="hidden" name="productName' + productCounter + '" value="' + productName + '">' +
                        '<input type="hidden" name="comment' + productCounter + '" value="">' +
                        '<input type="hidden" name="productDeleted' + productCounter + '" value="0">' +
                        '<input type="hidden" name="discount_percent' + productCounter + '" value="0">' +
                        '<input type="hidden" name="discount_amount' + productCounter + '" value="0">' +
                    '</td>' +
                    '<td><input type="number" name="qty' + productCounter + '" value="1" step="1" min="1"></td>' +
                    '<td><input type="number" name="listPrice' + productCounter + '" value="' + unitPrice + '" step="0.01" min="0"></td>' +
                    '<td><button type="button" class="btn btn-danger" onclick="removeProduct(this, ' + product.id + ')"><i class="fas fa-trash"></i></button></td>';

                document.getElementById('productsList').appendChild(row);
                document.getElementById('productsTable').classList.add('show');
                document.getElementById('totalProductCount').value = productCounter;
            });
        }

        function removeProduct(btn, productId) {
            var row = btn.closest('tr');
            row.remove();
            delete selectedProducts[productId];

            if (document.getElementById('productsList').children.length === 0) {
                document.getElementById('productsTable').classList.remove('show');
            }
        }

        function saveQuote() {
            var form = document.getElementById('quoteForm');
            var formData = new FormData(form);

            fetch('index.php', {
                method: 'POST',
                body: formData
            })
            .then(response => response.text())
            .then(data => {
                var match = data.match(/record=(\d+)/);
                if (match && match[1]) {
                    var quoteId = match[1];
                    document.getElementById('successMessage').textContent = 'Devis créé avec succès!';
                    document.getElementById('successMessage').style.display = 'block';

                    setTimeout(function() {
                        window.location.href = 'index.php?module=Quotes&view=Detail&record=' + quoteId;
                    }, 1000);
                } else {
                    document.getElementById('errorMessage').textContent = 'Erreur lors de la création du devis';
                    document.getElementById('errorMessage').style.display = 'block';
                }
            })
            .catch(error => {
                document.getElementById('errorMessage').textContent = 'Erreur: ' + error;
                document.getElementById('errorMessage').style.display = 'block';
            });
        }
    </script>
</body>
</html>
