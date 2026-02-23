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
		<div class="btn-group" style="margin-right:10px;" id="smtpSwitcher">
			<button class='btn btn-default dropdown-toggle' data-toggle='dropdown' title="Basculer SMTP">
				<i class="fa fa-envelope"></i> SMTP: <span id="currentSMTP">Brevo</span> <i class="caret"></i>
			</button>
			<ul class="dropdown-menu">
				<li><a href="javascript:void(0)" onclick="switchSMTPProfile('Brevo')"><i class="fa fa-check" style="color:#27ae60;visibility:hidden;" id="smtp-check-brevo"></i> Brevo</a></li>
				<li><a href="javascript:void(0)" onclick="switchSMTPProfile('Gmail')"><i class="fa fa-check" style="color:#27ae60;visibility:hidden;" id="smtp-check-gmail"></i> Gmail</a></li>
			</ul>
		</div>
		<button class='btn btn-success' id="openDashboardCalendar" style="margin-right:10px;">
			<i class="fa fa-calendar"></i> {vtranslate('LBL_CALENDAR', $MODULE_NAME)}
		</button>
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
</script>
