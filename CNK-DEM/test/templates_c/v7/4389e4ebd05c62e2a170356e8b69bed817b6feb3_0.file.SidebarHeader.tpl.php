<?php
/* Smarty version 4.5.5, created on 2025-12-21 05:55:50
  from '/var/www/CNK-DEM/layouts/v7/modules/Settings/Vtiger/SidebarHeader.tpl' */

/* @var Smarty_Internal_Template $_smarty_tpl */
if ($_smarty_tpl->_decodeProperties($_smarty_tpl, array (
  'version' => '4.5.5',
  'unifunc' => 'content_69478be6e20d81_28203631',
  'has_nocache_code' => false,
  'file_dependency' => 
  array (
    '4389e4ebd05c62e2a170356e8b69bed817b6feb3' => 
    array (
      0 => '/var/www/CNK-DEM/layouts/v7/modules/Settings/Vtiger/SidebarHeader.tpl',
      1 => 1765888875,
      2 => 'file',
    ),
  ),
  'includes' => 
  array (
    'file:modules/Vtiger/partials/SidebarAppMenu.tpl' => 1,
  ),
),false)) {
function content_69478be6e20d81_28203631 (Smarty_Internal_Template $_smarty_tpl) {
$_smarty_tpl->_assignInScope('APP_IMAGE_MAP', Vtiger_MenuStructure_Model::getAppIcons());?>
<div class="col-sm-12 col-xs-12 app-indicator-icon-container app-<?php echo $_smarty_tpl->tpl_vars['SELECTED_MENU_CATEGORY']->value;?>
">
    <div class="row" title="<?php echo vtranslate("LBL_SETTINGS",$_smarty_tpl->tpl_vars['MODULE']->value);?>
">
        <span class="app-indicator-icon fa fa-cog"></span>
    </div>
</div>
    
<?php $_smarty_tpl->_subTemplateRender("file:modules/Vtiger/partials/SidebarAppMenu.tpl", $_smarty_tpl->cache_id, $_smarty_tpl->compile_id, 0, $_smarty_tpl->cache_lifetime, array(), 0, false);
}
}
