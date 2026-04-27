/*+***********************************************************************************
 * The contents of this file are subject to the vtiger CRM Public License Version 1.0
 * ("License"); You may not use this file except in compliance with the License
 * The Original Code is: vtiger CRM Open Source
 * The Initial Developer of the Original Code is vtiger.
 * Portions created by vtiger are Copyright (C) vtiger.
 * All Rights Reserved.
 *************************************************************************************/

Vtiger_Detail_Js("Leads_Detail_Js", {}, {
	registerAjaxPreSaveEvents: function (container) {
		var thisInstance = this;
		app.event.on(Vtiger_Detail_Js.PreAjaxSaveEvent, function (e) {
			if (!thisInstance.checkForPortalUser(container)) {
				e.preventDefault();
			}
		});
	},
	/**
	 * Function to check for Portal User
	 */
	checkForPortalUser: function (form) {
		var element = jQuery('[name="portal"]', form);
		var response = element.is(':checked');
		
		if (response) {
			var primaryEmailField = jQuery('[data-name="email"]');

			if (primaryEmailField.length == 0) {
				app.helper.showErrorNotification({message: app.vtranslate('JS_PRIMARY_EMAIL_FIELD_DOES_NOT_EXISTS')});
				return false;
			}

			var primaryEmailValue = primaryEmailField.data("value");
			if (primaryEmailValue == "") {
				app.helper.showErrorNotification({message: app.vtranslate('JS_PLEASE_ENTER_PRIMARY_EMAIL_VALUE_TO_ENABLE_PORTAL_USER')});
				return false;
			}
		}
		return true;
	},
	/**
	 * Function which will register all the events
	 */
	registerEvents: function () {
		var form = this.getForm();
		this._super();

		// Vérifier si un rappel est en attente dans localStorage
		this.checkPendingRappel();

		// Détecter les modifications inline (crayon)
		this.registerRappelInlineEditDetection();

		this.registerAjaxPreSaveEvents(form);
		this.registerClickToCallButtons();
		this.registerClickToCallOnAjaxLoad();
		this.checkEmailConfirmationForConvert();

		// Address autocomplete on inline edit
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
					console.log('[RAPPEL LEADS DETAIL] Rappel en attente trouvé:', data);

					// Supprimer de localStorage
					localStorage.removeItem('rappel_pending');

					// Ouvrir le popup
					this.openRappelPopup(data.recordId, data.recordName);
				} else {
					// Trop vieux, supprimer
					console.log('[RAPPEL LEADS DETAIL] Rappel expiré, suppression');
					localStorage.removeItem('rappel_pending');
				}
			} catch(e) {
				console.error('[RAPPEL LEADS DETAIL] Erreur lors de la lecture de localStorage:', e);
				localStorage.removeItem('rappel_pending');
			}
		}
	},

	/**
	 * Détecte le changement de statut vers "A Rappeler" via édition inline (crayon)
	 */
	registerRappelInlineEditDetection: function() {
		var thisInstance = this;

		// Écouter les requêtes AJAX SaveAjax pour détecter les changements de statut
		jQuery(document).ajaxComplete(function(event, xhr, settings) {
			console.log('[RAPPEL LEADS DETAIL DEBUG] AJAX complete, type:', typeof settings.data, 'url:', settings.url);

			// Vérifier si settings.data est un objet FormData ou un objet
			var dataStr = '';
			if (typeof settings.data === 'string') {
				dataStr = settings.data;
			} else if (settings.data && typeof settings.data === 'object') {
				// Convertir l'objet en string pour le chercher
				try {
					dataStr = JSON.stringify(settings.data);
				} catch(e) {
					// Si c'est FormData, essayer de lire depuis l'URL
					dataStr = settings.url || '';
				}
			}

			console.log('[RAPPEL LEADS DETAIL DEBUG] data string:', dataStr.substring(0, 200));

			// Vérifier si c'est une requête SaveAjax pour Leads
			if (dataStr &&
				dataStr.indexOf('SaveAjax') > -1 &&
				dataStr.indexOf('Leads') > -1) {

				console.log('[RAPPEL LEADS DETAIL DEBUG] SaveAjax pour Leads détecté');

				// Vérifier si le champ leadstatus a été modifié vers "A Rappeler"
				// Accepter différents formats: A+Rappeler, A%20Rappeler, A Rappeler
				if (dataStr.indexOf('leadstatus') > -1 &&
					(dataStr.indexOf('A+Rappeler') > -1 ||
					 dataStr.indexOf('A%20Rappeler') > -1 ||
					 dataStr.indexOf('A Rappeler') > -1 ||
					 dataStr.indexOf('"value":"A Rappeler"') > -1)) {

					var recordMatch = dataStr.match(/record["\s:=]+(\d+)/);
					if (recordMatch) {
						var recordId = recordMatch[1];

						console.log('[RAPPEL LEADS DETAIL] Statut changé vers A Rappeler via inline edit, ID:', recordId);

						// Attendre que la page soit mise à jour
						setTimeout(function() {
							// Construire le nom du prospect depuis les champs de la page
							var firstname = jQuery('[data-name="firstname"]').data('value') || '';
							var lastname = jQuery('[data-name="lastname"]').data('value') || '';
							var company = jQuery('[data-name="company"]').data('value') || '';

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

							console.log('[RAPPEL LEADS DETAIL] Ouverture popup pour:', recordName);
							thisInstance.openRappelPopup(recordId, recordName);
						}, 500);
					}
				}
			}
		});
	},

	/**
	 * Ouvre le popup de création de rappel
	 */
	openRappelPopup: function(recordId, recordName) {
		console.log('[RAPPEL LEADS DETAIL] openRappelPopup appelé avec recordId:', recordId, 'recordName:', recordName);
		var module = 'Leads';

		// Récupérer l'ID de l'utilisateur connecté
		var userId = 1; // Défaut
		try {
			if (typeof app !== 'undefined' && app.getUserId) {
				userId = app.getUserId();
				console.log('[RAPPEL LEADS DETAIL] User ID récupéré:', userId);
			}
		} catch(e) {
			console.log('[RAPPEL LEADS DETAIL] Impossible de récupérer l\'ID utilisateur, utilisation de 1 par défaut');
		}

		// Utiliser l'URL de base du site
		var baseUrl = window.location.protocol + '//' + window.location.host + '/';
		var popupUrl = baseUrl + 'rappel_popup.php?module=' + module +
		               '&record_id=' + recordId +
		               '&record_name=' + encodeURIComponent(recordName) +
		               '&user_id=' + userId;

		console.log('[RAPPEL LEADS DETAIL] URL du popup:', popupUrl);

		// Ouvrir dans un nouvel onglet
		var newTab = window.open(popupUrl, '_blank');
		if (newTab) {
			console.log('[RAPPEL LEADS DETAIL] Onglet ouvert avec succès');
			newTab.focus();
		} else {
			console.error('[RAPPEL LEADS DETAIL] Impossible d\'ouvrir l\'onglet');
		}
	},

	/**
	 * Vérifie si l'email est confirmé et désactive le bouton "Convertir" si nécessaire
	 * DÉSACTIVÉ - Validation côté serveur uniquement
	 */
	checkEmailConfirmationForConvert: function() {
		// Validation désactivée - vérification côté serveur uniquement
		console.log('Validation email côté client désactivée - vérification côté serveur uniquement');
		return;
	},

	/**
	 * Twilio Click-to-Call: Écoute les chargements AJAX pour ajouter les boutons
	 */
	registerClickToCallOnAjaxLoad: function() {
		var self = this;

		// Écouter les clics sur les onglets (Résumé, Détails, etc.)
		jQuery(document).on('click', '.detailViewInfo .nav-link, .detailview-header .nav-link, a[data-toggle="tab"]', function() {
			setTimeout(function() {
				self.registerClickToCallButtons();
			}, 200);
		});

		// Écouter les événements de mise à jour du widget
		jQuery(document).on('DetailView.Widget.Updated', function() {
			setTimeout(function() {
				self.registerClickToCallButtons();
			}, 100);
		});

		// Scanner périodiquement - optimisé à 1 seconde
		setInterval(function() {
			self.registerClickToCallButtons();
		}, 1000);
	},

	/**
	 * Twilio Click-to-Call: Ajoute les boutons d'appel à côté des champs téléphone
	 * Détecte automatiquement tous les numéros de téléphone dans la page
	 */
	registerClickToCallButtons: function() {
		var self = this;

		// Pattern pour détecter les numéros de téléphone
		var phonePattern = /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/;

		// Chercher tous les champs avec class "value" dans la page de détail - UNIQUEMENT les champs de type phone
		jQuery('td.fieldValue span.value').each(function() {
			var $field = jQuery(this);

			// Supprimer tous les anciens boutons d'abord
			$field.find('.twilio-call-btn').remove();

			// Vérifier que c'est un champ de type phone uniquement
			var fieldType = $field.closest('td').data('field-type') || $field.closest('td').attr('data-fieldtype');

			if (fieldType !== 'phone') {
				return; // Ignorer tous les champs qui ne sont pas de type phone
			}

			// Maintenant récupérer le texte propre (sans les boutons)
			var text = $field.text().trim();

			// Vérifier si le champ contient un numéro
			if (text && text !== '' && text !== '-' && text.length >= 8) {
				// Ajouter le bouton
				self.addCallButtonToField($field, 'auto');
			}
		});
	},

	/**
	 * Ajoute un bouton d'appel à un champ
	 */
	addCallButtonToField: function($field, fieldName) {
		var self = this;
		var phoneNumber = $field.text().trim();

		if (phoneNumber && phoneNumber !== '' && phoneNumber !== '-') {
			var cleanNumber = self.cleanPhoneNumber(phoneNumber);

			// Vérifier si le bouton n'existe pas déjà
			if ($field.find('.twilio-call-btn').length === 0) {
				var callButton = self.createCallButton(cleanNumber, fieldName);
				$field.append(callButton);
			}
		}
	},

	/**
	 * Nettoie un numéro de téléphone
	 */
	cleanPhoneNumber: function(phone) {
		var cleaned = phone.replace(/[\s\.\-\(\)]/g, '');

		if (!cleaned.startsWith('+')) {
			if (cleaned.startsWith('0')) {
				cleaned = '+33' + cleaned.substring(1);
			} else {
				cleaned = '+' + cleaned;
			}
		}

		return cleaned;
	},

	/**
	 * Crée un bouton d'appel
	 */
	createCallButton: function(phoneNumber, fieldName) {
		var self = this;

		var button = jQuery('<button>')
			.addClass('btn btn-success btn-sm twilio-call-btn')
			.attr('type', 'button')
			.attr('data-phone', phoneNumber)
			.attr('title', 'Appeler via Twilio: ' + phoneNumber)
			.css({
				'margin-left': '10px',
				'padding': '2px 8px',
				'font-size': '11px',
				'background-color': '#25D366',
				'border-color': '#25D366'
			})
			.html('<i class="fa fa-phone"></i>');

		button.on('click', function(e) {
			e.preventDefault();
			e.stopPropagation();
			var phone = jQuery(this).data('phone');
			self.makeCall(phone);
		});

		return button;
	},

	/**
	 * Passe l'appel via Twilio (appel direct)
	 */
	makeCall: function(phoneNumber) {
		var self = this;

		var url = 'twilio_call.php?to=' + encodeURIComponent(phoneNumber);

		jQuery.ajax({
			url: url,
			method: 'GET',
			dataType: 'json',
			success: function(response) {
				if (response.success) {
					// Créer le bouton de raccrochage fixe
					self.showHangupButton(response.call_sid, phoneNumber);
				} else {
					var params = {
						text: 'Erreur: ' + response.error,
						type: 'error'
					};
					Vtiger_Helper_Js.showPnotify(params);
				}
			},
			error: function(xhr, status, error) {
				var params = {
					text: 'Erreur: ' + error,
					type: 'error'
				};
				Vtiger_Helper_Js.showPnotify(params);
			}
		});
	},

	/**
	 * Affiche le bouton de raccrochage
	 */
	showHangupButton: function(callSid, phoneNumber) {
		var self = this;

		// Supprimer l'ancien bouton s'il existe
		jQuery('#twilio-hangup-widget').remove();

		// Créer le widget de raccrochage
		var widget = jQuery('<div>')
			.attr('id', 'twilio-hangup-widget')
			.attr('data-call-sid', callSid)
			.css({
				'position': 'fixed',
				'top': '80px',
				'right': '20px',
				'background': '#d9534f',
				'color': 'white',
				'padding': '15px 20px',
				'border-radius': '8px',
				'box-shadow': '0 4px 8px rgba(0,0,0,0.3)',
				'z-index': '9999',
				'font-size': '14px',
				'min-width': '250px'
			})
			.html(
				'<div style="margin-bottom:10px;"><i class="fa fa-phone"></i> Appel vers ' + phoneNumber + '</div>' +
				'<button class="btn btn-light btn-sm" id="twilio-hangup-btn" style="width:100%;"><i class="fa fa-phone"></i> Raccrocher</button>'
			);

		jQuery('body').append(widget);

		// Événement de clic sur le bouton
		jQuery('#twilio-hangup-btn').on('click', function() {
			self.hangupCall(callSid);
		});
	},

	/**
	 * Raccroche un appel via Twilio
	 */
	hangupCall: function(callSid) {
		var url = 'twilio_hangup.php?call_sid=' + encodeURIComponent(callSid);

		jQuery.ajax({
			url: url,
			method: 'GET',
			dataType: 'json',
			success: function(response) {
				jQuery('#twilio-hangup-widget').remove();

				if (!response.success) {
					var params = {
						text: 'Erreur: ' + response.error,
						type: 'error'
					};
					Vtiger_Helper_Js.showPnotify(params);
				}
			},
			error: function(xhr, status, error) {
				jQuery('#twilio-hangup-widget').remove();
				var params = {
					text: 'Erreur: ' + error,
					type: 'error'
				};
				Vtiger_Helper_Js.showPnotify(params);
			}
		});
	},

	// =====================================================
	// ADDRESS AUTOCOMPLETE (api-adresse.data.gouv.fr)
	// =====================================================

	// Address field groups: { address, postal, city }
	addressFieldGroups: [
		{ address: 'lane', postal: 'code', city: 'city', label: 'Départ' },
		{ address: 'cf_975', postal: 'cf_979', city: 'cf_973', label: 'Arrivée' }
	],

	registerAddressAutocomplete: function() {
		var self = this;

		// Inject CSS for dropdown (once)
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

		// Use event delegation to detect when inline edit inputs appear
		// City fields: autocomplete city + fill postal
		jQuery(document).on('focus', 'input[name="city"], input[name="cf_973"]', function() {
			var input = jQuery(this);
			if (input.data('autocomplete-bound')) return;
			input.data('autocomplete-bound', true);

			var fieldName = input.attr('name');
			var group = self.findGroupByField(fieldName, 'city');
			if (group) {
				self.initCityAutocomplete(input, group);
			}
		});

		// Postal code fields: auto-fill city on 5 digits
		jQuery(document).on('focus', 'input[name="code"], input[name="cf_979"]', function() {
			var input = jQuery(this);
			if (input.data('autocomplete-bound')) return;
			input.data('autocomplete-bound', true);

			var fieldName = input.attr('name');
			var group = self.findGroupByField(fieldName, 'postal');
			if (group) {
				self.initPostalAutofill(input, group);
			}
		});

		// Address fields: autocomplete address + fill postal + city
		jQuery(document).on('focus', 'input[name="lane"], input[name="cf_975"]', function() {
			var input = jQuery(this);
			if (input.data('autocomplete-bound')) return;
			input.data('autocomplete-bound', true);

			var fieldName = input.attr('name');
			var group = self.findGroupByField(fieldName, 'address');
			if (group) {
				self.initAddressAutocomplete(input, group);
			}
		});

		console.log('[Leads] Address autocomplete registered');
	},

	findGroupByField: function(fieldName, type) {
		for (var i = 0; i < this.addressFieldGroups.length; i++) {
			if (this.addressFieldGroups[i][type] === fieldName) {
				return this.addressFieldGroups[i];
			}
		}
		return null;
	},

	saveFieldAjax: function(fieldName, value) {
		var recordId = jQuery('#recordId').val();
		if (!recordId) return;

		jQuery.ajax({
			url: 'index.php',
			type: 'POST',
			data: {
				module: 'Leads',
				action: 'SaveAjax',
				record: recordId,
				field: fieldName,
				value: value
			}
		});
	},

	updateInlineField: function(fieldName, value) {
		// Update the displayed value in detail view
		var fieldEl = jQuery('[data-name="' + fieldName + '"]');
		if (fieldEl.length) {
			fieldEl.find('.value').text(value);
			fieldEl.data('value', value);
		}
		// Also update any visible input
		var inputEl = jQuery('input[name="' + fieldName + '"]');
		if (inputEl.length) {
			inputEl.val(value);
		}
	},

	initPostalAutofill: function(postalInput, group) {
		var self = this;
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
							if (data.features && data.features.length > 0) {
								var city = data.features[0].properties.city;
								self.updateInlineField(group.city, city);
								self.saveFieldAjax(group.city, city);
								postalInput.css('background-color', '#e8f5e9');
								setTimeout(function() { postalInput.css('background-color', ''); }, 1000);
							}
						}
					});
				}, 300);
			}
		});
	},

	initCityAutocomplete: function(cityInput, group) {
		var self = this;
		var acTimeout;
		var dropdownId = 'ac-city-' + group.city;

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
									jQuery('#' + dropdownId).remove();
									self.updateInlineField(group.postal, postcode);
									self.saveFieldAjax(group.city, city);
									self.saveFieldAjax(group.postal, postcode);
								})
								.appendTo(dropdown);
						});

						var offset = cityInput.offset();
						dropdown.css({
							top: offset.top + cityInput.outerHeight(),
							left: offset.left,
							width: cityInput.outerWidth()
						});
						jQuery('body').append(dropdown);
					}
				});
			}, 300);
		});

		cityInput.on('blur', function() {
			setTimeout(function() { jQuery('#' + dropdownId).remove(); }, 200);
		});
	},

	initAddressAutocomplete: function(addressInput, group) {
		var self = this;
		var acTimeout;
		var dropdownId = 'ac-addr-' + group.address;

		addressInput.attr('autocomplete', 'off');
		addressInput.on('input', function() {
			clearTimeout(acTimeout);
			var query = jQuery(this).val().trim();
			if (query.length < 3) { jQuery('#' + dropdownId).remove(); return; }

			acTimeout = setTimeout(function() {
				var reqData = { q: query, type: 'housenumber', limit: 8 };
				// Use existing postal code to narrow results
				var existingPostal = jQuery('input[name="' + group.postal + '"]').val();
				if (!existingPostal) {
					var postalEl = jQuery('[data-name="' + group.postal + '"]');
					existingPostal = postalEl.data('value') || postalEl.find('.value').text();
				}
				if (existingPostal && String(existingPostal).trim().length === 5) {
					reqData.postcode = String(existingPostal).trim();
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
									jQuery('#' + dropdownId).remove();
									self.updateInlineField(group.postal, postcode);
									self.updateInlineField(group.city, city);
									self.saveFieldAjax(group.address, street);
									self.saveFieldAjax(group.postal, postcode);
									self.saveFieldAjax(group.city, city);
								})
								.appendTo(dropdown);
						});

						var offset = addressInput.offset();
						dropdown.css({
							top: offset.top + addressInput.outerHeight(),
							left: offset.left,
							width: Math.max(addressInput.outerWidth(), 300)
						});
						jQuery('body').append(dropdown);
					}
				});
			}, 300);
		});

		addressInput.on('blur', function() {
			setTimeout(function() { jQuery('#' + dropdownId).remove(); }, 200);
		});
	}
})
