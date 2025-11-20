<?php
/* Smarty version 4.5.5, created on 2025-08-11 11:22:58
  from '/home/vicorelie/crm.tcerenov-design.com/layouts/v7/modules/PDFMaker/ListViewError.tpl' */

/* @var Smarty_Internal_Template $_smarty_tpl */
if ($_smarty_tpl->_decodeProperties($_smarty_tpl, array (
  'version' => '4.5.5',
  'unifunc' => 'content_6899d29294cb47_06088773',
  'has_nocache_code' => false,
  'file_dependency' => 
  array (
    'b839bda7a9f9862dee94b5525a91f48e1828e55d' => 
    array (
      0 => '/home/vicorelie/crm.tcerenov-design.com/layouts/v7/modules/PDFMaker/ListViewError.tpl',
      1 => 1754577870,
      2 => 'file',
    ),
  ),
  'includes' => 
  array (
  ),
),false)) {
function content_6899d29294cb47_06088773 (Smarty_Internal_Template $_smarty_tpl) {
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
