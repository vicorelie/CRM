<?php
/* Smarty version 4.5.5, created on 2025-12-21 04:55:08
  from '/var/www/CNK-DEM/layouts/v7/modules/EMAILMaker/GetEMAILButtons.tpl' */

/* @var Smarty_Internal_Template $_smarty_tpl */
if ($_smarty_tpl->_decodeProperties($_smarty_tpl, array (
  'version' => '4.5.5',
  'unifunc' => 'content_69477dac9a3518_98193349',
  'has_nocache_code' => false,
  'file_dependency' => 
  array (
    'd28451916abe8566fb64d6681ad3b4bdaca88d52' => 
    array (
      0 => '/var/www/CNK-DEM/layouts/v7/modules/EMAILMaker/GetEMAILButtons.tpl',
      1 => 1765888875,
      2 => 'file',
    ),
  ),
  'includes' => 
  array (
  ),
),false)) {
function content_69477dac9a3518_98193349 (Smarty_Internal_Template $_smarty_tpl) {
if ($_smarty_tpl->tpl_vars['ENABLE_EMAILMAKER']->value == 'true') {?><div class="pull-right" id="EMAILMakerContentDiv" style="padding-left: 5px;"><div class="clearfix"><div class="btn-group pull-right"><button class="btn btn-default selectEMAILTemplates"><i title="<?php echo vtranslate('LBL_SEND_EMAILMAKER_EMAIL','EMAILMaker');?>
" class="fa fa-envelope-o" aria-hidden="true"></i>&nbsp;<?php echo vtranslate('LBL_SEND_EMAILMAKER_EMAIL','EMAILMaker');?>
</button></div></div></div><?php }
}
}
