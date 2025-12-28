<?php
/* Smarty version 4.5.5, created on 2025-12-28 16:20:23
  from '/var/www/CNK-DEM/layouts/v7/modules/PDFMaker/ModalPDFTemplatesSelectContent.tpl' */

/* @var Smarty_Internal_Template $_smarty_tpl */
if ($_smarty_tpl->_decodeProperties($_smarty_tpl, array (
  'version' => '4.5.5',
  'unifunc' => 'content_695158c7b347b0_31978274',
  'has_nocache_code' => false,
  'file_dependency' => 
  array (
    '23ee44dab22638e792e28c673e993d26aea739b4' => 
    array (
      0 => '/var/www/CNK-DEM/layouts/v7/modules/PDFMaker/ModalPDFTemplatesSelectContent.tpl',
      1 => 1766693999,
      2 => 'file',
    ),
  ),
  'includes' => 
  array (
  ),
),false)) {
function content_695158c7b347b0_31978274 (Smarty_Internal_Template $_smarty_tpl) {
$_smarty_tpl->_checkPlugins(array(0=>array('file'=>'/var/www/CNK-DEM/vendor/smarty/smarty/libs/plugins/function.html_options.php','function'=>'smarty_function_html_options',),));
?>
<div class="PDFMakerContainer modal-dialog modelContainer"><div class="modal-content" style="width:675px;"><?php ob_start();
echo vtranslate('LBL_PDF_ACTIONS',$_smarty_tpl->tpl_vars['MODULE']->value);
$_prefixVariable1 = ob_get_clean();
$_smarty_tpl->_assignInScope('HEADER_TITLE', $_prefixVariable1);
$_smarty_tpl->_subTemplateRender(call_user_func_array($_smarty_tpl->registered_plugins[ 'modifier' ][ 'vtemplate_path' ][ 0 ], array( "ModalHeader.tpl",$_smarty_tpl->tpl_vars['MODULE']->value )), $_smarty_tpl->cache_id, $_smarty_tpl->compile_id, 0, $_smarty_tpl->cache_lifetime, array('TITLE'=>$_smarty_tpl->tpl_vars['HEADER_TITLE']->value), 0, true);
?><div class="modal-body"><div class="container-fluid"><div><form class="form-horizontal contentsBackground" id="exportSelectDFMakerForm" method="post" action="index.php<?php if ($_smarty_tpl->tpl_vars['ATTR_PATH']->value != '') {?>?<?php echo $_smarty_tpl->tpl_vars['ATTR_PATH']->value;
}?>" novalidate="novalidate"><input type="hidden" name="module" value="PDFMaker" /><input type="hidden" name="source_module" value="<?php echo $_smarty_tpl->tpl_vars['SOURCE_MODULE']->value;?>
" /><input type="hidden" name="relmodule" value="<?php echo $_smarty_tpl->tpl_vars['SOURCE_MODULE']->value;?>
" /><input type="hidden" name="action" value="CreatePDFFromTemplate" /><input type="hidden" name="idslist" value="<?php echo $_smarty_tpl->tpl_vars['idslist']->value;?>
"><input type="hidden" name="commontemplateid" value=""><input type="hidden" name="language" value=""><?php
$_from = $_smarty_tpl->smarty->ext->_foreach->init($_smarty_tpl, $_smarty_tpl->tpl_vars['ATTRIBUTES']->value, 'ATTR_VAL', false, 'ATTR_NAME');
$_smarty_tpl->tpl_vars['ATTR_VAL']->do_else = true;
if ($_from !== null) foreach ($_from as $_smarty_tpl->tpl_vars['ATTR_NAME']->value => $_smarty_tpl->tpl_vars['ATTR_VAL']->value) {
$_smarty_tpl->tpl_vars['ATTR_VAL']->do_else = false;
?><input type="hidden" name="<?php echo $_smarty_tpl->tpl_vars['ATTR_NAME']->value;?>
" value="<?php echo $_smarty_tpl->tpl_vars['ATTR_VAL']->value;?>
"/><?php
}
$_smarty_tpl->smarty->ext->_foreach->restore($_smarty_tpl, 1);?><div class="modal-body tabbable"><div class="row"><h5><?php echo vtranslate('LBL_PDF_TEMPLATE',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</h5></div><div class="row"><select class="form-control" data-rule-required="true" name="use_common_template" id="use_common_template" multiple><?php
$_from = $_smarty_tpl->smarty->ext->_foreach->init($_smarty_tpl, $_smarty_tpl->tpl_vars['CRM_TEMPLATES']->value, 'templateInfo', false, 'templateid');
$_smarty_tpl->tpl_vars['templateInfo']->do_else = true;
if ($_from !== null) foreach ($_from as $_smarty_tpl->tpl_vars['templateid']->value => $_smarty_tpl->tpl_vars['templateInfo']->value) {
$_smarty_tpl->tpl_vars['templateInfo']->do_else = false;
?><option data-export_edit_disabled="<?php echo $_smarty_tpl->tpl_vars['templateInfo']->value['disable_export_edit'];?>
" value="<?php echo $_smarty_tpl->tpl_vars['templateid']->value;?>
" <?php if ($_smarty_tpl->tpl_vars['templateInfo']->value['title'] != '') {?>title="<?php echo $_smarty_tpl->tpl_vars['templateInfo']->value['title'];?>
"<?php }?> <?php if ($_smarty_tpl->tpl_vars['templateInfo']->value['is_default'] == '1' || $_smarty_tpl->tpl_vars['templateInfo']->value['is_default'] == '3') {?>selected="selected"<?php }?>><?php echo $_smarty_tpl->tpl_vars['templateInfo']->value['templatename'];?>
</option><?php
}
$_smarty_tpl->smarty->ext->_foreach->restore($_smarty_tpl, 1);?></select></div><?php if (sizeof($_smarty_tpl->tpl_vars['TEMPLATE_LANGUAGES']->value) > 1) {?><br><div class="row"><h5><?php echo vtranslate('LBL_PDF_LANGUAGE',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</h5></div><div class="row"><select name="template_language" id="template_language" class="col-lg-12"><?php echo smarty_function_html_options(array('options'=>$_smarty_tpl->tpl_vars['TEMPLATE_LANGUAGES']->value,'selected'=>$_smarty_tpl->tpl_vars['CURRENT_LANGUAGE']->value),$_smarty_tpl);?>
</select></div><?php } else {
$_from = $_smarty_tpl->smarty->ext->_foreach->init($_smarty_tpl, $_smarty_tpl->tpl_vars['TEMPLATE_LANGUAGES']->value, 'lang', false, 'lang_key');
$_smarty_tpl->tpl_vars['lang']->do_else = true;
if ($_from !== null) foreach ($_from as $_smarty_tpl->tpl_vars['lang_key']->value => $_smarty_tpl->tpl_vars['lang']->value) {
$_smarty_tpl->tpl_vars['lang']->do_else = false;
?><input type="hidden" name="template_language" id="template_language" value="<?php echo $_smarty_tpl->tpl_vars['lang_key']->value;?>
"/><?php
}
$_smarty_tpl->smarty->ext->_foreach->restore($_smarty_tpl, 1);
}?></div></form></div></div></div><div class="modal-footer"><center><button class="btn btn-success PDFMakerDownloadPDF" type="button" name="generateButton"><strong><?php echo vtranslate('LBL_DOWNLOAD_FILE',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</strong></button><?php if ($_smarty_tpl->tpl_vars['PDF_DOWNLOAD_ZIP']->value == "1") {?><button class="btn btn-success PDFMakerDownloadZIP" type="button" name="PDFMakerDownloadZIP"><strong><?php echo vtranslate('LBL_DOWNLOAD_ZIP',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</strong></button><?php }
if ($_smarty_tpl->tpl_vars['PDF_PREVIEW_ACTION']->value == "1") {?><button class="btn btn-success PDFModalPreview" type="button" name="PDFModalPreview"><strong><?php echo vtranslate('LBL_PREVIEW');?>
</strong></button><?php }
if ($_smarty_tpl->tpl_vars['SEND_EMAIL_PDF_ACTION']->value == "1") {?><button class="btn btn-success sendEmailWithPDF" data-sendtype="<?php echo $_smarty_tpl->tpl_vars['SEND_EMAIL_PDF_ACTION_TYPE']->value;?>
" type="button" name="sendEmailWithPDF"><strong><?php echo vtranslate('LBL_SEND_EMAIL');?>
</strong></button><?php }
if ($_smarty_tpl->tpl_vars['EDIT_AND_EXPORT_ACTION']->value == "1") {?><button class="btn btn-success editPDF" type="button" name="editPDF"><strong><?php echo vtranslate('LBL_EDIT');?>
</strong></button><?php }
if ($_smarty_tpl->tpl_vars['SAVE_AS_DOC_ACTION']->value == "1") {?><button class="btn btn-success savePDFToDoc" type="button" name="savePDFToDoc"><strong><?php echo vtranslate('LBL_SAVEASDOC',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</strong></button><?php }?><a href="#" class="cancelLink" type="reset" data-dismiss="modal"><?php echo vtranslate('LBL_CANCEL',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</a></center></div></div></div><?php }
}
