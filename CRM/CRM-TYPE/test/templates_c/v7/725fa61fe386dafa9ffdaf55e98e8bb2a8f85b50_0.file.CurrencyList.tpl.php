<?php
/* Smarty version 4.5.5, created on 2025-08-07 14:48:25
  from '/home/vicorelie/crm.tcerenov-design.com/layouts/v7/modules/Vtiger/uitypes/CurrencyList.tpl' */

/* @var Smarty_Internal_Template $_smarty_tpl */
if ($_smarty_tpl->_decodeProperties($_smarty_tpl, array (
  'version' => '4.5.5',
  'unifunc' => 'content_6894bcb9964659_65576499',
  'has_nocache_code' => false,
  'file_dependency' => 
  array (
    '725fa61fe386dafa9ffdaf55e98e8bb2a8f85b50' => 
    array (
      0 => '/home/vicorelie/crm.tcerenov-design.com/layouts/v7/modules/Vtiger/uitypes/CurrencyList.tpl',
      1 => 1752055882,
      2 => 'file',
    ),
  ),
  'includes' => 
  array (
  ),
),false)) {
function content_6894bcb9964659_65576499 (Smarty_Internal_Template $_smarty_tpl) {
$_smarty_tpl->_assignInScope('CURRENCY_LIST', $_smarty_tpl->tpl_vars['FIELD_MODEL']->value->getCurrencyList());?><select class="select2 inputElement" name="<?php echo $_smarty_tpl->tpl_vars['FIELD_MODEL']->value->getFieldName();?>
"><?php
$_from = $_smarty_tpl->smarty->ext->_foreach->init($_smarty_tpl, $_smarty_tpl->tpl_vars['CURRENCY_LIST']->value, 'CURRENCY_NAME', false, 'CURRENCY_ID');
$_smarty_tpl->tpl_vars['CURRENCY_NAME']->do_else = true;
if ($_from !== null) foreach ($_from as $_smarty_tpl->tpl_vars['CURRENCY_ID']->value => $_smarty_tpl->tpl_vars['CURRENCY_NAME']->value) {
$_smarty_tpl->tpl_vars['CURRENCY_NAME']->do_else = false;
?><option value="<?php echo $_smarty_tpl->tpl_vars['CURRENCY_ID']->value;?>
" data-picklistvalue= '<?php echo $_smarty_tpl->tpl_vars['CURRENCY_ID']->value;?>
' <?php if ($_smarty_tpl->tpl_vars['FIELD_MODEL']->value->get('fieldvalue') == $_smarty_tpl->tpl_vars['CURRENCY_ID']->value) {?> selected <?php }?>><?php echo vtranslate($_smarty_tpl->tpl_vars['CURRENCY_NAME']->value,$_smarty_tpl->tpl_vars['MODULE']->value);?>
</option><?php
}
$_smarty_tpl->smarty->ext->_foreach->restore($_smarty_tpl, 1);?></select><?php }
}
