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

		// CUSTOM: Récupérer tous les champs nécessaires pour les calculs
		$result = $adb->pquery("SELECT cf_1127, cf_1129, cf_1133, cf_1135, cf_1141 FROM vtiger_quotescf WHERE quoteid = ?", array($recordId));
		if ($adb->num_rows($result) == 0) {
			return $result;
		}

		$forfaitTarif = floatval($adb->query_result($result, 0, 'cf_1127'));
		$forfaitSupplement = floatval($adb->query_result($result, 0, 'cf_1129'));
		$forfaitPctAcompte = floatval($adb->query_result($result, 0, 'cf_1133')) ?: 43;
		$forfaitPctSolde = floatval($adb->query_result($result, 0, 'cf_1135')) ?: 57;
		$assuranceTarif = floatval($adb->query_result($result, 0, 'cf_1141'));

		// Calculer et mettre à jour le Total forfait (cf_1137 = cf_1127 + cf_1129)
		$totalForfaitHT = $forfaitTarif + $forfaitSupplement;
		$adb->pquery("UPDATE vtiger_quotescf SET cf_1137 = ? WHERE quoteid = ?",
			array($totalForfaitHT, $recordId));

		// IMPORTANT: Calculer le subtotal des PRODUITS UNIQUEMENT (pas forfait, pas assurance)
		// en faisant la somme directe des lignes de produits/services
		$result = $adb->pquery(
			"SELECT SUM(
				quantity * listprice * (1 - COALESCE(discount_percent, 0)/100) - COALESCE(discount_amount, 0)
			) as products_total
			 FROM vtiger_inventoryproductrel
			 WHERE id = ?",
			array($recordId)
		);
		$productsSubTotal = 0;
		if ($adb->num_rows($result) > 0 && $adb->query_result($result, 0, 'products_total') !== NULL) {
			$productsSubTotal = floatval($adb->query_result($result, 0, 'products_total'));
		}

		// CUSTOM: Calculer Acompte et Solde côté serveur (plus fiable que JavaScript)
		$taxRate = 0.20;

		// Calculer les montants HT du forfait pour Acompte et Solde
		$forfaitAcompteHT = ($forfaitTarif * $forfaitPctAcompte / 100) + $forfaitSupplement;
		$forfaitSoldeHT = $forfaitTarif * $forfaitPctSolde / 100;

		// Total HT = Produits UNIQUEMENT + Forfait + Assurance
		$totalHT = $productsSubTotal + $totalForfaitHT + $assuranceTarif;

		// Répartir entre Acompte et Solde
		// Produits: selon les % de chaque produit (gardés par VTiger)
		// Forfait: selon cf_1133 et cf_1135
		// Assurance: 100% à l'acompte
		$totalAcompteHT = ($productsSubTotal * $forfaitPctAcompte / 100) + $forfaitAcompteHT + $assuranceTarif;
		$totalSoldeHT = ($productsSubTotal * $forfaitPctSolde / 100) + $forfaitSoldeHT;

		// Calculer les montants TTC
		$totalAcompteTTC = $totalAcompteHT * (1 + $taxRate);
		$totalSoldeTTC = $totalSoldeHT * (1 + $taxRate);
		$grandTotal = $totalAcompteTTC + $totalSoldeTTC;

		// Mettre à jour Acompte et Solde
		$adb->pquery("UPDATE vtiger_quotescf SET cf_1055 = ?, cf_1057 = ? WHERE quoteid = ?",
			array($totalAcompteTTC, $totalSoldeTTC, $recordId));

		// Mettre à jour les totaux VTiger
		$newSubTotal = $totalHT;
		$newPreTaxTotal = $totalHT;
		$newTotal = $grandTotal;

		$adb->pquery("UPDATE vtiger_quotes SET subtotal = ?, pre_tax_total = ?, total = ? WHERE quoteid = ?",
			array($newSubTotal, $newPreTaxTotal, $newTotal, $recordId));

		return $result;
	}
}
