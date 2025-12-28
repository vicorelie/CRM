<?php
/*+***********************************************************************************
 * The contents of this file are subject to the vtiger CRM Public License Version 1.0
 * ("License"); You may not use this file except in compliance with the License
 * The Original Code is:  vtiger CRM Open Source
 * The Initial Developer of the Original Code is vtiger.
 * Portions created by vtiger are Copyright (C) vtiger.
 * All Rights Reserved.
 *************************************************************************************/
class Quotes_Save_Action extends Inventory_Save_Action {

	public function process(Vtiger_Request $request) {
		global $adb;

		// Appeler la méthode parent pour sauvegarder le devis
		$result = parent::process($request);

		// CUSTOM: Recalculer les totaux à partir des Acompte/Solde (qui incluent le forfait)
		// Récupérer le recordId (peut être dans le request ou dans le résultat du parent)
		$recordId = $request->get('record');
		if (!$recordId && isset($result) && method_exists($result, 'getId')) {
			$recordId = $result->getId();
		}
		if (!$recordId) {
			return $result;
		}

		// CUSTOM: Calculer et mettre à jour le Total forfait (cf_1137 = cf_1127 + cf_1129)
		$result = $adb->pquery("SELECT cf_1127, cf_1129 FROM vtiger_quotescf WHERE quoteid = ?", array($recordId));
		if ($adb->num_rows($result) > 0) {
			$forfaitTarif = floatval($adb->query_result($result, 0, 'cf_1127'));
			$forfaitSupplement = floatval($adb->query_result($result, 0, 'cf_1129'));
			$totalForfaitHT = $forfaitTarif + $forfaitSupplement;

			// Mettre à jour le Total forfait
			$adb->pquery("UPDATE vtiger_quotescf SET cf_1137 = ? WHERE quoteid = ?",
				array($totalForfaitHT, $recordId));
		}

		// Récupérer les totaux Acompte/Solde (calculés correctement par JavaScript, incluent produits + forfait + assurance)
		$result = $adb->pquery("SELECT cf_1055, cf_1057 FROM vtiger_quotescf WHERE quoteid = ?", array($recordId));
		if ($adb->num_rows($result) > 0) {
			$totalAcompteTTC = floatval($adb->query_result($result, 0, 'cf_1055'));
			$totalSoldeTTC = floatval($adb->query_result($result, 0, 'cf_1057'));
			$grandTotal = $totalAcompteTTC + $totalSoldeTTC;

			// Ne recalculer que si Acompte et Solde ont des valeurs
			if ($grandTotal > 0) {
				// Calculer le subtotal HT à partir du grand total TTC (TVA 20%)
				$taxRate = 0.20;
				$newSubTotal = $grandTotal / (1 + $taxRate);
				$newPreTaxTotal = $newSubTotal;
				$newTotal = $grandTotal;

				// Mettre à jour la base de données
				$adb->pquery("UPDATE vtiger_quotes SET subtotal = ?, pre_tax_total = ?, total = ? WHERE quoteid = ?",
					array($newSubTotal, $newPreTaxTotal, $newTotal, $recordId));
			}
		}

		return $result;
	}
}
