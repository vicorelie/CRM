{*<!--
/*********************************************************************************
** The contents of this file are subject to the vtiger CRM Public License Version 1.0
* ("License"); You may not use this file except in compliance with the License
* The Original Code is: vtiger CRM Open Source
* The Initial Developer of the Original Code is vtiger.
* Portions created by vtiger are Copyright (C) vtiger.
* All Rights Reserved.
*
********************************************************************************/
-->*}

<div class='dashboardHeading container-fluid'>
	<div class="buttonGroups pull-right">
		{assign var=CURRENT_USER value=Users_Record_Model::getCurrentUserModel()}
		{if $CURRENT_USER->get('is_admin') eq 'on'}
		<div class="btn-group" style="margin-right:10px;" id="smtpSwitcher">
			<button class='btn btn-default dropdown-toggle' data-toggle='dropdown' title="Basculer SMTP">
				<i class="fa fa-envelope"></i> SMTP: <span id="currentSMTP">Brevo</span> <i class="caret"></i>
			</button>
			<ul class="dropdown-menu">
				<li><a href="javascript:void(0)" onclick="switchSMTPProfile('Brevo')"><i class="fa fa-check" style="color:#27ae60;visibility:hidden;" id="smtp-check-brevo"></i> Brevo</a></li>
				<li><a href="javascript:void(0)" onclick="switchSMTPProfile('Gmail')"><i class="fa fa-check" style="color:#27ae60;visibility:hidden;" id="smtp-check-gmail"></i> Gmail</a></li>
			</ul>
		</div>
		{/if}
		<button class='btn btn-success' id="openDashboardCalendar" style="margin-right:10px;">
			<i class="fa fa-calendar"></i> {vtranslate('LBL_CALENDAR', $MODULE_NAME)}
		</button>
		<button class='btn btn-warning' id="openDashboardStationnement" style="margin-right:10px;">
			<i class="fa fa-car"></i> Stationnement
		</button>
		{if $CURRENT_USER->get('is_admin') eq 'on' || $CURRENT_USER->get('roleid') eq 'H6'}
		<button class='btn btn-info' id="openBlockedDatesModal" style="margin-right:10px;">
			<i class="fa fa-ban"></i> Gestion des dates
		</button>
		{/if}
		<div class="btn-group">
			{if $SELECTABLE_WIDGETS|count gt 0}
				<button class='btn btn-default addButton dropdown-toggle' data-toggle='dropdown'>
					{vtranslate('LBL_ADD_WIDGET')}&nbsp;&nbsp;<i class="caret"></i>
				</button>

				<ul class="dropdown-menu dropdown-menu-right widgetsList pull-right" style="min-width:100%;text-align:left;">
					{assign var="MINILISTWIDGET" value=""}
					{foreach from=$SELECTABLE_WIDGETS item=WIDGET}
						{if $WIDGET->getName() eq 'MiniList'}
							{assign var="MINILISTWIDGET" value=$WIDGET} {* Defer to display as a separate group *}
						{elseif $WIDGET->getName() eq 'Notebook'}
							{assign var="NOTEBOOKWIDGET" value=$WIDGET} {* Defer to display as a separate group *}
						{else}
							<li>
								<a onclick="Vtiger_DashBoard_Js.addWidget(this, '{$WIDGET->getUrl()}')" href="javascript:void(0);"
									data-linkid="{$WIDGET->get('linkid')}" data-name="{$WIDGET->getName()}" data-width="{$WIDGET->getWidth()}" data-height="{$WIDGET->getHeight()}">
									{vtranslate($WIDGET->getTitle(), $MODULE_NAME)}</a>
							</li>
						{/if}
					{/foreach}

					{if $MINILISTWIDGET && $MODULE_NAME == 'Home'}
						<li class="divider"></li>
						<li>
							<a onclick="Vtiger_DashBoard_Js.addMiniListWidget(this, '{$MINILISTWIDGET->getUrl()}')" href="javascript:void(0);"
								data-linkid="{$MINILISTWIDGET->get('linkid')}" data-name="{$MINILISTWIDGET->getName()}" data-width="{$MINILISTWIDGET->getWidth()}" data-height="{$MINILISTWIDGET->getHeight()}">
								{vtranslate($MINILISTWIDGET->getTitle(), $MODULE_NAME)}</a>
						</li>
						<li>
							<a onclick="Vtiger_DashBoard_Js.addNoteBookWidget(this, '{$NOTEBOOKWIDGET->getUrl()}')" href="javascript:void(0);"
								data-linkid="{$NOTEBOOKWIDGET->get('linkid')}" data-name="{$NOTEBOOKWIDGET->getName()}" data-width="{$NOTEBOOKWIDGET->getWidth()}" data-height="{$NOTEBOOKWIDGET->getHeight()}">
								{vtranslate($NOTEBOOKWIDGET->getTitle(), $MODULE_NAME)}</a>
						</li>
					{/if}

				</ul>
			{else if $MODULE_PERMISSION}
				<button class='btn btn-default addButton dropdown-toggle' disabled="disabled" data-toggle='dropdown'>
					<strong>{vtranslate('LBL_ADD_WIDGET')}</strong> &nbsp;&nbsp;
					<i class="caret"></i>
				</button>
			{/if}
		</div>
	</div>
