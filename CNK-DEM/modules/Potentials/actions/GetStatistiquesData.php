<?php

class Potentials_GetStatistiquesData_Action extends Vtiger_Action_Controller {

	function checkPermission(Vtiger_Request $request) {
		$moduleName = $request->getModule();
		$userPrivilegesModel = Users_Privileges_Model::getCurrentUserPrivilegesModel();
		$moduleModel = Vtiger_Module_Model::getInstance($moduleName);
		if (!$userPrivilegesModel->hasModulePermission($moduleModel->getId())) {
			throw new AppException(vtranslate('LBL_PERMISSION_DENIED'));
		}
		return true;
	}

	function process(Vtiger_Request $request) {
		$db = PearDatabase::getInstance();
		$currentUser = Users_Record_Model::getCurrentUserModel();
		$isAdmin = ($currentUser->get('is_admin') === 'on');
		$userId = $currentUser->getId();

		$year = intval($request->get('year'));
		if ($year < 2020 || $year > 2100) {
			$year = date('Y');
		}

		$month = intval($request->get('month'));
		if ($month < 0 || $month > 12) {
			$month = 0; // 0 = all months
		}

		$userFilter = $request->get('user_filter');
		// Non-admin can only see own data
		if (!$isAdmin) {
			$userFilter = 'me';
		}
		// Admin: 'all' = everyone, numeric = specific user, else = self
		$filterUserId = $userId;
		if ($isAdmin) {
			if ($userFilter === 'all') {
				$filterUserId = null;
			} else if (is_numeric($userFilter)) {
				$filterUserId = intval($userFilter);
			}
		}

		// Filter by Potential owner (not quote owner)
		$userCondition = '';
		$params = array($year);
		if ($filterUserId !== null) {
			$userCondition = ' AND ce_pot.smownerid = ?';
			$params[] = $filterUserId;
		}

		$monthCondition = '';
		if ($month > 0) {
			$monthCondition = ' AND MONTH(qcf.cf_1358) = ?';
			$params[] = $month;
		}

		// Monthly validated quotes (filtered by Potential assignee, by validation date)
		$sql = "SELECT DATE_FORMAT(qcf.cf_1358, '%Y-%m') AS month_key,
					COUNT(*) AS quote_count,
					COALESCE(SUM(q.pre_tax_total), 0) AS total_ht
				FROM vtiger_quotes q
				INNER JOIN vtiger_crmentity ce ON ce.crmid = q.quoteid
				INNER JOIN vtiger_quotescf qcf ON qcf.quoteid = q.quoteid
				LEFT JOIN vtiger_crmentity ce_pot ON ce_pot.crmid = q.potentialid
				WHERE ce.deleted = 0
					AND qcf.cf_1162 = '1'
					AND qcf.cf_1358 IS NOT NULL
					AND YEAR(qcf.cf_1358) = ?"
				. $userCondition
				. $monthCondition
				. " GROUP BY month_key ORDER BY month_key ASC";

		$result = $db->pquery($sql, $params);
		$monthly = array();
		$totalValidatedCount = 0;
		$totalValidatedHT = 0;

		$monthLabels = array(
			'01' => 'Jan', '02' => 'Fév', '03' => 'Mar',
			'04' => 'Avr', '05' => 'Mai', '06' => 'Jun',
			'07' => 'Jul', '08' => 'Aoû', '09' => 'Sep',
			'10' => 'Oct', '11' => 'Nov', '12' => 'Déc'
		);

		while ($row = $db->fetchByAssoc($result)) {
			$monthNum = substr($row['month_key'], 5, 2);
			$label = isset($monthLabels[$monthNum]) ? $monthLabels[$monthNum] . ' ' . $year : $row['month_key'];
			$count = intval($row['quote_count']);
			$ht = round(floatval($row['total_ht']), 2);

			$monthly[] = array(
				'month' => $row['month_key'],
				'label' => $label,
				'count' => $count,
				'total_ht' => $ht,
			);

			$totalValidatedCount += $count;
			$totalValidatedHT += $ht;
		}

		// Pending quotes (not validated, filtered by creation date as fallback)
		$pendingParams = array($year);
		if ($filterUserId !== null) {
			$pendingParams[] = $filterUserId;
		}
		$pendingMonthCond = '';
		if ($month > 0) {
			$pendingMonthCond = ' AND MONTH(ce.createdtime) = ?';
			$pendingParams[] = $month;
		}
		$sqlPending = "SELECT COUNT(*) AS pending_count,
						COALESCE(SUM(q.pre_tax_total), 0) AS pending_ht
					FROM vtiger_quotes q
					INNER JOIN vtiger_crmentity ce ON ce.crmid = q.quoteid
					INNER JOIN vtiger_quotescf qcf ON qcf.quoteid = q.quoteid
					LEFT JOIN vtiger_crmentity ce_pot ON ce_pot.crmid = q.potentialid
					WHERE ce.deleted = 0
						AND (qcf.cf_1162 IS NULL OR qcf.cf_1162 != '1')
						AND YEAR(ce.createdtime) = ?"
					. $userCondition
					. $pendingMonthCond;

		$resultPending = $db->pquery($sqlPending, $pendingParams);
		$pendingRow = $db->fetchByAssoc($resultPending);
		$pendingCount = intval($pendingRow['pending_count']);
		$pendingHT = round(floatval($pendingRow['pending_ht']), 2);

		// Conversion rate
		$totalQuotes = $totalValidatedCount + $pendingCount;
		$conversionRate = $totalQuotes > 0 ? round(($totalValidatedCount / $totalQuotes) * 100, 1) : 0;

		// Average quote value
		$avgValue = $totalValidatedCount > 0 ? round($totalValidatedHT / $totalValidatedCount, 2) : 0;

		// Per-user stats (admin only)
		$perUser = array();
		if ($isAdmin) {
			$userParams = array($year);
			$userMonthCond = '';
			if ($month > 0) {
				$userMonthCond = ' AND MONTH(qcf.cf_1358) = ?';
				$userParams[] = $month;
			}

			$sqlUser = "SELECT u.id AS user_id,
							CONCAT(u.first_name, ' ', u.last_name) AS user_name,
							COUNT(*) AS quote_count,
							COALESCE(SUM(q.pre_tax_total), 0) AS total_ht
						FROM vtiger_quotes q
						INNER JOIN vtiger_crmentity ce ON ce.crmid = q.quoteid
						INNER JOIN vtiger_quotescf qcf ON qcf.quoteid = q.quoteid
						LEFT JOIN vtiger_crmentity ce_pot ON ce_pot.crmid = q.potentialid
						INNER JOIN vtiger_users u ON u.id = ce_pot.smownerid
						WHERE ce.deleted = 0
							AND qcf.cf_1162 = '1'
							AND qcf.cf_1358 IS NOT NULL
							AND YEAR(qcf.cf_1358) = ?"
						. $userMonthCond
						. " GROUP BY u.id, u.first_name, u.last_name
						ORDER BY total_ht DESC";

			$resultUser = $db->pquery($sqlUser, $userParams);
			while ($uRow = $db->fetchByAssoc($resultUser)) {
				$perUser[] = array(
					'user_id' => intval($uRow['user_id']),
					'user_name' => $uRow['user_name'],
					'count' => intval($uRow['quote_count']),
					'total_ht' => round(floatval($uRow['total_ht']), 2),
				);
			}
		}

		$data = array(
			'success' => true,
			'year' => $year,
			'month' => $month,
			'monthly' => $monthly,
			'pending' => array(
				'count' => $pendingCount,
				'total_ht' => $pendingHT,
			),
			'validated_total' => array(
				'count' => $totalValidatedCount,
				'total_ht' => $totalValidatedHT,
			),
			'per_user' => $perUser,
			'conversion_rate' => $conversionRate,
			'avg_quote_value' => $avgValue,
		);

		header('Content-Type: application/json; charset=utf-8');
		echo json_encode($data);
	}
}
