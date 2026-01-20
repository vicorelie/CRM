<?php
/* Smarty version 4.5.5, created on 2026-01-19 18:05:49
  from '/var/www/CNK-DEM/layouts/v7/modules/ITS4YouKeyMetrics/dashboards/DashboardFooterIcons.tpl' */

/* @var Smarty_Internal_Template $_smarty_tpl */
if ($_smarty_tpl->_decodeProperties($_smarty_tpl, array (
  'version' => '4.5.5',
  'unifunc' => 'content_696e565d6f2d54_62152179',
  'has_nocache_code' => false,
  'file_dependency' => 
  array (
    'ab7b4cdad49074b5b150ed606583194d8354fcf2' => 
    array (
      0 => '/var/www/CNK-DEM/layouts/v7/modules/ITS4YouKeyMetrics/dashboards/DashboardFooterIcons.tpl',
      1 => 1768165494,
      2 => 'file',
    ),
  ),
  'includes' => 
  array (
  ),
),false)) {
function content_696e565d6f2d54_62152179 (Smarty_Internal_Template $_smarty_tpl) {
if ($_smarty_tpl->tpl_vars['SETTING_EXIST']->value) {?>
<a name="dfilter">
	<i class='fa fa-cog' border='0' align="absmiddle" title="<?php echo vtranslate('LBL_FILTER');?>
" alt="<?php echo vtranslate('LBL_FILTER');?>
"/>
</a>
<?php }
if (!empty($_smarty_tpl->tpl_vars['CHART_TYPE']->value)) {?>
    <?php $_smarty_tpl->_assignInScope('CHART_DATA', ZEND_JSON::decode($_smarty_tpl->tpl_vars['DATA']->value));?>
    <?php $_smarty_tpl->_assignInScope('CHART_VALUES', $_smarty_tpl->tpl_vars['CHART_DATA']->value['values']);
}
if (!$_smarty_tpl->tpl_vars['WIDGET']->value->isDefault()) {?>
	<a name="dclose" class="widget" data-url="<?php echo $_smarty_tpl->tpl_vars['WIDGET']->value->getDeleteUrl();?>
">
		<i class="fa fa-remove" hspace="2" border="0" align="absmiddle" title="<?php echo vtranslate('LBL_REMOVE');?>
" alt="<?php echo vtranslate('LBL_REMOVE');?>
"></i>
	</a>
<?php }
}
}
