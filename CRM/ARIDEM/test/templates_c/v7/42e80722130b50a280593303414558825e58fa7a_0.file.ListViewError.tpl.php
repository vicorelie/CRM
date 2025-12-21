<?php
/* Smarty version 4.5.5, created on 2025-12-07 21:00:54
  from '/var/www/CRM/ARIDEM/layouts/v7/modules/PDFMaker/ListViewError.tpl' */

/* @var Smarty_Internal_Template $_smarty_tpl */
if ($_smarty_tpl->_decodeProperties($_smarty_tpl, array (
  'version' => '4.5.5',
  'unifunc' => 'content_6935eb06b470e7_38347796',
  'has_nocache_code' => false,
  'file_dependency' => 
  array (
    '42e80722130b50a280593303414558825e58fa7a' => 
    array (
      0 => '/var/www/CRM/ARIDEM/layouts/v7/modules/PDFMaker/ListViewError.tpl',
      1 => 1765057370,
      2 => 'file',
    ),
  ),
  'includes' => 
  array (
  ),
),false)) {
function content_6935eb06b470e7_38347796 (Smarty_Internal_Template $_smarty_tpl) {
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
