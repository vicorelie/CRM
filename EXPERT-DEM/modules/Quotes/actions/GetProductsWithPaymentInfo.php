<?php

/**
 * Action pour récupérer la liste des produits avec leurs informations de paiement
 */
class Quotes_GetProductsWithPaymentInfo_Action extends Vtiger_BasicAjax_Action {

    public function process(Vtiger_Request $request) {
        $response = new Vtiger_Response();

        try {
            $db = PearDatabase::getInstance();

            // Récupérer tous les produits ET services actifs avec leurs pourcentages
            // UNION des produits et services
            $query = "
                SELECT
                    p.productid as id,
                    p.productname as name,
                    p.productcode as code,
                    p.unit_price as price,
                    p.qtyinstock as stock,
                    pcf.cf_1051 as pct_acompte,
                    pcf.cf_1053 as pct_solde,
                    'Products' as type
                FROM vtiger_products p
                INNER JOIN vtiger_crmentity c ON c.crmid = p.productid
                LEFT JOIN vtiger_productcf pcf ON pcf.productid = p.productid
                WHERE c.deleted = 0

                UNION ALL

                SELECT
                    s.serviceid as id,
                    s.servicename as name,
                    s.service_no as code,
                    s.unit_price as price,
                    NULL as stock,
                    scf.cf_1061 as pct_acompte,
                    scf.cf_1059 as pct_solde,
                    'Services' as type
                FROM vtiger_service s
                INNER JOIN vtiger_crmentity c ON c.crmid = s.serviceid
                LEFT JOIN vtiger_servicecf scf ON scf.serviceid = s.serviceid
                WHERE c.deleted = 0

                ORDER BY name ASC";

            $result = $db->pquery($query, array());
            $products = array();

            while ($row = $db->fetch_array($result)) {
                $id = $row['id'];
                $unitPrice = floatval($row['price']);
                $pctAcompte = !empty($row['pct_acompte']) ? floatval($row['pct_acompte']) : 50.00;
                $pctSolde = !empty($row['pct_solde']) ? floatval($row['pct_solde']) : 50.00;

                // Calculer les montants pour quantité 1
                $montantAcompte = ($unitPrice * $pctAcompte) / 100;
                $montantSolde = ($unitPrice * $pctSolde) / 100;

                $products[] = array(
                    'id' => $id,
                    'name' => $row['name'],
                    'code' => $row['code'],
                    'price' => $unitPrice,
                    'stock' => $row['stock'],
                    'type' => $row['type'],
                    'pct_acompte' => $pctAcompte,
                    'pct_solde' => $pctSolde,
                    'montant_acompte' => round($montantAcompte, 2),
                    'montant_solde' => round($montantSolde, 2)
                );
            }

            $response->setResult(array(
                'success' => true,
                'products' => $products
            ));

        } catch (Exception $e) {
            $response->setResult(array(
                'success' => false,
                'message' => 'Erreur: ' . $e->getMessage()
            ));
        }

        $response->emit();
    }
}
