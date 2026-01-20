{strip}
<div class="modal-dialog modal-lg">
	<div class="modal-content">
		{include file="ModalHeader.tpl"|vtemplate_path:'Vtiger' TITLE="Générer un devis"}

		<form id="generateQuoteForm" class="form-horizontal">
			<div class="modal-body">
				{* Hidden fields for quote creation *}
				<input type="hidden" name="module" value="Quotes">
				<input type="hidden" name="action" value="Save">
				<input type="hidden" name="potential_id" value="{$POTENTIAL_ID}">
				<input type="hidden" name="account_id" value="{$ACCOUNT_ID}">
				<input type="hidden" name="contact_id" value="{$CONTACT_ID}">
				<input type="hidden" name="sourceRecord" value="{$POTENTIAL_ID}">
				<input type="hidden" name="sourceModule" value="Potentials">
				<input type="hidden" name="relationOperation" value="true">
				<input type="hidden" name="assigned_user_id" value="{$USER_MODEL->getId()}">
				<input type="hidden" id="totalProductCount" name="totalProductCount" value="0">
				<input type="hidden" name="cf_1133" value="43">
				<input type="hidden" name="cf_1135" value="57">

				{* Nom de l'affaire (read-only) *}
				<div class="form-group">
					<label class="col-sm-3 control-label">Nom de l'affaire</label>
					<div class="col-sm-9">
						<input type="text" class="form-control"
							   value="{$POTENTIAL_NAME}" readonly>
					</div>
				</div>

				{* Subject field *}
				<div class="form-group">
					<label class="col-sm-3 control-label">
						<span class="redColor">*</span> Sujet
					</label>
					<div class="col-sm-9">
						<input type="text" name="subject" class="form-control"
							   value="Dev-{$POTENTIAL_NAME}" required>
					</div>
				</div>

				{* Contact (read-only) *}
				<div class="form-group">
					<label class="col-sm-3 control-label">Contact</label>
					<div class="col-sm-9">
						<input type="text" class="form-control"
							   value="{$CONTACT_NAME}" readonly>
					</div>
				</div>

				{* Validity Date *}
				<div class="form-group">
					<label class="col-sm-3 control-label">Date de validité</label>
					<div class="col-sm-9">
						<div class="input-group inputElement">
							<input type="text" name="validtill" class="form-control dateField"
								   value="{$VALIDITY_DATE}" data-date-format="yyyy-mm-dd">
							<span class="input-group-addon">
								<i class="fa fa-calendar"></i>
							</span>
						</div>
					</div>
				</div>

				<hr>

				{* Forfait Section *}
				<h4 style="margin-top:15px; margin-bottom:15px;">Forfait</h4>

				<div class="form-group">
					<label class="col-sm-3 control-label">Type de forfait</label>
					<div class="col-sm-9">
						<select name="cf_1125" class="form-control">
							<option value="">-- Sélectionnez --</option>
							<option value="ECO">ECO</option>
							<option value="MEDIUM">MEDIUM</option>
							<option value="PREMIUM">PREMIUM</option>
						</select>
					</div>
				</div>

				<div class="form-group">
					<label class="col-sm-3 control-label">Forfait Tarif</label>
					<div class="col-sm-3">
						<input type="number" name="cf_1127" class="form-control"
							   value="0" step="0.01" min="0">
					</div>
					<label class="col-sm-3 control-label">Forfait Supplément</label>
					<div class="col-sm-3">
						<input type="number" name="cf_1129" class="form-control"
							   value="0" step="0.01" min="0">
					</div>
				</div>

				<hr>

				{* Products Section *}
				<h4 style="margin-top:15px; margin-bottom:15px;">Produits / Services</h4>
				<div class="form-group">
					<div class="col-sm-12">
						<button type="button" class="btn btn-success" id="addProductBtn">
							<i class="fa fa-plus"></i> Ajouter un produit
						</button>
					</div>
				</div>

				<div id="productsContainer">
					<table class="table table-bordered" id="productsTable" style="display:none;">
						<thead>
							<tr>
								<th width="40%">Produit / Service</th>
								<th width="20%">Quantité</th>
								<th width="25%">Prix unitaire</th>
								<th width="15%">Actions</th>
							</tr>
						</thead>
						<tbody id="productsList">
						</tbody>
					</table>
				</div>

				<hr>

				{* Assurance Section *}
				<h4 style="margin-top:15px; margin-bottom:15px;">Assurance</h4>

				<div class="form-group">
					<label class="col-sm-3 control-label">Montant assurance</label>
					<div class="col-sm-9">
						<select name="cf_1145" class="form-control">
							<option value="">-- Sélectionnez --</option>
							<option value="4000">4 000 €</option>
							<option value="8000">8 000 €</option>
							<option value="12000">12 000 €</option>
							<option value="16000">16 000 €</option>
							<option value="20000">20 000 €</option>
						</select>
					</div>
				</div>
			</div>

			<div class="modal-footer">
				<button type="button" class="btn btn-default" data-dismiss="modal">
					Annuler
				</button>
				<button type="submit" class="btn btn-primary" id="generateQuoteBtn">
					<i class="fa fa-save"></i> Générer le devis
				</button>
			</div>
		</form>
	</div>
</div>

{literal}
<script type="text/javascript">
jQuery(document).ready(function() {
	var productCounter = 0;
	var selectedProducts = {};

	// Initialize datepicker
	jQuery('.dateField').datepicker({
		format: 'yyyy-mm-dd',
		autoclose: true,
		todayHighlight: true
	});

	// Add Product Button - Open VTiger Product Popup
	jQuery('#addProductBtn').on('click', function(e) {
		e.preventDefault();
		e.stopPropagation();

		// Open product popup in new window
		var url = 'index.php?module=Products&view=Popup&src_module=Quotes&src_field=productSelect&multi_select=true';
		var popupWindow = window.open(url, 'product_popup', 'width=1000,height=600,scrollbars=yes,resizable=yes');

		// Listen for product selection
		window.selectProductsCallback = function(selectedProducts) {
			if (selectedProducts && selectedProducts.length > 0) {
				addProductsToTable(selectedProducts);
			}
			if (popupWindow && !popupWindow.closed) {
				popupWindow.close();
			}
		};

		return false;
	});

	// Function to add products to table
	function addProductsToTable(products) {
		if (!jQuery.isArray(products)) {
			products = [products];
		}

		jQuery.each(products, function(index, product) {
			// Check if product already added
			if (selectedProducts[product.id]) {
				return; // Skip if already in list
			}

			productCounter++;
			selectedProducts[product.id] = true;

			// Get product details
			var productName = product.name || product.label || 'Produit inconnu';
			var unitPrice = parseFloat(product.unit_price || product.listprice || 0).toFixed(2);

			// Create table row
			var row = jQuery('<tr>').attr('data-product-id', product.id).attr('data-row-index', productCounter);

			row.append(
				jQuery('<td>').html(
					productName +
					'<input type="hidden" name="hdnProductId' + productCounter + '" value="' + product.id + '">' +
					'<input type="hidden" name="productName' + productCounter + '" value="' + productName + '">' +
					'<input type="hidden" name="comment' + productCounter + '" value="">' +
					'<input type="hidden" name="productDeleted' + productCounter + '" value="0">' +
					'<input type="hidden" name="discount_percent' + productCounter + '" value="0">' +
					'<input type="hidden" name="discount_amount' + productCounter + '" value="0">'
				)
			);

			row.append(
				jQuery('<td>').html(
					'<input type="number" name="qty' + productCounter + '" class="form-control" value="1" step="1" min="1">'
				)
			);

			row.append(
				jQuery('<td>').html(
					'<input type="number" name="listPrice' + productCounter + '" class="form-control" value="' + unitPrice + '" step="0.01" min="0">'
				)
			);

			row.append(
				jQuery('<td>').html(
					'<button type="button" class="btn btn-danger btn-sm removeProduct"><i class="fa fa-trash"></i></button>'
				)
			);

			jQuery('#productsList').append(row);
			jQuery('#productsTable').show();

			// Update total product count
			jQuery('#totalProductCount').val(productCounter);
		});
	}

	// Remove product from table
	jQuery(document).on('click', '.removeProduct', function() {
		var row = jQuery(this).closest('tr');
		var productId = row.data('product-id');

		// Remove from selected products
		delete selectedProducts[productId];

		// Remove row
		row.remove();

		// Hide table if no products
		if (jQuery('#productsList tr').length === 0) {
			jQuery('#productsTable').hide();
		}
	});

	// Form submission
	jQuery('#generateQuoteForm').on('submit', function(e) {
		e.preventDefault();

		// Serialize form data
		var formData = jQuery(this).serialize();

		// Show loading
		app.helper.showProgress();

		// Disable submit button
		jQuery('#generateQuoteBtn').prop('disabled', true);

		// AJAX submit to Quotes Save action
		jQuery.ajax({
			url: 'index.php',
			type: 'POST',
			data: formData,
			success: function(response) {
				app.helper.hideProgress();

				// Parse response - could be HTML redirect or JSON
				var quoteId = null;

				// Try to parse as JSON first
				try {
					if (typeof response === 'string') {
						var jsonResponse = JSON.parse(response);
						if (jsonResponse.success && jsonResponse.result) {
							quoteId = jsonResponse.result.id || jsonResponse.result._recordId;
						}
					} else if (response.success && response.result) {
						quoteId = response.result.id || response.result._recordId;
					}
				} catch (e) {
					// Not JSON, try to extract from HTML redirect
					if (typeof response === 'string' && response.indexOf('record=') !== -1) {
						var match = response.match(/record=(\d+)/);
						if (match && match[1]) {
							quoteId = match[1];
						}
					}
				}

				if (quoteId) {
					app.helper.showSuccessNotification({
						message: 'Devis créé avec succès'
					});

					// Close modal
					app.helper.hideModal();

					// Redirect to quote detail view
					window.location.href = 'index.php?module=Quotes&view=Detail&record=' + quoteId;
				} else {
					// Could not find quote ID, show error
					app.helper.showErrorNotification({
						message: 'Le devis a peut-être été créé, mais impossible de récupérer son ID. Veuillez vérifier la liste des devis.'
					});
					jQuery('#generateQuoteBtn').prop('disabled', false);
				}
			},
			error: function(xhr, status, error) {
				app.helper.hideProgress();
				app.helper.showErrorNotification({
					message: 'Erreur lors de la création du devis: ' + error
				});
				jQuery('#generateQuoteBtn').prop('disabled', false);
			}
		});
	});
});
</script>
{/literal}
{/strip}
