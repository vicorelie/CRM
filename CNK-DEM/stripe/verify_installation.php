<?php
/**
 * Script de vérification de l'installation Stripe
 *
 * Lance ce script pour vérifier que tous les fichiers sont en place
 * et que la configuration est correcte.
 *
 * Usage: php /var/www/CNK-DEM/stripe/verify_installation.php
 */

echo "=== Vérification de l'installation Stripe ===\n\n";

$errors = [];
$warnings = [];
$success = [];

// 1. Vérifier la présence des fichiers
echo "1. Vérification des fichiers...\n";

$requiredFiles = [
    __DIR__ . '/config.php' => 'Configuration Stripe',
    __DIR__ . '/StripeHelper.php' => 'Helper Stripe',
    __DIR__ . '/webhook.php' => 'Webhook Stripe',
    __DIR__ . '/../libraries/stripe/init.php' => 'SDK Stripe',
    __DIR__ . '/../modules/Quotes/actions/GenerateStripePaymentLinks.php' => 'Action génération liens',
    __DIR__ . '/../layouts/v7/modules/Quotes/resources/StripePaymentLinks.js' => 'JavaScript UI',
];

foreach ($requiredFiles as $file => $description) {
    if (file_exists($file)) {
        $success[] = "   ✓ $description : OK";
    } else {
        $errors[] = "   ✗ $description : MANQUANT ($file)";
    }
}

// 2. Vérifier la configuration
echo "\n2. Vérification de la configuration...\n";

try {
    $config = require(__DIR__ . '/config.php');
    $success[] = "   ✓ Configuration chargée";

    // Vérifier le mode
    if (isset($config['mode'])) {
        $mode = $config['mode'];
        $success[] = "   ✓ Mode configuré : $mode";

        // Vérifier les clés API
        if (isset($config['api_keys'][$mode])) {
            $secretKey = $config['api_keys'][$mode]['secret_key'] ?? '';
            $publishableKey = $config['api_keys'][$mode]['publishable_key'] ?? '';

            if (strpos($secretKey, 'VOTRE_CLE') !== false || empty($secretKey)) {
                $warnings[] = "   ⚠ Clé secrète $mode non configurée";
            } else {
                $success[] = "   ✓ Clé secrète $mode configurée";
            }

            if (strpos($publishableKey, 'VOTRE_CLE') !== false || empty($publishableKey)) {
                $warnings[] = "   ⚠ Clé publique $mode non configurée";
            } else {
                $success[] = "   ✓ Clé publique $mode configurée";
            }
        } else {
            $errors[] = "   ✗ Clés API $mode manquantes";
        }

        // Vérifier le webhook secret
        $webhookSecret = $config['webhook']['secret'] ?? '';
        if (strpos($webhookSecret, 'VOTRE_SECRET') !== false || empty($webhookSecret)) {
            $warnings[] = "   ⚠ Secret webhook non configuré";
        } else {
            $success[] = "   ✓ Secret webhook configuré";
        }

        // Vérifier les champs VTiger
        if (isset($config['vtiger_fields']['quotes'])) {
            $success[] = "   ✓ Champs VTiger configurés";
        } else {
            $errors[] = "   ✗ Champs VTiger manquants";
        }

    } else {
        $errors[] = "   ✗ Mode non configuré dans config.php";
    }

} catch (Exception $e) {
    $errors[] = "   ✗ Erreur chargement configuration : " . $e->getMessage();
}

// 3. Vérifier StripeHelper
echo "\n3. Vérification de StripeHelper...\n";

try {
    require_once(__DIR__ . '/StripeHelper.php');
    $success[] = "   ✓ StripeHelper chargé";

    // Vérifier que les méthodes existent
    $methods = [
        'init',
        'createPaymentLink',
        'updateQuoteField',
        'updatePaymentStatus',
        'createPaymentNote',
        'log',
        'getConfig',
    ];

    $missingMethods = [];
    foreach ($methods as $method) {
        if (!method_exists('StripeHelper', $method)) {
            $missingMethods[] = $method;
        }
    }

    if (empty($missingMethods)) {
        $success[] = "   ✓ Toutes les méthodes présentes";
    } else {
        $errors[] = "   ✗ Méthodes manquantes : " . implode(', ', $missingMethods);
    }

} catch (Exception $e) {
    $errors[] = "   ✗ Erreur chargement StripeHelper : " . $e->getMessage();
}

// 4. Vérifier le dossier de logs
echo "\n4. Vérification des logs...\n";

$logDir = __DIR__ . '/logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0755, true);
    $success[] = "   ✓ Dossier logs créé";
} else {
    $success[] = "   ✓ Dossier logs existe";
}

if (is_writable($logDir)) {
    $success[] = "   ✓ Dossier logs accessible en écriture";
} else {
    $errors[] = "   ✗ Dossier logs non accessible en écriture";
}

// 5. Vérifier le SDK Stripe
echo "\n5. Vérification du SDK Stripe...\n";

try {
    require_once(__DIR__ . '/../libraries/stripe/init.php');
    $success[] = "   ✓ SDK Stripe chargé";

    if (class_exists('\Stripe\Stripe')) {
        $success[] = "   ✓ Classe Stripe\Stripe disponible";
    } else {
        $errors[] = "   ✗ Classe Stripe\Stripe non trouvée";
    }

} catch (Exception $e) {
    $errors[] = "   ✗ Erreur chargement SDK Stripe : " . $e->getMessage();
}

// 6. Afficher les résultats
echo "\n" . str_repeat("=", 60) . "\n";
echo "RÉSULTATS DE LA VÉRIFICATION\n";
echo str_repeat("=", 60) . "\n\n";

if (!empty($success)) {
    echo "✅ SUCCÈS (" . count($success) . "):\n";
    foreach ($success as $msg) {
        echo "$msg\n";
    }
    echo "\n";
}

if (!empty($warnings)) {
    echo "⚠️  AVERTISSEMENTS (" . count($warnings) . "):\n";
    foreach ($warnings as $msg) {
        echo "$msg\n";
    }
    echo "\n";
}

if (!empty($errors)) {
    echo "❌ ERREURS (" . count($errors) . "):\n";
    foreach ($errors as $msg) {
        echo "$msg\n";
    }
    echo "\n";
}

// 7. Conclusion
echo str_repeat("=", 60) . "\n";

if (empty($errors)) {
    if (empty($warnings)) {
        echo "🎉 Installation parfaite ! Tout est prêt.\n";
        echo "\nProchaines étapes :\n";
        echo "1. Configurer vos clés Stripe dans stripe/config.php\n";
        echo "2. Configurer le webhook dans Stripe dashboard\n";
        echo "3. Tester la génération de liens depuis un devis\n";
    } else {
        echo "✅ Installation OK avec quelques avertissements.\n";
        echo "\nVeuillez configurer :\n";
        echo "1. Les clés API Stripe dans stripe/config.php\n";
        echo "2. Le secret webhook dans stripe/config.php\n";
        echo "3. Le webhook dans Stripe dashboard\n";
    }
} else {
    echo "❌ Installation incomplète. Veuillez corriger les erreurs ci-dessus.\n";
    exit(1);
}

echo str_repeat("=", 60) . "\n";
