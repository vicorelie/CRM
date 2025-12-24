<?php
/* Smarty version 4.5.5, created on 2025-12-21 14:53:42
  from '/var/www/CNK-DEM/layouts/v7/modules/ITS4YouEmails/Footer.tpl' */

/* @var Smarty_Internal_Template $_smarty_tpl */
if ($_smarty_tpl->_decodeProperties($_smarty_tpl, array (
  'version' => '4.5.5',
  'unifunc' => 'content_694809f660f7f4_38296624',
  'has_nocache_code' => false,
  'file_dependency' => 
  array (
    'e07a89be6b3246f9f2c076663a94b60ad136f0b5' => 
    array (
      0 => '/var/www/CNK-DEM/layouts/v7/modules/ITS4YouEmails/Footer.tpl',
      1 => 1765893765,
      2 => 'file',
    ),
  ),
  'includes' => 
  array (
  ),
),false)) {
function content_694809f660f7f4_38296624 (Smarty_Internal_Template $_smarty_tpl) {
?>
<br><div class="small" style="color: rgb(153, 153, 153);text-align: center;"><?php echo vtranslate('ITS4YouEmails','ITS4YouEmails');?>
 <?php echo ITS4YouEmails_Version_Helper::$version;?>
 <?php echo vtranslate('COPYRIGHT','ITS4YouEmails');?>
</div><?php $_smarty_tpl->_subTemplateRender(call_user_func_array($_smarty_tpl->registered_plugins[ 'modifier' ][ 'vtemplate_path' ][ 0 ], array( "Footer.tpl",'Vtiger' )), $_smarty_tpl->cache_id, $_smarty_tpl->compile_id, 0, $_smarty_tpl->cache_lifetime, array(), 0, true);
}
}
