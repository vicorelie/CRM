<?php
/* Smarty version 4.5.5, created on 2025-12-21 08:44:29
  from '/var/www/CNK-DEM/layouts/v7/modules/Settings/ITS4YouInstaller/ExtensionModules.tpl' */

/* @var Smarty_Internal_Template $_smarty_tpl */
if ($_smarty_tpl->_decodeProperties($_smarty_tpl, array (
  'version' => '4.5.5',
  'unifunc' => 'content_6947b36dc64a75_96315615',
  'has_nocache_code' => false,
  'file_dependency' => 
  array (
    'd8aabeecbffe9ab94ce6a1e6e5fe9fb7033e8352' => 
    array (
      0 => '/var/www/CNK-DEM/layouts/v7/modules/Settings/ITS4YouInstaller/ExtensionModules.tpl',
      1 => 1766131695,
      2 => 'file',
    ),
  ),
  'includes' => 
  array (
  ),
),false)) {
function content_6947b36dc64a75_96315615 (Smarty_Internal_Template $_smarty_tpl) {
$_smarty_tpl->_assignInScope('IS_AUTH', ($_smarty_tpl->tpl_vars['REGISTRATION_STATUS']->value && $_smarty_tpl->tpl_vars['PASSWORD_STATUS']->value));?><div class="col-lg-12"><br><ul class="nav nav-tabs layoutTabs massEditTabs"><li class="tab-item taxesTab active"><a data-toggle="tab" href="#installedModules"><strong><?php echo vtranslate('LBL_INSTALLED_AND_AVAILABLE_MODULES',$_smarty_tpl->tpl_vars['QUALIFIED_MODULE']->value);?>
</strong></a></li><?php if (!$_smarty_tpl->tpl_vars['IS_HOSTING_LICENSE']->value) {?><li class="tab-item chargesTab"><a data-toggle="tab" href="#modulesShop"><strong><?php echo vtranslate('LBL_MODULES_SHOP',$_smarty_tpl->tpl_vars['QUALIFIED_MODULE']->value);?>
</strong></a></li><?php }?></ul><br></div><div class="tab-content layoutContent overflowVisible" style="height:100%"><?php $_smarty_tpl->_subTemplateRender(call_user_func_array($_smarty_tpl->registered_plugins[ 'modifier' ][ 'vtemplate_path' ][ 0 ], array( "InstalledModules.tpl",$_smarty_tpl->tpl_vars['QUALIFIED_MODULE']->value )), $_smarty_tpl->cache_id, $_smarty_tpl->compile_id, 0, $_smarty_tpl->cache_lifetime, array(), 0, true);
if (!$_smarty_tpl->tpl_vars['IS_HOSTING_LICENSE']->value) {
$_smarty_tpl->_subTemplateRender(call_user_func_array($_smarty_tpl->registered_plugins[ 'modifier' ][ 'vtemplate_path' ][ 0 ], array( "ModulesShop.tpl",$_smarty_tpl->tpl_vars['QUALIFIED_MODULE']->value )), $_smarty_tpl->cache_id, $_smarty_tpl->compile_id, 0, $_smarty_tpl->cache_lifetime, array(), 0, true);
}?></div><?php }
}
