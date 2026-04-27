<?php

class Quotes_Detail_View extends Inventory_Detail_View {

    /**
     * Override process pour construire FINAL_DETAILS même sans produits
     */
    public function process(Vtiger_Request $request) {
        // CNK-DEM: Temporairement désactivé pour debug
        /*
        // Vérifier s'il y a des produits AVANT d'appeler le parent
        $recordId = $request->get('record');

        // Only process if we have a valid record ID
        if (!empty($recordId)) {
            global $adb;

            try {
                $productsCount = $adb->pquery(
                    "SELECT COUNT(*) as count FROM vtiger_inventoryproductrel WHERE id = ?",
                    array($recordId)
                );

                $count = $adb->query_result($productsCount, 0, 'count');

                // Si pas de produits, construire FINAL_DETAILS à partir de la DB
                if ($count == 0) {
                    $quoteData = $adb->pquery(
                        "SELECT subtotal, discount_amount, pre_tax_total, total, taxtype
                         FROM vtiger_quotes WHERE quoteid = ?",
                        array($recordId)
                    );

                    if ($adb->num_rows($quoteData) > 0) {
                        $subtotal = floatval($adb->query_result($quoteData, 0, 'subtotal'));
                        $discountAmount = floatval($adb->query_result($quoteData, 0, 'discount_amount'));
                        $preTaxTotal = floatval($adb->query_result($quoteData, 0, 'pre_tax_total'));
                        $total = floatval($adb->query_result($quoteData, 0, 'total'));
                        $taxtype = $adb->query_result($quoteData, 0, 'taxtype');

                        // Calculer la taxe (seulement si les totaux ne sont pas nuls)
                        if ($total > 0 || $preTaxTotal > 0) {
                            $taxAmount = $total - $preTaxTotal;

                            // Construire FINAL_DETAILS minimal
                            $finalDetails = array(
                                'hdnSubTotal' => number_format($subtotal, 2, '.', ''),
                                'discountTotal_final' => number_format($discountAmount, 2, '.', ''),
                                'preTaxTotal' => number_format($preTaxTotal, 2, '.', ''),
                                'tax_totalamount' => number_format($taxAmount, 2, '.', ''),
                                'grandTotal' => number_format($total, 2, '.', ''),
                                'taxtype' => $taxtype,
                                'discount_type_final' => 'amount',
                                'discount_percentage_final' => 0
                            );

                            // Injecter AVANT d'appeler le parent
                            $this->viewer->assign('FINAL_DETAILS_OVERRIDE', $finalDetails);
                        }
                    }
                }
            } catch (Exception $e) {
                // En cas d'erreur, continuer quand même pour afficher la page
                error_log('Quotes Detail View Error: ' . $e->getMessage());
            }
        } // End of if (!empty($recordId))
        */

        // Appeler le parent APRES avoir assigné FINAL_DETAILS_OVERRIDE
        parent::process($request);
    }

    /**
     * Charger les scripts JS personnalisés
     */
    public function getHeaderScripts(Vtiger_Request $request) {
        $headerScriptInstances = parent::getHeaderScripts($request);
        
        // Ajouter le script Stripe Payment Links
        $moduleName = $request->getModule();
        
        $jsFileNames = array(
            'modules.Quotes.resources.StripePaymentLinks'
        );
        
        $jsScriptInstances = $this->checkAndConvertJsScripts($jsFileNames);
        $headerScriptInstances = array_merge($headerScriptInstances, $jsScriptInstances);
        
        return $headerScriptInstances;
    }
}
