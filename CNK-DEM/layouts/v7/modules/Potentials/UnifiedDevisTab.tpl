{*+**********************************************************************************
* Unified Devis Tab - Quote management embedded in unified view
* Uses common design system from UnifiedTabbedView.tpl
************************************************************************************}
{strip}
<div class="devis-tab-container" id="devisTabContainer"
     data-potential-id="{$POTENTIAL_ID}"
     data-contact-id="{$CONTACT_ID}"
     data-csrf-token="{$CSRF_TOKEN}"
     data-current-user-id="{$CURRENT_USER_ID}">

    {* Existing Quotes - Compact horizontal chips *}
    {if $QUOTES|@count > 0}
    <div class="quotes-bar">
        <span class="quotes-label"><i class="fa fa-folder-open"></i> Devis ({$QUOTES|@count}):</span>
        <div class="quotes-chips">
            {foreach from=$QUOTES item=QUOTE}
            <div class="quote-chip{if $QUOTE.cf_1162 eq '1'} validated{/if}" data-quoteid="{$QUOTE.quoteid}" onclick="UnifiedDevis.loadQuote({$QUOTE.quoteid})" title="{decode_html($QUOTE.subject)}">
                <div class="chip-line1">
                    <span class="chip-no">{$QUOTE.quote_no}</span>
                    <span class="chip-sep">/</span>
                    <span class="chip-date">{$QUOTE.created_date}</span>
                </div>
                <div class="chip-line2">
                    <span class="chip-formule">{$QUOTE.cf_1125|default:'-'}</span>
                    <span class="chip-sep">/</span>
                    <span class="chip-total">{$QUOTE.total|number_format:0:',':' '}€</span>
                </div>
            </div>
            {/foreach}
        </div>
        <button type="button" class="btn btn-sm" id="unified_btnPaiement" style="display:none; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none;" onclick="UnifiedDevis.openStripePayments()">
            <i class="fa fa-credit-card"></i> Paiement
        </button>
