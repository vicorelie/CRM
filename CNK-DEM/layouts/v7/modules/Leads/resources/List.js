/*+***********************************************************************************
 * The contents of this file are subject to the vtiger CRM Public License Version 1.0
 * ("License"); You may not use this file except in compliance with the License
 * The Original Code is: vtiger CRM Open Source
 * The Initial Developer of the Original Code is vtiger.
 * Portions created by vtiger are Copyright (C) vtiger.
 * All Rights Reserved.
 *************************************************************************************/

Vtiger_List_Js("Leads_List_Js", {

	/**
	 * Static: Show import choice (Classique vs Movehub)
	 */
	showImportChoice: function() {
		jQuery('#importChoiceModal').remove();

		var html =
			'<div class="modal fade" id="importChoiceModal" tabindex="-1" role="dialog">' +
			'<div class="modal-dialog" role="document" style="max-width:480px;">' +
			'<div class="modal-content" style="border-radius:8px;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,0.15);">' +
			'<div class="modal-header" style="background:linear-gradient(135deg,#2c3e50,#3498db);color:#fff;border:0;padding:18px 24px;">' +
			'<button type="button" class="close" data-dismiss="modal" style="color:#fff;opacity:0.8;text-shadow:none;">&times;</button>' +
			'<h4 class="modal-title" style="font-weight:600;font-size:17px;"><i class="fa fa-download"></i>&nbsp; Importer des prospects</h4>' +
			'</div>' +
			'<div class="modal-body" style="padding:28px 24px;">' +
			'<p style="text-align:center;color:#666;margin-bottom:20px;font-size:14px;">Choisissez le type d\'import :</p>' +
			'<div class="row">' +
			'<div class="col-xs-6" style="padding-right:8px;">' +
			'<div id="importClassicBtn" style="cursor:pointer;border:2px solid #e0e0e0;border-radius:8px;padding:24px 12px;text-align:center;transition:all 0.2s;"' +
			' onmouseover="this.style.borderColor=\'#3498db\';this.style.boxShadow=\'0 4px 12px rgba(52,152,219,0.15)\'"' +
			' onmouseout="this.style.borderColor=\'#e0e0e0\';this.style.boxShadow=\'none\'">' +
			'<div style="font-size:32px;color:#7f8c8d;margin-bottom:10px;"><i class="fa fa-database"></i></div>' +
			'<div style="font-weight:600;font-size:15px;color:#2c3e50;">Classique</div>' +
			'<div style="font-size:11px;color:#999;margin-top:6px;">Import VTiger standard</div>' +
			'</div></div>' +
			'<div class="col-xs-6" style="padding-left:8px;">' +
			'<div id="importMovehubBtn" style="cursor:pointer;border:2px solid #3498db;border-radius:8px;padding:24px 12px;text-align:center;background:#f0f8ff;transition:all 0.2s;"' +
			' onmouseover="this.style.borderColor=\'#2980b9\';this.style.boxShadow=\'0 4px 12px rgba(52,152,219,0.25)\'"' +
			' onmouseout="this.style.borderColor=\'#3498db\';this.style.boxShadow=\'none\'">' +
			'<div style="font-size:32px;color:#3498db;margin-bottom:10px;"><i class="fa fa-upload"></i></div>' +
			'<div style="font-weight:600;font-size:15px;color:#2c3e50;">Movehub</div>' +
			'<div style="font-size:11px;color:#999;margin-top:6px;">Import CSV leads</div>' +
			'</div></div>' +
			'</div>' +
			'</div></div></div></div>';

		jQuery('body').append(html);
		var $modal = jQuery('#importChoiceModal');
		$modal.modal('show');

		$modal.find('#importClassicBtn').on('click', function() {
			$modal.modal('hide');
			Vtiger_Import_Js.triggerImportAction('index.php?module=Leads&view=Import');
		});

		$modal.find('#importMovehubBtn').on('click', function() {
			$modal.modal('hide');
			Leads_List_Js.showImportCSVModal();
		});

		$modal.on('hidden.bs.modal', function() {
			jQuery('#importChoiceModal').remove();
		});
	},

	/**
	 * Static: Show import CSV modal
	 */
	showImportCSVModal: function() {
		// Remove existing modal
		jQuery('#importCSVModal').remove();

		// Build modal HTML inline
		var modalHtml =
			'<div class="modal fade" id="importCSVModal" tabindex="-1" role="dialog">' +
			'<div class="modal-dialog" role="document" style="max-width:600px;">' +
			'<div class="modal-content" style="border-radius:8px;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,0.15);">' +
			'<div class="modal-header" style="background:linear-gradient(135deg,#2c3e50,#3498db);color:#fff;border:0;padding:18px 24px;">' +
			'<button type="button" class="close" data-dismiss="modal" style="color:#fff;opacity:0.8;text-shadow:none;">&times;</button>' +
			'<h4 class="modal-title" style="font-weight:600;font-size:17px;"><i class="fa fa-upload"></i>&nbsp; Import Movehub</h4>' +
			'</div>' +
			'<div class="modal-body" style="padding:24px;">' +
			'<form id="importCSVForm" enctype="multipart/form-data">' +
			'<div style="border:2px dashed #ccc;border-radius:8px;padding:24px;text-align:center;background:#fafafa;transition:all 0.2s;" id="csvDropZone">' +
			'<div style="font-size:36px;color:#bbb;margin-bottom:8px;"><i class="fa fa-cloud-upload"></i></div>' +
			'<label for="csvFileInput" style="cursor:pointer;color:#3498db;font-weight:600;font-size:14px;">Choisir un fichier CSV</label>' +
			'<input type="file" name="csv_file" id="csvFileInput" accept=".csv" style="display:none;" required />' +
			'<p style="color:#999;font-size:12px;margin:6px 0 0;">Format attendu : leads_v2_*.csv</p>' +
			'<div id="csvFileName" style="display:none;margin-top:10px;padding:8px 12px;background:#e8f5e9;border-radius:4px;color:#2e7d32;font-size:13px;"><i class="fa fa-file-text-o"></i>&nbsp; <span></span></div>' +
			'</div>' +
			'<div style="margin-top:16px;">' +
			'<label style="font-weight:normal;color:#555;font-size:13px;cursor:pointer;">' +
			'<input type="checkbox" name="skip_duplicates" id="skipDuplicates" checked style="margin-right:6px;" /> Ignorer les doublons (email)' +
			'</label></div>' +
			'</form>' +
			'<div style="margin-top:16px;">' +
			'<a href="#" onclick="jQuery(\'#csvMappingTable\').slideToggle(200);return false;" style="font-size:12px;color:#7f8c8d;text-decoration:none;"><i class="fa fa-info-circle"></i> Voir le mappage des champs</a>' +
			'<div style="max-height:200px;overflow-y:auto;">' +
			'<table class="table table-condensed table-bordered" id="csvMappingTable" style="display:none;margin-top:8px;font-size:11px;border-radius:4px;">' +
			'<thead style="background:#f5f6fa;"><tr><th style="width:40%">CSV</th><th style="width:30%">Champ VTiger</th><th style="width:30%">Notes</th></tr></thead>' +
			'<tbody>' +
			'<tr><td>Name</td><td>Prénom + Nom</td><td>Dernier mot = Nom</td></tr>' +
			'<tr><td>Phone</td><td>Téléphone + Mobile</td><td>Copié dans les 2</td></tr>' +
			'<tr><td>Email</td><td>E-Mail</td><td></td></tr>' +
			'<tr><td>Address Line 1</td><td>Adresse (départ)</td><td></td></tr>' +
			'<tr><td>City</td><td>Ville (départ)</td><td></td></tr>' +
			'<tr><td>Postcode</td><td>Code Postal (départ)</td><td></td></tr>' +
			'<tr><td>Country</td><td>Pays</td><td>FRA &rarr; France</td></tr>' +
			'<tr><td>Company Name</td><td>Société</td><td></td></tr>' +
			'<tr><td>Job Title</td><td>Fonction</td><td></td></tr>' +
			'<tr><td>Lead Reference</td><td>Description</td><td>Ref: xxx</td></tr>' +
			'<tr><td>Category</td><td>Description</td><td>Catégorie: xxx</td></tr>' +
			'<tr style="background:#eaf4fc;"><td colspan="3"><strong>Champ Questions (pipe-séparé)</strong></td></tr>' +
			'<tr><td>Destination Zipcode</td><td>CP arrivée</td><td>cf_979</td></tr>' +
			'<tr><td>Destination City</td><td>Ville arrivée</td><td>cf_973</td></tr>' +
			'<tr><td>Moving Date</td><td>Date déménagement</td><td>cf_1192</td></tr>' +
			'<tr><td>Items to be shipped</td><td>Volume</td><td>cf_1307</td></tr>' +
			'<tr><td>Size of move</td><td>Description</td><td>Taille: xxx</td></tr>' +
			'</tbody></table></div></div>' +
			'<div id="importCSVProgress" style="display:none;margin-top:20px;">' +
			'<div class="progress" style="border-radius:6px;height:8px;overflow:hidden;"><div class="progress-bar progress-bar-striped active" style="width:100%;background:#3498db;"></div></div>' +
			'<p style="text-align:center;color:#888;font-size:12px;margin-top:6px;">Import en cours...</p>' +
			'</div>' +
			'<div id="importCSVResults" style="display:none;margin-top:20px;">' +
			'<div id="importCSVSummary" class="alert" style="display:none;border-radius:6px;"></div>' +
			'<div id="importCSVDetails" style="max-height:250px;overflow-y:auto;">' +
			'<table class="table table-condensed table-bordered" id="importCSVTable" style="display:none;font-size:12px;">' +
			'<thead style="background:#f5f6fa;"><tr><th>Ligne</th><th>Nom</th><th>Statut</th><th>Détail</th></tr></thead>' +
			'<tbody></tbody></table></div></div>' +
			'</div>' +
			'<div class="modal-footer" style="border-top:1px solid #eee;padding:16px 24px;">' +
			'<button type="button" class="btn btn-default" data-dismiss="modal" style="border-radius:5px;">Fermer</button>' +
			'<button type="button" class="btn btn-primary" id="importCSVSubmitBtn" style="border-radius:5px;background:#3498db;border-color:#3498db;padding:8px 24px;"><i class="fa fa-upload"></i>&nbsp; Importer</button>' +
			'</div></div></div></div>';

		jQuery('body').append(modalHtml);
		var $modal = jQuery('#importCSVModal');
		$modal.modal('show');

		// File input: show name + highlight drop zone
		$modal.find('#csvFileInput').on('change', function() {
			var name = this.files && this.files[0] ? this.files[0].name : '';
			if (name) {
				$modal.find('#csvFileName span').text(name);
				$modal.find('#csvFileName').show();
				$modal.find('#csvDropZone').css({'border-color': '#3498db', 'background': '#f0f8ff'});
			} else {
				$modal.find('#csvFileName').hide();
				$modal.find('#csvDropZone').css({'border-color': '#ccc', 'background': '#fafafa'});
			}
		});

		// Click on drop zone triggers file input
		$modal.find('#csvDropZone').on('click', function(e) {
			if (e.target.tagName !== 'INPUT') {
				$modal.find('#csvFileInput').trigger('click');
			}
		});

		// Register submit handler
		$modal.find('#importCSVSubmitBtn').on('click', function() {
			Leads_List_Js.submitCSVImport($modal);
		});

		// Cleanup on close
		$modal.on('hidden.bs.modal', function() {
			jQuery('#importCSVModal').remove();
		});
	},

	/**
	 * Static: Submit CSV import via AJAX
	 */
	submitCSVImport: function($modal) {
		var fileInput = $modal.find('#csvFileInput')[0];
		if (!fileInput.files || !fileInput.files.length) {
			Vtiger_Helper_Js.showPnotify({text: 'Veuillez sélectionner un fichier CSV', type: 'error'});
			return;
		}

		var formData = new FormData();
		formData.append('csv_file', fileInput.files[0]);
		formData.append('module', 'Leads');
		formData.append('action', 'ImportCSV');
		formData.append('skip_refunded', $modal.find('#skipRefunded').is(':checked') ? '1' : '0');
		formData.append('skip_duplicates', $modal.find('#skipDuplicates').is(':checked') ? '1' : '0');

		// Show progress, hide form
		$modal.find('#importCSVSubmitBtn').prop('disabled', true);
		$modal.find('#importCSVProgress').show();
		$modal.find('#importCSVResults').hide();

		jQuery.ajax({
			url: 'index.php',
			method: 'POST',
			data: formData,
			processData: false,
			contentType: false,
			dataType: 'json',
			success: function(response) {
				$modal.find('#importCSVProgress').hide();
				$modal.find('#importCSVSubmitBtn').prop('disabled', false);
				$modal.find('#importCSVResults').show();

				var result = response.result || response;

				if (result.success) {
					var summaryClass = result.errors > 0 ? 'alert-warning' : 'alert-success';
					var summaryHtml = '<strong>Import terminé !</strong><br>' +
						'Total: ' + result.total + ' lignes<br>' +
						'<span class="text-success">Créés: ' + result.created + '</span><br>' +
						'<span class="text-muted">Ignorés: ' + result.skipped + '</span>';
					if (result.errors > 0) {
						summaryHtml += '<br><span class="text-danger">Erreurs: ' + result.errors + '</span>';
					}

					$modal.find('#importCSVSummary')
						.removeClass('alert-success alert-warning alert-danger')
						.addClass(summaryClass)
						.html(summaryHtml)
						.show();

					// Fill details table
					if (result.details && result.details.length > 0) {
						var $tbody = $modal.find('#importCSVTable tbody');
						$tbody.empty();
						jQuery.each(result.details, function(i, detail) {
							var statusBadge = '';
							if (detail.status === 'created') {
								statusBadge = '<span class="label label-success">Créé</span>';
							} else if (detail.status === 'skipped') {
								statusBadge = '<span class="label label-default">Ignoré</span>';
							} else {
								statusBadge = '<span class="label label-danger">Erreur</span>';
							}
							var info = detail.reason || (detail.lead_id ? 'ID: ' + detail.lead_id : '');
							$tbody.append(
								'<tr>' +
								'<td>' + detail.row + '</td>' +
								'<td>' + (detail.name || '') + '</td>' +
								'<td>' + statusBadge + '</td>' +
								'<td>' + info + '</td>' +
								'</tr>'
							);
						});
						$modal.find('#importCSVTable').show();
					}

					// Reload list view if leads were created
					if (result.created > 0) {
						setTimeout(function() {
							var listInstance = Vtiger_List_Js.getInstance();
							if (listInstance && listInstance.getListViewRecords) {
								listInstance.getListViewRecords();
							}
						}, 500);
					}
				} else {
					$modal.find('#importCSVSummary')
						.removeClass('alert-success alert-warning')
						.addClass('alert-danger')
						.html('<strong>Erreur:</strong> ' + (result.error || 'Erreur inconnue'))
						.show();
				}
			},
			error: function(xhr, status, error) {
				$modal.find('#importCSVProgress').hide();
				$modal.find('#importCSVSubmitBtn').prop('disabled', false);
				$modal.find('#importCSVResults').show();
				$modal.find('#importCSVSummary')
					.removeClass('alert-success alert-warning')
					.addClass('alert-danger')
					.html('<strong>Erreur réseau:</strong> ' + error)
					.show();
			}
		});
	}

}, {

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
