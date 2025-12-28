<?php
/* Smarty version 4.5.5, created on 2025-12-28 14:52:27
  from '/var/www/CNK-DEM/layouts/v7/modules/EMAILMaker/GetEMAILButtons.tpl' */

/* @var Smarty_Internal_Template $_smarty_tpl */
if ($_smarty_tpl->_decodeProperties($_smarty_tpl, array (
  'version' => '4.5.5',
  'unifunc' => 'content_6951442b237ba6_31669250',
  'has_nocache_code' => false,
  'file_dependency' => 
  array (
    'd28451916abe8566fb64d6681ad3b4bdaca88d52' => 
    array (
      0 => '/var/www/CNK-DEM/layouts/v7/modules/EMAILMaker/GetEMAILButtons.tpl',
      1 => 1766693566,
      2 => 'file',
    ),
  ),
  'includes' => 
  array (
  ),
),false)) {
function content_6951442b237ba6_31669250 (Smarty_Internal_Template $_smarty_tpl) {
if ($_smarty_tpl->tpl_vars['ENABLE_EMAILMAKER']->value == 'true') {?><div class="pull-right" id="EMAILMakerContentDiv" style="padding-left: 5px;"><div class="clearfix"><div class="btn-group pull-right"><button class="btn btn-default selectEMAILTemplates"><i title="<?php echo vtranslate('LBL_SEND_EMAILMAKER_EMAIL','EMAILMaker');?>
" class="fa fa-envelope-o" aria-hidden="true"></i>&nbsp;<?php echo vtranslate('LBL_SEND_EMAILMAKER_EMAIL','EMAILMaker');?>
</button></div></div></div><?php }
}
}
