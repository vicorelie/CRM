<?php

/**
 * Import CSV leads from external provider (leads_v2_*.csv format)
 * Called via AJAX from the Leads ListView
 */
class Leads_ImportCSV_Action extends Vtiger_Action_Controller {

    public function checkPermission(Vtiger_Request $request) {
        $currentUser = Users_Record_Model::getCurrentUserModel();
        if (!$currentUser || !$currentUser->getId()) {
            throw new AppException('Permission denied');
        }
        $moduleModel = Vtiger_Module_Model::getInstance('Leads');
        if (!$moduleModel->isPermitted('CreateView')) {
            throw new AppException('No permission to create Leads');
        }
    }

    public function process(Vtiger_Request $request) {
        $response = new Vtiger_Response();

        try {
            if (empty($_FILES['csv_file']) || $_FILES['csv_file']['error'] !== UPLOAD_ERR_OK) {
                throw new Exception('Aucun fichier CSV uploadé ou erreur d\'upload');
            }

            $file = $_FILES['csv_file'];
            $skipRefunded = $request->get('skip_refunded') !== '0';
            $skipDuplicates = $request->get('skip_duplicates') !== '0';

            // Validate file type
            $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
            if ($ext !== 'csv') {
                throw new Exception('Le fichier doit être un CSV');
            }

            // Parse CSV
            $rows = $this->parseCSV($file['tmp_name']);
            if (empty($rows)) {
                throw new Exception('Le fichier CSV est vide ou illisible');
            }

            // Get current user for assignment
            $currentUser = Users_Record_Model::getCurrentUserModel();
            $userId = $currentUser->getId();

            // Load existing emails for duplicate detection
            $existingEmails = [];
            if ($skipDuplicates) {
                $existingEmails = $this->getExistingEmails();
            }

            $created = 0;
            $skipped = 0;
            $errors = 0;
            $details = [];

            foreach ($rows as $i => $row) {
                $rowNum = $i + 2; // +2 because header is row 1, array is 0-indexed

                // Skip REFUNDED
                $status = trim($row['Status'] ?? '');
                if ($skipRefunded && strtoupper($status) === 'REFUNDED') {
                    $skipped++;
                    $details[] = [
                        'row' => $rowNum,
                        'status' => 'skipped',
                        'reason' => 'REFUNDED',
                        'name' => $row['Name'] ?? ''
                    ];
                    continue;
                }

                // Map fields
                $leadData = $this->mapCSVToLead($row);

                // Skip duplicates by email
                if ($skipDuplicates && !empty($leadData['email'])) {
                    $emailLower = strtolower($leadData['email']);
                    if (isset($existingEmails[$emailLower])) {
                        $skipped++;
                        $details[] = [
                            'row' => $rowNum,
                            'status' => 'skipped',
                            'reason' => 'Doublon email: ' . $leadData['email'],
                            'name' => ($leadData['firstname'] ?? '') . ' ' . ($leadData['lastname'] ?? '')
                        ];
                        continue;
                    }
                    // Add to existing to prevent duplicates within same import
                    $existingEmails[$emailLower] = true;
                }

                // Create lead
                try {
                    $leadId = $this->createLead($leadData, $userId);
                    $created++;
                    $details[] = [
                        'row' => $rowNum,
                        'status' => 'created',
                        'lead_id' => $leadId,
                        'name' => ($leadData['firstname'] ?? '') . ' ' . ($leadData['lastname'] ?? '')
                    ];
                } catch (Exception $e) {
                    $errors++;
                    $details[] = [
                        'row' => $rowNum,
                        'status' => 'error',
                        'reason' => $e->getMessage(),
                        'name' => ($leadData['firstname'] ?? '') . ' ' . ($leadData['lastname'] ?? '')
                    ];
                }
            }

            $response->setResult([
                'success' => true,
                'total' => count($rows),
                'created' => $created,
                'skipped' => $skipped,
                'errors' => $errors,
                'details' => $details
            ]);

        } catch (Exception $e) {
            $response->setResult([
                'success' => false,
                'error' => $e->getMessage()
            ]);
        }

        $response->emit();
    }

