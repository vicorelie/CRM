<?php

/**
 * Action pour générer les liens de paiement Stripe pour Acompte et Solde
 */
class Quotes_GenerateStripePaymentLinks_Action extends Vtiger_BasicAjax_Action {

    public function process(Vtiger_Request $request) {
        $response = new Vtiger_Response();

        try {
            error_log('[STRIPE] Début de GenerateStripePaymentLinks');

            // Charger le helper Stripe
            require_once(__DIR__ . '/../../../stripe/StripeHelper.php');
            error_log('[STRIPE] StripeHelper chargé');

            // Récupérer l'ID du devis
            $quoteId = $request->get('record');

            if (empty($quoteId)) {
                throw new Exception('ID du devis manquant');
            }

            // Charger les données du devis
            $db = PearDatabase::getInstance();
            $query = "SELECT
                        q.quote_no,
                        q.subject,
                        qcf.cf_1055 as total_acompte,
                        qcf.cf_1057 as total_solde,
                        c.firstname,
                        c.lastname,
                        c.email
                      FROM vtiger_quotes q
                      LEFT JOIN vtiger_quotescf qcf ON qcf.quoteid = q.quoteid
                      LEFT JOIN vtiger_crmentity cr ON cr.crmid = q.quoteid
                      LEFT JOIN vtiger_contactdetails c ON c.contactid = q.contactid
                      WHERE q.quoteid = ?";

            $result = $db->pquery($query, array($quoteId));

            if ($db->num_rows($result) == 0) {
                throw new Exception('Devis non trouvé');
            }

            $quoteData = $db->fetch_array($result);
            error_log('[STRIPE] Données devis récupérées: ' . json_encode($quoteData));

            // Vérifier que les montants sont valides
            $montantAcompte = floatval($quoteData['total_acompte']);
            $montantSolde = floatval($quoteData['total_solde']);
            error_log('[STRIPE] Montants - Acompte: ' . $montantAcompte . ', Solde: ' . $montantSolde);

            if ($montantAcompte <= 0 && $montantSolde <= 0) {
                throw new Exception('Les montants Acompte et Solde doivent être supérieurs à 0');
            }

            $links = array();
            $fields = StripeHelper::getConfig('vtiger_fields.quotes');

            // Créer le lien de paiement pour l'Acompte
            if ($montantAcompte > 0) {
                $acompteLink = StripeHelper::createPaymentLink(
                    $montantAcompte,
                    'Acompte',
                    $quoteData,
                    $quoteId
                );
                $links['acompte'] = $acompteLink;

                // Sauvegarder le lien et le statut dans le devis
                StripeHelper::updateQuoteField($quoteId, $fields['lien_acompte'], $acompteLink);
                StripeHelper::updateQuoteField($quoteId, $fields['statut_acompte'], 'En attente');
            }

            // Créer le lien de paiement pour le Solde
            if ($montantSolde > 0) {
                $soldeLink = StripeHelper::createPaymentLink(
                    $montantSolde,
                    'Solde',
                    $quoteData,
                    $quoteId
                );
                $links['solde'] = $soldeLink;

                // Sauvegarder le lien et le statut dans le devis
                StripeHelper::updateQuoteField($quoteId, $fields['lien_solde'], $soldeLink);
                StripeHelper::updateQuoteField($quoteId, $fields['statut_solde'], 'En attente');
            }

            StripeHelper::log("Liens générés pour devis #$quoteId - Acompte: $montantAcompte EUR, Solde: $montantSolde EUR");

            $resultData = array(
                'success' => true,
                'message' => 'Liens de paiement générés avec succès',
                'links' => $links
            );
            error_log('[STRIPE] Résultat à envoyer: ' . json_encode($resultData));

            $response->setResult($resultData);

        } catch (Exception $e) {
            error_log('[STRIPE] ERREUR: ' . $e->getMessage());
            error_log('[STRIPE] Stack trace: ' . $e->getTraceAsString());

            StripeHelper::log("ERREUR génération liens pour devis #" . ($quoteId ?? 'inconnu') . ": " . $e->getMessage(), 'error');

            $response->setResult(array(
                'success' => false,
                'message' => 'Erreur: ' . $e->getMessage()
            ));
        }

        error_log('[STRIPE] Fin de GenerateStripePaymentLinks');
        $response->emit();
    }
}
