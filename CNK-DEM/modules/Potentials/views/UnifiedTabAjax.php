<?php
/*+**********************************************************************************
 * UnifiedTabAjax View - AJAX handler for loading unified tab content
 ************************************************************************************/

class Potentials_UnifiedTabAjax_View extends Vtiger_Index_View {

	function __construct() {
		parent::__construct();
	}

	/**
	 * Disable preProcess for AJAX requests
	 */
	function preProcess(Vtiger_Request $request, $display = true) {
		return true;
	}

	/**
	 * Disable postProcess for AJAX requests
	 */
	function postProcess(Vtiger_Request $request) {
		return true;
	}

	/**
	 * Main process - render tab content
	 */
	function process(Vtiger_Request $request) {
		$mode = $request->get('mode');

		// Handle BDC (Bon de Commande) AJAX requests
		if ($mode === 'getBDCList') {
			$this->getBDCList($request);
			return;
		}
		if ($mode === 'createBDCFromQuote') {
			$this->createBDCFromQuote($request);
			return;
		}

		$recordId = $request->get('record');
		$tab = $request->get('tab', 'details');
		$moduleName = $request->getModule();

		if (empty($recordId)) {
			echo '<div class="alert alert-danger">Record ID manquant</div>';
			return;
		}

		try {
			$recordModel = Vtiger_Record_Model::getInstanceById($recordId, $moduleName);
			$viewer = $this->getViewer($request);
			$viewer->assign('RECORD', $recordModel);
			$viewer->assign('RECORD_ID', $recordId);
			$viewer->assign('MODULE_NAME', $moduleName);

			switch($tab) {
				case 'details':
					echo $this->renderDetailsTab($request, $viewer, $recordModel);
					break;

				case 'devis':
					error_log('[UnifiedTabAjax] Starting devis render for record ' . $recordId);
					$devisContent = $this->renderDevisTab($viewer, $recordModel);
					error_log('[UnifiedTabAjax] Devis content length: ' . strlen($devisContent));
					if (empty(trim($devisContent))) {
						echo '<div class="alert alert-warning">Devis template returned empty. Check error logs.</div>';
					} else {
						echo $devisContent;
					}
					break;

				case 'map':
					echo $this->renderMapTab($viewer, $recordModel);
					break;

				case 'inventaire':
					echo $this->renderInventaireTab($viewer, $recordModel);
					break;

				default:
					echo $this->renderDetailsTab($request, $viewer, $recordModel);
					break;
			}
		} catch (Exception $e) {
			echo '<div class="alert alert-danger">Erreur: ' . htmlspecialchars($e->getMessage()) . '</div>';
		}
	}

	/**
	 * Render the Details tab content
	 */
	private function renderDetailsTab($request, $viewer, $recordModel) {
		$moduleName = $request->getModule();
		$recordId = $recordModel->getId();

		$detailViewModel = Vtiger_DetailView_Model::getInstance($moduleName, $recordId);
		$recordStrucure = Vtiger_RecordStructure_Model::getInstanceFromRecordModel($recordModel, Vtiger_RecordStructure_Model::RECORD_STRUCTURE_MODE_DETAIL);
		$structuredValues = $recordStrucure->getStructure();

		$moduleModel = $recordModel->getModule();

		$viewer->assign('RECORD', $recordModel);
		$viewer->assign('RECORD_STRUCTURE', $structuredValues);
		$viewer->assign('BLOCK_LIST', $moduleModel->getBlocks());
		$viewer->assign('USER_MODEL', Users_Record_Model::getCurrentUserModel());
		$viewer->assign('MODULE_NAME', $moduleName);
		$viewer->assign('IS_AJAX_ENABLED', true);
		$viewer->assign('MODULE_MODEL', $moduleModel);
		$viewer->assign('VIEW', 'Detail');

		// Use the new styled template matching Devis tab design
		return $viewer->view('UnifiedDetailsTab.tpl', $moduleName, true);
	}