    /**
     * Parse CSV file and return array of associative rows
     */
    private function parseCSV($filePath) {
        $handle = fopen($filePath, 'r');
        if (!$handle) {
            throw new Exception('Impossible d\'ouvrir le fichier CSV');
        }

        // Read first line and strip BOM
        $headerLine = fgets($handle);
        $headerLine = preg_replace('/^\xEF\xBB\xBF/', '', $headerLine);
        rewind($handle);

        // Re-read header with fgetcsv
        $bom = fread($handle, 3);
        if ($bom !== "\xEF\xBB\xBF") {
            rewind($handle);
        }

        $headers = fgetcsv($handle);
        if (!$headers) {
            fclose($handle);
            throw new Exception('Impossible de lire les en-têtes du CSV');
        }

        // Clean header names
        $headers = array_map('trim', $headers);

        $rows = [];
        while (($data = fgetcsv($handle)) !== false) {
            if (count($data) < count($headers)) {
                // Pad with empty strings
                $data = array_pad($data, count($headers), '');
            }
            $row = [];
            foreach ($headers as $idx => $header) {
                $row[$header] = $data[$idx] ?? '';
            }
            // Skip completely empty rows
            $nonEmpty = array_filter($row, function($v) { return trim($v) !== ''; });
            if (!empty($nonEmpty)) {
                $rows[] = $row;
            }
        }

        fclose($handle);
        return $rows;
    }

    /**
     * Map CSV row to VTiger lead fields
     */
    private function mapCSVToLead($row) {
        $leadData = [];

        // Name splitting: last word = lastname, rest = firstname
        $fullName = trim($row['Name'] ?? '');
        if (!empty($fullName)) {
            $parts = preg_split('/\s+/', $fullName);
            if (count($parts) > 1) {
                $leadData['lastname'] = array_pop($parts);
                $leadData['firstname'] = implode(' ', $parts);
            } else {
                $leadData['lastname'] = $fullName;
                $leadData['firstname'] = '';
            }
        } else {
            $leadData['lastname'] = 'Inconnu';
        }

        // Phone - copy to both phone and mobile
        $phone = trim($row['Phone'] ?? '');
        if (!empty($phone)) {
            $leadData['phone'] = $phone;
            $leadData['mobile'] = $phone;
        }

        // Email
        $leadData['email'] = trim($row['Email'] ?? '');

        // Address
        $leadData['lane'] = trim($row['Address Line 1'] ?? '');
        $leadData['city'] = trim($row['City'] ?? '');
        $leadData['code'] = trim($row['Postcode'] ?? '');

        // Country mapping
        $country = trim($row['Country'] ?? '');
        $countryMap = ['FRA' => 'France', 'DEU' => 'Germany', 'GBR' => 'United Kingdom', 'ESP' => 'Spain', 'ITA' => 'Italy', 'BEL' => 'Belgium', 'CHE' => 'Switzerland'];
        $leadData['country'] = $countryMap[$country] ?? ($country ?: 'France');

        // Company & Job
        $leadData['company'] = trim($row['Company Name'] ?? '');
        $leadData['designation'] = trim($row['Job Title'] ?? '');

        // Lead source
        $leadData['leadsource'] = 'movehub';

        // Lead status
        $leadData['leadstatus'] = 'New';

        // Build description
        $descParts = [];
        $leadRef = trim($row['Lead Reference'] ?? '');
        if (!empty($leadRef)) {
            $descParts[] = 'Ref: ' . $leadRef;
        }
        $category = trim($row['Category'] ?? '');
        if (!empty($category)) {
            $descParts[] = 'Catégorie: ' . $category;
        }

        // Parse Questions field
        $questions = trim($row['Questions'] ?? '');
        if (!empty($questions)) {
            $qParts = explode('|', $questions);
            foreach ($qParts as $qPart) {
                $qPart = trim($qPart);
                if (empty($qPart)) continue;

                // Split on first ": "
                $colonPos = strpos($qPart, ': ');
                if ($colonPos === false) continue;

                $key = trim(substr($qPart, 0, $colonPos));
                $value = trim(substr($qPart, $colonPos + 2));

                if (empty($value)) continue;

                switch ($key) {
                    case 'Destination Zipcode/Postcode':
                        $leadData['cf_979'] = $value;
                        break;
                    case 'Destination City':
                        $leadData['cf_973'] = $value;
                        break;
                    case 'Approximate Moving Date':
                        // ISO date → YYYY-MM-DD
                        if (preg_match('/^(\d{4}-\d{2}-\d{2})/', $value, $m)) {
                            $leadData['cf_1192'] = $m[1];
                        }
                        break;
                    case 'Size of move':
                        $descParts[] = 'Taille: ' . $value;
                        break;
                    case 'List of items to be shipped':
                        $leadData['cf_1307'] = $value;  // Volume (m³)
                        break;
                    case 'Who is paying for your move?':
                        if ($value !== 'Myself') {
                            $descParts[] = 'Payé par: ' . $value;
                        }
                        break;
                    case 'Destination Country':
                        // Already handled via Country column, but store if different
                        break;
                }
            }
        }

        if (!empty($descParts)) {
            $leadData['description'] = implode("\n", $descParts);
        }

        return $leadData;
    }

