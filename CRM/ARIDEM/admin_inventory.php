<?php
/**
 * Interface d'administration pour gérer les articles d'inventaire
 */

require_once 'config.inc.php';

// Connexion à la base de données
$conn = new mysqli($dbconfig['db_server'], $dbconfig['db_username'], $dbconfig['db_password'], $dbconfig['db_name']);

if ($conn->connect_error) {
    die("Erreur de connexion: " . $conn->connect_error);
}

$message = '';

// Traiter les actions
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';

    if ($action === 'update') {
        $id = intval($_POST['id']);
        $item_name = trim($_POST['item_name']);
        $item_volume = floatval($_POST['item_volume']);
        $active = isset($_POST['active']) ? 1 : 0;

        $stmt = $conn->prepare('UPDATE aridem_inventory_items SET item_name = ?, item_volume = ?, active = ? WHERE id = ?');
        $stmt->bind_param('sdii', $item_name, $item_volume, $active, $id);
        $stmt->execute();
        $message = "✓ Article mis à jour";
    }

    if ($action === 'add') {
        $category = trim($_POST['category']);
        $category_label = trim($_POST['category_label']);
        $category_icon = trim($_POST['category_icon']);
        $item_name = trim($_POST['item_name']);
        $item_volume = floatval($_POST['item_volume']);

        // Validation
        if (empty($category) || empty($category_label) || empty($item_name)) {
            $message = "❌ Erreur: Tous les champs sont obligatoires";
        } elseif ($item_volume <= 0) {
            $message = "❌ Erreur: Le volume doit être supérieur à 0";
        } elseif (!preg_match('/^[a-z0-9_-]+$/', $category)) {
            $message = "❌ Erreur: L'ID de catégorie ne doit contenir que des lettres minuscules, chiffres, tirets et underscores (ex: cave, salle_eau)";
        } else {

        // Obtenir le prochain numéro de séquence
        $seqResult = $conn->query("SELECT MAX(sequence) as max_seq FROM aridem_inventory_items WHERE category = '$category'");
        $seqRow = $seqResult->fetch_assoc();
        $sequence = ($seqRow['max_seq'] ?? 0) + 1;

            $stmt = $conn->prepare('INSERT INTO aridem_inventory_items (category, category_label, category_icon, item_name, item_volume, sequence, active) VALUES (?, ?, ?, ?, ?, ?, 1)');
            $stmt->bind_param('ssssdi', $category, $category_label, $category_icon, $item_name, $item_volume, $sequence);
            $stmt->execute();
            $message = "✓ Article ajouté";
        }
    }

    if ($action === 'delete') {
        $id = intval($_POST['id']);
        $conn->query("DELETE FROM aridem_inventory_items WHERE id = $id");
        $message = "✓ Article supprimé";
    }
}

// Récupérer toutes les catégories
$categories = [];
$categoriesResult = $conn->query('SELECT DISTINCT category, category_label, category_icon FROM aridem_inventory_items ORDER BY category');
while ($row = $categoriesResult->fetch_assoc()) {
    $categories[] = $row;
}

