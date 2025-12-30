<?php
chdir(dirname(__FILE__));
require_once 'config.inc.php';
$potentialId = isset($_GET['record']) ? intval($_GET['record']) : 0;
if ($potentialId <= 0) die('ID invalide');
$conn = new mysqli($dbconfig['db_server'], $dbconfig['db_username'], $dbconfig['db_password'], $dbconfig['db_name']);
$stmt = $conn->prepare("SELECT potentialname FROM vtiger_potential WHERE potentialid = ?");
$stmt->bind_param('i', $potentialId);
$stmt->execute();
$result = $stmt->get_result();
$potential = $result->fetch_assoc();
$potentialName = $potential['potentialname'];
?>
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Test</title>
</head>
<body>
    <h1>Test Popup</h1>
    <p>Affaire: <?php echo htmlspecialchars($potentialName); ?></p>
</body>
</html>
