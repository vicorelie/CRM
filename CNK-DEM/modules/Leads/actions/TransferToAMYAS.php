<?php
/*+**********************************************************************************
 * Action personnalisée pour transférer des prospects de CNK-DEM vers EXPERT-DEM (AMYAS)
 ************************************************************************************/

class Leads_TransferToAMYAS_Action extends Vtiger_Action_Controller 
{
    const EXPERT_DEM_API_URL = 'https://crm.expertdem.com/api_create_lead.php';
    const EXPERT_DEM_API_KEY = '5b7371c8da6d17e52e3f92994da8553dd9c8006927eb725f296c930483724c4f';
    
    public function checkPermission(Vtiger_Request $request) 
    {
        $moduleName = $request->getModule();
        $moduleModel = Vtiger_Module_Model::getInstance($moduleName);
        
        $currentUserPrivilegesModel = Users_Privileges_Model::getCurrentUserPrivilegesModel();
        if(!$currentUserPrivilegesModel->hasModuleActionPermission($moduleModel->getId(), 'DetailView')) {
            throw new AppException(vtranslate('LBL_PERMISSION_DENIED'));
        }
    }
    
    public function process(Vtiger_Request $request) 
    {
        // Log de debug au début
        $logFile = '/var/www/CNK-DEM/logs/transfer_debug.log';
        $logEntry = "[" . date('Y-m-d H:i:s') . "] TransferToAMYAS: Début du processus\n";
        file_put_contents($logFile, $logEntry, FILE_APPEND);
        
        $logEntry = "[" . date('Y-m-d H:i:s') . "] Request data: " . print_r($_REQUEST, true) . "\n";
        file_put_contents($logFile, $logEntry, FILE_APPEND);
        
        $selectedIds = $request->get('selected_ids');
        $selectAll = $request->get('selectAll');
        $excludedIds = $request->get('excludedIds');
        
        $logEntry = "[" . date('Y-m-d H:i:s') . "] selectedIds = " . print_r($selectedIds, true) . "\n";
        file_put_contents($logFile, $logEntry, FILE_APPEND);
        
        if (!$selectedIds || !is_array($selectedIds)) {
            $logEntry = "[" . date('Y-m-d H:i:s') . "] Erreur: Aucun prospect sélectionné\n";
            file_put_contents($logFile, $logEntry, FILE_APPEND);
            
            $response = array(
                'success' => false,
                'error' => 'Aucun prospect sélectionné',
                'message' => 'Erreur : Aucun prospect sélectionné'
            );
            $this->sendResponse($response);
            return;
        }
        
        $logEntry = "[" . date('Y-m-d H:i:s') . "] IDs valides reçus, début du traitement...\n";
        file_put_contents($logFile, $logEntry, FILE_APPEND);
        
        $results = array(
            'success' => array(),
            'errors' => array()
        );
        
        $moduleName = $request->getModule();
        $moduleModel = Vtiger_Module_Model::getInstance($moduleName);
        
        foreach ($selectedIds as $recordId) {
            $logEntry = "[" . date('Y-m-d H:i:s') . "] Traitement du prospect ID: $recordId\n";
            file_put_contents($logFile, $logEntry, FILE_APPEND);
            
            try {
                // Récupérer les données du prospect
                $leadRecord = Vtiger_Record_Model::getInstanceById($recordId, $moduleName);
                
                $logEntry = "[" . date('Y-m-d H:i:s') . "] Prospect chargé: " . ($leadRecord ? "OUI" : "NON") . "\n";
                file_put_contents($logFile, $logEntry, FILE_APPEND);
                
                if (!$leadRecord) {
                    $results['errors'][] = array(
                        'leadId' => $recordId,
                        'error' => 'Prospect non trouvé'
                    );
                    continue;
                }
                
                // Préparer les données pour l'API EXPERT-DEM
                $logEntry = "[" . date('Y-m-d H:i:s') . "] Préparation des données...\n";
                file_put_contents($logFile, $logEntry, FILE_APPEND);
                
                $leadData = $this->prepareLeedDataForTransfer($leadRecord);
                
                $logEntry = "[" . date('Y-m-d H:i:s') . "] Données préparées: " . print_r($leadData, true) . "\n";
                file_put_contents($logFile, $logEntry, FILE_APPEND);
                
                // Envoyer vers EXPERT-DEM
                $logEntry = "[" . date('Y-m-d H:i:s') . "] Envoi vers EXPERT-DEM...\n";
                file_put_contents($logFile, $logEntry, FILE_APPEND);
                
                $transferResult = $this->sendToExpertDEM($leadData, $recordId);
                
                $logEntry = "[" . date('Y-m-d H:i:s') . "] Résultat transfert: " . print_r($transferResult, true) . "\n";
                file_put_contents($logFile, $logEntry, FILE_APPEND);
                
                if ($transferResult['success']) {
                    $results['success'][] = array(
                        'leadId' => $recordId,
                        'expertDemId' => $transferResult['expert_dem_id'],
                        'name' => $leadData['lastname'] . ' ' . $leadData['firstname']
                    );
                    
                    // Marquer le prospect comme transféré dans CNK-DEM
                    $this->markAsTransferred($leadRecord, $transferResult['expert_dem_id']);
                    
                } else {
                    $results['errors'][] = array(
                        'leadId' => $recordId,
                        'error' => $transferResult['error']
                    );
                }
                
            } catch (Exception $e) {
                $logEntry = "[" . date('Y-m-d H:i:s') . "] EXCEPTION: " . $e->getMessage() . "\n";
                $logEntry .= "[" . date('Y-m-d H:i:s') . "] STACK: " . $e->getTraceAsString() . "\n";
                file_put_contents($logFile, $logEntry, FILE_APPEND);
                
                $results['errors'][] = array(
                    'leadId' => $recordId,
                    'error' => $e->getMessage()
                );
            }
        }
        
        // Préparer la réponse finale
        $logEntry = "[" . date('Y-m-d H:i:s') . "] Préparation de la réponse finale...\n";
        file_put_contents($logFile, $logEntry, FILE_APPEND);
        
        $response = array(
            'success' => true,
            'transferred' => count($results['success']),
            'errors' => count($results['errors']),
            'results' => $results,
            'message' => 'Transfert réussi ! ' . count($results['success']) . ' prospect(s) transféré(s) vers AMYAS.'
        );
        
        $logEntry = "[" . date('Y-m-d H:i:s') . "] Réponse finale: " . print_r($response, true) . "\n";
        file_put_contents($logFile, $logEntry, FILE_APPEND);
        
        // Log des résultats
        $this->logTransferResults($response);
        
        $logEntry = "[" . date('Y-m-d H:i:s') . "] Envoi de la réponse...\n";
        file_put_contents($logFile, $logEntry, FILE_APPEND);
        
        $this->sendResponse($response);
    }
    
