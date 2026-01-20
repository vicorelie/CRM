<?php
/*+***********************************************************************************
 * The contents of this file are subject to the vtiger CRM Public License Version 1.0
 * ("License"); You may not use this file except in compliance with the License
 * The Original Code is:  vtiger CRM Open Source
 * The Initial Developer of the Original Code is vtiger.
 * Portions created by vtiger are Copyright (C) vtiger.
 * All Rights Reserved.
 *************************************************************************************/
class SalesOrder_Save_Action extends Inventory_Save_Action {

	public function process(Vtiger_Request $request) {
		global $adb;

		// CUSTOM: Calculer cf_1184 (TOTAL FORFAIT) AVANT parent::process()
		$forfaitTarif = floatval($request->get('cf_1180')) ?: 0;
		$forfaitSupplement = floatval($request->get('cf_1182')) ?: 0;
		$totalForfaitHT = $forfaitTarif + $forfaitSupplement;
		$request->set('cf_1184', $totalForfaitHT);

		// Appeler la méthode parent pour sauvegarder
		$result = parent::process($request);

		// CUSTOM: Recalculer les totaux à partir des Acompte/Solde
		$recordId = $request->get('record');

		// Pour un nouveau record, le recordId est dans $result->getId()
		if (!$recordId && isset($result) && is_object($result) && method_exists($result, 'getId')) {
			$recordId = $result->getId();
		}

		// Si toujours pas de recordId, chercher dans la table vtiger_crmentity
		if (!$recordId) {
			$lastIdResult = $adb->pquery("SELECT MAX(crmid) as lastid FROM vtiger_crmentity WHERE setype = 'SalesOrder'", array());
			if ($adb->num_rows($lastIdResult) > 0) {
				$recordId = $adb->query_result($lastIdResult, 0, 'lastid');
			}
		}

		if (!$recordId) {
			return $result;
		}

		// CUSTOM: Récupérer les valeurs
		$forfaitTarif = floatval($request->get('cf_1180')) ?: 0;
		$forfaitSupplement = floatval($request->get('cf_1182')) ?: 0;

		// Gérer les pourcentages - accepter 0 comme valeur valide
		$forfaitPctAcompteValue = $request->get('cf_1176');
		$forfaitPctAcompte = ($forfaitPctAcompteValue !== null && $forfaitPctAcompteValue !== '') ? floatval($forfaitPctAcompteValue) : 43;

		$forfaitPctSoldeValue = $request->get('cf_1178');
		$forfaitPctSolde = ($forfaitPctSoldeValue !== null && $forfaitPctSoldeValue !== '') ? floatval($forfaitPctSoldeValue) : 57;

		// CUSTOM: Lire cf_1170 (MONTANT ASSURANCE) et cf_1172 (TARIF POUR 1000) depuis la DB
		$assuranceResult = $adb->pquery("SELECT cf_1170, cf_1172 FROM vtiger_salesordercf WHERE salesorderid = ?", array($recordId));
		$montantAssurance = 0;
		$tarifPour1000 = 0;
		if ($adb->num_rows($assuranceResult) > 0) {
			$montantAssurance = floatval($adb->query_result($assuranceResult, 0, 'cf_1170')) ?: 0;
			$tarifPour1000 = floatval($adb->query_result($assuranceResult, 0, 'cf_1172')) ?: 0;
		}

		// CUSTOM: Calculer cf_1174 (TARIF ASSURANCE) = ((cf_1170 / 1000) - 4) * cf_1172
		$assuranceTarif = 0;
		if ($montantAssurance > 0 && $tarifPour1000 > 0) {
			$assuranceTarif = (($montantAssurance / 1000) - 4) * $tarifPour1000;
		}

		// CUSTOM: Mettre à jour cf_1174 dans la DB
		$adb->pquery("UPDATE vtiger_salesordercf SET cf_1174 = ? WHERE salesorderid = ?", array($assuranceTarif, $recordId));

		// Calculer le Total forfait
		$totalForfaitHT = $forfaitTarif + $forfaitSupplement;

		// Récupérer le subtotal UNIQUEMENT des produits
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

		// Récupérer la remise globale
		$discountAmount = floatval($request->get('discount_amount')) ?: 0;
		if ($discountAmount == 0) {
			$discountResult = $adb->pquery("SELECT discount_amount FROM vtiger_salesorder WHERE salesorderid = ?", array($recordId));
			if ($adb->num_rows($discountResult) > 0) {
				$discountAmount = floatval($adb->query_result($discountResult, 0, 'discount_amount')) ?: 0;
			}
		}

		// Calculer le total HT
		$subtotalBeforeDiscount = $productsSubTotal + $totalForfaitHT + $assuranceTarif;
		$totalHT = $subtotalBeforeDiscount - $discountAmount;

		// TVA 20%
		$taxRate = 0.20;

		// Calculer Acompte et Solde des produits
		$totalProduitsAcompteHT = 0;
		$totalProduitsSoldeHT = 0;

		$lineItemsResult = $adb->pquery(
			"SELECT productid, quantity, listprice, discount_percent, discount_amount
			 FROM vtiger_inventoryproductrel
			 WHERE id = ?",
			array($recordId)
		);

		if ($adb->num_rows($lineItemsResult) > 0) {
			for ($i = 0; $i < $adb->num_rows($lineItemsResult); $i++) {
				$productId = $adb->query_result($lineItemsResult, $i, 'productid');
				$quantity = floatval($adb->query_result($lineItemsResult, $i, 'quantity')) ?: 0;
				$listPrice = floatval($adb->query_result($lineItemsResult, $i, 'listprice')) ?: 0;
				$discountPercent = floatval($adb->query_result($lineItemsResult, $i, 'discount_percent')) ?: 0;
				$discountAmount = floatval($adb->query_result($lineItemsResult, $i, 'discount_amount')) ?: 0;

				$lineTotal = ($quantity * $listPrice * (1 - $discountPercent / 100)) - $discountAmount;

				if ($lineTotal > 0 && $productId) {
					$pctResult = $adb->pquery(
						"SELECT cf_1051, cf_1053 FROM vtiger_productcf WHERE productid = ?",
						array($productId)
					);

					if ($adb->num_rows($pctResult) == 0) {
						$pctResult = $adb->pquery(
							"SELECT cf_1051, cf_1053 FROM vtiger_servicecf WHERE serviceid = ?",
							array($productId)
						);
					}

					$pctAcompte = $forfaitPctAcompte;
					$pctSolde = $forfaitPctSolde;

					if ($adb->num_rows($pctResult) > 0) {
						$dbAcompte = $adb->query_result($pctResult, 0, 'cf_1051');
						$dbSolde = $adb->query_result($pctResult, 0, 'cf_1053');

						if ($dbAcompte !== null && $dbAcompte !== '') {
							$pctAcompte = floatval($dbAcompte);
						}
						if ($dbSolde !== null && $dbSolde !== '') {
							$pctSolde = floatval($dbSolde);
						}
					}

					$lineAcompte = ($lineTotal * $pctAcompte) / 100;
					$lineSolde = ($lineTotal * $pctSolde) / 100;

					$totalProduitsAcompteHT += $lineAcompte;
					$totalProduitsSoldeHT += $lineSolde;
				}
			}
		}

		// Calculer Forfait Acompte et Forfait Solde
		$forfaitAcompteHT = ($forfaitTarif * $forfaitPctAcompte / 100) + $forfaitSupplement;
		$forfaitSoldeHT = $forfaitTarif * $forfaitPctSolde / 100;

		// Calculer Acompte et Solde TTC
		$totalAcompteHT = $totalProduitsAcompteHT + $forfaitAcompteHT + $assuranceTarif;
		$totalSoldeHT = $totalProduitsSoldeHT + $forfaitSoldeHT;

		$totalAcompteTTC = $totalAcompteHT * (1 + $taxRate);
		$totalSoldeTTC = $totalSoldeHT * (1 + $taxRate);
		$grandTotal = $totalAcompteTTC + $totalSoldeTTC;

		// Mettre à jour vtiger_salesordercf
		$updateResult = $adb->pquery(
			"UPDATE vtiger_salesordercf SET cf_1184 = ?, cf_1166 = ?, cf_1168 = ? WHERE salesorderid = ?",
			array($totalForfaitHT, $totalAcompteTTC, $totalSoldeTTC, $recordId)
		);

		// Calculer le montant de la taxe
		$taxAmount = $totalHT * $taxRate;

		// Mettre à jour les totaux VTiger
		$newSubTotal = $subtotalBeforeDiscount;
		$newDiscountAmount = $discountAmount;
		$newPreTaxTotal = $totalHT;
		$newTotal = $grandTotal;

		$updateResult2 = $adb->pquery(
			"UPDATE vtiger_salesorder SET subtotal = ?, discount_amount = ?, pre_tax_total = ?, total = ? WHERE salesorderid = ?",
			array($newSubTotal, $newDiscountAmount, $newPreTaxTotal, $newTotal, $recordId)
		);

		return $result;
	}
}
