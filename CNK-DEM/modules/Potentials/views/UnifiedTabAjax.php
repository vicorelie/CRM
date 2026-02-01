<?php
/*+**********************************************************************************
 * UnifiedTabAjax View - AJAX handler for loading unified tab content
 ************************************************************************************/

class Potentials_UnifiedTabAjax_View extends Vtiger_IndexAjax_View {

	function __construct() {
		parent::__construct();
		// Expose AJAX methods
		$this->exposeMethod('getBDCList');
		$this->exposeMethod('createBDCFromQuote');
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

		// Check if mode is an exposed method (BDC requests, etc.)
		if (!empty($mode) && $this->isMethodExposed($mode)) {
			$this->invokeExposedMethod($mode, $request);
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

		// Check if current user is admin
		$isAdmin = ($currentUser->get('is_admin') === 'on');

		// Get validation field (cf_1164) from Potential
		$validationValue = $recordModel->get('cf_1164');

		// Load existing quotes
		$quotes = [];
		$quotesQuery = "SELECT q.quoteid, q.quote_no, q.subject, q.quotestage, q.total,
						qcf.cf_1125, qcf.cf_1127, qcf.cf_1129, qcf.cf_1139, qcf.cf_1162,
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

		// Load Vendors (Prestataires)
		$vendors = [];
		$vendorsQuery = "SELECT v.vendorid, v.vendorname
						 FROM vtiger_vendor v
						 INNER JOIN vtiger_crmentity c ON c.crmid = v.vendorid
						 WHERE c.deleted = 0
						 ORDER BY v.vendorname ASC";
		$result = $db->pquery($vendorsQuery, []);
		while($row = $db->fetchByAssoc($result)) {
			$vendors[] = [
				'id' => $row['vendorid'],
				'name' => $row['vendorname']
			];
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
		$viewer->assign('VENDORS', $vendors);
		$viewer->assign('CSRF_TOKEN', $csrfToken);
		$viewer->assign('DEFAULT_VALIDITY_DATE', $defaultValidityDate);
		$viewer->assign('IS_ADMIN', $isAdmin);
		$viewer->assign('VALIDATION_VALUE', $validationValue);

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
	public function getBDCList(Vtiger_Request $request) {
		error_log('[UnifiedTabAjax] getBDCList called');
		header('Content-Type: application/json');
		$db = PearDatabase::getInstance();
		$quoteId = $request->get('quote_id');
		error_log('[UnifiedTabAjax] getBDCList quote_id: ' . $quoteId);

		if (empty($quoteId)) {
			error_log('[UnifiedTabAjax] getBDCList - Quote ID missing');
			echo json_encode(['success' => false, 'message' => 'Quote ID manquant']);
			return;
		}

		try {
			// Get SalesOrders linked to this quote
			$query = "SELECT so.salesorderid, so.salesorder_no, so.subject, so.sostatus, so.total as hdnGrandTotal,
					  DATE_FORMAT(c.createdtime, '%d/%m/%Y') as createdtime
					  FROM vtiger_salesorder so
					  INNER JOIN vtiger_crmentity c ON c.crmid = so.salesorderid
					  WHERE so.quoteid = ? AND c.deleted = 0
					  ORDER BY c.createdtime DESC";

			$result = $db->pquery($query, [$quoteId]);
			$salesorders = [];
			$numRows = $db->num_rows($result);
			error_log('[UnifiedTabAjax] getBDCList - Found ' . $numRows . ' salesorders');

			while ($row = $db->fetchByAssoc($result)) {
				$salesorders[] = $row;
			}

			$response = [
				'success' => true,
				'data' => [
					'salesorders' => $salesorders,
					'quote_id' => $quoteId
				]
			];
			error_log('[UnifiedTabAjax] getBDCList - Response: ' . json_encode($response));
			echo json_encode($response);

		} catch (Exception $e) {
			error_log('[UnifiedTabAjax] getBDCList error: ' . $e->getMessage());
			echo json_encode(['success' => false, 'message' => $e->getMessage()]);
		}
	}

	/**
	 * Create a SalesOrder (BDC) from a Quote
	 */
	public function createBDCFromQuote(Vtiger_Request $request) {
		header('Content-Type: application/json');
		$db = PearDatabase::getInstance();
		$quoteId = $request->get('quote_id');

		if (empty($quoteId)) {
			echo json_encode(['success' => false, 'message' => 'Quote ID manquant']);
			return;
		}

		try {
			// Get Quote data from model
			$quoteModel = Vtiger_Record_Model::getInstanceById($quoteId, 'Quotes');

			// Get Quote totals directly from database (more reliable)
			$quoteTotalsQuery = "SELECT q.total, q.subtotal, q.taxtype, q.discount_percent, q.discount_amount,
								 q.s_h_amount, q.adjustment, q.pre_tax_total, q.currency_id, q.conversion_rate
								 FROM vtiger_quotes q WHERE q.quoteid = ?";
			$quoteTotalsResult = $db->pquery($quoteTotalsQuery, [$quoteId]);
			$quoteTotals = $db->fetchByAssoc($quoteTotalsResult);

			// Get Contact address for billing
			$contactId = $quoteModel->get('contact_id');
			$billStreet = $billCity = $billState = $billCode = $billCountry = '';
			if ($contactId) {
				$contactAddressQuery = "SELECT mailingstreet, mailingcity, mailingstate, mailingzip, mailingcountry
									   FROM vtiger_contactaddress WHERE contactaddressid = ?";
				$contactResult = $db->pquery($contactAddressQuery, [$contactId]);
				if ($db->num_rows($contactResult) > 0) {
					$contactAddr = $db->fetchByAssoc($contactResult);
					$billStreet = $contactAddr['mailingstreet'];
					$billCity = $contactAddr['mailingcity'];
					$billState = $contactAddr['mailingstate'];
					$billCode = $contactAddr['mailingzip'];
					$billCountry = $contactAddr['mailingcountry'];
				}
			}

			// Create new SalesOrder
			$salesOrderModel = Vtiger_Record_Model::getCleanInstance('SalesOrder');

			// Copy basic fields from Quote
			$salesOrderModel->set('subject', $quoteModel->get('subject'));
			$salesOrderModel->set('potential_id', $quoteModel->get('potential_id'));
			$salesOrderModel->set('contact_id', $contactId);
			$salesOrderModel->set('account_id', $quoteModel->get('account_id'));
			$salesOrderModel->set('quote_id', $quoteId);
			$salesOrderModel->set('sostatus', 'Created');
			$salesOrderModel->set('currency_id', $quoteTotals['currency_id'] ?: 1);
			$salesOrderModel->set('conversion_rate', $quoteTotals['conversion_rate'] ?: 1);
			$salesOrderModel->set('assigned_user_id', $quoteModel->get('assigned_user_id'));

			// Set billing address from Contact
			$salesOrderModel->set('bill_street', $billStreet);
			$salesOrderModel->set('bill_city', $billCity);
			$salesOrderModel->set('bill_state', $billState);
			$salesOrderModel->set('bill_code', $billCode);
			$salesOrderModel->set('bill_country', $billCountry);

			// Copy shipping address from Quote
			$salesOrderModel->set('ship_street', $quoteModel->get('ship_street'));
			$salesOrderModel->set('ship_city', $quoteModel->get('ship_city'));
			$salesOrderModel->set('ship_state', $quoteModel->get('ship_state'));
			$salesOrderModel->set('ship_code', $quoteModel->get('ship_code'));
			$salesOrderModel->set('ship_country', $quoteModel->get('ship_country'));

			// Save the SalesOrder first
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

			// Update SalesOrder totals directly in database
			$updateTotalsQuery = "UPDATE vtiger_salesorder SET
				total = ?, subtotal = ?, taxtype = ?, discount_percent = ?, discount_amount = ?,
				s_h_amount = ?, adjustment = ?, pre_tax_total = ?
				WHERE salesorderid = ?";
			$db->pquery($updateTotalsQuery, [
				$quoteTotals['total'],
				$quoteTotals['subtotal'],
				$quoteTotals['taxtype'],
				$quoteTotals['discount_percent'],
				$quoteTotals['discount_amount'],
				$quoteTotals['s_h_amount'],
				$quoteTotals['adjustment'],
				$quoteTotals['pre_tax_total'],
				$salesOrderId
			]);

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
