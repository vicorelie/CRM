<?php
/*+**********************************************************************************
 * Get Email History for a Potential record
 ************************************************************************************/

class Potentials_GetEmailHistory_Action extends Vtiger_Action_Controller {

    public function checkPermission(Vtiger_Request $request) {
        $moduleName = $request->getModule();
        $recordId = $request->get('record');

        $recordPermission = Users_Privileges_Model::isPermitted($moduleName, 'DetailView', $recordId);
        if(!$recordPermission) {
            throw new AppException(vtranslate('LBL_PERMISSION_DENIED'));
        }
        return true;
    }

    public function process(Vtiger_Request $request) {
        $recordId = $request->get('record');
        $mode = $request->get('mode');
        $response = new Vtiger_Response();

        try {
            if ($mode === 'detail') {
                // Return full email detail for viewing
                $emailId = $request->get('email_id');
                $detail = $this->getEmailDetail($emailId);
                $response->setResult($detail);
            } else {
                // Return email list
                $emails = $this->getEmailHistory($recordId);
                $response->setResult([
                    'success' => true,
                    'emails' => $emails
                ]);
            }
        } catch (Exception $e) {
            $response->setError($e->getMessage());
        }

        $response->emit();
    }

    /**
     * Get full email detail by ID
     */
    private function getEmailDetail($emailId) {
        global $adb;

        $sql = "SELECT e.body, e.subject, e.to_email, e.cc_email, e.from_email, e.email_flag, e.attachment_ids, ce.createdtime
                FROM its4you_emails e
                INNER JOIN vtiger_crmentity ce ON ce.crmid = e.its4you_emails_id
                WHERE e.its4you_emails_id = ? AND ce.deleted = 0";
        $result = $adb->pquery($sql, [$emailId]);

        if ($adb->num_rows($result) > 0) {
            $toEmail = $adb->query_result($result, 0, 'to_email');
            if (!empty($toEmail)) {
                $toEmail = html_entity_decode($toEmail, ENT_QUOTES, 'UTF-8');
                $decoded = json_decode($toEmail, true);
                if (is_array($decoded)) {
                    $toEmail = implode(', ', $decoded);
                }
                $toEmail = str_replace(['"', '[', ']'], '', $toEmail);
                $toEmail = trim($toEmail);
            }

            $subject = html_entity_decode($adb->query_result($result, 0, 'subject'), ENT_QUOTES, 'UTF-8');
            $fromEmail = html_entity_decode($adb->query_result($result, 0, 'from_email'), ENT_QUOTES, 'UTF-8');

            $body = $adb->query_result($result, 0, 'body');
            // Decode HTML entities if body contains encoded HTML tags
            if (strpos($body, '&lt;') !== false) {
                $body = html_entity_decode($body, ENT_QUOTES, 'UTF-8');
            }

            // CC
            $ccEmail = $adb->query_result($result, 0, 'cc_email');
            if (!empty($ccEmail)) {
                $ccEmail = html_entity_decode($ccEmail, ENT_QUOTES, 'UTF-8');
            }

            // Pièces jointes
            $attachments = [];
            $attachmentIds = $adb->query_result($result, 0, 'attachment_ids');
            if (!empty($attachmentIds)) {
                $attachmentIds = html_entity_decode($attachmentIds, ENT_QUOTES, 'UTF-8');
                $decoded = json_decode($attachmentIds, true);
                if (is_array($decoded)) {
                    $attachments = $decoded;
                }
            }

            return [
                'success' => true,
                'body' => $body,
                'subject' => $subject,
                'from' => $fromEmail,
                'to' => $toEmail,
                'cc' => $ccEmail ?: '',
                'date' => date('d/m/Y H:i', strtotime($adb->query_result($result, 0, 'createdtime'))),
                'status' => $adb->query_result($result, 0, 'email_flag'),
                'attachments' => $attachments
            ];
        }
        return ['success' => false, 'error' => 'Email introuvable'];
    }