    /**
     * Get all existing lead emails for duplicate detection
     */
    private function getExistingEmails() {
        $db = PearDatabase::getInstance();
        $result = $db->pquery(
            "SELECT LOWER(email) as email FROM vtiger_leaddetails
             INNER JOIN vtiger_crmentity ON vtiger_leaddetails.leadid = vtiger_crmentity.crmid
             WHERE vtiger_crmentity.deleted = 0 AND email IS NOT NULL AND email != ''",
            []
        );

        $emails = [];
        while ($row = $db->fetchByAssoc($result)) {
            $emails[$row['email']] = true;
        }
        return $emails;
    }

    /**
     * Create a lead record in VTiger
     */
    private function createLead($leadData, $userId) {
        $recordModel = Vtiger_Record_Model::getCleanInstance('Leads');

        $recordModel->set('lastname', $leadData['lastname'] ?? 'Inconnu');
        $recordModel->set('firstname', $leadData['firstname'] ?? '');
        $recordModel->set('email', $leadData['email'] ?? '');
        $recordModel->set('phone', $leadData['phone'] ?? '');
        $recordModel->set('mobile', $leadData['mobile'] ?? '');
        $recordModel->set('company', $leadData['company'] ?? '');
        $recordModel->set('designation', $leadData['designation'] ?? '');
        $recordModel->set('lane', $leadData['lane'] ?? '');
        $recordModel->set('city', $leadData['city'] ?? '');
        $recordModel->set('code', $leadData['code'] ?? '');
        $recordModel->set('country', $leadData['country'] ?? 'France');
        $recordModel->set('description', $leadData['description'] ?? '');
        $recordModel->set('leadsource', $leadData['leadsource'] ?? 'movehub');
        $recordModel->set('leadstatus', $leadData['leadstatus'] ?? 'New');
        $recordModel->set('assigned_user_id', $userId);

        // Custom fields
        if (!empty($leadData['cf_975'])) $recordModel->set('cf_975', $leadData['cf_975']);
        if (!empty($leadData['cf_973'])) $recordModel->set('cf_973', $leadData['cf_973']);
        if (!empty($leadData['cf_979'])) $recordModel->set('cf_979', $leadData['cf_979']);
        if (!empty($leadData['cf_977'])) $recordModel->set('cf_977', $leadData['cf_977']);
        if (!empty($leadData['cf_1192'])) $recordModel->set('cf_1192', $leadData['cf_1192']);
        if (!empty($leadData['cf_1307'])) $recordModel->set('cf_1307', $leadData['cf_1307']);

        $recordModel->save();

        $leadId = $recordModel->getId();
        if (empty($leadId)) {
            throw new Exception('Échec de la création du lead');
        }

        return $leadId;
    }
}
