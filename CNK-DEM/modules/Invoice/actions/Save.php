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
		$recordId = $request->get('record');

		if ($recordId && $_REQUEST['action'] == 'SaveAjax') {
			// While saving Invoice record Line items quantities should not get updated
			// This is a dependency on the older code, where in Invoice save_module we decide wheather to update or not.
			$_REQUEST['action'] = 'InvoiceAjax';
		}

		$recordModel = parent::saveRecord($request);

		// CNK-DEM: If we stored quote totals in session, apply them now
		if (isset($_SESSION['invoice_copy_quote_totals']) && !empty($_SESSION['invoice_copy_quote_totals'])) {
			global $adb;
			$invoiceId = $recordModel->getId();
			$totals = $_SESSION['invoice_copy_quote_totals'];

			// Update invoice totals in database
			$adb->pquery("UPDATE vtiger_invoice SET
						  subtotal = ?,
						  discount_amount = ?,
						  pre_tax_total = ?,
						  total = ?,
						  taxtype = ?
						  WHERE invoiceid = ?",
				array(
					$totals['subtotal'],
					$totals['discount_amount'],
					$totals['pre_tax_total'],
					$totals['total'],
					$totals['taxtype'],
					$invoiceId
				)
			);

			// Clear session
			unset($_SESSION['invoice_copy_quote_totals']);
		}

		//Reverting the action value to $_REQUEST
		$_REQUEST['action'] = $request->get('action');
		return $recordModel;
	}
}