<button type="button" class="btn btn-sm" id="unified_btnViewPdf" style="display:none; background: linear-gradient(135deg, #17a2b8 0%, #3498db 100%); color: white; border: none;" onclick="UnifiedDevis.openPDFPreviewModal()">
            <i class="fa fa-file-pdf-o"></i> PDF
        </button>
    </div>
    {/if}

    {* Hidden form for VTiger submission *}
    <form id="unifiedQuoteForm" method="POST" action="index.php" style="display:none;">
        <input type="hidden" name="__vtrftk" value="{$CSRF_TOKEN}">
        <input type="hidden" name="module" value="Quotes">
        <input type="hidden" name="action" value="Save">
        <input type="hidden" name="record" id="unified_recordId" value="">
        <input type="hidden" name="potential_id" value="{$POTENTIAL_ID}">
        <input type="hidden" name="contact_id" value="{$CONTACT_ID}">
        <input type="hidden" name="sourceRecord" value="{$POTENTIAL_ID}">
        <input type="hidden" name="sourceModule" value="Potentials">
        <input type="hidden" name="relationOperation" value="true">
        <input type="hidden" name="currency_id" value="1">
        <input type="hidden" name="assigned_user_id" value="{$CURRENT_USER_ID}">
        <input type="hidden" name="subject" id="unified_hidden_subject" value="">
        <input type="hidden" name="cf_1005" id="unified_hidden_cf_1005" value="">
        <input type="hidden" name="quotestage" id="unified_hidden_quotestage" value="Created">
        <input type="hidden" name="cf_1125" id="unified_hidden_cf_1125" value="">
        <input type="hidden" name="cf_1127" id="unified_hidden_cf_1127" value="0">
        <input type="hidden" name="cf_1129" id="unified_hidden_cf_1129" value="0">
        <input type="hidden" name="cf_1139" id="unified_hidden_cf_1139" value="">
        <input type="hidden" name="cf_1141" value="14">
        <input type="hidden" name="cf_1133" value="43">
        <input type="hidden" name="cf_1135" value="57">
        <input type="hidden" name="cf_1269" id="unified_hidden_cf_1269" value="">
        <input type="hidden" name="prestataire" id="unified_hidden_prestataire" value="">
        <input type="hidden" name="cf_1162" id="unified_hidden_cf_1162" value="0">
        <input type="hidden" name="totalProductCount" id="unified_hidden_totalProductCount" value="0">

        {* VTiger Inventory calculation fields *}
        <input type="hidden" name="taxtype" value="individual">
        <input type="hidden" name="hdnSubTotal" id="unified_hdnSubTotal" value="0">
        <input type="hidden" name="hdnGrandTotal" id="unified_hdnGrandTotal" value="0">
        <input type="hidden" name="hdnDiscountPercent" value="0">
        <input type="hidden" name="hdnDiscountAmount" value="0">
        <input type="hidden" name="hdnS_H_Percent" value="0">
        <input type="hidden" name="hdnS_H_Amount" value="0">
        <input type="hidden" name="hdnAdjustment" value="0">
        <input type="hidden" name="pre_tax_total" id="unified_pre_tax_total" value="0">

        <div id="unifiedHiddenProductsContainer"></div>
    </form>

    {* Quote Form *}
    <div class="quote-form-container">
        <input type="hidden" id="unified_selectedQuoteId" value="">

        {* Section Info - Compact inline *}
        <div class="form-section section-info">
            <div class="form-row-{if $IS_ADMIN}4{else}2{/if}">
                <div class="form-group">
                    <label><span class="required">*</span> Sujet</label>
                    <input type="text" id="unified_subject" value="Dev-{decode_html($POTENTIAL_NAME)|escape:'html'}" required>
                </div>
                <div class="form-group">
                    <label>Date validite</label>
                    <input type="date" id="unified_cf_1005" value="{$DEFAULT_VALIDITY_DATE}">
                </div>
                {if $IS_ADMIN}
                <div class="form-group">
                    <label>Prestataire</label>
                    <select id="unified_prestataire">
                        <option value="">-- Sélectionner --</option>
                        {foreach from=$VENDORS item=VENDOR}
                        <option value="{$VENDOR.id}">{$VENDOR.name}</option>
                        {/foreach}
                    </select>
                </div>
                <div class="form-group">
                    <label>Validation</label>
                    <div class="validation-toggle" id="unified_cf_1162_toggle" onclick="UnifiedDevis.toggleValidation()">
                        <i class="fa fa-circle-o"></i>
                        <span>Non validé</span>
                    </div>
                    <input type="hidden" id="unified_cf_1162" value="0">
                </div>
                {/if}
            </div>
        </div>

        {* Section Forfait + Produits - Side by side *}
        <div class="forfait-products-row">
            {* Left: Forfait *}
            <div class="form-section section-forfait">
                <div class="form-section-title title-purple">
                    <i class="fa fa-truck"></i>
                    Formule
                </div>
                <div class="form-row-2">
                    <div class="form-group">
                        <label>Type formule</label>
                        <select id="unified_cf_1125">
                            <option value="">-- Select --</option>
                            <option value="ECO">ECO</option>
                            <option value="ECO PLUS">ECO PLUS</option>
                            <option value="CONFORT">CONFORT</option>
                            <option value="LUXE">LUXE</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Type demenagement</label>
                        <select id="unified_cf_1269">
                            <option value="">-- Select --</option>
                            <option value="Groupage">Groupage</option>
                            <option value="Spécial" selected>Spécial</option>
                        </select>
                    </div>
                </div>
                <div class="form-row-2" style="margin-top: 10px;">
                    <div class="form-group">
                        <label>Formule HT</label>
                        <input type="number" id="unified_cf_1127" value="" placeholder="0.00" step="0.01" min="0">
                    </div>
                    <div class="form-group">
                        <label>Formule TTC</label>
                        <input type="number" id="unified_cf_1127_ttc" value="" placeholder="0.00" step="0.01" min="0">
                    </div>
                </div>
                <div class="form-row-2" style="margin-top: 10px;">
                    <div class="form-group">
                        <label>Supplement</label>
                        <input type="number" id="unified_cf_1129" value="" placeholder="0.00" step="0.01" min="0">
                    </div>
                    <div class="form-group">
                        <label>Formule + Suppl. TTC</label>
                        <input type="number" id="unified_forfait_total_ttc" value="0" step="0.01" readonly style="background: #f0f0f0;">
                    </div>
                </div>
            </div>

            {* Right: Products *}
            <div class="form-section section-products">
                <div class="form-section-title title-green">
                    <i class="fa fa-cubes"></i>
                    Produits et services
                </div>
                <div class="form-row-2">
                    <div class="form-group" style="position: relative;">
                        <label>Rechercher</label>
                        <div style="display:flex;gap:6px;">
                            <input type="text" id="unified_productSearch" placeholder="Ajouter un produit..." style="flex:1;">
                            <button type="button" class="btn btn-sm btn-success" onclick="UnifiedDevis.addManualProduct()" title="Ajouter manuellement" style="padding:6px 10px;border-radius:6px;white-space:nowrap;">
                                <i class="fa fa-plus"></i>
                            </button>
                        </div>
                        <div id="unified_productResults" style="position:absolute;background:white;border:2px solid #e0e0e0;border-radius:8px;margin-top:5px;max-height:250px;overflow-y:auto;display:none;z-index:100;box-shadow:0 4px 15px rgba(0,0,0,0.1);left:0;right:0;"></div>
                    </div>
                    <div class="form-group">
                        <label>Assurance</label>
                        <select id="unified_cf_1139">
                            <option value="">-- Select --</option>
                            {for $i=4000 to 26000 step 2000}
                            <option value="{$i}" {if $i == 4000}selected{/if}>{$i|number_format:0:',':' '} €</option>
                            {/for}
                        </select>
                    </div>
                </div>
                <table id="unified_productsTable" class="data-table" style="display:none">
                    <thead>
                        <tr>
                            <th>Produit</th>
                            <th style="width:80px">Qte</th>
                            <th style="width:100px">PU</th>
                            <th style="width:90px">Total</th>
                            <th style="width:50px"></th>
                        </tr>
                    </thead>
                    <tbody id="unified_productsList"></tbody>
                </table>
            </div>
        </div>

        {* Section Tarification - Full width below *}
        <div class="form-section section-tarification">
            <div class="totals-row">
                <div class="total-box total-ht">
                    <div class="total-label">Total HT</div>
                    <div class="total-value" id="unified_montant_total_ht">0.00 €</div>
                </div>
                <div class="total-box total-ttc">
                    <div class="total-label">Total TTC</div>
                    <div class="total-value" id="unified_montant_total_ttc">0.00 €</div>
                </div>
                <div class="total-box total-acompte">
                    <div class="total-label">Acompte</div>
                    <div class="total-value" id="unified_acompte_ttc">0.00 €</div>
                </div>
                <div class="total-box total-solde">
                    <div class="total-label">Solde</div>
                    <div class="total-value" id="unified_solde_ttc">0.00 €</div>
                </div>
            </div>
        </div>

        {* Section PDF Templates *}
        {if $PDF_TEMPLATES|@count > 0}
        <div class="form-section section-pdf">
            <div class="form-section-title title-red">
                <i class="fa fa-file-pdf-o"></i>
                Documents PDF
                <button type="button" class="btn btn-sm" onclick="UnifiedDevis.toggleAllPdfTemplates()" style="margin-left: auto; padding: 4px 10px; font-size: 11px;background: #f8f9fa; color: #333; border: 2px solid #e0e0e0;">
                    <i class="fa fa-check-square-o"></i> Tout
                </button>
            </div>
            <div class="pdf-templates-grid">
                {foreach from=$PDF_TEMPLATES item=TEMPLATE}
                <div class="pdf-template-item" onclick="UnifiedDevis.togglePdfTemplate(this, {$TEMPLATE.id})">
                    <input type="checkbox" class="unified-pdf-template-checkbox" value="{$TEMPLATE.id}" data-name="{decode_html($TEMPLATE.name)}" style="display:none;">
                    <span class="pdf-template-name">{$TEMPLATE.name}</span>
                </div>
                {/foreach}
            </div>
            <div style="margin-top: 12px; display: flex; gap: 10px; align-items: center;">
                <input type="email" id="unified_pdfRecipientEmail" value="{$CONTACT_EMAIL}" placeholder="Email destinataire" style="flex: 1;">
                <button type="button" class="btn btn-info" id="unified_btnSendMail" style="display:none;" onclick="UnifiedDevis.sendMail()">
                    <i class="fa fa-envelope"></i> Envoyer mail
                </button>
            </div>
        </div>
        {/if}
    </div>

    {* Actions *}
    <div class="actions-bar" style="display: flex; gap: 10px; justify-content: center;">
        <button type="button" class="btn btn-purple" onclick="UnifiedDevis.createQuote()">
            <i class="fa fa-plus"></i> Creer un devis
        </button>
    </div>
