<?php
/*+***********************************************************************************
 * The contents of this file are subject to the vtiger CRM Public License Version 1.0
 * ("License"); You may not use this file except in compliance with the License
 * The Original Code is:  vtiger CRM Open Source
 * The Initial Developer of the Original Code is vtiger.
 * Portions created by vtiger are Copyright (C) vtiger.
 * All Rights Reserved.
 *************************************************************************************/

Class Invoice_Edit_View extends Inventory_Edit_View {

	public function process(Vtiger_Request $request) {
		// CNK-DEM: If creating from quote without products, copy totals manually
		$quoteId = $request->get('quote_id');
		if ($quoteId) {
			global $adb;

			// Check if quote has products
			$productsCount = $adb->pquery(
				"SELECT COUNT(*) as count FROM vtiger_inventoryproductrel WHERE id = ?",
				array($quoteId)
			);
			$count = $adb->query_result($productsCount, 0, 'count');

			// If no products, get totals from quote
			if ($count == 0) {
				$quoteData = $adb->pquery(
					"SELECT subtotal, discount_amount, pre_tax_total, total, taxtype
					 FROM vtiger_quotes WHERE quoteid = ?",
					array($quoteId)
				);

				if ($adb->num_rows($quoteData) > 0) {
					// Store quote totals in request to be saved later
					$_SESSION['invoice_copy_quote_totals'] = array(
						'subtotal' => $adb->query_result($quoteData, 0, 'subtotal'),
						'discount_amount' => $adb->query_result($quoteData, 0, 'discount_amount'),
						'pre_tax_total' => $adb->query_result($quoteData, 0, 'pre_tax_total'),
						'total' => $adb->query_result($quoteData, 0, 'total'),
						'taxtype' => $adb->query_result($quoteData, 0, 'taxtype')
					);
				}
			}
		}

		parent::process($request);
	}
}