</div>

<script>
{if $CURRENT_USER->get('is_admin') eq 'on'}
// SMTP Switcher
function switchSMTPProfile(profile) {
	if (!confirm('Basculer vers ' + profile + ' ?')) return;

	jQuery.ajax({
		url: 'index.php',
		type: 'POST',
		data: {
			module: 'Vtiger',
			action: 'SwitchSMTP',
			profile: profile
		},
		dataType: 'json',
		success: function(response) {
			if (response.success) {
				jQuery('#currentSMTP').text(profile);
				// Update checkmarks
				jQuery('#smtp-check-brevo').css('visibility', profile === 'Brevo' ? 'visible' : 'hidden');
				jQuery('#smtp-check-gmail').css('visibility', profile === 'Gmail' ? 'visible' : 'hidden');
				alert('SMTP changé vers ' + profile);
			} else {
				alert('Erreur: ' + (response.error || 'Unknown error'));
			}
		},
		error: function() {
			alert('Erreur lors du changement de SMTP');
		}
	});
}

// Init: check active profile
jQuery(document).ready(function() {
	jQuery.ajax({
		url: 'index.php',
		type: 'GET',
		data: {
			module: 'Vtiger',
			action: 'GetActiveSMTP'
		},
		dataType: 'json',
		success: function(response) {
			if (response.success && response.profile) {
				jQuery('#currentSMTP').text(response.profile);
				jQuery('#smtp-check-' + response.profile.toLowerCase()).css('visibility', 'visible');
			}
		}
	});
});
{/if}
</script>

{if $CURRENT_USER->get('is_admin') eq 'on' || $CURRENT_USER->get('roleid') eq 'H6'}
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/flatpickr@4.6.13/dist/flatpickr.min.css">
<script src="https://cdn.jsdelivr.net/npm/flatpickr@4.6.13/dist/flatpickr.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/flatpickr@4.6.13/dist/l10n/fr.js"></script>
<style>
.flatpickr-day.flatpickr-disabled.cnk-blocked-day,
.flatpickr-day.cnk-blocked-day {
	background: #f8d7da !important;
	color: #c82333 !important;
	border-color: #f5c6cb !important;
	text-decoration: line-through !important;
	font-weight: bold !important;
	cursor: not-allowed !important;
	opacity: 1 !important;
}
.flatpickr-day.cnk-blocked-day:hover {
	background: #f5c6cb !important;
	color: #721c24 !important;
}
</style>
<!-- Modale Gestion des dates bloquées -->
<div class="modal fade" id="blockedDatesModal" tabindex="-1" role="dialog" aria-labelledby="blockedDatesModalLabel" aria-hidden="true">
	<div class="modal-dialog modal-lg" role="document" style="max-width:850px;">
		<div class="modal-content">
			<div class="modal-header">
				<button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
				<h4 class="modal-title" id="blockedDatesModalLabel"><i class="fa fa-ban"></i> Gestion des dates bloquées</h4>
			</div>
			<div class="modal-body">
				<div class="row">
					<div class="col-sm-6">
						<h5>Bloquer une date</h5>
						<div class="form-group">
							<label>Date</label>
							<input type="text" id="bd_picker" class="form-control" placeholder="Cliquer pour sélectionner...">
						</div>
						<div class="form-group">
							<label>Commentaire (optionnel)</label>
							<input type="text" id="bd_comment" class="form-control" maxlength="255" placeholder="Ex: férié, complet...">
						</div>
						<button type="button" class="btn btn-success" id="bd_btn_add"><i class="fa fa-plus"></i> Bloquer cette date</button>
					</div>
					<div class="col-sm-6">
						<h5>Dates déjà bloquées (<span id="bd_count">0</span>)</h5>
						<div id="bd_list" style="max-height:400px;overflow-y:auto;border:1px solid #ddd;padding:8px;border-radius:4px;">
							<p class="text-muted" style="text-align:center;">Chargement...</p>
						</div>
					</div>
				</div>
			</div>
			<div class="modal-footer">
				<button type="button" class="btn btn-default" data-dismiss="modal">Fermer</button>
			</div>
		</div>
	</div>
