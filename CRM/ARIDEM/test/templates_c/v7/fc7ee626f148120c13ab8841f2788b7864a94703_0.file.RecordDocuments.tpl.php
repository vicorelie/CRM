<?php
/* Smarty version 4.5.5, created on 2025-11-21 08:52:34
  from '/var/www/CRM/ARIDEM/layouts/v7/modules/ITS4YouEmails/RecordDocuments.tpl' */

/* @var Smarty_Internal_Template $_smarty_tpl */
if ($_smarty_tpl->_decodeProperties($_smarty_tpl, array (
  'version' => '4.5.5',
  'unifunc' => 'content_69202852e71ce6_01077692',
  'has_nocache_code' => false,
  'file_dependency' => 
  array (
    'fc7ee626f148120c13ab8841f2788b7864a94703' => 
    array (
      0 => '/var/www/CRM/ARIDEM/layouts/v7/modules/ITS4YouEmails/RecordDocuments.tpl',
      1 => 1754574240,
      2 => 'file',
    ),
  ),
  'includes' => 
  array (
  ),
),false)) {
function content_69202852e71ce6_01077692 (Smarty_Internal_Template $_smarty_tpl) {
?><div class="modal-dialog modal-lg"><div class="modal-content"><?php $_smarty_tpl->_subTemplateRender(call_user_func_array($_smarty_tpl->registered_plugins[ 'modifier' ][ 'vtemplate_path' ][ 0 ], array( "ModalHeader.tpl",$_smarty_tpl->tpl_vars['MODULE']->value )), $_smarty_tpl->cache_id, $_smarty_tpl->compile_id, 0, $_smarty_tpl->cache_lifetime, array('TITLE'=>vtranslate('LBL_BROWSE_RECORD',$_smarty_tpl->tpl_vars['MODULE']->value)), 0, true);
?><div class="modal-body"><div id="recordDocuments"><table class="table"><tr><th><?php echo vtranslate('LBL_TITLE',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</th><th><?php echo vtranslate('LBL_FILENAME',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</th><th><?php echo vtranslate('LBL_FOLDER',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</th></tr><?php
$_from = $_smarty_tpl->smarty->ext->_foreach->init($_smarty_tpl, $_smarty_tpl->tpl_vars['RECORDS']->value, 'RECORD');
$_smarty_tpl->tpl_vars['RECORD']->do_else = true;
if ($_from !== null) foreach ($_from as $_smarty_tpl->tpl_vars['RECORD']->value) {
$_smarty_tpl->tpl_vars['RECORD']->do_else = false;
?><tr class="selectDocument" data-id="<?php echo $_smarty_tpl->tpl_vars['RECORD']->value['crmid'];?>
" data-name="<?php echo $_smarty_tpl->tpl_vars['RECORD']->value['title'];?>
" data-filename="<?php echo $_smarty_tpl->tpl_vars['RECORD']->value['filename'];?>
" data-filesize="<?php echo $_smarty_tpl->tpl_vars['RECORD']->value['filesize'];?>
"><td><?php echo $_smarty_tpl->tpl_vars['RECORD']->value['title'];?>
</td><td><?php echo $_smarty_tpl->tpl_vars['RECORD']->value['filename'];?>
</td><td><?php echo $_smarty_tpl->tpl_vars['RECORD']->value['foldername'];?>
</td></tr><?php
}
$_smarty_tpl->smarty->ext->_foreach->restore($_smarty_tpl, 1);?></table></div></div></div></div><?php }
}
