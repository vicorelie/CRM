<?php
/*+***********************************************************************************
 * The contents of this file are subject to the vtiger CRM Public License Version 1.0
 * ("License"); You may not use this file except in compliance with the License
 * The Original Code is:  vtiger CRM Open Source
 * The Initial Developer of the Original Code is vtiger.
 * Portions created by vtiger are Copyright (C) vtiger.
 * All Rights Reserved.
 *************************************************************************************/

class Calendar_ActivityReminder_Action extends Vtiger_Action_Controller{

	function __construct() {
		$this->exposeMethod('getReminders');
		$this->exposeMethod('postpone');
	}

	public function requiresPermission(Vtiger_Request $request){
		$permissions = parent::requiresPermission($request);

        if (vtlib_isModuleActive($request->getModule())) {
            $mode = $request->getMode();
            if (!empty($mode)) {
                switch ($mode) {
                    case 'getReminders':
                        $permissions[] = ['module_parameter' => 'module', 'action' => 'DetailView'];
                        break;

                    case 'postpone':
                        $permissions[] = ['module_parameter' => 'module', 'action' => 'EditView', 'record_parameter' => 'record'];
                        break;

                    default:
                        break;
                }
            }
        }

        return $permissions;
	}

	public function process(Vtiger_Request $request) {
		$mode = $request->getMode();
		if(!empty($mode) && $this->isMethodExposed($mode)) {
			$this->invokeExposedMethod($mode, $request);
			return;
		}

	}

	function getReminders(Vtiger_Request $request) {
		$recordModels = Calendar_Module_Model::getCalendarReminder();
		$records = array();
		$db = PearDatabase::getInstance();
		foreach($recordModels as $record) {
			$values = $record->getDisplayableValues();
			// Ajouter le lien vers l'affaire/prospect lié
			$relResult = $db->pquery(
				"SELECT sar.crmid, ce.setype, ce.label FROM vtiger_seactivityrel sar
				 INNER JOIN vtiger_crmentity ce ON ce.crmid = sar.crmid
				 WHERE sar.activityid = ? LIMIT 1",
				array($record->getId())
			);
			if ($db->num_rows($relResult) > 0) {
				$relModule = $db->query_result($relResult, 0, 'setype');
				$relId = $db->query_result($relResult, 0, 'crmid');
				$relLabel = $db->query_result($relResult, 0, 'label');
				$values['related_module'] = $relModule;
				$values['related_id'] = $relId;
				$values['related_label'] = html_entity_decode($relLabel, ENT_QUOTES, 'UTF-8');
			}
			$records[] = $values;
			$record->updateReminderStatus();
		}

		$response = new Vtiger_Response();
		$response->setResult($records);
		$response->emit();
	}

	function postpone(Vtiger_Request $request) {
			$recordId = $request->get('record');
			$module = $request->getModule();
			$recordModel = Vtiger_Record_Model::getInstanceById($recordId, $module);
			$recordModel->updateReminderStatus(0);
		}
	}
