<?php
/* Smarty version 4.5.5, created on 2026-03-19 23:52:38
  from '/var/www/CRM/ARIDEM/layouts/v7/modules/EMAILMaker/Footer.tpl' */

/* @var Smarty_Internal_Template $_smarty_tpl */
if ($_smarty_tpl->_decodeProperties($_smarty_tpl, array (
  'version' => '4.5.5',
  'unifunc' => 'content_69bc8c46175dc9_22845544',
  'has_nocache_code' => false,
  'file_dependency' => 
  array (
    '0b1ad93fc10ea05bb574b08e287d9c79035342d0' => 
    array (
      0 => '/var/www/CRM/ARIDEM/layouts/v7/modules/EMAILMaker/Footer.tpl',
      1 => 1773964210,
      2 => 'file',
    ),
  ),
  'includes' => 
  array (
  ),
),false)) {
function content_69bc8c46175dc9_22845544 (Smarty_Internal_Template $_smarty_tpl) {
?>
<br><div class="small" style="color: rgb(153, 153, 153);text-align: center;"><?php echo vtranslate('EMAILMaker','EMAILMaker');?>
 <?php echo EMAILMaker_Version_Helper::$version;?>
 <?php echo vtranslate('COPYRIGHT','EMAILMaker');?>
</div><?php $_smarty_tpl->_subTemplateRender(call_user_func_array($_smarty_tpl->registered_plugins[ 'modifier' ][ 'vtemplate_path' ][ 0 ], array( "Footer.tpl",'Vtiger' )), $_smarty_tpl->cache_id, $_smarty_tpl->compile_id, 0, $_smarty_tpl->cache_lifetime, array(), 0, true);
}
}
