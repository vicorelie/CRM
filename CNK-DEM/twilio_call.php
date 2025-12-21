<?php
/**
 * Twilio Click-to-Call API
 * ARIDEM CRM
 *
 * Usage: twilio_call.php?to=+33XXXXXXXXX&from=+33XXXXXXXXX
 */

header('Content-Type: application/json');

// Configuration database
$dbHost = 'localhost';
$dbName = 'aridem_bis';
$dbUser = 'aridem_bis_user';
$dbPass = '3b07eba23d0e68c98c9beb2ff6fe2d03';

// Récupérer les paramètres
$toNumber = isset($_GET['to']) ? $_GET['to'] : '';
$fromNumber = isset($_GET['from']) ? $_GET['from'] : ''; // Numéro de l'utilisateur

// Validation basique
if (empty($toNumber)) {
    echo json_encode(['success' => false, 'error' => 'Numéro destinataire manquant']);
    exit;
}

try {
    // Connexion à la base de données
    $mysqli = new mysqli($dbHost, $dbUser, $dbPass, $dbName);

    if ($mysqli->connect_error) {
        throw new Exception("Erreur de connexion DB");
    }

    // Récupérer la configuration Twilio
    $result = $mysqli->query("SELECT * FROM vtiger_twilio_clicktocall LIMIT 1");
    if (!$result || $result->num_rows === 0) {
        throw new Exception("Configuration Twilio non trouvée");
    }

    $config = $result->fetch_assoc();

    // Décrypter le auth_token (simple car on a utilisé $ve$z8_)
    $authToken = str_replace('$ve$z8_', '', $config['auth_token']);
    $accountSID = $config['account_sid'];
    $twilioNumber = $config['from_number'];

    // Si pas de numéro FROM fourni, demander à Twilio d'appeler le numéro TO directement
    // En mode Click-to-Call, Twilio appelle d'abord l'utilisateur, puis le contact

    // Préparer l'appel Twilio
    $url = "https://api.twilio.com/2010-04-01/Accounts/{$accountSID}/Calls.json";

    // TwiML qui jouera un message ou connectera les deux parties
    $twimlUrl = "https://crm-aridem.campagnemarketing.fr/twilio_twiml.php?to=" . urlencode($toNumber);

    // Données de l'appel
    $postData = [
        'From' => $twilioNumber,
        'To' => empty($fromNumber) ? $toNumber : $fromNumber,
        'Url' => $twimlUrl,
        'Method' => 'GET'
    ];

    // Appel API Twilio
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($postData));
    curl_setopt($ch, CURLOPT_USERPWD, "{$accountSID}:{$authToken}");
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode == 201) {
        $responseData = json_decode($response, true);
        echo json_encode([
            'success' => true,
            'call_sid' => $responseData['sid'],
            'status' => $responseData['status'],
            'message' => 'Appel en cours...'
        ]);
    } else {
        $errorData = json_decode($response, true);
        echo json_encode([
            'success' => false,
            'error' => isset($errorData['message']) ? $errorData['message'] : 'Erreur inconnue',
            'details' => $errorData
        ]);
    }

} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
