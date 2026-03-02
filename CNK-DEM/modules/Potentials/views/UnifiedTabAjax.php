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
		$this->exposeMethod('getQuoteData');
		$this->exposeMethod('getSalesOrderData');
		$this->exposeMethod('getVendorAddress');
		$this->exposeMethod('createInvoiceFromSource');
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

				case 'odm':
					$currentUser = Users_Record_Model::getCurrentUserModel();
					if ($currentUser->get('is_admin') !== 'on') {
						echo '<div class="alert alert-danger">Accès réservé aux administrateurs</div>';
						break;
					}
					echo $this->renderODMTab($viewer, $recordModel);
					break;

				case 'facture':
					$currentUser = Users_Record_Model::getCurrentUserModel();
					if ($currentUser->get('is_admin') !== 'on') {
						echo '<div class="alert alert-danger">Accès réservé aux administrateurs</div>';
						break;
					}
					echo $this->renderFactureTab($viewer, $recordModel);
					break;

				case 'mail':
					echo $this->renderMailTab($viewer, $recordModel);
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

		// Get contact firstname/lastname/salutation
		$contactFirstname = '';
		$contactLastname = '';
		$contactOtherphone = '';
		$contactSalutation = '';
		$contactId = $recordModel->get('contact_id');
		if (!empty($contactId)) {
			try {
				$contactModel = Vtiger_Record_Model::getInstanceById($contactId, 'Contacts');
				if ($contactModel) {
					$contactFirstname = decode_html($contactModel->get('firstname') ?: '');
					$contactLastname = decode_html($contactModel->get('lastname') ?: '');
					$contactOtherphone = decode_html($contactModel->get('otherphone') ?: '');
					$contactSalutation = decode_html($contactModel->get('salutationtype') ?: '');
				}
			} catch (Exception $e) {}
		}
		// Get salutation picklist values
		$salutationValues = array();
		$adb = PearDatabase::getInstance();
		$result = $adb->pquery("SELECT salutationtype FROM vtiger_salutationtype WHERE presence=1 ORDER BY sortorderid", array());
		while ($row = $adb->fetch_array($result)) {
			$salutationValues[] = $row['salutationtype'];
		}
		$viewer->assign('CONTACT_FIRSTNAME', $contactFirstname);
		$viewer->assign('CONTACT_LASTNAME', $contactLastname);
		$viewer->assign('CONTACT_OTHERPHONE', $contactOtherphone);
		$viewer->assign('CONTACT_SALUTATION', $contactSalutation);
		$viewer->assign('SALUTATION_VALUES', $salutationValues);

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
		$viewer->assign('PDF_TEMPLATES_JSON', json_encode($pdfTemplates));
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
	 * Render the ODM (Bon de Commande) tab content
	 */
	private function renderODMTab($viewer, $recordModel) {
		$db = PearDatabase::getInstance();
		$recordId = $recordModel->getId();
		$contactId = $recordModel->get('contact_id');

		// Get current user
		$currentUser = Users_Record_Model::getCurrentUserModel();
		$currentUserId = $currentUser->getId();
		$isAdmin = ($currentUser->get('is_admin') === 'on');

		// Load only VALIDATED quotes (cf_1162 = '1')
		$validatedQuotes = [];
		$quotesQuery = "SELECT q.quoteid, q.quote_no, q.subject, q.quotestage, q.total,
						qcf.cf_1125, qcf.cf_1127, qcf.cf_1129, qcf.cf_1139, qcf.cf_1162,
						qcf.cf_1055, qcf.cf_1057, qcf.cf_1269,
						DATE_FORMAT(c.createdtime, '%d/%m/%Y') as created_date
						FROM vtiger_quotes q
						LEFT JOIN vtiger_quotescf qcf ON qcf.quoteid = q.quoteid
						INNER JOIN vtiger_crmentity c ON c.crmid = q.quoteid
						WHERE q.potentialid = ? AND c.deleted = 0 AND qcf.cf_1162 = '1'
						ORDER BY c.createdtime DESC";
		$result = $db->pquery($quotesQuery, [$recordId]);
		while($row = $db->fetchByAssoc($result)) {
			$validatedQuotes[] = $row;
		}

		// Load existing SalesOrders for this Potential with custom fields
		$salesOrders = [];
		$soQuery = "SELECT so.salesorderid, so.salesorder_no, so.subject, so.sostatus, so.total,
					socf.cf_1186, socf.cf_1180, socf.cf_1182, socf.cf_1184, socf.cf_1170,
					socf.cf_1166, socf.cf_1168,
					DATE_FORMAT(c.createdtime, '%d/%m/%Y') as created_date
					FROM vtiger_salesorder so
					LEFT JOIN vtiger_salesordercf socf ON socf.salesorderid = so.salesorderid
					INNER JOIN vtiger_crmentity c ON c.crmid = so.salesorderid
					WHERE so.potentialid = ? AND c.deleted = 0
					ORDER BY c.createdtime DESC";
		$result = $db->pquery($soQuery, [$recordId]);
		while($row = $db->fetchByAssoc($result)) {
			$salesOrders[] = $row;
		}

		// Load products for product search
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

		// Load PDF templates for SalesOrder (Bon de Commande)
		$pdfTemplates = [];
		$pdfQuery = "SELECT templateid, filename, description FROM vtiger_pdfmaker
					 WHERE module = 'SalesOrder' AND deleted = 0
					 ORDER BY filename ASC";
		$result = $db->pquery($pdfQuery, []);
		while($row = $db->fetchByAssoc($result)) {
			$pdfTemplates[] = [
				'id' => $row['templateid'],
				'name' => $row['filename'],
				'description' => $row['description']
			];
		}

		// Get CSRF token
		include_once 'libraries/csrf-magic/csrf-magic.php';
		$csrfToken = function_exists('csrf_get_tokens') ? csrf_get_tokens() : '';

		// Load CHARGEMENT and LIVRAISON data from Potential
		$potentialData = [
			// Dates
			'cf_1043' => $recordModel->get('cf_1043'), // Date déménagement chargement
			'cf_1045' => $recordModel->get('cf_1045'), // Période début
			'cf_1047' => $recordModel->get('cf_1047'), // Période fin
			'cf_1049' => $recordModel->get('cf_1049'), // Date déménagement livraison
			// Volume et Distance
			'cf_961' => $recordModel->get('cf_961'),   // Distance
			'cf_939' => $recordModel->get('cf_939'),   // Volume inventaire
			'cf_1259' => $recordModel->get('cf_1259'), // Volume final
			// CHARGEMENT
			'cf_955' => $recordModel->get('cf_955'),   // Adresse chargement
			'cf_933' => $recordModel->get('cf_933'),   // Ville chargement
			'cf_935' => $recordModel->get('cf_935'),   // Code postal chargement
			'cf_1097' => $recordModel->get('cf_1097'), // Type logement chargement
			'cf_1011' => $recordModel->get('cf_1011'), // Etage chargement
			'cf_1075' => $recordModel->get('cf_1075'), // Ascenseur chargement
			'cf_1019' => $recordModel->get('cf_1019'), // Escaliers chargement
			'cf_1067' => $recordModel->get('cf_1067'), // Transbordement chargement
			'cf_1023' => $recordModel->get('cf_1023'), // Distance portage chargement
			'cf_1091' => $recordModel->get('cf_1091'), // Demande stationnement chargement
			'cf_1071' => $recordModel->get('cf_1071'), // Passage fenêtre chargement
			'cf_1035' => $recordModel->get('cf_1035'), // Monte meuble chargement
			// LIVRAISON
			'cf_957' => $recordModel->get('cf_957'),   // Adresse livraison
			'cf_949' => $recordModel->get('cf_949'),   // Ville livraison
			'cf_951' => $recordModel->get('cf_951'),   // Code postal livraison
			'cf_1009' => $recordModel->get('cf_1009'), // Type logement livraison
			'cf_1013' => $recordModel->get('cf_1013'), // Etage livraison
			'cf_1077' => $recordModel->get('cf_1077'), // Ascenseur livraison
			'cf_1021' => $recordModel->get('cf_1021'), // Escaliers livraison
			'cf_1069' => $recordModel->get('cf_1069'), // Transbordement livraison
			'cf_1025' => $recordModel->get('cf_1025'), // Distance portage livraison
			'cf_1089' => $recordModel->get('cf_1089'), // Demande stationnement livraison
			'cf_1073' => $recordModel->get('cf_1073'), // Passage fenêtre livraison
			'cf_1037' => $recordModel->get('cf_1037'), // Monte meuble livraison
		];

		// Decode HTML entities to avoid double-encoding in Smarty (VTiger encodes values via get())
		foreach ($potentialData as $key => $value) {
			$potentialData[$key] = html_entity_decode($value, ENT_QUOTES, 'UTF-8');
		}

		$viewer->assign('POTENTIAL_ID', $recordId);
		$viewer->assign('CONTACT_ID', $contactId);
		$viewer->assign('CURRENT_USER_ID', $currentUserId);
		$viewer->assign('IS_ADMIN', $isAdmin);
		$viewer->assign('VALIDATED_QUOTES', $validatedQuotes);
		$viewer->assign('SALESORDERS', $salesOrders);
		$viewer->assign('PRODUCTS_JSON', json_encode($products));
		$viewer->assign('VENDORS', $vendors);
		$viewer->assign('CSRF_TOKEN', $csrfToken);
		$viewer->assign('POTENTIAL_DATA', $potentialData);
		$viewer->assign('PDF_TEMPLATES', $pdfTemplates);

		return $viewer->view('UnifiedODMTab.tpl', 'Potentials', true);
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
	 * Get Quote data for ODM tab display
	 */
	public function getQuoteData(Vtiger_Request $request) {
		header('Content-Type: application/json');
		$db = PearDatabase::getInstance();
		$quoteId = $request->get('quoteId');

		if (empty($quoteId)) {
			echo json_encode(['success' => false, 'error' => 'Quote ID manquant']);
			return;
		}

		try {
			// Get Quote via RecordModel (more reliable)
			$quoteModel = Vtiger_Record_Model::getInstanceById($quoteId, 'Quotes');

			if (!$quoteModel || !$quoteModel->getId()) {
				echo json_encode(['success' => false, 'error' => 'Devis non trouvé']);
				return;
			}

			// Build quote data from model
			$quoteData = [
				'quoteid' => $quoteModel->getId(),
				'quote_no' => $quoteModel->get('quote_no'),
				'subject' => $quoteModel->get('subject'),
				'total' => $quoteModel->get('hdnGrandTotal'),
				'subtotal' => $quoteModel->get('hdnSubTotal'),
				'createdtime' => date('d/m/Y', strtotime($quoteModel->get('createdtime'))),
				// Custom fields - Forfait
				'cf_1125' => $quoteModel->get('cf_1125'), // Type formule
				'cf_1269' => $quoteModel->get('cf_1269'), // Type déménagement
				'cf_1127' => $quoteModel->get('cf_1127'), // Tarif forfait
				'cf_1129' => $quoteModel->get('cf_1129'), // Supplément forfait
				'cf_1131' => $quoteModel->get('cf_1131'), // Description forfait
				'cf_1133' => $quoteModel->get('cf_1133'), // % acompte
				'cf_1135' => $quoteModel->get('cf_1135'), // % solde
				'cf_1137' => $quoteModel->get('cf_1137'), // Total forfait
				// Custom fields - Assurance
				'cf_1139' => $quoteModel->get('cf_1139'), // Montant assurance
				'cf_1141' => $quoteModel->get('cf_1141'), // Tarif pour 1000
				'cf_1143' => $quoteModel->get('cf_1143'), // Tarif assurance
				'cf_1145' => $quoteModel->get('cf_1145'), // Description assurance
				// Custom fields - Totals
				'cf_1055' => $quoteModel->get('cf_1055'), // Total acompte
				'cf_1057' => $quoteModel->get('cf_1057'), // Total solde
				'cf_1162' => $quoteModel->get('cf_1162'), // Validé
				// Prestataire
				'prestataire' => $quoteModel->get('prestataire'), // Vendor/Prestataire
				// Remise globale
				'discount_percent' => $quoteModel->get('hdnDiscountPercent'),
				'discount_amount' => $quoteModel->get('hdnDiscountAmount'),
			];

			// Get products from inventory with percentages
			$productsQuery = "SELECT ivp.productid, ivp.quantity, ivp.listprice, ivp.discount_percent,
							  ivp.discount_amount, ivp.comment, ivp.description, ivp.lineitem_id,
							  p.productname,
							  COALESCE(pcf.cf_1051, 43) as pct_acompte,
							  COALESCE(pcf.cf_1053, 57) as pct_solde,
							  (ivp.quantity * ivp.listprice - COALESCE(ivp.discount_amount, 0)
							   - (ivp.quantity * ivp.listprice * COALESCE(ivp.discount_percent, 0) / 100)) as netprice
							  FROM vtiger_inventoryproductrel ivp
							  LEFT JOIN vtiger_products p ON p.productid = ivp.productid
							  LEFT JOIN vtiger_productcf pcf ON pcf.productid = ivp.productid
							  WHERE ivp.id = ? AND ivp.productid > 0
							  ORDER BY ivp.sequence_no";
			$productsResult = $db->pquery($productsQuery, [$quoteId]);

			$products = [];
			while ($row = $db->fetchByAssoc($productsResult)) {
				$products[] = [
					'productid' => $row['productid'],
					'productname' => !empty($row['description']) ? $row['description'] : $row['productname'],
					'quantity' => floatval($row['quantity']),
					'listprice' => floatval($row['listprice']),
					'netprice' => floatval($row['netprice']),
					'discount_percent' => floatval($row['discount_percent']),
					'discount_amount' => floatval($row['discount_amount']),
					'pct_acompte' => floatval($row['pct_acompte']) ?: 43,
					'pct_solde' => floatval($row['pct_solde']) ?: 57
				];
			}

			$quoteData['products'] = $products;
			$quoteData['hdnSubTotal'] = floatval($quoteData['subtotal']);
			$quoteData['hdnGrandTotal'] = floatval($quoteData['total']);

			// Decode HTML entities from VTiger get() to preserve accents
			foreach ($quoteData as $key => $value) {
				if (is_string($value)) {
					$quoteData[$key] = html_entity_decode($value, ENT_QUOTES, 'UTF-8');
				}
			}

			echo json_encode(['success' => true, 'data' => $quoteData]);

		} catch (Exception $e) {
			error_log('[UnifiedTabAjax] getQuoteData error: ' . $e->getMessage());
			echo json_encode(['success' => false, 'error' => $e->getMessage()]);
		}
	}

	/**
	 * Get SalesOrder (BDC) data for editing in UnifiedODM tab
	 */
	public function getSalesOrderData(Vtiger_Request $request) {
		header('Content-Type: application/json');
		$db = PearDatabase::getInstance();
		$salesOrderId = $request->get('salesorder_id');

		if (empty($salesOrderId)) {
			echo json_encode(['success' => false, 'message' => 'SalesOrder ID manquant']);
			return;
		}

		try {
			// Use RecordModel to get data
			$soModel = Vtiger_Record_Model::getInstanceById($salesOrderId, 'SalesOrder');

			$soData = [
				'salesorderid' => $salesOrderId,
				'salesorder_no' => $soModel->get('salesorder_no'),
				'subject' => $soModel->get('subject'),
				'sostatus' => $soModel->get('sostatus'),
				'duedate' => $soModel->get('duedate'),
				'potential_id' => $soModel->get('potential_id'),
				'contact_id' => $soModel->get('contact_id'),
				'quote_id' => $soModel->get('quote_id'),
				'prestataire' => $soModel->get('prestataire'),
				'subtotal' => $soModel->get('hdnSubTotal'),
				'total' => $soModel->get('hdnGrandTotal'),
				// Custom fields - Forfait
				'cf_1186' => $soModel->get('cf_1186'), // Type de forfait
				'cf_1180' => $soModel->get('cf_1180'), // Tarif forfait
				'cf_1182' => $soModel->get('cf_1182'), // Supplément forfait
				'cf_1184' => $soModel->get('cf_1184'), // Total forfait
				// Custom fields - Assurance
				'cf_1170' => $soModel->get('cf_1170'), // Montant assurance
				'cf_1172' => $soModel->get('cf_1172'), // Tarif pour 1000
				'cf_1174' => $soModel->get('cf_1174'), // Tarif assurance calculé
				// Custom fields - Percentages and descriptions
				'cf_1176' => $soModel->get('cf_1176'), // % Acompte
				'cf_1178' => $soModel->get('cf_1178'), // % Solde
				'cf_1188' => $soModel->get('cf_1188'), // Description forfait
				'cf_1190' => $soModel->get('cf_1190'), // Description assurance
				// Custom fields - Totals
				'cf_1166' => $soModel->get('cf_1166'), // Total acompte
				'cf_1168' => $soModel->get('cf_1168'), // Total solde
				// Custom fields - Dates
				'cf_1309' => $soModel->get('cf_1309'), // Date chargement
				'cf_1310' => $soModel->get('cf_1310'), // Période début
				'cf_1311' => $soModel->get('cf_1311'), // Période fin
				'cf_1324' => $soModel->get('cf_1324'), // Date livraison
				// Custom fields - Volumes
				'cf_1349' => $soModel->get('cf_1349'), // Vol. final
				'cf_1350' => $soModel->get('cf_1350'), // Distance
				'cf_1351' => $soModel->get('cf_1351'), // Vol. inventaire
				// Custom fields - CHARGEMENT
				'cf_1312' => $soModel->get('cf_1312'), // Adresse chargement
				'cf_1313' => $soModel->get('cf_1313'), // Ville chargement
				'cf_1314' => $soModel->get('cf_1314'), // CP chargement
				'cf_1315' => $soModel->get('cf_1315'), // Type logement chargement
				'cf_1316' => $soModel->get('cf_1316'), // Etage chargement
				'cf_1317' => $soModel->get('cf_1317'), // Ascenseur chargement
				'cf_1318' => $soModel->get('cf_1318'), // Escaliers chargement
				'cf_1319' => $soModel->get('cf_1319'), // Transbordement chargement
				'cf_1320' => $soModel->get('cf_1320'), // Distance portage chargement
				'cf_1321' => $soModel->get('cf_1321'), // Demande stationnement chargement
				'cf_1322' => $soModel->get('cf_1322'), // Passage fenêtre chargement
				'cf_1323' => $soModel->get('cf_1323'), // Monte meuble chargement
				// Custom fields - LIVRAISON
				'cf_1325' => $soModel->get('cf_1325'), // Adresse livraison
				'cf_1326' => $soModel->get('cf_1326'), // Ville livraison
				'cf_1327' => $soModel->get('cf_1327'), // CP livraison
				'cf_1328' => $soModel->get('cf_1328'), // Type logement livraison
				'cf_1329' => $soModel->get('cf_1329'), // Etage livraison
				'cf_1330' => $soModel->get('cf_1330'), // Ascenseur livraison
				'cf_1331' => $soModel->get('cf_1331'), // Escaliers livraison
				'cf_1332' => $soModel->get('cf_1332'), // Transbordement livraison
				'cf_1333' => $soModel->get('cf_1333'), // Distance portage livraison
				'cf_1334' => $soModel->get('cf_1334'), // Demande stationnement livraison
				'cf_1335' => $soModel->get('cf_1335'), // Passage fenêtre livraison
				'cf_1336' => $soModel->get('cf_1336'), // Monte meuble livraison
				// Type de déménagement
				'cf_1352' => $soModel->get('cf_1352'), // Type de déménagement
				// Remise globale
				'discount_percent' => $soModel->get('hdnDiscountPercent'),
				'discount_amount' => $soModel->get('hdnDiscountAmount'),
			];

			// Get prestataire (vendor) email for PDF sending
			$prestataireId = $soModel->get('prestataire');
			$prestataireEmail = '';
			if (!empty($prestataireId)) {
				try {
					$vendorModel = Vtiger_Record_Model::getInstanceById($prestataireId, 'Vendors');
					$prestataireEmail = $vendorModel->get('email');
				} catch (Exception $e) {
					// Ignore
				}
			}
			$soData['prestataire_email'] = $prestataireEmail;

			// Get products from inventory with percentages
			$productsQuery = "SELECT ivp.productid, ivp.quantity, ivp.listprice, ivp.discount_percent,
							  ivp.discount_amount, ivp.comment, ivp.description, ivp.lineitem_id,
							  p.productname,
							  COALESCE(pcf.cf_1051, 43) as pct_acompte,
							  COALESCE(pcf.cf_1053, 57) as pct_solde,
							  (ivp.quantity * ivp.listprice - COALESCE(ivp.discount_amount, 0)
							   - (ivp.quantity * ivp.listprice * COALESCE(ivp.discount_percent, 0) / 100)) as netprice
							  FROM vtiger_inventoryproductrel ivp
							  LEFT JOIN vtiger_products p ON p.productid = ivp.productid
							  LEFT JOIN vtiger_productcf pcf ON pcf.productid = ivp.productid
							  WHERE ivp.id = ? AND ivp.productid > 0
							  ORDER BY ivp.sequence_no";
			$productsResult = $db->pquery($productsQuery, [$salesOrderId]);

			$products = [];
			while ($row = $db->fetchByAssoc($productsResult)) {
				$products[] = [
					'productid' => $row['productid'],
					'productname' => !empty($row['description']) ? $row['description'] : $row['productname'],
					'quantity' => floatval($row['quantity']),
					'listprice' => floatval($row['listprice']),
					'netprice' => floatval($row['netprice']),
					'discount_percent' => floatval($row['discount_percent']),
					'discount_amount' => floatval($row['discount_amount']),
					'pct_acompte' => floatval($row['pct_acompte']) ?: 43,
					'pct_solde' => floatval($row['pct_solde']) ?: 57
				];
			}

			$soData['products'] = $products;
			$soData['hdnSubTotal'] = floatval($soData['subtotal']);
			$soData['hdnGrandTotal'] = floatval($soData['total']);

			// Decode HTML entities from VTiger get() to preserve accents
			foreach ($soData as $key => $value) {
				if (is_string($value)) {
					$soData[$key] = html_entity_decode($value, ENT_QUOTES, 'UTF-8');
				}
			}

			echo json_encode(['success' => true, 'data' => $soData]);

		} catch (Exception $e) {
			error_log('[UnifiedTabAjax] getSalesOrderData error: ' . $e->getMessage());
			echo json_encode(['success' => false, 'error' => $e->getMessage()]);
		}
	}

	/**
	 * Get Vendor (Prestataire) address for billing
	 */
	public function getVendorAddress(Vtiger_Request $request) {
		header('Content-Type: application/json');
		$vendorId = $request->get('vendor_id');

		if (empty($vendorId)) {
			echo json_encode(['success' => false, 'error' => 'Vendor ID manquant']);
			return;
		}

		try {
			$vendorModel = Vtiger_Record_Model::getInstanceById($vendorId, 'Vendors');

			$addressData = [
				'street' => $vendorModel->get('street') ?: '',
				'city' => $vendorModel->get('city') ?: '',
				'state' => $vendorModel->get('state') ?: '',
				'postalcode' => $vendorModel->get('postalcode') ?: '',
				'country' => $vendorModel->get('country') ?: ''
			];

			echo json_encode(['success' => true, 'data' => $addressData]);

		} catch (Exception $e) {
			error_log('[UnifiedTabAjax] getVendorAddress error: ' . $e->getMessage());
			echo json_encode(['success' => false, 'error' => $e->getMessage()]);
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

			// Get Potential name for subject
			$potentialId = $quoteModel->get('potential_id');
			$potentialName = '';
			if ($potentialId) {
				try {
					$potentialModel = Vtiger_Record_Model::getInstanceById($potentialId, 'Potentials');
					$potentialName = $potentialModel->get('potentialname');
				} catch (Exception $e) {
					// Keep empty if potential not found
				}
			}

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

			// Get Prestataire (Vendor) address for billing if available
			$prestataireId = $quoteModel->get('prestataire');
			if ($prestataireId) {
				try {
					$vendorModel = Vtiger_Record_Model::getInstanceById($prestataireId, 'Vendors');
					$billStreet = $vendorModel->get('street');
					$billCity = $vendorModel->get('city');
					$billState = $vendorModel->get('state');
					$billCode = $vendorModel->get('postalcode');
					$billCountry = $vendorModel->get('country');
				} catch (Exception $e) {
					// Keep contact address if vendor not found
				}
			}

			// Create new SalesOrder
			$salesOrderModel = Vtiger_Record_Model::getCleanInstance('SalesOrder');

			// Set subject as "Ord-" + potential name
			$subject = $potentialName ? 'Ord-' . $potentialName : $quoteModel->get('subject');
			$salesOrderModel->set('subject', $subject);
			$salesOrderModel->set('potential_id', $potentialId);
			$salesOrderModel->set('contact_id', $contactId);
			$salesOrderModel->set('account_id', $quoteModel->get('account_id'));
			$salesOrderModel->set('quote_id', $quoteId);
			$salesOrderModel->set('sostatus', 'Created');
			$salesOrderModel->set('currency_id', $quoteTotals['currency_id'] ?: 1);
			$salesOrderModel->set('conversion_rate', $quoteTotals['conversion_rate'] ?: 1);
			$salesOrderModel->set('assigned_user_id', $quoteModel->get('assigned_user_id'));

			// Set billing address
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

			// Copy custom fields from Quote to SalesOrder (same mapping as Inventory/views/Edit.php)
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
				'cf_1269' => 'cf_1352',  // TYPE DE DÉMÉNAGEMENT
			);

			foreach ($fieldMapping as $sourceField => $targetField) {
				$value = $quoteModel->get($sourceField);
				if ($value !== null && $value !== '') {
					$salesOrderModel->set($targetField, $value);
				}
			}

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

	/**
	 * Render the Facture tab content (admin only)
	 */
	private function renderFactureTab($viewer, $recordModel) {
		$db = PearDatabase::getInstance();
		$recordId = $recordModel->getId();
		$contactId = $recordModel->get('contact_id');

		// Load all quotes for this Potential
		$quotes = [];
		$quoteIds = [];
		$quotesQuery = "SELECT q.quoteid, q.quote_no, q.subject, q.total,
						qcf.cf_1125, qcf.cf_1162, qcf.cf_1055, qcf.cf_1057,
						DATE_FORMAT(c.createdtime, '%d/%m/%Y') as created_date
						FROM vtiger_quotes q
						LEFT JOIN vtiger_quotescf qcf ON qcf.quoteid = q.quoteid
						INNER JOIN vtiger_crmentity c ON c.crmid = q.quoteid
						WHERE q.potentialid = ? AND c.deleted = 0
						ORDER BY c.createdtime DESC";
		$result = $db->pquery($quotesQuery, [$recordId]);
		while ($row = $db->fetchByAssoc($result)) {
			$quotes[] = $row;
			$quoteIds[] = $row['quoteid'];
		}

		// Load sales orders for this Potential
		$salesOrders = [];
		$soIds = [];
		$soQuery = "SELECT so.salesorderid, so.salesorder_no, so.subject, so.total, so.sostatus,
					socf.cf_1186,
					DATE_FORMAT(c.createdtime, '%d/%m/%Y') as created_date
					FROM vtiger_salesorder so
					LEFT JOIN vtiger_salesordercf socf ON socf.salesorderid = so.salesorderid
					INNER JOIN vtiger_crmentity c ON c.crmid = so.salesorderid
					WHERE so.potentialid = ? AND c.deleted = 0
					ORDER BY c.createdtime DESC";
		$result = $db->pquery($soQuery, [$recordId]);
		while ($row = $db->fetchByAssoc($result)) {
			$salesOrders[] = $row;
			$soIds[] = $row['salesorderid'];
		}

		// Load invoices linked to this Potential (via potential_id OR quote_id OR salesorderid)
		$invoices = [];
		$whereConditions = ["i.potential_id = ?"];
		$params = [$recordId];
		if (!empty($quoteIds)) {
			$placeholders = implode(',', array_fill(0, count($quoteIds), '?'));
			$whereConditions[] = "i.quote_id IN ($placeholders)";
			$params = array_merge($params, $quoteIds);
		}
		if (!empty($soIds)) {
			$placeholders = implode(',', array_fill(0, count($soIds), '?'));
			$whereConditions[] = "i.salesorderid IN ($placeholders)";
			$params = array_merge($params, $soIds);
		}
		$whereClause = implode(' OR ', $whereConditions);
		$invoicesQuery = "SELECT i.invoiceid, i.invoice_no, i.subject, i.total, i.invoicestatus,
						  i.quote_id, i.salesorderid, i.potential_id,
						  DATE_FORMAT(c.createdtime, '%d/%m/%Y') as created_date
						  FROM vtiger_invoice i
						  INNER JOIN vtiger_crmentity c ON c.crmid = i.invoiceid
						  WHERE ($whereClause) AND c.deleted = 0
						  ORDER BY c.createdtime DESC";
		$result = $db->pquery($invoicesQuery, $params);
		while ($row = $db->fetchByAssoc($result)) {
			$invoices[] = $row;
		}

		// Load Stripe payments for quotes
		$stripePayments = [];
		if (!empty($quoteIds)) {
			$placeholders = implode(',', array_fill(0, count($quoteIds), '?'));
			$paymentsQuery = "SELECT sp.id, sp.quote_id, sp.payment_type, sp.amount, sp.description,
							  sp.status, sp.invoice_id, sp.created_date, sp.paid_date
							  FROM vtiger_stripe_payments sp
							  WHERE sp.quote_id IN ($placeholders)
							  ORDER BY sp.created_date DESC";
			$result = $db->pquery($paymentsQuery, $quoteIds);
			while ($row = $db->fetchByAssoc($result)) {
				$stripePayments[] = $row;
			}
		}

		// Load PDF templates for Invoice module
		$invoicePdfTemplates = [];
		$pdfQuery = "SELECT templateid, filename FROM vtiger_pdfmaker
					 WHERE module = 'Invoice' AND deleted = 0
					 ORDER BY filename ASC";
		$result = $db->pquery($pdfQuery, []);
		while ($row = $db->fetchByAssoc($result)) {
			$invoicePdfTemplates[] = [
				'id' => $row['templateid'],
				'name' => $row['filename']
			];
		}

		$viewer->assign('POTENTIAL_ID', $recordId);
		$viewer->assign('CONTACT_ID', $contactId);
		$viewer->assign('QUOTES', $quotes);
		$viewer->assign('SALES_ORDERS', $salesOrders);
		$viewer->assign('INVOICES', $invoices);
		$viewer->assign('INVOICES_JSON', json_encode($invoices));
		$viewer->assign('STRIPE_PAYMENTS', $stripePayments);
		$viewer->assign('STRIPE_PAYMENTS_JSON', json_encode($stripePayments));
		$viewer->assign('INVOICE_PDF_TEMPLATES', $invoicePdfTemplates);
		$viewer->assign('INVOICE_PDF_TEMPLATES_JSON', json_encode($invoicePdfTemplates));

		return $viewer->view('UnifiedFactureTab.tpl', 'Potentials', true);
	}

	/**
	 * Create an Invoice from a Quote or SalesOrder (AJAX)
	 */
	public function createInvoiceFromSource(Vtiger_Request $request) {
		$db = PearDatabase::getInstance();
		$currentUser = Users_Record_Model::getCurrentUserModel();

		// Admin check
		if ($currentUser->get('is_admin') !== 'on') {
			echo json_encode(['success' => false, 'error' => 'Accès réservé aux administrateurs']);
			return;
		}

		$sourceId = intval($request->get('source_id'));
		$sourceModule = $request->get('source_module'); // 'Quotes' or 'SalesOrder'
		$potentialId = intval($request->get('potential_id'));

		if (!$sourceId || !in_array($sourceModule, ['Quotes', 'SalesOrder'])) {
			echo json_encode(['success' => false, 'error' => 'Paramètres invalides']);
			return;
		}

		try {
			$userId = $currentUser->getId();

			if ($sourceModule === 'Quotes') {
				$invoiceId = $this->_createInvoiceFromQuote($db, $sourceId, $potentialId, $userId);
			} else {
				$invoiceId = $this->_createInvoiceFromSalesOrder($db, $sourceId, $potentialId, $userId);
			}

			if (!$invoiceId) {
				echo json_encode(['success' => false, 'error' => 'Erreur lors de la création de la facture']);
				return;
			}

			// Fetch the created invoice data to return to JS
			$invResult = $db->pquery(
				"SELECT i.invoiceid, i.invoice_no, i.subject, i.total, i.invoicestatus,
				 i.quote_id, i.salesorderid, i.potential_id,
				 DATE_FORMAT(c.createdtime, '%d/%m/%Y') as created_date
				 FROM vtiger_invoice i
				 INNER JOIN vtiger_crmentity c ON c.crmid = i.invoiceid
				 WHERE i.invoiceid = ?", [$invoiceId]
			);
			$invoice = $db->fetchByAssoc($invResult);

			echo json_encode(['success' => true, 'invoice' => $invoice]);

		} catch (Exception $e) {
			echo json_encode(['success' => false, 'error' => $e->getMessage()]);
		}
	}

	/**
	 * Create an Invoice from a Quote
	 */
	private function _createInvoiceFromQuote($db, $quoteId, $potentialId, $userId) {
		// Fetch quote data (including discount/tax fields)
		$quoteResult = $db->pquery(
			"SELECT q.quoteid, q.quote_no, q.subject, q.contactid, q.accountid,
			 q.total, q.subtotal, q.discount_percent, q.discount_amount,
			 q.s_h_amount, q.adjustment, q.taxtype, q.pre_tax_total,
			 q.currency_id, q.potentialid,
			 ce.smownerid as assigned_user_id,
			 qcf.cf_1055 as acompte_ttc, qcf.cf_1057 as solde_ttc,
			 qcf.cf_1125 as type_forfait, qcf.cf_1127 as tarif_forfait,
			 qcf.cf_1129 as supplement_forfait, qcf.cf_1137 as total_forfait,
			 qcf.cf_1139 as montant_assurance, qcf.cf_1143 as tarif_assurance,
			 qcf.cf_1269 as type_demenagement
			 FROM vtiger_quotes q
			 LEFT JOIN vtiger_crmentity ce ON ce.crmid = q.quoteid
			 LEFT JOIN vtiger_quotescf qcf ON q.quoteid = qcf.quoteid
			 WHERE q.quoteid = ?", [$quoteId]
		);

		if ($db->num_rows($quoteResult) == 0) {
			throw new Exception('Devis non trouvé');
		}

		$quote = $db->fetch_array($quoteResult);
		$assignedUserId = $quote['assigned_user_id'] ?: $userId;
		$potId = $potentialId ?: ($quote['potentialid'] ?: null);

		// Generate invoice number
		$invoiceNo = $this->_generateInvoiceNumber($db);

		// Get next CRM ID
		$invoiceId = $this->_getNextCrmId($db);

		// Calculate amounts
		$total = floatval($quote['total'] ?? 0);
		$subtotal = floatval($quote['subtotal'] ?? 0);
		$acompteTTC = floatval($quote['acompte_ttc'] ?? 0);
		$soldeTTC = floatval($quote['solde_ttc'] ?? 0);

		$now = date('Y-m-d H:i:s');
		$invoiceDate = date('Y-m-d');
		$dueDate = date('Y-m-d', strtotime('+30 days'));
		$invoiceLabel = $quote['subject'] ?: ('Facture ' . $quote['quote_no']);
		// Replace Dev- prefix with Fac-
		if (strpos($invoiceLabel, 'Dev-') === 0) {
			$invoiceLabel = 'Fac-' . substr($invoiceLabel, 4);
		}

		// Create vtiger_crmentity
		$db->pquery(
			"INSERT INTO vtiger_crmentity (crmid, smcreatorid, smownerid, modifiedby, setype, description, createdtime, modifiedtime, presence, deleted, label)
			 VALUES (?, ?, ?, ?, 'Invoice', ?, ?, ?, 1, 0, ?)",
			[$invoiceId, $userId, $assignedUserId, $userId, 'Facture générée depuis devis ' . $quote['quote_no'], $now, $now, $invoiceLabel]
		);

		// Create vtiger_invoice (including discount, tax, shipping, adjustment)
		$db->pquery(
			"INSERT INTO vtiger_invoice (invoiceid, invoice_no, subject, contactid, invoicedate, duedate,
			 invoicestatus, accountid, subtotal, total, received, balance, potential_id, quote_id,
			 taxtype, discount_percent, discount_amount, s_h_amount, adjustment, pre_tax_total, currency_id)
			 VALUES (?, ?, ?, ?, ?, ?, 'Created', ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
			[$invoiceId, $invoiceNo, $invoiceLabel, $quote['contactid'],
			 $invoiceDate, $dueDate, $quote['accountid'] ?: null,
			 $subtotal, $total, $total, $potId, $quoteId,
			 $quote['taxtype'] ?: 'individual',
			 $quote['discount_percent'] ?: null,
			 $quote['discount_amount'] ?: null,
			 $quote['s_h_amount'] ?: 0,
			 $quote['adjustment'] ?: 0,
			 $quote['pre_tax_total'] ?: $subtotal,
			 $quote['currency_id'] ?: 1]
		);

		// Calculate TVA amount
		$preTaxTotal = floatval($quote['pre_tax_total'] ?? $subtotal);
		$tvaAmount = $total - $preTaxTotal;

		// Create vtiger_invoicecf with custom fields
		$db->pquery(
			"INSERT INTO vtiger_invoicecf (invoiceid, cf_1277, cf_1279, cf_1281, cf_1283, cf_1285, cf_1287,
			 cf_1289, cf_1291, cf_1301, cf_1304, cf_1305, cf_1396)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
			[$invoiceId,
			 $quote['type_forfait'] ?? '', $quote['tarif_forfait'] ?? 0,
			 $quote['supplement_forfait'] ?? 0, $quote['total_forfait'] ?? 0,
			 $quote['montant_assurance'] ?? 0, $quote['tarif_assurance'] ?? 0,
			 $acompteTTC, $soldeTTC, $total,
			 $quote['quote_no'] ?? '', $quote['type_demenagement'] ?? '',
			 $tvaAmount]
		);

		// Copy billing address
		$this->_copyBillingAddress($db, $quoteId, $invoiceId, 'vtiger_quotesbillads', 'quotebilladdressid');

		// Copy shipping address
		$this->_copyShippingAddress($db, $quoteId, $invoiceId, 'vtiger_quotesshipads', 'quoteshipaddressid');

		// Create relationships
		$db->pquery("INSERT INTO vtiger_crmentityrel (crmid, module, relcrmid, relmodule) VALUES (?, 'Invoice', ?, 'Quotes')", [$invoiceId, $quoteId]);
		if ($potId) {
			$db->pquery("INSERT INTO vtiger_crmentityrel (crmid, module, relcrmid, relmodule) VALUES (?, 'Potentials', ?, 'Invoice')", [$potId, $invoiceId]);
		}

		// Copy products from quote
		$this->_copyProductLines($db, $quoteId, $invoiceId);

		return $invoiceId;
	}

	/**
	 * Create an Invoice from a Sales Order
	 */
	private function _createInvoiceFromSalesOrder($db, $soId, $potentialId, $userId) {
		// Fetch SO data (including discount/tax fields and custom fields)
		$soResult = $db->pquery(
			"SELECT so.salesorderid, so.salesorder_no, so.subject, so.contactid, so.accountid,
			 so.total, so.subtotal, so.discount_percent, so.discount_amount,
			 so.s_h_amount, so.adjustment, so.taxtype, so.pre_tax_total,
			 so.currency_id, so.potentialid, so.quoteid as quote_id,
			 ce.smownerid as assigned_user_id,
			 socf.cf_1166 as acompte_ttc, socf.cf_1168 as solde_ttc,
			 socf.cf_1186 as type_forfait, socf.cf_1180 as tarif_forfait,
			 socf.cf_1182 as supplement_forfait, socf.cf_1184 as total_forfait,
			 socf.cf_1170 as montant_assurance, socf.cf_1174 as tarif_assurance,
			 socf.cf_1352 as type_demenagement
			 FROM vtiger_salesorder so
			 LEFT JOIN vtiger_crmentity ce ON ce.crmid = so.salesorderid
			 LEFT JOIN vtiger_salesordercf socf ON so.salesorderid = socf.salesorderid
			 WHERE so.salesorderid = ?", [$soId]
		);

		if ($db->num_rows($soResult) == 0) {
			throw new Exception('ODM non trouvé');
		}

		$so = $db->fetch_array($soResult);
		$assignedUserId = $so['assigned_user_id'] ?: $userId;
		$potId = $potentialId ?: ($so['potentialid'] ?: null);

		$invoiceNo = $this->_generateInvoiceNumber($db);
		$invoiceId = $this->_getNextCrmId($db);

		$total = floatval($so['total'] ?? 0);
		$subtotal = floatval($so['subtotal'] ?? 0);
		$acompteTTC = floatval($so['acompte_ttc'] ?? 0);
		$soldeTTC = floatval($so['solde_ttc'] ?? 0);

		// Get linked quote_no if SO has a quote_id
		$quoteNo = '';
		$quoteId = $so['quote_id'] ?? null;
		if ($quoteId) {
			$qnResult = $db->pquery("SELECT quote_no FROM vtiger_quotes WHERE quoteid = ?", [$quoteId]);
			if ($db->num_rows($qnResult) > 0) {
				$quoteNo = $db->query_result($qnResult, 0, 'quote_no');
			}
		}

		$now = date('Y-m-d H:i:s');
		$invoiceDate = date('Y-m-d');
		$dueDate = date('Y-m-d', strtotime('+30 days'));
		$invoiceLabel = $so['subject'] ?: ('Facture ' . $so['salesorder_no']);
		// Replace Ord- prefix with Fac-
		if (strpos($invoiceLabel, 'Ord-') === 0) {
			$invoiceLabel = 'Fac-' . substr($invoiceLabel, 4);
		}

		// Create vtiger_crmentity
		$db->pquery(
			"INSERT INTO vtiger_crmentity (crmid, smcreatorid, smownerid, modifiedby, setype, description, createdtime, modifiedtime, presence, deleted, label)
			 VALUES (?, ?, ?, ?, 'Invoice', ?, ?, ?, 1, 0, ?)",
			[$invoiceId, $userId, $assignedUserId, $userId, 'Facture générée depuis ODM ' . $so['salesorder_no'], $now, $now, $invoiceLabel]
		);

		// Create vtiger_invoice (including discount, tax, shipping, adjustment, quote_id)
		$db->pquery(
			"INSERT INTO vtiger_invoice (invoiceid, invoice_no, subject, contactid, invoicedate, duedate,
			 invoicestatus, accountid, subtotal, total, received, balance, potential_id, salesorderid, quote_id,
			 taxtype, discount_percent, discount_amount, s_h_amount, adjustment, pre_tax_total, currency_id)
			 VALUES (?, ?, ?, ?, ?, ?, 'Created', ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
			[$invoiceId, $invoiceNo, $invoiceLabel, $so['contactid'],
			 $invoiceDate, $dueDate, $so['accountid'] ?: null,
			 $subtotal, $total, $total, $potId, $soId, $quoteId ?: null,
			 $so['taxtype'] ?: 'individual',
			 $so['discount_percent'] ?: null,
			 $so['discount_amount'] ?: null,
			 $so['s_h_amount'] ?: 0,
			 $so['adjustment'] ?: 0,
			 $so['pre_tax_total'] ?: $subtotal,
			 $so['currency_id'] ?: 1]
		);

		// Calculate TVA amount
		$preTaxTotal = floatval($so['pre_tax_total'] ?? $subtotal);
		$tvaAmount = $total - $preTaxTotal;

		// Create vtiger_invoicecf with all custom fields (same mapping as quote->invoice)
		$db->pquery(
			"INSERT INTO vtiger_invoicecf (invoiceid, cf_1277, cf_1279, cf_1281, cf_1283, cf_1285, cf_1287,
			 cf_1289, cf_1291, cf_1301, cf_1304, cf_1305, cf_1396)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
			[$invoiceId,
			 $so['type_forfait'] ?? '', $so['tarif_forfait'] ?? 0,
			 $so['supplement_forfait'] ?? 0, $so['total_forfait'] ?? 0,
			 $so['montant_assurance'] ?? 0, $so['tarif_assurance'] ?? 0,
			 $acompteTTC, $soldeTTC, $total,
			 $quoteNo, $so['type_demenagement'] ?? '',
			 $tvaAmount]
		);

		// Copy billing address from SO
		$this->_copyBillingAddress($db, $soId, $invoiceId, 'vtiger_sobillads', 'sobilladdressid');

		// Copy shipping address from SO
		$this->_copyShippingAddress($db, $soId, $invoiceId, 'vtiger_soshipads', 'soshipaddressid');

		// Create relationships
		$db->pquery("INSERT INTO vtiger_crmentityrel (crmid, module, relcrmid, relmodule) VALUES (?, 'Invoice', ?, 'SalesOrder')", [$invoiceId, $soId]);
		if ($potId) {
			$db->pquery("INSERT INTO vtiger_crmentityrel (crmid, module, relcrmid, relmodule) VALUES (?, 'Potentials', ?, 'Invoice')", [$potId, $invoiceId]);
		}

		// Copy products from SO
		$this->_copyProductLines($db, $soId, $invoiceId);

		return $invoiceId;
	}

	/**
	 * Generate the next invoice number using VTiger's numbering system
	 */
	private function _generateInvoiceNumber($db) {
		$numResult = $db->pquery(
			"SELECT prefix, cur_id FROM vtiger_modentity_num WHERE semodule = 'Invoice' AND active = 1", []
		);

		if ($db->num_rows($numResult) > 0) {
			$prefix = $db->query_result($numResult, 0, 'prefix');
			$curId = intval($db->query_result($numResult, 0, 'cur_id'));
			$newId = $curId + 1;
			$invoiceNo = $prefix . $newId;
			$db->pquery("UPDATE vtiger_modentity_num SET cur_id = ? WHERE semodule = 'Invoice' AND active = 1", [$newId]);
		} else {
			$maxNoResult = $db->pquery("SELECT MAX(invoiceid) as max_id FROM vtiger_invoice", []);
			$maxNo = $db->query_result($maxNoResult, 0, 'max_id') ?: 0;
			$invoiceNo = 'FACTURE' . ($maxNo + 1);
		}

		return $invoiceNo;
	}

	/**
	 * Get next available CRM ID
	 */
	private function _getNextCrmId($db) {
		$seqResult = $db->pquery("SELECT MAX(id) as current_id FROM vtiger_crmentity_seq", []);
		$currentSeq = intval($db->query_result($seqResult, 0, 'current_id')) ?: 0;

		$maxIdResult = $db->pquery("SELECT MAX(crmid) as max_id FROM vtiger_crmentity", []);
		$maxCrmId = intval($db->query_result($maxIdResult, 0, 'max_id')) ?: 0;

		$newId = max($currentSeq, $maxCrmId) + 1;
		$db->pquery("INSERT INTO vtiger_crmentity_seq (id) VALUES (?)", [$newId]);

		return $newId;
	}

	/**
	 * Copy billing address from source to invoice
	 */
	private function _copyBillingAddress($db, $sourceId, $invoiceId, $sourceTable, $sourceKey) {
		$result = $db->pquery(
			"SELECT bill_street, bill_city, bill_state, bill_code, bill_country, bill_pobox
			 FROM $sourceTable WHERE $sourceKey = ?", [$sourceId]
		);

		if ($db->num_rows($result) > 0) {
			$row = $db->fetch_array($result);
			$db->pquery(
				"INSERT INTO vtiger_invoicebillads (invoicebilladdressid, bill_street, bill_city, bill_state, bill_code, bill_country, bill_pobox)
				 VALUES (?, ?, ?, ?, ?, ?, ?)",
				[$invoiceId, $row['bill_street'] ?? '', $row['bill_city'] ?? '', $row['bill_state'] ?? '',
				 $row['bill_code'] ?? '', $row['bill_country'] ?? '', $row['bill_pobox'] ?? '']
			);
		} else {
			$db->pquery("INSERT INTO vtiger_invoicebillads (invoicebilladdressid) VALUES (?)", [$invoiceId]);
		}
	}

	/**
	 * Copy shipping address from source to invoice
	 */
	private function _copyShippingAddress($db, $sourceId, $invoiceId, $sourceTable, $sourceKey) {
		$result = $db->pquery(
			"SELECT ship_street, ship_city, ship_state, ship_code, ship_country, ship_pobox
			 FROM $sourceTable WHERE $sourceKey = ?", [$sourceId]
		);

		if ($db->num_rows($result) > 0) {
			$row = $db->fetch_array($result);
			$db->pquery(
				"INSERT INTO vtiger_invoiceshipads (invoiceshipaddressid, ship_street, ship_city, ship_state, ship_code, ship_country, ship_pobox)
				 VALUES (?, ?, ?, ?, ?, ?, ?)",
				[$invoiceId, $row['ship_street'] ?? '', $row['ship_city'] ?? '', $row['ship_state'] ?? '',
				 $row['ship_code'] ?? '', $row['ship_country'] ?? '', $row['ship_pobox'] ?? '']
			);
		} else {
			$db->pquery("INSERT INTO vtiger_invoiceshipads (invoiceshipaddressid) VALUES (?)", [$invoiceId]);
		}
	}

	/**
	 * Copy product lines from source (quote or SO) to invoice
	 */
	private function _copyProductLines($db, $sourceId, $invoiceId) {
		$prodResult = $db->pquery(
			"SELECT productid, sequence_no, quantity, listprice, discount_percent, discount_amount,
			 comment, description, tax1, tax2, tax3, incrementondel
			 FROM vtiger_inventoryproductrel WHERE id = ?", [$sourceId]
		);

		while ($row = $db->fetch_array($prodResult)) {
			$db->pquery(
				"INSERT INTO vtiger_inventoryproductrel (id, productid, sequence_no, quantity, listprice,
				 discount_percent, discount_amount, comment, description, tax1, tax2, tax3, incrementondel)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
				[$invoiceId, $row['productid'], $row['sequence_no'], $row['quantity'], $row['listprice'],
				 $row['discount_percent'] ?? 0, $row['discount_amount'] ?? 0,
				 $row['comment'] ?? '', $row['description'] ?? '',
				 $row['tax1'] ?? 0, $row['tax2'] ?? 0, $row['tax3'] ?? 0,
				 $row['incrementondel'] ?? 1]
			);
		}

		// Copy product taxes
		$taxResult = $db->pquery(
			"SELECT productid, taxname, taxpercentage FROM vtiger_inventoryproductrel_tax WHERE id = ?", [$sourceId]
		);
		while ($row = $db->fetch_array($taxResult)) {
			$db->pquery(
				"INSERT INTO vtiger_inventoryproductrel_tax (id, productid, taxname, taxpercentage) VALUES (?, ?, ?, ?)",
				[$invoiceId, $row['productid'], $row['taxname'], $row['taxpercentage']]
			);
		}
	}

	/**
	 * Render the Mail tab content
	 */
	private function renderMailTab($viewer, $recordModel) {
		$db = PearDatabase::getInstance();
		$recordId = $recordModel->getId();
		$contactId = $recordModel->get('contact_id');

		// Get contact email
		$contactEmail = '';
		if (!empty($contactId)) {
			$emailResult = $db->pquery("SELECT email FROM vtiger_contactdetails WHERE contactid = ?", [$contactId]);
			if ($db->num_rows($emailResult) > 0) {
				$contactEmail = $db->query_result($emailResult, 0, 'email');
			}
		}

		// Load existing quotes for this potential
		$quotes = [];
		$quotesQuery = "SELECT q.quoteid, q.quote_no, q.subject, q.total,
						qcf.cf_1125, qcf.cf_1162,
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

		$viewer->assign('RECORD_ID', $recordId);
		$viewer->assign('CONTACT_EMAIL', $contactEmail);
		$viewer->assign('QUOTES', $quotes);
		return $viewer->view('UnifiedMailTab.tpl', 'Potentials', true);
	}
}
