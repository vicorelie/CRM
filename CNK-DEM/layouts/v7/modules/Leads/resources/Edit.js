/*+***********************************************************************************
 * Leads (Prospects) Edit View - Gestion automatique des rappels
 *************************************************************************************/

Vtiger_Edit_Js("Leads_Edit_Js", {}, {

    /**
     * Fonction appelée après le chargement de la page
     */
    registerEvents: function() {
        this._super();
        console.log('[RAPPEL LEADS] registerEvents appelé');

        // Vérifier si un rappel est en attente dans localStorage
        this.checkPendingRappel();

        this.registerRappelDetection();
        this.registerAddressAutocomplete();
    },

    /**
     * Vérifie si un rappel est en attente et l'ouvre si nécessaire
     */
    checkPendingRappel: function() {
        var rappelData = localStorage.getItem('rappel_pending');
        if (rappelData) {
            try {
                var data = JSON.parse(rappelData);

                // Vérifier que ce n'est pas trop vieux (max 5 minutes)
                var now = new Date().getTime();
                if (now - data.timestamp < 300000) { // 5 minutes = 300000ms
                    console.log('[RAPPEL LEADS] Rappel en attente trouvé:', data);

                    // Supprimer de localStorage
                    localStorage.removeItem('rappel_pending');

                    // Ouvrir le popup
                    this.openRappelPopup(data.recordId, data.recordName);
                } else {
                    // Trop vieux, supprimer
                    console.log('[RAPPEL LEADS] Rappel expiré, suppression');
                    localStorage.removeItem('rappel_pending');
                }
            } catch(e) {
                console.error('[RAPPEL LEADS] Erreur lors de la lecture de localStorage:', e);
                localStorage.removeItem('rappel_pending');
            }
        }
    },

    /**
     * Détecte le changement de statut vers "A Rappeler" et stocke dans localStorage
     */
    registerRappelDetection: function() {
        var thisInstance = this;

        // Surveiller le changement du champ leadstatus
        var statutField = jQuery('[name="leadstatus"]');
        if (statutField.length > 0) {
            var initialStatus = statutField.val();
            console.log('[RAPPEL LEADS] Statut initial:', initialStatus);

            // Écouter la soumission du formulaire
            jQuery('#EditView').on('submit', function() {
                var newStatus = statutField.val();
                console.log('[RAPPEL LEADS] Soumission formulaire, statut:', newStatus);

                // Si le statut change vers "A Rappeler"
                if (newStatus === 'A Rappeler' && initialStatus !== 'A Rappeler') {
                    var recordId = jQuery('[name="record"]').val();

                    // Construire le nom du prospect
                    var firstname = jQuery('[name="firstname"]').val() || '';
                    var lastname = jQuery('[name="lastname"]').val() || '';
                    var company = jQuery('[name="company"]').val() || '';

                    var recordName = '';
                    if (firstname || lastname) {
                        recordName = (firstname + ' ' + lastname).trim();
                    }
                    if (company && recordName) {
                        recordName += ' (' + company + ')';
                    } else if (company) {
                        recordName = company;
                    }
                    if (!recordName) {
                        recordName = 'Ce prospect';
                    }

                    // Stocker dans localStorage pour ouvrir le popup après redirection
                    localStorage.setItem('rappel_pending', JSON.stringify({
                        module: 'Leads',
                        recordId: recordId,
                        recordName: recordName,
                        timestamp: new Date().getTime()
                    }));

                    console.log('[RAPPEL LEADS] Info stockée dans localStorage');
                }
            });
        }
    },

    /**
     * Ouvre le popup de création de rappel
     */
    openRappelPopup: function(recordId, recordName) {
        console.log('[RAPPEL LEADS] openRappelPopup appelé avec recordId:', recordId, 'recordName:', recordName);
        var module = 'Leads';

        // Récupérer l'ID de l'utilisateur connecté
        var userId = 1; // Défaut
        try {
            if (typeof app !== 'undefined' && app.getUserId) {
                userId = app.getUserId();
                console.log('[RAPPEL LEADS] User ID récupéré:', userId);
            }
        } catch(e) {
            console.log('[RAPPEL LEADS] Impossible de récupérer l\'ID utilisateur, utilisation de 1 par défaut');
        }

        // Utiliser l'URL de base du site
        var baseUrl = window.location.protocol + '//' + window.location.host + '/';
        var popupUrl = baseUrl + 'rappel_popup.php?module=' + module +
                       '&record_id=' + recordId +
                       '&record_name=' + encodeURIComponent(recordName) +
                       '&user_id=' + userId;

        console.log('[RAPPEL LEADS] URL du popup:', popupUrl);

        // Ouvrir dans un nouvel onglet
        var newTab = window.open(popupUrl, '_blank');
        if (newTab) {
            console.log('[RAPPEL LEADS] Onglet ouvert avec succès');
            newTab.focus();
        } else {
            console.error('[RAPPEL LEADS] Impossible d\'ouvrir l\'onglet');
        }
    },

    /**
     * Récupère l'ID du record actuel
     */
    getRecordId: function() {
        var recordId = jQuery('[name="record"]').val();
        if (!recordId) {
            var url = window.location.href;
            var match = url.match(/record=(\d+)/);
            if (match) {
                recordId = match[1];
            }
        }
        return recordId;
    },

    // =====================================================
    // ADDRESS AUTOCOMPLETE (api-adresse.data.gouv.fr)
    // =====================================================

    addressFieldGroups: [
        { address: 'lane', postal: 'code', city: 'city', label: 'Départ' },
        { address: 'cf_975', postal: 'cf_979', city: 'cf_973', label: 'Arrivée' }
    ],

    registerAddressAutocomplete: function() {
        var self = this;

        // Inject CSS
        if (!jQuery('#address-autocomplete-css').length) {
            jQuery('head').append(
                '<style id="address-autocomplete-css">' +
                '.address-autocomplete-dropdown { background:#fff; border:1px solid #ddd; border-radius:8px; box-shadow:0 4px 15px rgba(0,0,0,.15); max-height:300px; overflow-y:auto; position:absolute; z-index:99999; }' +
                '.address-autocomplete-dropdown .autocomplete-item { padding:10px 12px; cursor:pointer; border-bottom:1px solid #f0f0f0; transition:background .15s; }' +
                '.address-autocomplete-dropdown .autocomplete-item:last-child { border-bottom:none; }' +
                '.address-autocomplete-dropdown .autocomplete-item:hover { background:#f5f5f5; }' +
                '.address-autocomplete-dropdown .autocomplete-item strong { color:#333; }' +
                '</style>'
            );
        }

        this.addressFieldGroups.forEach(function(group) {
            var cityInput = jQuery('[name="' + group.city + '"]');
            var postalInput = jQuery('[name="' + group.postal + '"]');
            var addressInput = jQuery('[name="' + group.address + '"]');

            if (postalInput.length) {
                self.initPostalAutofill(postalInput, cityInput, group);
            }
            if (cityInput.length) {
                self.initCityAutocomplete(cityInput, postalInput, group);
            }
            if (addressInput.length) {
                self.initAddressAutocomplete(addressInput, postalInput, cityInput, group);
            }
        });

        console.log('[Leads Edit] Address autocomplete registered');
    },

    initPostalAutofill: function(postalInput, cityInput, group) {
        var timeout;
        postalInput.on('input change blur', function() {
            var val = jQuery(this).val().trim();
            if (val.length === 5) {
                clearTimeout(timeout);
                timeout = setTimeout(function() {
                    jQuery.ajax({
                        url: 'https://api-adresse.data.gouv.fr/search/',
                        data: { q: val, type: 'municipality', postcode: val, limit: 1 },
                        success: function(data) {
                            if (data.features && data.features.length > 0 && cityInput.length) {
                                cityInput.val(data.features[0].properties.city);
                                postalInput.css('background-color', '#e8f5e9');
                                setTimeout(function() { postalInput.css('background-color', ''); }, 1000);
                            }
                        }
                    });
                }, 300);
            }
        });
    },

    initCityAutocomplete: function(cityInput, postalInput, group) {
        var acTimeout;
        var dropdownId = 'ac-edit-city-' + group.city;

        cityInput.attr('autocomplete', 'off');
        cityInput.on('input', function() {
            clearTimeout(acTimeout);
            var query = jQuery(this).val().trim();
            if (query.length < 2) { jQuery('#' + dropdownId).remove(); return; }

            acTimeout = setTimeout(function() {
                jQuery.ajax({
                    url: 'https://api-adresse.data.gouv.fr/search/',
                    data: { q: query, type: 'municipality', limit: 8 },
                    success: function(data) {
                        jQuery('#' + dropdownId).remove();
                        if (!data.features || data.features.length === 0) return;

                        var dropdown = jQuery('<div id="' + dropdownId + '" class="address-autocomplete-dropdown"></div>');
                        data.features.forEach(function(f) {
                            var city = f.properties.city;
                            var postcode = f.properties.postcode;
                            jQuery('<div class="autocomplete-item"></div>')
                                .html('<strong>' + city + '</strong> <span style="color:#666">(' + postcode + ')</span>')
                                .on('mousedown', function(e) {
                                    e.preventDefault();
                                    cityInput.val(city);
                                    if (postalInput.length) postalInput.val(postcode);
                                    jQuery('#' + dropdownId).remove();
                                })
                                .appendTo(dropdown);
                        });

                        var offset = cityInput.offset();
                        dropdown.css({ top: offset.top + cityInput.outerHeight(), left: offset.left, width: cityInput.outerWidth() });
                        jQuery('body').append(dropdown);
                    }
                });
            }, 300);
        });

        cityInput.on('blur', function() {
            setTimeout(function() { jQuery('#' + dropdownId).remove(); }, 200);
        });
    },

    initAddressAutocomplete: function(addressInput, postalInput, cityInput, group) {
        var acTimeout;
        var dropdownId = 'ac-edit-addr-' + group.address;

        addressInput.attr('autocomplete', 'off');
        addressInput.on('input', function() {
            clearTimeout(acTimeout);
            var query = jQuery(this).val().trim();
            if (query.length < 3) { jQuery('#' + dropdownId).remove(); return; }

            acTimeout = setTimeout(function() {
                var reqData = { q: query, type: 'housenumber', limit: 8 };
                if (postalInput.length) {
                    var pc = postalInput.val().trim();
                    if (pc.length === 5) reqData.postcode = pc;
                }

                jQuery.ajax({
                    url: 'https://api-adresse.data.gouv.fr/search/',
                    data: reqData,
                    success: function(data) {
                        jQuery('#' + dropdownId).remove();
                        if (!data.features || data.features.length === 0) return;

                        var dropdown = jQuery('<div id="' + dropdownId + '" class="address-autocomplete-dropdown"></div>');
                        data.features.forEach(function(f) {
                            var street = f.properties.name;
                            var postcode = f.properties.postcode;
                            var city = f.properties.city;
                            jQuery('<div class="autocomplete-item"></div>')
                                .html('<strong>' + street + '</strong><br><span style="color:#666;font-size:11px">' + postcode + ' ' + city + '</span>')
                                .on('mousedown', function(e) {
                                    e.preventDefault();
                                    addressInput.val(street);
                                    if (postalInput.length) postalInput.val(postcode);
                                    if (cityInput.length) cityInput.val(city);
                                    jQuery('#' + dropdownId).remove();
                                })
                                .appendTo(dropdown);
                        });

                        var offset = addressInput.offset();
                        dropdown.css({ top: offset.top + addressInput.outerHeight(), left: offset.left, width: Math.max(addressInput.outerWidth(), 300) });
                        jQuery('body').append(dropdown);
                    }
                });
            }, 300);
        });

        addressInput.on('blur', function() {
            setTimeout(function() { jQuery('#' + dropdownId).remove(); }, 200);
        });
    }
});
