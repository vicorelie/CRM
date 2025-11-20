<?php
/* Smarty version 4.5.5, created on 2025-11-03 09:15:49
  from '/home3/vicorelie/crm.tcerenov-design.com/layouts/v7/modules/EMAILMaker/SelectEmailFieldOptions.tpl' */

/* @var Smarty_Internal_Template $_smarty_tpl */
if ($_smarty_tpl->_decodeProperties($_smarty_tpl, array (
  'version' => '4.5.5',
  'unifunc' => 'content_690872c5222647_68794310',
  'has_nocache_code' => false,
  'file_dependency' => 
  array (
    'ff93f5e6616dd79f0352a2bfee273f6267d810e1' => 
    array (
      0 => '/home3/vicorelie/crm.tcerenov-design.com/layouts/v7/modules/EMAILMaker/SelectEmailFieldOptions.tpl',
      1 => 1754577898,
      2 => 'file',
    ),
  ),
  'includes' => 
  array (
  ),
),false)) {
function content_690872c5222647_68794310 (Smarty_Internal_Template $_smarty_tpl) {
$_from = $_smarty_tpl->smarty->ext->_foreach->init($_smarty_tpl, $_smarty_tpl->tpl_vars['EMAIL_FIELDS_LIST']->value, 'EMAIL_FIELD_LIST', false, 'EMAIL_FIELD_NAME', 'email_fields_foreach', array (
));
$_smarty_tpl->tpl_vars['EMAIL_FIELD_LIST']->do_else = true;
if ($_from !== null) foreach ($_from as $_smarty_tpl->tpl_vars['EMAIL_FIELD_NAME']->value => $_smarty_tpl->tpl_vars['EMAIL_FIELD_LIST']->value) {
$_smarty_tpl->tpl_vars['EMAIL_FIELD_LIST']->do_else = false;
?><optgroup label="<?php echo $_smarty_tpl->tpl_vars['EMAIL_FIELD_NAME']->value;?>
"><?php
$_from = $_smarty_tpl->smarty->ext->_foreach->init($_smarty_tpl, $_smarty_tpl->tpl_vars['EMAIL_FIELD_LIST']->value, 'EMAIL_FIELD_DATA', false, NULL, 'emailFieldIterator', array (
));
$_smarty_tpl->tpl_vars['EMAIL_FIELD_DATA']->do_else = true;
if ($_from !== null) foreach ($_from as $_smarty_tpl->tpl_vars['EMAIL_FIELD_DATA']->value) {
$_smarty_tpl->tpl_vars['EMAIL_FIELD_DATA']->do_else = false;
if ($_smarty_tpl->tpl_vars['IS_INPUT_SELECTED_ALLOWED']->value && '0' == $_smarty_tpl->tpl_vars['EMAIL_FIELD_DATA']->value['emailoptout'] && 'yes' == $_smarty_tpl->tpl_vars['SINGLE_RECORD']->value && '1' != $_smarty_tpl->tpl_vars['IS_INPUT_SELECTED_DEFINED']->value) {
$_smarty_tpl->_assignInScope('IS_INPUT_SELECTED', 'selected');
$_smarty_tpl->_assignInScope('IS_INPUT_SELECTED_DEFINED', '1');
} else {
$_smarty_tpl->_assignInScope('IS_INPUT_SELECTED', '');
}?><option value="<?php echo $_smarty_tpl->tpl_vars['EMAIL_FIELD_DATA']->value['crmid'];?>
|<?php echo $_smarty_tpl->tpl_vars['EMAIL_FIELD_DATA']->value['fieldname'];?>
|<?php echo $_smarty_tpl->tpl_vars['EMAIL_FIELD_DATA']->value['module'];?>
" <?php echo $_smarty_tpl->tpl_vars['IS_INPUT_SELECTED']->value;?>
><?php echo $_smarty_tpl->tpl_vars['EMAIL_FIELD_DATA']->value['label'];?>
 <?php if ($_smarty_tpl->tpl_vars['EMAIL_FIELD_DATA']->value['value'] != '' && $_smarty_tpl->tpl_vars['SINGLE_RECORD']->value == "yes") {?>: <?php echo $_smarty_tpl->tpl_vars['EMAIL_FIELD_DATA']->value['value'];
} else {
if ($_smarty_tpl->tpl_vars['EMAIL_FIELD_NAME']->value != '') {?>(<?php echo $_smarty_tpl->tpl_vars['EMAIL_FIELD_NAME']->value;?>
)<?php }
}?> <?php if ($_smarty_tpl->tpl_vars['EMAIL_FIELD_DATA']->value['emailoptout'] == "1" && $_smarty_tpl->tpl_vars['SINGLE_RECORD']->value == "yes") {?>&nbsp;(<?php echo vtranslate('Email Opt Out',$_smarty_tpl->tpl_vars['MODULE']->value);?>
)<?php }?></option><?php
}
$_smarty_tpl->smarty->ext->_foreach->restore($_smarty_tpl, 1);?></optgroup><?php
}
$_smarty_tpl->smarty->ext->_foreach->restore($_smarty_tpl, 1);?>


<?php }
}
