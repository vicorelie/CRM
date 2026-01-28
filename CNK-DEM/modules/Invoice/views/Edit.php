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
	// Custom field mapping from Quote is handled in Inventory_Edit_View parent class

	public function process(Vtiger_Request $request) {
		// Let parent handle everything including Quote -> Invoice field mapping
		parent::process($request);
	}
}