<?php
/* Smarty version 4.5.5, created on 2025-11-24 13:39:37
  from '/var/www/CRM/ARIDEM/layouts/v7/modules/MailManager/partials/Menubar.tpl' */

/* @var Smarty_Internal_Template $_smarty_tpl */
if ($_smarty_tpl->_decodeProperties($_smarty_tpl, array (
  'version' => '4.5.5',
  'unifunc' => 'content_692460194b2179_88647962',
  'has_nocache_code' => false,
  'file_dependency' => 
  array (
    '66887a114a5d345784b85d7e7411a3a0ae384ded' => 
    array (
      0 => '/var/www/CRM/ARIDEM/layouts/v7/modules/MailManager/partials/Menubar.tpl',
      1 => 1752241490,
      2 => 'file',
    ),
  ),
  'includes' => 
  array (
  ),
),false)) {
function content_692460194b2179_88647962 (Smarty_Internal_Template $_smarty_tpl) {
?><div id="modules-menu" class="modules-menu mmModulesMenu" style="width: 100%;"><div><span><?php echo $_smarty_tpl->tpl_vars['MAILBOX']->value->username();?>
</span><span class="pull-right"><span class="cursorPointer mailbox_refresh" title="<?php echo vtranslate('LBL_Refresh',$_smarty_tpl->tpl_vars['MODULE']->value);?>
"><i class="fa fa-refresh"></i></span>&nbsp;<span class="cursorPointer mailbox_setting" title="<?php echo vtranslate('JSLBL_Settings',$_smarty_tpl->tpl_vars['MODULE']->value);?>
"><i class="fa fa-cog"></i></span></span></div><div id="mail_compose" class="cursorPointer"><i class="fa fa-pencil-square-o"></i>&nbsp;<?php echo vtranslate('LBL_Compose',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</div><div id='folders_list'></div></div><?php }
}
