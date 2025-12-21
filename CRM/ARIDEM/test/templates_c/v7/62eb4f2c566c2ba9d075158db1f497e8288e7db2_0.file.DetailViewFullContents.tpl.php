<?php
/* Smarty version 4.5.5, created on 2025-12-06 20:28:36
  from '/var/www/CRM/ARIDEM/layouts/v7/modules/Vtiger/DetailViewFullContents.tpl' */

/* @var Smarty_Internal_Template $_smarty_tpl */
if ($_smarty_tpl->_decodeProperties($_smarty_tpl, array (
  'version' => '4.5.5',
  'unifunc' => 'content_693491f414fe28_80348149',
  'has_nocache_code' => false,
  'file_dependency' => 
  array (
    '62eb4f2c566c2ba9d075158db1f497e8288e7db2' => 
    array (
      0 => '/var/www/CRM/ARIDEM/layouts/v7/modules/Vtiger/DetailViewFullContents.tpl',
      1 => 1752052260,
      2 => 'file',
    ),
  ),
  'includes' => 
  array (
  ),
),false)) {
function content_693491f414fe28_80348149 (Smarty_Internal_Template $_smarty_tpl) {
?>
<form id="detailView" method="POST"><?php $_smarty_tpl->_subTemplateRender(call_user_func_array($_smarty_tpl->registered_plugins[ 'modifier' ][ 'vtemplate_path' ][ 0 ], array( 'DetailViewBlockView.tpl',$_smarty_tpl->tpl_vars['MODULE_NAME']->value )), $_smarty_tpl->cache_id, $_smarty_tpl->compile_id, 0, $_smarty_tpl->cache_lifetime, array('RECORD_STRUCTURE'=>$_smarty_tpl->tpl_vars['RECORD_STRUCTURE']->value,'MODULE_NAME'=>$_smarty_tpl->tpl_vars['MODULE_NAME']->value), 0, true);
?></form>
<?php }
}
