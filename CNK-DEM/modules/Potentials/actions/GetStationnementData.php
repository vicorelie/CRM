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
				pcf.cf_933 as ville_chargement,
				pcf.cf_935 as ville_livraison
				FROM vtiger_potential p
				INNER JOIN vtiger_crmentity ce ON ce.crmid = p.potentialid
				INNER JOIN vtiger_potentialscf pcf ON pcf.potentialid = p.potentialid
				WHERE ce.deleted = 0
				AND pcf.cf_1164 = '1'
				AND (pcf.cf_1091 IN ('Oui','En attente','Validé','Refusé')
				  OR pcf.cf_1089 IN ('Oui','En attente','Validé','Refusé')
				  OR pcf.cf_1367 IN ('Oui','En attente','Validé','Refusé')
				  OR pcf.cf_1385 IN ('Oui','En attente','Validé','Refusé')
				  OR pcf.cf_1376 IN ('Oui','En attente','Validé','Refusé')
				  OR pcf.cf_1394 IN ('Oui','En attente','Validé','Refusé'))
				ORDER BY p.potentialname";

		$result = $db->pquery($sql, []);

		while ($row = $db->fetchByAssoc($result, -1, false)) {
			$potentialId = $row['potentialid'];
			$potentialName = $row['potentialname'] ?? '';

			// Collecter les demandes individuelles avec leur propre statut
			$demandes = [];

			// Chargement: cf_1091, cf_1367, cf_1376
			$chargementFields = [
				'demande_chargement_1' => 'Chargement 1',
				'demande_chargement_2' => 'Chargement 2',
				'demande_chargement_3' => 'Chargement 3',
			];
			foreach ($chargementFields as $field => $label) {
				$val = $row[$field] ?? '';
				if (in_array($val, ['Oui', 'En attente', 'Validé', 'Refusé'])) {
					$demandes[] = [
						'type' => 'chargement',
						'label' => $label,
						'date' => $row['date_chargement'],
						'ville' => $row['ville_chargement'] ?? '',
						'statut' => $this->resolveStatut($val),
						'color' => $this->statutColor($this->resolveStatut($val))
					];
				}
			}

			// Livraison: cf_1089, cf_1385, cf_1394
			$livraisonFields = [
				'demande_livraison_1' => 'Livraison 1',
				'demande_livraison_2' => 'Livraison 2',
				'demande_livraison_3' => 'Livraison 3',
			];
			foreach ($livraisonFields as $field => $label) {
				$val = $row[$field] ?? '';
				if (in_array($val, ['Oui', 'En attente', 'Validé', 'Refusé'])) {
					$demandes[] = [
						'type' => 'livraison',
						'label' => $label,
						'date' => $row['date_livraison'],
						'ville' => $row['ville_livraison'] ?? '',
						'statut' => $this->resolveStatut($val),
						'color' => $this->statutColor($this->resolveStatut($val))
					];
				}
			}

			if (empty($demandes)) continue;

			// Statut global = pire statut parmi les demandes (En attente > Refusé > Validé)
			$globalStatut = $this->worstStatut($demandes);
			$globalColor = $this->statutColor($globalStatut);

			$affaires[] = [
				'potentialId' => $potentialId,
				'potentialName' => $potentialName,
				'statut' => $globalStatut,
				'color' => $globalColor,
				'demandes' => $demandes
			];

			// Créer des événements calendrier par demande
			foreach ($demandes as $demande) {
				$date = $demande['date'];
				if (!empty($date) && $date != '0000-00-00') {
					$events[] = [
						'id' => $potentialId . '_' . str_replace(' ', '_', strtolower($demande['label'])),
						'title' => $potentialName . ' (' . $demande['label'] . ')',
						'start' => $date,
						'backgroundColor' => $demande['color'],
						'borderColor' => $demande['color'],
						'potentialId' => $potentialId,
						'type' => $demande['type'],
						'statut' => $demande['statut'],
						'ville' => $demande['ville']
					];
				}
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

	/**
	 * Résout le statut affiché : "Oui" → "Non défini" (le commercial a demandé, la logistique n'a pas encore traité)
	 */
	private function resolveStatut($val) {
		if ($val === 'Oui') return 'Non défini';
		return $val; // En attente, Validé, Refusé
	}

	/**
	 * Couleur selon le statut
	 */
	private function statutColor($statut) {
		switch ($statut) {
			case 'En attente': return '#f39c12';
			case 'Validé': return '#27ae60';
			case 'Refusé': return '#e74c3c';
			default: return '#95a5a6';
		}
	}

	/**
	 * Retourne le pire statut parmi les demandes (priorité : En attente > Refusé > Validé)
	 */
	private function worstStatut($demandes) {
		$hasNonDefini = false;
		$hasEnAttente = false;
		$hasRefuse = false;
		$hasValide = false;
		foreach ($demandes as $d) {
			if ($d['statut'] === 'Non défini') $hasNonDefini = true;
			if ($d['statut'] === 'En attente') $hasEnAttente = true;
			if ($d['statut'] === 'Refusé') $hasRefuse = true;
			if ($d['statut'] === 'Validé') $hasValide = true;
		}
		if ($hasNonDefini) return 'Non défini';
		if ($hasEnAttente) return 'En attente';
		if ($hasRefuse) return 'Refusé';
		if ($hasValide) return 'Validé';
		return 'Non défini';
	}
}
