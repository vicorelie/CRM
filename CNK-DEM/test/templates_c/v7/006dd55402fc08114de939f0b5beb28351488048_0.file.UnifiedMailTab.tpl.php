<?php
/* Smarty version 4.5.5, created on 2026-02-10 14:21:28
  from '/var/www/CNK-DEM/layouts/v7/modules/Potentials/UnifiedMailTab.tpl' */

/* @var Smarty_Internal_Template $_smarty_tpl */
if ($_smarty_tpl->_decodeProperties($_smarty_tpl, array (
  'version' => '4.5.5',
  'unifunc' => 'content_698b22c8a5a2e8_43313587',
  'has_nocache_code' => false,
  'file_dependency' => 
  array (
    '006dd55402fc08114de939f0b5beb28351488048' => 
    array (
      0 => '/var/www/CNK-DEM/layouts/v7/modules/Potentials/UnifiedMailTab.tpl',
      1 => 1770720486,
      2 => 'file',
    ),
  ),
  'includes' => 
  array (
  ),
),false)) {
function content_698b22c8a5a2e8_43313587 (Smarty_Internal_Template $_smarty_tpl) {
$_smarty_tpl->_checkPlugins(array(0=>array('file'=>'/var/www/CNK-DEM/vendor/smarty/smarty/libs/plugins/modifier.count.php','function'=>'smarty_modifier_count',),));
?>
<div class="mail-tab-container" id="mailTabContainer" data-record-id="<?php echo $_smarty_tpl->tpl_vars['RECORD_ID']->value;?>
" data-contact-email="<?php echo (($tmp = $_smarty_tpl->tpl_vars['CONTACT_EMAIL']->value ?? null)===null||$tmp==='' ? '' ?? null : $tmp);?>
"><div class="mail-toolbar"><div class="toolbar-left"><i class="fa fa-envelope toolbar-icon"></i><h3>Emails</h3><span class="email-count" id="emailCount">-</span></div><button type="button" class="btn btn-send-email-main" id="sendEmailFromTab"><i class="fa fa-send"></i> Envoyer un Email</button></div><?php if (smarty_modifier_count($_smarty_tpl->tpl_vars['QUOTES']->value) > 0) {?><div class="mail-quotes-bar"><span class="mail-quotes-label"><i class="fa fa-file-text-o"></i> Devis (<?php echo smarty_modifier_count($_smarty_tpl->tpl_vars['QUOTES']->value);?>
):</span><div class="mail-quotes-chips"><?php
$_from = $_smarty_tpl->smarty->ext->_foreach->init($_smarty_tpl, $_smarty_tpl->tpl_vars['QUOTES']->value, 'QUOTE');
$_smarty_tpl->tpl_vars['QUOTE']->do_else = true;
if ($_from !== null) foreach ($_from as $_smarty_tpl->tpl_vars['QUOTE']->value) {
$_smarty_tpl->tpl_vars['QUOTE']->do_else = false;
?><div class="mail-quote-chip<?php if ($_smarty_tpl->tpl_vars['QUOTE']->value['cf_1162'] == '1') {?> validated<?php }?>" data-quoteid="<?php echo $_smarty_tpl->tpl_vars['QUOTE']->value['quoteid'];?>
" title="<?php echo decode_html($_smarty_tpl->tpl_vars['QUOTE']->value['subject']);?>
"><span class="mqc-no"><?php echo $_smarty_tpl->tpl_vars['QUOTE']->value['quote_no'];?>
</span><span class="mqc-sep">-</span><span class="mqc-formule"><?php echo (($tmp = $_smarty_tpl->tpl_vars['QUOTE']->value['cf_1125'] ?? null)===null||$tmp==='' ? '-' ?? null : $tmp);?>
</span><span class="mqc-sep">-</span><span class="mqc-total"><?php echo call_user_func_array($_smarty_tpl->registered_plugins[ 'modifier' ][ 'number_format' ][ 0 ], array( $_smarty_tpl->tpl_vars['QUOTE']->value['total'],0,',',' ' ));?>
€</span></div><?php
}
$_smarty_tpl->smarty->ext->_foreach->restore($_smarty_tpl, 1);?></div></div><?php }?><div class="mail-history-section"><div id="emailHistoryList" class="email-history-list"><div class="loading-indicator"><div class="spinner"></div><p>Chargement...</p></div></div></div></div>

