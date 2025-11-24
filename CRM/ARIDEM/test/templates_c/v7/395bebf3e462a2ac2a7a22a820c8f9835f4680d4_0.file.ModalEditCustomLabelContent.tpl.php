<?php
/* Smarty version 4.5.5, created on 2025-11-21 08:58:32
  from '/var/www/CRM/ARIDEM/layouts/v7/modules/EMAILMaker/ModalEditCustomLabelContent.tpl' */

/* @var Smarty_Internal_Template $_smarty_tpl */
if ($_smarty_tpl->_decodeProperties($_smarty_tpl, array (
  'version' => '4.5.5',
  'unifunc' => 'content_692029b87c4150_44342225',
  'has_nocache_code' => false,
  'file_dependency' => 
  array (
    '395bebf3e462a2ac2a7a22a820c8f9835f4680d4' => 
    array (
      0 => '/var/www/CRM/ARIDEM/layouts/v7/modules/EMAILMaker/ModalEditCustomLabelContent.tpl',
      1 => 1754574240,
      2 => 'file',
    ),
  ),
  'includes' => 
  array (
  ),
),false)) {
function content_692029b87c4150_44342225 (Smarty_Internal_Template $_smarty_tpl) {
?><div class="modal-dialog"><div class="modal-content CustomLabelModalContainer"><?php if ($_smarty_tpl->tpl_vars['LABELID']->value != '') {
$_smarty_tpl->_assignInScope('HEADER_TITLE', vtranslate('LBL_EDIT_CUSTOM_LABEL',$_smarty_tpl->tpl_vars['MODULE']->value));
} else {
$_smarty_tpl->_assignInScope('HEADER_TITLE', vtranslate('LBL_ADD_NEW_CUSTOM_LABEL',$_smarty_tpl->tpl_vars['MODULE']->value));
}
$_smarty_tpl->_subTemplateRender(call_user_func_array($_smarty_tpl->registered_plugins[ 'modifier' ][ 'vtemplate_path' ][ 0 ], array( "ModalHeader.tpl",$_smarty_tpl->tpl_vars['MODULE']->value )), $_smarty_tpl->cache_id, $_smarty_tpl->compile_id, 0, $_smarty_tpl->cache_lifetime, array('TITLE'=>((string)$_smarty_tpl->tpl_vars['HEADER_TITLE']->value)." (".((string)$_smarty_tpl->tpl_vars['CURR_LANG']->value['label']).")"), 0, true);
?><form id="editCustomLabel" class="form-horizontal contentsBackground"><input type="hidden" name="labelid" value="<?php echo $_smarty_tpl->tpl_vars['LABELID']->value;?>
"/><input type="hidden" name="langid" value="<?php echo $_smarty_tpl->tpl_vars['LANGID']->value;?>
"/><div class="modal-body"><table class="massEditTable table no-border"><tr><td class="fieldLabel col-lg-2"><label class="muted pull-right"><?php echo vtranslate('LBL_KEY',$_smarty_tpl->tpl_vars['MODULE']->value);?>
<span class="redColor">*</span></label></td><td class="fieldValue col-lg-4" colspan="3"><?php if ($_smarty_tpl->tpl_vars['LABELID']->value == '') {?><div class="input-group"><span class="input-group-addon">C_</span><input type="text" name="LblKey" class="inputElement" placeholder="<?php echo vtranslate('LBL_ENTER_KEY',$_smarty_tpl->tpl_vars['MODULE']->value);?>
" value="" data-rule-required="true"/></div><?php } else { ?>C_<?php echo $_smarty_tpl->tpl_vars['CUSTOM_LABEL_KEY']->value;
}?></td></tr><tr><td class="fieldLabel col-lg-2"><label class="muted pull-right"><?php echo vtranslate('LBL_VALUE',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</label></td><td class="fieldValue col-lg-4" colspan="3"><input type="text" name="LblVal" class="inputElement" placeholder="<?php echo vtranslate('LBL_ENTER_CUSTOM_LABEL_VALUE',$_smarty_tpl->tpl_vars['MODULE']->value);?>
" value="<?php echo $_smarty_tpl->tpl_vars['CUSTOM_LABEL_VALUE']->value;?>
"/></td></tr></table></div><?php if ($_smarty_tpl->tpl_vars['LABELID']->value == '') {?><input type="hidden" class="addCustomLabelView" value="true"/><?php }
$_smarty_tpl->_assignInScope('BUTTON_ID', "js-save-cl");
$_smarty_tpl->_subTemplateRender(call_user_func_array($_smarty_tpl->registered_plugins[ 'modifier' ][ 'vtemplate_path' ][ 0 ], array( 'ModalFooter.tpl','Vtiger' )), $_smarty_tpl->cache_id, $_smarty_tpl->compile_id, 0, $_smarty_tpl->cache_lifetime, array(), 0, true);
?></form></div></div><?php }
}