	/**
	 * Render the Devis (Quote) tab content
	 */
	private function renderDevisTab($viewer, $recordModel) {
		$db = PearDatabase::getInstance();
		$recordId = $recordModel->getId();
		$potentialName = $recordModel->get('potentialname');
		$contactId = $recordModel->get('contact_id');

		// Get current user ID
		$currentUser = Users_Record_Model::getCurrentUserModel();
		$currentUserId = $currentUser->getId();

		// Load existing quotes
		$quotes = [];
		$quotesQuery = "SELECT q.quoteid, q.quote_no, q.subject, q.quotestage, q.total,
						qcf.cf_1125, qcf.cf_1127, qcf.cf_1129, qcf.cf_1139,
						DATE_FORMAT(c.createdtime, '%d/%m/%Y') as created_date
						FROM vtiger_quotes q
						LEFT JOIN vtiger_quotescf qcf ON qcf.quoteid = q.quoteid
						INNER JOIN vtiger_crmentity c ON c.crmid = q.quoteid
						WHERE q.potentialid = ? AND c.deleted = 0
						ORDER BY c.createdtime DESC";
		$result = $db->pquery($quotesQuery, [$recordId]);
		while($row = $db->fetchByAssoc($result)) {
			$quotes[] = $row;
		}

		// Load products
		$products = [];
		$productsQuery = "SELECT p.productid as id, p.productname, p.unit_price,
						 COALESCE(pcf.cf_1051, 43) as pct_acompte,
						 COALESCE(pcf.cf_1053, 57) as pct_solde
						 FROM vtiger_products p
						 INNER JOIN vtiger_crmentity c ON c.crmid = p.productid
						 LEFT JOIN vtiger_productcf pcf ON pcf.productid = p.productid
						 WHERE c.deleted = 0 ORDER BY p.productname ASC";
		$result = $db->pquery($productsQuery, []);
		while($row = $db->fetchByAssoc($result)) {
			$products[] = [
				'id' => $row['id'],
				'productname' => $row['productname'],
				'unit_price' => $row['unit_price'],
				'pct_acompte' => floatval($row['pct_acompte']) ?: 43,
				'pct_solde' => floatval($row['pct_solde']) ?: 57
			];
		}

		// Load PDF templates
		$pdfTemplates = [];
		$pdfQuery = "SELECT templateid, filename, description FROM vtiger_pdfmaker
					 WHERE module = 'Quotes' AND deleted = 0
					 ORDER BY filename ASC";
		$result = $db->pquery($pdfQuery, []);
		while($row = $db->fetchByAssoc($result)) {
			$pdfTemplates[] = [
				'id' => $row['templateid'],
				'name' => $row['filename'],
				'description' => $row['description']
			];
		}

		// Get contact email
		$contactEmail = '';
		if ($contactId) {
			$emailResult = $db->pquery("SELECT email FROM vtiger_contactdetails WHERE contactid = ?", [$contactId]);
			if ($db->num_rows($emailResult) > 0) {
				$contactEmail = $db->query_result($emailResult, 0, 'email');
			}
		}

		// Get CSRF token
		include_once 'libraries/csrf-magic/csrf-magic.php';
		$csrfToken = function_exists('csrf_get_tokens') ? csrf_get_tokens() : '';

		// Calculate default validity date (today + 7 days)
		$defaultValidityDate = date('Y-m-d', strtotime('+7 days'));

		$viewer->assign('POTENTIAL_NAME', $potentialName);
		$viewer->assign('POTENTIAL_ID', $recordId);
		$viewer->assign('CONTACT_ID', $contactId);
		$viewer->assign('CONTACT_EMAIL', $contactEmail);
		$viewer->assign('CURRENT_USER_ID', $currentUserId);
		$viewer->assign('QUOTES', $quotes);
		$viewer->assign('PRODUCTS_JSON', json_encode($products));
		$viewer->assign('PDF_TEMPLATES', $pdfTemplates);
		$viewer->assign('CSRF_TOKEN', $csrfToken);
		$viewer->assign('DEFAULT_VALIDITY_DATE', $defaultValidityDate);

		error_log('[UnifiedTabAjax] Devis variables set, rendering template...');
		try {
			$content = $viewer->view('UnifiedDevisTab.tpl', 'Potentials', true);
			error_log('[UnifiedTabAjax] Template rendered, length: ' . strlen($content));
			return $content;
		} catch (Exception $e) {
			error_log('[UnifiedTabAjax] Template error: ' . $e->getMessage());
			return '<div class="alert alert-danger">Erreur template: ' . htmlspecialchars($e->getMessage()) . '</div>';
		}
	}

