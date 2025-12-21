<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test de connexion - Comparateur Déménagement</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            max-width: 800px;
            margin: 50px auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        h1 {
            color: #2c3e50;
            margin-bottom: 30px;
        }
        .test-item {
            padding: 15px;
            margin: 10px 0;
            border-left: 4px solid #3498db;
            background: #ecf0f1;
            border-radius: 4px;
        }
        .success {
            border-left-color: #27ae60;
            background: #d4edda;
        }
        .error {
            border-left-color: #e74c3c;
            background: #f8d7da;
        }
        .info {
            padding: 15px;
            background: #d1ecf1;
            border-left: 4px solid #17a2b8;
            margin: 20px 0;
            border-radius: 4px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        th {
            background: #3498db;
            color: white;
        }
        .icon {
            font-size: 20px;
            margin-right: 10px;
        }
        code {
            background: #f4f4f4;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🧪 Test de l'installation - Comparateur Déménagement</h1>

        <?php
        // Activer l'affichage des erreurs pour le test
        ini_set('display_errors', 1);
        error_reporting(E_ALL);

        $allTestsPassed = true;

        // Test 1: Vérifier que le fichier config existe
        echo '<div class="test-item ' . (file_exists(__DIR__ . '/config.php') ? 'success' : 'error') . '">';
        if (file_exists(__DIR__ . '/config.php')) {
            echo '<span class="icon">✅</span><strong>Test 1:</strong> Fichier config.php trouvé';
        } else {
            echo '<span class="icon">❌</span><strong>Test 1:</strong> Fichier config.php introuvable';
            $allTestsPassed = false;
        }
        echo '</div>';

        // Test 2: Inclure la configuration
        try {
            require_once(__DIR__ . '/config.php');
            echo '<div class="test-item success">';
            echo '<span class="icon">✅</span><strong>Test 2:</strong> Configuration chargée avec succès';
            echo '</div>';
        } catch (Exception $e) {
            echo '<div class="test-item error">';
            echo '<span class="icon">❌</span><strong>Test 2:</strong> Erreur lors du chargement de la configuration: ' . $e->getMessage();
            echo '</div>';
            $allTestsPassed = false;
        }

        // Test 3: Vérifier que Database.php existe
        echo '<div class="test-item ' . (file_exists('../../api/dev/Database.php') ? 'success' : 'error') . '">';
        if (file_exists('../../api/dev/Database.php')) {
            echo '<span class="icon">✅</span><strong>Test 3:</strong> Classe Database.php trouvée';
        } else {
            echo '<span class="icon">❌</span><strong>Test 3:</strong> Classe Database.php introuvable';
            $allTestsPassed = false;
        }
        echo '</div>';

        // Test 4: Connexion à la base de données
        try {
            $pdo = getDbConnection();
            echo '<div class="test-item success">';
            echo '<span class="icon">✅</span><strong>Test 4:</strong> Connexion à la base de données réussie';
            echo '<br><small>Host: ' . DB_HOST . ' | Database: ' . DB_NAME . '</small>';
            echo '</div>';
        } catch (Exception $e) {
            echo '<div class="test-item error">';
            echo '<span class="icon">❌</span><strong>Test 4:</strong> Erreur de connexion: ' . $e->getMessage();
            echo '</div>';
            $allTestsPassed = false;
            // Arrêter les tests si la connexion échoue
            echo '<div class="info">';
            echo '<strong>⚠️ Les tests suivants nécessitent une connexion à la base de données.</strong>';
            echo '<br>Veuillez vérifier vos credentials dans <code>config.php</code>';
            echo '</div>';
            echo '</div></body></html>';
            exit;
        }

        // Test 5: Vérifier que les tables existent
        $tables = ['demandes_devis', 'demenageurs', 'devis', 'avis'];
        $tablesExist = true;

        foreach ($tables as $table) {
            try {
                $stmt = $pdo->query("SHOW TABLES LIKE '$table'");
                $result = $stmt->fetch();

                echo '<div class="test-item ' . ($result ? 'success' : 'error') . '">';
                if ($result) {
                    echo '<span class="icon">✅</span><strong>Test 5.' . array_search($table, $tables) . ':</strong> Table <code>' . $table . '</code> existe';
                } else {
                    echo '<span class="icon">❌</span><strong>Test 5.' . array_search($table, $tables) . ':</strong> Table <code>' . $table . '</code> manquante';
                    $tablesExist = false;
                    $allTestsPassed = false;
                }
                echo '</div>';
            } catch (PDOException $e) {
                echo '<div class="test-item error">';
                echo '<span class="icon">❌</span><strong>Test 5.' . array_search($table, $tables) . ':</strong> Erreur: ' . $e->getMessage();
                echo '</div>';
                $tablesExist = false;
                $allTestsPassed = false;
            }
        }

        if (!$tablesExist) {
            echo '<div class="info">';
            echo '<strong>⚠️ Des tables sont manquantes.</strong>';
            echo '<br>Veuillez importer le fichier <code>setup_database.sql</code> via phpMyAdmin.';
            echo '</div>';
        }

        // Test 6: Vérifier les déménageurs de test
        try {
            $stmt = $pdo->query("SELECT COUNT(*) as count FROM demenageurs");
            $result = $stmt->fetch();
            $count = $result['count'];

            echo '<div class="test-item ' . ($count >= 5 ? 'success' : 'error') . '">';
            echo '<span class="icon">' . ($count >= 5 ? '✅' : '⚠️') . '</span><strong>Test 6:</strong> Déménageurs trouvés: ' . $count;
            if ($count < 5) {
                echo '<br><small>Attendu: 5 déménageurs de test</small>';
                $allTestsPassed = false;
            }
            echo '</div>';

            // Afficher les déménageurs
            if ($count > 0) {
                echo '<table>';
                echo '<thead><tr><th>ID</th><th>Entreprise</th><th>Ville</th><th>Note</th><th>Actif</th></tr></thead>';
                echo '<tbody>';

                $stmt = $pdo->query("SELECT id, nom_entreprise, ville, note_moyenne, actif FROM demenageurs ORDER BY id");
                while ($row = $stmt->fetch()) {
                    echo '<tr>';
                    echo '<td>' . $row['id'] . '</td>';
                    echo '<td>' . htmlspecialchars($row['nom_entreprise']) . '</td>';
                    echo '<td>' . htmlspecialchars($row['ville']) . '</td>';
                    echo '<td>' . $row['note_moyenne'] . '/5</td>';
                    echo '<td>' . ($row['actif'] ? '✅' : '❌') . '</td>';
                    echo '</tr>';
                }

                echo '</tbody></table>';
            }
        } catch (PDOException $e) {
            echo '<div class="test-item error">';
            echo '<span class="icon">❌</span><strong>Test 6:</strong> Erreur: ' . $e->getMessage();
            echo '</div>';
            $allTestsPassed = false;
        }

        // Test 7: Vérifier les vues
        try {
            $stmt = $pdo->query("SELECT * FROM stats_globales");
            $stats = $stmt->fetch();

            echo '<div class="test-item success">';
            echo '<span class="icon">✅</span><strong>Test 7:</strong> Vue <code>stats_globales</code> accessible';
            echo '</div>';
        } catch (PDOException $e) {
            echo '<div class="test-item error">';
            echo '<span class="icon">❌</span><strong>Test 7:</strong> Vue <code>stats_globales</code> inaccessible: ' . $e->getMessage();
            echo '</div>';
            $allTestsPassed = false;
        }

        // Résultat final
        echo '<div class="test-item ' . ($allTestsPassed ? 'success' : 'error') . '" style="margin-top: 30px; font-size: 18px;">';
        if ($allTestsPassed) {
            echo '<span class="icon">🎉</span><strong>Installation réussie!</strong>';
            echo '<br><br>Vous pouvez maintenant:';
            echo '<ul>';
            echo '<li>Accéder au site: <a href="index.html">index.html</a></li>';
            echo '<li>Tester l\'API: <a href="api/submit-devis.php">api/submit-devis.php</a></li>';
            echo '<li>Lire le guide: <a href="INSTALLATION.md" target="_blank">INSTALLATION.md</a></li>';
            echo '</ul>';
        } else {
            echo '<span class="icon">⚠️</span><strong>Installation incomplète</strong>';
            echo '<br><br>Consultez le guide d\'installation: <a href="INSTALLATION.md" target="_blank">INSTALLATION.md</a>';
        }
        echo '</div>';
        ?>
    </div>
</body>
</html>
