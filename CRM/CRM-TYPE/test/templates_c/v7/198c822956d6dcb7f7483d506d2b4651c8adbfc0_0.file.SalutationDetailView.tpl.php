<?php
/* Smarty version 4.5.5, created on 2025-11-14 10:39:40
  from '/var/www/CRM/CRM-TYPE/layouts/v7/modules/Vtiger/uitypes/SalutationDetailView.tpl' */

/* @var Smarty_Internal_Template $_smarty_tpl */
if ($_smarty_tpl->_decodeProperties($_smarty_tpl, array (
  'version' => '4.5.5',
  'unifunc' => 'content_691706ecf2adc3_03836499',
  'has_nocache_code' => false,
  'file_dependency' => 
  array (
    '198c822956d6dcb7f7483d506d2b4651c8adbfc0' => 
    array (
      0 => '/var/www/CRM/CRM-TYPE/layouts/v7/modules/Vtiger/uitypes/SalutationDetailView.tpl',
      1 => 1752055882,
      2 => 'file',
    ),
  ),
  'includes' => 
  array (
  ),
),false)) {
function content_691706ecf2adc3_03836499 (Smarty_Internal_Template $_smarty_tpl) {
echo $_smarty_tpl->tpl_vars['RECORD']->value->getDisplayValue('salutationtype');?>


<?php echo $_smarty_tpl->tpl_vars['FIELD_MODEL']->value->getDisplayValue($_smarty_tpl->tpl_vars['FIELD_MODEL']->value->get('fieldvalue'),$_smarty_tpl->tpl_vars['RECORD']->value->getId(),$_smarty_tpl->tpl_vars['RECORD']->value);
}
}
