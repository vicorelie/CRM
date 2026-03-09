<?php
/*+***********************************************************************************
 * The contents of this file are subject to the vtiger CRM Public License Version 1.0
 * ("License"); You may not use this file except in compliance with the License
 * The Original Code is:  vtiger CRM Open Source
 * The Initial Developer of the Original Code is vtiger.
 * Portions created by vtiger are Copyright (C) vtiger.
 * All Rights Reserved.
 *************************************************************************************/
class Invoice_Save_Action extends Inventory_Save_Action {

	public function saveRecord($request) {
		global $adb;

		$recordId = $request->get('record');

		if ($recordId && $_REQUEST['action'] == 'SaveAjax') {
			// While saving Invoice record Line items quantities should not get updated
			// This is a dependency on the older code, where in Invoice save_module we decide wheather to update or not.
			$_REQUEST['action'] = 'InvoiceAjax';
		}

		$recordModel = parent::saveRecord($request);
		$invoiceId = $recordModel->getId();

		// CUSTOM: Recalculer les totaux si la facture provient d'un devis
		$quoteId = $recordModel->get('quote_id');

		if ($quoteId) {
			// Récupérer le forfait, assurance et calculs depuis les champs custom
			$forfaitTarif = floatval($recordModel->get('cf_1279')) ?: 0;
			$forfaitSupplement = floatval($recordModel->get('cf_1281')) ?: 0;
			$totalForfaitHT = floatval($recordModel->get('cf_1283')) ?: 0;
			$assuranceTarif = floatval($recordModel->get('cf_1287')) ?: 0;

			// Récupérer le subtotal des produits
			$productsResult = $adb->pquery(
				"SELECT SUM(COALESCE(quantity, 0) * COALESCE(listprice, 0) * (1 - COALESCE(discount_percent, 0)/100) - COALESCE(discount_amount, 0)) as products_subtotal
				 FROM vtiger_inventoryproductrel
				 WHERE id = ?",
				array($invoiceId)
			);

			$productsSubTotal = 0;
			if ($adb->num_rows($productsResult) > 0) {
				$productsSubTotal = floatval($adb->query_result($productsResult, 0, 'products_subtotal')) ?: 0;
			}

			// Récupérer la remise globale
			$discountAmount = floatval($request->get('discount_amount')) ?: 0;
			if ($discountAmount == 0) {
				$discountResult = $adb->pquery("SELECT discount_amount FROM vtiger_invoice WHERE invoiceid = ?", array($invoiceId));
				if ($adb->num_rows($discountResult) > 0) {
					$discountAmount = floatval($adb->query_result($discountResult, 0, 'discount_amount')) ?: 0;
				}
			}

			// Calculer le total HT (produits + forfait + assurance)
			$subtotalBeforeDiscount = $productsSubTotal + $totalForfaitHT + $assuranceTarif;
			$totalHT = $subtotalBeforeDiscount - $discountAmount;

			// TVA 20%
			$taxRate = 0.20;
			$taxAmount = $totalHT * $taxRate;
			$grandTotal = $totalHT * (1 + $taxRate);

			// Calculer le montant déjà reçu depuis vtiger_stripe_payments pour ce devis
			$paidResult = $adb->pquery(
				"SELECT COALESCE(SUM(amount), 0) as total_paid FROM vtiger_stripe_payments WHERE quote_id = ? AND status = 'paid'",
				array($quoteId)
			);
			$totalReceived = floatval($adb->query_result($paidResult, 0, 'total_paid'));
			$balance = $grandTotal - $totalReceived;
			if ($balance < 0) $balance = 0;

			// Mettre à jour les totaux VTiger + received/balance
			$adb->pquery(
				"UPDATE vtiger_invoice SET subtotal = ?, discount_amount = ?, pre_tax_total = ?, total = ?, received = ?, balance = ? WHERE invoiceid = ?",
				array($subtotalBeforeDiscount, $discountAmount, $totalHT, $grandTotal, $totalReceived, $balance, $invoiceId)
			);

			// Mettre à jour cf_1293 (Reste à payer) dans vtiger_invoicecf
			$adb->pquery(
				"UPDATE vtiger_invoicecf SET cf_1293 = ? WHERE invoiceid = ?",
				array($balance, $invoiceId)
			);

			// Copier les descriptions des produits depuis le devis (pour les "Produit personnalisé")
			// VTiger ne copie pas la colonne description lors de la sauvegarde standard
			$quoteProds = $adb->pquery(
				"SELECT productid, description FROM vtiger_inventoryproductrel WHERE id = ? AND description IS NOT NULL AND description != ''",
				array($quoteId)
			);
			while ($qrow = $adb->fetch_array($quoteProds)) {
				$adb->pquery(
					"UPDATE vtiger_inventoryproductrel SET description = ? WHERE id = ? AND productid = ? AND (description IS NULL OR description = '')",
					array($qrow['description'], $invoiceId, $qrow['productid'])
				);
			}
		}

		//Reverting the action value to $_REQUEST
		$_REQUEST['action'] = $request->get('action');
		return $recordModel;
	}
}
