<?php
error_reporting(E_ALL);
ini_set('display_errors', '1');
ini_set('log_errors', '1');
ini_set('error_log', '/tmp/vtiger_debug.log');

echo "=== DEBUG START ===\n";
echo "PHP Version: " . PHP_VERSION . "\n";
echo "Current directory: " . getcwd() . "\n";

// Capture all output
ob_start();

try {
    chdir(dirname(__FILE__));
    include_once('config.inc.php');
    echo "Config loaded\n";
    
    // Start session
    session_start();
    
    // Simulate logged in user
    $_SESSION['authenticated_user_id'] = 1;
    $_SESSION['app_unique_key'] = $application_unique_key;
    
    // Simulate request
    $_REQUEST['module'] = 'Home';
    $_REQUEST['action'] = 'index';
    $_REQUEST['view'] = 'DashBoard';
    
    echo "Session started, loading index.php\n";
    
    include('index.php');
    
} catch (Exception $e) {
    echo "\n\nEXCEPTION: " . $e->getMessage() . "\n";
    echo "File: " . $e->getFile() . ":" . $e->getLine() . "\n";
    echo "Trace:\n" . $e->getTraceAsString() . "\n";
} catch (Error $e) {
    echo "\n\nERROR: " . $e->getMessage() . "\n";
    echo "File: " . $e->getFile() . ":" . $e->getLine() . "\n";
}

$output = ob_get_clean();

echo "\n=== OUTPUT LENGTH: " . strlen($output) . " bytes ===\n";
echo "First 2000 chars of output:\n";
echo substr($output, 0, 2000) . "\n";
echo "\n=== Last 2000 chars of output: ===\n";
echo substr($output, -2000) . "\n";

// Check if only footer is shown
if (strpos($output, 'Développement et design By') !== false && strpos($output, '<html') === false) {
    echo "\n\n*** PROBLEM DETECTED: Only footer is rendered, no HTML structure! ***\n";
}

