<?php
/*+**********************************************************************************
 * Page standalone pour générer un devis rapidement
 ***********************************************************************************/

chdir(dirname(__FILE__));
require_once 'config.inc.php';

$potentialId = isset($_GET['record']) ? intval($_GET['record']) : 0;

if ($potentialId <= 0) {
    die('ID d\'affaire invalide');
}

$conn = new mysqli($dbconfig['db_server'], $dbconfig['db_username'], $dbconfig['db_password'], $dbconfig['db_name']);

if ($conn->connect_error) {
    die('Erreur de connexion');
}

$stmt = $conn->prepare("SELECT potentialname, related_to, contact_id, assigned_user_id FROM vtiger_potential WHERE potentialid = ?");
$stmt->bind_param('i', $potentialId);
$stmt->execute();
$result = $stmt->get_result();
$potential = $result->fetch_assoc();

if (!$potential) {
    die('Affaire non trouvée');
}

$potentialName = $potential['potentialname'];
$accountId = $potential['related_to'] ?? 0;
$contactId = $potential['contact_id'] ?? 0;
$assignedUserId = $potential['assigned_user_id'] ?? 1;
$stmt->close();

$contactName = '';
if ($contactId > 0) {
    $stmt = $conn->prepare("SELECT firstname, lastname FROM vtiger_contactdetails WHERE contactid = ?");
    $stmt->bind_param('i', $contactId);
    $stmt->execute();
    $result = $stmt->get_result();
    $contact = $result->fetch_assoc();
    if ($contact) {
        $contactName = trim($contact['firstname'] . ' ' . $contact['lastname']);
    }
    $stmt->close();
}

$validityDate = date('Y-m-d', strtotime('+7 days'));
$conn->close();
?>
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Générer un devis - <?php echo htmlspecialchars($potentialName); ?></title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
?><p>END OF PHP</p>
