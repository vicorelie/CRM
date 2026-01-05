<?php
/*+***********************************************************************************
 * Custom action to recalculate Quote totals (Acompte, Solde, Forfait, Assurance)
 * Called after inline field editing in Detail view
 *************************************************************************************/
class Quotes_RecalculateQuoteTotals_Action extends Vtiger_Action_Controller {

	public function checkPermission(Vtiger_Request $request) {
		$moduleName = $request->getModule();
		$recordId = $request->get('record');

		if (!Users_Privileges_Model::isPermitted($moduleName, 'DetailView', $recordId)) {
			throw new AppException(vtranslate('LBL_PERMISSION_DENIED'));
		}
	}

	public function process(Vtiger_Request $request) {
		global $adb;

		$recordId = $request->get('record');
		if (!$recordId) {
			$response = new Vtiger_Response();
			$response->setError('Missing record ID');
			$response->emit();
			return;
		}

		try {
			// Récupérer tous les champs nécessaires depuis la DB
			$quoteResult = $adb->pquery(
				"SELECT qcf.cf_1127, qcf.cf_1129, qcf.cf_1133, qcf.cf_1135,
				        qcf.cf_1139, qcf.cf_1141
				 FROM vtiger_quotescf qcf
				 WHERE qcf.quoteid = ?",
				array($recordId)
			);

			if ($adb->num_rows($quoteResult) == 0) {
				throw new Exception('Quote not found');
			}

			// Lire les valeurs
			$forfaitTarif = floatval($adb->query_result($quoteResult, 0, 'cf_1127')) ?: 0;
			$forfaitSupplement = floatval($adb->query_result($quoteResult, 0, 'cf_1129')) ?: 0;

			// Gérer les pourcentages - accepter 0 comme valeur valide
			$forfaitPctAcompteValue = $adb->query_result($quoteResult, 0, 'cf_1133');
			$forfaitPctAcompte = ($forfaitPctAcompteValue !== null && $forfaitPctAcompteValue !== '') ? floatval($forfaitPctAcompteValue) : 43;

			$forfaitPctSoldeValue = $adb->query_result($quoteResult, 0, 'cf_1135');
			$forfaitPctSolde = ($forfaitPctSoldeValue !== null && $forfaitPctSoldeValue !== '') ? floatval($forfaitPctSoldeValue) : 57;

			$montantAssurance = floatval($adb->query_result($quoteResult, 0, 'cf_1139')) ?: 0;
			$tarifPour1000 = floatval($adb->query_result($quoteResult, 0, 'cf_1141')) ?: 0;

			// 1. Calculer cf_1143 (Tarif assurance) = ((cf_1139 / 1000) - 4) * cf_1141
			$assuranceTarif = 0;
			if ($montantAssurance > 0 && $tarifPour1000 > 0) {
				$assuranceTarif = (($montantAssurance / 1000) - 4) * $tarifPour1000;
			}

			// 2. Calculer le Total forfait (cf_1137 = cf_1127 + cf_1129)
			$totalForfaitHT = $forfaitTarif + $forfaitSupplement;

			// 3. Récupérer le subtotal des produits
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

			// 4. Calculer le total HT
			$totalHT = $productsSubTotal + $totalForfaitHT + $assuranceTarif;

			// TVA 20%
			$taxRate = 0.20;

			// 5. Calculer Acompte et Solde des produits - PRODUIT PAR PRODUIT
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

					// Calculer le total après remise pour cette ligne
					$lineTotal = ($quantity * $listPrice * (1 - $discountPercent / 100)) - $discountAmount;

					if ($lineTotal > 0 && $productId) {
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

						// Calculer la contribution de cette ligne
						$lineAcompte = ($lineTotal * $pctAcompte) / 100;
						$lineSolde = ($lineTotal * $pctSolde) / 100;

						$totalProduitsAcompteHT += $lineAcompte;
						$totalProduitsSoldeHT += $lineSolde;
					}
				}
			}

			// 6. Calculer Forfait Acompte et Forfait Solde
			$forfaitAcompteHT = ($forfaitTarif * $forfaitPctAcompte / 100) + $forfaitSupplement;
			$forfaitSoldeHT = $forfaitTarif * $forfaitPctSolde / 100;

			// 7. Calculer Acompte et Solde TTC
			$totalAcompteHT = $totalProduitsAcompteHT + $forfaitAcompteHT + $assuranceTarif;
			$totalSoldeHT = $totalProduitsSoldeHT + $forfaitSoldeHT;

			$totalAcompteTTC = $totalAcompteHT * (1 + $taxRate);
			$totalSoldeTTC = $totalSoldeHT * (1 + $taxRate);
			$grandTotal = $totalAcompteTTC + $totalSoldeTTC;

			// 8. Mettre à jour la base de données
			$adb->pquery(
				"UPDATE vtiger_quotescf
				 SET cf_1137 = ?, cf_1055 = ?, cf_1057 = ?, cf_1143 = ?
				 WHERE quoteid = ?",
				array($totalForfaitHT, $totalAcompteTTC, $totalSoldeTTC, $assuranceTarif, $recordId)
			);

			$adb->pquery(
				"UPDATE vtiger_quotes
				 SET subtotal = ?, pre_tax_total = ?, total = ?
				 WHERE quoteid = ?",
				array($totalHT, $totalHT, $grandTotal, $recordId)
			);

			// 9. Retourner les résultats
			$response = new Vtiger_Response();
			$response->setResult(array(
				'calculated_fields' => array(
					'cf_1137' => number_format($totalForfaitHT, 2, '.', ''),
					'cf_1055' => number_format($totalAcompteTTC, 2, '.', ''),
					'cf_1057' => number_format($totalSoldeTTC, 2, '.', ''),
					'cf_1143' => number_format($assuranceTarif, 2, '.', ''),
					'subtotal' => number_format($totalHT, 2, '.', ''),
					'pre_tax_total' => number_format($totalHT, 2, '.', ''),
					'total' => number_format($grandTotal, 2, '.', '')
				),
				'message' => 'Totaux recalculés avec succès'
			));
			$response->emit();

		} catch (Exception $e) {
			$response = new Vtiger_Response();
			$response->setError($e->getMessage());
			$response->emit();
		}
	}
}
