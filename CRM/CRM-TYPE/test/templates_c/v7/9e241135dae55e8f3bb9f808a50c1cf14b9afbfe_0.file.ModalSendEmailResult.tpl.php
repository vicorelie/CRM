<?php
/* Smarty version 4.5.5, created on 2025-11-13 10:08:05
  from '/home3/vicorelie/crm.tcerenov-design.com/layouts/v7/modules/ITS4YouEmails/ModalSendEmailResult.tpl' */

/* @var Smarty_Internal_Template $_smarty_tpl */
if ($_smarty_tpl->_decodeProperties($_smarty_tpl, array (
  'version' => '4.5.5',
  'unifunc' => 'content_6915ae059aa3f3_75746135',
  'has_nocache_code' => false,
  'file_dependency' => 
  array (
    '9e241135dae55e8f3bb9f808a50c1cf14b9afbfe' => 
    array (
      0 => '/home3/vicorelie/crm.tcerenov-design.com/layouts/v7/modules/ITS4YouEmails/ModalSendEmailResult.tpl',
      1 => 1754577872,
      2 => 'file',
    ),
  ),
  'includes' => 
  array (
  ),
),false)) {
function content_6915ae059aa3f3_75746135 (Smarty_Internal_Template $_smarty_tpl) {
?><div class="modal-dialog modelContainer mailSentSuccessfully">
    <div class="modal-content" style="width:800px;">
        <?php $_smarty_tpl->_assignInScope('HEADER_TITLE', $_smarty_tpl->tpl_vars['TITLE']->value);?>
        <?php $_smarty_tpl->_subTemplateRender(call_user_func_array($_smarty_tpl->registered_plugins[ 'modifier' ][ 'vtemplate_path' ][ 0 ], array( "ModalHeader.tpl",$_smarty_tpl->tpl_vars['MODULE']->value )), $_smarty_tpl->cache_id, $_smarty_tpl->compile_id, 0, $_smarty_tpl->cache_lifetime, array('TITLE'=>$_smarty_tpl->tpl_vars['HEADER_TITLE']->value), 0, true);
?>
        <div class="padding15px">
            <div class="widgetContainer_1">
                <div class="widget_contents" id="popup_notifi_content">
                    <?php echo vtranslate('LBL_EMAILS_SENT_RESULT',$_smarty_tpl->tpl_vars['MODULE']->value);?>

                    <hr>
                    <?php echo vtranslate('LBL_TOTAL_EMAILS',$_smarty_tpl->tpl_vars['MODULE']->value);?>
: <?php echo $_smarty_tpl->tpl_vars['RESULT']->value['total'];?>

                    <br>
                    <?php if ($_smarty_tpl->tpl_vars['RESULT']->value['sent']) {?>
                        <?php echo vtranslate('LBL_SENT_EMAILS',$_smarty_tpl->tpl_vars['MODULE']->value);?>
: <?php echo $_smarty_tpl->tpl_vars['RESULT']->value['sent'];?>

                        <br>
                    <?php }?>
                    <?php if ($_smarty_tpl->tpl_vars['RESULT']->value['error']) {?>
                        <?php echo vtranslate('LBL_ERROR_EMAILS',$_smarty_tpl->tpl_vars['MODULE']->value);?>
: <?php echo $_smarty_tpl->tpl_vars['RESULT']->value['error'];?>

                        <br>
                        <span style="color: red; white-space: pre-line;"><?php echo $_smarty_tpl->tpl_vars['RESULT']->value['error_message'];?>
</span>
                    <?php }?>
                </div>
            </div>
        </div>
    </div>
</div><?php }
}
