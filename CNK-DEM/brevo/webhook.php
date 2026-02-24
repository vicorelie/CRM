<?php
/*+***********************************************************************************
 * Webhook Brevo - Réception des événements email (delivered, opened, clicked, etc.)
 * URL à configurer dans Brevo : https://crm.cnkdem.com/brevo/webhook.php
 *************************************************************************************/

// Pas de bootstrap VTiger (trop lourd + die() en CLI)
// Connexion directe à la base
$dbHost = 'localhost';
$dbUser = 'cnk_dem_user';
$dbPass = 'cedcff26783d08a13a92997c415db618';
$dbName = 'cnk_dem';

$logFile = dirname(__DIR__) . '/logs/brevo_webhook.log';

function logMsg($msg) {
	global $logFile;
	file_put_contents($logFile, date('Y-m-d H:i:s') . ' - ' . $msg . "\n", FILE_APPEND);
}

// Lire le payload JSON
$rawPayload = file_get_contents('php://input');
if (empty($rawPayload)) {
	http_response_code(400);
	echo 'No payload';
	exit;
}

$payload = json_decode($rawPayload, true);
if (!$payload) {
	http_response_code(400);
	echo 'Invalid JSON';
	exit;
}

// Brevo envoie un seul événement ou un tableau
$events = isset($payload['event']) ? [$payload] : $payload;

try {
	$db = new mysqli($dbHost, $dbUser, $dbPass, $dbName);
	if ($db->connect_error) {
		logMsg('DB connection error: ' . $db->connect_error);
		http_response_code(500);
		exit;
	}
	$db->set_charset('utf8');

	foreach ($events as $event) {
		$eventType = $event['event'] ?? '';
		$messageId = $event['message-id'] ?? ($event['MessageID'] ?? '');
		$toEmail = $event['email'] ?? '';
		$eventDate = $event['date'] ?? date('Y-m-d H:i:s');

		// Normaliser le message-id (enlever < > si présent)
		$messageId = trim($messageId, '<>');

		if (empty($eventType) || empty($messageId)) {
			logMsg('Skipping event: missing event type or message-id');
			continue;
		}

		// Mapper les événements Brevo vers nos types
		$eventMap = [
			'request' => 'sent',
			'requests' => 'sent',
			'sent' => 'sent',
			'delivered' => 'delivered',
			'opened' => 'opened',           // Alias 'open'
			'open' => 'opened',
			'unique_opened' => 'opened',
			'click' => 'clicked',
			'clicked' => 'clicked',
			'hard_bounce' => 'hard_bounce',
			'soft_bounce' => 'soft_bounce',
			'blocked' => 'blocked',
			'deferred' => 'deferred',
			'complaint' => 'complaint',
			'spam' => 'complaint',
			'unsubscribed' => 'unsubscribed',
			'unsubscribe' => 'unsubscribed',
			'invalid_email' => 'invalid_email',
			'invalid' => 'invalid_email',
			'error' => 'error',
			'proxy_open' => 'proxy_open',
			'loaded_by_proxy' => 'proxy_open',
			'unique_proxy_open' => 'proxy_open'
		];

		$normalizedEvent = $eventMap[strtolower($eventType)] ?? strtolower($eventType);

		// Chercher l'email_id correspondant dans its4you_emails via le message_id
		$emailId = null;
		$stmt = $db->prepare("SELECT its4you_emails_id FROM its4you_emails WHERE message_id = ? LIMIT 1");
		if ($stmt) {
			$fullMessageId = '<' . $messageId . '>';
			$stmt->bind_param('s', $fullMessageId);
			$stmt->execute();
			$result = $stmt->get_result();
			if ($row = $result->fetch_assoc()) {
				$emailId = $row['its4you_emails_id'];
			}
			$stmt->close();

			// Essayer aussi sans les < >
			if (!$emailId) {
				$stmt = $db->prepare("SELECT its4you_emails_id FROM its4you_emails WHERE message_id = ? LIMIT 1");
				$stmt->bind_param('s', $messageId);
				$stmt->execute();
				$result = $stmt->get_result();
				if ($row = $result->fetch_assoc()) {
					$emailId = $row['its4you_emails_id'];
				}
				$stmt->close();
			}
		}

		// Insérer l'événement
		$stmt = $db->prepare("INSERT INTO vtiger_email_events (email_id, message_id, event_type, to_email, event_date, raw_data) VALUES (?, ?, ?, ?, ?, ?)");
		$rawJson = json_encode($event, JSON_UNESCAPED_UNICODE);
		$stmt->bind_param('isssss', $emailId, $messageId, $normalizedEvent, $toEmail, $eventDate, $rawJson);
		$stmt->execute();
		$stmt->close();

		logMsg("Event: $normalizedEvent | To: $toEmail | MsgID: $messageId | EmailID: " . ($emailId ?: 'N/A'));
	}

	$db->close();
} catch (Exception $e) {
	logMsg('Exception: ' . $e->getMessage());
	http_response_code(500);
	exit;
}

http_response_code(200);
echo 'OK';
