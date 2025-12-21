<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "Test 1: Basic PHP working<br>\n";

chdir('/var/www/CRM/ARIDEM');
include_once 'config.inc.php';
echo "Test 2: Config loaded<br>\n";

echo "Site URL from config: " . $site_URL . "<br>\n";
echo "Root directory: " . $root_directory . "<br>\n";

// Test connexion DB
$mysqli = new mysqli('localhost', 'vicorelie_vtig844', 'r!555y0p5(', 'vicorelie_vtig844');
if ($mysqli->connect_error) {
    die('DB Error: ' . $mysqli->connect_error);
}
echo "Test 3: Database connected<br>\n";

$result = $mysqli->query("SELECT * FROM vtiger_systems WHERE server_type='webserver'");
if ($result && $row = $result->fetch_assoc()) {
    echo "Database site_URL: " . $row['server'] . "<br>\n";
}

echo "<br>All tests passed!";
?>
