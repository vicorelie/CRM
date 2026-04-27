<div class="modal fade" id="importCSVModal" tabindex="-1" role="dialog">
	<div class="modal-dialog modal-lg" role="document">
		<div class="modal-content">
			<div class="modal-header">
				<button type="button" class="close" data-dismiss="modal">&times;</button>
				<h4 class="modal-title"><i class="fa fa-upload"></i> Import CSV Leads</h4>
			</div>
			<div class="modal-body">
				<form id="importCSVForm" enctype="multipart/form-data">
					<div class="form-group">
						<label>Fichier CSV <span class="redColor">*</span></label>
						<input type="file" name="csv_file" id="csvFileInput" accept=".csv" class="form-control" required />
						<p class="help-block">Format attendu: leads_v2_*.csv (Lead Reference, Date, Category, ... Questions)</p>
					</div>
					<div class="row">
						<div class="col-md-6">
							<div class="checkbox">
								<label>
									<input type="checkbox" name="skip_refunded" id="skipRefunded" checked />
									Ignorer les leads REFUNDED
								</label>
							</div>
						</div>
						<div class="col-md-6">
							<div class="checkbox">
								<label>
									<input type="checkbox" name="skip_duplicates" id="skipDuplicates" checked />
									Ignorer les doublons (email)
								</label>
							</div>
						</div>
					</div>
				</form>

				<div id="importCSVProgress" style="display:none; margin-top:15px;">
					<div class="progress">
						<div class="progress-bar progress-bar-striped active" role="progressbar" style="width:100%">
							Import en cours...
						</div>
					</div>
				</div>

				<div id="importCSVResults" style="display:none; margin-top:15px;">
					<div id="importCSVSummary" class="alert" style="display:none;"></div>
					<div id="importCSVDetails" style="max-height:300px; overflow-y:auto;">
						<table class="table table-condensed table-bordered" id="importCSVTable" style="display:none;">
							<thead>
								<tr>
									<th>Ligne</th>
									<th>Nom</th>
									<th>Statut</th>
									<th>Détail</th>
								</tr>
							</thead>
							<tbody></tbody>
						</table>
					</div>
				</div>
			</div>
			<div class="modal-footer">
				<button type="button" class="btn btn-default" data-dismiss="modal">Fermer</button>
				<button type="button" class="btn btn-primary" id="importCSVSubmitBtn">
					<i class="fa fa-upload"></i> Importer
				</button>
			</div>
		</div>
	</div>
</div>
