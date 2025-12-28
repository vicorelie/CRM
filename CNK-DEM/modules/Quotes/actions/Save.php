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
		parent::process($request);

		// CUSTOM: Recalculer les totaux à partir des Acompte/Solde (qui incluent le forfait)
		$recordId = $request->get('record');
		if (!$recordId) {
			return;
		}

		// Récupérer les totaux Acompte/Solde (calculés correctement par JavaScript)
		$result = $adb->pquery("SELECT cf_1055, cf_1057 FROM vtiger_quotescf WHERE quoteid = ?", array($recordId));
		if ($adb->num_rows($result) > 0) {
			$totalAcompteTTC = floatval($adb->query_result($result, 0, 'cf_1055'));
			$totalSoldeTTC = floatval($adb->query_result($result, 0, 'cf_1057'));
			$grandTotal = $totalAcompteTTC + $totalSoldeTTC;

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
}
