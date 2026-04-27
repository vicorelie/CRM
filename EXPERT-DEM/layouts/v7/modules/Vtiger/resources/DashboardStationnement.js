/*+***********************************************************************************
 * Dashboard Stationnement - Gestion des demandes de stationnement
 *************************************************************************************/

var DashboardStationnement = {
	modal: null,
	calendarInitialized: false,
	allEvents: [],
	allAffaires: [],
	activeFilters: {
		statuts: ['En attente', 'Validé', 'Non défini'],
		types: ['chargement', 'livraison']
	},

	init: function() {
		jQuery('#openDashboardStationnement').on('click', function(e) {
			e.preventDefault();
			DashboardStationnement.open();
		});
	},

	open: function() {
		// Créer le modal s'il n'existe pas
		if (!DashboardStationnement.modal) {
			var modalHtml =
				'<div class="modal fade" id="stationnementModal" tabindex="-1" role="dialog">' +
				'<div class="modal-dialog modal-lg" style="width:90%; max-width:1400px;">' +
				'<div class="modal-content">' +
				'<div class="modal-header">' +
				'<button type="button" class="close" data-dismiss="modal">&times;</button>' +
				'<h4 class="modal-title">' +
				'<i class="fa fa-car"></i> Demandes de Stationnement' +
				'</h4>' +
				'</div>' +
				'<div class="modal-body" style="padding:20px;">' +

				// Filtres
				'<div style="margin-bottom:15px; padding:10px; background:#f8f9fa; border-radius:4px;">' +
				'<div style="margin-bottom:10px;"><strong>Filtrer par statut:</strong></div>' +
				'<label style="margin-right:15px; font-weight:normal; cursor:pointer;">' +
				'<input type="checkbox" class="statut-filter" data-statut="En attente" checked style="margin-right:5px;">' +
				'<span style="display:inline-block; width:12px; height:12px; background:#f39c12; margin-right:3px; vertical-align:middle;"></span>' +
				'En attente' +
				'</label>' +
				'<label style="margin-right:15px; font-weight:normal; cursor:pointer;">' +
				'<input type="checkbox" class="statut-filter" data-statut="Validé" checked style="margin-right:5px;">' +
				'<span style="display:inline-block; width:12px; height:12px; background:#27ae60; margin-right:3px; vertical-align:middle;"></span>' +
				'Validé' +
				'</label>' +
				'<label style="margin-right:15px; font-weight:normal; cursor:pointer;">' +
				'<input type="checkbox" class="statut-filter" data-statut="Refusé" style="margin-right:5px;">' +
				'<span style="display:inline-block; width:12px; height:12px; background:#e74c3c; margin-right:3px; vertical-align:middle;"></span>' +
				'Refusé' +
				'</label>' +
				'<label style="margin-right:15px; font-weight:normal; cursor:pointer;">' +
				'<input type="checkbox" class="statut-filter" data-statut="Non défini" checked style="margin-right:5px;">' +
				'<span style="display:inline-block; width:12px; height:12px; background:#95a5a6; margin-right:3px; vertical-align:middle;"></span>' +
				'Non défini' +
				'</label>' +
				'</div>' +

				// Tabs pour Liste et Calendrier
				'<ul class="nav nav-tabs" style="margin-bottom:15px;">' +
				'<li class="active"><a href="#stationnement-list" data-toggle="tab">Liste</a></li>' +
				'<li><a href="#stationnement-calendar" data-toggle="tab" id="stationnement-calendar-tab">Calendrier</a></li>' +
				'</ul>' +

				'<div class="tab-content">' +
				// Tab Liste
				'<div class="tab-pane active" id="stationnement-list">' +
				'<div id="stationnementListContainer" style="max-height:500px; overflow-y:auto;"></div>' +
				'</div>' +
				// Tab Calendrier
				'<div class="tab-pane" id="stationnement-calendar">' +
				'<div id="stationnementCalendar" style="min-height:500px;"></div>' +
				'</div>' +
				'</div>' +

				'</div>' +
				'</div>' +
				'</div>' +
				'</div>';
			jQuery('body').append(modalHtml);
			DashboardStationnement.modal = jQuery('#stationnementModal');

			// Init calendar quand on clique sur l'onglet Calendrier
			jQuery('#stationnement-calendar-tab').on('shown.bs.tab', function() {
				if (!DashboardStationnement.calendarInitialized) {
					DashboardStationnement.initCalendar();
					DashboardStationnement.calendarInitialized = true;
				} else {
					jQuery('#stationnementCalendar').fullCalendar('refetchEvents');
				}
			});

			// Register filter events
			DashboardStationnement.registerFilterEvents();
		}

		// Charger les données
		DashboardStationnement.loadData();

		// Afficher le modal
		DashboardStationnement.modal.modal('show');
	},

	loadData: function() {
		jQuery.ajax({
			url: 'index.php',
			type: 'GET',
			data: {
				module: 'Potentials',
				action: 'GetStationnementData'
			},
			dataType: 'json',
			success: function(response) {
				DashboardStationnement.allEvents = response.events || [];
				DashboardStationnement.allAffaires = response.affaires || [];
				DashboardStationnement.renderList(DashboardStationnement.filterAffaires(response.affaires || []));
			},
			error: function() {
				jQuery('#stationnementListContainer').html(
					'<div class="alert alert-danger">Erreur lors du chargement des données</div>'
				);
			}
		});
	},

	renderList: function(affaires) {
		var container = jQuery('#stationnementListContainer');

		if (affaires.length === 0) {
			container.html('<div class="alert alert-info">Aucune demande de stationnement</div>');
			return;
		}

		// Construire le HTML
		var html = '<table class="table table-bordered table-striped">' +
			'<thead>' +
			'<tr>' +
			'<th style="width:35%;">Affaire</th>' +
			'<th style="width:65%;">Demandes</th>' +
			'</tr>' +
			'</thead>' +
			'<tbody>';

		affaires.forEach(function(affaire) {
			// Liste des demandes avec statut individuel
			var demandesHtml = '<table style="width:100%; border:none; margin:0;">';
			affaire.demandes.forEach(function(demande) {
				var dateLabel = demande.date ? demande.date : '<span style="color:#e74c3c;">Date non définie</span>';
				var villeLabel = demande.ville ? ' - ' + demande.ville : '';
				var statutBadge = '<span style="display:inline-block; padding:2px 8px; border-radius:3px; color:#fff; background:' + demande.color + '; font-size:11px; font-weight:bold;">' +
					demande.statut + '</span>';

				demandesHtml += '<tr style="border:none;">' +
					'<td style="border:none; padding:2px 5px; width:120px;"><strong>' + demande.label + '</strong></td>' +
					'<td style="border:none; padding:2px 5px;">' + dateLabel + villeLabel + '</td>' +
					'<td style="border:none; padding:2px 5px; width:100px; text-align:right;">' + statutBadge + '</td>' +
					'</tr>';
			});
			demandesHtml += '</table>';

			html += '<tr>' +
				'<td><a href="index.php?module=Potentials&view=Unified&record=' + affaire.potentialId + '&app=SALES" target="_blank">' +
				affaire.potentialName +
				'</a></td>' +
				'<td style="padding:5px;">' + demandesHtml + '</td>' +
				'</tr>';
		});

		html += '</tbody></table>';
		container.html(html);
	},

	initCalendar: function() {
		jQuery('#stationnementCalendar').fullCalendar({
			header: {
				left: 'prev,next today',
				center: 'title',
				right: 'month,agendaWeek,agendaDay'
			},
			defaultView: 'month',
			locale: 'fr',
			firstDay: 1,
			editable: false,
			eventLimit: true,
			events: function(start, end, timezone, callback) {
				callback(DashboardStationnement.filterEvents(DashboardStationnement.allEvents));
			},
			eventClick: function(event, jsEvent, view) {
				window.open('index.php?module=Potentials&view=Unified&record=' + event.potentialId + '&app=SALES', '_blank');
			},
			eventRender: function(event, element) {
				var tip = event.title + '\n' +
					'Statut: ' + event.statut;
				if (event.ville) {
					tip += '\nVille: ' + event.ville;
				}
				element.attr('title', tip);
			}
		});
	},

	registerFilterEvents: function() {
		jQuery('.statut-filter').on('change', function() {
			var statut = jQuery(this).data('statut');
			var isChecked = jQuery(this).is(':checked');

			if (isChecked) {
				if (DashboardStationnement.activeFilters.statuts.indexOf(statut) === -1) {
					DashboardStationnement.activeFilters.statuts.push(statut);
				}
			} else {
				var index = DashboardStationnement.activeFilters.statuts.indexOf(statut);
				if (index > -1) {
					DashboardStationnement.activeFilters.statuts.splice(index, 1);
				}
			}
			DashboardStationnement.applyFilters();
		});

		jQuery('.type-filter').on('change', function() {
			var type = jQuery(this).data('type');
			var isChecked = jQuery(this).is(':checked');

			if (isChecked) {
				if (DashboardStationnement.activeFilters.types.indexOf(type) === -1) {
					DashboardStationnement.activeFilters.types.push(type);
				}
			} else {
				var index = DashboardStationnement.activeFilters.types.indexOf(type);
				if (index > -1) {
					DashboardStationnement.activeFilters.types.splice(index, 1);
				}
			}
			DashboardStationnement.applyFilters();
		});
	},

	filterAffaires: function(affaires) {
		return affaires.filter(function(affaire) {
			// Au moins une demande doit correspondre aux filtres actifs (statut ET type)
			var hasMatch = false;
			affaire.demandes.forEach(function(demande) {
				if (DashboardStationnement.activeFilters.statuts.indexOf(demande.statut) !== -1 &&
					DashboardStationnement.activeFilters.types.indexOf(demande.type) !== -1) {
					hasMatch = true;
				}
			});
			return hasMatch;
		});
	},

	filterEvents: function(events) {
		return events.filter(function(event) {
			return DashboardStationnement.activeFilters.statuts.indexOf(event.statut) !== -1 &&
				DashboardStationnement.activeFilters.types.indexOf(event.type) !== -1;
		});
	},

	applyFilters: function() {
		var filtered = DashboardStationnement.filterAffaires(DashboardStationnement.allAffaires);
		DashboardStationnement.renderList(filtered);

		// Rafraîchir aussi le calendrier si initialisé
		if (DashboardStationnement.calendarInitialized) {
			jQuery('#stationnementCalendar').fullCalendar('refetchEvents');
		}
	}
};

jQuery(document).ready(function() {
	DashboardStationnement.init();
});
