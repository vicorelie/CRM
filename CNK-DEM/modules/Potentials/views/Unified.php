<?php
/*+**********************************************************************************
 * UnifiedView - Main unified tabbed view for Potentials
 ************************************************************************************/

class Potentials_Unified_View extends Vtiger_Index_View {

	function __construct() {
		parent::__construct();
	}

	function checkPermission(Vtiger_Request $request) {
		$moduleName = $request->getModule();
		$recordId = $request->get('record');

		$recordPermission = Users_Privileges_Model::isPermitted($moduleName, 'DetailView', $recordId);
		if(!$recordPermission) {
			throw new AppException(vtranslate('LBL_PERMISSION_DENIED'));
		}
		return true;
	}

	function preProcess(Vtiger_Request $request, $display = true) {
		parent::preProcess($request, $display);
	}

	function process(Vtiger_Request $request) {
		$recordId = $request->get('record');
		$moduleName = $request->getModule();

		$recordModel = Vtiger_Record_Model::getInstanceById($recordId, $moduleName);

		$viewer = $this->getViewer($request);
		$viewer->assign('RECORD', $recordModel);
		$viewer->assign('RECORD_ID', $recordId);
		$viewer->assign('MODULE_NAME', $moduleName);
		$viewer->assign('ACTIVE_TAB', $request->get('tab', 'details'));

		$viewer->view('UnifiedTabbedView.tpl', $moduleName);
	}

	/**
	 * Function to get the list of Script models to be included
	 */
	function getHeaderScripts(Vtiger_Request $request) {
		$headerScripts = parent::getHeaderScripts($request);
		return $headerScripts;
	}
}
