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

},{

	/**
	 * Détecte l'édition inline des champs de calcul et recalcule automatiquement
	 */
	registerAutoCalculation: function() {
		var thisInstance = this;

		// Écouter les requêtes AJAX SaveAjax pour détecter les changements de champs
		jQuery(document).ajaxComplete(function(event, xhr, settings) {
			console.log('[QUOTES CALC DEBUG] AJAX complete, type:', typeof settings.data, 'url:', settings.url);

			// Vérifier si settings.data est un objet FormData ou un objet
			var dataStr = '';
			if (typeof settings.data === 'string') {
				dataStr = settings.data;
			} else if (settings.data && typeof settings.data === 'object') {
				// Convertir l'objet en string pour le chercher
				try {
					dataStr = JSON.stringify(settings.data);
				} catch(e) {
					dataStr = settings.url || '';
				}
			}

			console.log('[QUOTES CALC DEBUG] data string:', dataStr.substring(0, 200));

			// Vérifier si c'est une requête SaveAjax pour Quotes
			if (dataStr &&
				dataStr.indexOf('SaveAjax') > -1 &&
				dataStr.indexOf('Quotes') > -1) {

				console.log('[QUOTES CALC DEBUG] SaveAjax pour Quotes détecté');

				// Champs de calcul surveillés:
				// cf_1127 = Forfait Tarif
				// cf_1129 = Forfait Supplément
				// cf_1133 = Forfait % Acompte
				// cf_1135 = Forfait % Solde
				// cf_1139 = Montant assurance
				// cf_1141 = Tarif assurance pour 1000€
				var calculationFields = ['cf_1127', 'cf_1129', 'cf_1133', 'cf_1135', 'cf_1139', 'cf_1141'];
				var fieldModified = false;

				for (var i = 0; i < calculationFields.length; i++) {
					if (dataStr.indexOf(calculationFields[i]) > -1) {
						fieldModified = true;
						console.log('[QUOTES CALC] Champ de calcul modifié:', calculationFields[i]);
						break;
					}
				}

				if (fieldModified) {
					// Extraire le record ID
					var recordMatch = dataStr.match(/record["\s:=]+(\d+)/);
					if (recordMatch) {
						var recordId = recordMatch[1];
						console.log('[QUOTES CALC] Recalcul des totaux pour le devis ID:', recordId);

						// Attendre un peu pour que la sauvegarde soit terminée
						setTimeout(function() {
							thisInstance.recalculateQuoteTotals(recordId);
						}, 500);
					}
				}
			}
		});
	},

	/**
	 * Appelle l'action PHP pour recalculer tous les totaux
	 */
	recalculateQuoteTotals: function(recordId) {
		console.log('[QUOTES CALC] Appel de RecalculateQuoteTotals pour recordId:', recordId);

		var postData = {
			module: 'Quotes',
			action: 'RecalculateQuoteTotals',
			record: recordId
		};

		AppConnector.request(postData).then(
			function(data) {
				console.log('[QUOTES CALC] Réponse reçue:', data);

				if (data.success && data.result && data.result.calculated_fields) {
					var fields = data.result.calculated_fields;

					// Mettre à jour l'affichage des champs calculés
					// cf_1137 = Total Forfait
					if (fields.cf_1137 !== undefined) {
						var cf1137Element = jQuery('[data-name="cf_1137"] .value');
						if (cf1137Element.length > 0) {
							cf1137Element.text(fields.cf_1137 + ' €');
							console.log('[QUOTES CALC] cf_1137 mis à jour:', fields.cf_1137);
						}
					}

					// cf_1055 = Acompte TTC
					if (fields.cf_1055 !== undefined) {
						var cf1055Element = jQuery('[data-name="cf_1055"] .value');
						if (cf1055Element.length > 0) {
							cf1055Element.text(fields.cf_1055 + ' €');
							console.log('[QUOTES CALC] cf_1055 mis à jour:', fields.cf_1055);
						}
					}

					// cf_1057 = Solde TTC
					if (fields.cf_1057 !== undefined) {
						var cf1057Element = jQuery('[data-name="cf_1057"] .value');
						if (cf1057Element.length > 0) {
							cf1057Element.text(fields.cf_1057 + ' €');
							console.log('[QUOTES CALC] cf_1057 mis à jour:', fields.cf_1057);
						}
					}

					// cf_1143 = Assurance calculée
					if (fields.cf_1143 !== undefined) {
						var cf1143Element = jQuery('[data-name="cf_1143"] .value');
						if (cf1143Element.length > 0) {
							cf1143Element.text(fields.cf_1143 + ' €');
							console.log('[QUOTES CALC] cf_1143 mis à jour:', fields.cf_1143);
						}
					}

					// Total
					if (fields.total !== undefined) {
						var totalElement = jQuery('[data-name="hdnGrandTotal"] .value');
						if (totalElement.length > 0) {
							totalElement.text(fields.total + ' €');
							console.log('[QUOTES CALC] Total mis à jour:', fields.total);
						}
					}

					// Afficher un message de succès discret
					var params = {
						text: 'Totaux recalculés automatiquement',
						type: 'success'
					};
					Vtiger_Helper_Js.showMessage(params);

				} else {
					console.error('[QUOTES CALC] Erreur dans la réponse:', data);
				}
			},
			function(error) {
				console.error('[QUOTES CALC] Erreur AJAX:', error);
			}
		);
	},

	/**
	 * Enregistrement au chargement de la page
	 */
	registerEvents: function() {
		this._super();
		this.registerAutoCalculation();
	}

});