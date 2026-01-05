<?php
// rappel_create_task.php - Création de la tâche de rappel
chdir(dirname(__FILE__));
require_once 'config.inc.php';

// En-tête JSON
header('Content-Type: application/json');

// Récupération des données POST
$module = isset($_POST['module']) ? $_POST['module'] : '';
$recordId = isset($_POST['record_id']) ? intval($_POST['record_id']) : 0;
$userId = isset($_POST['user_id']) ? intval($_POST['user_id']) : 1;
$rappelDate = isset($_POST['rappel_date']) ? $_POST['rappel_date'] : '';
$rappelHeure = isset($_POST['rappel_heure']) ? $_POST['rappel_heure'] : '';
$rappelMotif = isset($_POST['rappel_motif']) ? trim($_POST['rappel_motif']) : '';
$rappelNotes = isset($_POST['rappel_notes']) ? trim($_POST['rappel_notes']) : '';

// Validation
if (empty($module) || $recordId == 0 || empty($rappelDate) || empty($rappelHeure) || empty($rappelMotif)) {
    echo json_encode(['success' => false, 'error' => 'Champs obligatoires manquants']);
    exit;
}

// Validation du module
if (!in_array($module, ['Leads', 'Potentials'])) {
    echo json_encode(['success' => false, 'error' => 'Module invalide']);
    exit;
}

try {
    // Connexion MySQL
    $conn = new mysqli(
        $dbconfig['db_server'],
        $dbconfig['db_username'],
        $dbconfig['db_password'],
        $dbconfig['db_name']
    );

    if ($conn->connect_error) {
        throw new Exception('Erreur de connexion: ' . $conn->connect_error);
    }

    // Générer un nouvel ID pour l'activité
    $result = $conn->query("SELECT MAX(id) as max_id FROM vtiger_crmentity_seq");
    $row = $result->fetch_assoc();
    $activityId = $row['max_id'] + 1;

    $conn->query("INSERT INTO vtiger_crmentity_seq (id) VALUES ($activityId)");

    // Préparer les données
    $subject = "Rappel : " . $rappelMotif;
    $description = !empty($rappelNotes) ? $rappelNotes : '';
    $dateStart = $rappelDate;
    $timeStart = $rappelHeure;
    // Date d'échéance = date de rappel + 3 jours
    $dueDate = date('Y-m-d', strtotime($rappelDate . ' +3 days'));
    $timeEnd = date('H:i', strtotime($rappelHeure) + 3600); // +1 heure

    // Format datetime pour VTiger
    $modifiedTime = date('Y-m-d H:i:s');
    $createdTime = $modifiedTime;

    // 1. Insérer dans vtiger_crmentity
    $stmt = $conn->prepare("
        INSERT INTO vtiger_crmentity
        (crmid, smcreatorid, smownerid, modifiedby, setype, description, createdtime, modifiedtime, presence, deleted, label)
        VALUES (?, ?, ?, ?, 'Calendar', ?, ?, ?, 1, 0, ?)
    ");
    $stmt->bind_param('iiisssss',
        $activityId, $userId, $userId, $userId,
        $description, $createdTime, $modifiedTime, $subject
    );
    $stmt->execute();

    // 2. Insérer dans vtiger_activity avec notification activée
    $stmt = $conn->prepare("
        INSERT INTO vtiger_activity
        (activityid, subject, activitytype, date_start, due_date, time_start, time_end, status, eventstatus, priority, location, visibility, sendnotification)
        VALUES (?, ?, 'Task', ?, ?, ?, ?, 'Not Started', '', 'Normal', '', 'Private', '1')
    ");
    $stmt->bind_param('isssss',
        $activityId, $subject, $dateStart, $dueDate, $timeStart, $timeEnd
    );
    $stmt->execute();

    // 3. Insérer dans vtiger_activitycf (champs personnalisés)
    $conn->query("INSERT INTO vtiger_activitycf (activityid) VALUES ($activityId)");

    // 4. Lier la tâche au Lead ou Potential
    $stmt = $conn->prepare("
        INSERT INTO vtiger_seactivityrel (crmid, activityid)
        VALUES (?, ?)
    ");
    $stmt->bind_param('ii', $recordId, $activityId);
    $stmt->execute();

    // 5. Créer un rappel (notification) 5 minutes avant
    // VTiger stocke le reminder_time en MINUTES, pas en timestamp
    $reminderMinutes = 5; // 5 minutes avant
    $stmt = $conn->prepare("
        INSERT INTO vtiger_activity_reminder (activity_id, reminder_time, reminder_sent, recurringid)
        VALUES (?, ?, 0, 0)
    ");
    $stmt->bind_param('ii', $activityId, $reminderMinutes);
    $stmt->execute();

    // 6. Insérer dans vtiger_activity_reminder_popup
    // Calculer la date/heure du rappel (5 minutes avant la tâche)
    $reminderTimestamp = strtotime($rappelDate . ' ' . $rappelHeure) - (5 * 60);
    $reminderDate = date('Y-m-d', $reminderTimestamp);
    $reminderTimeStr = date('H:i:s', $reminderTimestamp);
    $stmt = $conn->prepare("
        INSERT INTO vtiger_activity_reminder_popup (semodule, recordid, date_start, time_start, status)
        VALUES ('Calendar', ?, ?, ?, 0)
    ");
    $stmt->bind_param('iss', $activityId, $reminderDate, $reminderTimeStr);
    $stmt->execute();

    $conn->close();

    echo json_encode([
        'success' => true,
        'task_id' => $activityId,
        'message' => 'Tâche de rappel créée avec succès'
    ]);

} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => 'Erreur serveur: ' . $e->getMessage()
    ]);
}
