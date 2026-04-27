<?php
/**
 * Test direct des actions AJAX GetTemplatesList
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

chdir(dirname(__FILE__));

// Charger VTiger
require_once 'includes/Loader.php';
require_once 'include/utils/utils.php';

vimport('~~/include/Webservices/Retrieve.php');
vimport('~~/vtlib/Vtiger/Module.php');

// Initialiser la session si nécessaire
if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

global $current_user;

// Vérifier que l'utilisateur est connecté
if (empty($current_user)) {
    die('<h1>❌ Erreur</h1><p>Vous devez être connecté à VTiger pour exécuter ce test. Veuillez vous connecter d\'abord.</p>');
}

header('Content-Type: text/html; charset=UTF-8');
?>
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Test Actions AJAX</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        h1 { color: #333; border-bottom: 3px solid #e91e63; padding-bottom: 10px; }
        h2 { color: #666; margin-top: 30px; background: #fff; padding: 10px; border-left: 4px solid #2196F3; }
        pre { background: #2d2d2d; color: #f8f8f2; padding: 15px; border-radius: 5px; overflow-x: auto; }
        .success { color: #4caf50; font-weight: bold; }
        .error { color: #f44336; font-weight: bold; }
        .info { background: #e3f2fd; padding: 15px; border-left: 4px solid #2196F3; margin: 15px 0; }
        .test-box { background: white; padding: 20px; margin: 20px 0; border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        button { background: #2196F3; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; font-size: 14px; }
        button:hover { background: #1976D2; }
    </style>
</head>
<body>

<h1>🧪 Test des Actions AJAX GetTemplatesList</h1>

<div class="info">
    <strong>Utilisateur actuel:</strong> <?php echo $current_user->user_name; ?> (ID: <?php echo $current_user->id; ?>)
</div>

<?php
// Test 1: EMAILMaker GetTemplatesList
echo '<div class="test-box">';
echo '<h2>📧 Test 1: EMAILMaker GetTemplatesList</h2>';

try {
    // Créer une requête simulée
    require_once 'include/Webservices/Utils.php';
    require_once 'modules/EMAILMaker/actions/GetTemplatesList.php';

    // Créer un mock de Vtiger_Request
    $_REQUEST['module'] = 'EMAILMaker';
    $_REQUEST['action'] = 'GetTemplatesList';
    $_REQUEST['source_module'] = 'Potentials';

    $request = new Vtiger_Request($_REQUEST);

    // Instancier l'action
    $action = new EMAILMaker_GetTemplatesList_Action();

    echo '<p><strong>Étape 1:</strong> Vérification des permissions...</p>';

    // Tester checkPermission
    try {
        $action->checkPermission($request);
        echo '<p class="success">✅ Permissions OK</p>';
    } catch (Exception $e) {
        echo '<p class="error">❌ Erreur de permission: ' . $e->getMessage() . '</p>';
        throw $e;
    }

    echo '<p><strong>Étape 2:</strong> Appel de process()...</p>';

    // Capturer la sortie
    ob_start();
    $action->process($request);
    $output = ob_get_clean();

    // Décoder le JSON
    $result = json_decode($output, true);

    if ($result) {
        echo '<p class="success">✅ Réponse JSON valide</p>';
        echo '<p><strong>Contenu de la réponse:</strong></p>';
        echo '<pre>' . json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . '</pre>';

        if (isset($result['success']) && $result['success']) {
            $templateCount = isset($result['templates']) ? count($result['templates']) : 0;
            echo '<p class="success">✅ Success = true, Nombre de templates retournés: ' . $templateCount . '</p>';

            if ($templateCount == 0) {
                echo '<p class="error">⚠️ PROBLÈME: Aucun template retourné alors que la base en contient 7!</p>';
            }
        } else {
            echo '<p class="error">❌ Success = false</p>';
            if (isset($result['error'])) {
                echo '<p class="error">Erreur: ' . $result['error'] . '</p>';
            }
        }
    } else {
        echo '<p class="error">❌ Réponse JSON invalide</p>';
        echo '<p><strong>Sortie brute:</strong></p>';
        echo '<pre>' . htmlspecialchars($output) . '</pre>';
    }

} catch (Exception $e) {
    echo '<p class="error">❌ Exception: ' . $e->getMessage() . '</p>';
    echo '<pre>' . $e->getTraceAsString() . '</pre>';
}

echo '</div>';

// Test 2: PDFMaker GetTemplatesList
echo '<div class="test-box">';
echo '<h2>📄 Test 2: PDFMaker GetTemplatesList</h2>';

try {
    require_once 'modules/PDFMaker/actions/GetTemplatesList.php';

    // Créer un mock de Vtiger_Request
    $_REQUEST['module'] = 'PDFMaker';
    $_REQUEST['action'] = 'GetTemplatesList';
    $_REQUEST['source_module'] = 'Potentials';

    $request = new Vtiger_Request($_REQUEST);

    // Instancier l'action
    $action = new PDFMaker_GetTemplatesList_Action();

    echo '<p><strong>Étape 1:</strong> Vérification des permissions...</p>';

    // Tester checkPermission
    try {
        $action->checkPermission($request);
        echo '<p class="success">✅ Permissions OK</p>';
    } catch (Exception $e) {
        echo '<p class="error">❌ Erreur de permission: ' . $e->getMessage() . '</p>';
        throw $e;
    }

    echo '<p><strong>Étape 2:</strong> Appel de process()...</p>';

    // Capturer la sortie
    ob_start();
    $action->process($request);
    $output = ob_get_clean();

    // Décoder le JSON
    $result = json_decode($output, true);

    if ($result) {
        echo '<p class="success">✅ Réponse JSON valide</p>';
        echo '<p><strong>Contenu de la réponse:</strong></p>';
        echo '<pre>' . json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . '</pre>';

        if (isset($result['success']) && $result['success']) {
            $templateCount = isset($result['templates']) ? count($result['templates']) : 0;
            echo '<p class="success">✅ Success = true, Nombre de templates retournés: ' . $templateCount . '</p>';

            if ($templateCount == 0) {
                echo '<p class="error">⚠️ PROBLÈME: Aucun template retourné alors que la base en contient 1!</p>';
            }
        } else {
            echo '<p class="error">❌ Success = false</p>';
            if (isset($result['error'])) {
                echo '<p class="error">Erreur: ' . $result['error'] . '</p>';
            }
        }
    } else {
        echo '<p class="error">❌ Réponse JSON invalide</p>';
        echo '<p><strong>Sortie brute:</strong></p>';
        echo '<pre>' . htmlspecialchars($output) . '</pre>';
    }

} catch (Exception $e) {
    echo '<p class="error">❌ Exception: ' . $e->getMessage() . '</p>';
    echo '<pre>' . $e->getTraceAsString() . '</pre>';
}

echo '</div>';

?>

<div class="test-box">
    <h2>🌐 Test 3: Simulation AJAX depuis le navigateur</h2>
    <p>Cliquez sur les boutons ci-dessous pour tester les appels AJAX réels:</p>

    <button onclick="testEmailTemplates()">Tester EMAILMaker</button>
    <button onclick="testPDFTemplates()">Tester PDFMaker</button>

    <div id="ajax-result" style="margin-top: 20px;"></div>
</div>

<script>
function testEmailTemplates() {
    document.getElementById('ajax-result').innerHTML = '<p>⏳ Chargement...</p>';

    fetch('index.php?module=EMAILMaker&action=GetTemplatesList&source_module=Potentials')
        .then(response => response.json())
        .then(data => {
            document.getElementById('ajax-result').innerHTML =
                '<h3>Résultat EMAILMaker:</h3>' +
                '<pre>' + JSON.stringify(data, null, 2) + '</pre>';
        })
        .catch(error => {
            document.getElementById('ajax-result').innerHTML =
                '<p class="error">❌ Erreur: ' + error + '</p>';
        });
}

function testPDFTemplates() {
    document.getElementById('ajax-result').innerHTML = '<p>⏳ Chargement...</p>';

    fetch('index.php?module=PDFMaker&action=GetTemplatesList&source_module=Potentials')
        .then(response => response.json())
        .then(data => {
            document.getElementById('ajax-result').innerHTML =
                '<h3>Résultat PDFMaker:</h3>' +
                '<pre>' + JSON.stringify(data, null, 2) + '</pre>';
        })
        .catch(error => {
            document.getElementById('ajax-result').innerHTML =
                '<p class="error">❌ Erreur: ' + error + '</p>';
        });
}
</script>

<hr>
<p><em>🕐 Test terminé - <?php echo date('d/m/Y H:i:s'); ?></em></p>

</body>
</html>
