/*+***********************************************************************************
 * The contents of this file are subject to the vtiger CRM Public License Version 1.0
 * ("License"); You may not use this file except in compliance with the License
 * The Original Code is: vtiger CRM Open Source
 * The Initial Developer of the Original Code is vtiger.
 * Portions created by vtiger are Copyright (C) vtiger.
 * All Rights Reserved.
 *************************************************************************************/

Inventory_Edit_Js("Quotes_Edit_Js",{

    // Cache des pourcentages Acompte/Solde par produit/service (chargé une seule fois)
    productsAcompteSoldeMap: {},

    /**
     * Charger les pourcentages Acompte/Solde de tous les produits ET services (une seule fois)
     */
    loadProductsAcompteSoldeData: function(callback) {
        AppConnector.request({
            module: 'Quotes',
            action: 'GetProductsWithPaymentInfo'
        }).then(function(data) {
            if (data && data.result && data.result.success && data.result.products) {
                data.result.products.forEach(function(product) {
                    Quotes_Edit_Js.productsAcompteSoldeMap[product.id] = {
                        pct_acompte: product.pct_acompte,
                        pct_solde: product.pct_solde
                    };
                });
                if (callback) callback();
            }
        });
    },

    /**
     * Calculer et mettre à jour les totaux Acompte et Solde
     */
    calculateAcompteSoldeTotals: function() {
        var productsMap = Quotes_Edit_Js.productsAcompteSoldeMap;

        // Si les données ne sont pas encore chargées, ne rien faire
        if (Object.keys(productsMap).length === 0) return;

        var totalAcompte = 0;
        var totalSolde = 0;

        // Parcourir toutes les lignes de produits ET services
        var allRows = jQuery('tr[id^="row"]');

        allRows.each(function() {
            var row = jQuery(this);

            // Récupérer l'ID du produit/service
            var productIdInput = row.find('input[name^="hdnProductId"]');
            if (productIdInput.length === 0) return;

            var productId = productIdInput.val();
            if (!productId || !productsMap[productId]) return;

            // Récupérer le total après remise (calculé par VTiger avec toutes les remises)
            var totalAfterDiscount = parseFloat(row.find('.totalAfterDiscount').text()) || 0;

            if (totalAfterDiscount > 0) {
                var pctAcompte = productsMap[productId].pct_acompte;
                var pctSolde = productsMap[productId].pct_solde;

                var montantAcompte = (totalAfterDiscount * pctAcompte) / 100;
                var montantSolde = (totalAfterDiscount * pctSolde) / 100;

                totalAcompte += montantAcompte;
                totalSolde += montantSolde;
            }
        });

        // CUSTOM: Ajouter le forfait au calcul Acompte/Solde
        var forfaitTarif = parseFloat(jQuery('[name="cf_1127"]').val()) || 0;
        var forfaitSupplement = parseFloat(jQuery('[name="cf_1129"]').val()) || 0;
        var forfaitPctAcompte = parseFloat(jQuery('[name="cf_1133"]').val()) || 43;
        var forfaitPctSolde = parseFloat(jQuery('[name="cf_1135"]').val()) || 57;

        if (forfaitTarif > 0 || forfaitSupplement > 0) {
            // Le tarif forfait est divisé selon les %, le supplément va 100% à l'acompte
            var forfaitAcompteHT = (forfaitTarif * forfaitPctAcompte / 100) + forfaitSupplement;
            var forfaitSoldeHT = forfaitTarif * forfaitPctSolde / 100;

            totalAcompte += forfaitAcompteHT;
            totalSolde += forfaitSoldeHT;

            console.log('Forfait: Tarif=' + forfaitTarif.toFixed(2) + ' + Supplément=' + forfaitSupplement.toFixed(2));
            console.log('Forfait Acompte HT: ' + forfaitAcompteHT.toFixed(2) + ' €');
            console.log('Forfait Solde HT: ' + forfaitSoldeHT.toFixed(2) + ' €');
        }

        // CUSTOM: Ajouter l'assurance au calcul Acompte/Solde
        var assuranceTarif = parseFloat(jQuery('[name="cf_1141"]').val()) || 0;

        if (assuranceTarif > 0) {
            // L'assurance va 100% à l'acompte (payée d'avance)
            totalAcompte += assuranceTarif;

            console.log('Assurance HT: ' + assuranceTarif.toFixed(2) + ' € (100% Acompte)');
        }

        // Récupérer le taux de TVA depuis VTiger - essayer plusieurs méthodes
        var grandTotal = 0;
        var totalAfterDiscountGlobal = 0;

        // Méthode 1: Essayer les champs input cachés spécifiques à VTiger
        var grandTotalInput = jQuery('input[name="grandTotal"]');
        var subtotalInput = jQuery('input[name="subtotal"]');

        if (grandTotalInput.length > 0 && grandTotalInput.val()) {
            grandTotal = parseFloat(grandTotalInput.val());
        }
        if (subtotalInput.length > 0 && subtotalInput.val()) {
            totalAfterDiscountGlobal = parseFloat(subtotalInput.val());
        }

        // Méthode 2: Si pas trouvé, essayer via les champs hdnGrandTotal et hdnSubTotal
        if (grandTotal === 0) {
            var hdnGrandTotal = jQuery('input[name="hdnGrandTotal"]');
            if (hdnGrandTotal.length > 0 && hdnGrandTotal.val()) {
                grandTotal = parseFloat(hdnGrandTotal.val());
            }
        }
        if (totalAfterDiscountGlobal === 0) {
            var hdnSubTotal = jQuery('input[name="hdnSubTotal"]');
            if (hdnSubTotal.length > 0 && hdnSubTotal.val()) {
                totalAfterDiscountGlobal = parseFloat(hdnSubTotal.val());
            }
        }

        console.log('DEBUG TVA: grandTotal=' + grandTotal + ', subtotal=' + totalAfterDiscountGlobal);

        // Calculer le taux de TVA
        var vatPercent = 20.0; // Fallback par défaut: 20%
        if (totalAfterDiscountGlobal > 0 && grandTotal > totalAfterDiscountGlobal) {
            // Calculer le taux de TVA réel: ((TTC - HT) / HT) * 100
            vatPercent = ((grandTotal - totalAfterDiscountGlobal) / totalAfterDiscountGlobal) * 100;
            console.log('✓ TVA calculée automatiquement: ' + vatPercent.toFixed(2) + '%');
        } else {
            console.log('⚠ Utilisation du taux de TVA par défaut: ' + vatPercent + '%');
        }

        // Calculer les montants TTC
        var vatMultiplier = 1 + (vatPercent / 100);
        var totalAcompteTTC = totalAcompte * vatMultiplier;
        var totalSoldeTTC = totalSolde * vatMultiplier;

        console.log('✓ Acompte TTC: ' + totalAcompteTTC.toFixed(2) + ' €');
        console.log('✓ Solde TTC: ' + totalSoldeTTC.toFixed(2) + ' €');

        // Mettre à jour les champs avec les montants TTC
        var acompteField = jQuery('[name="cf_1055"]');
        var soldeField = jQuery('[name="cf_1057"]');

        if (acompteField.length > 0) {
            acompteField.val(totalAcompteTTC.toFixed(2));
        }

        if (soldeField.length > 0) {
            soldeField.val(totalSoldeTTC.toFixed(2));
        }
    }

},{
    
    accountsReferenceField : false,
    contactsReferenceField : false,
    
    initializeVariables : function() {
      this._super();
      var form = this.getForm();
      this.accountsReferenceField = form.find('[name="account_id"]');
      this.contactsReferenceField = form.find('[name="contact_id"]');
    },
    
    /**
	 * Function to get popup params
	 */
	getPopUpParams : function(container) {
		var params = this._super(container);
        var sourceFieldElement = jQuery('input[class="sourceField"]',container);
		var referenceModule = jQuery('input[name=popupReferenceModule]', container).val();
		if(!sourceFieldElement.length) {
			sourceFieldElement = jQuery('input.sourceField',container);
		}
		
		if((sourceFieldElement.attr('name') == 'contact_id' || sourceFieldElement.attr('name') == 'potential_id') && referenceModule != 'Leads') {
			var form = this.getForm();
			var parentIdElement  = form.find('[name="account_id"]');
			if(parentIdElement.length > 0 && parentIdElement.val().length > 0 && parentIdElement.val() != 0) {
				var closestContainer = parentIdElement.closest('td');
				params['related_parent_id'] = parentIdElement.val();
				params['related_parent_module'] = closestContainer.find('[name="popupReferenceModule"]').val();
			} else if(sourceFieldElement.attr('name') == 'potential_id') {
				parentIdElement  = form.find('[name="contact_id"]');
				var relatedParentModule = parentIdElement.closest('td').find('input[name="popupReferenceModule"]').val()
				if(parentIdElement.length > 0 && parentIdElement.val().length > 0 && relatedParentModule != 'Leads') {
					closestContainer = parentIdElement.closest('td');
					params['related_parent_id'] = parentIdElement.val();
					params['related_parent_module'] = closestContainer.find('[name="popupReferenceModule"]').val();
				}
			}
        }
        return params;
    },
    
    /**
	 * Function which will register event for Reference Fields Selection
	 */
	registerReferenceSelectionEvent : function(container) {
		this._super(container);
		var self = this;
		
		this.accountsReferenceField.on(Vtiger_Edit_Js.referenceSelectionEvent, function(e, data){
			self.referenceSelectionEventHandler(data, container);
		});
	},
    
    /**
	 * Function to search module names
	 */
	searchModuleNames : function(params) {
		var aDeferred = jQuery.Deferred();

		if(typeof params.module == 'undefined') {
			params.module = app.getModuleName();
		}
		if(typeof params.action == 'undefined') {
			params.action = 'BasicAjax';
		}
		
		if(typeof params.base_record == 'undefined') {
			var record = jQuery('[name="record"]');
			var recordId = app.getRecordId();
			if(record.length) {
				params.base_record = record.val();
			} else if(recordId) {
				params.base_record = recordId;
			} else if(app.view() == 'List') {
				var editRecordId = jQuery('#listview-table').find('tr.listViewEntries.edited').data('id');
				if(editRecordId) {
					params.base_record = editRecordId;
				}
			}
		}

		if (params.search_module == 'Contacts' || params.search_module == 'Potentials') {
			var form = this.getForm();
			if(this.accountsReferenceField.length > 0 && this.accountsReferenceField.val().length > 0) {
				var closestContainer = this.accountsReferenceField.closest('td');
				params.parent_id = this.accountsReferenceField.val();
				params.parent_module = closestContainer.find('[name="popupReferenceModule"]').val();
			} else if(params.search_module == 'Potentials') {
				
				if(this.contactsReferenceField.length > 0 && this.contactsReferenceField.val().length > 0) {
					closestContainer = this.contactsReferenceField.closest('td');
					params.parent_id = this.contactsReferenceField.val();
					params.parent_module = closestContainer.find('[name="popupReferenceModule"]').val();
				}
			}
		}
        
        // Added for overlay edit as the module is different
        if(params.search_module == 'Products' || params.search_module == 'Services') {
            params.module = 'Quotes';
        }

		app.request.get({'data':params}).then(
			function(error, data){
                if(error == null) {
                    aDeferred.resolve(data);
                }
			},
			function(error){
				aDeferred.reject();
			}
		)
		return aDeferred.promise();
	},
        registerBasicEvents: function(container){
            this._super(container);
            this.registerForTogglingBillingandShippingAddress();
            this.registerEventForCopyAddress();
            this.registerAcompteSoldeCalculation();
        },

        /**
         * Enregistrer les événements pour le calcul automatique Acompte/Solde
         */
        registerAcompteSoldeCalculation: function() {
            // Charger les données des produits et services une seule fois au démarrage
            Quotes_Edit_Js.loadProductsAcompteSoldeData(function() {
                // Une fois les données chargées, faire le calcul initial
                Quotes_Edit_Js.calculateAcompteSoldeTotals();
            });

            // Écouter les changements de quantité et prix
            jQuery(document).on('change blur focusout', '.qty, input[name^="listPrice"]', function() {
                setTimeout(function() {
                    Quotes_Edit_Js.calculateAcompteSoldeTotals();
                }, 300);
            });

            // Écouter l'ajout/suppression de lignes
            jQuery(document).on('DOMNodeInserted DOMNodeRemoved', '.lineItemTable', function() {
                setTimeout(function() {
                    Quotes_Edit_Js.calculateAcompteSoldeTotals();
                }, 500);
            });

            // IMPORTANT : Recalculer juste avant la sauvegarde du formulaire
            jQuery(document).on('click', 'button[name="saveButton"], button[type="submit"]', function() {
                Quotes_Edit_Js.calculateAcompteSoldeTotals();
            });

            // CUSTOM: Écouter les changements des champs forfait
            jQuery(document).on('change blur', '[name="cf_1127"], [name="cf_1129"], [name="cf_1133"], [name="cf_1135"]', function() {
                setTimeout(function() {
                    Quotes_Edit_Js.calculateAcompteSoldeTotals();
                }, 300);
            });

            // CUSTOM: Écouter les changements du champ assurance
            jQuery(document).on('change blur', '[name="cf_1141"]', function() {
                setTimeout(function() {
                    Quotes_Edit_Js.calculateAcompteSoldeTotals();
                }, 300);
            });

            // Recalculer toutes les 2 secondes pendant l'édition (pour capturer tous les changements)
            var calculationInterval = setInterval(function() {
                if (jQuery('.editViewPageDiv').length > 0) {
                    Quotes_Edit_Js.calculateAcompteSoldeTotals();
                } else {
                    clearInterval(calculationInterval);
                }
            }, 2000);
        }
});