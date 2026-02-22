<?php
/*+***********************************************************************************
 * Récupère les données calendrier pour Devis et ODM (dates de déménagement)
 *************************************************************************************/

class Potentials_GetCalendarData_Action extends Vtiger_Action_Controller {

	public function checkPermission(Vtiger_Request $request) {
		return true;
	}

	public function process(Vtiger_Request $request) {
		$db = PearDatabase::getInstance();
		$currentUser = Users_Record_Model::getCurrentUserModel();

		$events = [];

		// Récupérer les Devis validés (cf_1162 = '1') avec date de déménagement
		$quotesQuery = "SELECT q.quoteid, q.quote_no, q.subject, q.quotestage, q.contactid,
						potcf.cf_1043 as date_chargement,
						potcf.cf_1049 as date_livraison,
						potcf.cf_955 as adresse_chargement,
						potcf.cf_957 as adresse_livraison,
						potcf.cf_933 as ville_chargement,
						potcf.cf_949 as ville_livraison,
						pot.potentialid, pot.potentialname,
						c.firstname, c.lastname
						FROM vtiger_quotes q
						INNER JOIN vtiger_crmentity ce ON ce.crmid = q.quoteid
						INNER JOIN vtiger_quotescf qcf ON qcf.quoteid = q.quoteid
						LEFT JOIN vtiger_potential pot ON pot.potentialid = q.potentialid
						LEFT JOIN vtiger_potentialscf potcf ON potcf.potentialid = pot.potentialid
						LEFT JOIN vtiger_contactdetails c ON c.contactid = q.contactid
						WHERE ce.deleted = 0
						AND qcf.cf_1162 = '1'
						AND (potcf.cf_1043 IS NOT NULL OR potcf.cf_1049 IS NOT NULL)
						ORDER BY potcf.cf_1043 ASC, potcf.cf_1049 ASC";

		$result = $db->pquery($quotesQuery, []);
		while ($row = $db->fetchByAssoc($result)) {
			$dateChargement = $row['date_chargement'];
			$dateLivraison = $row['date_livraison'];
			$clientName = html_entity_decode(trim(($row['firstname'] ?? '') . ' ' . ($row['lastname'] ?? '')), ENT_QUOTES, 'UTF-8');
			$row['ville_chargement'] = html_entity_decode($row['ville_chargement'] ?? '', ENT_QUOTES, 'UTF-8');
			$row['ville_livraison'] = html_entity_decode($row['ville_livraison'] ?? '', ENT_QUOTES, 'UTF-8');
			$row['adresse_chargement'] = html_entity_decode($row['adresse_chargement'] ?? '', ENT_QUOTES, 'UTF-8');
			$row['adresse_livraison'] = html_entity_decode($row['adresse_livraison'] ?? '', ENT_QUOTES, 'UTF-8');

			if (!empty($dateChargement) && $dateChargement != '0000-00-00') {
				$events[] = [
					'id' => 'quote_c_' . $row['quoteid'],
					'title' => 'CRG-DEV- ' . ($clientName ?: 'Client') . ' (' . $row['quote_no'] . ')',
					'start' => $dateChargement,
					'backgroundColor' => '#9b59b6',
					'borderColor' => '#8e44ad',
					'type' => 'devis_chargement',
					'record_id' => $row['quoteid'],
					'potential_id' => $row['potentialid'],
					'contact_id' => $row['contactid'],
					'quote_no' => $row['quote_no'],
					'client' => $clientName,
					'ville' => $row['ville_chargement'],
					'adresse' => $row['adresse_chargement']
				];
			}

			if (!empty($dateLivraison) && $dateLivraison != '0000-00-00') {
				$events[] = [
					'id' => 'quote_l_' . $row['quoteid'],
					'title' => 'LVR-DEV- ' . ($clientName ?: 'Client') . ' (' . $row['quote_no'] . ')',
					'start' => $dateLivraison,
					'backgroundColor' => '#3498db',
					'borderColor' => '#2980b9',
					'type' => 'devis_livraison',
					'record_id' => $row['quoteid'],
					'potential_id' => $row['potentialid'],
					'contact_id' => $row['contactid'],
					'quote_no' => $row['quote_no'],
					'client' => $clientName,
					'ville' => $row['ville_livraison'],
					'adresse' => $row['adresse_livraison']
				];
			}
		}

		// Récupérer les ODM (Sales Orders) avec date de déménagement
		$soQuery = "SELECT so.salesorderid, so.salesorder_no, so.subject, so.sostatus, so.contactid,
					potcf.cf_1043 as date_chargement,
					potcf.cf_1049 as date_livraison,
					potcf.cf_955 as adresse_chargement,
					potcf.cf_957 as adresse_livraison,
					potcf.cf_933 as ville_chargement,
					potcf.cf_949 as ville_livraison,
					pot.potentialid, pot.potentialname,
					c.firstname, c.lastname
					FROM vtiger_salesorder so
					INNER JOIN vtiger_crmentity ce ON ce.crmid = so.salesorderid
					LEFT JOIN vtiger_potential pot ON pot.potentialid = so.potentialid
					LEFT JOIN vtiger_potentialscf potcf ON potcf.potentialid = pot.potentialid
					LEFT JOIN vtiger_contactdetails c ON c.contactid = so.contactid
					WHERE ce.deleted = 0
					AND so.sostatus NOT IN ('Cancelled')
					AND (potcf.cf_1043 IS NOT NULL OR potcf.cf_1049 IS NOT NULL)
					ORDER BY potcf.cf_1043 ASC, potcf.cf_1049 ASC";

		$result = $db->pquery($soQuery, []);
		while ($row = $db->fetchByAssoc($result)) {
			$dateChargement = $row['date_chargement'];
			$dateLivraison = $row['date_livraison'];
			$row['ville_chargement'] = html_entity_decode($row['ville_chargement'] ?? '', ENT_QUOTES, 'UTF-8');
			$row['ville_livraison'] = html_entity_decode($row['ville_livraison'] ?? '', ENT_QUOTES, 'UTF-8');
			$row['adresse_chargement'] = html_entity_decode($row['adresse_chargement'] ?? '', ENT_QUOTES, 'UTF-8');
			$row['adresse_livraison'] = html_entity_decode($row['adresse_livraison'] ?? '', ENT_QUOTES, 'UTF-8');
			$clientName = html_entity_decode(trim(($row['firstname'] ?? '') . ' ' . ($row['lastname'] ?? '')), ENT_QUOTES, 'UTF-8');

			if (!empty($dateChargement) && $dateChargement != '0000-00-00') {
				$events[] = [
					'id' => 'so_c_' . $row['salesorderid'],
					'title' => 'CRG-ODM- ' . ($clientName ?: 'Client') . ' (' . $row['salesorder_no'] . ')',
					'start' => $dateChargement,
					'backgroundColor' => '#16a085',
					'borderColor' => '#138d75',
					'type' => 'odm_chargement',
					'record_id' => $row['salesorderid'],
					'potential_id' => $row['potentialid'],
					'contact_id' => $row['contactid'],
					'so_no' => $row['salesorder_no'],
					'client' => $clientName,
					'ville' => $row['ville_chargement'],
					'adresse' => $row['adresse_chargement']
				];
			}

			if (!empty($dateLivraison) && $dateLivraison != '0000-00-00') {
				$events[] = [
					'id' => 'so_l_' . $row['salesorderid'],
					'title' => 'LVR-ODM- ' . ($clientName ?: 'Client') . ' (' . $row['salesorder_no'] . ')',
					'start' => $dateLivraison,
					'backgroundColor' => '#e67e22',
					'borderColor' => '#d35400',
					'type' => 'odm_livraison',
					'record_id' => $row['salesorderid'],
					'potential_id' => $row['potentialid'],
					'contact_id' => $row['contactid'],
					'so_no' => $row['salesorder_no'],
					'client' => $clientName,
					'ville' => $row['ville_livraison'],
					'adresse' => $row['adresse_livraison']
				];
			}
		}

		header('Content-Type: application/json');
		echo json_encode($events);
	}
}
