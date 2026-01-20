/*+***********************************************************************************
 * The contents of this file are subject to the vtiger CRM Public License Version 1.0
 * ("License"); You may not use this file except in compliance with the License
 * The Original Code is: vtiger CRM Open Source
 * The Initial Developer of the Original Code is vtiger.
 * Portions created by vtiger are Copyright (C) vtiger.
 * All Rights Reserved.
 *************************************************************************************/

Inventory_Detail_Js("Quotes_Detail_Js",{

    /**
     * Fonction statique pour calculer les montants Acompte et Solde
     */
    calculateAcompteSolde: function() {
        var recordId = app.getRecordId();

        if (!recordId) {
            var params = {
                text: 'Erreur: ID de devis non trouvé',
                type: 'error'
            };
            Vtiger_Helper_Js.showMessage(params);
            return;
        }

        var params = {
            text: 'Calcul en cours...',
            type: 'info'
        };
        Vtiger_Helper_Js.showMessage(params);

        var postData = {
            module: 'Quotes',
            action: 'CalculateAcompteSolde',
            record: recordId
        };

        AppConnector.request(postData).then(
            function(data) {
                if (data.success) {
                    var params = {
                        text: 'Calcul effectué ! Acompte: ' + data.acompte + '€, Solde: ' + data.solde + '€',
                        type: 'success'
                    };
                    Vtiger_Helper_Js.showMessage(params);

                    // Recharger la page pour afficher les nouvelles valeurs
                    setTimeout(function() {
                        window.location.reload();
                    }, 1500);
                } else {
                    var params = {
                        text: data.message || 'Erreur lors du calcul',
                        type: 'error'
                    };
                    Vtiger_Helper_Js.showMessage(params);
                }
            },
            function(error) {
                var params = {
                    text: 'Erreur de connexion',
                    type: 'error'
                };
                Vtiger_Helper_Js.showMessage(params);
            }
        );
    }

},{});