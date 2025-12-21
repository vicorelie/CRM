<?php
/* Smarty version 4.5.5, created on 2025-12-21 08:44:30
  from '/var/www/CNK-DEM/layouts/v7/modules/ITS4YouInstaller/Footer.tpl' */

/* @var Smarty_Internal_Template $_smarty_tpl */
if ($_smarty_tpl->_decodeProperties($_smarty_tpl, array (
  'version' => '4.5.5',
  'unifunc' => 'content_6947b36e25bbe8_73111198',
  'has_nocache_code' => false,
  'file_dependency' => 
  array (
    '06899c29ff2aead8bfb2e595cf347a5889a2c82e' => 
    array (
      0 => '/var/www/CNK-DEM/layouts/v7/modules/ITS4YouInstaller/Footer.tpl',
      1 => 1766131695,
      2 => 'file',
    ),
  ),
  'includes' => 
  array (
  ),
),false)) {
function content_6947b36e25bbe8_73111198 (Smarty_Internal_Template $_smarty_tpl) {
?>
<br><div class="small" style="color: rgb(153, 153, 153);text-align: center;"><?php echo vtranslate($_smarty_tpl->tpl_vars['MODULE']->value,$_smarty_tpl->tpl_vars['MODULE']->value);?>
 <?php echo ITS4YouInstaller_Version_Helper::$version;?>
 <?php echo vtranslate("COPYRIGHT",$_smarty_tpl->tpl_vars['QUALIFIED_MODULE']->value);?>
</div><?php $_smarty_tpl->_subTemplateRender(call_user_func_array($_smarty_tpl->registered_plugins[ 'modifier' ][ 'vtemplate_path' ][ 0 ], array( "Footer.tpl",'Vtiger' )), $_smarty_tpl->cache_id, $_smarty_tpl->compile_id, 0, $_smarty_tpl->cache_lifetime, array(), 0, true);
}
}