    /**
     * Get email history for the record
     */
    private function getEmailHistory($recordId) {
        global $adb;

        $emails = [];

        // Récupérer le contact_id lié à ce Potential
        $contactId = '';
        $potentialResult = $adb->pquery("SELECT contact_id FROM vtiger_potential WHERE potentialid = ?", [$recordId]);
        if ($adb->num_rows($potentialResult) > 0) {
            $contactId = $adb->query_result($potentialResult, 0, 'contact_id');
        }

        // Get emails from ITS4YouEmails
        $sql = "SELECT
                    e.its4you_emails_id as emailid,
                    e.subject,
                    e.from_email,
                    e.to_email,
                    e.email_flag,
                    e.attachment_ids,
                    e.message_id,
                    ce.createdtime,
                    u.first_name,
                    u.last_name
                FROM its4you_emails e
                INNER JOIN vtiger_crmentity ce ON ce.crmid = e.its4you_emails_id
                LEFT JOIN vtiger_users u ON u.id = ce.smownerid
                WHERE (e.related_to = ? OR e.contact_id = ?)
                    AND ce.deleted = 0
                ORDER BY ce.createdtime DESC
                LIMIT 50";

        $result = $adb->pquery($sql, [$recordId, $contactId ?: 0]);

        // Collect email IDs to batch-fetch Brevo events
        $emailRows = [];
        while ($row = $adb->fetch_array($result)) {
            $emailRows[] = $row;
        }

        // Batch fetch Brevo events for all emails that have a message_id
        $brevoStatuses = [];
        $brevoAllEvents = [];
        $emailIdsWithMsg = [];
        foreach ($emailRows as $row) {
            if (!empty($row['message_id'])) {
                $emailIdsWithMsg[] = intval($row['emailid']);
            }
        }
        if (!empty($emailIdsWithMsg)) {
            // Priorité des événements (plus élevé = plus avancé dans le cycle)
            $eventPriority = [
                'sent' => 1,
                'delivered' => 2,
                'deferred' => 3,
                'proxy_open' => 4,
                'opened' => 5,
                'clicked' => 6,
                'soft_bounce' => 7,
                'hard_bounce' => 8,
                'blocked' => 8,
                'error' => 8,
                'complaint' => 9,
                'unsubscribed' => 9,
                'invalid_email' => 8,
            ];
            $placeholders = implode(',', array_fill(0, count($emailIdsWithMsg), '?'));
            $evtSql = "SELECT email_id, event_type FROM vtiger_email_events WHERE email_id IN ($placeholders)";
            $evtResult = $adb->pquery($evtSql, $emailIdsWithMsg);
            while ($evtRow = $adb->fetch_array($evtResult)) {
                $eid = intval($evtRow['email_id']);
                $etype = $evtRow['event_type'];
                // Collecter tous les événements uniques
                if (!isset($brevoAllEvents[$eid])) {
                    $brevoAllEvents[$eid] = [];
                }
                $brevoAllEvents[$eid][$etype] = true;
                // Garder le statut le plus avancé
                $newPrio = $eventPriority[$etype] ?? 0;
                $curPrio = isset($brevoStatuses[$eid]) ? ($eventPriority[$brevoStatuses[$eid]] ?? 0) : -1;
                if ($newPrio > $curPrio) {
                    $brevoStatuses[$eid] = $etype;
                }
            }
        }

        foreach ($emailRows as $row) {
            $toEmail = $row['to_email'];
            if (!empty($toEmail)) {
                $toEmail = html_entity_decode($toEmail, ENT_QUOTES, 'UTF-8');
                $decoded = json_decode($toEmail, true);
                if (is_array($decoded)) {
                    $toEmail = implode(', ', $decoded);
                }
                $toEmail = str_replace(['"', '[', ']'], '', $toEmail);
                $toEmail = trim($toEmail);
            }

            $status = '';
            if ($row['email_flag'] === 'SENT') {
                $status = 'sent';
            } elseif ($row['email_flag'] === 'SAVED') {
                $status = 'draft';
            } elseif ($row['email_flag'] === 'ERROR') {
                $status = 'error';
            }

            // Override with Brevo status if available
            $brevoStatus = '';
            $brevoEvents = [];
            $eid = intval($row['emailid']);
            if (isset($brevoStatuses[$eid])) {
                $brevoStatus = $brevoStatuses[$eid];
                $brevoEvents = array_keys($brevoAllEvents[$eid] ?? []);
            }

            $subject = html_entity_decode($row['subject'] ?: 'Sans objet', ENT_QUOTES, 'UTF-8');

            $emails[] = [
                'id' => $row['emailid'],
                'subject' => $subject,
                'to' => $toEmail,
                'date' => $this->formatDate($row['createdtime']),
                'raw_date' => $row['createdtime'],
                'from' => trim($row['first_name'] . ' ' . $row['last_name']),
                'has_attachments' => !empty($row['attachment_ids']),
                'status' => $status,
                'brevo_status' => $brevoStatus,
                'brevo_events' => $brevoEvents
            ];
        }

        // Sort by raw_date DESC (newest first)
        usort($emails, function($a, $b) {
            return strcmp($b['raw_date'], $a['raw_date']);
        });

        return $emails;
    }

    /**
     * Format date for display
     */
    private function formatDate($datetime) {
        if (empty($datetime)) {
            return '';
        }

        $timestamp = strtotime($datetime);
        $now = time();
        $diff = $now - $timestamp;

        if ($diff < 3600) {
            $minutes = max(1, floor($diff / 60));
            return 'Il y a ' . $minutes . ' min';
        }

        if ($diff < 86400) {
            $hours = floor($diff / 3600);
            return 'Il y a ' . $hours . 'h';
        }

        if ($diff < 604800) {
            $days = floor($diff / 86400);
            return 'Il y a ' . $days . 'j';
        }

        return date('d/m/Y H:i', $timestamp);
    }
}
