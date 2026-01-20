<?php
chdir(dirname(__FILE__));
require_once 'config.inc.php';
echo "Step 1: Config loaded<br>";
$potentialId = isset($_GET['record']) ? intval($_GET['record']) : 0;
echo "Step 2: Potential ID = $potentialId<br>";
if ($potentialId <= 0) {
    die('ID invalide');
}
$conn = new mysqli($dbconfig['db_server'], $dbconfig['db_username'], $dbconfig['db_password'], $dbconfig['db_name']);
echo "Step 3: DB connected<br>";
$stmt = $conn->prepare("SELECT potentialname FROM vtiger_potential WHERE potentialid = ?");
$stmt->bind_param('i', $potentialId);
$stmt->execute();
$result = $stmt->get_result();
$potential = $result->fetch_assoc();
echo "Step 4: Query executed<br>";
echo "Potential name: " . htmlspecialchars($potential['potentialname']) . "<br>";
echo "Done!";
