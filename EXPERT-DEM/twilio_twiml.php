<?php
/**
 * Twilio TwiML Response
 * ARIDEM CRM
 *
 * Ce fichier génère les instructions TwiML pour Twilio
 */

header('Content-Type: text/xml');

$toNumber = isset($_GET['to']) ? $_GET['to'] : '';

echo '<?xml version="1.0" encoding="UTF-8"?>';
echo '<Response>';

if (!empty($toNumber)) {
    // Dire un message puis appeler le contact
    echo '<Say language="fr-FR">Connexion en cours avec votre contact</Say>';
    echo '<Dial timeout="30" callerId="' . htmlspecialchars($toNumber) . '">';
    echo htmlspecialchars($toNumber);
    echo '</Dial>';
} else {
    echo '<Say language="fr-FR">Erreur: numéro de destination manquant</Say>';
    echo '<Hangup/>';
}

echo '</Response>';
