<?php
/*+***********************************************************************************
 * The contents of this file are subject to the vtiger CRM Public License Version 1.0
 * ("License"); You may not use this file except in compliance with the License
 * The Original Code is:  vtiger CRM Open Source
 * The Initial Developer of the Original Code is vtiger.
 * Portions created by vtiger are Copyright (C) vtiger.
 * All Rights Reserved.
 *************************************************************************************/

/**
 * PurchaseOrder Record Model Class
 */
class PurchaseOrder_Record_Model extends Inventory_Record_Model {
	
	/**
	 * This Function adds the specified product quantity to the Product Quantity in Stock
	 * @param type $recordId
	 */
	function addStockToProducts($recordId) {
		$db = PearDatabase::getInstance();

		$recordModel = Inventory_Record_Model::getInstanceById($recordId);
		$relatedProducts = $recordModel->getProducts();

		foreach ($relatedProducts as $key => $relatedProduct) {
			if($relatedProduct['qty'.$key]){
				$productId = $relatedProduct['hdnProductId'.$key];
				$result = $db->pquery("SELECT qtyinstock FROM vtiger_products WHERE productid=?", array($productId));
				$qty = $db->query_result($result,0,"qtyinstock");
				$stock = $qty + $relatedProduct['qty'.$key];
				$db->pquery("UPDATE vtiger_products SET qtyinstock=? WHERE productid=?", array($stock, $productId));
			}
		}
	}
	
	/**
	 * This Function returns the current status of the specified Purchase Order.
	 * @param type $purchaseOrderId
	 * @return <String> PurchaseOrderStatus
	 */
	function getPurchaseOrderStatus($purchaseOrderId){
			$db = PearDatabase::getInstance();
			$sql = "SELECT postatus FROM vtiger_purchaseorder WHERE purchaseorderid=?";
			$result = $db->pquery($sql, array($purchaseOrderId));
			$purchaseOrderStatus = $db->query_result($result,0,"postatus");
			return $purchaseOrderStatus;
	}

	/**
	 * Override getProducts() to handle purchase orders without products
	 * Constructs final_details from database when no products exist
	 */
	public function getProducts() {
		global $adb;

		// Check if this is an existing record
		$recordId = $this->getId();
		if (empty($recordId)) {
			// New record - use parent method
			return parent::getProducts();
		}

		// Check if there are any products FIRST before calling parent
		$productsCount = $adb->pquery(
			"SELECT COUNT(*) as count FROM vtiger_inventoryproductrel WHERE id = ?",
			array($recordId)
		);

		$count = $adb->query_result($productsCount, 0, 'count');

		// If we have products, use parent method normally
		if ($count > 0) {
			return parent::getProducts();
		}

		// If no products, construct final_details from database
		$relatedProducts = array();
		$poData = $adb->pquery(
			"SELECT po.subtotal, po.discount_amount, po.pre_tax_total, po.total, po.taxtype, po.currency_id,
			        ce.label as currency_symbol
			 FROM vtiger_purchaseorder po
			 LEFT JOIN vtiger_currency_info ci ON po.currency_id = ci.id
			 LEFT JOIN vtiger_crmentity ce ON ci.currency_name = ce.crmid
			 WHERE po.purchaseorderid = ?",
			array($recordId)
		);

		if ($adb->num_rows($poData) > 0) {
			$subtotal = floatval($adb->query_result($poData, 0, 'subtotal'));
			$discountAmount = floatval($adb->query_result($poData, 0, 'discount_amount'));
			$preTaxTotal = floatval($adb->query_result($poData, 0, 'pre_tax_total'));
			$total = floatval($adb->query_result($poData, 0, 'total'));
			$taxtype = $adb->query_result($poData, 0, 'taxtype');
			$currencyId = $adb->query_result($poData, 0, 'currency_id');
			$currencySymbol = $adb->query_result($poData, 0, 'currency_symbol') ?: '€';

			// Calculate tax amount
			$taxAmount = $total - $preTaxTotal;

			// Get tax percentage
			$taxPercentage = $preTaxTotal > 0 ? round(($taxAmount / $preTaxTotal) * 100, 2) : 20;

			// Construct final_details array similar to what getAssociatedProducts returns
			$finalDetails = array(
				'hdnSubTotal' => $subtotal,
				'hdnGrandTotal' => $total,
				'hdnDiscountAmount' => $discountAmount,
				'hdnDiscountPercent' => 0,
				'txtAdjustment' => 0,
				'hdnS_H_Amount' => 0,
				'taxtype' => $taxtype,
				'currency_id' => $currencyId,
				'currencySymbol' => $currencySymbol,
				'conversion_rate' => 1,
				'preTaxTotal' => $preTaxTotal,
				'grandTotal' => $total,
				'totalAfterDiscount' => $preTaxTotal,
				'tax_totalamount' => $taxAmount,
				'discount_amount_final' => $discountAmount,
				'discount_percent_final' => 0,
				'discount_type_final' => 'amount',
				'group_total_tax_percent' => $taxPercentage,
				'discountTotal_final' => $discountAmount,
				'shipping_handling_charge' => 0,
				'shtax_totalamount' => 0,
				'deductTaxesTotalAmount' => 0,
				'taxes' => array(
					array(
						'taxname' => 'VAT',
						'taxlabel' => 'VAT',
						'percentage' => $taxPercentage,
						'amount' => $taxAmount,
						'method' => 'Simple'
					)
				),
				'deductTaxes' => array(),
				'chargesAndItsTaxes' => array(),
				'sh_percent' => 0,
				'sh_amount' => 0,
				'adjustmentType' => '+',
				'adjustment' => 0
			);

			// Return structure compatible with PDFMaker and Detail view
			$relatedProducts[1]['final_details'] = $finalDetails;
		}

		return $relatedProducts;
	}
}