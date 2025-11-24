<?php
/* Smarty version 4.5.5, created on 2025-11-20 20:44:16
  from '/var/www/CRM/ARIDEM/layouts/v7/modules/Vtiger/uitypes/SalutationDetailView.tpl' */

/* @var Smarty_Internal_Template $_smarty_tpl */
if ($_smarty_tpl->_decodeProperties($_smarty_tpl, array (
  'version' => '4.5.5',
  'unifunc' => 'content_691f7da04f8b12_60795938',
  'has_nocache_code' => false,
  'file_dependency' => 
  array (
    'cfd86dd7563c3d40b227b6e60f325af2579e355e' => 
    array (
      0 => '/var/www/CRM/ARIDEM/layouts/v7/modules/Vtiger/uitypes/SalutationDetailView.tpl',
      1 => 1752055882,
      2 => 'file',
    ),
  ),
  'includes' => 
  array (
  ),
),false)) {
function content_691f7da04f8b12_60795938 (Smarty_Internal_Template $_smarty_tpl) {
echo $_smarty_tpl->tpl_vars['RECORD']->value->getDisplayValue('salutationtype');?>


<?php echo $_smarty_tpl->tpl_vars['FIELD_MODEL']->value->getDisplayValue($_smarty_tpl->tpl_vars['FIELD_MODEL']->value->get('fieldvalue'),$_smarty_tpl->tpl_vars['RECORD']->value->getId(),$_smarty_tpl->tpl_vars['RECORD']->value);
}
}
