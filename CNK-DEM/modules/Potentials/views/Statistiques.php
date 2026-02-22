<?php

class Potentials_Statistiques_View extends Vtiger_Index_View {

	function __construct() {
		parent::__construct();
	}

	public function requiresPermission(Vtiger_Request $request) {
		$permissions = array();
		$permissions[] = array('module_parameter' => 'module', 'action' => 'DetailView');
		return $permissions;
	}

	function checkPermission(Vtiger_Request $request) {
		$moduleName = $request->getModule();
		$userPrivilegesModel = Users_Privileges_Model::getCurrentUserPrivilegesModel();
		$moduleModel = Vtiger_Module_Model::getInstance($moduleName);
		if (!$userPrivilegesModel->hasModulePermission($moduleModel->getId())) {
			throw new AppException(vtranslate('LBL_PERMISSION_DENIED'));
		}
		return true;
	}

	function preProcess(Vtiger_Request $request, $display = true) {
		parent::preProcess($request, $display);
	}

	protected function preProcessTplName(Vtiger_Request $request) {
		return 'ListViewPreProcess.tpl';
	}

	function process(Vtiger_Request $request) {
		$currentUser = Users_Record_Model::getCurrentUserModel();
		$isAdmin = ($currentUser->get('is_admin') === 'on');

		// Get active users for admin filter
		$activeUsers = array();
		if ($isAdmin) {
			$db = PearDatabase::getInstance();
			$result = $db->pquery(
				"SELECT id, first_name, last_name FROM vtiger_users WHERE status = 'Active' ORDER BY first_name, last_name",
				array()
			);
			while ($row = $db->fetchByAssoc($result)) {
				$activeUsers[] = array(
					'id' => $row['id'],
					'name' => trim($row['first_name'] . ' ' . $row['last_name']),
				);
			}
		}

		$viewer = $this->getViewer($request);
		$viewer->assign('MODULE_NAME', 'Potentials');
		$viewer->assign('IS_ADMIN', $isAdmin);
		$viewer->assign('CURRENT_USER_ID', $currentUser->getId());
		$viewer->assign('CURRENT_USER_NAME',
			trim($currentUser->get('first_name') . ' ' . $currentUser->get('last_name')));
		$viewer->assign('CURRENT_MONTH', date('n'));
		$viewer->assign('ACTIVE_USERS', $activeUsers);
		$viewer->view('Statistiques.tpl', 'Potentials');
	}

	function getHeaderScripts(Vtiger_Request $request) {
		$headerScriptInstances = parent::getHeaderScripts($request);
		$jsFileNames = array(
			'~libraries/jquery/jqplot/jquery.jqplot.min.js',
			'~libraries/jquery/jqplot/plugins/jqplot.barRenderer.min.js',
			'~libraries/jquery/jqplot/plugins/jqplot.pieRenderer.min.js',
			'~libraries/jquery/jqplot/plugins/jqplot.categoryAxisRenderer.min.js',
			'~libraries/jquery/jqplot/plugins/jqplot.pointLabels.min.js',
			'~libraries/jquery/jqplot/plugins/jqplot.highlighter.min.js',
			'~libraries/jquery/jqplot/plugins/jqplot.canvasTextRenderer.min.js',
			'~libraries/jquery/jqplot/plugins/jqplot.canvasAxisTickRenderer.min.js',
			'~libraries/jquery/jqplot/plugins/jqplot.canvasAxisLabelRenderer.min.js',
			'~libraries/jquery/jqplot/plugins/jqplot.dateAxisRenderer.min.js',
			'modules.Potentials.resources.Statistiques',
		);
		$jsScriptInstances = $this->checkAndConvertJsScripts($jsFileNames);
		$headerScriptInstances = array_merge($headerScriptInstances, $jsScriptInstances);
		return $headerScriptInstances;
	}

	function getHeaderCss(Vtiger_Request $request) {
		$parentCss = parent::getHeaderCss($request);
		$cssFileNames = array(
			'~libraries/jquery/jqplot/jquery.jqplot.min.css',
		);
		$cssInstances = $this->checkAndConvertCssStyles($cssFileNames);
		return array_merge($parentCss, $cssInstances);
	}
}