    /**
     * Prépare les données du prospect pour le transfert vers EXPERT-DEM
     */
    private function prepareLeedDataForTransfer($leadRecord) 
    {
        $data = array();
        
        // Champs de base
        $data['lastname'] = $leadRecord->get('lastname') ?: 'Inconnu';
        $data['firstname'] = $leadRecord->get('firstname') ?: '';
        $data['email'] = $leadRecord->get('email') ?: '';
        $data['phone'] = $leadRecord->get('phone') ?: '';
        $data['mobile'] = $leadRecord->get('mobile') ?: '';
        $data['company'] = $leadRecord->get('company') ?: '';
        $data['designation'] = $leadRecord->get('designation') ?: '';
        
        // Adresse de départ
        $data['address'] = $leadRecord->get('lane') ?: '';
        $data['city'] = $leadRecord->get('city') ?: '';
        $data['postalcode'] = $leadRecord->get('code') ?: '';
        $data['country'] = $leadRecord->get('country') ?: 'France';
        
        // Description
        $data['description'] = $leadRecord->get('description') ?: '';
        
        // Champs personnalisés de déménagement (si disponibles)
        $data['adresse_arrivee'] = $leadRecord->get('cf_975') ?: '';
        $data['ville_arrivee'] = $leadRecord->get('cf_973') ?: '';
        $data['cp_arrivee'] = $leadRecord->get('cf_979') ?: '';
        $data['departement_arrivee'] = $leadRecord->get('cf_977') ?: '';
        $data['date_demenagement'] = $leadRecord->get('cf_1192') ?: '';
        $data['volume'] = $leadRecord->get('cf_1307') ?: '';
        
        // Méta-informations
        $data['leadsource'] = 'Transfert CNK-DEM';
        $data['leadstatus'] = 'New';
        
        // Si pas de mobile, utiliser le phone
        if (empty($data['mobile']) && !empty($data['phone'])) {
            $data['mobile'] = $data['phone'];
        }
        
        // Décoder les entités HTML et nettoyer les valeurs
        $data = array_map(function($value) {
            if (is_string($value)) {
                // Décoder les entités HTML comme &eacute; → é
                $value = html_entity_decode($value, ENT_QUOTES | ENT_HTML401, 'UTF-8');
                // Nettoyer les espaces
                $value = trim($value);
            }
            return $value;
        }, $data);
        
        // Nettoyer les valeurs vides
        $data = array_filter($data, function($value) {
            return $value !== '' && $value !== null;
        });
        
        return $data;
    }
    