<style>
.mail-tab-container {
    background: #f4f6f9;
    min-height: 400px;
}

/* Toolbar */
.mail-toolbar {
    background: #fff;
    padding: 12px 20px;
    border-radius: 8px;
    margin-bottom: 12px;
    box-shadow: 0 1px 4px rgba(0,0,0,0.06);
    display: flex;
    justify-content: space-between;
    align-items: center;
    border: 1px solid #e0e0e0;
}
.mail-toolbar .toolbar-left {
    display: flex;
    align-items: center;
    gap: 10px;
}
.mail-toolbar .toolbar-icon {
    font-size: 20px;
    color: #e91e63;
}
.mail-toolbar h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: #2c3e50;
}
.mail-toolbar .email-count {
    background: #667eea;
    color: white;
    padding: 2px 10px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 600;
}
.btn-send-email-main {
    padding: 8px 18px;
    border-radius: 20px;
    font-weight: 600;
    font-size: 13px;
    background: linear-gradient(135deg, #e91e63 0%, #c2185b 100%);
    border: none;
    color: white;
    transition: all 0.2s;
    box-shadow: 0 2px 8px rgba(233,30,99,0.25);
}
.btn-send-email-main:hover {
    background: linear-gradient(135deg, #c2185b 0%, #ad1457 100%);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(233,30,99,0.35);
    color: white;
}

/* Quotes Bar */
.mail-quotes-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    background: #fff;
    padding: 8px 15px;
    border-radius: 8px;
    margin-bottom: 12px;
    box-shadow: 0 1px 4px rgba(0,0,0,0.06);
    border: 1px solid #e0e0e0;
    flex-wrap: wrap;
}
.mail-quotes-label {
    font-size: 11px;
    font-weight: 600;
    color: #667eea;
    white-space: nowrap;
}
.mail-quotes-chips {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    flex: 1;
}
.mail-quote-chip {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    background: #f5f6fa;
    border: 2px solid #e0e3eb;
    border-radius: 16px;
    font-size: 11px;
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
}
.mail-quote-chip:hover {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border-color: transparent;
}
.mail-quote-chip.selected {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border-color: #4a5fc1;
}
.mail-quote-chip.validated {
    border-color: #28a745;
}
.mail-quote-chip.validated.selected {
    border-color: #28a745;
}
.mail-quote-chip .mqc-no {
    font-weight: 700;
}
.mail-quote-chip .mqc-sep {
    opacity: 0.4;
    font-size: 10px;
}
.mail-quote-chip .mqc-formule {
    font-weight: 500;
}
.mail-quote-chip .mqc-total {
    font-weight: 700;
}

/* History Section */
.mail-history-section {
    background: #fff;
    border-radius: 8px;
    box-shadow: 0 1px 4px rgba(0,0,0,0.06);
    border: 1px solid #e0e0e0;
    overflow: hidden;
}
.email-history-list {
    max-height: 600px;
    overflow-y: auto;
}

/* Compact Email Row */
.email-row {
    display: flex;
    align-items: center;
    padding: 10px 16px;
    border-bottom: 1px solid #f0f0f0;
    cursor: pointer;
    transition: background 0.15s;
    gap: 12px;
}
.email-row:hover {
    background: #f8f0ff;
}
.email-row:last-child {
    border-bottom: none;
}

.email-row .er-status {
    flex-shrink: 0;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    margin-top: 1px;
}
.email-row .er-status.sent { background: #4caf50; }
.email-row .er-status.error { background: #f44336; }
.email-row .er-status.draft { background: #ff9800; }

.email-row .er-main {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 8px;
}
.email-row .er-subject {
    font-weight: 600;
    font-size: 13px;
    color: #2c3e50;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 300px;
}
.email-row .er-to {
    font-size: 12px;
    color: #7f8c8d;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 200px;
}
.email-row .er-badges {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
}
.email-row .er-badge {
    font-size: 10px;
    padding: 1px 6px;
    border-radius: 8px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.3px;
}
.er-badge.sent { background: #e8f5e9; color: #2e7d32; }
.er-badge.error { background: #ffebee; color: #c62828; }
.er-badge.draft { background: #fff3e0; color: #e65100; }

.email-row .er-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
}
.email-row .er-from {
    font-size: 11px;
    color: #95a5a6;
    max-width: 100px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.email-row .er-date {
    font-size: 11px;
    color: #95a5a6;
    white-space: nowrap;
    min-width: 70px;
    text-align: right;
}
.email-row .er-attach {
    color: #95a5a6;
    font-size: 12px;
}
.email-row .er-arrow {
    color: #ccc;
    font-size: 12px;
    flex-shrink: 0;
}

/* Empty State */
.email-history-empty {
    text-align: center;
    padding: 50px 20px;
    color: #95a5a6;
}
.email-history-empty i {
    font-size: 48px;
    margin-bottom: 10px;
    display: block;
    opacity: 0.4;
}
.email-history-empty h5 {
    font-size: 15px;
    font-weight: 600;
    margin-bottom: 5px;
    color: #6c757d;
}
.email-history-empty p {
    font-size: 13px;
    margin: 0;
}

/* Loading */
.loading-indicator {
    text-align: center;
    padding: 30px 20px;
    color: #95a5a6;
}
.spinner {
    border: 3px solid #f3f3f3;
    border-top: 3px solid #e91e63;
    border-radius: 50%;
    width: 30px;
    height: 30px;
    animation: spin 1s linear infinite;
    margin: 0 auto 10px;
}
@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

/* Send Email Modal */
#sendEmailModal .modal-dialog { max-width: 600px; }
#sendEmailModal .modal-content {
    border: none;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
}
#sendEmailModal .send-modal-header {
    background: linear-gradient(135deg, #e91e63 0%, #c2185b 100%);
    color: white;
    padding: 20px 24px;
    position: relative;
}
#sendEmailModal .send-modal-header .close {
    color: white;
    opacity: 0.8;
    font-size: 22px;
    position: absolute;
    right: 16px;
    top: 16px;
    text-shadow: none;
}
#sendEmailModal .send-modal-header .close:hover { opacity: 1; }
#sendEmailModal .send-modal-header h4 {
    margin: 0;
    font-size: 18px;
    font-weight: 700;
    display: flex;
    align-items: center;
    gap: 10px;
}
#sendEmailModal .send-modal-header h4 i { font-size: 20px; }
#sendEmailModal .send-modal-header p {
    margin: 6px 0 0;
    font-size: 12px;
    opacity: 0.85;
}
#sendEmailModal .modal-body { padding: 24px; }
#sendEmailModal .send-field {
    margin-bottom: 20px;
}
#sendEmailModal .send-field:last-child { margin-bottom: 0; }
#sendEmailModal .send-field label {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    font-weight: 600;
    color: #2c3e50;
    margin-bottom: 8px;
}
#sendEmailModal .send-field label i {
    color: #e91e63;
    font-size: 14px;
    width: 16px;
    text-align: center;
}
#sendEmailModal .send-field label .required-dot {
    width: 6px;
    height: 6px;
    background: #e91e63;
    border-radius: 50%;
    display: inline-block;
}
#sendEmailModal .send-field .form-control {
    border: 2px solid #e8e8e8;
    border-radius: 8px;
    padding: 10px 14px;
    font-size: 13px;
    transition: border-color 0.2s, box-shadow 0.2s;
    height: auto;
}
#sendEmailModal .send-field .form-control:focus {
    border-color: #e91e63;
    box-shadow: 0 0 0 3px rgba(233,30,99,0.1);
    outline: none;
}
#sendEmailModal .pdf-attachments-box {
    border: 2px solid #e8e8e8;
    border-radius: 8px;
    padding: 12px 14px;
    background: #fafafa;
    max-height: 140px;
    overflow-y: auto;
}
#sendEmailModal .pdf-attachments-box label {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 6px 8px;
    margin: 0;
    border-radius: 6px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    color: #333;
    transition: background 0.15s;
}
#sendEmailModal .pdf-attachments-box label:hover {
    background: #fff0f5;
}
#sendEmailModal .pdf-attachments-box label input[type="checkbox"] {
    accent-color: #e91e63;
    width: 16px;
    height: 16px;
}
#sendEmailModal .pdf-attachments-box .text-muted {
    font-size: 12px;
    padding: 4px 8px;
    margin: 0;
}
#sendEmailModal .modal-footer {
    padding: 16px 24px;
    border-top: 1px solid #f0f0f0;
    display: flex;
    justify-content: flex-end;
    gap: 10px;
}
#sendEmailModal .btn-cancel-send {
    padding: 9px 20px;
    border-radius: 8px;
    font-weight: 600;
    font-size: 13px;
    background: #f5f5f5;
    border: 1px solid #ddd;
    color: #666;
    transition: all 0.2s;
}
#sendEmailModal .btn-cancel-send:hover {
    background: #eee;
    color: #333;
}
#sendEmailModal .btn-confirm-send {
    padding: 9px 24px;
    border-radius: 8px;
    font-weight: 600;
    font-size: 13px;
    background: linear-gradient(135deg, #e91e63 0%, #c2185b 100%);
    border: none;
    color: white;
    transition: all 0.2s;
    box-shadow: 0 2px 8px rgba(233,30,99,0.25);
}
#sendEmailModal .btn-confirm-send:hover {
    background: linear-gradient(135deg, #c2185b 0%, #ad1457 100%);
    box-shadow: 0 4px 12px rgba(233,30,99,0.35);
    transform: translateY(-1px);
}
#sendEmailModal .btn-confirm-send:disabled {
    opacity: 0.7;
    transform: none;
    box-shadow: none;
}

