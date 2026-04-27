<style>
	.statistiques-page select.form-control { padding: 4px 8px; height: 34px; font-size: 13px; }
</style>
<div class="statistiques-page" style="padding: 10px 5px;">

	<div class="row" style="margin-bottom: 15px;">
		<div class="col-md-3">
			<h3 style="margin-top: 0;"><i class="fa fa-bar-chart"></i> Statistiques</h3>
		</div>
		<div class="col-md-9">
			<div class="pull-right" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
				<select id="stats-year-filter" class="form-control" style="width:auto;"></select>
				<select id="stats-month-filter" class="form-control" style="width:auto;">
					<option value="0">Tous les mois</option>
					<option value="1">Janvier</option>
					<option value="2">F&eacute;vrier</option>
					<option value="3">Mars</option>
					<option value="4">Avril</option>
					<option value="5">Mai</option>
					<option value="6">Juin</option>
					<option value="7">Juillet</option>
					<option value="8">Ao&ucirc;t</option>
					<option value="9">Septembre</option>
					<option value="10">Octobre</option>
					<option value="11">Novembre</option>
					<option value="12">D&eacute;cembre</option>
				</select>
				{if $IS_ADMIN}
				<select id="stats-user-filter" class="form-control" style="width:auto;">
					<option value="all">Tous les utilisateurs</option>
					{foreach item=USER_ITEM from=$ACTIVE_USERS}
					<option value="{$USER_ITEM.id}">{$USER_ITEM.name}</option>
					{/foreach}
				</select>
				{/if}
			</div>
		</div>
	</div>

	<div class="row" id="stats-kpi-cards" style="margin-bottom: 20px;">
		<div class="col-lg-2 col-md-4">
			<div class="panel panel-primary">
				<div class="panel-body text-center">
					<h2 id="kpi-total-ht" style="margin:5px 0;">-</h2>
					<p style="margin-bottom:5px;font-weight:bold;">Total HT</p>
					<small id="kpi-total-count" class="text-muted">-</small>
				</div>
			</div>
		</div>
		<div class="col-lg-2 col-md-4">
			<div class="panel panel-success">
				<div class="panel-body text-center">
					<h2 id="kpi-validated-count" style="margin:5px 0;">-</h2>
					<p style="margin-bottom:5px;font-weight:bold;">Devis valid&eacute;s</p>
					<small id="kpi-validated-ht" class="text-muted">-</small>
				</div>
			</div>
		</div>
		<div class="col-lg-2 col-md-4">
			<div class="panel panel-warning">
				<div class="panel-body text-center">
					<h2 id="kpi-pending-count" style="margin:5px 0;">-</h2>
					<p style="margin-bottom:5px;font-weight:bold;">Devis en attente</p>
					<small id="kpi-pending-ht" class="text-muted">-</small>
				</div>
			</div>
		</div>
		<div class="col-lg-3 col-md-6">
			<div class="panel panel-info">
				<div class="panel-body text-center">
					<h2 id="kpi-conversion-rate" style="margin:5px 0;">-</h2>
					<p style="margin-bottom:5px;font-weight:bold;">Taux de conversion</p>
					<small class="text-muted">valid&eacute;s / total</small>
				</div>
			</div>
		</div>
		<div class="col-lg-3 col-md-6">
			<div class="panel panel-default">
				<div class="panel-body text-center">
					<h2 id="kpi-avg-value" style="margin:5px 0;">-</h2>
					<p style="margin-bottom:5px;font-weight:bold;">Valeur moyenne HT</p>
					<small class="text-muted">par devis valid&eacute;</small>
				</div>
			</div>
		</div>
	</div>

	<div class="row" style="margin-bottom: 20px;">
		<div class="col-md-6">
			<div class="panel panel-default">
				<div class="panel-heading"><strong>Nombre de devis valid&eacute;s par mois</strong></div>
				<div class="panel-body">
					<div id="chart-monthly-count" style="height: 350px;"></div>
					<div id="chart-monthly-count-empty" class="text-center text-muted" style="display:none;padding:80px 0;">
						Aucune donn&eacute;e pour cette p&eacute;riode
					</div>
				</div>
			</div>
		</div>
		<div class="col-md-6">
			<div class="panel panel-default">
				<div class="panel-heading"><strong>&Eacute;volution du montant HT par mois</strong></div>
				<div class="panel-body">
					<div id="chart-monthly-amount" style="height: 350px;"></div>
					<div id="chart-monthly-amount-empty" class="text-center text-muted" style="display:none;padding:80px 0;">
						Aucune donn&eacute;e pour cette p&eacute;riode
					</div>
				</div>
			</div>
		</div>
	</div>

	<div class="row">
		{if $IS_ADMIN}
		<div class="col-md-4">
			<div class="panel panel-default">
				<div class="panel-heading"><strong>R&eacute;partition par utilisateur</strong></div>
				<div class="panel-body">
					<div id="chart-user-pie" style="height: 350px;"></div>
					<div id="chart-user-pie-empty" class="text-center text-muted" style="display:none;padding:80px 0;">
						Aucune donn&eacute;e
					</div>
				</div>
			</div>
		</div>
		<div class="col-md-8">
		{else}
		<div class="col-md-12">
		{/if}
			<div class="panel panel-default">
				<div class="panel-heading"><strong>D&eacute;tail mensuel</strong></div>
				<div class="panel-body" style="padding:0;">
					<table class="table table-striped table-bordered" id="stats-monthly-table" style="margin-bottom:0;">
						<thead>
							<tr>
								<th>Mois</th>
								<th class="text-right">Devis valid&eacute;s</th>
								<th class="text-right">Total HT</th>
							</tr>
						</thead>
						<tbody id="stats-monthly-tbody">
							<tr><td colspan="3" class="text-center text-muted">Chargement...</td></tr>
						</tbody>
						<tfoot id="stats-monthly-tfoot" style="display:none;">
							<tr style="font-weight:bold;background:#f5f5f5;">
								<td>Total</td>
								<td class="text-right" id="stats-total-count">-</td>
								<td class="text-right" id="stats-total-ht">-</td>
							</tr>
						</tfoot>
					</table>
				</div>
			</div>
		</div>
	</div>

</div>

<input type="hidden" id="stats-is-admin" value="{if $IS_ADMIN}1{else}0{/if}" />
<input type="hidden" id="stats-current-user-id" value="{$CURRENT_USER_ID}" />
