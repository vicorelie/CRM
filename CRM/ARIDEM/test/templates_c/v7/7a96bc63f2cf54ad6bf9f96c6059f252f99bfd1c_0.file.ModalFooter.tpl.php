<?php
/* Smarty version 4.5.5, created on 2025-12-03 22:12:23
  from '/var/www/CRM/ARIDEM/layouts/v7/modules/Vtiger/ModalFooter.tpl' */

/* @var Smarty_Internal_Template $_smarty_tpl */
if ($_smarty_tpl->_decodeProperties($_smarty_tpl, array (
  'version' => '4.5.5',
  'unifunc' => 'content_6930b5c797b121_74575636',
  'has_nocache_code' => false,
  'file_dependency' => 
  array (
    '7a96bc63f2cf54ad6bf9f96c6059f252f99bfd1c' => 
    array (
      0 => '/var/www/CRM/ARIDEM/layouts/v7/modules/Vtiger/ModalFooter.tpl',
      1 => 1752052260,
      2 => 'file',
    ),
  ),
  'includes' => 
  array (
  ),
),false)) {
function content_6930b5c797b121_74575636 (Smarty_Internal_Template $_smarty_tpl) {
?><div class="modal-footer "><center><?php if ($_smarty_tpl->tpl_vars['BUTTON_NAME']->value != null) {
$_smarty_tpl->_assignInScope('BUTTON_LABEL', $_smarty_tpl->tpl_vars['BUTTON_NAME']->value);
} else {
ob_start();
echo vtranslate('LBL_SAVE',$_smarty_tpl->tpl_vars['MODULE']->value);
$_prefixVariable25 = ob_get_clean();
$_smarty_tpl->_assignInScope('BUTTON_LABEL', $_prefixVariable25);
}?><button <?php if ($_smarty_tpl->tpl_vars['BUTTON_ID']->value != null) {?> id="<?php echo $_smarty_tpl->tpl_vars['BUTTON_ID']->value;?>
" <?php }?> class="btn btn-success" type="submit" name="saveButton"><strong><?php echo $_smarty_tpl->tpl_vars['BUTTON_LABEL']->value;?>
</strong></button><a href="#" class="cancelLink" type="reset" data-dismiss="modal"><?php echo vtranslate('LBL_CANCEL',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</a></center></div><?php }
}