	/**
	 * Render the Google Map tab content
	 */
	private function renderMapTab($viewer, $recordModel) {
		$recordId = $recordModel->getId();

		// Addresses
		$adresseOrigine = $recordModel->get('cf_955');
		$villeOrigine = $recordModel->get('cf_933');
		$cpOrigine = $recordModel->get('cf_935');

		$adresseDestination = $recordModel->get('cf_957');
		$villeDestination = $recordModel->get('cf_949');
		$cpDestination = $recordModel->get('cf_951');

		// Build complete addresses
		$adresseCompletOrigine = trim(($adresseOrigine ? $adresseOrigine . ' ' : '') . ($cpOrigine ? $cpOrigine . ' ' : '') . $villeOrigine);
		$adresseCompletDestination = trim(($adresseDestination ? $adresseDestination . ' ' : '') . ($cpDestination ? $cpDestination . ' ' : '') . $villeDestination);

		$viewer->assign('POTENTIAL_NAME', $recordModel->get('potentialname'));
		$viewer->assign('ADRESSE_ORIGINE', $adresseCompletOrigine);
		$viewer->assign('ADRESSE_DESTINATION', $adresseCompletDestination);
		$viewer->assign('DISTANCE', $recordModel->get('cf_961'));

		return $viewer->view('UnifiedMapTab.tpl', 'Potentials', true);
	}

	/**
	 * Render the Inventaire tab content
	 */
	private function renderInventaireTab($viewer, $recordModel) {
		$viewer->assign('POTENTIAL_NAME', $recordModel->get('potentialname'));
		$viewer->assign('SAVED_VOLUME', $recordModel->get('cf_939') ?: 0);
		$viewer->assign('SAVED_VOLUME_FINAL', $recordModel->get('cf_1259') ?: 0);
		$viewer->assign('SAVED_BOXES', $recordModel->get('cf_963') ?: 0);

		// Get inventory JSON and decode HTML entities (VTiger escapes them)
		$inventoryJson = $recordModel->get('cf_969') ?: '{}';
		// Decode HTML entities like &quot; back to actual characters
		$inventoryJson = html_entity_decode($inventoryJson, ENT_QUOTES, 'UTF-8');
		// Base64 encode to safely pass through HTML without any escaping issues
		$viewer->assign('SAVED_INVENTORY_B64', base64_encode($inventoryJson));

		return $viewer->view('UnifiedInventaireTab.tpl', 'Potentials', true);
	}

	/**
	 * Get list of SalesOrders (BDC) for a Quote
	 */
	private function getBDCList(Vtiger_Request $request) {
		header('Content-Type: application/json');
		$db = PearDatabase::getInstance();
		$quoteId = $request->get('quote_id');

		if (empty($quoteId)) {
			echo json_encode(['success' => false, 'message' => 'Quote ID manquant']);
			return;
		}

		try {
			// Get SalesOrders linked to this quote
			$query = "SELECT so.salesorderid, so.salesorder_no, so.subject, so.sostatus, so.hdnGrandTotal,
					  DATE_FORMAT(c.createdtime, '%d/%m/%Y') as createdtime
					  FROM vtiger_salesorder so
					  INNER JOIN vtiger_crmentity c ON c.crmid = so.salesorderid
					  WHERE so.quote_id = ? AND c.deleted = 0
					  ORDER BY c.createdtime DESC";

			$result = $db->pquery($query, [$quoteId]);
			$salesorders = [];

			while ($row = $db->fetchByAssoc($result)) {
				$salesorders[] = $row;
			}

			echo json_encode([
				'success' => true,
				'data' => [
					'salesorders' => $salesorders,
					'quote_id' => $quoteId
				]
			]);

		} catch (Exception $e) {
			echo json_encode(['success' => false, 'message' => $e->getMessage()]);
		}
	}

