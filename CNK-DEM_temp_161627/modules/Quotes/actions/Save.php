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

		// CUSTOM: Calculer cf_1137 AVANT parent::process()
		$forfaitTarif = floatval($request->get('cf_1127')) ?: 0;
		$forfaitSupplement = floatval($request->get('cf_1129')) ?: 0;
		$assuranceTarif = floatval($request->get('cf_1141')) ?: 0;
		$totalForfaitHT = $forfaitTarif + $forfaitSupplement;
		$request->set('cf_1137', $totalForfaitHT);

		// Appeler la méthode parent pour sauvegarder le devis
		$result = parent::process($request);

		// CUSTOM: Recalculer les totaux à partir des Acompte/Solde (qui incluent le forfait)
		// Récupérer le recordId (peut être dans le request ou dans le résultat du parent)
		$recordId = $request->get('record');

		// Pour un nouveau devis, le recordId est dans $result->getId()
		if (!$recordId && isset($result) && is_object($result) && method_exists($result, 'getId')) {
			$recordId = $result->getId();
		}

		// Si toujours pas de recordId, chercher dans la table vtiger_crmentity
		if (!$recordId) {
			$lastIdResult = $adb->pquery("SELECT MAX(crmid) as lastid FROM vtiger_crmentity WHERE setype = 'Quotes'", array());
			if ($adb->num_rows($lastIdResult) > 0) {
				$recordId = $adb->query_result($lastIdResult, 0, 'lastid');
			}
		}

		if (!$recordId) {
			return $result;
		}

		// CUSTOM: Récupérer les valeurs - certaines depuis REQUEST, d'autres depuis DB
		$forfaitTarif = floatval($request->get('cf_1127')) ?: 0;
		$forfaitSupplement = floatval($request->get('cf_1129')) ?: 0;
		$forfaitPctAcompte = floatval($request->get('cf_1133')) ?: 43;
		$forfaitPctSolde = floatval($request->get('cf_1135')) ?: 57;

		// IMPORTANT: Assurance est mise à jour par un WORKFLOW, donc la lire depuis la DB après parent::process()
		$assuranceResult = $adb->pquery("SELECT cf_1141 FROM vtiger_quotescf WHERE quoteid = ?", array($recordId));
		$assuranceTarif = 0;
		if ($adb->num_rows($assuranceResult) > 0) {
			$assuranceTarif = floatval($adb->query_result($assuranceResult, 0, 'cf_1141')) ?: 0;
		}

		// Calculer le Total forfait (cf_1137 = cf_1127 + cf_1129)
		$totalForfaitHT = $forfaitTarif + $forfaitSupplement;

		// Récupérer le subtotal UNIQUEMENT des produits (pas forfait, pas assurance)
		// en calculant depuis la source (vtiger_inventoryproductrel)
		$productsResult = $adb->pquery(
			"SELECT SUM(COALESCE(quantity, 0) * COALESCE(listprice, 0) * (1 - COALESCE(discount_percent, 0)/100) - COALESCE(discount_amount, 0)) as products_subtotal
			 FROM vtiger_inventoryproductrel
			 WHERE id = ?",
			array($recordId)
		);

		$productsSubTotal = 0;
		if ($adb->num_rows($productsResult) > 0) {
			$productsSubTotal = floatval($adb->query_result($productsResult, 0, 'products_subtotal')) ?: 0;
		}

		// Calculer le total HT (produits + forfait + assurance)
		$totalHT = $productsSubTotal + $totalForfaitHT + $assuranceTarif;

		// TVA 20%
		$taxRate = 0.20;

		// Calculer Forfait Acompte et Forfait Solde
		$forfaitAcompteHT = $totalForfaitHT * $forfaitPctAcompte / 100;
		$forfaitSoldeHT = $totalForfaitHT * $forfaitPctSolde / 100;

		// Calculer Acompte et Solde TTC
		// Produits: répartition selon pourcentages
		// Forfait: répartition selon pourcentages
		// Assurance: 100% à l'acompte
		$totalAcompteHT = ($productsSubTotal * $forfaitPctAcompte / 100) + $forfaitAcompteHT + $assuranceTarif;
		$totalSoldeHT = ($productsSubTotal * $forfaitPctSolde / 100) + $forfaitSoldeHT;

		// Calculer les montants TTC
		$totalAcompteTTC = $totalAcompteHT * (1 + $taxRate);
		$totalSoldeTTC = $totalSoldeHT * (1 + $taxRate);
		$grandTotal = $totalAcompteTTC + $totalSoldeTTC;

		// Mettre à jour vtiger_quotescf (la ligne devrait déjà exister après parent::process())
		$updateResult = $adb->pquery(
			"UPDATE vtiger_quotescf SET cf_1137 = ?, cf_1055 = ?, cf_1057 = ? WHERE quoteid = ?",
			array($totalForfaitHT, $totalAcompteTTC, $totalSoldeTTC, $recordId)
		);

		// Mettre à jour les totaux VTiger
		$newSubTotal = $totalHT;
		$newPreTaxTotal = $totalHT;
		$newTotal = $grandTotal;

		$updateResult2 = $adb->pquery("UPDATE vtiger_quotes SET subtotal = ?, pre_tax_total = ?, total = ? WHERE quoteid = ?",
			array($newSubTotal, $newPreTaxTotal, $newTotal, $recordId));

		// CUSTOM: Synchroniser potentialid depuis crmentityrel
		$adb->pquery("UPDATE vtiger_quotes q
			INNER JOIN vtiger_crmentityrel cr ON (cr.relcrmid = q.quoteid AND cr.module = 'Potentials')
			SET q.potentialid = cr.crmid
			WHERE q.quoteid = ? AND (q.potentialid IS NULL OR q.potentialid = 0)",
			array($recordId));

		return $result;
	}
}
