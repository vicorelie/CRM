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

		// DEBUG: Logger ce que nous recevons
		$incomingRecordId = $request->get('record');
		error_log("[QUOTES SAVE] Record ID reçu: " . var_export($incomingRecordId, true));
		error_log("[QUOTES SAVE] Subject: " . $request->get('subject'));
		error_log("[QUOTES SAVE] cf_1005 (validité): " . var_export($request->get('cf_1005'), true));
		error_log("[QUOTES SAVE] cf_1125: " . var_export($request->get('cf_1125'), true));
		error_log("[QUOTES SAVE] Mode: " . ($incomingRecordId ? 'MISE A JOUR' : 'CREATION'));

		// CUSTOM: Calculer cf_1137 AVANT parent::process()
		$forfaitTarif = floatval($request->get('cf_1127')) ?: 0;
		$forfaitSupplement = floatval($request->get('cf_1129')) ?: 0;
		$assuranceTarif = floatval($request->get('cf_1143')) ?: 0;
		$totalForfaitHT = $forfaitTarif + $forfaitSupplement;
		$request->set('cf_1137', $totalForfaitHT);

		// Appeler la méthode parent pour sauvegarder le devis
		$result = parent::process($request);

		// CUSTOM: Recalculer les totaux à partir des Acompte/Solde (qui incluent le forfait)
		// Récupérer le recordId - priorité à $this->savedRecordId (défini par parent::saveRecord())
		$recordId = $this->savedRecordId;
		error_log("[QUOTES SAVE] recordId depuis this->savedRecordId: " . var_export($recordId, true));

		// Fallback sur request si savedRecordId n'est pas défini
		if (!$recordId) {
			$recordId = $request->get('record');
			error_log("[QUOTES SAVE] recordId depuis request->get('record'): " . var_export($recordId, true));
		}

		// Dernier recours: chercher le dernier devis créé
		if (!$recordId) {
			$lastIdResult = $adb->pquery("SELECT MAX(crmid) as lastid FROM vtiger_crmentity WHERE setype = 'Quotes'", array());
			if ($adb->num_rows($lastIdResult) > 0) {
				$recordId = $adb->query_result($lastIdResult, 0, 'lastid');
				error_log("[QUOTES SAVE] recordId depuis MAX(crmid): " . var_export($recordId, true));
			}
		}

		error_log("[QUOTES SAVE] recordId final utilisé: " . var_export($recordId, true));

		if (!$recordId) {
			error_log("[QUOTES SAVE] ERREUR: Aucun recordId trouvé, abandon des mises à jour custom");
			return $result;
		}

		// CUSTOM: Récupérer les valeurs - certaines depuis REQUEST, d'autres depuis DB
		$forfaitTarif = floatval($request->get('cf_1127')) ?: 0;
		$forfaitSupplement = floatval($request->get('cf_1129')) ?: 0;

		// Gérer les pourcentages - accepter 0 comme valeur valide
		$forfaitPctAcompteValue = $request->get('cf_1133');
		$forfaitPctAcompte = ($forfaitPctAcompteValue !== null && $forfaitPctAcompteValue !== '') ? floatval($forfaitPctAcompteValue) : 43;

		$forfaitPctSoldeValue = $request->get('cf_1135');
		$forfaitPctSolde = ($forfaitPctSoldeValue !== null && $forfaitPctSoldeValue !== '') ? floatval($forfaitPctSoldeValue) : 57;

		// CUSTOM: Lire cf_1139 (Montant assurance) et cf_1141 (Tarif pour 1000) depuis la DB
		$assuranceResult = $adb->pquery("SELECT cf_1139, cf_1141 FROM vtiger_quotescf WHERE quoteid = ?", array($recordId));
		$montantAssurance = 0;
		$tarifPour1000 = 0;
		if ($adb->num_rows($assuranceResult) > 0) {
			$montantAssurance = floatval($adb->query_result($assuranceResult, 0, 'cf_1139')) ?: 0;
			$tarifPour1000 = floatval($adb->query_result($assuranceResult, 0, 'cf_1141')) ?: 0;
		}

		// CUSTOM: Calculer cf_1143 (Tarif assurance) = ((cf_1139 / 1000) - 4) * cf_1141
		$assuranceTarif = 0;
		if ($montantAssurance > 0 && $tarifPour1000 > 0) {
			$assuranceTarif = (($montantAssurance / 1000) - 4) * $tarifPour1000;
		}

		// CUSTOM: Mettre à jour cf_1143 dans la DB
		$adb->pquery("UPDATE vtiger_quotescf SET cf_1143 = ? WHERE quoteid = ?", array($assuranceTarif, $recordId));

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

		// Récupérer la remise globale (discount_amount) depuis le request ou depuis la DB
		$discountAmount = floatval($request->get('discount_amount')) ?: 0;

		// Si pas dans le request, essayer de la récupérer depuis la DB
		if ($discountAmount == 0) {
			$discountResult = $adb->pquery("SELECT discount_amount FROM vtiger_quotes WHERE quoteid = ?", array($recordId));
			if ($adb->num_rows($discountResult) > 0) {
				$discountAmount = floatval($adb->query_result($discountResult, 0, 'discount_amount')) ?: 0;
			}
		}

		// Calculer le total HT (produits + forfait + assurance)
		$subtotalBeforeDiscount = $productsSubTotal + $totalForfaitHT + $assuranceTarif;
		$totalHT = $subtotalBeforeDiscount - $discountAmount;

		// TVA 20%
		$taxRate = 0.20;

		// Calculer Acompte et Solde des produits - PRODUIT PAR PRODUIT
		$totalProduitsAcompteHT = 0;
		$totalProduitsSoldeHT = 0;

		// Récupérer toutes les lignes de produits/services du devis
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

				// Calculer le total après remise pour cette ligne
				$lineTotal = ($quantity * $listPrice * (1 - $discountPercent / 100)) - $discountAmount;

				if ($lineTotal > 0 && $productId) {
					// Déterminer si c'est un produit ou un service
					// Essayer d'abord dans vtiger_productcf
					$pctResult = $adb->pquery(
						"SELECT cf_1051, cf_1053 FROM vtiger_productcf WHERE productid = ?",
						array($productId)
					);

					// Si pas trouvé dans products, essayer dans services
					if ($adb->num_rows($pctResult) == 0) {
						$pctResult = $adb->pquery(
							"SELECT cf_1051, cf_1053 FROM vtiger_servicecf WHERE serviceid = ?",
							array($productId)
						);
					}

					// Récupérer les pourcentages ou utiliser les valeurs par défaut du forfait
					$pctAcompte = $forfaitPctAcompte;  // Valeur par défaut
					$pctSolde = $forfaitPctSolde;      // Valeur par défaut

					if ($adb->num_rows($pctResult) > 0) {
						$dbAcompte = $adb->query_result($pctResult, 0, 'cf_1051');
						$dbSolde = $adb->query_result($pctResult, 0, 'cf_1053');

						// Utiliser la valeur de la DB même si c'est 0
						if ($dbAcompte !== null && $dbAcompte !== '') {
							$pctAcompte = floatval($dbAcompte);
						}
						if ($dbSolde !== null && $dbSolde !== '') {
							$pctSolde = floatval($dbSolde);
						}
					}

					// Calculer la contribution de cette ligne
					$lineAcompte = ($lineTotal * $pctAcompte) / 100;
					$lineSolde = ($lineTotal * $pctSolde) / 100;

					$totalProduitsAcompteHT += $lineAcompte;
					$totalProduitsSoldeHT += $lineSolde;
				}
			}
		}

		// Calculer Forfait Acompte et Forfait Solde
		// Le tarif forfait est divisé selon les %, le supplément va 100% à l'acompte
		$forfaitAcompteHT = ($forfaitTarif * $forfaitPctAcompte / 100) + $forfaitSupplement;
		$forfaitSoldeHT = $forfaitTarif * $forfaitPctSolde / 100;

		// Calculer Acompte et Solde TTC
		// Produits: calculés produit par produit ci-dessus
		// Forfait: répartition selon pourcentages
		// Supplément forfait: 100% à l'acompte
		// Assurance: 100% à l'acompte
		$totalAcompteHT = $totalProduitsAcompteHT + $forfaitAcompteHT + $assuranceTarif;
		$totalSoldeHT = $totalProduitsSoldeHT + $forfaitSoldeHT;

		// Calculer les montants TTC
		$totalAcompteTTC = $totalAcompteHT * (1 + $taxRate);
		$totalSoldeTTC = $totalSoldeHT * (1 + $taxRate);
		$grandTotal = $totalAcompteTTC + $totalSoldeTTC;

		// Calculer le montant déjà payé depuis vtiger_stripe_payments
		$paidResult = $adb->pquery(
			"SELECT COALESCE(SUM(amount), 0) as total_paid FROM vtiger_stripe_payments WHERE quote_id = ? AND status = 'paid'",
			array($recordId)
		);
		$totalPaid = floatval($adb->query_result($paidResult, 0, 'total_paid'));

		// Calculer le reste à payer
		$resteAPayer = $grandTotal - $totalPaid;
		if ($resteAPayer < 0) $resteAPayer = 0;

		// Déterminer les statuts de paiement
		$statutAcompte = '';
		$statutSolde = '';

		if ($totalPaid > 0) {
			if ($totalPaid < $totalAcompteTTC) {
				// Payé partiellement l'acompte
				$statutAcompte = 'Partiel';
				$statutSolde = '';
			} elseif ($totalPaid >= $totalAcompteTTC && $totalPaid < $grandTotal) {
				// Acompte payé, solde partiel ou non commencé
				$statutAcompte = 'Payé';
				if ($totalPaid > $totalAcompteTTC) {
					$statutSolde = 'Partiel';
				}
			} elseif ($totalPaid >= $grandTotal) {
				// Tout est payé
				$statutAcompte = 'Payé';
				$statutSolde = 'Payé';
			}
		}

		// Mettre à jour vtiger_quotescf (la ligne devrait déjà exister après parent::process())
		$updateResult = $adb->pquery(
			"UPDATE vtiger_quotescf SET cf_1137 = ?, cf_1055 = ?, cf_1057 = ?, cf_1275 = ?, cf_1083 = ?, cf_1085 = ? WHERE quoteid = ?",
			array($totalForfaitHT, $totalAcompteTTC, $totalSoldeTTC, $resteAPayer, $statutAcompte, $statutSolde, $recordId)
		);

		// Calculer le montant de la taxe (TVA)
		$taxAmount = $totalHT * $taxRate;

		// Mettre à jour les totaux VTiger
		// subtotal = Total AVANT remise (produits + forfait + assurance)
		// pre_tax_total = Total APRÈS remise AVANT taxe
		// tax_totalamount = Montant de la taxe
		// total = Grand Total TTC
		$newSubTotal = $subtotalBeforeDiscount;
		$newDiscountAmount = $discountAmount;
		$newPreTaxTotal = $totalHT;
		$newTaxAmount = $taxAmount;
		$newTotal = $grandTotal;

		// Note: Il n'y a PAS de colonne tax_totalamount dans vtiger_quotes
		// La taxe est calculée à la volée comme: total - pre_tax_total
		$updateResult2 = $adb->pquery(
			"UPDATE vtiger_quotes SET subtotal = ?, discount_amount = ?, pre_tax_total = ?, total = ? WHERE quoteid = ?",
			array($newSubTotal, $newDiscountAmount, $newPreTaxTotal, $newTotal, $recordId)
		);

		return $result;
	}
}
