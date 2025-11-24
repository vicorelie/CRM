<?php
/* Smarty version 4.5.5, created on 2025-11-21 09:02:39
  from '/var/www/CRM/ARIDEM/layouts/v7/modules/Vtiger/uitypes/FileLocationType.tpl' */

/* @var Smarty_Internal_Template $_smarty_tpl */
if ($_smarty_tpl->_decodeProperties($_smarty_tpl, array (
  'version' => '4.5.5',
  'unifunc' => 'content_69202aafa07503_21503174',
  'has_nocache_code' => false,
  'file_dependency' => 
  array (
    '5b03824d4da14dfddc0aa5743b8373cfc32346ea' => 
    array (
      0 => '/var/www/CRM/ARIDEM/layouts/v7/modules/Vtiger/uitypes/FileLocationType.tpl',
      1 => 1752055882,
      2 => 'file',
    ),
  ),
  'includes' => 
  array (
  ),
),false)) {
function content_69202aafa07503_21503174 (Smarty_Internal_Template $_smarty_tpl) {
$_smarty_tpl->_assignInScope('FIELD_VALUES', $_smarty_tpl->tpl_vars['FIELD_MODEL']->value->getFileLocationType());?><select class="select2" name="<?php echo $_smarty_tpl->tpl_vars['FIELD_MODEL']->value->getFieldName();?>
" <?php if ((isset($_smarty_tpl->tpl_vars['FILE_LOCATION_TYPE']->value)) && ($_smarty_tpl->tpl_vars['FILE_LOCATION_TYPE']->value == 'I' || $_smarty_tpl->tpl_vars['FILE_LOCATION_TYPE']->value == 'E')) {?> disabled <?php }?>><?php
$_from = $_smarty_tpl->smarty->ext->_foreach->init($_smarty_tpl, $_smarty_tpl->tpl_vars['FIELD_VALUES']->value, 'TYPE', false, 'KEY');
$_smarty_tpl->tpl_vars['TYPE']->do_else = true;
if ($_from !== null) foreach ($_from as $_smarty_tpl->tpl_vars['KEY']->value => $_smarty_tpl->tpl_vars['TYPE']->value) {
$_smarty_tpl->tpl_vars['TYPE']->do_else = false;
if ((isset($_smarty_tpl->tpl_vars['FILE_LOCATION_TYPE']->value)) && $_smarty_tpl->tpl_vars['FILE_LOCATION_TYPE']->value == 'I') {
$_smarty_tpl->_assignInScope('SELECTED', 'I');
} elseif ((isset($_smarty_tpl->tpl_vars['FILE_LOCATION_TYPE']->value)) && $_smarty_tpl->tpl_vars['FILE_LOCATION_TYPE']->value == 'E') {
$_smarty_tpl->_assignInScope('SELECTED', 'E');
} else {
$_smarty_tpl->_assignInScope('SELECTED', $_smarty_tpl->tpl_vars['FIELD_MODEL']->value->get('fieldvalue'));
}?><option value="<?php echo $_smarty_tpl->tpl_vars['KEY']->value;?>
" <?php if ($_smarty_tpl->tpl_vars['SELECTED']->value == $_smarty_tpl->tpl_vars['KEY']->value) {?> selected <?php }?>><?php echo vtranslate($_smarty_tpl->tpl_vars['TYPE']->value,$_smarty_tpl->tpl_vars['MODULE']->value);?>
</option><?php
}
$_smarty_tpl->smarty->ext->_foreach->restore($_smarty_tpl, 1);?></select><?php }
}
