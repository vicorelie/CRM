<?php
/* Smarty version 4.5.5, created on 2025-11-20 20:52:10
  from '/var/www/CRM/ARIDEM/layouts/v7/modules/Settings/Picklist/DeleteView.tpl' */

/* @var Smarty_Internal_Template $_smarty_tpl */
if ($_smarty_tpl->_decodeProperties($_smarty_tpl, array (
  'version' => '4.5.5',
  'unifunc' => 'content_691f7f7a342632_23969156',
  'has_nocache_code' => false,
  'file_dependency' => 
  array (
    '8e02d1f8ae008ed46beb98adcd44edd331fdeda1' => 
    array (
      0 => '/var/www/CRM/ARIDEM/layouts/v7/modules/Settings/Picklist/DeleteView.tpl',
      1 => 1752055882,
      2 => 'file',
    ),
  ),
  'includes' => 
  array (
  ),
),false)) {
function content_691f7f7a342632_23969156 (Smarty_Internal_Template $_smarty_tpl) {
?>
<div class="modal-dialog"><div class='modal-content'><?php ob_start();
echo vtranslate('LBL_DELETE_PICKLIST_ITEMS',$_smarty_tpl->tpl_vars['QUALIFIED_MODULE']->value);
$_prefixVariable1 = ob_get_clean();
$_smarty_tpl->_assignInScope('HEADER_TITLE', $_prefixVariable1);
$_smarty_tpl->_subTemplateRender(call_user_func_array($_smarty_tpl->registered_plugins[ 'modifier' ][ 'vtemplate_path' ][ 0 ], array( "ModalHeader.tpl",$_smarty_tpl->tpl_vars['MODULE']->value )), $_smarty_tpl->cache_id, $_smarty_tpl->compile_id, 0, $_smarty_tpl->cache_lifetime, array('TITLE'=>$_smarty_tpl->tpl_vars['HEADER_TITLE']->value), 0, true);
?><form id="deleteItemForm" class="form-horizontal" method="post" action="index.php"><input type="hidden" name="module" value="<?php echo $_smarty_tpl->tpl_vars['MODULE']->value;?>
" /><input type="hidden" name="parent" value="Settings" /><input type="hidden" name="source_module" value="<?php echo $_smarty_tpl->tpl_vars['SOURCE_MODULE']->value;?>
" /><input type="hidden" name="action" value="SaveAjax" /><input type="hidden" name="mode" value="remove" /><input type="hidden" name="picklistName" value="<?php echo $_smarty_tpl->tpl_vars['FIELD_MODEL']->value->get('name');?>
" /><div class="modal-body tabbable"><div class="form-group"><div class="control-label col-sm-3 col-xs-3"><?php echo vtranslate('LBL_ITEMS_TO_DELETE',$_smarty_tpl->tpl_vars['QUALIFIED_MODULE']->value);?>
</div><div class="controls col-sm-4 col-xs-4"><select class="select2 form-control" multiple="" id="deleteValue" name="delete_value[]" ><?php
$_from = $_smarty_tpl->smarty->ext->_foreach->init($_smarty_tpl, $_smarty_tpl->tpl_vars['SELECTED_PICKLISTFIELD_EDITABLE_VALUES']->value, 'PICKLIST_VALUE', false, 'PICKLIST_VALUE_KEY');
$_smarty_tpl->tpl_vars['PICKLIST_VALUE']->do_else = true;
if ($_from !== null) foreach ($_from as $_smarty_tpl->tpl_vars['PICKLIST_VALUE_KEY']->value => $_smarty_tpl->tpl_vars['PICKLIST_VALUE']->value) {
$_smarty_tpl->tpl_vars['PICKLIST_VALUE']->do_else = false;
?><option <?php if (in_array($_smarty_tpl->tpl_vars['PICKLIST_VALUE']->value,$_smarty_tpl->tpl_vars['FIELD_VALUES']->value)) {?> selected="" <?php }?> value="<?php echo $_smarty_tpl->tpl_vars['PICKLIST_VALUE_KEY']->value;?>
"><?php echo vtranslate($_smarty_tpl->tpl_vars['PICKLIST_VALUE']->value,$_smarty_tpl->tpl_vars['SOURCE_MODULE']->value);?>
</option><?php
}
$_smarty_tpl->smarty->ext->_foreach->restore($_smarty_tpl, 1);?></select><input id="pickListValuesCount" type="hidden" value="<?php echo php7_count($_smarty_tpl->tpl_vars['SELECTED_PICKLISTFIELD_EDITABLE_VALUES']->value)+php7_count($_smarty_tpl->tpl_vars['SELECTED_PICKLISTFIELD_NON_EDITABLE_VALUES']->value);?>
"/></div></div><br><div class="form-group"><div class="control-label col-sm-3 col-xs-3"><?php echo vtranslate('LBL_REPLACE_IT_WITH',$_smarty_tpl->tpl_vars['QUALIFIED_MODULE']->value);?>
</div><div class="controls  col-sm-4 col-xs-4"><select id="replaceValue" name="replace_value" class="select2 form-control" data-validation-engine="validate[required]"><?php
$_from = $_smarty_tpl->smarty->ext->_foreach->init($_smarty_tpl, $_smarty_tpl->tpl_vars['SELECTED_PICKLISTFIELD_EDITABLE_VALUES']->value, 'PICKLIST_VALUE', false, 'PICKLIST_VALUE_KEY');
$_smarty_tpl->tpl_vars['PICKLIST_VALUE']->do_else = true;
if ($_from !== null) foreach ($_from as $_smarty_tpl->tpl_vars['PICKLIST_VALUE_KEY']->value => $_smarty_tpl->tpl_vars['PICKLIST_VALUE']->value) {
$_smarty_tpl->tpl_vars['PICKLIST_VALUE']->do_else = false;
if (!(in_array($_smarty_tpl->tpl_vars['PICKLIST_VALUE']->value,$_smarty_tpl->tpl_vars['FIELD_VALUES']->value))) {?><option value="<?php echo $_smarty_tpl->tpl_vars['PICKLIST_VALUE_KEY']->value;?>
"><?php echo vtranslate($_smarty_tpl->tpl_vars['PICKLIST_VALUE']->value,$_smarty_tpl->tpl_vars['SOURCE_MODULE']->value);?>
</option><?php }
}
$_smarty_tpl->smarty->ext->_foreach->restore($_smarty_tpl, 1);
$_from = $_smarty_tpl->smarty->ext->_foreach->init($_smarty_tpl, $_smarty_tpl->tpl_vars['SELECTED_PICKLISTFIELD_NON_EDITABLE_VALUES']->value, 'PICKLIST_VALUE', false, 'PICKLIST_VALUE_KEY');
$_smarty_tpl->tpl_vars['PICKLIST_VALUE']->do_else = true;
if ($_from !== null) foreach ($_from as $_smarty_tpl->tpl_vars['PICKLIST_VALUE_KEY']->value => $_smarty_tpl->tpl_vars['PICKLIST_VALUE']->value) {
$_smarty_tpl->tpl_vars['PICKLIST_VALUE']->do_else = false;
if (!(in_array($_smarty_tpl->tpl_vars['PICKLIST_VALUE']->value,$_smarty_tpl->tpl_vars['FIELD_VALUES']->value))) {?><option value="<?php echo $_smarty_tpl->tpl_vars['PICKLIST_VALUE_KEY']->value;?>
"><?php echo vtranslate($_smarty_tpl->tpl_vars['PICKLIST_VALUE']->value,$_smarty_tpl->tpl_vars['SOURCE_MODULE']->value);?>
</option><?php }
}
$_smarty_tpl->smarty->ext->_foreach->restore($_smarty_tpl, 1);?></select></div></div><?php if ($_smarty_tpl->tpl_vars['SELECTED_PICKLISTFIELD_NON_EDITABLE_VALUES']->value) {?><br><div class="form-group"><div class="control-label col-sm-3 col-xs-3"><?php echo vtranslate('LBL_NON_EDITABLE_PICKLIST_VALUES',$_smarty_tpl->tpl_vars['QUALIFIED_MODULE']->value);?>
</div><div class="controls col-sm-4 col-xs-4 nonEditableValuesDiv"><ul class="nonEditablePicklistValues" style="list-style-type: none;"><?php
$_from = $_smarty_tpl->smarty->ext->_foreach->init($_smarty_tpl, $_smarty_tpl->tpl_vars['SELECTED_PICKLISTFIELD_NON_EDITABLE_VALUES']->value, 'NON_EDITABLE_VALUE', false, 'NON_EDITABLE_VALUE_KEY');
$_smarty_tpl->tpl_vars['NON_EDITABLE_VALUE']->do_else = true;
if ($_from !== null) foreach ($_from as $_smarty_tpl->tpl_vars['NON_EDITABLE_VALUE_KEY']->value => $_smarty_tpl->tpl_vars['NON_EDITABLE_VALUE']->value) {
$_smarty_tpl->tpl_vars['NON_EDITABLE_VALUE']->do_else = false;
?><li><?php echo vtranslate($_smarty_tpl->tpl_vars['NON_EDITABLE_VALUE']->value,$_smarty_tpl->tpl_vars['SOURCE_MODULE']->value);?>
</li><?php
}
$_smarty_tpl->smarty->ext->_foreach->restore($_smarty_tpl, 1);?></ul></div></div><?php }?></div><div class="modal-footer"><center><button class="btn btn-danger" type="submit" name="saveButton"><strong><?php echo vtranslate('LBL_DELETE',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</strong></button><a href="#" class="cancelLink" type="reset" data-dismiss="modal"><?php echo vtranslate('LBL_CANCEL',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</a></center></div></form></div></div>
<?php }
}