</div>
{/strip}

<style>
/* Devis Tab - Compact & Modern Styles */
.devis-tab-container .form-section {
    padding: 12px;
    margin-bottom: 10px;
}

.devis-tab-container .form-section-title {
    font-size: 13px;
    margin-bottom: 10px;
}

.devis-tab-container .form-group {
    margin-bottom: 8px;
}

.devis-tab-container .form-group label {
    font-size: 11px;
    margin-bottom: 4px;
    text-transform: uppercase;
    letter-spacing: 0.3px;
}

.devis-tab-container .form-group input,
.devis-tab-container .form-group select {
    padding: 8px 10px;
    font-size: 13px;
    transition: border-color 0.3s, box-shadow 0.3s;
}

/* Auto-save visual feedback */
.devis-tab-container .field-saving {
    border-color: #f39c12 !important;
    box-shadow: 0 0 0 2px rgba(243, 156, 18, 0.2);
}

.devis-tab-container .field-saved {
    border-color: #27ae60 !important;
    box-shadow: 0 0 0 2px rgba(39, 174, 96, 0.2);
}

.devis-tab-container .field-error {
    border-color: #e74c3c !important;
    box-shadow: 0 0 0 2px rgba(231, 76, 60, 0.2);
}

/* Container-level auto-save indicator */
#devisTabContainer.saving {
    position: relative;
}

