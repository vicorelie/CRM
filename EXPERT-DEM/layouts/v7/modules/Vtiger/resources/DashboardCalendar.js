/*+***********************************************************************************
 * Dashboard Calendar for Devis & ODM déménagement dates (FullCalendar v3)
 *************************************************************************************/

var DashboardCalendar = {
	calendarModal: null,
	calendarInitialized: false,
	allEvents: [],
	activeFilters: ['odm'],
	odmPasVendu: false,

	init: function() {
		jQuery('#openDashboardCalendar').on('click', function(e) {
			e.preventDefault();
			DashboardCalendar.openCalendar();
		});
	},

	openCalendar: function() {
		// Create modal if not exists
		if (!DashboardCalendar.calendarModal) {
			var modalHtml = '<div class="modal fade" id="dashboardCalendarModal" tabindex="-1" role="dialog">' +
				'<div class="modal-dialog modal-lg" style="width:95%; max-width:1400px;">' +
				'<div class="modal-content">' +
				'<div class="modal-header">' +
				'<button type="button" class="close" data-dismiss="modal">&times;</button>' +
				'<h4 class="modal-title">' +
				'<i class="fa fa-calendar"></i> Calendrier des Déménagements' +
				'</h4>' +
				'</div>' +
				'<div class="modal-body" style="min-height:600px; padding:20px;">' +
				'<div style="margin-bottom:15px; padding:10px; background:#f8f9fa; border-radius:4px;">' +
				'<strong style="margin-right:15px;">Filtres:</strong>' +
				'<label style="margin-right:15px; font-weight:normal; cursor:pointer;">' +
				'<input type="checkbox" class="calendar-filter" data-type="devis_chargement" style="margin-right:5px;">' +
				'<span style="display:inline-block; width:12px; height:12px; background:#9b59b6; margin-right:3px; vertical-align:middle;"></span>' +
				'Devis Chargement' +
				'</label>' +
				'<label style="margin-right:15px; font-weight:normal; cursor:pointer;">' +
				'<input type="checkbox" class="calendar-filter" data-type="devis_livraison" style="margin-right:5px;">' +
				'<span style="display:inline-block; width:12px; height:12px; background:#3498db; margin-right:3px; vertical-align:middle;"></span>' +
				'Devis Livraison' +
				'</label>' +
				'<label style="margin-right:15px; font-weight:normal; cursor:pointer;">' +
				'<input type="checkbox" class="calendar-filter" data-type="odm" checked style="margin-right:5px;">' +
				'<span style="display:inline-block; width:12px; height:12px; background:#16a085; margin-right:3px; vertical-align:middle;"></span>' +
				'ODM' +
				'</label>' +
				'<span style="margin-left:10px; border-left:1px solid #ccc; padding-left:15px;">' +
				'<label style="font-weight:normal; cursor:pointer;">' +
				'<input type="checkbox" id="odmPasVenduFilter" style="margin-right:5px;">' +
				'<span style="display:inline-block; width:12px; height:12px; background:#e74c3c; margin-right:3px; vertical-align:middle;"></span>' +
				'ODM pas vendu' +
				'</label>' +
				'</span>' +
				'</div>' +
				'<div id="dashboardCalendar"></div>' +
				'</div>' +
				'</div>' +
				'</div>' +
				'</div>';
			jQuery('body').append(modalHtml);
			DashboardCalendar.calendarModal = jQuery('#dashboardCalendarModal');

			// Style pour les événements ODM multi-lignes
			var style = document.createElement('style');
			style.textContent = '.fc-event.odm-event { overflow:hidden; padding:2px 4px; line-height:1.3; cursor:pointer; font-size:11px; }' +
				'.fc-event.odm-event .odm-line1 { font-weight:bold; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }' +
				'.fc-event.odm-event .odm-line2, .fc-event.odm-event .odm-line3, .fc-event.odm-event .odm-line4 { font-size:10px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; opacity:0.9; }' +
				'.fc-event.odm-event .odm-line4 { font-style:italic; }' +
				'.fc-event.odm-event .odm-no-presta { color:#fff; font-weight:bold; }';
			document.head.appendChild(style);
		}

		// Show modal
		DashboardCalendar.calendarModal.modal('show');

		// Initialize calendar after modal is shown
		if (!DashboardCalendar.calendarInitialized) {
			DashboardCalendar.calendarModal.on('shown.bs.modal', function() {
				DashboardCalendar.initFullCalendar();
				DashboardCalendar.registerFilterEvents();
				DashboardCalendar.calendarInitialized = true;
			});
		} else {
			jQuery('#dashboardCalendar').fullCalendar('refetchEvents');
		}
	},

	formatDateFr: function(dateStr) {
		if (!dateStr) return '';
		var parts = dateStr.split('-');
		if (parts.length !== 3) return dateStr;
		return parts[2] + '/' + parts[1] + '/' + parts[0].substring(2);
	},

	initFullCalendar: function() {
		jQuery('#dashboardCalendar').fullCalendar({
			header: {
				left: 'prev,next today gotoDate',
				center: 'title',
				right: 'month,agendaWeek,agendaDay'
			},
			defaultView: 'month',
			buttonText: {
				today: "Aujourd'hui",
				month: 'Mois',
				week: 'Semaine',
				day: 'Jour'
			},
			monthNames: ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'],
			monthNamesShort: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'],
			dayNames: ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'],
			dayNamesShort: ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'],
			firstDay: 1,
			views: {
				month: { columnFormat: 'ddd' },
				agendaWeek: { columnFormat: 'ddd DD/MM' },
				agendaDay: { columnFormat: 'dddd DD/MM' }
			},
			customButtons: {
				gotoDate: {
					text: '📅',
					click: function() {
						jQuery('#dashCalGotoDate').datepicker('show');
					}
				}
			},
			events: function(start, end, timezone, callback) {
				jQuery.ajax({
					url: 'index.php',
					type: 'GET',
					data: {
						module: 'Potentials',
						action: 'GetCalendarData'
					},
					dataType: 'json',
					success: function(events) {
						DashboardCalendar.allEvents = events;
						var filteredEvents = DashboardCalendar.filterEvents(events);
						callback(filteredEvents);
					},
					error: function() {
						callback([]);
					}
				});
			},
			eventClick: function(event, jsEvent, view) {
				// Ouvrir directement la vue Unified de l'affaire (gestion client)
				if (event.potential_id) {
					window.location.href = 'index.php?module=Potentials&view=Unified&record=' + event.potential_id + '&app=MARKETING';
				}
			},
			eventRender: function(event, element) {
				if (event.type === 'odm') {
					// Affichage multi-lignes pour les ODM
					element.addClass('odm-event');
					var vol = event.volume_final ? ' ' + event.volume_final + 'm3' : '';
					var soNo = event.so_no ? ' ' + event.so_no : '';
					var clientName = event.client || event.potential_name || 'ODM';

					var html = '<div class="odm-line1">LV ' + clientName + vol + soNo + '</div>';

					if (event.date_chargement) {
						var fromLine = 'de ' + (event.cp_chargement || '') + ' ' + (event.ville_chargement || '').toUpperCase() + ' le ' + DashboardCalendar.formatDateFr(event.date_chargement);
						html += '<div class="odm-line2">' + fromLine + '</div>';
					}
					if (event.date_livraison) {
						var toLine = 'à ' + (event.cp_livraison || '') + ' ' + (event.ville_livraison || '').toUpperCase() + ' - le ' + DashboardCalendar.formatDateFr(event.date_livraison);
						html += '<div class="odm-line3">' + toLine + '</div>';
					}
					if (event.prestataire_name) {
						html += '<div class="odm-line4">Sous-traitée par ' + event.prestataire_name + '</div>';
					} else {
						html += '<div class="odm-line4 odm-no-presta">⚠ Pas de prestataire</div>';
					}

					element.find('.fc-title').html(html);
					element.find('.fc-content').html(html);

					// Tooltip complet
					var tip = 'LV ' + clientName + vol + soNo;
					if (event.date_chargement) tip += '\nChargement: ' + (event.cp_chargement || '') + ' ' + (event.ville_chargement || '') + ' le ' + DashboardCalendar.formatDateFr(event.date_chargement);
					if (event.date_livraison) tip += '\nLivraison: ' + (event.cp_livraison || '') + ' ' + (event.ville_livraison || '') + ' le ' + DashboardCalendar.formatDateFr(event.date_livraison);
					if (event.prestataire_name) tip += '\nPrestataire: ' + event.prestataire_name;
					else tip += '\n⚠ Pas de prestataire';
					element.attr('title', tip);
				} else {
					// Devis : tooltip simple
					var tip = event.title;
					if (event.ville) tip += '\nVille: ' + event.ville;
					if (event.adresse) tip += '\nAdresse: ' + event.adresse;
					element.attr('title', tip);
				}
			}
		});

		// Ajouter un input datepicker caché sur le bouton gotoDate
		var gotoBtn = jQuery('.fc-gotoDate-button');
		gotoBtn.css('font-size', '14px');
		var hiddenInput = jQuery('<input type="text" id="dashCalGotoDate" style="position:absolute; opacity:0; width:0; height:0; pointer-events:none;">');
		gotoBtn.css('position', 'relative').append(hiddenInput);
		hiddenInput.datepicker({
			autoclose: true,
			format: 'dd/mm/yyyy',
			language: 'fr',
			todayHighlight: true
		}).on('changeDate', function(e) {
			jQuery('#dashboardCalendar').fullCalendar('gotoDate', moment(e.date));
		});
	},

	registerFilterEvents: function() {
		jQuery('.calendar-filter').on('change', function() {
			var filterType = jQuery(this).data('type');
			var isChecked = jQuery(this).is(':checked');

			if (isChecked) {
				if (DashboardCalendar.activeFilters.indexOf(filterType) === -1) {
					DashboardCalendar.activeFilters.push(filterType);
				}
			} else {
				var index = DashboardCalendar.activeFilters.indexOf(filterType);
				if (index > -1) {
					DashboardCalendar.activeFilters.splice(index, 1);
				}
			}

			DashboardCalendar.refreshCalendar();
		});

		jQuery('#odmPasVenduFilter').on('change', function() {
			DashboardCalendar.odmPasVendu = jQuery(this).is(':checked');
			DashboardCalendar.refreshCalendar();
		});
	},

	filterEvents: function(events) {
		return events.filter(function(event) {
			if (DashboardCalendar.activeFilters.indexOf(event.type) === -1) {
				return false;
			}
			if (DashboardCalendar.odmPasVendu) {
				if (event.type === 'odm') {
					return !event.has_prestataire;
				}
				return false;
			}
			return true;
		});
	},

	refreshCalendar: function() {
		var filteredEvents = DashboardCalendar.filterEvents(DashboardCalendar.allEvents);
		jQuery('#dashboardCalendar').fullCalendar('removeEvents');
		jQuery('#dashboardCalendar').fullCalendar('addEventSource', filteredEvents);
		jQuery('#dashboardCalendar').fullCalendar('rerenderEvents');
	}
};

jQuery(document).ready(function() {
	DashboardCalendar.init();
});
