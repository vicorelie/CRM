<?php
/* Smarty version 4.5.5, created on 2026-02-16 23:52:38
  from '/var/www/CNK-DEM/layouts/v7/modules/Potentials/UnifiedDevisTab.tpl' */

/* @var Smarty_Internal_Template $_smarty_tpl */
if ($_smarty_tpl->_decodeProperties($_smarty_tpl, array (
  'version' => '4.5.5',
  'unifunc' => 'content_699391a67ec823_88104422',
  'has_nocache_code' => false,
  'file_dependency' => 
  array (
    'e8a51b2351cb5e007c61858dc1e9c25c76f81db8' => 
    array (
      0 => '/var/www/CNK-DEM/layouts/v7/modules/Potentials/UnifiedDevisTab.tpl',
      1 => 1771278736,
      2 => 'file',
    ),
  ),
  'includes' => 
  array (
  ),
),false)) {
function content_699391a67ec823_88104422 (Smarty_Internal_Template $_smarty_tpl) {
$_smarty_tpl->_checkPlugins(array(0=>array('file'=>'/var/www/CNK-DEM/vendor/smarty/smarty/libs/plugins/modifier.count.php','function'=>'smarty_modifier_count',),));
?>
<div class="devis-tab-container" id="devisTabContainer" data-potential-id="<?php echo $_smarty_tpl->tpl_vars['POTENTIAL_ID']->value;?>
"data-contact-id="<?php echo $_smarty_tpl->tpl_vars['CONTACT_ID']->value;?>
"data-csrf-token="<?php echo $_smarty_tpl->tpl_vars['CSRF_TOKEN']->value;?>
"data-current-user-id="<?php echo $_smarty_tpl->tpl_vars['CURRENT_USER_ID']->value;?>
"><?php if (smarty_modifier_count($_smarty_tpl->tpl_vars['QUOTES']->value) > 0) {?><div class="quotes-bar"><span class="quotes-label"><i class="fa fa-folder-open"></i> Devis (<?php echo smarty_modifier_count($_smarty_tpl->tpl_vars['QUOTES']->value);?>
):</span><div class="quotes-chips"><?php
$_from = $_smarty_tpl->smarty->ext->_foreach->init($_smarty_tpl, $_smarty_tpl->tpl_vars['QUOTES']->value, 'QUOTE');
$_smarty_tpl->tpl_vars['QUOTE']->do_else = true;
if ($_from !== null) foreach ($_from as $_smarty_tpl->tpl_vars['QUOTE']->value) {
$_smarty_tpl->tpl_vars['QUOTE']->do_else = false;
?><div class="quote-chip<?php if ($_smarty_tpl->tpl_vars['QUOTE']->value['cf_1162'] == '1') {?> validated<?php }?>" data-quoteid="<?php echo $_smarty_tpl->tpl_vars['QUOTE']->value['quoteid'];?>
" onclick="UnifiedDevis.loadQuote(<?php echo $_smarty_tpl->tpl_vars['QUOTE']->value['quoteid'];?>
)" title="<?php echo decode_html($_smarty_tpl->tpl_vars['QUOTE']->value['subject']);?>
"><div class="chip-line1"><span class="chip-no"><?php echo $_smarty_tpl->tpl_vars['QUOTE']->value['quote_no'];?>
</span><span class="chip-sep">/</span><span class="chip-date"><?php echo $_smarty_tpl->tpl_vars['QUOTE']->value['created_date'];?>
</span></div><div class="chip-line2"><span class="chip-formule"><?php echo (($tmp = $_smarty_tpl->tpl_vars['QUOTE']->value['cf_1125'] ?? null)===null||$tmp==='' ? '-' ?? null : $tmp);?>
</span><span class="chip-sep">/</span><span class="chip-total"><?php echo call_user_func_array($_smarty_tpl->registered_plugins[ 'modifier' ][ 'number_format' ][ 0 ], array( $_smarty_tpl->tpl_vars['QUOTE']->value['total'],0,',',' ' ));?>
€</span></div></div><?php
}
$_smarty_tpl->smarty->ext->_foreach->restore($_smarty_tpl, 1);?></div><button type="button" class="btn btn-sm" id="unified_btnPaiement" style="display:none; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none;" onclick="UnifiedDevis.openStripePayments()"><i class="fa fa-credit-card"></i> Paiement</button><button type="button" class="btn btn-sm" id="unified_btnViewPdf" style="display:none; background: linear-gradient(135deg, #17a2b8 0%, #3498db 100%); color: white; border: none;" onclick="UnifiedDevis.openPDFPreviewModal()"><i class="fa fa-file-pdf-o"></i> PDF</button><button type="button" class="btn btn-sm" id="unified_btnDeleteQuote" style="display:none; background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%); color: white; border: none;" onclick="UnifiedDevis.deleteQuote()"><i class="fa fa-trash"></i></button></div><?php }?><form id="unifiedQuoteForm" method="POST" action="index.php" style="display:none;"><input type="hidden" name="__vtrftk" value="<?php echo $_smarty_tpl->tpl_vars['CSRF_TOKEN']->value;?>
"><input type="hidden" name="module" value="Quotes"><input type="hidden" name="action" value="Save"><input type="hidden" name="record" id="unified_recordId" value=""><input type="hidden" name="potential_id" value="<?php echo $_smarty_tpl->tpl_vars['POTENTIAL_ID']->value;?>
"><input type="hidden" name="contact_id" value="<?php echo $_smarty_tpl->tpl_vars['CONTACT_ID']->value;?>
"><input type="hidden" name="sourceRecord" value="<?php echo $_smarty_tpl->tpl_vars['POTENTIAL_ID']->value;?>
"><input type="hidden" name="sourceModule" value="Potentials"><input type="hidden" name="relationOperation" value="true"><input type="hidden" name="currency_id" value="1"><input type="hidden" name="assigned_user_id" value="<?php echo $_smarty_tpl->tpl_vars['CURRENT_USER_ID']->value;?>
"><input type="hidden" name="subject" id="unified_hidden_subject" value=""><input type="hidden" name="cf_1005" id="unified_hidden_cf_1005" value=""><input type="hidden" name="quotestage" id="unified_hidden_quotestage" value="Created"><input type="hidden" name="cf_1125" id="unified_hidden_cf_1125" value=""><input type="hidden" name="cf_1127" id="unified_hidden_cf_1127" value="0"><input type="hidden" name="cf_1129" id="unified_hidden_cf_1129" value="0"><input type="hidden" name="cf_1139" id="unified_hidden_cf_1139" value=""><input type="hidden" name="cf_1141" value="14"><input type="hidden" name="cf_1133" value="43"><input type="hidden" name="cf_1135" value="57"><input type="hidden" name="cf_1269" id="unified_hidden_cf_1269" value=""><input type="hidden" name="prestataire" id="unified_hidden_prestataire" value=""><input type="hidden" name="cf_1162" id="unified_hidden_cf_1162" value="0"><input type="hidden" name="totalProductCount" id="unified_hidden_totalProductCount" value="0"><input type="hidden" name="taxtype" value="individual"><input type="hidden" name="hdnSubTotal" id="unified_hdnSubTotal" value="0"><input type="hidden" name="hdnGrandTotal" id="unified_hdnGrandTotal" value="0"><input type="hidden" name="hdnDiscountPercent" value="0"><input type="hidden" name="hdnDiscountAmount" value="0"><input type="hidden" name="hdnS_H_Percent" value="0"><input type="hidden" name="hdnS_H_Amount" value="0"><input type="hidden" name="hdnAdjustment" value="0"><input type="hidden" name="pre_tax_total" id="unified_pre_tax_total" value="0"><div id="unifiedHiddenProductsContainer"></div></form><div class="quote-form-container"><input type="hidden" id="unified_selectedQuoteId" value=""><div class="form-section section-info"><div class="form-row-<?php if ($_smarty_tpl->tpl_vars['IS_ADMIN']->value) {?>4<?php } else { ?>2<?php }?>"><div class="form-group"><label><span class="required">*</span> Sujet</label><input type="text" id="unified_subject" value="Dev-<?php echo htmlspecialchars((string)decode_html($_smarty_tpl->tpl_vars['POTENTIAL_NAME']->value), ENT_QUOTES, 'UTF-8', true);?>
" required></div><div class="form-group"><label>Date validite</label><input type="date" id="unified_cf_1005" value="<?php echo $_smarty_tpl->tpl_vars['DEFAULT_VALIDITY_DATE']->value;?>
"></div><?php if ($_smarty_tpl->tpl_vars['IS_ADMIN']->value) {?><div class="form-group"><label>Prestataire</label><select id="unified_prestataire"><option value="">-- Sélectionner --</option><?php
$_from = $_smarty_tpl->smarty->ext->_foreach->init($_smarty_tpl, $_smarty_tpl->tpl_vars['VENDORS']->value, 'VENDOR');
$_smarty_tpl->tpl_vars['VENDOR']->do_else = true;
if ($_from !== null) foreach ($_from as $_smarty_tpl->tpl_vars['VENDOR']->value) {
$_smarty_tpl->tpl_vars['VENDOR']->do_else = false;
?><option value="<?php echo $_smarty_tpl->tpl_vars['VENDOR']->value['id'];?>
"><?php echo $_smarty_tpl->tpl_vars['VENDOR']->value['name'];?>
</option><?php
}
$_smarty_tpl->smarty->ext->_foreach->restore($_smarty_tpl, 1);?></select></div><div class="form-group"><label>Validation</label><div class="validation-toggle" id="unified_cf_1162_toggle" onclick="UnifiedDevis.toggleValidation()"><i class="fa fa-circle-o"></i><span>Non validé</span></div><input type="hidden" id="unified_cf_1162" value="0"></div><?php }?></div></div><div class="forfait-products-row"><div class="form-section section-forfait"><div class="form-section-title title-purple"><i class="fa fa-truck"></i>Formule</div><div class="form-row-2"><div class="form-group"><label>Type formule</label><select id="unified_cf_1125"><option value="">-- Select --</option><option value="ECO">ECO</option><option value="ECO PLUS">ECO PLUS</option><option value="CONFORT">CONFORT</option><option value="LUXE">LUXE</option></select></div><div class="form-group"><label>Type demenagement</label><select id="unified_cf_1269"><option value="">-- Select --</option><option value="Groupage">Groupage</option><option value="Spécial" selected>Spécial</option></select></div></div><div class="form-row-2" style="margin-top: 10px;"><div class="form-group"><label>Formule HT</label><input type="number" id="unified_cf_1127" value="" placeholder="0.00" step="0.01" min="0"></div><div class="form-group"><label>Formule TTC</label><input type="number" id="unified_cf_1127_ttc" value="" placeholder="0.00" step="0.01" min="0"></div></div><div class="form-row-2" style="margin-top: 10px;"><div class="form-group"><label>Supplement</label><input type="number" id="unified_cf_1129" value="" placeholder="0.00" step="0.01" min="0"></div><div class="form-group"><label>Formule + Suppl. TTC</label><input type="number" id="unified_forfait_total_ttc" value="0" step="0.01" readonly style="background: #f0f0f0;"></div></div></div><div class="form-section section-products"><div class="form-section-title title-green"><i class="fa fa-cubes"></i>Produits et services</div><div class="form-row-2"><div class="form-group" style="position: relative;"><label>Rechercher</label><div style="display:flex;gap:6px;"><input type="text" id="unified_productSearch" placeholder="Ajouter un produit..." style="flex:1;"><button type="button" class="btn btn-sm btn-success" onclick="UnifiedDevis.addManualProduct()" title="Ajouter manuellement" style="padding:6px 10px;border-radius:6px;white-space:nowrap;"><i class="fa fa-plus"></i></button></div><div id="unified_productResults" style="position:absolute;background:white;border:2px solid #e0e0e0;border-radius:8px;margin-top:5px;max-height:250px;overflow-y:auto;display:none;z-index:100;box-shadow:0 4px 15px rgba(0,0,0,0.1);left:0;right:0;"></div></div><div class="form-group"><label>Assurance</label><select id="unified_cf_1139"><option value="">-- Select --</option><?php
$_smarty_tpl->tpl_vars['i'] = new Smarty_Variable(null, $_smarty_tpl->isRenderingCache);$_smarty_tpl->tpl_vars['i']->step = 1000;$_smarty_tpl->tpl_vars['i']->total = (int) ceil(($_smarty_tpl->tpl_vars['i']->step > 0 ? 26000+1 - (4000) : 4000-(26000)+1)/abs($_smarty_tpl->tpl_vars['i']->step));
if ($_smarty_tpl->tpl_vars['i']->total > 0) {
for ($_smarty_tpl->tpl_vars['i']->value = 4000, $_smarty_tpl->tpl_vars['i']->iteration = 1;$_smarty_tpl->tpl_vars['i']->iteration <= $_smarty_tpl->tpl_vars['i']->total;$_smarty_tpl->tpl_vars['i']->value += $_smarty_tpl->tpl_vars['i']->step, $_smarty_tpl->tpl_vars['i']->iteration++) {
$_smarty_tpl->tpl_vars['i']->first = $_smarty_tpl->tpl_vars['i']->iteration === 1;$_smarty_tpl->tpl_vars['i']->last = $_smarty_tpl->tpl_vars['i']->iteration === $_smarty_tpl->tpl_vars['i']->total;?><option value="<?php echo $_smarty_tpl->tpl_vars['i']->value;?>
" <?php if ($_smarty_tpl->tpl_vars['i']->value == 4000) {?>selected<?php }?>><?php echo call_user_func_array($_smarty_tpl->registered_plugins[ 'modifier' ][ 'number_format' ][ 0 ], array( $_smarty_tpl->tpl_vars['i']->value,0,',',' ' ));?>
 €</option><?php }
}
?></select></div></div><table id="unified_productsTable" class="data-table" style="display:none"><thead><tr><th>Produit</th><th style="width:80px">Qte</th><th style="width:100px">PU</th><th style="width:90px">Total</th><th style="width:50px"></th></tr></thead><tbody id="unified_productsList"></tbody></table></div></div><div class="form-section section-tarification"><div class="totals-row"><div class="total-box total-ht"><div class="total-label">Total HT</div><div class="total-value" id="unified_montant_total_ht">0.00 €</div></div><div class="total-box total-ttc"><div class="total-label">Total TTC</div><div class="total-value"><input type="number" id="unified_montant_total_ttc" value="0" step="0.01" min="0" style="width:100%;background:transparent;border:none;border-bottom:1px dashed rgba(255,255,255,0.5);color:white;font-size:1.2em;font-weight:700;text-align:center;padding:2px 0;" /></div></div><div class="total-box total-acompte"><div class="total-label">Acompte</div><div class="total-value" id="unified_acompte_ttc">0.00 €</div></div><div class="total-box total-solde"><div class="total-label">Solde</div><div class="total-value" id="unified_solde_ttc">0.00 €</div></div></div></div><?php if (smarty_modifier_count($_smarty_tpl->tpl_vars['PDF_TEMPLATES']->value) > 0) {?><div class="form-section section-pdf" style="display:none;"><div class="form-section-title title-red"><i class="fa fa-file-pdf-o"></i>Documents PDF<button type="button" class="btn btn-sm" onclick="UnifiedDevis.toggleAllPdfTemplates()" style="margin-left: auto; padding: 4px 10px; font-size: 11px;background: #f8f9fa; color: #333; border: 2px solid #e0e0e0;"><i class="fa fa-check-square-o"></i> Tout</button></div><div class="pdf-templates-grid"><?php
$_from = $_smarty_tpl->smarty->ext->_foreach->init($_smarty_tpl, $_smarty_tpl->tpl_vars['PDF_TEMPLATES']->value, 'TEMPLATE');
$_smarty_tpl->tpl_vars['TEMPLATE']->do_else = true;
if ($_from !== null) foreach ($_from as $_smarty_tpl->tpl_vars['TEMPLATE']->value) {
$_smarty_tpl->tpl_vars['TEMPLATE']->do_else = false;
?><div class="pdf-template-item" onclick="UnifiedDevis.togglePdfTemplate(this, <?php echo $_smarty_tpl->tpl_vars['TEMPLATE']->value['id'];?>
)"><input type="checkbox" class="unified-pdf-template-checkbox" value="<?php echo $_smarty_tpl->tpl_vars['TEMPLATE']->value['id'];?>
" data-name="<?php echo decode_html($_smarty_tpl->tpl_vars['TEMPLATE']->value['name']);?>
" style="display:none;"><span class="pdf-template-name"><?php echo $_smarty_tpl->tpl_vars['TEMPLATE']->value['name'];?>
</span></div><?php
}
$_smarty_tpl->smarty->ext->_foreach->restore($_smarty_tpl, 1);?></div><div style="margin-top: 12px; display: flex; gap: 10px; align-items: center;"><input type="email" id="unified_pdfRecipientEmail" value="<?php echo $_smarty_tpl->tpl_vars['CONTACT_EMAIL']->value;?>
" placeholder="Email destinataire" style="flex: 1;"><button type="button" class="btn btn-info" id="unified_btnSendMail" style="display:none;" onclick="UnifiedDevis.sendMail()"><i class="fa fa-envelope"></i> Envoyer mail</button></div></div><?php }?></div><div class="actions-bar" style="display: flex; gap: 10px; justify-content: center;"><button type="button" class="btn btn-purple" onclick="UnifiedDevis.createQuote()"><i class="fa fa-plus"></i> Creer un devis</button></div></div>

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

.devis-tab-container .total-box.total-ttc input::-webkit-outer-spin-button,
.devis-tab-container .total-box.total-ttc input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
}
.devis-tab-container .total-box.total-ttc input[type=number] {
    -moz-appearance: textfield;
}
.devis-tab-container .total-box.total-ttc input:focus {
    outline: none;
    border-bottom-color: rgba(255,255,255,0.9);
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

<?php echo '<script'; ?>
>
var unifiedAllProducts = <?php echo $_smarty_tpl->tpl_vars['PRODUCTS_JSON']->value;?>
;
var unifiedPotentialId = <?php echo $_smarty_tpl->tpl_vars['POTENTIAL_ID']->value;?>
;
var unifiedContactId = <?php echo (($tmp = $_smarty_tpl->tpl_vars['CONTACT_ID']->value ?? null)===null||$tmp==='' ? 0 ?? null : $tmp);?>
;
var unifiedCsrfToken = '<?php echo $_smarty_tpl->tpl_vars['CSRF_TOKEN']->value;?>
';
var unifiedPdfTemplates = <?php echo $_smarty_tpl->tpl_vars['PDF_TEMPLATES_JSON']->value;?>
;
<?php echo '</script'; ?>
>
<?php }
}
