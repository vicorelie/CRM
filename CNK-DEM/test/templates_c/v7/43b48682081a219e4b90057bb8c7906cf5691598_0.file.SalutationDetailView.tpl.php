<?php
/* Smarty version 4.5.5, created on 2025-12-21 13:26:09
  from '/var/www/CNK-DEM/layouts/v7/modules/Vtiger/uitypes/SalutationDetailView.tpl' */

/* @var Smarty_Internal_Template $_smarty_tpl */
if ($_smarty_tpl->_decodeProperties($_smarty_tpl, array (
  'version' => '4.5.5',
  'unifunc' => 'content_6947f57154f1b6_53776545',
  'has_nocache_code' => false,
  'file_dependency' => 
  array (
    '43b48682081a219e4b90057bb8c7906cf5691598' => 
    array (
      0 => '/var/www/CNK-DEM/layouts/v7/modules/Vtiger/uitypes/SalutationDetailView.tpl',
      1 => 1765888875,
      2 => 'file',
    ),
  ),
  'includes' => 
  array (
  ),
),false)) {
function content_6947f57154f1b6_53776545 (Smarty_Internal_Template $_smarty_tpl) {
echo $_smarty_tpl->tpl_vars['RECORD']->value->getDisplayValue('salutationtype');?>


<?php echo $_smarty_tpl->tpl_vars['FIELD_MODEL']->value->getDisplayValue($_smarty_tpl->tpl_vars['FIELD_MODEL']->value->get('fieldvalue'),$_smarty_tpl->tpl_vars['RECORD']->value->getId(),$_smarty_tpl->tpl_vars['RECORD']->value);
}
}
