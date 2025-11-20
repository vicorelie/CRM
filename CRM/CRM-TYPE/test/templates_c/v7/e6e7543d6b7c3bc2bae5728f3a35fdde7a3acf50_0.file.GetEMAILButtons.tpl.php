<?php
/* Smarty version 4.5.5, created on 2025-11-14 09:19:44
  from '/var/www/CRM/ARIDEM/layouts/v7/modules/EMAILMaker/GetEMAILButtons.tpl' */

/* @var Smarty_Internal_Template $_smarty_tpl */
if ($_smarty_tpl->_decodeProperties($_smarty_tpl, array (
  'version' => '4.5.5',
  'unifunc' => 'content_6916f4307f6ac8_59131126',
  'has_nocache_code' => false,
  'file_dependency' => 
  array (
    'e6e7543d6b7c3bc2bae5728f3a35fdde7a3acf50' => 
    array (
      0 => '/var/www/CRM/ARIDEM/layouts/v7/modules/EMAILMaker/GetEMAILButtons.tpl',
      1 => 1754577898,
      2 => 'file',
    ),
  ),
  'includes' => 
  array (
  ),
),false)) {
function content_6916f4307f6ac8_59131126 (Smarty_Internal_Template $_smarty_tpl) {
if ($_smarty_tpl->tpl_vars['ENABLE_EMAILMAKER']->value == 'true') {?><div class="pull-right" id="EMAILMakerContentDiv" style="padding-left: 5px;"><div class="clearfix"><div class="btn-group pull-right"><button class="btn btn-default selectEMAILTemplates"><i title="<?php echo vtranslate('LBL_SEND_EMAILMAKER_EMAIL','EMAILMaker');?>
" class="fa fa-envelope-o" aria-hidden="true"></i>&nbsp;<?php echo vtranslate('LBL_SEND_EMAILMAKER_EMAIL','EMAILMaker');?>
</button></div></div></div><?php }
}
}
