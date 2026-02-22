/*+***********************************************************************************
 * Dashboard Calendar for Devis & ODM déménagement dates (FullCalendar v3)
 *************************************************************************************/

var DashboardCalendar = {
	calendarModal: null,
	calendarInitialized: false,

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
						callback(events);
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
	}
};

jQuery(document).ready(function() {
	DashboardCalendar.init();
});
