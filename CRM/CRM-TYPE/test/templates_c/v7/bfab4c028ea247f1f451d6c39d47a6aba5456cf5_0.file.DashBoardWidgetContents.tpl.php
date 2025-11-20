<?php
/* Smarty version 4.5.5, created on 2025-11-14 10:38:39
  from '/var/www/CRM/CRM-TYPE/layouts/v7/modules/Vtiger/dashboards/DashBoardWidgetContents.tpl' */

/* @var Smarty_Internal_Template $_smarty_tpl */
if ($_smarty_tpl->_decodeProperties($_smarty_tpl, array (
  'version' => '4.5.5',
  'unifunc' => 'content_691706af23fe51_92430457',
  'has_nocache_code' => false,
  'file_dependency' => 
  array (
    'bfab4c028ea247f1f451d6c39d47a6aba5456cf5' => 
    array (
      0 => '/var/www/CRM/CRM-TYPE/layouts/v7/modules/Vtiger/dashboards/DashBoardWidgetContents.tpl',
      1 => 1752055882,
      2 => 'file',
    ),
  ),
  'includes' => 
  array (
  ),
),false)) {
function content_691706af23fe51_92430457 (Smarty_Internal_Template $_smarty_tpl) {
if (php7_count($_smarty_tpl->tpl_vars['DATA']->value) > 0) {?><input class="widgetData" type=hidden value='<?php echo Vtiger_Util_Helper::toSafeHTML(ZEND_JSON::encode($_smarty_tpl->tpl_vars['DATA']->value));?>
' /><input class="yAxisFieldType" type="hidden" value="<?php if ((isset($_smarty_tpl->tpl_vars['YAXIS_FIELD_TYPE']->value))) {?>$YAXIS_FIELD_TYPE<?php }?>" /><div class="row" style="margin:0px 10px;"><div class="col-lg-11"><div class="widgetChartContainer" name='chartcontent' style="height:220px;min-width:300px; margin: 0 auto"></div><br></div><div class="col-lg-1"></div></div><?php } else { ?><span class="noDataMsg"><?php echo vtranslate('LBL_NO');?>
 <?php echo vtranslate($_smarty_tpl->tpl_vars['MODULE_NAME']->value,$_smarty_tpl->tpl_vars['MODULE_NAME']->value);?>
 <?php echo vtranslate('LBL_MATCHED_THIS_CRITERIA');?>
</span><?php }
}
}