/* View Email Modal */
#viewEmailModal .modal-dialog { max-width: 800px; }
#viewEmailModal .modal-header {
    background: #1F314D;
    color: white;
    padding: 12px 20px;
}
#viewEmailModal .modal-header .close { color: white; opacity: 0.8; }
#viewEmailModal .modal-title { font-size: 14px; font-weight: 600; }
#viewEmailModal .email-view-meta {
    background: #f8f9fa;
    padding: 10px 20px;
    border-bottom: 1px solid #e0e0e0;
    font-size: 13px;
    color: #555;
}
#viewEmailModal .email-view-meta strong { color: #333; }
#viewEmailModal .email-view-body {
    padding: 0;
}
#viewEmailModal .email-view-body iframe {
    width: 100%;
    height: 500px;
    border: none;
    display: block;
}

@media (max-width: 768px) {
    .mail-toolbar { flex-direction: column; gap: 10px; align-items: stretch; }
    .btn-send-email-main { width: 100%; text-align: center; }
    .email-row .er-main { flex-direction: column; align-items: flex-start; gap: 2px; }
    .email-row .er-to { max-width: 100%; }
}
</style>

<?php echo '<script'; ?>
 type="text/javascript">
jQuery(document).ready(function() {
    var recordId = jQuery('#mailTabContainer').data('record-id');
    var selectedQuoteId = '';

    loadEmailHistory();

    // Quote chip selection (toggle)
    jQuery(document).on('click', '.mail-quote-chip', function() {
        var quoteId = jQuery(this).data('quoteid');
        if (jQuery(this).hasClass('selected')) {
            jQuery(this).removeClass('selected');
            selectedQuoteId = '';
        } else {
            jQuery('.mail-quote-chip').removeClass('selected');
            jQuery(this).addClass('selected');
            selectedQuoteId = quoteId;
        }
    });

    // Send email button
    jQuery('#sendEmailFromTab').on('click', function(e) {
        e.preventDefault();
        jQuery('#sendEmailModal').modal('show');

        var ajaxData = { module: 'Potentials', action: 'GetEmailData', record: recordId };
        if (selectedQuoteId) {
            ajaxData.quote_id = selectedQuoteId;
        }

        jQuery.ajax({
            url: 'index.php',
            type: 'POST',
            dataType: 'json',
            data: ajaxData,
            success: function(response) {
                var data = response.result || response;
                if (data.contact_email) {
                    jQuery('#recipientEmail').val(data.contact_email);
                }
                // Show context indicator
                var contextLabel = selectedQuoteId ? 'Devis' : 'Affaire';
                jQuery('#sendEmailContext').text(contextLabel);

                var select = jQuery('#emailTemplate');
                select.empty().append('<option value="">-- Choisir un template --</option>');
                if (data.email_templates && data.email_templates.length > 0) {
                    for (var i = 0; i < data.email_templates.length; i++) {
                        var tpl = data.email_templates[i];
                        select.append('<option value="' + tpl.id + '">' + tpl.name + '</option>');
                    }
                }
                var container = jQuery('#pdfTemplatesList');
                if (data.pdf_templates && data.pdf_templates.length > 0) {
                    var html = '';
                    for (var j = 0; j < data.pdf_templates.length; j++) {
                        var pdf = data.pdf_templates[j];
                        html += '<label><input type="checkbox" name="pdf_templates[]" value="' + pdf.id + '"> <i class="fa fa-file-pdf-o" style="color:#e91e63;"></i> ' + pdf.name + '</label>';
                    }
                    container.html(html);
                } else {
                    container.html('<p class="text-muted" style="margin:0;font-size:12px;"><i class="fa fa-info-circle"></i> Aucun template PDF disponible</p>');
                }
            }
        });
    });

    // Send email confirm
    jQuery('#confirmSendEmail').off('click').on('click', function(e) {
        e.preventDefault();
        sendEmail();
    });

    // View email click
    jQuery(document).on('click', '.email-row', function() {
        var emailId = jQuery(this).data('email-id');
        if (!emailId) return;

        jQuery('#viewEmailSubject').text('Chargement...');
        jQuery('#viewEmailMeta').hide();
        jQuery('#viewEmailBody').html('<div class="loading-indicator"><div class="spinner"></div><p>Chargement...</p></div>');
        jQuery('#viewEmailModal').modal('show');

        jQuery.ajax({
            url: 'index.php',
            type: 'GET',
            dataType: 'json',
            data: { module: 'Potentials', action: 'GetEmailHistory', record: recordId, mode: 'detail', email_id: emailId },
            success: function(response) {
                var data = response.result || response;
                if (data.success && data.body) {
                    jQuery('#viewEmailSubject').text(data.subject || 'Sans objet');
                    jQuery('#viewEmailFrom').text(data.from || '-');
                    jQuery('#viewEmailTo').text(data.to || '-');
                    jQuery('#viewEmailDate').text(data.date || '-');
                    jQuery('#viewEmailMeta').show();

                    // Render email body in iframe using data URI (no server request needed)
                    var emailBody = data.body;
                    var base64 = btoa(unescape(encodeURIComponent(emailBody)));
                    var dataUri = 'data:text/html;charset=utf-8;base64,' + base64;
                    jQuery('#viewEmailBody').html('<iframe src="' + dataUri + '" style="width:100%;height:500px;border:none;display:block;" sandbox="allow-same-origin"></iframe>');
                } else {
                    jQuery('#viewEmailSubject').text('Erreur');
                    jQuery('#viewEmailBody').html('<p class="text-center text-muted" style="padding:40px;">Email introuvable</p>');
                }
            },
            error: function() {
                jQuery('#viewEmailSubject').text('Erreur');
                jQuery('#viewEmailBody').html('<p class="text-center text-danger" style="padding:40px;">Erreur de chargement</p>');
            }
        });
    });

    function loadEmailHistory() {
        var $list = jQuery('#emailHistoryList');

        jQuery.ajax({
            url: 'index.php',
            type: 'GET',
            data: { module: 'Potentials', action: 'GetEmailHistory', record: recordId },
            dataType: 'json',
            success: function(response) {
                var data = response.result || response;

                if (data.success && data.emails && data.emails.length > 0) {
                    jQuery('#emailCount').text(data.emails.length);
                    $list.empty();

                    data.emails.forEach(function(email) {
                        var statusClass = email.status || 'sent';
                        var statusLabel = '';
                        if (statusClass === 'sent') statusLabel = 'Envoyé';
                        else if (statusClass === 'error') statusLabel = 'Erreur';
                        else if (statusClass === 'draft') statusLabel = 'Brouillon';

                        var html = '<div class="email-row" data-email-id="' + email.id + '" data-subject="' + (email.subject || '').replace(/"/g, '&quot;') + '">' +
                            '<span class="er-status ' + statusClass + '"></span>' +
                            '<div class="er-main">' +
                                '<span class="er-subject">' + (email.subject || 'Sans objet') + '</span>' +
                                '<span class="er-to">' + (email.to || '') + '</span>' +
                            '</div>' +
                            '<div class="er-badges">' +
                                '<span class="er-badge ' + statusClass + '">' + statusLabel + '</span>' +
                                (email.has_attachments ? '<i class="fa fa-paperclip er-attach" title="Pièces jointes"></i>' : '') +
                            '</div>' +
                            '<div class="er-meta">' +
                                '<span class="er-from">' + (email.from || '') + '</span>' +
                                '<span class="er-date">' + (email.date || '') + '</span>' +
                            '</div>' +
                            '<i class="fa fa-chevron-right er-arrow"></i>' +
                        '</div>';

                        $list.append(html);
                    });
                } else {
                    jQuery('#emailCount').text('0');
                    $list.html(
                        '<div class="email-history-empty">' +
                        '<i class="fa fa-inbox"></i>' +
                        '<h5>Aucun email</h5>' +
                        '<p>Les emails envoyés apparaîtront ici</p>' +
                        '</div>'
                    );
                }
            },
            error: function() {
                $list.html('<div class="email-history-empty"><i class="fa fa-exclamation-triangle"></i><h5>Erreur</h5></div>');
            }
        });
    }

    function sendEmail() {
        var recipientEmail = jQuery('#recipientEmail').val();
        var ccEmail = jQuery('#ccEmail').val();
        var emailTemplate = jQuery('#emailTemplate').val();

        if (!recipientEmail) { alert("Saisir l'email du destinataire"); return; }
        if (!emailTemplate) { alert('Sélectionner un template'); return; }

        var pdfTemplates = [];
        jQuery('input[name="pdf_templates[]"]:checked').each(function() {
            pdfTemplates.push(jQuery(this).val());
        });

        var $btn = jQuery('#confirmSendEmail');
        $btn.prop('disabled', true).html('<i class="fa fa-spinner fa-spin"></i> Envoi...');

        var sendData = { module: 'Potentials', action: 'SendEmail', record: recordId, email: recipientEmail, cc: ccEmail, email_template: emailTemplate, pdf_templates: pdfTemplates };
        if (selectedQuoteId) {
            sendData.quote_id = selectedQuoteId;
        }

        jQuery.ajax({
            url: 'index.php',
            type: 'POST',
            data: sendData,
            dataType: 'json',
            success: function(response) {
                var data = response.result || response;
                if (data.success) {
                    alert('Email envoyé !');
                    jQuery('#sendEmailModal').modal('hide');
                    loadEmailHistory();
                } else {
                    alert('Erreur: ' + (data.message || data.error || 'Erreur inconnue'));
                }
            },
            error: function(xhr, status, error) { alert('Erreur: ' + error); },
            complete: function() { $btn.prop('disabled', false).html('<i class="fa fa-paper-plane"></i> Envoyer'); }
        });
    }
});
<?php echo '</script'; ?>
>

<div id="sendEmailModal" class="modal fade" tabindex="-1" role="dialog">
    <div class="modal-dialog" role="document">
        <div class="modal-content">
            <div class="send-modal-header">
                <button type="button" class="close" data-dismiss="modal"><span>&times;</span></button>
                <h4><i class="fa fa-paper-plane"></i> Envoyer un Email</h4>
                <p>Contexte : <strong id="sendEmailContext">Affaire</strong></p>
            </div>
            <div class="modal-body">
                <form id="sendEmailForm">
                    <div class="send-field">
                        <label><i class="fa fa-user-o"></i> Destinataire <span class="required-dot"></span></label>
                        <input type="email" class="form-control" id="recipientEmail" placeholder="adresse@email.com" required>
                    </div>
                    <div class="send-field">
                        <label><i class="fa fa-users"></i> Cc <span style="font-weight:400;color:#999;font-size:11px;margin-left:2px;">(optionnel)</span></label>
                        <input type="text" class="form-control" id="ccEmail" placeholder="email1@exemple.com, email2@exemple.com">
                    </div>
                    <div class="send-field">
                        <label><i class="fa fa-file-text-o"></i> Template Email <span class="required-dot"></span></label>
                        <select class="form-control" id="emailTemplate" required>
                            <option value="">-- Choisir un template --</option>
                        </select>
                    </div>
                    <div class="send-field">
                        <label><i class="fa fa-paperclip"></i> Pièces jointes PDF</label>
                        <div id="pdfTemplatesList" class="pdf-attachments-box">
                            <p class="text-muted" style="margin:0;"><i class="fa fa-spinner fa-spin"></i> Chargement...</p>
                        </div>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-cancel-send" data-dismiss="modal">Annuler</button>
                <button type="button" class="btn btn-confirm-send" id="confirmSendEmail"><i class="fa fa-paper-plane"></i> Envoyer</button>
            </div>
        </div>
    </div>
</div>

<div id="viewEmailModal" class="modal fade" tabindex="-1" role="dialog">
    <div class="modal-dialog" style="max-width:800px;" role="document">
        <div class="modal-content">
            <div class="modal-header" style="background:#1F314D;color:#fff;padding:12px 20px;">
                <button type="button" class="close" data-dismiss="modal" style="color:#fff;opacity:0.8;"><span>&times;</span></button>
                <h4 class="modal-title" style="font-size:14px;font-weight:600;">
                    <i class="fa fa-envelope-open-o"></i> <span id="viewEmailSubject"></span>
                </h4>
            </div>
            <div id="viewEmailMeta" style="background:#f8f9fa;padding:10px 20px;border-bottom:1px solid #e0e0e0;font-size:12px;color:#555;display:none;">
                <div style="margin-bottom:4px;"><strong>De :</strong> <span id="viewEmailFrom"></span></div>
                <div style="margin-bottom:4px;"><strong>&Agrave; :</strong> <span id="viewEmailTo"></span></div>
                <div><strong>Date :</strong> <span id="viewEmailDate"></span></div>
            </div>
            <div class="modal-body" style="padding:0;">
                <div id="viewEmailBody">
                </div>
            </div>
            <div class="modal-footer" style="padding:8px 15px;">
                <button type="button" class="btn btn-default btn-sm" data-dismiss="modal">Fermer</button>
            </div>
        </div>
    </div>
</div>
<?php }
}
