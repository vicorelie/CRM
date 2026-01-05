/*+***********************************************************************************
 * The contents of this file are subject to the vtiger CRM Public License Version 1.0
 * ("License"); You may not use this file except in compliance with the License
 * The Original Code is: vtiger CRM Open Source
 * The Initial Developer of the Original Code is vtiger.
 * Portions created by vtiger are Copyright (C) vtiger.
 * All Rights Reserved.
 *************************************************************************************/

Vtiger_Detail_Js("Potentials_Detail_Js", {
	/**
	 * Generate Quote - Opens standalone popup to quickly create a quote from this Potential
	 */
	generateQuote: function(potentialId) {
		var url = 'quote_popup.php?record=' + potentialId;
		window.open(url, 'quote_popup', 'width=1000,height=800,scrollbars=yes,resizable=yes');
	}
}, {
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
					console.log('[RAPPEL DETAIL] Rappel en attente trouvé:', data);

					// Supprimer de localStorage
					localStorage.removeItem('rappel_pending');

					// Ouvrir le popup
					this.openRappelPopup(data.recordId, data.recordName);
				} else {
					// Trop vieux, supprimer
					console.log('[RAPPEL DETAIL] Rappel expiré, suppression');
					localStorage.removeItem('rappel_pending');
				}
			} catch(e) {
				console.error('[RAPPEL DETAIL] Erreur lors de la lecture de localStorage:', e);
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
			console.log('[RAPPEL DETAIL DEBUG] AJAX complete, type:', typeof settings.data, 'url:', settings.url);

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

			console.log('[RAPPEL DETAIL DEBUG] data string:', dataStr.substring(0, 200));

			// Vérifier si c'est une requête SaveAjax pour Potentials
			if (dataStr &&
				dataStr.indexOf('SaveAjax') > -1 &&
				dataStr.indexOf('Potentials') > -1) {

				console.log('[RAPPEL DETAIL DEBUG] SaveAjax pour Potentials détecté');

				// Vérifier si le champ cf_971 (statut) a été modifié vers "A Rappeler"
				// Accepter différents formats: A+Rappeler, A%20Rappeler, A Rappeler
				if (dataStr.indexOf('cf_971') > -1 &&
					(dataStr.indexOf('A+Rappeler') > -1 ||
					 dataStr.indexOf('A%20Rappeler') > -1 ||
					 dataStr.indexOf('A Rappeler') > -1 ||
					 dataStr.indexOf('"value":"A Rappeler"') > -1)) {

					var recordMatch = dataStr.match(/record["\s:=]+(\d+)/);
					if (recordMatch) {
						var recordId = recordMatch[1];

						console.log('[RAPPEL DETAIL] Statut changé vers A Rappeler via inline edit, ID:', recordId);

						// Attendre que la page soit mise à jour
						setTimeout(function() {
							// Récupérer le nom de l'affaire depuis la page
							var recordName = jQuery('[data-name="potentialname"]').data('value') || 'Cette affaire';

							console.log('[RAPPEL DETAIL] Ouverture popup pour:', recordName);
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
		console.log('[RAPPEL DETAIL] openRappelPopup appelé avec recordId:', recordId, 'recordName:', recordName);
		var module = 'Potentials';

		// Récupérer l'ID de l'utilisateur connecté
		var userId = 1; // Défaut
		try {
			if (typeof app !== 'undefined' && app.getUserId) {
				userId = app.getUserId();
				console.log('[RAPPEL DETAIL] User ID récupéré:', userId);
			}
		} catch(e) {
			console.log('[RAPPEL DETAIL] Impossible de récupérer l\'ID utilisateur, utilisation de 1 par défaut');
		}

		// Utiliser l'URL de base du site
		var baseUrl = window.location.protocol + '//' + window.location.host + '/';
		var popupUrl = baseUrl + 'rappel_popup.php?module=' + module +
		               '&record_id=' + recordId +
		               '&record_name=' + encodeURIComponent(recordName) +
		               '&user_id=' + userId;

		console.log('[RAPPEL DETAIL] URL du popup:', popupUrl);

		// Ouvrir dans un nouvel onglet
		var newTab = window.open(popupUrl, '_blank');
		if (newTab) {
			console.log('[RAPPEL DETAIL] Onglet ouvert avec succès');
			newTab.focus();
		} else {
			console.error('[RAPPEL DETAIL] Impossible d\'ouvrir l\'onglet');
		}
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
	}
})
