<?php
/* Smarty version 4.5.5, created on 2025-08-07 14:50:40
  from '/home/vicorelie/crm.tcerenov-design.com/layouts/v7/modules/Users/CalendarDetailViewHeader.tpl' */

/* @var Smarty_Internal_Template $_smarty_tpl */
if ($_smarty_tpl->_decodeProperties($_smarty_tpl, array (
  'version' => '4.5.5',
  'unifunc' => 'content_6894bd40c04843_80198159',
  'has_nocache_code' => false,
  'file_dependency' => 
  array (
    '1df87c6b1a6464e3e5388931e6b1457bb4038b21' => 
    array (
      0 => '/home/vicorelie/crm.tcerenov-design.com/layouts/v7/modules/Users/CalendarDetailViewHeader.tpl',
      1 => 1752055882,
      2 => 'file',
    ),
  ),
  'includes' => 
  array (
  ),
),false)) {
function content_6894bd40c04843_80198159 (Smarty_Internal_Template $_smarty_tpl) {
$_smarty_tpl->_assignInScope('MODULE_NAME', $_smarty_tpl->tpl_vars['MODULE_MODEL']->value->get('name'));?><input id="recordId" type="hidden" value="<?php echo $_smarty_tpl->tpl_vars['RECORD']->value->getId();?>
" /><div class="detailViewContainer"><div class="detailViewTitle" id="prefPageHeader"></div><div class="detailViewInfo userPreferences row-fluid"><div class="details col-xs-12"><?php }
}
