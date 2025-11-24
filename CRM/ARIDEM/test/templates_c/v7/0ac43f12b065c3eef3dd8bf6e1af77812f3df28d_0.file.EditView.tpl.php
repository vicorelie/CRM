<?php
/* Smarty version 4.5.5, created on 2025-11-23 19:27:05
  from '/var/www/CRM/ARIDEM/layouts/v7/modules/Settings/Picklist/EditView.tpl' */

/* @var Smarty_Internal_Template $_smarty_tpl */
if ($_smarty_tpl->_decodeProperties($_smarty_tpl, array (
  'version' => '4.5.5',
  'unifunc' => 'content_692360098e6f99_07794392',
  'has_nocache_code' => false,
  'file_dependency' => 
  array (
    '0ac43f12b065c3eef3dd8bf6e1af77812f3df28d' => 
    array (
      0 => '/var/www/CRM/ARIDEM/layouts/v7/modules/Settings/Picklist/EditView.tpl',
      1 => 1752055882,
      2 => 'file',
    ),
  ),
  'includes' => 
  array (
  ),
),false)) {
function content_692360098e6f99_07794392 (Smarty_Internal_Template $_smarty_tpl) {
?>
<div class="modal-dialog"><div class='modal-content'><?php ob_start();
echo vtranslate('LBL_EDIT_PICKLIST_ITEM',$_smarty_tpl->tpl_vars['QUALIFIED_MODULE']->value);
$_prefixVariable1 = ob_get_clean();
$_smarty_tpl->_assignInScope('HEADER_TITLE', $_prefixVariable1);
$_smarty_tpl->_subTemplateRender(call_user_func_array($_smarty_tpl->registered_plugins[ 'modifier' ][ 'vtemplate_path' ][ 0 ], array( "ModalHeader.tpl",$_smarty_tpl->tpl_vars['MODULE']->value )), $_smarty_tpl->cache_id, $_smarty_tpl->compile_id, 0, $_smarty_tpl->cache_lifetime, array('TITLE'=>$_smarty_tpl->tpl_vars['HEADER_TITLE']->value), 0, true);
?><form id="renameItemForm" class="form-horizontal" method="post" action="index.php"><input type="hidden" name="module" value="<?php echo $_smarty_tpl->tpl_vars['MODULE']->value;?>
" /><input type="hidden" name="parent" value="Settings" /><input type="hidden" name="source_module" value="<?php echo $_smarty_tpl->tpl_vars['SOURCE_MODULE']->value;?>
" /><input type="hidden" name="action" value="SaveAjax" /><input type="hidden" name="mode" value="edit" /><input type="hidden" name="picklistName" value="<?php echo $_smarty_tpl->tpl_vars['FIELD_MODEL']->value->get('name');?>
" /><input type="hidden" name="pickListValues" value='<?php echo Vtiger_Util_Helper::toSafeHTML(ZEND_JSON::encode($_smarty_tpl->tpl_vars['SELECTED_PICKLISTFIELD_EDITABLE_VALUES']->value));?>
' /><input type="hidden" name="picklistColorMap" value='<?php echo Vtiger_Util_Helper::toSafeHTML(ZEND_JSON::encode(Settings_Picklist_Module_Model::getPicklistColorMap($_smarty_tpl->tpl_vars['FIELD_MODEL']->value->get('name'))));?>
' /><div class="modal-body tabbable"><div class="form-group"><div class="control-label col-sm-3 col-xs-3"><?php echo vtranslate('LBL_ITEM_TO_RENAME',$_smarty_tpl->tpl_vars['QUALIFIED_MODULE']->value);?>
</div><div class="controls col-sm-4 col-xs-4"><?php $_smarty_tpl->_assignInScope('PICKLIST_VALUES', $_smarty_tpl->tpl_vars['SELECTED_PICKLISTFIELD_EDITABLE_VALUES']->value);?><select class="select2 form-control" name="oldValue"><?php
$_from = $_smarty_tpl->smarty->ext->_foreach->init($_smarty_tpl, $_smarty_tpl->tpl_vars['PICKLIST_VALUES']->value, 'PICKLIST_VALUE', false, 'PICKLIST_VALUE_KEY');
$_smarty_tpl->tpl_vars['PICKLIST_VALUE']->do_else = true;
if ($_from !== null) foreach ($_from as $_smarty_tpl->tpl_vars['PICKLIST_VALUE_KEY']->value => $_smarty_tpl->tpl_vars['PICKLIST_VALUE']->value) {
$_smarty_tpl->tpl_vars['PICKLIST_VALUE']->do_else = false;
?><option <?php if ($_smarty_tpl->tpl_vars['FIELD_VALUE']->value == $_smarty_tpl->tpl_vars['PICKLIST_VALUE']->value) {?> selected="" <?php }?>value="<?php echo Vtiger_Util_Helper::toSafeHTML($_smarty_tpl->tpl_vars['PICKLIST_VALUE']->value);?>
" data-id=<?php echo $_smarty_tpl->tpl_vars['PICKLIST_VALUE_KEY']->value;?>
><?php echo vtranslate($_smarty_tpl->tpl_vars['PICKLIST_VALUE']->value,$_smarty_tpl->tpl_vars['SOURCE_MODULE']->value);?>
</option><?php
}
$_smarty_tpl->smarty->ext->_foreach->restore($_smarty_tpl, 1);
if ($_smarty_tpl->tpl_vars['SELECTED_PICKLISTFIELD_NON_EDITABLE_VALUES']->value) {
$_from = $_smarty_tpl->smarty->ext->_foreach->init($_smarty_tpl, $_smarty_tpl->tpl_vars['SELECTED_PICKLISTFIELD_NON_EDITABLE_VALUES']->value, 'NON_EDITABLE_VALUE', false, 'NON_EDITABLE_VALUE_KEY');
$_smarty_tpl->tpl_vars['NON_EDITABLE_VALUE']->do_else = true;
if ($_from !== null) foreach ($_from as $_smarty_tpl->tpl_vars['NON_EDITABLE_VALUE_KEY']->value => $_smarty_tpl->tpl_vars['NON_EDITABLE_VALUE']->value) {
$_smarty_tpl->tpl_vars['NON_EDITABLE_VALUE']->do_else = false;
?><option data-edit-disabled="true" <?php if ($_smarty_tpl->tpl_vars['FIELD_VALUE']->value == $_smarty_tpl->tpl_vars['NON_EDITABLE_VALUE']->value) {?> selected="" <?php }?>value="<?php echo Vtiger_Util_Helper::toSafeHTML($_smarty_tpl->tpl_vars['NON_EDITABLE_VALUE']->value);?>
" data-id=<?php echo $_smarty_tpl->tpl_vars['NON_EDITABLE_VALUE_KEY']->value;?>
><?php echo vtranslate($_smarty_tpl->tpl_vars['NON_EDITABLE_VALUE']->value,$_smarty_tpl->tpl_vars['SOURCE_MODULE']->value);?>
</option><?php
}
$_smarty_tpl->smarty->ext->_foreach->restore($_smarty_tpl, 1);
}?></select></div><br></div><div class="form-group"><div class="control-label col-sm-3 col-xs-3"><span class="redColor">*</span><?php echo vtranslate('LBL_ENTER_NEW_NAME',$_smarty_tpl->tpl_vars['QUALIFIED_MODULE']->value);?>
</div><div class="controls col-sm-4 col-xs-4"><input class="form-control" type="text" name="renamedValue" <?php if (in_array($_smarty_tpl->tpl_vars['FIELD_VALUE']->value,$_smarty_tpl->tpl_vars['SELECTED_PICKLISTFIELD_NON_EDITABLE_VALUES']->value)) {?> disabled='disabled' <?php }?> data-rule-required="true" value="<?php echo Vtiger_Util_Helper::toSafeHTML($_smarty_tpl->tpl_vars['FIELD_VALUE']->value);?>
"></div></div><div class="form-group"><div class="control-label col-sm-3 col-xs-3"><?php echo vtranslate('LBL_SELECT_COLOR',$_smarty_tpl->tpl_vars['QUALIFIED_MODULE']->value);?>
</div><div class="controls col-sm-3 col-xs-3"><input type="hidden" name="selectedColor" value="<?php echo Settings_Picklist_Module_Model::getPicklistColor($_smarty_tpl->tpl_vars['FIELD_MODEL']->value->get('name'),$_smarty_tpl->tpl_vars['FIELD_VALUE_ID']->value);?>
" /><div class="colorPicker"></div></div></div></div><?php ob_start();
echo (isset($_smarty_tpl->tpl_vars['qualifiedName']->value)) ? $_smarty_tpl->tpl_vars['qualifiedName']->value : '';
$_prefixVariable2 = ob_get_clean();
$_smarty_tpl->_subTemplateRender(call_user_func_array($_smarty_tpl->registered_plugins[ 'modifier' ][ 'vtemplate_path' ][ 0 ], array( 'ModalFooter.tpl',$_prefixVariable2 )), $_smarty_tpl->cache_id, $_smarty_tpl->compile_id, 0, $_smarty_tpl->cache_lifetime, array(), 0, true);
?></form></div></div>
<?php }
}
