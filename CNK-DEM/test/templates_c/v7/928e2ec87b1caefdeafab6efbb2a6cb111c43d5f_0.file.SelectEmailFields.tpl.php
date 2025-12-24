<?php
/* Smarty version 4.5.5, created on 2025-12-21 06:53:38
  from '/var/www/CNK-DEM/layouts/v7/modules/EMAILMaker/SelectEmailFields.tpl' */

/* @var Smarty_Internal_Template $_smarty_tpl */
if ($_smarty_tpl->_decodeProperties($_smarty_tpl, array (
  'version' => '4.5.5',
  'unifunc' => 'content_69479972843d43_83331335',
  'has_nocache_code' => false,
  'file_dependency' => 
  array (
    '928e2ec87b1caefdeafab6efbb2a6cb111c43d5f' => 
    array (
      0 => '/var/www/CNK-DEM/layouts/v7/modules/EMAILMaker/SelectEmailFields.tpl',
      1 => 1765888875,
      2 => 'file',
    ),
  ),
  'includes' => 
  array (
  ),
),false)) {
function content_69479972843d43_83331335 (Smarty_Internal_Template $_smarty_tpl) {
$_smarty_tpl->_checkPlugins(array(0=>array('file'=>'/var/www/CNK-DEM/vendor/smarty/smarty/libs/plugins/function.html_options.php','function'=>'smarty_function_html_options',),));
?>

<div id="sendEmailContainer" class="modal-dialog"><form class="form-horizontal" id="SendEmailFormStep1" method="post" action="index.php"><div class="modal-content"><?php ob_start();
echo vtranslate('LBL_SELECT_EMAIL_IDS',$_smarty_tpl->tpl_vars['MODULE']->value);
$_prefixVariable1 = ob_get_clean();
$_smarty_tpl->_subTemplateRender(call_user_func_array($_smarty_tpl->registered_plugins[ 'modifier' ][ 'vtemplate_path' ][ 0 ], array( "ModalHeader.tpl",$_smarty_tpl->tpl_vars['MODULE']->value )), $_smarty_tpl->cache_id, $_smarty_tpl->compile_id, 0, $_smarty_tpl->cache_lifetime, array('TITLE'=>$_prefixVariable1), 0, true);
?><div class="modal-body"><input type="hidden" name="selected_ids" value=<?php echo ZEND_JSON::encode($_smarty_tpl->tpl_vars['SELECTED_IDS']->value);?>
><input type="hidden" name="excluded_ids" value=<?php echo ZEND_JSON::encode($_smarty_tpl->tpl_vars['EXCLUDED_IDS']->value);?>
><input type="hidden" name="viewname" value="<?php echo $_smarty_tpl->tpl_vars['VIEWNAME']->value;?>
"><input type="hidden" name="module" value="ITS4YouEmails"><input type="hidden" name="view" value="ComposeEmail"><input type="hidden" name="search_key" value="<?php echo $_smarty_tpl->tpl_vars['SEARCH_KEY']->value;?>
"><input type="hidden" name="operator" value="<?php echo $_smarty_tpl->tpl_vars['OPERATOR']->value;?>
"><input type="hidden" name="search_value" value="<?php echo $_smarty_tpl->tpl_vars['ALPHABET_VALUE']->value;?>
"><?php if ($_smarty_tpl->tpl_vars['SEARCH_PARAMS']->value) {?><input type="hidden" name="search_params" value='<?php echo ZEND_JSON::encode($_smarty_tpl->tpl_vars['SEARCH_PARAMS']->value);?>
'><?php }?><input type="hidden" name="fieldModule" value="<?php echo $_smarty_tpl->tpl_vars['SOURCE_MODULE']->value;?>
"><input type="hidden" name="to" value='<?php echo ZEND_JSON::encode($_smarty_tpl->tpl_vars['TO']->value);?>
'><input type="hidden" name="source_module" value="<?php echo $_smarty_tpl->tpl_vars['SELECTED_EMAIL_SOURCE_MODULE']->value;?>
"><?php if (!empty($_smarty_tpl->tpl_vars['PARENT_MODULE']->value)) {?><input type="hidden" name="sourceModule" value="<?php echo $_smarty_tpl->tpl_vars['PARENT_MODULE']->value;?>
"><input type="hidden" name="sourceRecord" value="<?php echo $_smarty_tpl->tpl_vars['PARENT_RECORD']->value;?>
"><input type="hidden" name="parentModule" value="<?php echo $_smarty_tpl->tpl_vars['RELATED_MODULE']->value;?>
"><?php }?><input type="hidden" name="ispdfactive" id="ispdfactive" value="<?php if (!empty($_smarty_tpl->tpl_vars['PDFTEMPLATEIDS']->value)) {?>1<?php } else { ?>0<?php }?>"><input type="hidden" name="pdf_template_ids" id="pdftemplateid" value="<?php echo $_smarty_tpl->tpl_vars['PDFTEMPLATEID']->value;?>
"><?php if (!empty($_smarty_tpl->tpl_vars['FOR_CAMPAIGN']->value)) {?><input type="hidden" name="cid" value="<?php echo $_smarty_tpl->tpl_vars['FOR_CAMPAIGN']->value;?>
"><?php }?><input type="hidden" name="prefsNeedToUpdate" id="prefsNeedToUpdate" value="<?php echo $_smarty_tpl->tpl_vars['PREF_NEED_TO_UPDATE']->value;?>
"><div id='multiEmailContainer'><?php $_smarty_tpl->_assignInScope('IS_INPUT_SELECTED_DEFINED', '0');?><div class="modal-body tabbable"><div class="row"><h5><?php echo vtranslate('LBL_TO','EMAILMaker');?>
:</h5></div><div class="row"><div class="emailToFields"><input type="hidden" class="emailFields" value="<?php echo $_smarty_tpl->tpl_vars['EMAIL_FIELDS_COUNT']->value;?>
"><select id="emailField" name="toEmail" type="text" class="form-control emailFieldSelects" multiple><?php $_smarty_tpl->_subTemplateRender(call_user_func_array($_smarty_tpl->registered_plugins[ 'modifier' ][ 'vtemplate_path' ][ 0 ], array( "SelectEmailFieldOptions.tpl",$_smarty_tpl->tpl_vars['MODULE']->value )), $_smarty_tpl->cache_id, $_smarty_tpl->compile_id, 0, $_smarty_tpl->cache_lifetime, array('IS_INPUT_SELECTED_ALLOWED'=>true), 0, true);
?></select></div></div><div class="ccContent hide"><div class="row"><h5><?php echo vtranslate('LBL_CC','EMAILMaker');?>
:</h5></div><div class="row"><div class="emailToFields"><select id="emailccField" name="toEmailCC" type="text" class="form-control emailFieldSelects" multiple><?php $_smarty_tpl->_subTemplateRender(call_user_func_array($_smarty_tpl->registered_plugins[ 'modifier' ][ 'vtemplate_path' ][ 0 ], array( "SelectEmailFieldOptions.tpl",$_smarty_tpl->tpl_vars['MODULE']->value )), $_smarty_tpl->cache_id, $_smarty_tpl->compile_id, 0, $_smarty_tpl->cache_lifetime, array(), 0, true);
?></select></div></div></div><div class="bccContent hide"><div class="row"><h5><?php echo vtranslate('LBL_BCC','EMAILMaker');?>
:</h5></div><div class="row"><div class="emailToFields"><select id="emailbccField" name="toEmailBCC" type="text" class="form-control emailFieldSelects" multiple><?php $_smarty_tpl->_subTemplateRender(call_user_func_array($_smarty_tpl->registered_plugins[ 'modifier' ][ 'vtemplate_path' ][ 0 ], array( "SelectEmailFieldOptions.tpl",$_smarty_tpl->tpl_vars['MODULE']->value )), $_smarty_tpl->cache_id, $_smarty_tpl->compile_id, 0, $_smarty_tpl->cache_lifetime, array(), 0, true);
?></select></div></div></div><div class="row"><div class="col-lg-12"><span id="ccLinkContent"><a href="#" class="cursorPointer" id="ccLink"><?php echo vtranslate('LBL_ADD_CC','Email');?>
</a>&nbsp;&nbsp;</span><span id="bccLinkContent"><a href="#" class="cursorPointer" id="bccLink"><?php echo vtranslate('LBL_ADD_BCC','Email');?>
</a></span></div></div><br/><?php if ($_smarty_tpl->tpl_vars['CRM_TEMPLATES_EXIST']->value == '0') {?><div class="row"><h5><?php echo vtranslate('LBL_SELECT_EMAIL_TEMPLATE','EMAILMaker');?>
:</h5></div><div class="row"><select id="use_common_email_template" name="email_template_ids" class="form-control"><option value=""><?php echo vtranslate('LBL_NONE','EMAILMaker');?>
</option><?php
$_from = $_smarty_tpl->smarty->ext->_foreach->init($_smarty_tpl, $_smarty_tpl->tpl_vars['CRM_TEMPLATES']->value["1"], 'options', false, 'category_name');
$_smarty_tpl->tpl_vars['options']->do_else = true;
if ($_from !== null) foreach ($_from as $_smarty_tpl->tpl_vars['category_name']->value => $_smarty_tpl->tpl_vars['options']->value) {
$_smarty_tpl->tpl_vars['options']->do_else = false;
?><optgroup label="<?php echo $_smarty_tpl->tpl_vars['category_name']->value;?>
"><?php
$_from = $_smarty_tpl->smarty->ext->_foreach->init($_smarty_tpl, $_smarty_tpl->tpl_vars['options']->value, 'option');
$_smarty_tpl->tpl_vars['option']->do_else = true;
if ($_from !== null) foreach ($_from as $_smarty_tpl->tpl_vars['option']->value) {
$_smarty_tpl->tpl_vars['option']->do_else = false;
?><option value="<?php echo $_smarty_tpl->tpl_vars['option']->value['value'];?>
" <?php if ($_smarty_tpl->tpl_vars['option']->value['title'] != '') {?>title="<?php echo $_smarty_tpl->tpl_vars['option']->value['title'];?>
"<?php }?> <?php if ($_smarty_tpl->tpl_vars['option']->value['value'] == $_smarty_tpl->tpl_vars['DEFAULT_TEMPLATE']->value) {?>selected<?php }?>><?php echo $_smarty_tpl->tpl_vars['option']->value['label'];?>
</option><?php
}
$_smarty_tpl->smarty->ext->_foreach->restore($_smarty_tpl, 1);?></optgroup><?php
}
$_smarty_tpl->smarty->ext->_foreach->restore($_smarty_tpl, 1);
$_from = $_smarty_tpl->smarty->ext->_foreach->init($_smarty_tpl, $_smarty_tpl->tpl_vars['CRM_TEMPLATES']->value["0"], 'option');
$_smarty_tpl->tpl_vars['option']->do_else = true;
if ($_from !== null) foreach ($_from as $_smarty_tpl->tpl_vars['option']->value) {
$_smarty_tpl->tpl_vars['option']->do_else = false;
?><option value="<?php echo $_smarty_tpl->tpl_vars['option']->value['value'];?>
" <?php if ($_smarty_tpl->tpl_vars['option']->value['title'] != '') {?>title="<?php echo $_smarty_tpl->tpl_vars['option']->value['title'];?>
"<?php }?> <?php if ($_smarty_tpl->tpl_vars['option']->value['value'] == $_smarty_tpl->tpl_vars['DEFAULT_TEMPLATE']->value) {?>selected<?php }?>><?php echo $_smarty_tpl->tpl_vars['option']->value['label'];?>
</option><?php
}
$_smarty_tpl->smarty->ext->_foreach->restore($_smarty_tpl, 1);?></select></div><?php }
if (sizeof($_smarty_tpl->tpl_vars['TEMPLATE_LANGUAGES']->value) > 1) {?><div class="row"><h5><?php echo vtranslate('LBL_LANGUAGE','EMAILMaker');?>
:</h5></div><div class="row"><select name="email_template_language" id="email_template_language" class="form-control"><?php echo smarty_function_html_options(array('options'=>$_smarty_tpl->tpl_vars['TEMPLATE_LANGUAGES']->value,'selected'=>$_smarty_tpl->tpl_vars['CURRENT_LANGUAGE']->value),$_smarty_tpl);?>
</select></div><?php } else {
$_from = $_smarty_tpl->smarty->ext->_foreach->init($_smarty_tpl, ((string)$_smarty_tpl->tpl_vars['TEMPLATE_LANGUAGES']->value), 'lang', false, 'lang_key');
$_smarty_tpl->tpl_vars['lang']->do_else = true;
if ($_from !== null) foreach ($_from as $_smarty_tpl->tpl_vars['lang_key']->value => $_smarty_tpl->tpl_vars['lang']->value) {
$_smarty_tpl->tpl_vars['lang']->do_else = false;
?><input type="hidden" name="email_template_language" id="email_template_language" value="<?php echo $_smarty_tpl->tpl_vars['lang_key']->value;?>
"/><?php
}
$_smarty_tpl->smarty->ext->_foreach->restore($_smarty_tpl, 1);
}
if ($_smarty_tpl->tpl_vars['IS_PDFMAKER']->value == 'yes') {?><br><div class="<?php if (empty($_smarty_tpl->tpl_vars['PDFTEMPLATEIDS']->value)) {?>hide<?php }?>" id="EMAILMakerPDFTemplatesContainer"><div class="row"><h5><?php echo vtranslate('LBL_SELECT_PDF_TEMPLATES','EMAILMaker');?>
:</h5></div><div class="row"><select id="use_common_pdf_template" multiple class="form-control"><?php
$_from = $_smarty_tpl->smarty->ext->_foreach->init($_smarty_tpl, $_smarty_tpl->tpl_vars['PDF_TEMPLATES']->value, 'PDF_TEMPLATE_DATA', false, 'PDF_TEMPLATE_ID');
$_smarty_tpl->tpl_vars['PDF_TEMPLATE_DATA']->do_else = true;
if ($_from !== null) foreach ($_from as $_smarty_tpl->tpl_vars['PDF_TEMPLATE_ID']->value => $_smarty_tpl->tpl_vars['PDF_TEMPLATE_DATA']->value) {
$_smarty_tpl->tpl_vars['PDF_TEMPLATE_DATA']->do_else = false;
$_smarty_tpl->_assignInScope('IS_PDF_TEMPLATE_SELECTED', !empty($_smarty_tpl->tpl_vars['PDFTEMPLATEIDS']->value) && call_user_func_array($_smarty_tpl->registered_plugins[ 'modifier' ][ 'in_array' ][ 0 ], array( $_smarty_tpl->tpl_vars['PDF_TEMPLATE_ID']->value,$_smarty_tpl->tpl_vars['PDFTEMPLATEIDS']->value )));?><option value="<?php echo $_smarty_tpl->tpl_vars['PDF_TEMPLATE_ID']->value;?>
" <?php if ($_smarty_tpl->tpl_vars['IS_PDF_TEMPLATE_SELECTED']->value) {?>selected="selected"<?php }?>><?php echo $_smarty_tpl->tpl_vars['PDF_TEMPLATE_DATA']->value['templatename'];?>
</option><?php
}
$_smarty_tpl->smarty->ext->_foreach->restore($_smarty_tpl, 1);?></select></div><div class="row"><h5><?php echo vtranslate('LBL_MERGE_PDF_TEMPLATES','EMAILMaker');?>
:</h5></div><div class="row"><input type="checkbox" value="1" name="is_merge_templates"></div><?php if ('Invoice' == $_smarty_tpl->tpl_vars['PARENT_MODULE']->value && EMAILMaker_Module_Model::isEInvoiceInstalled() && EMAILMaker_Module_Model::isSingleRecord($_smarty_tpl->tpl_vars['SELECTED_IDS']->value)) {?><div class="row"><h5><?php echo vtranslate('LBL_IMPORT_EINVOICE_XML','EMAILMaker');?>
:</h5></div><div class="row"><?php $_smarty_tpl->_assignInScope('VALIDATION_RESULT', EMAILMaker_Module_Model::validateEInvoices($_smarty_tpl->tpl_vars['SELECTED_IDS']->value));
if ($_smarty_tpl->tpl_vars['VALIDATION_RESULT']->value['success']) {?><input type="checkbox" value="1" name="is_electronic_invoice"><?php } else {
echo $_smarty_tpl->tpl_vars['VALIDATION_RESULT']->value['message'];
}?></div><?php }?><div class="row"><div class='pull-right paddingTop5'><button type="button" id='removePDFMakerTemplate' class='btn btn-danger' onClick='return false'><i class="fa fa-minus"></i> <?php echo vtranslate('LBL_REMOVE_PDFMAKER_TEMPLATES','EMAILMaker');?>
</button></div></div></div><div class="row"><span class="pull-right <?php if (!empty($_smarty_tpl->tpl_vars['PDFTEMPLATEIDS']->value)) {?>hide<?php }?>" id="EMAILMakerPDFTemplatesBtn"><button id="addPDFMakerTemplate" class="btn btn btn-primary" onClick="return false"><i class="fa fa-plus"></i> <?php echo vtranslate('LBL_ADD_PDFMAKER_TEMPLATES','EMAILMaker');?>
</button></span></div><?php }?></div></div></div><?php ob_start();
echo vtranslate('LBL_SELECT',$_smarty_tpl->tpl_vars['MODULE']->value);
$_prefixVariable2 = ob_get_clean();
$_smarty_tpl->_subTemplateRender(call_user_func_array($_smarty_tpl->registered_plugins[ 'modifier' ][ 'vtemplate_path' ][ 0 ], array( "ModalFooter.tpl",$_smarty_tpl->tpl_vars['MODULE']->value )), $_smarty_tpl->cache_id, $_smarty_tpl->compile_id, 0, $_smarty_tpl->cache_lifetime, array('BUTTON_NAME'=>$_prefixVariable2), 0, true);
?></div></form></div>


<?php }
}
