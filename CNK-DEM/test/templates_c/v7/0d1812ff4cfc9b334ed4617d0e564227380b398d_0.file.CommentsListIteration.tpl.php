<?php
/* Smarty version 4.5.5, created on 2025-12-24 22:19:07
  from '/var/www/CNK-DEM/layouts/v7/modules/Vtiger/CommentsListIteration.tpl' */

/* @var Smarty_Internal_Template $_smarty_tpl */
if ($_smarty_tpl->_decodeProperties($_smarty_tpl, array (
  'version' => '4.5.5',
  'unifunc' => 'content_694c66dbb6f4c8_11978726',
  'has_nocache_code' => false,
  'file_dependency' => 
  array (
    '0d1812ff4cfc9b334ed4617d0e564227380b398d' => 
    array (
      0 => '/var/www/CNK-DEM/layouts/v7/modules/Vtiger/CommentsListIteration.tpl',
      1 => 1765888875,
      2 => 'file',
    ),
  ),
  'includes' => 
  array (
  ),
),false)) {
function content_694c66dbb6f4c8_11978726 (Smarty_Internal_Template $_smarty_tpl) {
if (!empty($_smarty_tpl->tpl_vars['CHILD_COMMENTS_MODEL']->value)) {?><ul class="unstyled"><?php
$_from = $_smarty_tpl->smarty->ext->_foreach->init($_smarty_tpl, $_smarty_tpl->tpl_vars['CHILD_COMMENTS_MODEL']->value, 'COMMENT');
$_smarty_tpl->tpl_vars['COMMENT']->do_else = true;
if ($_from !== null) foreach ($_from as $_smarty_tpl->tpl_vars['COMMENT']->value) {
$_smarty_tpl->tpl_vars['COMMENT']->do_else = false;
?><li class="commentDetails" <?php if ($_smarty_tpl->tpl_vars['COMMENT']->value->get('is_private')) {?>style="background: #fff9ea;"<?php }?>><?php $_smarty_tpl->_subTemplateRender(call_user_func_array($_smarty_tpl->registered_plugins[ 'modifier' ][ 'vtemplate_path' ][ 0 ], array( 'CommentThreadList.tpl' )), $_smarty_tpl->cache_id, $_smarty_tpl->compile_id, 0, $_smarty_tpl->cache_lifetime, array('COMMENT'=>$_smarty_tpl->tpl_vars['COMMENT']->value), 0, true);
$_smarty_tpl->_assignInScope('CHILD_COMMENTS', $_smarty_tpl->tpl_vars['COMMENT']->value->getChildComments());
if (!empty($_smarty_tpl->tpl_vars['CHILD_COMMENTS']->value)) {
$_smarty_tpl->_subTemplateRender(call_user_func_array($_smarty_tpl->registered_plugins[ 'modifier' ][ 'vtemplate_path' ][ 0 ], array( 'CommentsListIteration.tpl' )), $_smarty_tpl->cache_id, $_smarty_tpl->compile_id, 0, $_smarty_tpl->cache_lifetime, array('CHILD_COMMENTS_MODEL'=>$_smarty_tpl->tpl_vars['COMMENT']->value->getChildComments()), 0, true);
}?></li><br><?php
}
$_smarty_tpl->smarty->ext->_foreach->restore($_smarty_tpl, 1);?></ul><?php }
}
}