</div>

<script>
(function() {
	var BD = {
		blockedSet: new Set(),
		picker: null,

		init: function() {
			var self = this;
			jQuery('#openBlockedDatesModal').on('click', function() {
				jQuery('#blockedDatesModal').modal('show');
				self.loadList();
			});
			jQuery('#bd_btn_add').on('click', function() { self.add(); });
			jQuery('#bd_list').on('click', '.bd-delete', function() {
				var date = jQuery(this).data('date');
				if (confirm('Débloquer la date ' + date + ' ?')) self.del(date);
			});
		},

		ensurePicker: function() {
			if (this.picker || typeof flatpickr === 'undefined') return;
			var self = this;
			this.picker = flatpickr('#bd_picker', {
				dateFormat: 'Y-m-d',
				showMonths: 1,
				locale: (typeof flatpickr.l10ns !== 'undefined' && flatpickr.l10ns.fr) ? flatpickr.l10ns.fr : 'default',
				onDayCreate: function(dObj, dStr, fp, dayElem) {
					var d = dayElem.dateObj;
					if (!d) return;
					var iso = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
					if (self.blockedSet.has(iso)) {
						dayElem.classList.add('cnk-blocked-day');
						dayElem.title = 'Déjà bloquée';
					}
				}
			});
		},

		loadList: function() {
			var self = this;
			jQuery.ajax({
				url: 'index.php?module=Vtiger&action=BlockedDates&mode=list',
				type: 'GET',
				dataType: 'json',
				success: function(resp) {
					var data = (resp && resp.result && resp.result.data) || [];
					self.blockedSet = new Set(data.map(function(d){ return d.date; }));
					self.renderList(data);
					self.ensurePicker();
					if (self.picker) self.picker.redraw();
				},
				error: function() {
					jQuery('#bd_list').html('<p class="text-danger">Erreur de chargement</p>');
				}
			});
		},

		renderList: function(data) {
			jQuery('#bd_count').text(data.length);
			if (!data.length) {
				jQuery('#bd_list').html('<p class="text-muted" style="text-align:center;">Aucune date bloquée</p>');
				return;
			}
			var html = '<table class="table table-condensed" style="margin:0;"><thead><tr><th>Date</th><th>Commentaire</th><th></th></tr></thead><tbody>';
			data.forEach(function(d) {
				var prettyDate = d.date.split('-').reverse().join('/');
				html += '<tr>'
					+ '<td><strong>' + prettyDate + '</strong></td>'
					+ '<td>' + (d.comment ? jQuery('<div>').text(d.comment).html() : '<span class="text-muted">-</span>') + '</td>'
					+ '<td style="text-align:right;"><button class="btn btn-xs btn-danger bd-delete" data-date="' + d.date + '" title="Débloquer"><i class="fa fa-trash"></i></button></td>'
					+ '</tr>';
			});
			html += '</tbody></table>';
			jQuery('#bd_list').html(html);
		},

		add: function() {
			var date = jQuery('#bd_picker').val();
			var comment = jQuery('#bd_comment').val();
			if (!date) { alert('Sélectionnez une date'); return; }
			var self = this;
			jQuery.ajax({
				url: 'index.php?module=Vtiger&action=BlockedDates&mode=add',
				type: 'POST',
				data: { date: date, comment: comment },
				dataType: 'json',
				success: function(resp) {
					if (resp && resp.success) {
						jQuery('#bd_picker').val('');
						jQuery('#bd_comment').val('');
						self.loadList();
					} else {
						alert('Erreur: ' + ((resp && resp.error && resp.error.message) || 'Inconnue'));
					}
				},
				error: function() { alert('Erreur réseau lors de l\'ajout'); }
			});
		},

		del: function(date) {
			var self = this;
			jQuery.ajax({
				url: 'index.php?module=Vtiger&action=BlockedDates&mode=delete',
				type: 'POST',
				data: { date: date },
				dataType: 'json',
				success: function(resp) {
					if (resp && resp.success) self.loadList();
					else alert('Erreur lors de la suppression');
				},
				error: function() { alert('Erreur réseau lors de la suppression'); }
			});
		}
	};

	jQuery(document).ready(function() { BD.init(); });
})();
</script>
{/if}
