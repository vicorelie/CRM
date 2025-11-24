<?php
/* Smarty version 4.5.5, created on 2025-11-21 09:00:11
  from '/var/www/CRM/ARIDEM/layouts/v7/modules/Settings/ITS4YouInstaller/RequirementsModule.tpl' */

/* @var Smarty_Internal_Template $_smarty_tpl */
if ($_smarty_tpl->_decodeProperties($_smarty_tpl, array (
  'version' => '4.5.5',
  'unifunc' => 'content_69202a1b4d46c5_89537481',
  'has_nocache_code' => false,
  'file_dependency' => 
  array (
    'd7d50d1cee104c019cc29394afa83ecd5ee61b3a' => 
    array (
      0 => '/var/www/CRM/ARIDEM/layouts/v7/modules/Settings/ITS4YouInstaller/RequirementsModule.tpl',
      1 => 1754577749,
      2 => 'file',
    ),
  ),
  'includes' => 
  array (
  ),
),false)) {
function content_69202a1b4d46c5_89537481 (Smarty_Internal_Template $_smarty_tpl) {
?><div class="listViewPageDiv detailViewContainer" id="requirementsContents"><div class="col-lg-12 col-md-12 col-sm-12 col-xs-12 "><div id="listview-actions" class="listview-actions-container"><div class="contents"><br><div class="requirements-container"><?php if ($_smarty_tpl->tpl_vars['REQUIREMENTS']->value) {?><h5><b><?php echo vtranslate('LBL_REQUIREMENTS_FOR',$_smarty_tpl->tpl_vars['QUALIFIED_MODULE']->value);?>
 <?php echo $_smarty_tpl->tpl_vars['REQUIREMENTS']->value->getModuleLabel();?>
</b></h5><hr><?php
$_from = $_smarty_tpl->smarty->ext->_foreach->init($_smarty_tpl, $_smarty_tpl->tpl_vars['REQUIREMENT_VALIDATIONS']->value, 'VALIDATION');
$_smarty_tpl->tpl_vars['VALIDATION']->do_else = true;
if ($_from !== null) foreach ($_from as $_smarty_tpl->tpl_vars['VALIDATION']->value) {
$_smarty_tpl->tpl_vars['VALIDATION']->do_else = false;
?><div><?php $_smarty_tpl->_assignInScope('HEADERS', $_smarty_tpl->tpl_vars['REQUIREMENTS']->value->getHeaders($_smarty_tpl->tpl_vars['VALIDATION']->value['type']));?><h5><?php echo vtranslate($_smarty_tpl->tpl_vars['VALIDATION']->value['label'],$_smarty_tpl->tpl_vars['QUALIFIED_MODULE']->value);?>
</h5><table class="table border1px requirements-table"><thead><tr><th></th><?php
$_from = $_smarty_tpl->smarty->ext->_foreach->init($_smarty_tpl, $_smarty_tpl->tpl_vars['HEADERS']->value, 'HEADER_NAME', false, 'HEADER_LABEL');
$_smarty_tpl->tpl_vars['HEADER_NAME']->do_else = true;
if ($_from !== null) foreach ($_from as $_smarty_tpl->tpl_vars['HEADER_LABEL']->value => $_smarty_tpl->tpl_vars['HEADER_NAME']->value) {
$_smarty_tpl->tpl_vars['HEADER_NAME']->do_else = false;
?><th class="header-<?php echo $_smarty_tpl->tpl_vars['HEADER_NAME']->value;?>
"><?php echo vtranslate($_smarty_tpl->tpl_vars['HEADER_LABEL']->value,$_smarty_tpl->tpl_vars['QUALIFIED_MODULE']->value);?>
</th><?php
}
$_smarty_tpl->smarty->ext->_foreach->restore($_smarty_tpl, 1);?><th></th></tr></thead><tbody><?php
$_from = $_smarty_tpl->smarty->ext->_foreach->init($_smarty_tpl, $_smarty_tpl->tpl_vars['REQUIREMENTS']->value->getDataFromFunction($_smarty_tpl->tpl_vars['VALIDATION']->value['function']), 'REQUIREMENTS_DATA');
$_smarty_tpl->tpl_vars['REQUIREMENTS_DATA']->do_else = true;
if ($_from !== null) foreach ($_from as $_smarty_tpl->tpl_vars['REQUIREMENTS_DATA']->value) {
$_smarty_tpl->tpl_vars['REQUIREMENTS_DATA']->do_else = false;
?><tr class="<?php if ($_smarty_tpl->tpl_vars['REQUIREMENTS_DATA']->value['validate']) {?> noError <?php } else { ?> yesError <?php }?>"><td><?php if ($_smarty_tpl->tpl_vars['REQUIREMENTS_DATA']->value['validate']) {?><i class="fa fa-check"></i><?php } else { ?><i class="fa fa-times"></i><?php }?></td><?php
$_from = $_smarty_tpl->smarty->ext->_foreach->init($_smarty_tpl, $_smarty_tpl->tpl_vars['HEADERS']->value, 'HEADER_NAME', false, 'HEADER_LABEL');
$_smarty_tpl->tpl_vars['HEADER_NAME']->do_else = true;
if ($_from !== null) foreach ($_from as $_smarty_tpl->tpl_vars['HEADER_LABEL']->value => $_smarty_tpl->tpl_vars['HEADER_NAME']->value) {
$_smarty_tpl->tpl_vars['HEADER_NAME']->do_else = false;
?><td class="custom-link-<?php echo $_smarty_tpl->tpl_vars['HEADER_NAME']->value;?>
"><?php echo $_smarty_tpl->tpl_vars['REQUIREMENTS_DATA']->value[$_smarty_tpl->tpl_vars['HEADER_NAME']->value];?>
</td><?php
}
$_smarty_tpl->smarty->ext->_foreach->restore($_smarty_tpl, 1);?><td><?php echo vtranslate($_smarty_tpl->tpl_vars['REQUIREMENTS_DATA']->value['validate_message'],$_smarty_tpl->tpl_vars['QUALIFIED_MODULE']->value);?>
</td></tr><?php
}
if ($_smarty_tpl->tpl_vars['REQUIREMENTS_DATA']->do_else) {
?><tr><td colspan="<?php echo count($_smarty_tpl->tpl_vars['HEADERS']->value)+2;?>
"><?php echo vtranslate('LBL_NO_RECORDS',$_smarty_tpl->tpl_vars['QUALIFIED_MODULE']->value);?>
</td></tr><?php
}
$_smarty_tpl->smarty->ext->_foreach->restore($_smarty_tpl, 1);?></tbody></table></div><?php
}
$_smarty_tpl->smarty->ext->_foreach->restore($_smarty_tpl, 1);
}?></div></div></div></div></div>
<?php }
}