#devisTabContainer.saving::after {
    content: 'Sauvegarde...';
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: #f39c12;
    color: white;
    padding: 8px 16px;
    border-radius: 20px;
    font-size: 12px;
    z-index: 1000;
    animation: pulse 1s infinite;
}

#devisTabContainer.saved::after {
    content: 'Sauvegardé ✓';
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: #27ae60;
    color: white;
    padding: 8px 16px;
    border-radius: 20px;
    font-size: 12px;
    z-index: 1000;
}

#devisTabContainer.save-error::after {
    content: 'Erreur de sauvegarde';
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: #e74c3c;
    color: white;
    padding: 8px 16px;
    border-radius: 20px;
    font-size: 12px;
    z-index: 1000;
}

@keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
}

/* 4 columns for forfait section */
.devis-tab-container .form-row-4 {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
}

/* 2 columns grid */
.devis-tab-container .form-row-2 {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
}

/* 3 columns grid */
.devis-tab-container .form-row-3 {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
}

/* 4 columns grid (admin) */
.devis-tab-container .form-row-4 {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
}

/* Forfait + Products side by side */
.devis-tab-container .forfait-products-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 15px;
    margin-bottom: 15px;
}

.devis-tab-container .forfait-products-row .form-section {
    margin-bottom: 0;
}

/* Orange title for Tarification */
.devis-tab-container .form-section-title.title-orange {
    color: #e67e22;
}

.devis-tab-container .form-section-title.title-orange i {
    color: #e67e22;
}

/* Tarification full width */
.devis-tab-container .section-tarification {
    border-top: 3px solid #e67e22;
}

/* Products section styling */
.devis-tab-container .section-products {
    border-left: 3px solid #28a745;
}

/* Totals row - compact horizontal */
.devis-tab-container .totals-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    padding: 10px;
    background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
    border-radius: 8px;
    margin-top: 8px;
}

.devis-tab-container .total-box {
    flex: 1;
    min-width: 100px;
    padding: 8px 10px;
    border-radius: 6px;
    text-align: center;
}

.devis-tab-container .total-box .total-label {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 4px;
    opacity: 0.9;
}

.devis-tab-container .total-box .total-value {
    font-size: 1.2em;
    font-weight: 700;
}

.devis-tab-container .total-box.total-ht {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
}

.devis-tab-container .total-box.total-ttc {
    background: linear-gradient(135deg, #764ba2 0%, #667eea 100%);
    color: white;
}

.devis-tab-container .total-box.total-acompte {
    background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%);
    color: white;
}

