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
 * Inventory Record Model Class
 */
class Invoice_Record_Model extends Inventory_Record_Model {

	public function getCreatePurchaseOrderUrl() {
		$purchaseOrderModuleModel = Vtiger_Module_Model::getInstance('PurchaseOrder');
		return "index.php?module=".$purchaseOrderModuleModel->getName()."&view=".$purchaseOrderModuleModel->getEditViewName()."&invoice_id=".$this->getId();
	}

	/**
	 * Override getProductsForPurchaseOrder() to handle invoices without products
	 */
	public function getProductsForPurchaseOrder() {
		global $adb;

		// Check if there are any products
		$recordId = $this->getId();
		if (!empty($recordId)) {
			$productsCount = $adb->pquery(
				"SELECT COUNT(*) as count FROM vtiger_inventoryproductrel WHERE id = ?",
				array($recordId)
			);
			$count = $adb->query_result($productsCount, 0, 'count');

			// If no products, read actual totals from database
			if ($count == 0) {
				// Get invoice totals from database
				$invoiceData = $adb->pquery(
					"SELECT i.subtotal, i.discount_amount, i.pre_tax_total, i.total, i.taxtype, i.s_h_amount,
					        i.adjustment, i.currency_id
					 FROM vtiger_invoice i
					 WHERE i.invoiceid = ?",
					array($recordId)
				);

				if ($adb->num_rows($invoiceData) > 0) {
					$subtotal = floatval($adb->query_result($invoiceData, 0, 'subtotal'));
					$discountAmount = floatval($adb->query_result($invoiceData, 0, 'discount_amount'));
					$preTaxTotal = floatval($adb->query_result($invoiceData, 0, 'pre_tax_total'));
					$total = floatval($adb->query_result($invoiceData, 0, 'total'));
					$taxtype = $adb->query_result($invoiceData, 0, 'taxtype');
					$shAmount = floatval($adb->query_result($invoiceData, 0, 's_h_amount'));
					$adjustment = floatval($adb->query_result($invoiceData, 0, 'adjustment'));
					$currencyId = $adb->query_result($invoiceData, 0, 'currency_id');

					// Calculate tax amount
					$taxAmount = $total - $preTaxTotal;

					// Get tax percentage
					$taxPercentage = $preTaxTotal > 0 ? round(($taxAmount / $preTaxTotal) * 100, 2) : 20;

					return array(
						1 => array(
							'final_details' => array(
								'discount_percentage_final' => 0,
								'discount_amount_final' => $discountAmount,
								'discount_type_final' => 'zero',
								'hdnSubTotal' => $subtotal,
								'preTaxTotal' => $preTaxTotal,
								'grandTotal' => $total,
								'taxtype' => $taxtype ?: 'group',
								'hdnGrandTotal' => $total,
								'hdnDiscountAmount' => $discountAmount,
								'hdnDiscountPercent' => 0,
								'txtAdjustment' => $adjustment,
								'hdnS_H_Amount' => $shAmount,
								'currency_id' => $currencyId,
								'conversion_rate' => 1,
								'totalAfterDiscount' => $preTaxTotal,
								'tax_totalamount' => $taxAmount,
								'discountTotal_final' => $discountAmount,
								'shipping_handling_charge' => $shAmount,
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
								'sh_amount' => $shAmount,
								'adjustmentType' => $adjustment >= 0 ? '+' : '-',
								'adjustment' => abs($adjustment),
								'group_total_tax_percent' => $taxPercentage
							)
						)
					);
				}

				// If no data found, return empty structure
				return array(
					1 => array(
						'final_details' => array(
							'discount_percentage_final' => 0,
							'discount_amount_final' => 0,
							'discount_type_final' => 'zero',
							'hdnSubTotal' => 0,
							'preTaxTotal' => 0,
							'grandTotal' => 0,
							'taxtype' => 'group'
						)
					)
				);
			}
		}

		// If there are products, use parent method
		return parent::getProductsForPurchaseOrder();
	}

	/**
	 * Override getProducts() to handle invoices without products
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
		$invoiceData = $adb->pquery(
			"SELECT i.subtotal, i.discount_amount, i.pre_tax_total, i.total, i.taxtype, i.currency_id,
			        ce.label as currency_symbol
			 FROM vtiger_invoice i
			 LEFT JOIN vtiger_currency_info ci ON i.currency_id = ci.id
			 LEFT JOIN vtiger_crmentity ce ON ci.currency_name = ce.crmid
			 WHERE i.invoiceid = ?",
			array($recordId)
		);

		if ($adb->num_rows($invoiceData) > 0) {
			$subtotal = floatval($adb->query_result($invoiceData, 0, 'subtotal'));
			$discountAmount = floatval($adb->query_result($invoiceData, 0, 'discount_amount'));
			$preTaxTotal = floatval($adb->query_result($invoiceData, 0, 'pre_tax_total'));
			$total = floatval($adb->query_result($invoiceData, 0, 'total'));
			$taxtype = $adb->query_result($invoiceData, 0, 'taxtype');
			$currencyId = $adb->query_result($invoiceData, 0, 'currency_id');
			$currencySymbol = $adb->query_result($invoiceData, 0, 'currency_symbol') ?: '€';

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
