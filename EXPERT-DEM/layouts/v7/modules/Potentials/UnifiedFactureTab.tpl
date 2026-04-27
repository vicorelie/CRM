{*+**********************************************************************************
* Unified Facture Tab - Invoice management (admin only)
* Sections: Devis (Quotes) + ODM (Sales Orders) with proforma and invoice generation
************************************************************************************}
{strip}
<div class="facture-tab-container" id="factureTabContainer"
     data-potential-id="{$POTENTIAL_ID}"
     data-contact-id="{$CONTACT_ID}">

    {* =====================================================
       SECTION DEVIS
       ===================================================== *}
    <div class="facture-section">
        <div class="facture-section-header header-purple">
            <i class="fa fa-file-text-o"></i> Devis ({$QUOTES|@count})
        </div>
        <div class="facture-section-body">
            {if $QUOTES|@count > 0}
                <div class="facture-chips">
                    {foreach item=QUOTE from=$QUOTES}
                        {assign var=HAS_INVOICE value=false}
                        {foreach item=INV from=$INVOICES}
                            {if $INV.quote_id eq $QUOTE.quoteid}
                                {assign var=HAS_INVOICE value=true}
                            {/if}
                        {/foreach}
                        <div class="facture-chip {if $HAS_INVOICE}has-invoice{/if} {if $QUOTE.cf_1162 eq '1'}validated{/if}"
                             data-id="{$QUOTE.quoteid}" data-type="quote"
                             data-has-invoice="{if $HAS_INVOICE}1{else}0{/if}"
                             onclick="UnifiedFacture.selectQuote({$QUOTE.quoteid})">
                            <div class="chip-line1">
                                <span class="chip-no">{$QUOTE.quote_no}</span>
                                <span class="chip-date">{$QUOTE.created_date}</span>
                                {if $HAS_INVOICE}<span class="chip-badge-invoiced"><i class="fa fa-file-text"></i></span>{/if}
                                {if $QUOTE.cf_1162 eq '1'}<span class="chip-badge-valid"><i class="fa fa-check"></i></span>{/if}
                            </div>
                            <div class="chip-line2">
                                {if $QUOTE.cf_1125}<span class="chip-formule">{$QUOTE.cf_1125}</span>{/if}
                                <span class="chip-total">{$QUOTE.total|string_format:"%.2f"} EUR</span>
                            </div>
                        </div>
                    {/foreach}
                </div>

                {* Actions panel - shown when a quote is selected *}
                <div class="facture-actions" id="factureQuoteActions" style="display:none;">
                    <div class="facture-actions-bar">
                        <span class="actions-label" id="factureQuoteLabel">--</span>
                        <div id="factureQuoteButtons"></div>
                    </div>
                </div>
            {else}
                <p class="text-muted" style="padding: 15px; text-align: center;">Aucun devis pour cette affaire</p>
            {/if}
        </div>
    </div>

    {* =====================================================
       SECTION ODM
       ===================================================== *}
    <div class="facture-section" style="margin-top: 15px;">
        <div class="facture-section-header header-teal">
            <i class="fa fa-clipboard"></i> ODM ({$SALES_ORDERS|@count})
        </div>
        <div class="facture-section-body">
            {if $SALES_ORDERS|@count > 0}
                <div class="facture-chips">
                    {foreach item=SO from=$SALES_ORDERS}
                        {assign var=HAS_INVOICE_SO value=false}
                        {foreach item=INV from=$INVOICES}
                            {if $INV.salesorderid eq $SO.salesorderid}
                                {assign var=HAS_INVOICE_SO value=true}
                            {/if}
                        {/foreach}
                        <div class="facture-chip {if $HAS_INVOICE_SO}has-invoice{/if} {if $SO.sostatus eq 'Approved'}validated{/if}"
                             data-id="{$SO.salesorderid}" data-type="salesorder"
                             data-has-invoice="{if $HAS_INVOICE_SO}1{else}0{/if}"
                             onclick="UnifiedFacture.selectSalesOrder({$SO.salesorderid})">
                            <div class="chip-line1">
                                <span class="chip-no">{$SO.salesorder_no}</span>
                                <span class="chip-date">{$SO.created_date}</span>
                                {if $HAS_INVOICE_SO}<span class="chip-badge-invoiced"><i class="fa fa-file-text"></i></span>{/if}
                                {if $SO.sostatus eq 'Approved'}<span class="chip-badge-valid"><i class="fa fa-check"></i></span>{/if}
                            </div>
                            <div class="chip-line2">
                                {if $SO.cf_1186}<span class="chip-formule">{$SO.cf_1186}</span>{/if}
                                <span class="chip-total">{$SO.total|string_format:"%.2f"} EUR</span>
                            </div>
                        </div>
                    {/foreach}
                </div>

                {* Actions panel for ODM *}
                <div class="facture-actions" id="factureSOActions" style="display:none;">
                    <div class="facture-actions-bar">
                        <span class="actions-label" id="factureSOLabel">--</span>
                        <div id="factureSOButtons"></div>
                    </div>
                </div>
            {else}
                <p class="text-muted" style="padding: 15px; text-align: center;">Aucun ODM pour cette affaire</p>
            {/if}
        </div>
    </div>

    {* =====================================================
       ALL INVOICES OVERVIEW
       ===================================================== *}
    <div class="facture-section" style="margin-top: 15px;">
        <div class="facture-section-header header-red">
            <i class="fa fa-file-text"></i> Factures (<span id="factureInvoiceCount">{$INVOICES|@count}</span>)
        </div>
        <div class="facture-section-body" id="factureInvoicesBody">
            {if $INVOICES|@count > 0}
                <table class="facture-table" id="factureInvoicesTable">
                    <thead>
                        <tr>
                            <th>N&#176;</th>
                            <th>Sujet</th>
                            <th>Date</th>
                            <th>Total</th>
                            <th>Statut</th>
                            <th>Source</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {foreach item=INV from=$INVOICES}
                            <tr data-invoice-id="{$INV.invoiceid}">
                                <td><strong>{$INV.invoice_no}</strong></td>
                                <td>{$INV.subject}</td>
                                <td>{$INV.created_date}</td>
                                <td class="text-right"><strong>{$INV.total|string_format:"%.2f"} EUR</strong></td>
                                <td>
                                    {if $INV.invoicestatus eq 'Paid'}
                                        <span class="status-badge status-paid">Pay&#233;</span>
                                    {elseif $INV.invoicestatus eq 'Approved'}
                                        <span class="status-badge status-approved">Approuv&#233;</span>
                                    {elseif $INV.invoicestatus eq 'Created'}
                                        <span class="status-badge status-created">Cr&#233;&#233;</span>
                                    {else}
                                        <span class="status-badge status-default">{$INV.invoicestatus}</span>
                                    {/if}
                                </td>
                                <td>
                                    {if $INV.quote_id}Devis{/if}
                                    {if $INV.salesorderid}ODM{/if}
                                </td>
                                <td>
                                    <div class="facture-pdf-btns">
                                        {foreach item=TPL from=$INVOICE_PDF_TEMPLATES}
                                            <a href="index.php?module=PDFMaker&action=CreatePDFFromTemplate&mode=CreatePDF&source_module=Invoice&formodule=Invoice&record={$INV.invoiceid}&pdftemplateid={$TPL.id}"
                                               target="_blank" class="btn-pdf-small" title="{$TPL.name}">
                                                <i class="fa fa-file-pdf-o"></i>
                                            </a>
                                        {/foreach}
                                        <button class="btn-pdf-small btn-preview" title="Aper&#231;u PDF"
                                                onclick="UnifiedFacture.openInvoicePDFPreview({$INV.invoiceid})">
                                            <i class="fa fa-eye"></i>
                                        </button>
                                        <button class="btn-pdf-small btn-mail-inv" title="Envoyer par email"
                                                onclick="UnifiedFacture.openInvoiceEmailModal({$INV.invoiceid}, '{$INV.invoice_no|escape}')">
                                            <i class="fa fa-envelope"></i>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        {/foreach}
                    </tbody>
                </table>
            {else}
                <p class="text-muted" style="padding: 15px; text-align: center;">Aucune facture pour cette affaire</p>
            {/if}
        </div>
    </div>
