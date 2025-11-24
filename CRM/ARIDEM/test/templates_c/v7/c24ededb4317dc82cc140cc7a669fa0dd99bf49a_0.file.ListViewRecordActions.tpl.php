<?php
/* Smarty version 4.5.5, created on 2025-11-20 20:39:21
  from '/var/www/CRM/ARIDEM/layouts/v7/modules/Settings/Workflows/ListViewRecordActions.tpl' */

/* @var Smarty_Internal_Template $_smarty_tpl */
if ($_smarty_tpl->_decodeProperties($_smarty_tpl, array (
  'version' => '4.5.5',
  'unifunc' => 'content_691f7c79e44e36_28655482',
  'has_nocache_code' => false,
  'file_dependency' => 
  array (
    'c24ededb4317dc82cc140cc7a669fa0dd99bf49a' => 
    array (
      0 => '/var/www/CRM/ARIDEM/layouts/v7/modules/Settings/Workflows/ListViewRecordActions.tpl',
      1 => 1752055882,
      2 => 'file',
    ),
  ),
  'includes' => 
  array (
  ),
),false)) {
function content_691f7c79e44e36_28655482 (Smarty_Internal_Template $_smarty_tpl) {
?><!--LIST VIEW RECORD ACTIONS--><div style="width:80px ;"><a class="deleteRecordButton" style=" opacity: 0; padding: 0 5px;"><i title="<?php echo vtranslate('LBL_DELETE',$_smarty_tpl->tpl_vars['MODULE']->value);?>
" class="fa fa-trash alignMiddle"></i></a><input style="opacity: 0;" <?php if ($_smarty_tpl->tpl_vars['LISTVIEW_ENTRY']->value->get('status')) {?> checked value="on" <?php } else { ?> value="off"<?php }?> data-on-color="success"  data-id="<?php echo $_smarty_tpl->tpl_vars['LISTVIEW_ENTRY']->value->getId();?>
" type="checkbox" name="workflowstatus" id="workflowstatus"></div><?php }
}