// Récupérer tous les articles
$items = [];
$itemsResult = $conn->query('SELECT * FROM aridem_inventory_items ORDER BY category, sequence, item_name');
while ($row = $itemsResult->fetch_assoc()) {
    $items[] = $row;
}
?>
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Administration - Articles d'Inventaire</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f5f5f5;
            padding: 20px;
        }
        .container {
            max-width: 1400px;
            margin: 0 auto;
            background: white;
            border-radius: 10px;
            padding: 30px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
            color: #667eea;
            margin-bottom: 30px;
            font-size: 2em;
        }
        .message {
            padding: 15px;
            margin-bottom: 20px;
            border-radius: 5px;
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        .add-form {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 30px;
        }
        .form-row {
            display: flex;
            gap: 15px;
            margin-bottom: 15px;
            flex-wrap: wrap;
        }
        .form-group {
            flex: 1;
            min-width: 200px;
            display: flex;
            flex-direction: column;
        }
        label {
            font-weight: 600;
            margin-bottom: 5px;
            color: #333;
        }
        input, select {
            padding: 10px;
            border: 2px solid #ddd;
            border-radius: 5px;
            font-size: 14px;
        }
        input:focus, select:focus {
            outline: none;
            border-color: #667eea;
        }
        .btn {
            padding: 10px 20px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            transition: all 0.3s;
        }
        .btn-primary {
            background: #667eea;
            color: white;
        }
        .btn-primary:hover {
            background: #5568d3;
        }
        .btn-success {
            background: #28a745;
            color: white;
        }
        .btn-success:hover {
            background: #218838;
        }
        .btn-danger {
            background: #dc3545;
            color: white;
        }
        .btn-danger:hover {
            background: #c82333;
        }
        .category-section {
            margin-bottom: 40px;
        }
        .category-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 15px 20px;
            border-radius: 8px 8px 0 0;
            font-size: 1.3em;
            font-weight: bold;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            background: white;
        }
        thead {
            background: #f8f9fa;
        }
        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #dee2e6;
        }
        th {
            font-weight: 600;
            color: #495057;
        }
        .edit-input {
            width: 100%;
            padding: 8px;
            border: 1px solid #ddd;
            border-radius: 4px;
        }
        .checkbox {
            width: 20px;
            height: 20px;
            cursor: pointer;
        }
        .actions {
            display: flex;
            gap: 10px;
        }
        .stats {
            background: #e7f3ff;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
            display: flex;
            justify-content: space-around;
        }
        .stat-item {
            text-align: center;
        }
        .stat-number {
            font-size: 2em;
            font-weight: bold;
            color: #667eea;
        }
        .stat-label {
            color: #666;
            margin-top: 5px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>📦 Administration - Articles d'Inventaire</h1>

        <?php if (isset($message)): ?>
            <div class="message"><?= $message ?></div>
        <?php endif; ?>

        <div class="stats">
            <div class="stat-item">
                <div class="stat-number"><?= count($categories) ?></div>
                <div class="stat-label">Catégories</div>
            </div>
            <div class="stat-item">
                <div class="stat-number"><?= count($items) ?></div>
                <div class="stat-label">Articles Total</div>
            </div>
            <div class="stat-item">
                <div class="stat-number"><?= count(array_filter($items, fn($i) => $i['active'] == 1)) ?></div>
                <div class="stat-label">Articles Actifs</div>
            </div>
        </div>

        <div class="add-form">
            <h2>➕ Ajouter un nouvel article</h2>
            <form method="POST">
                <input type="hidden" name="action" value="add">
                <div class="form-row">
                    <div class="form-group">
                        <label>Catégorie</label>
                        <select id="category-select" required onchange="updateCategoryInfo()">
                            <option value="">Sélectionnez...</option>
                            <?php foreach ($categories as $cat): ?>
                                <option value="<?= $cat['category'] ?>"
                                        data-label="<?= htmlspecialchars($cat['category_label']) ?>"
                                        data-icon="<?= htmlspecialchars($cat['category_icon']) ?>">
                                    <?= $cat['category_icon'] ?> <?= $cat['category_label'] ?>
                                </option>
                            <?php endforeach; ?>
                            <option value="new">➕ Nouvelle catégorie...</option>
                        </select>
                    </div>
                    <div class="form-group" id="new-category-fields" style="display: none;">
                        <label>Nouvelle catégorie (ID) <small style="color: #666;">- lettres minuscules, chiffres, tirets uniquement</small></label>
                        <input type="text" id="new-category-id" placeholder="ex: cave, salle_eau" pattern="[a-z0-9_-]+" title="Uniquement lettres minuscules, chiffres, tirets et underscores">
                    </div>
                    <div class="form-group" id="new-category-label-field" style="display: none;">
                        <label>Nom de la catégorie</label>
                        <input type="text" id="new-category-label-input" placeholder="ex: Garage">
                    </div>
                    <div class="form-group" id="new-category-icon-field" style="display: none;">
                        <label>Icône</label>
                        <input type="text" id="new-category-icon-input" placeholder="ex: 🚗">
                    </div>
                </div>
                <input type="hidden" name="category" id="category">
                <input type="hidden" name="category_label" id="category_label">
                <input type="hidden" name="category_icon" id="category_icon">
                <div class="form-row">
                    <div class="form-group">
                        <label>Nom de l'article</label>
                        <input type="text" name="item_name" required placeholder="ex: Canapé 4 places">
                    </div>
                    <div class="form-group">
                        <label>Volume (m³)</label>
                        <input type="number" step="0.01" name="item_volume" required placeholder="ex: 2.5">
                    </div>
                    <div class="form-group" style="justify-content: flex-end;">
                        <label>&nbsp;</label>
                        <button type="submit" class="btn btn-primary">Ajouter l'article</button>
                    </div>
                </div>
            </form>
        </div>

        <div class="add-form" style="margin-top: 20px;">
            <h2>🔍 Rechercher un article</h2>
            <input type="text" id="search-box" placeholder="Tapez pour rechercher un article..." style="width: 100%; padding: 12px; font-size: 16px; border: 2px solid #ddd; border-radius: 8px;">
            <p id="search-results" style="color: #666; margin-top: 10px;"></p>
        </div>

        <?php
        $currentCategory = '';
        foreach ($items as $item):
            if ($currentCategory !== $item['category']):
                if ($currentCategory !== '') echo '</tbody></table></div>';
                $currentCategory = $item['category'];
        ?>
        <div class="category-section">
            <div class="category-header">
                <?= $item['category_icon'] ?> <?= $item['category_label'] ?>
            </div>
            <table>
                <thead>
                    <tr>
                        <th style="width: 50px;">ID</th>
                        <th>Nom de l'article</th>
                        <th style="width: 150px;">Volume (m³)</th>
                        <th style="width: 100px;">Actif</th>
                        <th style="width: 200px;">Actions</th>
                    </tr>
                </thead>
                <tbody>
        <?php endif; ?>
                <tr>
                    <form method="POST" style="display: contents;">
                        <input type="hidden" name="action" value="update">
                        <input type="hidden" name="id" value="<?= $item['id'] ?>">
                        <td><?= $item['id'] ?></td>
                        <td>
                            <input type="text" name="item_name" value="<?= htmlspecialchars($item['item_name']) ?>" class="edit-input">
                        </td>
                        <td>
                            <input type="number" step="0.01" name="item_volume" value="<?= $item['item_volume'] ?>" class="edit-input">
                        </td>
                        <td style="text-align: center;">
                            <input type="checkbox" name="active" class="checkbox" <?= $item['active'] ? 'checked' : '' ?>>
                        </td>
                        <td>
                            <div class="actions">
                                <button type="submit" class="btn btn-success">💾 Enregistrer</button>
                                <button type="button" class="btn btn-danger" onclick="deleteItem(<?= $item['id'] ?>, '<?= htmlspecialchars($item['item_name']) ?>')">🗑️ Supprimer</button>
                            </div>
                        </td>
                    </form>
                </tr>
        <?php endforeach; ?>
                </tbody>
            </table>
        </div>
    </div>

    <script>
        function updateCategoryInfo() {
            const select = document.getElementById('category-select');
            const selectedOption = select.options[select.selectedIndex];

            const newCatId = document.getElementById('new-category-id');
            const newCatLabel = document.getElementById('new-category-label-input');
            const newCatIcon = document.getElementById('new-category-icon-input');

            if (select.value === 'new') {
                // Afficher les champs pour nouvelle catégorie
                document.getElementById('new-category-fields').style.display = 'block';
                document.getElementById('new-category-label-field').style.display = 'block';
                document.getElementById('new-category-icon-field').style.display = 'block';

                // Rendre les champs obligatoires
                newCatId.required = true;
                newCatLabel.required = true;
                newCatIcon.required = true;

                // Vider les champs cachés - ils seront remplis lors de la soumission
                document.getElementById('category').value = '';
                document.getElementById('category_label').value = '';
                document.getElementById('category_icon').value = '';
            } else {
                // Cacher les champs pour nouvelle catégorie
                document.getElementById('new-category-fields').style.display = 'none';
                document.getElementById('new-category-label-field').style.display = 'none';
                document.getElementById('new-category-icon-field').style.display = 'none';

                // Rendre les champs non obligatoires
                newCatId.required = false;
                newCatLabel.required = false;
                newCatIcon.required = false;

                if (select.value) {
                    // Remplir les champs cachés depuis l'option sélectionnée
                    document.getElementById('category').value = select.value;
                    document.getElementById('category_label').value = selectedOption.getAttribute('data-label') || '';
                    document.getElementById('category_icon').value = selectedOption.getAttribute('data-icon') || '';
                }
            }
        }

        // Gérer la soumission du formulaire
        document.addEventListener('DOMContentLoaded', function() {
            const addForm = document.querySelector('form[method="POST"]');
            if (addForm && addForm.querySelector('input[name="action"][value="add"]')) {
                addForm.addEventListener('submit', function(e) {
                    const select = document.getElementById('category-select');

                    if (select.value === 'new') {
                        // Si nouvelle catégorie, récupérer les valeurs des champs de saisie
                        const newCategoryId = document.getElementById('new-category-id').value.trim();
                        const newCategoryLabel = document.getElementById('new-category-label-input').value.trim();
                        const newCategoryIcon = document.getElementById('new-category-icon-input').value.trim();

                        console.log('Nouvelle catégorie:', {
                            id: newCategoryId,
                            label: newCategoryLabel,
                            icon: newCategoryIcon
                        });

                        // Validation - vérifier que tous les champs de nouvelle catégorie sont remplis
                        if (!newCategoryId || !newCategoryLabel || !newCategoryIcon) {
                            e.preventDefault();
                            alert('❌ Veuillez remplir tous les champs de la nouvelle catégorie (ID, Nom et Icône)');
                            return false;
                        }

                        // Remplir les champs cachés
                        document.getElementById('category').value = newCategoryId;
                        document.getElementById('category_label').value = newCategoryLabel;
                        document.getElementById('category_icon').value = newCategoryIcon;

                        console.log('Champs cachés remplis:', {
                            category: document.getElementById('category').value,
                            category_label: document.getElementById('category_label').value,
                            category_icon: document.getElementById('category_icon').value
                        });
                    }
                });
            }
        });

        // Fonction de recherche d'articles
        document.addEventListener('DOMContentLoaded', function() {
            const searchBox = document.getElementById('search-box');
            const searchResults = document.getElementById('search-results');

            if (searchBox) {
                searchBox.addEventListener('input', function() {
                    const searchTerm = this.value.toLowerCase().trim();
                    const allRows = document.querySelectorAll('.category-section tbody tr');
                    const allSections = document.querySelectorAll('.category-section');
                    let visibleCount = 0;
                    let totalCount = allRows.length;

                    if (searchTerm === '') {
                        // Tout afficher si recherche vide
                        allSections.forEach(section => section.style.display = 'block');
                        allRows.forEach(row => row.style.display = 'table-row');
                        searchResults.textContent = '';
                        return;
                    }

                    // D'abord masquer tout
                    allSections.forEach(section => section.style.display = 'none');
                    allRows.forEach(row => row.style.display = 'none');

                    // Créer un Set pour tracker les sections visibles
                    const visibleSections = new Set();

                    // Filtrer les lignes et tracker les sections parentes
                    allRows.forEach(row => {
                        const itemName = row.querySelector('input[name="item_name"]');
                        if (itemName && itemName.value.toLowerCase().includes(searchTerm)) {
                            row.style.display = 'table-row';
                            const section = row.closest('.category-section');
                            if (section) {
                                visibleSections.add(section);
                                console.log('Article trouvé:', itemName.value, 'Section:', section);
                            }
                            visibleCount++;
                        }
                    });

                    console.log('Nombre de sections visibles:', visibleSections.size);

                    // Afficher toutes les sections qui ont des résultats
                    visibleSections.forEach(section => {
                        console.log('Affichage de la section:', section);
                        section.style.display = 'block';
                    });

                    // Afficher le résultat
                    if (visibleCount === 0) {
                        searchResults.textContent = '❌ Aucun article trouvé';
                        searchResults.style.color = '#e74c3c';
                    } else {
                        searchResults.textContent = `✓ ${visibleCount} article${visibleCount > 1 ? 's' : ''} trouvé${visibleCount > 1 ? 's' : ''}`;
                        searchResults.style.color = '#27ae60';
                    }
                });
            }
        });

        function deleteItem(id, name) {
            if (confirm('Êtes-vous sûr de vouloir supprimer "' + name + '" ?')) {
                const form = document.createElement('form');
                form.method = 'POST';
                form.innerHTML = '<input type="hidden" name="action" value="delete"><input type="hidden" name="id" value="' + id + '">';
                document.body.appendChild(form);
                form.submit();
            }
        }
    </script>
</body>
</html>
<?php $conn->close(); ?>
