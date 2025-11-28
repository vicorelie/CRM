<?php
// Diagnostic script for SMTP configuration
chdir(__DIR__);
require_once 'config.inc.php';
require_once 'include/database/PearDatabase.php';

header('Content-Type: text/plain');

echo "=== SMTP Configuration Diagnostic ===\n\n";

$db = PearDatabase::getInstance();

// Check default configuration
echo "1. Default SMTP (vtiger_systems):\n";
$result = $db->pquery("SELECT * FROM vtiger_systems WHERE server_type=?", array('email'));
if ($db->num_rows($result) > 0) {
    $row = $db->fetchByAssoc($result);
    echo "   Server: " . $row['server'] . "\n";
    echo "   Username: " . $row['server_username'] . "\n";
    echo "   SMTP Auth: " . $row['smtp_auth'] . "\n";
    echo "   SMTP Auth Type: " . ($row['smtp_auth_type'] ?? 'N/A') . "\n";
    echo "   From Email: " . $row['from_email_field'] . "\n";
} else {
    echo "   Not configured\n";
}

// Check ITS4You Multi SMTP
echo "\n2. ITS4You Multi SMTP:\n";
$result = $db->pquery("SELECT * FROM its4you_smtp LIMIT 1", array());
if ($db->num_rows($result) > 0) {
    $row = $db->fetchByAssoc($result);
    echo "   ID: " . $row['id'] . "\n";
    echo "   Server: " . $row['server'] . "\n";
    echo "   Port: " . $row['server_port'] . "\n";
    echo "   Protocol: " . $row['server_protocol'] . "\n";
    echo "   Username: " . $row['server_username'] . "\n";
    echo "   SMTP Auth: " . $row['smtp_auth'] . "\n";
    echo "   From Email: " . $row['from_email_field'] . "\n";
    echo "   Mailer Type: " . ($row['mailer_type'] ?? 'N/A') . "\n";
    echo "   Default: " . ($row['smtp_default'] ?? 'N/A') . "\n";
} else {
    echo "   Not configured\n";
}

// Test basic connection
echo "\n3. Connection Test to webama.fr:465:\n";
$errno = 0;
$errstr = '';
$context = stream_context_create([
    'ssl' => [
        'verify_peer' => false,
        'verify_peer_name' => false,
        'allow_self_signed' => true
    ]
]);

$conn = @stream_socket_client(
    "ssl://webama.fr:465",
    $errno,
    $errstr,
    10,
    STREAM_CLIENT_CONNECT,
    $context
);

if ($conn) {
    echo "   ✓ Connection successful\n";
    $response = fgets($conn);
    echo "   Response: " . $response;
    fclose($conn);
} else {
    echo "   ✗ Connection failed: $errstr (Code: $errno)\n";
}

echo "\n=== End ===\n";
