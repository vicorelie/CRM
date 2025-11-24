<?php
/* Smarty version 4.5.5, created on 2025-11-21 09:11:33
  from '/var/www/CRM/CRM-TYPE/layouts/v7/modules/EMAILMaker/tabs/Labels.tpl' */

/* @var Smarty_Internal_Template $_smarty_tpl */
if ($_smarty_tpl->_decodeProperties($_smarty_tpl, array (
  'version' => '4.5.5',
  'unifunc' => 'content_69202cc534c701_03379732',
  'has_nocache_code' => false,
  'file_dependency' => 
  array (
    '55b5cead8b8d88ca7ddda75a2a4d2b84a52b0dcb' => 
    array (
      0 => '/var/www/CRM/CRM-TYPE/layouts/v7/modules/EMAILMaker/tabs/Labels.tpl',
      1 => 1754577898,
      2 => 'file',
    ),
  ),
  'includes' => 
  array (
  ),
),false)) {
function content_69202cc534c701_03379732 (Smarty_Internal_Template $_smarty_tpl) {
$_smarty_tpl->_checkPlugins(array(0=>array('file'=>'/var/www/CRM/CRM-TYPE/vendor/smarty/smarty/libs/plugins/function.html_options.php','function'=>'smarty_function_html_options',),));
?>
<div class="tab-pane" id="pdfContentLabels"><div class="edit-template-content col-lg-4" style="position:fixed;z-index:1000;"><br><div id="labels_div"><div class="form-group"><label class="control-label fieldLabel col-sm-3" style="font-weight: normal"><?php echo vtranslate('LBL_GLOBAL_LANG',$_smarty_tpl->tpl_vars['MODULE']->value);?>
:</label><div class="controls col-sm-9"><div class="input-group"><select name="global_lang" id="global_lang" class="select2 form-control"><?php echo smarty_function_html_options(array('options'=>$_smarty_tpl->tpl_vars['GLOBAL_LANG_LABELS']->value),$_smarty_tpl);?>
</select><div class="input-group-btn"><button type="button" class="btn btn-warning InsertIntoTemplate" data-type="global_lang" title="<?php echo vtranslate('LBL_INSERT_TO_TEXT',$_smarty_tpl->tpl_vars['MODULE']->value);?>
"><i class="fa fa-text-width"></i></button></div></div></div></div><?php if ($_smarty_tpl->tpl_vars['THEME_MODE']->value != "true") {?><div class="form-group"><label class="control-label fieldLabel col-sm-3" style="font-weight: normal"><?php echo vtranslate('LBL_MODULE_LANG',$_smarty_tpl->tpl_vars['MODULE']->value);?>
:</label><div class="controls col-sm-9"><div class="input-group"><select name="module_lang" id="module_lang" class="select2 form-control"><?php echo smarty_function_html_options(array('options'=>$_smarty_tpl->tpl_vars['MODULE_LANG_LABELS']->value),$_smarty_tpl);?>
</select><div class="input-group-btn"><button type="button" class="btn btn-warning InsertIntoTemplate" data-type="module_lang" title="<?php echo vtranslate('LBL_INSERT_TO_TEXT',$_smarty_tpl->tpl_vars['MODULE']->value);?>
"><i class="fa fa-text-width"></i></button></div></div></div></div><?php }?><div class="form-group"><label class="control-label fieldLabel col-sm-3" style="font-weight: normal"><?php echo vtranslate('LBL_CUSTOM_LABELS',$_smarty_tpl->tpl_vars['MODULE']->value);?>
:</label><div class="controls col-sm-9"><div class="input-group"><select name="custom_lang" id="custom_lang" class="select2 form-control"><?php echo smarty_function_html_options(array('options'=>$_smarty_tpl->tpl_vars['CUSTOM_LANG_LABELS']->value),$_smarty_tpl);?>
</select><div class="input-group-btn"><button type="button" class="btn btn-warning InsertIntoTemplate" data-type="custom_lang" title="<?php echo vtranslate('LBL_INSERT_TO_TEXT',$_smarty_tpl->tpl_vars['MODULE']->value);?>
"><i class="fa fa-text-width"></i></button></div></div></div></div></div></div></div><?php }
}
