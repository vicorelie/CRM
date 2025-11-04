<?php
// config.php

require 'vendor/autoload.php';

use Dotenv\Dotenv;

// Charger les variables d'environnement
$dotenv = Dotenv::createImmutable(__DIR__);
$dotenv->load();

// Définir le fuseau horaire pour Israël
// date_default_timezone_set('Asia/Jerusalem');

// Vérifie si une session est déjà active avant de la démarrer
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Configuration de la base de données
define('DB_HOST', $_ENV['DB_HOST']);
define('DB_NAME', $_ENV['DB_NAME']);
define('DB_USER', $_ENV['DB_USER']);
define('DB_PASS', $_ENV['DB_PASS']);

// Clé API OpenAI
define('OPENAI_API_KEY', $_ENV['OPENAI_API_KEY']);

// Définir le modèle OpenAI à utiliser
define('OPENAI_MODEL', 'gpt-4o-mini'); // Remplacez par 'gpt-4o mini' si nécessaire
define('OPENAI_MODEL_QCM', 'gpt-4o-mini'); // Remplacez par 'gpt-4o mini' si nécessaire
define('OPENAI_MODEL_SUMMARY', 'gpt-4o-mini'); // Remplacez par 'gpt-4o mini' si nécessaire
define('OPENAI_MODEL_FLASH', 'gpt-4o-mini'); // Remplacez par 'gpt-4o mini' si nécessaire


// Clé API Brevo
define('BREVO_API_KEY', $_ENV['BREVO_API_KEY']);

// ID de la liste Brevo
define('BREVO_LIST_ID', $_ENV['BREVO_LIST_ID']);
define('BREVO_LP_NEWSLETTER_HE_LIST_ID', $_ENV['BREVO_LP_NEWSLETTER_HE_LIST_ID']);
// Connexion à la base de données avec PDO
try {
    $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4';
    $pdo = new PDO($dsn, DB_USER, DB_PASS);
    // Configuration des attributs PDO
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->exec("SET time_zone = '+03:00'");

} catch (PDOException $e) {
    // Gestion des erreurs de connexion
    die("Erreur de connexion à la base de données: " . $e->getMessage());
}

function requireSubscription(PDO $pdo): void
{
    /** 1) Vérifier la session **/
    if (!isset($_SESSION['user_uuid'])) {
        header('Location: login.php');
        exit();
    }

    /** 2) Récupérer l’essai + le statut */
    $stmt = $pdo->prepare("
        SELECT trial_end, subscription_status
        FROM Users
        WHERE uuid = :uuid
        LIMIT 1
    ");
    $stmt->execute([':uuid' => $_SESSION['user_uuid']]);
    $u = $stmt->fetch(PDO::FETCH_ASSOC);

    /** 3) Sécurité : utilisateur introuvable */
    if (!$u) {
        session_destroy();
        header('Location: login.php');
        exit();
    }

    /** 4) Logique d’accès */
    $now         = new DateTime('now', new DateTimeZone('UTC'));
    $trialActive = $u['trial_end'] && $now <= new DateTime($u['trial_end']);
    $paid        = strtolower($u['subscription_status']) === 'active';

    if ($trialActive || $paid) {
        // Autorisé : on continue la page
        return;
    }

    /** 5) Essai expiré → redirection paiement */
    header('Location: payment.php?trial=expired');
    exit();
}

?>
