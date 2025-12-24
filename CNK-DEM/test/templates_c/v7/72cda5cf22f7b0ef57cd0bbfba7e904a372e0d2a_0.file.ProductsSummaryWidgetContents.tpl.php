<?php
/* Smarty version 4.5.5, created on 2025-12-23 20:58:58
  from '/var/www/CNK-DEM/layouts/v7/modules/Vtiger/ProductsSummaryWidgetContents.tpl' */

/* @var Smarty_Internal_Template $_smarty_tpl */
if ($_smarty_tpl->_decodeProperties($_smarty_tpl, array (
  'version' => '4.5.5',
  'unifunc' => 'content_694b029218be95_52620368',
  'has_nocache_code' => false,
  'file_dependency' => 
  array (
    '72cda5cf22f7b0ef57cd0bbfba7e904a372e0d2a' => 
    array (
      0 => '/var/www/CNK-DEM/layouts/v7/modules/Vtiger/ProductsSummaryWidgetContents.tpl',
      1 => 1765888875,
      2 => 'file',
    ),
  ),
  'includes' => 
  array (
  ),
),false)) {
function content_694b029218be95_52620368 (Smarty_Internal_Template $_smarty_tpl) {
?><div class="relatedProducts container-fluid"><?php
$_from = $_smarty_tpl->smarty->ext->_foreach->init($_smarty_tpl, $_smarty_tpl->tpl_vars['RELATED_HEADERS']->value, 'HEADER');
$_smarty_tpl->tpl_vars['HEADER']->do_else = true;
if ($_from !== null) foreach ($_from as $_smarty_tpl->tpl_vars['HEADER']->value) {
$_smarty_tpl->tpl_vars['HEADER']->do_else = false;
if ($_smarty_tpl->tpl_vars['HEADER']->value->get('label') == "Product Name") {
ob_start();
echo vtranslate($_smarty_tpl->tpl_vars['HEADER']->value->get('label'),$_smarty_tpl->tpl_vars['MODULE']->value);
$_prefixVariable1 = ob_get_clean();
$_smarty_tpl->_assignInScope('PRODUCT_NAME_HEADER', $_prefixVariable1);
} elseif ($_smarty_tpl->tpl_vars['HEADER']->value->get('label') == "Unit Price") {
ob_start();
echo vtranslate($_smarty_tpl->tpl_vars['HEADER']->value->get('label'),$_smarty_tpl->tpl_vars['MODULE']->value);
$_prefixVariable2 = ob_get_clean();
$_smarty_tpl->_assignInScope('PRODUCT_UNITPRICE_HEADER', $_prefixVariable2);
}
}
$_smarty_tpl->smarty->ext->_foreach->restore($_smarty_tpl, 1);?><div class="row"><span class="col-lg-7"><strong><?php echo $_smarty_tpl->tpl_vars['PRODUCT_NAME_HEADER']->value;?>
</strong></span><span class="col-lg-4"><span class="pull-right"><strong><?php echo $_smarty_tpl->tpl_vars['PRODUCT_UNITPRICE_HEADER']->value;?>
</strong></span></span></div><?php
$_from = $_smarty_tpl->smarty->ext->_foreach->init($_smarty_tpl, $_smarty_tpl->tpl_vars['RELATED_RECORDS']->value, 'RELATED_RECORD');
$_smarty_tpl->tpl_vars['RELATED_RECORD']->do_else = true;
if ($_from !== null) foreach ($_from as $_smarty_tpl->tpl_vars['RELATED_RECORD']->value) {
$_smarty_tpl->tpl_vars['RELATED_RECORD']->do_else = false;
?><div class="recentActivitiesContainer row"><ul class="unstyled"><li><div class=""><span class="col-lg-7 textOverflowEllipsis"><a href="<?php echo $_smarty_tpl->tpl_vars['RELATED_RECORD']->value->getDetailViewUrl();?>
" id="<?php echo $_smarty_tpl->tpl_vars['MODULE']->value;?>
_<?php echo $_smarty_tpl->tpl_vars['RELATED_MODULE']->value;?>
_Related_Record_<?php echo $_smarty_tpl->tpl_vars['RELATED_RECORD']->value->get('id');?>
" title="<?php echo $_smarty_tpl->tpl_vars['RELATED_RECORD']->value->getDisplayValue('productname');?>
"><?php echo $_smarty_tpl->tpl_vars['RELATED_RECORD']->value->getDisplayValue('productname');?>
</a></span><span class="col-lg-4"><span class="pull-right"><?php echo $_smarty_tpl->tpl_vars['RELATED_RECORD']->value->getDisplayValue('unit_price');?>
</span></span></div></li></ul></div><?php
}
$_smarty_tpl->smarty->ext->_foreach->restore($_smarty_tpl, 1);
$_smarty_tpl->_assignInScope('NUMBER_OF_RECORDS', php7_count($_smarty_tpl->tpl_vars['RELATED_RECORDS']->value));
if ($_smarty_tpl->tpl_vars['NUMBER_OF_RECORDS']->value == 5) {?><div class="row"><div class="pull-right"><a href="javascript:void(0)" class="moreRecentProducts cursorPointer"><?php echo vtranslate('LBL_MORE',$_smarty_tpl->tpl_vars['MODULE_NAME']->value);?>
</a></div></div><?php }?></div><?php }
}
