<?php
/* Smarty version 4.5.5, created on 2025-12-21 06:40:58
  from '/var/www/CNK-DEM/layouts/v7/modules/EMAILMaker/tabs/Settings.tpl' */

/* @var Smarty_Internal_Template $_smarty_tpl */
if ($_smarty_tpl->_decodeProperties($_smarty_tpl, array (
  'version' => '4.5.5',
  'unifunc' => 'content_6947967af3ac94_88698331',
  'has_nocache_code' => false,
  'file_dependency' => 
  array (
    '8a39a1a671825fa257826c774f07ce029c894f4b' => 
    array (
      0 => '/var/www/CNK-DEM/layouts/v7/modules/EMAILMaker/tabs/Settings.tpl',
      1 => 1765888875,
      2 => 'file',
    ),
  ),
  'includes' => 
  array (
  ),
),false)) {
function content_6947967af3ac94_88698331 (Smarty_Internal_Template $_smarty_tpl) {
$_smarty_tpl->_checkPlugins(array(0=>array('file'=>'/var/www/CNK-DEM/vendor/smarty/smarty/libs/plugins/function.html_options.php','function'=>'smarty_function_html_options',),));
?>
<div class="tab-pane" id="editTabSettings"><br><div id="settings_div"><div class="form-group"><label class="control-label fieldLabel col-sm-3" style="font-weight: normal"><?php echo vtranslate('LBL_DESCRIPTION',$_smarty_tpl->tpl_vars['MODULE']->value);?>
:</label><div class="controls col-sm-9"><input name="description" type="text" value="<?php echo $_smarty_tpl->tpl_vars['EMAIL_TEMPLATE_RESULT']->value['description'];?>
" class="inputElement" tabindex="2"></div></div><?php if ($_smarty_tpl->tpl_vars['THEME_MODE']->value != "true") {?><div class="form-group"><label class="control-label fieldLabel col-sm-3" style="font-weight: normal"><?php echo vtranslate('Category');?>
:</label><div class="controls col-sm-9"><input type="text" name="email_category" value="<?php echo $_smarty_tpl->tpl_vars['EMAIL_CATEGORY']->value;?>
" class="inputElement"/></div></div><div class="form-group"><label class="control-label fieldLabel col-sm-3" style="font-weight: normal"><?php echo vtranslate('LBL_DEFAULT_FROM','EMAILMaker');?>
:</label><div class="controls col-sm-9"><select name="default_from_email" class="select2 form-control"><?php echo smarty_function_html_options(array('options'=>$_smarty_tpl->tpl_vars['DEFAULT_FROM_OPTIONS']->value,'selected'=>$_smarty_tpl->tpl_vars['SELECTED_DEFAULT_FROM']->value),$_smarty_tpl);?>
</select></div></div><div class="form-group"><label class="control-label fieldLabel col-sm-3" style="font-weight: normal"><?php echo vtranslate('LBL_IGNORE_PICKLIST_VALUES',$_smarty_tpl->tpl_vars['MODULE']->value);?>
:</label><div class="controls col-sm-9"><input type="text" name="ignore_picklist_values" value="<?php echo $_smarty_tpl->tpl_vars['IGNORE_PICKLIST_VALUES']->value;?>
" class="inputElement"/></div></div><div class="form-group"><label class="control-label fieldLabel col-sm-3" style="font-weight: normal"><?php echo vtranslate('LBL_STATUS',$_smarty_tpl->tpl_vars['MODULE']->value);?>
:</label><div class="controls col-sm-9"><select name="is_active" id="is_active" class="select2 form-control" onchange="EMAILMaker_EditJs.templateActiveChanged(this);"><?php echo smarty_function_html_options(array('options'=>$_smarty_tpl->tpl_vars['STATUS']->value,'selected'=>$_smarty_tpl->tpl_vars['IS_ACTIVE']->value),$_smarty_tpl);?>
</select></div></div><div class="form-group"><label class="control-label fieldLabel col-sm-3" style="font-weight: normal"><?php echo vtranslate('LBL_DECIMALS',$_smarty_tpl->tpl_vars['MODULE']->value);?>
:</label><div class="controls col-sm-9"><table class="table table-bordered"><tr><td align="right" nowrap><?php echo vtranslate('LBL_DEC_POINT',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</td><td><input type="text" maxlength="2" name="dec_point" class="inputElement" value="<?php echo $_smarty_tpl->tpl_vars['DECIMALS']->value['point'];?>
" style="width:<?php echo $_smarty_tpl->tpl_vars['margin_input_width']->value;?>
"/></td></tr><tr><td align="right" nowrap><?php echo vtranslate('LBL_DEC_DECIMALS',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</td><td><input type="text" maxlength="2" name="dec_decimals" class="inputElement" value="<?php echo $_smarty_tpl->tpl_vars['DECIMALS']->value['decimals'];?>
" style="width:<?php echo $_smarty_tpl->tpl_vars['margin_input_width']->value;?>
"/></td></tr><tr><td align="right" nowrap><?php echo vtranslate('LBL_DEC_THOUSANDS',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</td><td><input type="text" maxlength="2" name="dec_thousands" class="inputElement" value="<?php echo $_smarty_tpl->tpl_vars['DECIMALS']->value['thousands'];?>
" style="width:<?php echo $_smarty_tpl->tpl_vars['margin_input_width']->value;?>
"/></td></tr></table></div></div><div class="form-group"><label class="control-label fieldLabel col-sm-3" style="font-weight: normal"><?php echo vtranslate('LBL_SETASDEFAULT',$_smarty_tpl->tpl_vars['MODULE']->value);?>
:</label><div class="controls col-sm-9"><?php echo vtranslate('LBL_FOR_DV',$_smarty_tpl->tpl_vars['MODULE']->value);?>
&nbsp;&nbsp;<input type="checkbox" id="is_default_dv" name="is_default_dv" <?php echo $_smarty_tpl->tpl_vars['IS_DEFAULT_DV_CHECKED']->value;?>
/>&nbsp;&nbsp;<?php echo vtranslate('LBL_FOR_LV',$_smarty_tpl->tpl_vars['MODULE']->value);?>
&nbsp;&nbsp;<input type="checkbox" id="is_default_lv" name="is_default_lv" <?php echo $_smarty_tpl->tpl_vars['IS_DEFAULT_LV_CHECKED']->value;?>
/><input type="hidden" name="tmpl_order" value="<?php echo $_smarty_tpl->tpl_vars['ORDER']->value;?>
"/></div></div><div class="form-group"><label class="control-label fieldLabel col-sm-3" style="font-weight: normal"><?php echo vtranslate('LBL_LOAD_RELATED_DOCUMENTS',$_smarty_tpl->tpl_vars['MODULE']->value);?>
:</label><div class="controls col-sm-9"><input type="hidden" name="load_related_documents" value="0"/><input type="checkbox" id="load_related_documents" name="load_related_documents" <?php if ($_smarty_tpl->tpl_vars['LOAD_RELATED_DOCUMENTS']->value) {?>checked="checked"<?php }?>/></div></div><div class="form-group"><label class="control-label fieldLabel col-sm-3" style="font-weight: normal"><?php echo vtranslate('LBL_RELATED_DOCUMENTS_BY_FOLDER',$_smarty_tpl->tpl_vars['MODULE']->value);?>
:</label><div class="controls col-sm-9"><select name="folders_related_documents[]" id="folders_related_documents" class="select2 form-control inputElement" multiple="multiple"><?php
$_from = $_smarty_tpl->smarty->ext->_foreach->init($_smarty_tpl, $_smarty_tpl->tpl_vars['DOCUMENTS_FOLDERS']->value, 'DOCUMENT_FOLDER');
$_smarty_tpl->tpl_vars['DOCUMENT_FOLDER']->do_else = true;
if ($_from !== null) foreach ($_from as $_smarty_tpl->tpl_vars['DOCUMENT_FOLDER']->value) {
$_smarty_tpl->tpl_vars['DOCUMENT_FOLDER']->do_else = false;
?><option value="<?php echo $_smarty_tpl->tpl_vars['DOCUMENT_FOLDER']->value->getId();?>
" <?php if (in_array($_smarty_tpl->tpl_vars['DOCUMENT_FOLDER']->value->getId(),$_smarty_tpl->tpl_vars['RELATED_DOCUMENTS_FOLDERS']->value)) {?>selected="selected"<?php }?>><?php echo $_smarty_tpl->tpl_vars['DOCUMENT_FOLDER']->value->getName();?>
</option><?php
}
$_smarty_tpl->smarty->ext->_foreach->restore($_smarty_tpl, 1);?></select></div></div><div class="form-group"><label class="control-label fieldLabel col-sm-3" style="font-weight: normal"><?php echo vtranslate('LBL_RELATED_DOCUMENTS_BY_FIELD',$_smarty_tpl->tpl_vars['MODULE']->value);?>
:</label><div class="controls col-sm-9"><select name="fields_related_documents[]" id="fields_related_documents" class="select2 form-control inputElement" multiple="multiple"><?php
$_from = $_smarty_tpl->smarty->ext->_foreach->init($_smarty_tpl, $_smarty_tpl->tpl_vars['DOCUMENTS_FIELDS']->value, 'DOCUMENT_FIELD_LABEL', false, 'DOCUMENT_FIELD_NAME');
$_smarty_tpl->tpl_vars['DOCUMENT_FIELD_LABEL']->do_else = true;
if ($_from !== null) foreach ($_from as $_smarty_tpl->tpl_vars['DOCUMENT_FIELD_NAME']->value => $_smarty_tpl->tpl_vars['DOCUMENT_FIELD_LABEL']->value) {
$_smarty_tpl->tpl_vars['DOCUMENT_FIELD_LABEL']->do_else = false;
?><option value="<?php echo $_smarty_tpl->tpl_vars['DOCUMENT_FIELD_NAME']->value;?>
" <?php if (in_array($_smarty_tpl->tpl_vars['DOCUMENT_FIELD_NAME']->value,$_smarty_tpl->tpl_vars['RELATED_DOCUMENTS_FIELDS']->value)) {?>selected="selected"<?php }?>><?php echo $_smarty_tpl->tpl_vars['DOCUMENT_FIELD_LABEL']->value;?>
</option><?php
}
$_smarty_tpl->smarty->ext->_foreach->restore($_smarty_tpl, 1);
$_from = $_smarty_tpl->smarty->ext->_foreach->init($_smarty_tpl, $_smarty_tpl->tpl_vars['RELATED_MODULES']->value, 'RelMod');
$_smarty_tpl->tpl_vars['RelMod']->do_else = true;
if ($_from !== null) foreach ($_from as $_smarty_tpl->tpl_vars['RelMod']->value) {
$_smarty_tpl->tpl_vars['RelMod']->do_else = false;
$_smarty_tpl->_assignInScope('RELATED_DOCUMENTS_FIELD', implode('|',array($_smarty_tpl->tpl_vars['RelMod']->value[3],$_smarty_tpl->tpl_vars['RelMod']->value[0])));?><option value="<?php echo $_smarty_tpl->tpl_vars['RELATED_DOCUMENTS_FIELD']->value;?>
" <?php if (in_array($_smarty_tpl->tpl_vars['RELATED_DOCUMENTS_FIELD']->value,$_smarty_tpl->tpl_vars['RELATED_DOCUMENTS_FIELDS']->value)) {?>selected="selected"<?php }?> data-module="<?php echo $_smarty_tpl->tpl_vars['RelMod']->value[3];?>
"><?php echo $_smarty_tpl->tpl_vars['RelMod']->value[1];?>
 (<?php echo $_smarty_tpl->tpl_vars['RelMod']->value[2];?>
)</option><?php
}
$_smarty_tpl->smarty->ext->_foreach->restore($_smarty_tpl, 1);?></select></div></div><?php }?></div></div><?php }
}
