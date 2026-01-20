<?php
/* Smarty version 4.5.5, created on 2026-01-20 01:04:32
  from '/var/www/CNK-DEM/layouts/v7/modules/PDFMaker/ModalImageSelectContent.tpl' */

/* @var Smarty_Internal_Template $_smarty_tpl */
if ($_smarty_tpl->_decodeProperties($_smarty_tpl, array (
  'version' => '4.5.5',
  'unifunc' => 'content_696eb880915b13_90939448',
  'has_nocache_code' => false,
  'file_dependency' => 
  array (
    '212d9ea65aec7897799315f79ab5d8549709abce' => 
    array (
      0 => '/var/www/CNK-DEM/layouts/v7/modules/PDFMaker/ModalImageSelectContent.tpl',
      1 => 1766693999,
      2 => 'file',
    ),
  ),
  'includes' => 
  array (
  ),
),false)) {
function content_696eb880915b13_90939448 (Smarty_Internal_Template $_smarty_tpl) {
?><div class="modal-dialog modelContainer"><div class="modal-content" style="width:675px;"><?php ob_start();
echo vtranslate('LBL_PRODUCT_IMAGE','PDFMaker');
$_prefixVariable1 = ob_get_clean();
$_smarty_tpl->_assignInScope('HEADER_TITLE', $_prefixVariable1);
$_smarty_tpl->_subTemplateRender(call_user_func_array($_smarty_tpl->registered_plugins[ 'modifier' ][ 'vtemplate_path' ][ 0 ], array( "ModalHeader.tpl",$_smarty_tpl->tpl_vars['MODULE']->value )), $_smarty_tpl->cache_id, $_smarty_tpl->compile_id, 0, $_smarty_tpl->cache_lifetime, array('TITLE'=>$_smarty_tpl->tpl_vars['HEADER_TITLE']->value), 0, true);
?><div class="modal-body"><div class="container-fluid"><div><form id="SaveProductImagesForm" class="form-horizontal" name="upload" method="post" action="index.php"><input type="hidden" name="module" value="<?php echo $_smarty_tpl->tpl_vars['MODULE_NAME']->value;?>
" /><input type="hidden" name="action" value="SaveAjax" /><input type="hidden" name="mode" value="SavePDFImages" /><input type="hidden" name="return_id" value="<?php echo $_smarty_tpl->tpl_vars['RECORD']->value;?>
" /><table class="table table-bordered"><tbody><?php echo $_smarty_tpl->tpl_vars['IMG_HTML']->value;?>
</tbody></table></form></div></div></div><?php ob_start();
echo vtranslate('LBL_SAVE',$_smarty_tpl->tpl_vars['MODULE']->value);
$_prefixVariable2 = ob_get_clean();
$_smarty_tpl->_assignInScope('BUTTON_NAME', $_prefixVariable2);
$_smarty_tpl->_assignInScope('BUTTON_ID', "js-save-button");
$_smarty_tpl->_subTemplateRender(call_user_func_array($_smarty_tpl->registered_plugins[ 'modifier' ][ 'vtemplate_path' ][ 0 ], array( "ModalFooter.tpl",$_smarty_tpl->tpl_vars['MODULE']->value )), $_smarty_tpl->cache_id, $_smarty_tpl->compile_id, 0, $_smarty_tpl->cache_lifetime, array(), 0, true);
?></div></div>
<?php }
}