.devis-tab-container .total-box.total-solde {
    background: linear-gradient(135deg, #e67e22 0%, #f39c12 100%);
    color: white;
}

/* Quotes bar - horizontal compact */
.devis-tab-container .quotes-bar {
    display: flex;
    align-items: center;
    gap: 10px;
    background: #fff;
    padding: 10px 15px;
    border-radius: 8px;
    margin-bottom: 12px;
    box-shadow: 0 2px 6px rgba(0,0,0,0.06);
    border: 1px solid #e0e0e0;
    flex-wrap: wrap;
}

.devis-tab-container .quotes-label {
    font-size: 12px;
    font-weight: 600;
    color: #667eea;
    white-space: nowrap;
}

.devis-tab-container .quotes-chips {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    flex: 1;
}

.devis-tab-container .quote-chip {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 5px 7px;
    background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
    border: 2px solid transparent;
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 12px;
    text-align: center;
}

.devis-tab-container .quote-chip:hover {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
}

.devis-tab-container .quote-chip.selected {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border-color: #4a5fc1;
}

.devis-tab-container .quote-chip.validated {
    border: 3px solid #28a745;
    box-shadow: 0 0 8px rgba(40, 167, 69, 0.4);
}

.devis-tab-container .quote-chip.validated.selected {
    border-color: #28a745;
}

.devis-tab-container .quote-chip .chip-line1,
.devis-tab-container .quote-chip .chip-line2 {
    display: flex;
    align-items: center;
    gap: 4px;
    justify-content: center;
}

.devis-tab-container .quote-chip .chip-line1 {
    font-weight: 600;
}

.devis-tab-container .quote-chip .chip-line2 {
    font-size: 11px;
    opacity: 0.9;
}

.devis-tab-container .quote-chip .chip-sep {
    opacity: 0.5;
}

.devis-tab-container .quote-chip .chip-formule {
    font-weight: 500;
}

.devis-tab-container .quote-chip .chip-total {
    font-weight: 600;
}

/* PDF templates - horizontal compact */
.devis-tab-container .pdf-templates-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}

.devis-tab-container .pdf-template-item {
    padding: 8px 14px;
    font-size: 12px;
    border-radius: 20px;
    background: #f5f5f5;
    cursor: pointer;
    transition: all 0.2s;
    border: 2px solid transparent;
}

.devis-tab-container .pdf-template-item:hover {
    background: #e8e8e8;
}

.devis-tab-container .pdf-template-item.checked {
    background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
    color: white;
    border-color: #1e7e34;
}

/* Validation toggle - similar to PDF but different color */
.devis-tab-container .validation-toggle {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    font-size: 12px;
    font-weight: 500;
    border-radius: 20px;
    background: linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%);
    color: #666;
    cursor: pointer;
    transition: all 0.3s;
    border: 2px solid #ddd;
}

