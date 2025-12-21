<?php
// config.php

require 'vendor/autoload.php';

use Dotenv\Dotenv;

// Charger les variables d'environnement
$dotenv = Dotenv::createImmutable(__DIR__);
$dotenv->load();

// Vérifie si une session est déjà active avant de la démarrer
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Configuration de la base de données
define('DB_HOST', $_ENV['DB_HOST']);
define('DB_NAME', $_ENV['DB_NAME']);
define('DB_USER', $_ENV['DB_USER']);
define('DB_PASS', $_ENV['DB_PASS']);

// Clé API DeepSeek (depuis votre .env)
define('DEEPSEEK_API_KEY', $_ENV['DEEPSEEK_API_KEY']);

// Définir les modèles DeepSeek à utiliser
define('DEEPSEEK_MODEL_QCM', 'deepseek-moe-16b-chat');
define('DEEPSEEK_MODEL_SUMMARY', 'deepseek-7b-chat');

// Paramètres DeepSeek recommandés pour le QCM
define('DEEPSEEK_QCM_PARAMS', [
    'temperature' => 0.3,   // Contrôle la créativité
    'max_tokens'  => 500,
    'top_p'       => 0.95,
    // Vous pouvez ajouter d’autres paramètres si nécessaires
]);

// Paramètres DeepSeek recommandés pour le résumé
define('DEEPSEEK_SUMMARY_PARAMS', [
    'temperature'      => 0.1,
    'max_tokens'       => 300,
    'presence_penalty' => 0.5
]);

// Connexion à la base de données avec PDO
try {
    $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4';
    $pdo = new PDO($dsn, DB_USER, DB_PASS);
    // Configuration des attributs PDO
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    // Gestion des erreurs de connexion
    die("Erreur de connexion à la base de données: " . $e->getMessage());
}

/**
 * Vérifie la souscription de l’utilisateur.
 * Redirige vers payment.php si la souscription n’est pas active.
 */
function requireSubscription(PDO $pdo)
{
    // Vérifier la session
    if (!isset($_SESSION['user_uuid'])) {
        header('Location: login.php');
        exit();
    }

    $stmt = $pdo->prepare("
        SELECT subscription_status
        FROM Users
        WHERE uuid = :uuid
        LIMIT 1
    ");
    $stmt->execute(['uuid' => $_SESSION['user_uuid']]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        session_destroy();
        header('Location: login.php');
        exit();
    }

    // Tester si pas actif
    if (strtolower($user['subscription_status']) !== 'active') {
        header('Location: payment.php');
        exit();
    }
}
?>
