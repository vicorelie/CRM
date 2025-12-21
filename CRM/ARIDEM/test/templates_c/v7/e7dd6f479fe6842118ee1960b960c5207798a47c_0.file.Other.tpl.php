<?php
/* Smarty version 4.5.5, created on 2025-12-08 06:34:57
  from '/var/www/CRM/ARIDEM/layouts/v7/modules/EMAILMaker/tabs/Other.tpl' */

/* @var Smarty_Internal_Template $_smarty_tpl */
if ($_smarty_tpl->_decodeProperties($_smarty_tpl, array (
  'version' => '4.5.5',
  'unifunc' => 'content_69367191669564_01599103',
  'has_nocache_code' => false,
  'file_dependency' => 
  array (
    'e7dd6f479fe6842118ee1960b960c5207798a47c' => 
    array (
      0 => '/var/www/CRM/ARIDEM/layouts/v7/modules/EMAILMaker/tabs/Other.tpl',
      1 => 1763717833,
      2 => 'file',
    ),
  ),
  'includes' => 
  array (
  ),
),false)) {
function content_69367191669564_01599103 (Smarty_Internal_Template $_smarty_tpl) {
$_smarty_tpl->_checkPlugins(array(0=>array('file'=>'/var/www/CRM/ARIDEM/vendor/smarty/smarty/libs/plugins/function.html_options.php','function'=>'smarty_function_html_options',),));
?>
<div class="tab-pane" id="pdfContentOther"><div class="edit-template-content col-lg-4" style="position:fixed;z-index:1000;"><br/><div class="form-group" id="listview_block_tpl_row"><?php if ($_smarty_tpl->tpl_vars['THEME_MODE']->value != "true") {?><div class="form-group"><label class="control-label fieldLabel col-sm-3" style="font-weight: normal"><input type="checkbox" name="is_listview" id="isListViewTmpl" <?php if ($_smarty_tpl->tpl_vars['IS_LISTVIEW_CHECKED']->value == "yes") {?>checked="checked"<?php }?> onclick="EMAILMaker_EditJs.isLvTmplClicked();" title="<?php echo vtranslate('LBL_LISTVIEW_TEMPLATE',$_smarty_tpl->tpl_vars['MODULE']->value);?>
"/>&nbsp;<?php echo vtranslate('LBL_LISTVIEWBLOCK',$_smarty_tpl->tpl_vars['MODULE']->value);?>
:</label><div class="controls col-sm-9"><div class="input-group"><select name="listviewblocktpl" id="listviewblocktpl" class="select2 form-control" <?php if ($_smarty_tpl->tpl_vars['IS_LISTVIEW_CHECKED']->value != "yes") {?>disabled<?php }?>><?php echo smarty_function_html_options(array('options'=>$_smarty_tpl->tpl_vars['LISTVIEW_BLOCK_TPL']->value),$_smarty_tpl);?>
</select><div class="input-group-btn"><button type="button" id="listviewblocktpl_butt" class="btn btn-success InsertIntoTemplate" data-type="listviewblocktpl" title="<?php echo vtranslate('LBL_INSERT_VARIABLE_TO_TEXT',$_smarty_tpl->tpl_vars['MODULE']->value);?>
" <?php if ($_smarty_tpl->tpl_vars['IS_LISTVIEW_CHECKED']->value != "yes") {?>disabled<?php }?>><i class="fa fa-usd"></i></button></div></div></div></div><?php }?><div class="form-group"><label class="control-label fieldLabel col-sm-3" style="font-weight: normal"><?php echo vtranslate('TERMS_AND_CONDITIONS',$_smarty_tpl->tpl_vars['MODULE']->value);?>
:</label><div class="controls col-sm-9"><div class="input-group"><select name="invterandcon" id="invterandcon" class="select2 form-control"><?php echo smarty_function_html_options(array('options'=>$_smarty_tpl->tpl_vars['INVENTORYTERMSANDCONDITIONS']->value),$_smarty_tpl);?>
</select><div class="input-group-btn"><button type="button" class="btn btn-success InsertIntoTemplate" data-type="invterandcon" title="<?php echo vtranslate('LBL_INSERT_VARIABLE_TO_TEXT',$_smarty_tpl->tpl_vars['MODULE']->value);?>
"><i class="fa fa-usd"></i></button></div></div></div></div><div class="form-group"><label class="control-label fieldLabel col-sm-3" style="font-weight: normal"><?php echo vtranslate('LBL_CURRENT_DATE',$_smarty_tpl->tpl_vars['MODULE']->value);?>
:</label><div class="controls col-sm-9"><div class="input-group"><select name="dateval" id="dateval" class="select2 form-control"><?php echo smarty_function_html_options(array('options'=>$_smarty_tpl->tpl_vars['DATE_VARS']->value),$_smarty_tpl);?>
</select><div class="input-group-btn"><button type="button" class="btn btn-success InsertIntoTemplate" data-type="dateval" title="<?php echo vtranslate('LBL_INSERT_VARIABLE_TO_TEXT',$_smarty_tpl->tpl_vars['MODULE']->value);?>
"><i class="fa fa-usd"></i></button></div></div></div></div><div class="form-group"><label class="control-label fieldLabel col-sm-3" style="font-weight: normal"><?php echo vtranslate('LBL_GENERAL_FIELDS',$_smarty_tpl->tpl_vars['MODULE']->value);?>
:</label><div class="controls col-sm-9"><div class="input-group"><select name="general_fields" id="general_fields" class="select2 form-control"><?php echo smarty_function_html_options(array('options'=>$_smarty_tpl->tpl_vars['GENERAL_FIELDS']->value),$_smarty_tpl);?>
</select><div class="input-group-btn"><button type="button" class="btn btn-success InsertIntoTemplate" data-type="general_fields" title="<?php echo vtranslate('LBL_INSERT_VARIABLE_TO_TEXT',$_smarty_tpl->tpl_vars['MODULE']->value);?>
"><i class="fa fa-usd"></i></button></div></div></div></div><div class="form-group"><label class="control-label fieldLabel col-sm-3" style="font-weight: normal"><?php echo vtranslate('CUSTOM_FUNCTIONS',$_smarty_tpl->tpl_vars['MODULE']->value);?>
: <select name="custom_function_type" id="custom_function_type" class="select2"><option value="before"><?php echo vtranslate('LBL_BEFORE','EMAILMaker');?>
</option><option value="after"><?php echo vtranslate('LBL_AFTER','EMAILMaker');?>
</option></select></label><div class="controls col-sm-9"><div class="input-group"><select name="customfunction" id="customfunction" class="select2 form-control"><?php echo smarty_function_html_options(array('options'=>$_smarty_tpl->tpl_vars['CUSTOM_FUNCTIONS']->value),$_smarty_tpl);?>
</select><div class="input-group-btn"><button type="button" class="btn btn-success InsertIntoTemplate" data-type="customfunction" title="<?php echo vtranslate('LBL_INSERT_TO_TEXT',$_smarty_tpl->tpl_vars['MODULE']->value);?>
"><i class="fa fa-usd"></i></button></div></div></div></div><?php if (!empty($_smarty_tpl->tpl_vars['SIGNATURE_VARIABLES']->value)) {?><div class="form-group"><label class="control-label fieldLabel col-sm-3" style="font-weight: normal"><?php echo vtranslate('SIGNATURE_VARIABLES',$_smarty_tpl->tpl_vars['MODULE']->value);?>
:</label><div class="controls col-sm-9"><div class="input-group"><select name="customfunction" id="signature_variables" class="select2 form-control"><?php echo smarty_function_html_options(array('options'=>$_smarty_tpl->tpl_vars['SIGNATURE_VARIABLES']->value),$_smarty_tpl);?>
</select><div class="input-group-btn"><button type="button" class="btn btn-success InsertIntoTemplate" data-type="signature_variables" title="<?php echo vtranslate('LBL_INSERT_TO_TEXT',$_smarty_tpl->tpl_vars['MODULE']->value);?>
"><i class="fa fa-usd"></i></button></div></div></div></div><?php }?></div></div></div><?php }
}