.devis-tab-container .validation-toggle:hover {
    background: linear-gradient(135deg, #e8e8e8 0%, #ddd 100%);
    border-color: #ccc;
}

.devis-tab-container .validation-toggle.validated {
    background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
    color: white;
    border-color: #1e7e34;
}

.devis-tab-container .validation-toggle.validated:hover {
    background: linear-gradient(135deg, #218838 0%, #1abc9c 100%);
}

.devis-tab-container .validation-toggle i {
    font-size: 14px;
}

/* Compact actions bar */
.devis-tab-container .actions-bar {
    padding: 15px;
    margin-top: 15px;
}

/* Products table compact */
.devis-tab-container .data-table th,
.devis-tab-container .data-table td {
    padding: 8px 10px;
    font-size: 13px;
}

@media (max-width: 992px) {
    .devis-tab-container .form-row-4 {
        grid-template-columns: repeat(2, 1fr);
    }

    .devis-tab-container .forfait-products-row {
        grid-template-columns: 1fr;
    }

    .devis-tab-container .section-products {
        border-left: none;
        border-top: 3px solid #28a745;
    }
}

@media (max-width: 576px) {
    .devis-tab-container .form-row-4 {
        grid-template-columns: 1fr;
    }

    .devis-tab-container .form-row-2 {
        grid-template-columns: 1fr;
    }

    .devis-tab-container .totals-row {
        flex-direction: column;
    }

    .devis-tab-container .quotes-bar {
        flex-direction: column;
        align-items: stretch;
    }

    .devis-tab-container .quotes-chips {
        justify-content: center;
    }
}

/* PDF Preview Modal */
#pdfPreviewModal .modal-content {
    border-radius: 16px;
    overflow: hidden;
    border: none;
    box-shadow: 0 25px 80px rgba(0,0,0,0.35);
}
#pdfPreviewModal .modal-header {
    border-bottom: none;
    padding: 16px 24px;
}
#pdfPreviewModal .modal-header .modal-title {
    font-size: 16px;
    font-weight: 600;
    letter-spacing: 0.3px;
}
#pdfPreviewModal .modal-header .modal-title .fa {
    margin-right: 10px;
    opacity: 0.9;
}
#pdfPreviewModal .modal-header .close {
    font-size: 28px;
    text-shadow: none;
    margin-top: -2px;
}
#pdfPreviewModal .pdf-tpl-sidebar {
    background: linear-gradient(180deg, #f8f9fb 0%, #f1f3f6 100%) !important;
    border-right: 1px solid #e2e6ea !important;
}
#pdfPreviewModal .pdf-tpl-sidebar-title {
    font-size: 10px !important;
    text-transform: uppercase !important;
    color: #9aa0a8 !important;
    letter-spacing: 1.2px !important;
    font-weight: 700 !important;
    padding: 12px 18px 8px !important;
    margin-bottom: 4px;
}
#pdfPreviewModal .pdf-tpl-item {
    padding: 11px 18px;
    cursor: pointer;
    font-size: 12.5px;
    color: #5a6370;
    border-left: 3px solid transparent;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    margin: 2px 8px 2px 0;
    border-radius: 0 8px 8px 0;
    line-height: 1.4;
}
#pdfPreviewModal .pdf-tpl-item:hover {
    background: rgba(52, 152, 219, 0.08);
    color: #2c3e50;
    border-left-color: #bdc3c7;
}
#pdfPreviewModal .pdf-tpl-item.active {
    background: linear-gradient(135deg, rgba(52, 152, 219, 0.12) 0%, rgba(41, 128, 185, 0.08) 100%);
    border-left-color: #3498db;
    color: #1a6fb5;
    font-weight: 600;
    box-shadow: 0 1px 4px rgba(52, 152, 219, 0.15);
}
#pdfPreviewModal .pdf-tpl-item .fa {
    margin-right: 10px;
    color: #e74c3c;
    font-size: 13px;
    opacity: 0.8;
}
#pdfPreviewModal .pdf-tpl-item.active .fa {
    opacity: 1;
}
#pdfPreviewModal .modal-body {
    background: #e8eaed;
}
#pdfPreviewModal .modal-footer {
    border-top: 1px solid #e9ecef;
    background: #fafbfc;
    padding: 12px 24px !important;
    display: flex;
    justify-content: flex-end;
    gap: 10px;
}
#pdfPreviewModal .modal-footer .btn {
    border-radius: 8px;
    padding: 8px 20px;
    font-size: 13px;
    font-weight: 500;
    border: none;
    transition: all 0.2s ease;
}
#pdfPreviewModal .modal-footer .btn-info {
    background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
    color: white;
    box-shadow: 0 2px 8px rgba(52, 152, 219, 0.3);
}
#pdfPreviewModal .modal-footer .btn-info:hover {
    box-shadow: 0 4px 14px rgba(52, 152, 219, 0.45);
    transform: translateY(-1px);
}
#pdfPreviewModal .modal-footer .btn-default {
    background: white;
    color: #5a6370;
    border: 1px solid #dde1e5;
}
#pdfPreviewModal .modal-footer .btn-default:hover {
    background: #f0f2f5;
    color: #2c3e50;
}
#pdfPreviewModal #pdfPreviewLoading {
    background: rgba(232, 234, 237, 0.85);
    width: 100%;
    height: 100%;
    top: 0;
    left: 0;
    position: absolute;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 10;
}
#pdfPreviewModal #pdfPreviewLoading .fa-spinner {
    color: #3498db;
}
#pdfPreviewModal #pdfPreviewLoading p {
    color: #7f8c9b;
    font-size: 13px;
    font-weight: 500;
}
</style>

<script>
var unifiedAllProducts = {$PRODUCTS_JSON};
var unifiedPotentialId = {$POTENTIAL_ID};
var unifiedContactId = {$CONTACT_ID|default:0};
var unifiedCsrfToken = '{$CSRF_TOKEN}';
var unifiedPdfTemplates = {$PDF_TEMPLATES_JSON};
</script>