	/**
	 * Create a SalesOrder (BDC) from a Quote
	 */
	private function createBDCFromQuote(Vtiger_Request $request) {
		header('Content-Type: application/json');
		$db = PearDatabase::getInstance();
		$quoteId = $request->get('quote_id');

		if (empty($quoteId)) {
			echo json_encode(['success' => false, 'message' => 'Quote ID manquant']);
			return;
		}

		try {
			// Get Quote data
			$quoteModel = Vtiger_Record_Model::getInstanceById($quoteId, 'Quotes');

			// Create new SalesOrder
			$salesOrderModel = Vtiger_Record_Model::getCleanInstance('SalesOrder');

			// Copy basic fields from Quote
			$salesOrderModel->set('subject', $quoteModel->get('subject'));
			$salesOrderModel->set('potential_id', $quoteModel->get('potential_id'));
			$salesOrderModel->set('contact_id', $quoteModel->get('contact_id'));
			$salesOrderModel->set('account_id', $quoteModel->get('account_id'));
			$salesOrderModel->set('quote_id', $quoteId);
			$salesOrderModel->set('sostatus', 'Created');
			$salesOrderModel->set('currency_id', $quoteModel->get('currency_id') ?: 1);
			$salesOrderModel->set('conversion_rate', $quoteModel->get('conversion_rate') ?: 1);
			$salesOrderModel->set('assigned_user_id', $quoteModel->get('assigned_user_id'));

			// Copy address fields
			$salesOrderModel->set('bill_street', $quoteModel->get('bill_street'));
			$salesOrderModel->set('bill_city', $quoteModel->get('bill_city'));
			$salesOrderModel->set('bill_state', $quoteModel->get('bill_state'));
			$salesOrderModel->set('bill_code', $quoteModel->get('bill_code'));
			$salesOrderModel->set('bill_country', $quoteModel->get('bill_country'));
			$salesOrderModel->set('ship_street', $quoteModel->get('ship_street'));
			$salesOrderModel->set('ship_city', $quoteModel->get('ship_city'));
			$salesOrderModel->set('ship_state', $quoteModel->get('ship_state'));
			$salesOrderModel->set('ship_code', $quoteModel->get('ship_code'));
			$salesOrderModel->set('ship_country', $quoteModel->get('ship_country'));

			// Copy financial fields
			$salesOrderModel->set('hdnSubTotal', $quoteModel->get('hdnSubTotal'));
			$salesOrderModel->set('hdnGrandTotal', $quoteModel->get('hdnGrandTotal'));
			$salesOrderModel->set('hdnTaxType', $quoteModel->get('hdnTaxType'));
			$salesOrderModel->set('txtAdjustment', $quoteModel->get('txtAdjustment'));
			$salesOrderModel->set('hdnDiscountPercent', $quoteModel->get('hdnDiscountPercent'));
			$salesOrderModel->set('hdnDiscountAmount', $quoteModel->get('hdnDiscountAmount'));
			$salesOrderModel->set('hdnS_H_Amount', $quoteModel->get('hdnS_H_Amount'));
			$salesOrderModel->set('pre_tax_total', $quoteModel->get('pre_tax_total'));

			// Save the SalesOrder
			$salesOrderModel->save();
			$salesOrderId = $salesOrderModel->getId();

			// Copy line items from Quote to SalesOrder
			$lineItemsQuery = "SELECT * FROM vtiger_inventoryproductrel WHERE id = ?";
			$lineItemsResult = $db->pquery($lineItemsQuery, [$quoteId]);

			while ($lineItem = $db->fetchByAssoc($lineItemsResult)) {
				$insertQuery = "INSERT INTO vtiger_inventoryproductrel
					(id, productid, sequence_no, quantity, listprice, comment, description,
					 incrementondel, tax1, tax2, tax3, discount_percent, discount_amount, lineitem_id)
					VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

				// Generate new lineitem_id
				$lineItemId = $db->getUniqueID('vtiger_inventoryproductrel');

				$db->pquery($insertQuery, [
					$salesOrderId,
					$lineItem['productid'],
					$lineItem['sequence_no'],
					$lineItem['quantity'],
					$lineItem['listprice'],
					$lineItem['comment'],
					$lineItem['description'],
					$lineItem['incrementondel'],
					$lineItem['tax1'],
					$lineItem['tax2'],
					$lineItem['tax3'],
					$lineItem['discount_percent'],
					$lineItem['discount_amount'],
					$lineItemId
				]);
			}

			// Copy product taxes
			$taxQuery = "SELECT * FROM vtiger_inventoryproductrel_tax WHERE id = ?";
			$taxResult = $db->pquery($taxQuery, [$quoteId]);
			while ($tax = $db->fetchByAssoc($taxResult)) {
				$insertTaxQuery = "INSERT INTO vtiger_inventoryproductrel_tax (id, productid, taxname, taxpercentage)
					VALUES (?, ?, ?, ?)";
				$db->pquery($insertTaxQuery, [$salesOrderId, $tax['productid'], $tax['taxname'], $tax['taxpercentage']]);
			}

			echo json_encode([
				'success' => true,
				'message' => 'Bon de commande créé avec succès',
				'salesorder_id' => $salesOrderId,
				'salesorder_no' => $salesOrderModel->get('salesorder_no')
			]);

		} catch (Exception $e) {
			error_log('[UnifiedTabAjax] createBDCFromQuote error: ' . $e->getMessage());
			echo json_encode(['success' => false, 'message' => $e->getMessage()]);
		}
	}
}