</div>

{* Modal email facture *}
<div id="invoiceEmailModal" style="display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:9999;align-items:center;justify-content:center;">
    <div style="background:#fff;border-radius:12px;padding:28px 24px;max-width:560px;width:92%;box-shadow:0 8px 32px rgba(0,0,0,0.2);max-height:90vh;overflow-y:auto;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;">
            <h4 style="margin:0;color:#1F314D;font-size:16px;"><i class="fa fa-envelope" style="color:#667eea;margin-right:8px;"></i>Envoyer la facture <span id="invEmailModalTitle"></span></h4>
            <button onclick="UnifiedFacture.closeInvoiceEmailModal()" style="background:none;border:none;font-size:20px;cursor:pointer;color:#999;line-height:1;">&times;</button>
        </div>
        <div style="margin-bottom:12px;">
            <label style="font-size:12px;font-weight:600;color:#555;display:block;margin-bottom:4px;"><i class="fa fa-user-o"></i> Destinataire</label>
            <input type="email" id="invEmailTo" class="form-control" placeholder="adresse@email.com" style="font-size:13px;">
        </div>
        <div style="margin-bottom:12px;">
            <label style="font-size:12px;font-weight:600;color:#555;display:block;margin-bottom:4px;"><i class="fa fa-users"></i> Cc <span style="font-weight:400;color:#999;">(optionnel)</span></label>
            <input type="text" id="invEmailCc" class="form-control" placeholder="email1@exemple.com, email2@exemple.com" style="font-size:13px;">
        </div>
        <div style="margin-bottom:12px;">
            <label style="font-size:12px;font-weight:600;color:#555;display:block;margin-bottom:4px;"><i class="fa fa-pencil"></i> Objet</label>
            <input type="text" id="invEmailSubject" class="form-control" style="font-size:13px;">
        </div>
        <div style="margin-bottom:12px;">
            <label style="font-size:12px;font-weight:600;color:#555;display:block;margin-bottom:4px;"><i class="fa fa-align-left"></i> Message</label>
            <div id="invEmailBody" contenteditable="true" style="border:1.5px solid #e0e0e0;border-radius:6px;padding:10px 12px;font-size:13px;min-height:120px;max-height:220px;overflow-y:auto;outline:none;background:#fff;line-height:1.6;"></div>
        </div>
        <div style="margin-bottom:18px;">
            <label style="font-size:12px;font-weight:600;color:#555;display:block;margin-bottom:6px;"><i class="fa fa-paperclip"></i> Pi&#232;ces jointes PDF</label>
            <div id="invEmailPdfList" style="display:flex;flex-wrap:wrap;gap:8px;"></div>
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end;">
            <button onclick="UnifiedFacture.closeInvoiceEmailModal()" style="padding:8px 18px;background:#f0f0f0;border:none;border-radius:6px;cursor:pointer;font-size:13px;">Annuler</button>
            <button id="invEmailSendBtn" onclick="UnifiedFacture.sendInvoiceEmail()" style="padding:8px 18px;background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:13px;font-weight:600;"><i class="fa fa-paper-plane"></i> Envoyer</button>
        </div>
    </div>
