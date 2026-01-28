<?php
/*+***********************************************************************************
 * The contents of this file are subject to the vtiger CRM Public License Version 1.0
 * ("License"); You may not use this file except in compliance with the License
 * The Original Code is:  vtiger CRM Open Source
 * The Initial Developer of the Original Code is vtiger.
 * Portions created by vtiger are Copyright (C) vtiger.
 * All Rights Reserved.
 *************************************************************************************/

Class Inventory_Edit_View extends Vtiger_Edit_View {

	public function process(Vtiger_Request $request) {
		$viewer = $this->getViewer($request);
		$moduleName = $request->getModule();
		$record = $request->get('record');
		$sourceRecord = $request->get('sourceRecord');
		$sourceModule = $request->get('sourceModule');
		if(empty($sourceRecord) && empty($sourceModule)) {
			$sourceRecord = $request->get('returnrecord');
			$sourceModule = $request->get('returnmodule');
		}
		$relatedProducts = null;
		$currencyInfo = null;

		$viewer->assign('MODE', '');
		$viewer->assign('IS_DUPLICATE', false);
		if ($request->has('totalProductCount')) {
			if($record) {
				$recordModel = Vtiger_Record_Model::getInstanceById($record);
			} else {
				$recordModel = Vtiger_Record_Model::getCleanInstance($moduleName);
			}
			$relatedProducts = $recordModel->convertRequestToProducts($request);
			$taxes = $relatedProducts[1]['final_details']['taxes'];
		} else if(!empty($record)  && $request->get('isDuplicate') == true) {
			$recordModel = Inventory_Record_Model::getInstanceById($record, $moduleName);
			$currencyInfo = $recordModel->getCurrencyInfo();
			$taxes = $recordModel->getProductTaxes();
			$relatedProducts = $recordModel->getProducts();

			//While Duplicating record, If the related record is deleted then we are removing related record info in record model
			$mandatoryFieldModels = $recordModel->getModule()->getMandatoryFieldModels();
			foreach ($mandatoryFieldModels as $fieldModel) {
				if ($fieldModel->isReferenceField()) {
					$fieldName = $fieldModel->get('name');
					if (Vtiger_Util_Helper::checkRecordExistance($recordModel->get($fieldName))) {
						$recordModel->set($fieldName, '');
					}
				}
			}
			$viewer->assign('IS_DUPLICATE', true);
		} elseif (!empty($record)) {
			$recordModel = Inventory_Record_Model::getInstanceById($record, $moduleName);
			$currencyInfo = $recordModel->getCurrencyInfo();
			$taxes = $recordModel->getProductTaxes();
			$relatedProducts = $recordModel->getProducts();
			$viewer->assign('RECORD_ID', $record);
			$viewer->assign('MODE', 'edit');
		} elseif (($request->get('salesorder_id') || $request->get('quote_id') || $request->get('invoice_id')) && ($moduleName == 'PurchaseOrder')) {
			if ($request->get('salesorder_id')) {
				$referenceId = $request->get('salesorder_id');
			} elseif ($request->get('invoice_id')) {
				$referenceId = $request->get('invoice_id');
			} else{
				$referenceId = $request->get('quote_id');
			}

			$parentRecordModel = Inventory_Record_Model::getInstanceById($referenceId);
			$currencyInfo = $parentRecordModel->getCurrencyInfo();

			$relatedProducts = $parentRecordModel->getProductsForPurchaseOrder();
			$taxes = $parentRecordModel->getProductTaxes();

			$recordModel = Vtiger_Record_Model::getCleanInstance($moduleName);
			$recordModel->setRecordFieldValues($parentRecordModel);

			// CUSTOM: Copier les champs personnalisés depuis Quote vers PurchaseOrder
			$sourceModuleName = $parentRecordModel->getModuleName();
			if ($sourceModuleName === 'Quotes') {
				// Mapping des champs: Quote -> PurchaseOrder
				$fieldMapping = array(
					'cf_1125' => 'cf_1245',  // TYPE DE FORFAIT
					'cf_1127' => 'cf_1239',  // TARIF FORFAIT
					'cf_1129' => 'cf_1241',  // SUPPLÉMENT FORFAIT
					'cf_1131' => 'cf_1253',  // DESCRIPTION FORFAIT
					'cf_1137' => 'cf_1243',  // TOTAL FORFAIT
					'cf_1133' => 'cf_1235',  // POURCENTAGE ACOMPTE FORFAIT
					'cf_1135' => 'cf_1237',  // POURCENTAGE SOLDE FORFAIT
					'cf_1139' => 'cf_1247',  // MONTANT ASSURANCE
					'cf_1141' => 'cf_1249',  // TARIF POUR 1000
					'cf_1143' => 'cf_1251',  // TARIF ASSURANCE
					'cf_1145' => 'cf_1255',  // DESCRIPTION ASSURANCE
					'cf_1055' => 'cf_1231',  // TOTAL ACOMPTE
					'cf_1057' => 'cf_1233',  // TOTAL SOLDE
					'prestataire' => 'prestataire',  // PRESTATAIRE
				);

				foreach ($fieldMapping as $sourceField => $targetField) {
					$value = $parentRecordModel->get($sourceField);
					if ($value !== null && $value !== '') {
						$recordModel->set($targetField, $value);
					}
				}
			}
		} elseif ($request->get('salesorder_id') || $request->get('quote_id')) {
			if ($request->get('salesorder_id')) {
				$referenceId = $request->get('salesorder_id');
			} else {
				$referenceId = $request->get('quote_id');
			}

			$parentRecordModel = Inventory_Record_Model::getInstanceById($referenceId);
			$currencyInfo = $parentRecordModel->getCurrencyInfo();
			$taxes = $parentRecordModel->getProductTaxes();
			$relatedProducts = $parentRecordModel->getProducts();
			$recordModel = Vtiger_Record_Model::getCleanInstance($moduleName);
			$recordModel->setRecordFieldValues($parentRecordModel);

			// CUSTOM: Copier les champs personnalisés depuis Quote vers SalesOrder/Invoice
			$sourceModuleName = $parentRecordModel->getModuleName();
			if ($sourceModuleName === 'Quotes' && $moduleName === 'SalesOrder') {
				// Mapping des champs: Quote -> SalesOrder
				$fieldMapping = array(
					'cf_1125' => 'cf_1186',  // TYPE DE FORFAIT
					'cf_1127' => 'cf_1180',  // TARIF FORFAIT
					'cf_1129' => 'cf_1182',  // SUPPLÉMENT FORFAIT
					'cf_1131' => 'cf_1188',  // DESCRIPTION FORFAIT
					'cf_1137' => 'cf_1184',  // TOTAL FORFAIT
					'cf_1133' => 'cf_1176',  // POURCENTAGE ACOMPTE FORFAIT
					'cf_1135' => 'cf_1178',  // POURCENTAGE SOLDE FORFAIT
					'cf_1139' => 'cf_1170',  // MONTANT ASSURANCE
					'cf_1141' => 'cf_1172',  // TARIF POUR 1000
					'cf_1143' => 'cf_1174',  // TARIF ASSURANCE
					'cf_1145' => 'cf_1190',  // DESCRIPTION ASSURANCE
					'cf_1055' => 'cf_1166',  // TOTAL ACOMPTE
					'cf_1057' => 'cf_1168',  // TOTAL SOLDE
					'prestataire' => 'prestataire',  // PRESTATAIRE
				);

				foreach ($fieldMapping as $sourceField => $targetField) {
					$value = $parentRecordModel->get($sourceField);
					if ($value !== null && $value !== '') {
						$recordModel->set($targetField, $value);
					}
				}
			} elseif ($sourceModuleName === 'Quotes' && $moduleName === 'Invoice') {
				// Mapping des champs: Quote -> Invoice
				$fieldMapping = array(
					'cf_1125' => 'cf_1277',  // TYPE DE FORFAIT
					'cf_1127' => 'cf_1279',  // TARIF FORFAIT
					'cf_1129' => 'cf_1281',  // SUPPLÉMENT FORFAIT
					'cf_1137' => 'cf_1283',  // TOTAL FORFAIT
					'cf_1139' => 'cf_1285',  // MONTANT ASSURANCE
					'cf_1143' => 'cf_1287',  // TARIF ASSURANCE
					'cf_1055' => 'cf_1289',  // TOTAL ACOMPTE TTC
					'cf_1057' => 'cf_1291',  // TOTAL SOLDE TTC
					'cf_1269' => 'cf_1305',  // TYPE DE DÉMÉNAGEMENT
				);

				// Calcul du montant total devis et reste à payer
				$acompteTTC = floatval($parentRecordModel->get('cf_1055') ?: 0);
				$soldeTTC = floatval($parentRecordModel->get('cf_1057') ?: 0);
				$montantTotalDevis = $acompteTTC + $soldeTTC;

				// Copy mapped fields
				foreach ($fieldMapping as $sourceField => $targetField) {
					$value = $parentRecordModel->get($sourceField);
					if ($value !== null && $value !== '') {
						$recordModel->set($targetField, $value);
					}
				}

				// Set additional calculated fields
				$recordModel->set('cf_1293', $montantTotalDevis);  // Reste à payer (initial)
				$recordModel->set('cf_1301', $montantTotalDevis);  // Montant total devis TTC
				$recordModel->set('cf_1304', $parentRecordModel->get('quote_no'));  // Numéro du devis

				// Set quote_id to link invoice to quote
				$recordModel->set('quote_id', $referenceId);
			}
		} else {
			$taxes = Inventory_Module_Model::getAllProductTaxes();
			$recordModel = Vtiger_Record_Model::getCleanInstance($moduleName);

			//The creation of Inventory record from action and Related list of product/service detailview the product/service details will calculated by following code
			if ($request->get('product_id') || $sourceModule === 'Products' || $request->get('productid')) {
				if($sourceRecord) {
					$productRecordModel = Products_Record_Model::getInstanceById($sourceRecord);
				} else if($request->get('product_id')) {
					$productRecordModel = Products_Record_Model::getInstanceById($request->get('product_id'));
				} else if($request->get('productid')) {
					$productRecordModel = Products_Record_Model::getInstanceById($request->get('productid'));
				}
				$relatedProducts = $productRecordModel->getDetailsForInventoryModule($recordModel);
			} elseif ($request->get('service_id') || $sourceModule === 'Services') {
				if($sourceRecord) {
					$serviceRecordModel = Services_Record_Model::getInstanceById($sourceRecord);
				} else {
					$serviceRecordModel = Services_Record_Model::getInstanceById($request->get('service_id'));
				}
				$relatedProducts = $serviceRecordModel->getDetailsForInventoryModule($recordModel);
			} elseif ($sourceRecord && in_array($sourceModule, array('Accounts', 'Contacts', 'Potentials', 'Vendors', 'PurchaseOrder'))) {
				$parentRecordModel = Vtiger_Record_Model::getInstanceById($sourceRecord, $sourceModule);
				$recordModel->setParentRecordData($parentRecordModel);
				if ($sourceModule !== 'PurchaseOrder') {
					$relatedProducts = $recordModel->getParentRecordRelatedLineItems($parentRecordModel);
				}
			} elseif ($sourceRecord && in_array($sourceModule, array('HelpDesk', 'Leads'))) {
				$parentRecordModel = Vtiger_Record_Model::getInstanceById($sourceRecord, $sourceModule);
				$relatedProducts = $recordModel->getParentRecordRelatedLineItems($parentRecordModel);
			}
		}

		$deductTaxes = $relatedProducts && isset($relatedProducts[1]['final_details']['deductTaxes']) ? $relatedProducts[1]['final_details']['deductTaxes'] : null;
		if (!$deductTaxes) {
			$deductTaxes = Inventory_TaxRecord_Model::getDeductTaxesList();
		}

		$taxType = $relatedProducts ? $relatedProducts[1]['final_details']['taxtype'] : null;
		$moduleModel = $recordModel->getModule();
		$fieldList = $moduleModel->getFields();
		$requestFieldList = array_intersect_key($request->getAllPurified(), $fieldList);

		//get the inventory terms and conditions
		$inventoryRecordModel = Inventory_Record_Model::getCleanInstance($moduleName);
		$termsAndConditions = $inventoryRecordModel->getInventoryTermsAndConditions();

		foreach($requestFieldList as $fieldName=>$fieldValue) {
			$fieldModel = $fieldList[$fieldName];
			if($fieldModel->isEditable()) {
				$recordModel->set($fieldName, $fieldModel->getDBInsertValue($fieldValue));
			}
		}
		$recordStructureInstance = Vtiger_RecordStructure_Model::getInstanceFromRecordModel($recordModel, Vtiger_RecordStructure_Model::RECORD_STRUCTURE_MODE_EDIT);

		$viewer->assign('VIEW_MODE', "fullForm");

		$isRelationOperation = $request->get('relationOperation');

		//if it is relation edit
		$viewer->assign('IS_RELATION_OPERATION', $isRelationOperation);
		if($isRelationOperation) {
			$viewer->assign('SOURCE_MODULE', $sourceModule);
			$viewer->assign('SOURCE_RECORD', $sourceRecord);
		}
		if(!empty($record)  && $request->get('isDuplicate') == true) {
			$viewer->assign('IS_DUPLICATE',true);
		} else {
			$viewer->assign('IS_DUPLICATE',false);
		}
		$currencies = Inventory_Module_Model::getAllCurrencies();
		$picklistDependencyDatasource = Vtiger_DependencyPicklist::getPicklistDependencyDatasource($moduleName);

		$recordStructure = $recordStructureInstance->getStructure();

		$viewer->assign('PICKIST_DEPENDENCY_DATASOURCE',Vtiger_Functions::jsonEncode($picklistDependencyDatasource));
		$viewer->assign('RECORD',$recordModel);
		$viewer->assign('RECORD_STRUCTURE_MODEL', $recordStructureInstance);
		$viewer->assign('RECORD_STRUCTURE', $recordStructure);
		$viewer->assign('MODULE', $moduleName);
		$viewer->assign('CURRENTDATE', date('Y-n-j'));
		$viewer->assign('USER_MODEL', Users_Record_Model::getCurrentUserModel());
		
		$taxRegions = $recordModel->getRegionsList();
		$defaultRegionInfo = $taxRegions[0];
		unset($taxRegions[0]);

		$viewer->assign('TAX_REGIONS', $taxRegions);
		$viewer->assign('DEFAULT_TAX_REGION_INFO', $defaultRegionInfo);
		$viewer->assign('INVENTORY_CHARGES', Inventory_Charges_Model::getInventoryCharges());
		$viewer->assign('RELATED_PRODUCTS', $relatedProducts);
		$viewer->assign('DEDUCTED_TAXES', $deductTaxes);
		$viewer->assign('TAXES', $taxes);
		$viewer->assign('TAX_TYPE', $taxType);
		$viewer->assign('CURRENCINFO', $currencyInfo);
		$viewer->assign('CURRENCIES', $currencies);
		$viewer->assign('TERMSANDCONDITIONS', $termsAndConditions);

		$productModuleModel = Vtiger_Module_Model::getInstance('Products');
		$viewer->assign('PRODUCT_ACTIVE', $productModuleModel->isActive());

		$serviceModuleModel = Vtiger_Module_Model::getInstance('Services');
		$viewer->assign('SERVICE_ACTIVE', $serviceModuleModel->isActive());

		// added to set the return values
		if ($request->get('returnview')) {
			$request->setViewerReturnValues($viewer);
		}

		if ($request->get('displayMode') == 'overlay') {
			$viewer->assign('SCRIPTS', $this->getOverlayHeaderScripts($request));
			echo @$viewer->view('OverlayEditView.tpl', $moduleName);
		} else {
			@$viewer->view('EditView.tpl', 'Inventory');
		}
	}

	/**
	 * Function to get the list of Script models to be included
	 * @param Vtiger_Request $request
	 * @return <Array> - List of Vtiger_JsScript_Model instances
	 */
	function getHeaderScripts(Vtiger_Request $request) {
		$headerScriptInstances = parent::getHeaderScripts($request);

		$moduleName = $request->getModule();
		$modulePopUpFile = 'modules.'.$moduleName.'.resources.Popup';
		$moduleEditFile = 'modules.'.$moduleName.'.resources.Edit';
		unset($headerScriptInstances[$modulePopUpFile]);
		unset($headerScriptInstances[$moduleEditFile]);

		$jsFileNames = array(
				'modules.Inventory.resources.Edit',
				'modules.Inventory.resources.Popup',
				'modules.PriceBooks.resources.Popup',
		);
		$jsFileNames[] = $moduleEditFile;
		$jsFileNames[] = $modulePopUpFile;
		$jsScriptInstances = $this->checkAndConvertJsScripts($jsFileNames);
		$headerScriptInstances = array_merge($headerScriptInstances, $jsScriptInstances);
		return $headerScriptInstances;
	}

	public function getOverlayHeaderScripts(Vtiger_Request $request) {
		$moduleName = $request->getModule();
		$modulePopUpFile = 'modules.'.$moduleName.'.resources.Popup';
		$moduleEditFile = 'modules.'.$moduleName.'.resources.Edit';

		$jsFileNames = array(
			'modules.Inventory.resources.Popup',
			'modules.PriceBooks.resources.Popup',
		);
		$jsFileNames[] = $moduleEditFile;
		$jsFileNames[] = $modulePopUpFile;
		$jsScriptInstances = $this->checkAndConvertJsScripts($jsFileNames);
		return $jsScriptInstances;
	}

}
