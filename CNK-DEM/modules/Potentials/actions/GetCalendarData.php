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
		// Un seul événement par ODM qui s'étend de chargement à livraison
		$soQuery = "SELECT so.salesorderid, so.salesorder_no, so.subject, so.sostatus, so.contactid,
					so.prestataire,
					potcf.cf_1043 as date_chargement,
					potcf.cf_1049 as date_livraison,
					potcf.cf_955 as adresse_chargement,
					potcf.cf_957 as adresse_livraison,
					potcf.cf_933 as ville_chargement,
					potcf.cf_949 as ville_livraison,
					potcf.cf_935 as cp_chargement,
					potcf.cf_951 as cp_livraison,
					potcf.cf_1259 as volume_final,
					pot.potentialid, pot.potentialname,
					c.firstname, c.lastname,
					v.vendorname as prestataire_name
					FROM vtiger_salesorder so
					INNER JOIN vtiger_crmentity ce ON ce.crmid = so.salesorderid
					LEFT JOIN vtiger_potential pot ON pot.potentialid = so.potentialid
					LEFT JOIN vtiger_potentialscf potcf ON potcf.potentialid = pot.potentialid
					LEFT JOIN vtiger_contactdetails c ON c.contactid = so.contactid
					LEFT JOIN vtiger_vendor v ON v.vendorid = so.prestataire
					WHERE ce.deleted = 0
					AND so.sostatus NOT IN ('Cancelled')
					AND (potcf.cf_1043 IS NOT NULL OR potcf.cf_1049 IS NOT NULL)
					ORDER BY potcf.cf_1043 ASC, potcf.cf_1049 ASC";

		$result = $db->pquery($soQuery, []);
		while ($row = $db->fetchByAssoc($result)) {
			$dateChargement = $row['date_chargement'];
			$dateLivraison = $row['date_livraison'];
			$hasChargement = !empty($dateChargement) && $dateChargement != '0000-00-00';
			$hasLivraison = !empty($dateLivraison) && $dateLivraison != '0000-00-00';
			if (!$hasChargement && !$hasLivraison) continue;

			$hasPrestataire = !empty($row['prestataire']) && intval($row['prestataire']) > 0;
			$villeChargement = html_entity_decode($row['ville_chargement'] ?? '', ENT_QUOTES, 'UTF-8');
			$villeLivraison = html_entity_decode($row['ville_livraison'] ?? '', ENT_QUOTES, 'UTF-8');
			$cpChargement = $row['cp_chargement'] ?? '';
			$cpLivraison = $row['cp_livraison'] ?? '';
			$volumeFinal = $row['volume_final'] ?? '';
			$prestataireName = html_entity_decode($row['prestataire_name'] ?? '', ENT_QUOTES, 'UTF-8');
			$clientName = html_entity_decode(trim(($row['firstname'] ?? '') . ' ' . ($row['lastname'] ?? '')), ENT_QUOTES, 'UTF-8');
			$potentialName = html_entity_decode($row['potentialname'] ?? '', ENT_QUOTES, 'UTF-8');

			// Déterminer start/end pour l'événement multi-jours
			$start = $hasChargement ? $dateChargement : $dateLivraison;
			// FullCalendar v3 : end est exclusif pour les all-day events, donc +1 jour
			if ($hasLivraison) {
				$endDate = new DateTime($dateLivraison);
				$endDate->modify('+1 day');
				$end = $endDate->format('Y-m-d');
			} elseif ($hasChargement) {
				$endDate = new DateTime($dateChargement);
				$endDate->modify('+1 day');
				$end = $endDate->format('Y-m-d');
			}

			// Titre compact : Nom | Volume | CP Ville → CP Ville | Prestataire
			$titleParts = [$potentialName ?: ($clientName ?: 'ODM')];
			if (!empty($volumeFinal)) $titleParts[] = $volumeFinal . 'm³';
			$from = trim($cpChargement . ' ' . $villeChargement);
			$to = trim($cpLivraison . ' ' . $villeLivraison);
			if ($from || $to) $titleParts[] = ($from ?: '?') . ' → ' . ($to ?: '?');
			if (!empty($prestataireName)) $titleParts[] = $prestataireName;
			$title = implode(' | ', $titleParts);

			$events[] = [
				'id' => 'so_' . $row['salesorderid'],
				'title' => $title,
				'start' => $start,
				'end' => $end,
				'backgroundColor' => $hasPrestataire ? '#16a085' : '#e74c3c',
				'borderColor' => $hasPrestataire ? '#138d75' : '#c0392b',
				'type' => 'odm',
				'record_id' => $row['salesorderid'],
				'potential_id' => $row['potentialid'],
				'contact_id' => $row['contactid'],
				'so_no' => $row['salesorder_no'],
				'client' => $clientName,
				'potential_name' => $potentialName,
				'ville_chargement' => $villeChargement,
				'ville_livraison' => $villeLivraison,
				'cp_chargement' => $cpChargement,
				'cp_livraison' => $cpLivraison,
				'volume_final' => $volumeFinal,
				'prestataire_name' => $prestataireName,
				'has_prestataire' => $hasPrestataire,
				'date_chargement' => $hasChargement ? $dateChargement : '',
				'date_livraison' => $hasLivraison ? $dateLivraison : ''
			];
		}

		header('Content-Type: application/json');
		echo json_encode($events);
	}
}
