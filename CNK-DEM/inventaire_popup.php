<?php
/**
 * Page standalone pour l'inventaire (sans interface CRM)
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

chdir(dirname(__FILE__));
require_once 'config.inc.php';

// Récupérer l'ID de l'enregistrement
$recordId = isset($_GET['record']) ? intval($_GET['record']) : 0;

if ($recordId <= 0) {
    die('ID d\'enregistrement invalide');
}

// Connexion à la base de données
$conn = new mysqli($dbconfig['db_server'], $dbconfig['db_username'], $dbconfig['db_password'], $dbconfig['db_name']);

if ($conn->connect_error) {
    die('Erreur de connexion à la base de données');
}

// Récupérer les données de l'affaire
$stmt = $conn->prepare("SELECT
    p.potentialname,
    pcf.cf_939,
    pcf.cf_963,
    pcf.cf_969
FROM vtiger_potential p
LEFT JOIN vtiger_potentialscf pcf ON p.potentialid = pcf.potentialid
WHERE p.potentialid = ?");

$stmt->bind_param('i', $recordId);
$stmt->execute();
$result = $stmt->get_result();
$data = $result->fetch_assoc();

if (!$data) {
    die('Affaire non trouvée');
}

$potentialName = $data['potentialname'];
$savedVolume = $data['cf_939'] ?? 0; // Volume estimé
$savedBoxes = $data['cf_963'] ?? 0; // Cartons estimés
$savedInventory = $data['cf_969'] ?? '{}'; // Inventaire JSON

$stmt->close();
$conn->close();
?>
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Inventaire de Déménagement</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px;
        }
        .container {
            max-width: 1200px;
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
        h1 {
            font-size: 2em;
            margin-bottom: 10px;
        }
        .volume-display {
            margin-top: 20px;
            font-size: 2.5em;
            font-weight: bold;
        }
        .category-section {
            margin-bottom: 30px;
            background: white;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .category-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 15px 20px;
            font-size: 1.3em;
            font-weight: bold;
        }
        .items-list {
            padding: 0;
        }
        .item-row {
            display: flex;
            align-items: center;
            padding: 15px 20px;
            border-bottom: 1px solid #f0f0f0;
            transition: background 0.2s;
        }
        .item-row:hover {
            background: #f9f9f9;
        }
        .item-row:last-child {
            border-bottom: none;
        }
        .item-info {
            flex: 1;
            display: flex;
            align-items: center;
            gap: 15px;
        }
        .item-name {
            font-weight: 600;
            color: #333;
            min-width: 200px;
        }
        .item-volume {
            color: #666;
            font-size: 0.95em;
            min-width: 100px;
        }
        .item-controls {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .btn-qty {
            width: 40px;
            height: 40px;
            border: none;
            background: #667eea;
            color: white;
            font-size: 1.5em;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.3s;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .btn-qty:hover {
            background: #5568d3;
            transform: scale(1.1);
        }
        .qty-display {
            min-width: 50px;
            text-align: center;
            font-size: 1.3em;
            font-weight: bold;
            color: #667eea;
        }
        .actions {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background: white;
            padding: 20px;
            box-shadow: 0 -5px 20px rgba(0,0,0,0.1);
            display: flex;
            justify-content: center;
            gap: 20px;
            z-index: 1000;
        }
        .btn-action {
            padding: 15px 40px;
            border: none;
            border-radius: 10px;
            font-size: 1.1em;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s;
            box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        }
        .btn-save {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        .btn-save:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
        }
        .btn-cancel {
            background: #f5f5f5;
            color: #333;
        }
        .btn-cancel:hover {
            background: #e0e0e0;
        }
        .content-wrapper {
            padding: 20px;
            padding-bottom: 100px;
        }
        .search-box {
            background: white;
            border-radius: 10px;
            margin-bottom: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Inventaire de Déménagement</h1>
            <p>Affaire: <?php echo htmlspecialchars($potentialName); ?></p>
            <div class="volume-display" id="totalVolume">0 m³</div>
            <div style="margin-top: 10px; font-size: 0.7em;">
                Cartons estimés: <span id="totalBoxes">0</span>
            </div>
        </div>

        <div class="content-wrapper">
            <div class="search-box">
                <input type="text" id="inventory-search" placeholder="🔍 Rechercher un article..." style="width: 100%; padding: 12px; font-size: 16px; border: 2px solid #ddd; border-radius: 8px; box-sizing: border-box;">
                <div id="inventory-search-results" style="margin-top: 10px; padding: 0 12px; font-size: 14px; color: #666;"></div>
            </div>

            <div id="categories-container">
                <!-- Les catégories seront générées dynamiquement -->
            </div>
        </div>
    </div>

    <div class="actions">
        <button class="btn-action btn-cancel" onclick="window.close()">Annuler</button>
        <button class="btn-action btn-save" onclick="saveInventory()">💾 Enregistrer</button>
    </div>

    <script src="libraries/jquery/jquery.min.js"></script>
    <script>
        const RECORD_ID = <?php echo $recordId; ?>;
        const SAVED_INVENTORY_RAW = <?php echo json_encode($savedInventory); ?>;
        const SAVED_VOLUME = <?php echo $savedVolume ? $savedVolume : 0; ?>;
        const SAVED_BOXES = <?php echo $savedBoxes ? $savedBoxes : 0; ?>;

        let SAVED_INVENTORY = {};
        try {
            if (SAVED_INVENTORY_RAW && SAVED_INVENTORY_RAW.trim() !== '' && SAVED_INVENTORY_RAW !== '{}') {
                SAVED_INVENTORY = JSON.parse(SAVED_INVENTORY_RAW);
                console.log('✓ Inventaire chargé depuis la base de données:', SAVED_INVENTORY);
            } else {
                console.log('Aucun inventaire sauvegardé trouvé');
            }
        } catch(e) {
            console.error('Erreur lors du parsing de l\'inventaire sauvegardé:', e);
        }

        let ITEMS_DB = {};
        let CATEGORIES_INFO = {};

        // Charger les items depuis la base de données
        async function loadItemsFromDatabase() {
            try {
                const response = await fetch('get_inventory_items.php?_=' + new Date().getTime());
                const data = await response.json();

                if (data.success) {
                    ITEMS_DB = data.items;
                    CATEGORIES_INFO = data.categories;
                    console.log('Articles chargés depuis la base de données:', ITEMS_DB);
                    console.log('Catégories:', CATEGORIES_INFO);

                    // Générer les catégories
                    generateCategories();

                    return true;
                } else {
                    console.error('Erreur lors du chargement des articles:', data.error);
                    return false;
                }
            } catch (e) {
                console.error('Erreur lors du chargement des articles:', e);
                return false;
            }
        }

        // Générer les catégories
        function generateCategories() {
            const categoriesContainer = document.getElementById('categories-container');
            let html = '';

            Object.keys(ITEMS_DB).forEach(categoryId => {
                const catInfo = CATEGORIES_INFO[categoryId];

                html += `
                    <div class="category-section" id="category-${categoryId}">
                        <div class="category-header">
                            ${catInfo.icon} ${catInfo.label}
                        </div>
                        <div class="items-list" id="${categoryId}">
                        </div>
                    </div>
                `;
            });

            categoriesContainer.innerHTML = html;
        }

        let inventory = {};

        // Initialiser l'inventaire
        function initInventory() {
            // Charger l'inventaire sauvegardé s'il existe
            if (SAVED_INVENTORY && Object.keys(SAVED_INVENTORY).length > 0) {
                inventory = SAVED_INVENTORY;
                console.log('✓ Inventaire restauré:', inventory);
            } else {
                // Initialiser un inventaire vide
                initEmptyInventory();
            }
        }

        // Initialiser un inventaire vide
        function initEmptyInventory() {
            Object.keys(ITEMS_DB).forEach(category => {
                inventory[category] = {};
                ITEMS_DB[category].forEach(item => {
                    inventory[category][item.name] = 0;
                });
            });
            console.log('Inventaire vide initialisé');
        }

        // Générer le HTML pour chaque catégorie
        function renderCategory(categoryId) {
            const container = document.getElementById(categoryId);
            const items = ITEMS_DB[categoryId];

            if (!container) {
                console.error('❌ Container not found for category:', categoryId);
                return;
            }

            if (!items || items.length === 0) {
                console.warn('⚠️ No items found for category:', categoryId);
                container.innerHTML = '<p style="padding: 20px; text-align: center; color: #999;">Aucun article dans cette catégorie</p>';
                return;
            }

            // Initialiser la catégorie dans inventory si elle n'existe pas
            if (!inventory[categoryId]) {
                inventory[categoryId] = {};
                items.forEach(item => {
                    inventory[categoryId][item.name] = 0;
                });
            }

            let html = '';
            items.forEach(item => {
                const qty = inventory[categoryId][item.name] || 0;
                const safeId = 'qty_' + categoryId + '_' + item.name.replace(/[^a-z0-9]/gi, '_');
                html += `
                    <div class="item-row">
                        <div class="item-info">
                            <div class="item-name">${item.name}</div>
                            <div class="item-volume">${item.volume} m³/unité</div>
                        </div>
                        <div class="item-controls">
                            <button class="btn-qty" onclick="changeQty('${categoryId}', '${item.name}', -1)">−</button>
                            <div class="qty-display" id="${safeId}">${qty}</div>
                            <button class="btn-qty" onclick="changeQty('${categoryId}', '${item.name}', 1)">+</button>
                        </div>
                    </div>
                `;
            });
            container.innerHTML = html;
        }

        // Changer la quantité d'un item
        window.changeQty = function(category, itemName, delta) {
            inventory[category][itemName] = Math.max(0, (inventory[category][itemName] || 0) + delta);

            const safeId = 'qty_' + category + '_' + itemName.replace(/[^a-z0-9]/gi, '_');
            document.getElementById(safeId).textContent = inventory[category][itemName];

            updateTotalVolume();
        };

        // Calculer le volume total
        function updateTotalVolume() {
            let totalVolume = 0;

            Object.keys(inventory).forEach(category => {
                if (ITEMS_DB[category]) {
                    ITEMS_DB[category].forEach(item => {
                        const qty = inventory[category][item.name] || 0;
                        totalVolume += qty * item.volume;
                    });
                }
            });

            document.getElementById('totalVolume').textContent = totalVolume.toFixed(2) + ' m³';

            const estimatedBoxes = Math.ceil(totalVolume * 7);
            document.getElementById('totalBoxes').textContent = estimatedBoxes;
        }

        // Sauvegarder l'inventaire
        window.saveInventory = function() {
            let totalVolume = 0;
            Object.keys(inventory).forEach(category => {
                if (ITEMS_DB[category]) {
                    ITEMS_DB[category].forEach(item => {
                        const qty = inventory[category][item.name] || 0;
                        totalVolume += qty * item.volume;
                    });
                }
            });

            const totalBoxes = Math.ceil(totalVolume * 7);
            const inventoryJSON = JSON.stringify(inventory);

            console.log('Sauvegarde de l\'inventaire:', {
                recordId: RECORD_ID,
                volume: totalVolume,
                boxes: totalBoxes,
                inventory: inventoryJSON
            });

            jQuery.ajax({
                url: 'save_inventory_direct.php',
                type: 'POST',
                data: {
                    record_id: RECORD_ID,
                    volume: totalVolume.toFixed(2),
                    boxes: totalBoxes,
                    inventory: inventoryJSON
                },
                success: function(response) {
                    console.log('Réponse du serveur:', response);
                    try {
                        const result = typeof response === 'string' ? JSON.parse(response) : response;
                        if (result.success) {
                            alert('✓ Inventaire enregistré avec succès!\n\nVolume: ' + totalVolume.toFixed(2) + ' m³\nCartons: ' + totalBoxes);
                            if (window.opener) {
                                window.opener.location.reload();
                            }
                            window.close();
                        } else {
                            alert('Erreur lors de la sauvegarde: ' + (result.error || 'Erreur inconnue'));
                        }
                    } catch (e) {
                        console.error('Erreur lors du parsing de la réponse:', e, response);
                        alert('Erreur lors du traitement de la réponse du serveur');
                    }
                },
                error: function(xhr, status, error) {
                    console.error('Erreur AJAX:', error);
                    alert('Erreur lors de la sauvegarde: ' + error);
                }
            });
        };

        // Fonction de recherche
        function initInventorySearch() {
            const searchBox = document.getElementById('inventory-search');
            const searchResults = document.getElementById('inventory-search-results');

            if (!searchBox) return;

            searchBox.addEventListener('input', function() {
                const searchTerm = this.value.toLowerCase().trim();
                const allItems = document.querySelectorAll('.item-row');
                const allSections = document.querySelectorAll('.category-section');
                let visibleCount = 0;

                if (searchTerm === '') {
                    allItems.forEach(item => item.style.display = 'flex');
                    allSections.forEach(section => section.style.display = 'block');
                    searchResults.textContent = '';
                    return;
                }

                allSections.forEach(section => section.style.display = 'none');
                allItems.forEach(item => item.style.display = 'none');

                const visibleSections = new Set();

                allItems.forEach(item => {
                    const itemName = item.querySelector('.item-name');
                    if (itemName && itemName.textContent.toLowerCase().includes(searchTerm)) {
                        item.style.display = 'flex';
                        visibleCount++;

                        const parentSection = item.closest('.category-section');
                        if (parentSection) {
                            visibleSections.add(parentSection);
                        }
                    }
                });

                visibleSections.forEach(section => {
                    section.style.display = 'block';
                });

                if (visibleCount === 0) {
                    searchResults.textContent = '❌ Aucun article trouvé';
                    searchResults.style.color = '#e74c3c';
                } else {
                    searchResults.textContent = `✓ ${visibleCount} article${visibleCount > 1 ? 's' : ''} trouvé${visibleCount > 1 ? 's' : ''}`;
                    searchResults.style.color = '#27ae60';
                }
            });
        }

        // Initialisation au chargement
        document.addEventListener('DOMContentLoaded', async function() {
            console.log('=== DÉBUT CHARGEMENT INVENTAIRE ===');
            console.log('Inventaire sauvegardé brut:', SAVED_INVENTORY_RAW);
            console.log('Inventaire sauvegardé parsé:', SAVED_INVENTORY);

            const loaded = await loadItemsFromDatabase();

            if (loaded) {
                initInventory();
                Object.keys(ITEMS_DB).forEach(category => {
                    renderCategory(category);
                });
                updateTotalVolume();
                initInventorySearch();
                console.log('=== INVENTAIRE CHARGÉ AVEC SUCCÈS ===');
            } else {
                alert('Erreur lors du chargement des articles d\'inventaire');
            }
        });
    </script>
</body>
</html>
