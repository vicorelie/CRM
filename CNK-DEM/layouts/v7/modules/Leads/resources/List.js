/*+***********************************************************************************
 * The contents of this file are subject to the vtiger CRM Public License Version 1.0
 * ("License"); You may not use this file except in compliance with the License
 * The Original Code is: vtiger CRM Open Source
 * The Initial Developer of the Original Code is vtiger.
 * Portions created by vtiger are Copyright (C) vtiger.
 * All Rights Reserved.
 *************************************************************************************/

Vtiger_List_Js("Leads_List_Js", {}, {

	/**
	 * Function which will register all the events
	 */
	registerEvents: function() {
		this._super();
		this.registerClickToCallButtons();
		this.registerRappelListDetection();
	},

	/**
	 * Twilio Click-to-Call: Ajoute les boutons d'appel dans la liste
	 * Détecte automatiquement tous les numéros de téléphone
	 */
	registerClickToCallButtons: function() {
		var self = this;

		// Pattern pour détecter les numéros de téléphone
		var phonePattern = /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/;

		// Chercher tous les numéros de téléphone dans la liste - UNIQUEMENT les champs de type phone
		jQuery('td.listViewEntryValue span.value').each(function() {
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
				var cleanNumber = self.cleanPhoneNumber(text);
				var callButton = self.createCallButton(cleanNumber);
				$field.append(callButton);
			}
		});
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
	createCallButton: function(phoneNumber) {
		var self = this;

		var button = jQuery('<button>')
			.addClass('btn btn-success btn-xs twilio-call-btn')
			.attr('type', 'button')
			.attr('data-phone', phoneNumber)
			.attr('title', 'Appeler via Twilio: ' + phoneNumber)
			.css({
				'margin-left': '8px',
				'padding': '1px 6px',
				'font-size': '10px',
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

	/**
	 * Détecte le changement de statut vers "A Rappeler" dans la liste
	 */
	registerRappelListDetection: function() {
		var thisInstance = this;

		// Écouter les requêtes AJAX SaveAjax pour détecter les changements de statut
		jQuery(document).ajaxComplete(function(event, xhr, settings) {
			// Vérifier si c'est une requête SaveAjax
			if (settings.data && typeof settings.data === 'string' && settings.data.indexOf('action=SaveAjax') > -1) {
				// Vérifier si le champ leadstatus a été modifié vers "A Rappeler"
				if (settings.data.indexOf('leadstatus=') > -1 && settings.data.indexOf('leadstatus=A+Rappeler') > -1) {
					// Extraire l'ID de l'enregistrement
					var recordMatch = settings.data.match(/record=(\d+)/);
					if (recordMatch) {
						var recordId = recordMatch[1];

						console.log('[RAPPEL LEADS LIST] Statut changé vers A Rappeler via AJAX, ID:', recordId);

						// Attendre que la liste soit rechargée
						setTimeout(function() {
							var $row = jQuery('tr.listViewEntries[data-id="' + recordId + '"]');
							if ($row.length > 0) {
								console.log('[RAPPEL LEADS LIST] Ligne trouvée, ouverture popup...');
								thisInstance.openRappelPopupFromList(recordId, $row);
							} else {
								console.warn('[RAPPEL LEADS LIST] Ligne non trouvée après rechargement');
							}
						}, 1000);
					}
				}
			}
		});
	},

	/**
	 * Ouvre le popup de rappel depuis la liste
	 */
	openRappelPopupFromList: function(recordId, $row) {
		console.log('[RAPPEL LEADS LIST] openRappelPopupFromList appelé avec ID:', recordId);

		var module = 'Leads';

		// Construire le nom du prospect depuis firstname, lastname, company
		var firstname = $row.find('td[data-field-name="firstname"] .value').text().trim();
		var lastname = $row.find('td[data-field-name="lastname"] .value').text().trim();
		var company = $row.find('td[data-field-name="company"] .value').text().trim();

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

		// Récupérer l'ID utilisateur
		var userId = 1;
		try {
			if (typeof app !== 'undefined' && app.getUserId) {
				userId = app.getUserId();
				console.log('[RAPPEL LEADS LIST] User ID récupéré:', userId);
			}
		} catch(e) {
			console.log('[RAPPEL LEADS LIST] Impossible de récupérer l\'ID utilisateur, utilisation de 1 par défaut');
		}

		// Construire l'URL du popup
		var baseUrl = window.location.protocol + '//' + window.location.host + '/';
		var popupUrl = baseUrl + 'rappel_popup.php?module=' + module +
					   '&record_id=' + recordId +
					   '&record_name=' + encodeURIComponent(recordName) +
					   '&user_id=' + userId;

		console.log('[RAPPEL LEADS LIST] URL du popup:', popupUrl);

		// Ouvrir dans un nouvel onglet
		var newTab = window.open(popupUrl, '_blank');
		if (newTab) {
			console.log('[RAPPEL LEADS LIST] Onglet ouvert avec succès');
			newTab.focus();
		} else {
			console.error('[RAPPEL LEADS LIST] Impossible d\'ouvrir l\'onglet');
		}
	}
})
