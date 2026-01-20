/*+***********************************************************************************
 * Potentials Edit View - Gestion automatique des rappels
 *************************************************************************************/

Vtiger_Edit_Js("Potentials_Edit_Js", {}, {

    // Configuration des paires code postal / ville
    postalCityPairs: [
        { postal: 'cf_935', city: 'cf_933' },     // Départ
        { postal: 'cf_951', city: 'cf_949' },     // Arrivée
        { postal: 'cf_1099', city: 'cf_1103' },   // Départ-2
        { postal: 'cf_1101', city: 'cf_1105' },   // Départ-3
        { postal: 'cf_1111', city: 'cf_1115' },   // Arrivé-2
        { postal: 'cf_1113', city: 'cf_1117' },   // Arrivé-3
        { postal: 'cf_1263', city: 'cf_1265' }    // Société
    ],

    // Configuration des groupes adresse / code postal / ville
    addressGroups: [
        { address: 'cf_955', postal: 'cf_935', city: 'cf_933', label: 'Départ' },
        { address: 'cf_957', postal: 'cf_951', city: 'cf_949', label: 'Arrivée' },
        { address: 'cf_1107', postal: 'cf_1099', city: 'cf_1103', label: 'Départ-2' },
        { address: 'cf_1109', postal: 'cf_1101', city: 'cf_1105', label: 'Départ-3' },
        { address: 'cf_1119', postal: 'cf_1111', city: 'cf_1115', label: 'Arrivé-2' },
        { address: 'cf_1121', postal: 'cf_1113', city: 'cf_1117', label: 'Arrivé-3' },
        { address: 'cf_1267', postal: 'cf_1263', city: 'cf_1265', label: 'Société' }
    ],

    /**
     * Fonction appelée après le chargement de la page
     */
    registerEvents: function() {
        this._super();
        console.log('[RAPPEL] registerEvents appelé');

        // Vérifier si un rappel est en attente dans localStorage
        this.checkPendingRappel();

        this.registerRappelDetection();

        // Initialiser l'auto-complétion code postal / ville
        console.log('[POSTAL] ========== SCRIPT CHARGÉ ==========');

        // Afficher un indicateur visuel temporaire pour confirmer le chargement
        jQuery('body').append('<div id="postal-debug" style="position:fixed;bottom:10px;right:10px;background:#4CAF50;color:white;padding:10px 15px;border-radius:5px;z-index:99999;font-size:12px;">Auto-complétion CP/Ville activée</div>');
        setTimeout(function() { jQuery('#postal-debug').fadeOut(3000); }, 2000);

        this.registerPostalCityAutoComplete();
        this.registerAddressAutoComplete();
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
                    console.log('[RAPPEL] Rappel en attente trouvé:', data);

                    // Supprimer de localStorage
                    localStorage.removeItem('rappel_pending');

                    // Ouvrir le popup
                    this.openRappelPopup(data.recordId, data.recordName);
                } else {
                    // Trop vieux, supprimer
                    console.log('[RAPPEL] Rappel expiré, suppression');
                    localStorage.removeItem('rappel_pending');
                }
            } catch(e) {
                console.error('[RAPPEL] Erreur lors de la lecture de localStorage:', e);
                localStorage.removeItem('rappel_pending');
            }
        }
    },

    /**
     * Détecte le changement de statut vers "A Rappeler" et stocke dans localStorage
     */
    registerRappelDetection: function() {
        // Surveiller le changement du champ cf_971 (statut)
        var statutField = jQuery('[name="cf_971"]');
        if (statutField.length > 0) {
            var initialStatus = statutField.val();
            console.log('[RAPPEL] Statut initial:', initialStatus);

            // Écouter la soumission du formulaire
            jQuery('#EditView').on('submit', function() {
                var newStatus = statutField.val();
                console.log('[RAPPEL] Soumission formulaire, statut:', newStatus);

                // Si le statut change vers "A Rappeler"
                if (newStatus === 'A Rappeler' && initialStatus !== 'A Rappeler') {
                    var recordId = jQuery('[name="record"]').val();
                    var recordName = jQuery('[name="potentialname"]').val() || 'Cette affaire';

                    // Stocker dans localStorage pour ouvrir le popup après redirection
                    localStorage.setItem('rappel_pending', JSON.stringify({
                        module: 'Potentials',
                        recordId: recordId,
                        recordName: recordName,
                        timestamp: new Date().getTime()
                    }));

                    console.log('[RAPPEL] Info stockée dans localStorage');
                }
            });
        }
    },

    /**
     * Ouvre le popup de création de rappel
     */
    openRappelPopup: function(recordId, recordName) {
        console.log('[RAPPEL] openRappelPopup appelé avec recordId:', recordId, 'recordName:', recordName);
        var module = 'Potentials';

        // Récupérer l'ID de l'utilisateur connecté
        var userId = 1; // Défaut
        try {
            if (typeof app !== 'undefined' && app.getUserId) {
                userId = app.getUserId();
                console.log('[RAPPEL] User ID récupéré:', userId);
            }
        } catch(e) {
            console.log('[RAPPEL] Impossible de récupérer l\'ID utilisateur, utilisation de 1 par défaut');
        }

        // Utiliser l'URL de base du site
        var baseUrl = window.location.protocol + '//' + window.location.host + '/';
        var popupUrl = baseUrl + 'rappel_popup.php?module=' + module +
                       '&record_id=' + recordId +
                       '&record_name=' + encodeURIComponent(recordName) +
                       '&user_id=' + userId;

        console.log('[RAPPEL] URL du popup:', popupUrl);

        // Ouvrir dans un nouvel onglet
        var newTab = window.open(popupUrl, '_blank');
        if (newTab) {
            console.log('[RAPPEL] Onglet ouvert avec succès');
            newTab.focus();
        } else {
            console.error('[RAPPEL] Impossible d\'ouvrir l\'onglet');
        }
    },

    /**
     * Récupère l'ID du record actuel
     */
    getRecordId: function() {
        var recordId = jQuery('[name="record"]').val();
        if (!recordId) {
            // Si on est en mode Quick Create ou autre
            var url = window.location.href;
            var match = url.match(/record=(\d+)/);
            if (match) {
                recordId = match[1];
            }
        }
        return recordId;
    },

    /**
     * Initialise l'auto-complétion code postal / ville via API Base Adresse Nationale
     */
    registerPostalCityAutoComplete: function() {
        var self = this;
        console.log('[POSTAL] Initialisation auto-complétion code postal / ville');

        // Attendre un peu que le DOM soit complètement chargé
        setTimeout(function() {
            var foundPairs = 0;

            self.postalCityPairs.forEach(function(pair) {
                // Essayer plusieurs sélecteurs
                var postalField = jQuery('input[name="' + pair.postal + '"], input[data-fieldname="' + pair.postal + '"]');
                var cityField = jQuery('input[name="' + pair.city + '"], input[data-fieldname="' + pair.city + '"]');

                console.log('[POSTAL] Recherche paire:', pair.postal, '→', postalField.length, '|', pair.city, '→', cityField.length);

                if (postalField.length > 0 && cityField.length > 0) {
                    foundPairs++;
                    console.log('[POSTAL] ✓ Paire trouvée:', pair.postal, '↔', pair.city);

                    // Ajouter un indicateur visuel (icône)
                    postalField.css('background', 'linear-gradient(to right, #fff 90%, #e8f5e9 100%)');
                    cityField.css('background', 'linear-gradient(to right, #fff 90%, #e8f5e9 100%)');

                    // Code postal → Ville (déclenché quand on quitte le champ OU après 5 chiffres)
                    postalField.off('change.postal blur.postal input.postal').on('change.postal blur.postal input.postal', function() {
                        var postalCode = jQuery(this).val().trim();
                        if (postalCode.length === 5 && /^\d{5}$/.test(postalCode)) {
                            console.log('[POSTAL] Code postal valide détecté:', postalCode);
                            // Indicateur visuel de chargement
                            cityField.css('background', '#fffde7');
                            self.fetchCityFromPostalCode(postalCode, cityField);
                        }
                    });

                    // Ville → Code postal (autocomplétion)
                    self.initCityAutocomplete(cityField, postalField);
                }
            });

            console.log('[POSTAL] Total paires trouvées:', foundPairs, '/', self.postalCityPairs.length);

            // Afficher debug visible
            if (foundPairs === 0) {
                jQuery('#postal-debug').css('background', '#f44336').text('Aucun champ CP/Ville trouvé !');
            } else {
                jQuery('#postal-debug').text(foundPairs + ' paire(s) CP/Ville activée(s)');
            }
        }, 500);
    },

    /**
     * Récupère la ville à partir du code postal via l'API
     */
    fetchCityFromPostalCode: function(postalCode, cityField) {
        var self = this;
        console.log('[POSTAL] Recherche ville pour code postal:', postalCode);

        jQuery.ajax({
            url: 'https://api-adresse.data.gouv.fr/search/',
            data: {
                q: postalCode,
                type: 'municipality',
                postcode: postalCode,
                limit: 5
            },
            success: function(response) {
                if (response.features && response.features.length > 0) {
                    var cities = response.features.map(function(f) {
                        return f.properties.city || f.properties.label;
                    });

                    // Supprimer les doublons
                    cities = [...new Set(cities)];

                    if (cities.length === 1) {
                        // Une seule ville, remplir automatiquement
                        cityField.val(cities[0]);
                        cityField.css('background', '#e8f5e9'); // Vert clair pour indiquer le succès
                        setTimeout(function() { cityField.css('background', ''); }, 2000);
                        console.log('[POSTAL] Ville trouvée:', cities[0]);
                    } else if (cities.length > 1) {
                        // Plusieurs villes, proposer un choix
                        cityField.css('background', '');
                        self.showCitySelector(cities, cityField);
                    }
                } else {
                    console.log('[POSTAL] Aucune ville trouvée pour:', postalCode);
                    cityField.css('background', '#ffebee'); // Rouge clair pour erreur
                    setTimeout(function() { cityField.css('background', ''); }, 2000);
                }
            },
            error: function(xhr, status, error) {
                console.error('[POSTAL] Erreur API:', error);
                cityField.css('background', '#ffebee');
                setTimeout(function() { cityField.css('background', ''); }, 2000);
            }
        });
    },

    /**
     * Affiche un sélecteur si plusieurs villes correspondent au code postal
     */
    showCitySelector: function(cities, cityField) {
        var select = jQuery('<select class="postal-city-selector" style="position:absolute;z-index:9999;background:#fff;border:1px solid #667eea;border-radius:4px;padding:5px;box-shadow:0 2px 10px rgba(0,0,0,0.2);"></select>');
        select.append('<option value="">-- Choisir une ville --</option>');
        cities.forEach(function(city) {
            select.append('<option value="' + city + '">' + city + '</option>');
        });

        // Positionner le sélecteur
        var offset = cityField.offset();
        select.css({
            top: offset.top + cityField.outerHeight(),
            left: offset.left,
            minWidth: cityField.outerWidth()
        });

        jQuery('body').append(select);

        select.on('change', function() {
            var selectedCity = jQuery(this).val();
            if (selectedCity) {
                cityField.val(selectedCity);
            }
            select.remove();
        });

        // Fermer si clic ailleurs
        jQuery(document).one('click', function(e) {
            if (!jQuery(e.target).is(select)) {
                select.remove();
            }
        });

        select.focus();
    },

    /**
     * Initialise l'autocomplétion sur le champ ville
     */
    initCityAutocomplete: function(cityField, postalField) {
        var self = this;
        var autocompleteList = null;

        cityField.on('input', function() {
            var query = jQuery(this).val().trim();

            // Supprimer l'ancienne liste
            if (autocompleteList) {
                autocompleteList.remove();
                autocompleteList = null;
            }

            if (query.length < 2) return;

            jQuery.ajax({
                url: 'https://api-adresse.data.gouv.fr/search/',
                data: {
                    q: query,
                    type: 'municipality',
                    limit: 8
                },
                success: function(response) {
                    if (response.features && response.features.length > 0) {
                        self.showCityAutocomplete(response.features, cityField, postalField);
                    }
                }
            });
        });

        // Fermer la liste si on quitte le champ
        cityField.on('blur', function() {
            setTimeout(function() {
                jQuery('.postal-autocomplete-list').remove();
            }, 200);
        });
    },

    /**
     * Affiche la liste d'autocomplétion des villes
     */
    showCityAutocomplete: function(features, cityField, postalField) {
        // Supprimer l'ancienne liste
        jQuery('.postal-autocomplete-list').remove();

        var list = jQuery('<ul class="postal-autocomplete-list" style="position:absolute;z-index:9999;background:#fff;border:1px solid #667eea;border-radius:4px;padding:0;margin:0;list-style:none;box-shadow:0 2px 10px rgba(0,0,0,0.2);max-height:200px;overflow-y:auto;"></ul>');

        features.forEach(function(f) {
            var city = f.properties.city || f.properties.label;
            var postcode = f.properties.postcode || '';
            var context = f.properties.context || '';

            var item = jQuery('<li style="padding:8px 12px;cursor:pointer;border-bottom:1px solid #eee;"></li>');
            item.html('<strong>' + city + '</strong> <span style="color:#666;">(' + postcode + ')</span><br><small style="color:#999;">' + context + '</small>');

            item.on('mouseenter', function() {
                jQuery(this).css('background', '#f0f4ff');
            }).on('mouseleave', function() {
                jQuery(this).css('background', '#fff');
            });

            item.on('click', function() {
                cityField.val(city);
                if (postcode) {
                    postalField.val(postcode);
                }
                list.remove();
                console.log('[POSTAL] Ville sélectionnée:', city, '- CP:', postcode);
            });

            list.append(item);
        });

        // Positionner la liste
        var offset = cityField.offset();
        list.css({
            top: offset.top + cityField.outerHeight(),
            left: offset.left,
            minWidth: cityField.outerWidth()
        });

        jQuery('body').append(list);
    },

    /**
     * Initialise l'auto-complétion des adresses
     */
    registerAddressAutoComplete: function() {
        var self = this;
        console.log('[ADDRESS] Initialisation auto-complétion adresses');

        setTimeout(function() {
            var foundGroups = 0;

            self.addressGroups.forEach(function(group) {
                // Les champs adresse peuvent être des input OU des textarea (uitype 21)
                var addressField = jQuery('input[name="' + group.address + '"], input[data-fieldname="' + group.address + '"], textarea[name="' + group.address + '"], textarea[data-fieldname="' + group.address + '"]');
                var postalField = jQuery('input[name="' + group.postal + '"], input[data-fieldname="' + group.postal + '"]');
                var cityField = jQuery('input[name="' + group.city + '"], input[data-fieldname="' + group.city + '"]');

                console.log('[ADDRESS] Recherche groupe:', group.label, '- Adresse:', addressField.length, '| CP:', postalField.length, '| Ville:', cityField.length);

                if (addressField.length > 0) {
                    foundGroups++;
                    console.log('[ADDRESS] ✓ Groupe trouvé:', group.label);

                    // Indicateur visuel
                    addressField.css('background', 'linear-gradient(to right, #fff 90%, #e3f2fd 100%)');

                    // Auto-complétion sur le champ adresse
                    self.initAddressAutocomplete(addressField, postalField, cityField, group.label);
                }
            });

            console.log('[ADDRESS] Total groupes adresse trouvés:', foundGroups, '/', self.addressGroups.length);

            // Mettre à jour l'indicateur debug
            var debugEl = jQuery('#postal-debug');
            if (debugEl.length > 0 && foundGroups > 0) {
                debugEl.text(debugEl.text().replace('activée(s)', 'activée(s) + ' + foundGroups + ' adresse(s)'));
            }
        }, 600);
    },

    /**
     * Initialise l'autocomplétion sur un champ adresse
     */
    initAddressAutocomplete: function(addressField, postalField, cityField, groupLabel) {
        var self = this;
        var debounceTimer = null;

        addressField.on('input', function() {
            var query = jQuery(this).val().trim();

            // Supprimer l'ancienne liste
            jQuery('.address-autocomplete-list').remove();

            if (query.length < 3) return;

            // Debounce pour éviter trop de requêtes
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(function() {
                // Construire les paramètres de recherche
                var params = {
                    q: query,
                    type: 'housenumber',
                    limit: 8
                };

                // Si un code postal est déjà renseigné, l'utiliser pour filtrer
                if (postalField.length > 0) {
                    var existingPostal = postalField.val().trim();
                    if (existingPostal.length === 5 && /^\d{5}$/.test(existingPostal)) {
                        params.postcode = existingPostal;
                        console.log('[ADDRESS] Recherche contextuelle avec CP:', existingPostal);
                    }
                }

                // Indicateur de chargement
                addressField.css('background', '#fffde7');

                jQuery.ajax({
                    url: 'https://api-adresse.data.gouv.fr/search/',
                    data: params,
                    success: function(response) {
                        addressField.css('background', '');
                        if (response.features && response.features.length > 0) {
                            self.showAddressAutocomplete(response.features, addressField, postalField, cityField);
                        }
                    },
                    error: function() {
                        addressField.css('background', '#ffebee');
                        setTimeout(function() { addressField.css('background', ''); }, 2000);
                    }
                });
            }, 300);
        });

        // Fermer la liste si on quitte le champ
        addressField.on('blur', function() {
            setTimeout(function() {
                jQuery('.address-autocomplete-list').remove();
            }, 200);
        });
    },

    /**
     * Affiche la liste d'autocomplétion des adresses
     */
    showAddressAutocomplete: function(features, addressField, postalField, cityField) {
        // Supprimer l'ancienne liste
        jQuery('.address-autocomplete-list').remove();

        var list = jQuery('<ul class="address-autocomplete-list" style="position:absolute;z-index:9999;background:#fff;border:1px solid #2196F3;border-radius:4px;padding:0;margin:0;list-style:none;box-shadow:0 2px 10px rgba(0,0,0,0.2);max-height:250px;overflow-y:auto;"></ul>');

        features.forEach(function(f) {
            var props = f.properties;
            var fullAddress = props.name || props.label;
            var postcode = props.postcode || '';
            var city = props.city || '';
            var context = props.context || '';

            var item = jQuery('<li style="padding:10px 12px;cursor:pointer;border-bottom:1px solid #eee;"></li>');
            item.html(
                '<div style="font-weight:500;color:#333;">' + fullAddress + '</div>' +
                '<div style="font-size:12px;color:#666;">' + postcode + ' ' + city + '</div>' +
                '<div style="font-size:11px;color:#999;">' + context + '</div>'
            );

            item.on('mouseenter', function() {
                jQuery(this).css('background', '#e3f2fd');
            }).on('mouseleave', function() {
                jQuery(this).css('background', '#fff');
            });

            item.on('click', function() {
                // Remplir l'adresse
                addressField.val(fullAddress);
                addressField.css('background', '#e8f5e9');
                setTimeout(function() { addressField.css('background', ''); }, 2000);

                // Remplir le code postal si disponible
                if (postcode && postalField.length > 0) {
                    postalField.val(postcode);
                    postalField.css('background', '#e8f5e9');
                    setTimeout(function() { postalField.css('background', ''); }, 2000);
                }

                // Remplir la ville si disponible
                if (city && cityField.length > 0) {
                    cityField.val(city);
                    cityField.css('background', '#e8f5e9');
                    setTimeout(function() { cityField.css('background', ''); }, 2000);
                }

                list.remove();
                console.log('[ADDRESS] Adresse sélectionnée:', fullAddress, '- CP:', postcode, '- Ville:', city);
            });

            list.append(item);
        });

        // Positionner la liste
        var offset = addressField.offset();
        list.css({
            top: offset.top + addressField.outerHeight(),
            left: offset.left,
            minWidth: Math.max(addressField.outerWidth(), 300)
        });

        jQuery('body').append(list);
    }
});
