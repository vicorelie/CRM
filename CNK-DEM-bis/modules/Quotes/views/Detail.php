<?php

class Quotes_Detail_View extends Inventory_Detail_View {
    
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