</div>

{* ===================================================== *}
{* JAVASCRIPT                                             *}
{* ===================================================== *}
<script>
    var factureInvoices = {$INVOICES_JSON};
    var factureInvoicePdfTemplates = {$INVOICE_PDF_TEMPLATES_JSON};
    var factureStripePayments = {$STRIPE_PAYMENTS_JSON};
</script>

{* ===================================================== *}
{* STYLES                                                 *}
{* ===================================================== *}
<style>
.facture-tab-container { padding: 0; }

.facture-section { background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
.facture-section-header {
    padding: 12px 20px; font-weight: 600; font-size: 14px; color: #fff;
    display: flex; align-items: center; gap: 8px;
}
.facture-section-header.header-purple { background: linear-gradient(135deg, #667eea, #764ba2); }
.facture-section-header.header-teal { background: linear-gradient(135deg, #17a2b8, #20c997); }
.facture-section-header.header-red { background: linear-gradient(135deg, #e74c3c, #c0392b); }
.facture-section-body { padding: 15px; }

/* Chips */
.facture-chips { display: flex; flex-wrap: wrap; gap: 10px; }
.facture-chip {
    border: 2px solid #e0e0e0; border-radius: 10px; padding: 8px 14px;
    cursor: pointer; transition: all 0.2s; min-width: 160px; background: #fafafa;
}
.facture-chip:hover { border-color: #90caf9; background: #e3f2fd; }
.facture-chip.active { border-color: #1976d2; background: #e3f2fd; box-shadow: 0 0 0 2px rgba(25,118,210,0.2); }
.facture-chip.validated { border-left: 4px solid #27ae60; }

/* Grayed out chips (already has invoice) */
.facture-chip.has-invoice {
    background: #f0f0f0; opacity: 0.6; border-color: #ccc;
}
.facture-chip.has-invoice:hover { opacity: 0.8; background: #e8e8e8; border-color: #aaa; }
.facture-chip.has-invoice.active { opacity: 1; border-color: #999; background: #eee; box-shadow: 0 0 0 2px rgba(0,0,0,0.1); }
.chip-badge-invoiced { color: #999; font-size: 11px; margin-left: 2px; }

.chip-line1 { display: flex; align-items: center; gap: 6px; font-size: 12px; }
.chip-no { font-weight: 700; color: #333; }
.chip-date { color: #999; font-size: 11px; }
.chip-badge-valid { color: #27ae60; font-size: 11px; }
.chip-line2 { display: flex; align-items: center; gap: 8px; margin-top: 4px; font-size: 12px; }
.chip-formule { background: #f0f0f0; padding: 1px 6px; border-radius: 4px; font-size: 11px; color: #666; }
.chip-total { font-weight: 600; color: #1976d2; }

/* Actions bar */
.facture-actions { margin-top: 15px; border-top: 1px solid #eee; padding-top: 12px; }
.facture-actions-bar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.actions-label { font-weight: 600; color: #333; font-size: 13px; margin-right: auto; }
.btn-facture {
    border: none; border-radius: 8px; padding: 8px 16px; font-size: 13px; font-weight: 600;
    cursor: pointer; display: inline-flex; align-items: center; gap: 6px; transition: all 0.2s;
}
.btn-facture:hover { transform: translateY(-1px); box-shadow: 0 2px 8px rgba(0,0,0,0.15); }
.btn-proforma { background: linear-gradient(135deg, #ff9800, #f57c00); color: #fff; }
.btn-generate { background: linear-gradient(135deg, #4caf50, #388e3c); color: #fff; }
.btn-stripe { background: linear-gradient(135deg, #667eea, #764ba2); color: #fff; }
.btn-view-invoice { background: linear-gradient(135deg, #2196f3, #1976d2); color: #fff; }

/* Table */
.facture-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.facture-table th { background: #f8f9fa; padding: 8px 12px; text-align: left; font-weight: 600; color: #555; border-bottom: 2px solid #dee2e6; }
.facture-table td { padding: 8px 12px; border-bottom: 1px solid #f0f0f0; vertical-align: middle; }
.facture-table tr:hover { background: #f8f9fa; }
.facture-table .text-right { text-align: right; }

/* Status badges */
.status-badge { padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; }
.status-paid { background: #d4edda; color: #155724; }
.status-approved { background: #fff3cd; color: #856404; }
.status-created { background: #d1ecf1; color: #0c5460; }
.status-default { background: #e9ecef; color: #495057; }

/* PDF buttons */
.facture-pdf-btns { display: flex; gap: 4px; }
.btn-pdf-small {
    display: inline-flex; align-items: center; justify-content: center;
    width: 28px; height: 28px; border-radius: 6px; border: 1px solid #ddd;
    background: #fff; color: #e74c3c; cursor: pointer; font-size: 13px; transition: all 0.15s;
    text-decoration: none;
}
.btn-pdf-small:hover { background: #fee; border-color: #e74c3c; }
.btn-pdf-small.btn-preview { color: #1976d2; }
.btn-pdf-small.btn-preview:hover { background: #e3f2fd; border-color: #1976d2; }
.btn-pdf-small.btn-mail-inv { color: #27ae60; }
.btn-pdf-small.btn-mail-inv:hover { background: #eafaf1; border-color: #27ae60; }

@media (max-width: 768px) {
    .facture-chips { flex-direction: column; }
    .facture-chip { min-width: auto; }
    .facture-actions-bar { flex-direction: column; align-items: flex-start; }
}
</style>
{/strip}
