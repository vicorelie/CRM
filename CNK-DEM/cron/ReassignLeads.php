<?php
/**
 * Cron job: Réassigner les prospects non convertis à Team Selling
 *
 * Exécuté chaque nuit à 00:05.
 * Cherche les prospects assignés à un commercial (rôles H4, H5)
 * qui n'ont pas été convertis dans la journée.
 * Si le statut n'est pas FX NUM / PAS INTERESSE / MORT,
 * on les réassigne à Team Selling (groupe 2) avec statut "New".
 */

$dbHost = 'localhost';
$dbName = 'cnk_dem';
$dbUser = 'cnk_dem_user';
$dbPass = 'cedcff26783d08a13a92997c415db618';

$logFile = dirname(__DIR__) . '/logs/reassign_leads.log';

function logMsg($msg) {
	global $logFile;
	$timestamp = date('Y-m-d H:i:s');
	file_put_contents($logFile, "[$timestamp] $msg\n", FILE_APPEND);
}

$mysqli = new mysqli($dbHost, $dbUser, $dbPass, $dbName);
if ($mysqli->connect_error) {
	logMsg("ERREUR connexion DB: " . $mysqli->connect_error);
	exit(1);
}
$mysqli->set_charset('utf8');

$teamSellingId = 2;
$yesterday = date('Y-m-d', strtotime('-1 day'));
$excludedStatuses = "'FX NUM','PAS INTERESSE','MORT'";

// Trouver les prospects assignés à des commerciaux (H4/H5), non convertis,
// modifiés hier, avec un statut non exclu
$sql = "SELECT ld.leadid, ce.smownerid, ld.leadstatus,
               CONCAT(u.first_name, ' ', u.last_name) AS owner_name
        FROM vtiger_leaddetails ld
        INNER JOIN vtiger_crmentity ce ON ce.crmid = ld.leadid
        INNER JOIN vtiger_user2role u2r ON u2r.userid = ce.smownerid
        INNER JOIN vtiger_users u ON u.id = ce.smownerid
        WHERE ce.deleted = 0
          AND ld.converted = 0
          AND u2r.roleid IN ('H4', 'H5')
          AND ld.leadstatus NOT IN ($excludedStatuses)
          AND DATE(ce.modifiedtime) = '$yesterday'";

$result = $mysqli->query($sql);

if (!$result) {
	logMsg("ERREUR requête SELECT: " . $mysqli->error);
	$mysqli->close();
	exit(1);
}

$leadIds = array();
$count = 0;

while ($row = $result->fetch_assoc()) {
	$leadIds[] = $row['leadid'];
	logMsg("Prospect #{$row['leadid']} (statut: {$row['leadstatus']}, assigné à: {$row['owner_name']}) → Team Selling");
	$count++;
}
$result->free();

if ($count === 0) {
	logMsg("Aucun prospect à réassigner pour le $yesterday");
	$mysqli->close();
	exit(0);
}

$idList = implode(',', $leadIds);
$now = date('Y-m-d H:i:s');

// Réassigner à Team Selling
$sql1 = "UPDATE vtiger_crmentity SET smownerid = $teamSellingId, modifiedtime = '$now' WHERE crmid IN ($idList)";
$r1 = $mysqli->query($sql1);
if (!$r1) {
	logMsg("ERREUR UPDATE crmentity: " . $mysqli->error);
}

// Remettre le statut à New
$sql2 = "UPDATE vtiger_leaddetails SET leadstatus = 'New' WHERE leadid IN ($idList)";
$r2 = $mysqli->query($sql2);
if (!$r2) {
	logMsg("ERREUR UPDATE leaddetails: " . $mysqli->error);
}

logMsg("$count prospect(s) réassigné(s) à Team Selling avec statut New");

$mysqli->close();
