<?php
error_reporting(E_ALL);
ini_set('display_errors', '1');
echo "Start\n";

chdir(__DIR__);
include_once 'config.inc.php';
echo "Config loaded\n";

include_once 'include/database/PearDatabase.php';
echo "DB loaded\n";

$db = PearDatabase::getInstance();
echo "DB connected\n";

$res = $db->pquery("SELECT templatename, module, subject FROM vtiger_emakertemplates WHERE templateid = ?", array(11));
echo "Query done, rows: " . $db->num_rows($res) . "\n";

if ($db->num_rows($res) > 0) {
    $row = $db->query_result_rowdata($res, 0);
    echo "Template: " . $row["templatename"] . "\n";
    echo "Module: [" . $row["module"] . "]\n";
    echo "Subject: " . $row["subject"] . "\n";
}

$res2 = $db->pquery("SELECT SUBSTRING(body, 1, 500) as body_preview FROM vtiger_emakertemplates WHERE templateid = ?", array(11));
if ($db->num_rows($res2) > 0) {
    $preview = $db->query_result($res2, 0, "body_preview");
    echo "Body preview: " . $preview . "\n";
}
echo "Done\n";
