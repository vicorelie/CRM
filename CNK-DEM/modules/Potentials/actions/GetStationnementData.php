<?php
/*+***********************************************************************************
 * Récupère les affaires avec demande de stationnement
 *************************************************************************************/

class Potentials_GetStationnementData_Action extends Vtiger_Action_Controller {

	public function checkPermission(Vtiger_Request $request) {
		return true;
	}

	public function process(Vtiger_Request $request) {
		$db = PearDatabase::getInstance();
		$affaires = [];
		$events = [];

		$sql = "SELECT p.potentialid, p.potentialname,
				pcf.cf_1043 as date_chargement,
				pcf.cf_1049 as date_livraison,
				pcf.cf_1091 as demande_chargement_1,
				pcf.cf_1089 as demande_livraison_1,
				pcf.cf_1367 as demande_chargement_2,
				pcf.cf_1385 as demande_livraison_2,
				pcf.cf_1376 as demande_chargement_3,
				pcf.cf_1394 as demande_livraison_3,
				pcf.cf_1397 as statut,
				pcf.cf_933 as ville_chargement,
				pcf.cf_935 as ville_livraison
				FROM vtiger_potential p
				INNER JOIN vtiger_crmentity ce ON ce.crmid = p.potentialid
				INNER JOIN vtiger_potentialscf pcf ON pcf.potentialid = p.potentialid
				WHERE ce.deleted = 0
				AND pcf.cf_1164 = '1'
				AND (pcf.cf_1091 = '1' OR pcf.cf_1089 = '1' OR
					 pcf.cf_1367 = '1' OR pcf.cf_1385 = '1' OR
					 pcf.cf_1376 = '1' OR pcf.cf_1394 = '1')
				ORDER BY p.potentialname";

		$result = $db->pquery($sql, []);

		while ($row = $db->fetchByAssoc($result)) {
			$potentialId = $row['potentialid'];
			$potentialName = html_entity_decode($row['potentialname'] ?? '', ENT_QUOTES, 'UTF-8');
			$statutRaw = $row['statut'] ?? '';
			$statut = !empty($statutRaw) ? html_entity_decode($statutRaw, ENT_QUOTES, 'UTF-8') : 'Non défini';

			// Couleur selon le statut
			$color = '#95a5a6'; // Gris (Non défini)
			if ($statut === 'En attente') {
				$color = '#f39c12'; // Orange
			} elseif ($statut === 'Validé') {
				$color = '#27ae60'; // Vert
			} elseif ($statut === 'Refusé') {
				$color = '#e74c3c'; // Rouge
			}

			// Préparer les demandes
			$demandes = [];
			$hasChargement = ($row['demande_chargement_1'] === '1' ||
							  $row['demande_chargement_2'] === '1' ||
							  $row['demande_chargement_3'] === '1');
			$hasLivraison = ($row['demande_livraison_1'] === '1' ||
							 $row['demande_livraison_2'] === '1' ||
							 $row['demande_livraison_3'] === '1');

			if ($hasChargement) {
				$demandes[] = [
					'type' => 'chargement',
					'date' => $row['date_chargement'],
					'ville' => html_entity_decode($row['ville_chargement'] ?? '', ENT_QUOTES, 'UTF-8')
				];
			}

			if ($hasLivraison) {
				$demandes[] = [
					'type' => 'livraison',
					'date' => $row['date_livraison'],
					'ville' => html_entity_decode($row['ville_livraison'] ?? '', ENT_QUOTES, 'UTF-8')
				];
			}

			$affaires[] = [
				'potentialId' => $potentialId,
				'potentialName' => $potentialName,
				'statut' => $statut,
				'color' => $color,
				'demandes' => $demandes
			];

			// Créer des événements pour le calendrier (seulement si date définie)
			if ($hasChargement && !empty($row['date_chargement']) && $row['date_chargement'] != '0000-00-00') {
				$events[] = [
					'id' => $potentialId . '_chargement',
					'title' => $potentialName . ' (Chargement)',
					'start' => $row['date_chargement'],
					'backgroundColor' => $color,
					'borderColor' => $color,
					'potentialId' => $potentialId,
					'type' => 'chargement',
					'statut' => $statut,
					'ville' => html_entity_decode($row['ville_chargement'] ?? '', ENT_QUOTES, 'UTF-8')
				];
			}

			if ($hasLivraison && !empty($row['date_livraison']) && $row['date_livraison'] != '0000-00-00') {
				$events[] = [
					'id' => $potentialId . '_livraison',
					'title' => $potentialName . ' (Livraison)',
					'start' => $row['date_livraison'],
					'backgroundColor' => $color,
					'borderColor' => $color,
					'potentialId' => $potentialId,
					'type' => 'livraison',
					'statut' => $statut,
					'ville' => html_entity_decode($row['ville_livraison'] ?? '', ENT_QUOTES, 'UTF-8')
				];
			}
		}

		$responseData = [
			'success' => true,
			'events' => $events,
			'affaires' => $affaires
		];

		header('Content-Type: application/json');
		echo json_encode($responseData);
	}
}