    /**
     * Envoie les données vers l'API EXPERT-DEM
     */
    private function sendToExpertDEM($leadData, $originalLeadId) 
    {
        $ch = curl_init();
        
        // S'assurer que l'encodage JSON est correct
        $jsonData = json_encode($leadData, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        
        curl_setopt_array($ch, array(
            CURLOPT_URL => self::EXPERT_DEM_API_URL,
            CURLOPT_POST => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 30,
            CURLOPT_HTTPHEADER => array(
                'X-API-Key: ' . self::EXPERT_DEM_API_KEY,
                'Content-Type: application/json; charset=UTF-8'
            ),
            CURLOPT_POSTFIELDS => $jsonData
        ));
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);
        
        if ($curlError) {
            return array(
                'success' => false,
                'error' => 'Erreur réseau: ' . $curlError
            );
        }
        
        if ($httpCode !== 201 && $httpCode !== 200) {
            return array(
                'success' => false,
                'error' => 'Erreur HTTP ' . $httpCode . ': ' . $response
            );
        }
        
        $result = json_decode($response, true);
        
        if (!$result) {
            return array(
                'success' => false,
                'error' => 'Réponse JSON invalide'
            );
        }
        
        if (!$result['success']) {
            return array(
                'success' => false,
                'error' => $result['error'] ?: 'Erreur inconnue'
            );
        }
        
        return array(
            'success' => true,
            'expert_dem_id' => $result['lead_id'],
            'expert_dem_no' => $result['lead_no']
        );
    }
    
    /**
     * Marque le prospect comme transféré dans CNK-DEM
     */
    private function markAsTransferred($leadRecord, $expertDemId) 
    {
        try {
            // Modifier le statut
            $leadRecord->set('leadstatus', 'Transféré');
            
            // Ajouter une note dans la description
            $currentDescription = $leadRecord->get('description') ?: '';
            $transferNote = "\n[" . date('Y-m-d H:i:s') . "] Prospect transféré vers AMYAS (EXPERT-DEM)\n";
            $transferNote .= "ID EXPERT-DEM: " . $expertDemId . "\n";
            
            $newDescription = $transferNote;
            if (!empty($currentDescription)) {
                $newDescription .= "\n--- Description originale ---\n" . $currentDescription;
            }
            
            $leadRecord->set('description', $newDescription);
            
            // Sauvegarder
            $leadRecord->save();
            
        } catch (Exception $e) {
            // Log l'erreur mais ne pas faire échouer le transfert
            error_log("Erreur lors du marquage du prospect transféré: " . $e->getMessage());
        }
    }
    
    /**
     * Log les résultats du transfert
     */
    private function logTransferResults($response) 
    {
        $logFile = 'logs/transfer_to_amyas.log';
        $logDir = dirname($logFile);
        
        if (!is_dir($logDir)) {
            @mkdir($logDir, 0755, true);
        }
        
        $logEntry = array(
            'timestamp' => date('Y-m-d H:i:s'),
            'user_id' => Users_Record_Model::getCurrentUserModel()->getId(),
            'transferred' => $response['transferred'],
            'errors' => $response['errors'],
            'details' => $response['results']
        );
        
        @file_put_contents(
            $logFile, 
            json_encode($logEntry, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n", 
            FILE_APPEND
        );
    }
    
    /**
     * Envoie la réponse JSON
     */
    private function sendResponse($response) 
    {
        header('Content-Type: application/json');
        echo json_encode($response);
        exit;
    }
}