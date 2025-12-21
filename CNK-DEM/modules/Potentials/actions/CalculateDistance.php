<?php
/*+***********************************************************************************
 * Action pour calculer la distance entre deux adresses
 *************************************************************************************/

class Potentials_CalculateDistance_Action extends Vtiger_Action_Controller {

    public function checkPermission(Vtiger_Request $request) {
        return true; // Permet l'accès
    }

    public function process(Vtiger_Request $request) {
        $origin = $request->get('origin');
        $destination = $request->get('destination');
        $recordId = $request->get('record');
        $distance = $request->get('distance'); // Distance déjà calculée
        $duration = $request->get('duration'); // Durée déjà calculée

        $response = array('success' => false);

        // Si la distance est déjà fournie, on sauvegarde directement
        if (!empty($distance) && !empty($recordId)) {
            try {
                $recordModel = Vtiger_Record_Model::getInstanceById($recordId, 'Potentials');
                $recordModel->set('mode', 'edit');
                $recordModel->set('cf_961', $distance); // Distance
                $recordModel->save();

                $response['success'] = true;
                $response['distance'] = $distance;
                $response['duration'] = $duration;
                $response['message'] = 'Distance sauvegardée avec succès';

                $responseObj = new Vtiger_Response();
                $responseObj->setResult($response);
                $responseObj->emit();
                return;
            } catch (Exception $e) {
                $response['error'] = $e->getMessage();
                $responseObj = new Vtiger_Response();
                $responseObj->setResult($response);
                $responseObj->emit();
                return;
            }
        }

        // Sinon, on calcule avec l'API Google Maps
        try {
            // Utiliser l'API Google Maps Distance Matrix (gratuite jusqu'à 2500 requêtes/jour)
            // Note: Vous devrez obtenir une clé API Google Maps et la configurer
            $apiKey = 'AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8'; // Remplacez par votre clé API

            $url = 'https://maps.googleapis.com/maps/api/distancematrix/json?origins=' .
                   urlencode($origin) .
                   '&destinations=' . urlencode($destination) .
                   '&mode=driving' .
                   '&language=fr' .
                   '&key=' . $apiKey;

            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $url);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
            $result = curl_exec($ch);
            curl_close($ch);

            $data = json_decode($result, true);

            if ($data['status'] == 'OK' && isset($data['rows'][0]['elements'][0])) {
                $element = $data['rows'][0]['elements'][0];

                if ($element['status'] == 'OK') {
                    $distanceMeters = $element['distance']['value'];
                    $distanceKm = round($distanceMeters / 1000, 1);
                    $duration = $element['duration']['text'];

                    $response['success'] = true;
                    $response['distance'] = $distanceKm;
                    $response['duration'] = $duration;
                    $response['distance_text'] = $element['distance']['text'];

                    // Sauvegarder la distance dans le CRM
                    if (!empty($recordId)) {
                        try {
                            $recordModel = Vtiger_Record_Model::getInstanceById($recordId, 'Potentials');
                            $recordModel->set('mode', 'edit');
                            $recordModel->set('cf_961', $distanceKm); // Distance
                            $recordModel->save();
                        } catch (Exception $e) {
                            // Continuer même si la sauvegarde échoue
                        }
                    }
                } else {
                    $response['error'] = 'Impossible de calculer l\'itinéraire';
                }
            } else {
                $response['error'] = 'Erreur API Google Maps: ' . $data['status'];
            }

        } catch (Exception $e) {
            $response['error'] = $e->getMessage();
        }

        $responseObj = new Vtiger_Response();
        $responseObj->setResult($response);
        $responseObj->emit();
    }
}
?>
