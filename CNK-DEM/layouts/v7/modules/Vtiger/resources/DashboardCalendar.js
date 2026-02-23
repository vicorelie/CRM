/*+***********************************************************************************
 * Dashboard Calendar for Devis & ODM déménagement dates (FullCalendar v3)
 *************************************************************************************/

var DashboardCalendar = {
	calendarModal: null,
	calendarInitialized: false,
	allEvents: [],
	activeFilters: ['devis_chargement', 'devis_livraison', 'odm_chargement', 'odm_livraison'],

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
				'<div class="modal-dialog modal-lg" style="width:90%; max-width:1200px;">' +
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
				'<input type="checkbox" class="calendar-filter" data-type="devis_chargement" checked style="margin-right:5px;">' +
				'<span style="display:inline-block; width:12px; height:12px; background:#9b59b6; margin-right:3px; vertical-align:middle;"></span>' +
				'Devis Chargement' +
				'</label>' +
				'<label style="margin-right:15px; font-weight:normal; cursor:pointer;">' +
				'<input type="checkbox" class="calendar-filter" data-type="devis_livraison" checked style="margin-right:5px;">' +
				'<span style="display:inline-block; width:12px; height:12px; background:#3498db; margin-right:3px; vertical-align:middle;"></span>' +
				'Devis Livraison' +
				'</label>' +
				'<label style="margin-right:15px; font-weight:normal; cursor:pointer;">' +
				'<input type="checkbox" class="calendar-filter" data-type="odm_chargement" checked style="margin-right:5px;">' +
				'<span style="display:inline-block; width:12px; height:12px; background:#16a085; margin-right:3px; vertical-align:middle;"></span>' +
				'ODM Chargement' +
				'</label>' +
				'<label style="margin-right:15px; font-weight:normal; cursor:pointer;">' +
				'<input type="checkbox" class="calendar-filter" data-type="odm_livraison" checked style="margin-right:5px;">' +
				'<span style="display:inline-block; width:12px; height:12px; background:#e67e22; margin-right:3px; vertical-align:middle;"></span>' +
				'ODM Livraison' +
				'</label>' +
				'</div>' +
				'<div id="dashboardCalendar"></div>' +
				'</div>' +
				'</div>' +
				'</div>' +
				'</div>';
			jQuery('body').append(modalHtml);
			DashboardCalendar.calendarModal = jQuery('#dashboardCalendarModal');
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

	initFullCalendar: function() {
		jQuery('#dashboardCalendar').fullCalendar({
			header: {
				left: 'prev,next today',
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
				var tip = event.title;
				if (event.ville) {
					tip += '\nVille: ' + event.ville;
				}
				if (event.adresse) {
					tip += '\nAdresse: ' + event.adresse;
				}
				element.attr('title', tip);
			}
		});
	},

	registerFilterEvents: function() {
		jQuery('.calendar-filter').on('change', function() {
			var filterType = jQuery(this).data('type');
			var isChecked = jQuery(this).is(':checked');

			if (isChecked) {
				// Ajouter le filtre s'il n'existe pas
				if (DashboardCalendar.activeFilters.indexOf(filterType) === -1) {
					DashboardCalendar.activeFilters.push(filterType);
				}
			} else {
				// Retirer le filtre
				var index = DashboardCalendar.activeFilters.indexOf(filterType);
				if (index > -1) {
					DashboardCalendar.activeFilters.splice(index, 1);
				}
			}

			// Rafraîchir le calendrier avec les nouveaux filtres
			DashboardCalendar.refreshCalendar();
		});
	},

	filterEvents: function(events) {
		return events.filter(function(event) {
			return DashboardCalendar.activeFilters.indexOf(event.type) !== -1;
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
