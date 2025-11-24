<?php
/* Smarty version 4.5.5, created on 2025-11-21 09:08:16
  from '/var/www/CRM/CRM-TYPE/layouts/v7/modules/Settings/ITS4YouInstaller/partials/SidebarHeader.tpl' */

/* @var Smarty_Internal_Template $_smarty_tpl */
if ($_smarty_tpl->_decodeProperties($_smarty_tpl, array (
  'version' => '4.5.5',
  'unifunc' => 'content_69202c00a1ed28_87828036',
  'has_nocache_code' => false,
  'file_dependency' => 
  array (
    'f30638f6446f042413adf9a23347952f1ad8bae0' => 
    array (
      0 => '/var/www/CRM/CRM-TYPE/layouts/v7/modules/Settings/ITS4YouInstaller/partials/SidebarHeader.tpl',
      1 => 1754577749,
      2 => 'file',
    ),
  ),
  'includes' => 
  array (
    'file:modules/Vtiger/partials/SidebarAppMenu.tpl' => 1,
  ),
),false)) {
function content_69202c00a1ed28_87828036 (Smarty_Internal_Template $_smarty_tpl) {
$_smarty_tpl->_assignInScope('APP_IMAGE_MAP', array('MARKETING'=>'fa-users','SALES'=>'fa-dot-circle-o','SUPPORT'=>'fa-life-ring','INVENTORY'=>'vicon-inventory','PROJECT'=>'fa-briefcase','TOOLS'=>'fa-wrench'));?>

<div class="col-sm-12 col-xs-12 app-indicator-icon-container extensionstore app-MARKETING">
    <div class="row" title="<?php echo vtranslate('LBL_EXTENSION_STORE','Settings:$QUALIFIED_MODULE');?>
">
        <span class="app-indicator-icon cursorPointer fa fa-shopping-cart"></span>
    </div>
</div>

<?php $_smarty_tpl->_subTemplateRender("file:modules/Vtiger/partials/SidebarAppMenu.tpl", $_smarty_tpl->cache_id, $_smarty_tpl->compile_id, 0, $_smarty_tpl->cache_lifetime, array(), 0, false);
}
}
