<?php
/* Smarty version 4.5.5, created on 2026-01-19 18:05:49
  from '/var/www/CNK-DEM/layouts/v7/modules/ITS4YouKeyMetrics/dashboards/DashBoardKeyMetrics.tpl' */

/* @var Smarty_Internal_Template $_smarty_tpl */
if ($_smarty_tpl->_decodeProperties($_smarty_tpl, array (
  'version' => '4.5.5',
  'unifunc' => 'content_696e565d6eb097_57443743',
  'has_nocache_code' => false,
  'file_dependency' => 
  array (
    '2bf4e10e0ea3cbd4e399399bf3b082c0b9f5d742' => 
    array (
      0 => '/var/www/CNK-DEM/layouts/v7/modules/ITS4YouKeyMetrics/dashboards/DashBoardKeyMetrics.tpl',
      1 => 1768165494,
      2 => 'file',
    ),
  ),
  'includes' => 
  array (
  ),
),false)) {
function content_696e565d6eb097_57443743 (Smarty_Internal_Template $_smarty_tpl) {
if ($_smarty_tpl->tpl_vars['display_widget_header']->value == 'true') {?>
    <div class="dashboardWidgetHeader">
        <?php $_smarty_tpl->_subTemplateRender(call_user_func_array($_smarty_tpl->registered_plugins[ 'modifier' ][ 'vtemplate_path' ][ 0 ], array( "dashboards/KeyMetricsHeader.tpl",$_smarty_tpl->tpl_vars['MODULE_NAME']->value )), $_smarty_tpl->cache_id, $_smarty_tpl->compile_id, 0, $_smarty_tpl->cache_lifetime, array(), 0, true);
?>
    </div>
<?php }?>
<div class="" style="position: relative; overflow: hidden; width: auto; height: 90%;"><div class="dashboardWidgetContent" style="padding: 5px; overflow: hidden; width: auto; height: 100%; overflow: auto;"><?php if (!empty($_smarty_tpl->tpl_vars['DATA']->value)) {
$_from = $_smarty_tpl->smarty->ext->_foreach->init($_smarty_tpl, $_smarty_tpl->tpl_vars['DATA']->value, 'keyMetricsRow', false, 'dKey');
$_smarty_tpl->tpl_vars['keyMetricsRow']->do_else = true;
if ($_from !== null) foreach ($_from as $_smarty_tpl->tpl_vars['dKey']->value => $_smarty_tpl->tpl_vars['keyMetricsRow']->value) {
$_smarty_tpl->tpl_vars['keyMetricsRow']->do_else = false;
$_smarty_tpl->_assignInScope('RHEIGHT', $_smarty_tpl->tpl_vars['keyMetricsRow']->value['rheight']);?><div style="padding:5px;height:<?php echo $_smarty_tpl->tpl_vars['RHEIGHT']->value;?>
em;"><span class="pull-right"><?php echo $_smarty_tpl->tpl_vars['keyMetricsRow']->value['value'];?>
</span><a href="<?php echo $_smarty_tpl->tpl_vars['keyMetricsRow']->value['result_url'];?>
"><?php echo $_smarty_tpl->tpl_vars['keyMetricsRow']->value['name'];?>
</a></div><?php
}
$_smarty_tpl->smarty->ext->_foreach->restore($_smarty_tpl, 1);
} else {
echo vtranslate('LBL_NO_DATA_AVAILABLE',$_smarty_tpl->tpl_vars['MODULE']->value);
}?></div></div><div style="background: rgb(0, 0, 0) none repeat scroll 0% 0%; width: 7px; position: absolute; top: 0px; opacity: 0.4; display: none; border-radius: 7px; z-index: 99; right: 1px; height: 260px;" class="slimScrollBar ui-draggable"></div><div style="width: 7px; height: 100%; position: absolute; top: 0px; display: none; border-radius: 7px; background: rgb(51, 51, 51) none repeat scroll 0% 0%; opacity: 0.2; z-index: 90; right: 1px;" class="slimScrollRail"></div><div class="widgeticons dashBoardWidgetFooter"><div class="footerIcons pull-right"><?php $_smarty_tpl->_subTemplateRender(call_user_func_array($_smarty_tpl->registered_plugins[ 'modifier' ][ 'vtemplate_path' ][ 0 ], array( "dashboards/DashboardFooterIcons.tpl",$_smarty_tpl->tpl_vars['MODULE_NAME']->value )), $_smarty_tpl->cache_id, $_smarty_tpl->compile_id, 0, $_smarty_tpl->cache_lifetime, array(), 0, true);
?></div></div>
<?php }
}
