<?php
// submit-devis.php - API pour soumettre une demande de devis
// Utilise la classe Database sécurisée avec prepared statements

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

// Importer la configuration et la classe Database
require_once(__DIR__ . '/../config.php');
require_once('../../api/dev/Database.php');

// Gérer les requêtes OPTIONS (CORS preflight)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Vérifier que c'est une requête POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Méthode non autorisée']);
    exit();
}

// Récupérer les données JSON
$json = file_get_contents('php://input');
$data = json_decode($json, true);

// Validation des données requises
$required_fields = ['depart', 'arrivee', 'date_demenagement', 'type_logement', 'nom', 'email', 'telephone'];
foreach ($required_fields as $field) {
    if (empty($data[$field])) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => "Le champ '$field' est requis"
        ]);
        exit();
    }
}

// Validation de l'email
if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Email invalide'
    ]);
    exit();
}

// Validation du téléphone
$phone = preg_replace('/[^0-9+]/', '', $data['telephone']);
if (strlen($phone) < 10) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Numéro de téléphone invalide'
    ]);
    exit();
}

// Valider la date (doit être dans le futur)
$date_demenagement = new DateTime($data['date_demenagement']);
$today = new DateTime();
$today->setTime(0, 0, 0);

if ($date_demenagement < $today) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'La date de déménagement doit être dans le futur'
    ]);
    exit();
}

try {
    // Connexion à la base de données en utilisant les constantes de config.php
    $db = new Database(DB_HOST, DB_NAME, DB_USER, DB_PASS);

    // Préparer les services additionnels
    $services = isset($data['services']) && is_array($data['services'])
        ? json_encode($data['services'])
        : json_encode([]);

    // Générer un UUID unique pour la demande
    $uuid = bin2hex(random_bytes(16));

    // Insérer la demande dans la base de données
    // ✅ SECURE: Using prepared statements
    $db->query("
        INSERT INTO demandes_devis (
            uuid,
            ville_depart,
            ville_arrivee,
            date_demenagement,
            type_logement,
            surface,
            services_additionnels,
            nom_client,
            email_client,
            telephone_client,
            statut,
            created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'nouveau', NOW())
    ");

    $db->bind(1, $uuid);
    $db->bind(2, $data['depart']);
    $db->bind(3, $data['arrivee']);
    $db->bind(4, $data['date_demenagement']);
    $db->bind(5, $data['type_logement']);
    $db->bind(6, $data['surface'] ?? null, PDO::PARAM_INT);
    $db->bind(7, $services);
    $db->bind(8, $data['nom']);
    $db->bind(9, $data['email']);
    $db->bind(10, $data['telephone']);

    if (!$db->execute()) {
        throw new Exception('Erreur lors de l\'insertion de la demande');
    }

    $id_demande = $db->lastInsertId();

    // TODO: Envoyer un email de confirmation au client
    // TODO: Notifier les déménageurs partenaires

    // Log de succès
    error_log("Nouvelle demande de devis créée: ID=$id_demande, UUID=$uuid, Client={$data['nom']}");

    // Réponse de succès
    http_response_code(201);
    echo json_encode([
        'success' => true,
        'message' => 'Demande envoyée avec succès',
        'data' => [
            'id' => $id_demande,
            'uuid' => $uuid
        ]
    ]);

} catch (Exception $e) {
    // Log de l'erreur
    error_log("Erreur submit-devis.php: " . $e->getMessage());

    // Réponse d'erreur
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Une erreur est survenue. Veuillez réessayer plus tard.'
    ]);
}
