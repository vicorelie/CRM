<?php
/* Smarty version 4.5.5, created on 2025-12-21 13:28:02
  from '/var/www/CNK-DEM/layouts/v7/modules/PDFMaker/DetailDisplayConditions.tpl' */

/* @var Smarty_Internal_Template $_smarty_tpl */
if ($_smarty_tpl->_decodeProperties($_smarty_tpl, array (
  'version' => '4.5.5',
  'unifunc' => 'content_6947f5e29d8b68_41350704',
  'has_nocache_code' => false,
  'file_dependency' => 
  array (
    'ca7e0c0f53cd3dc3b3c4ff5d450b002fc340f42c' => 
    array (
      0 => '/var/www/CNK-DEM/layouts/v7/modules/PDFMaker/DetailDisplayConditions.tpl',
      1 => 1765893765,
      2 => 'file',
    ),
  ),
  'includes' => 
  array (
  ),
),false)) {
function content_6947f5e29d8b68_41350704 (Smarty_Internal_Template $_smarty_tpl) {
$_smarty_tpl->_assignInScope('DISPLAY_CONDITION', $_smarty_tpl->tpl_vars['PDFMAKER_RECORD_MODEL']->value->getConditonDisplayValue());
$_smarty_tpl->_assignInScope('ALL_CONDITIONS', $_smarty_tpl->tpl_vars['DISPLAY_CONDITION']->value['All']);
$_smarty_tpl->_assignInScope('ANY_CONDITIONS', $_smarty_tpl->tpl_vars['DISPLAY_CONDITION']->value['Any']);
if (empty($_smarty_tpl->tpl_vars['ALL_CONDITIONS']->value) && empty($_smarty_tpl->tpl_vars['ANY_CONDITIONS']->value)) {
echo vtranslate('LBL_NO_DISPLAY_CONDITIONS_DEFINED',$_smarty_tpl->tpl_vars['MODULE']->value);
} else {
if ($_smarty_tpl->tpl_vars['DISPLAY_CONDITION']->value['displayed'] == "0") {
echo vtranslate('LBL_DISPLAY_CONDITIONS_YES',$_smarty_tpl->tpl_vars['MODULE']->value);
} else {
echo vtranslate('LBL_DISPLAY_CONDITIONS_NO',$_smarty_tpl->tpl_vars['MODULE']->value);
}?>:<br><br><span><strong><?php echo vtranslate('All');?>
&nbsp;:&nbsp;&nbsp;&nbsp;</strong></span><?php if (is_array($_smarty_tpl->tpl_vars['ALL_CONDITIONS']->value) && !empty($_smarty_tpl->tpl_vars['ALL_CONDITIONS']->value)) {
$_from = $_smarty_tpl->smarty->ext->_foreach->init($_smarty_tpl, $_smarty_tpl->tpl_vars['ALL_CONDITIONS']->value, 'ALL_CONDITION', false, NULL, 'allCounter', array (
  'iteration' => true,
));
$_smarty_tpl->tpl_vars['ALL_CONDITION']->do_else = true;
if ($_from !== null) foreach ($_from as $_smarty_tpl->tpl_vars['ALL_CONDITION']->value) {
$_smarty_tpl->tpl_vars['ALL_CONDITION']->do_else = false;
$_smarty_tpl->tpl_vars['__smarty_foreach_allCounter']->value['iteration']++;
if ((isset($_smarty_tpl->tpl_vars['__smarty_foreach_allCounter']->value['iteration']) ? $_smarty_tpl->tpl_vars['__smarty_foreach_allCounter']->value['iteration'] : null) != 1) {?><span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; </span><?php }?><span><?php echo $_smarty_tpl->tpl_vars['ALL_CONDITION']->value;?>
</span><br><?php
}
$_smarty_tpl->smarty->ext->_foreach->restore($_smarty_tpl, 1);
} else {
echo vtranslate('LBL_NA');
}?><br><span><strong><?php echo vtranslate('Any');?>
&nbsp;:&nbsp;</strong></span><?php if (is_array($_smarty_tpl->tpl_vars['ANY_CONDITIONS']->value) && !empty($_smarty_tpl->tpl_vars['ANY_CONDITIONS']->value)) {
$_from = $_smarty_tpl->smarty->ext->_foreach->init($_smarty_tpl, $_smarty_tpl->tpl_vars['ANY_CONDITIONS']->value, 'ANY_CONDITION', false, NULL, 'anyCounter', array (
  'iteration' => true,
));
$_smarty_tpl->tpl_vars['ANY_CONDITION']->do_else = true;
if ($_from !== null) foreach ($_from as $_smarty_tpl->tpl_vars['ANY_CONDITION']->value) {
$_smarty_tpl->tpl_vars['ANY_CONDITION']->do_else = false;
$_smarty_tpl->tpl_vars['__smarty_foreach_anyCounter']->value['iteration']++;
if ((isset($_smarty_tpl->tpl_vars['__smarty_foreach_anyCounter']->value['iteration']) ? $_smarty_tpl->tpl_vars['__smarty_foreach_anyCounter']->value['iteration'] : null) != 1) {?><span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; </span><?php }?><span><?php echo $_smarty_tpl->tpl_vars['ANY_CONDITION']->value;?>
</span><br><?php
}
$_smarty_tpl->smarty->ext->_foreach->restore($_smarty_tpl, 1);
} else {
echo vtranslate('LBL_NA');
}
}
}
}
