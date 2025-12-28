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

		// CUSTOM: Ajouter l'assurance au subtotal VTiger
		$result = $adb->pquery("SELECT cf_1141 FROM vtiger_quotescf WHERE quoteid = ?", array($recordId));
		$assuranceTarif = 0;
		if ($adb->num_rows($result) > 0) {
			$assuranceTarif = floatval($adb->query_result($result, 0, 'cf_1141'));
		}

		// Récupérer le subtotal VTiger actuel (produits + forfait uniquement)
		$result = $adb->pquery("SELECT subtotal FROM vtiger_quotes WHERE quoteid = ?", array($recordId));
		if ($adb->num_rows($result) > 0) {
			$currentSubTotal = floatval($adb->query_result($result, 0, 'subtotal'));

			// Ajouter l'assurance au subtotal
			$newSubTotal = $currentSubTotal + $assuranceTarif;

			// Calculer le nouveau total TTC avec TVA
			$taxRate = 0.20;
			$newPreTaxTotal = $newSubTotal;
			$newTotal = $newSubTotal * (1 + $taxRate);

			// Mettre à jour la base de données
			$adb->pquery("UPDATE vtiger_quotes SET subtotal = ?, pre_tax_total = ?, total = ? WHERE quoteid = ?",
				array($newSubTotal, $newPreTaxTotal, $newTotal, $recordId));
		}

		// Récupérer les totaux Acompte/Solde (calculés correctement par JavaScript)
		$result = $adb->pquery("SELECT cf_1055, cf_1057 FROM vtiger_quotescf WHERE quoteid = ?", array($recordId));
		if ($adb->num_rows($result) > 0) {
			$totalAcompteTTC = floatval($adb->query_result($result, 0, 'cf_1055'));
			$totalSoldeTTC = floatval($adb->query_result($result, 0, 'cf_1057'));
			$grandTotal = $totalAcompteTTC + $totalSoldeTTC;

			// Vérifier que Acompte + Solde correspond au Total TTC calculé
			// Si ce n'est pas le cas, recalculer à partir de Acompte + Solde
			// (car Acompte/Solde incluent déjà forfait et assurance)
			$calculatedTotal = $newTotal;
			if (abs($grandTotal - $calculatedTotal) > 0.01) {
				// Les totaux ne correspondent pas, utiliser Acompte + Solde comme référence
				$newTotal = $grandTotal;
				$newSubTotal = $grandTotal / (1 + $taxRate);
				$newPreTaxTotal = $newSubTotal;

				// Mettre à jour la base de données
				$adb->pquery("UPDATE vtiger_quotes SET subtotal = ?, pre_tax_total = ?, total = ? WHERE quoteid = ?",
					array($newSubTotal, $newPreTaxTotal, $newTotal, $recordId));
			}
		}
	}
}
