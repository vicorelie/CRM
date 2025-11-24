<?php
/* Smarty version 4.5.5, created on 2025-11-21 09:11:44
  from '/var/www/CRM/CRM-TYPE/layouts/v7/modules/EMAILMaker/DetailViewHeaderTitle.tpl' */

/* @var Smarty_Internal_Template $_smarty_tpl */
if ($_smarty_tpl->_decodeProperties($_smarty_tpl, array (
  'version' => '4.5.5',
  'unifunc' => 'content_69202cd03cbe48_56986149',
  'has_nocache_code' => false,
  'file_dependency' => 
  array (
    '1459367304b2ba03160159b9c34e6c24c29bfdc7' => 
    array (
      0 => '/var/www/CRM/CRM-TYPE/layouts/v7/modules/EMAILMaker/DetailViewHeaderTitle.tpl',
      1 => 1754577898,
      2 => 'file',
    ),
  ),
  'includes' => 
  array (
  ),
),false)) {
function content_69202cd03cbe48_56986149 (Smarty_Internal_Template $_smarty_tpl) {
?><div class="col-lg-6 col-md-6 col-sm-6"><div class="record-header clearfix"><?php if (!$_smarty_tpl->tpl_vars['MODULE']->value) {
$_smarty_tpl->_assignInScope('MODULE', $_smarty_tpl->tpl_vars['MODULE_NAME']->value);
}?><div class="hidden-sm hidden-xs recordImage bg_<?php echo $_smarty_tpl->tpl_vars['MODULE']->value;?>
 app-<?php echo $_smarty_tpl->tpl_vars['SELECTED_MENU_CATEGORY']->value;?>
"><div class="name"><span><strong><i class="vicon-<?php echo strtolower($_smarty_tpl->tpl_vars['MODULE']->value);?>
"></i></strong></span></div></div><div class="recordBasicInfo"><div class="info-row"><h4><span class="recordLabel pushDown" title="<?php echo $_smarty_tpl->tpl_vars['RECORD']->value->getName();?>
"><span><?php echo $_smarty_tpl->tpl_vars['RECORD']->value->getName();?>
</span>&nbsp;</span></h4></div><div class="info-row"><span class="modulename_label"><?php echo vtranslate('LBL_MODULENAMES',$_smarty_tpl->tpl_vars['MODULE']->value);?>
:</span>&nbsp;<?php echo vtranslate($_smarty_tpl->tpl_vars['RECORD']->value->get('module'),$_smarty_tpl->tpl_vars['RECORD']->value->get('module'));?>
</div></div></div></div><?php }
}
