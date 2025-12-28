<?php
/* Smarty version 4.5.5, created on 2025-12-28 15:33:43
  from '/var/www/CNK-DEM/layouts/v7/modules/PDFMaker/ListViewError.tpl' */

/* @var Smarty_Internal_Template $_smarty_tpl */
if ($_smarty_tpl->_decodeProperties($_smarty_tpl, array (
  'version' => '4.5.5',
  'unifunc' => 'content_69514dd734f138_41500130',
  'has_nocache_code' => false,
  'file_dependency' => 
  array (
    'd33fb575ce645b00c180529c5aa443dbb97c3a4e' => 
    array (
      0 => '/var/www/CNK-DEM/layouts/v7/modules/PDFMaker/ListViewError.tpl',
      1 => 1766693999,
      2 => 'file',
    ),
  ),
  'includes' => 
  array (
  ),
),false)) {
function content_69514dd734f138_41500130 (Smarty_Internal_Template $_smarty_tpl) {
if ($_smarty_tpl->tpl_vars['EXTENSIONS_ERROR']->value) {?>
    <div class="col-sm-12 col-xs-12">
        <a class="alert alert-danger displayInlineBlock" href="index.php?module=<?php echo $_smarty_tpl->tpl_vars['MODULE']->value;?>
&view=Extensions">
            <div>
                <b style="padding-right: 15px; color: #b12d26;">
                    <?php echo vtranslate('LBL_EXTENSION_LIBRARY_ERROR',$_smarty_tpl->tpl_vars['MODULE']->value);?>
 CKEditor, PHP Simple HTML DOM, mPDF, PHPMailer
                </b>
            </div>
            <br>
            <div class="btn btn-danger"><?php echo vtranslate('LBL_EXTENSIONS',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</div>
        </a>
    </div>
<?php }
}
}
