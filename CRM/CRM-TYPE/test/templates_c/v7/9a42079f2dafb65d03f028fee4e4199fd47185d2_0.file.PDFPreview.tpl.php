<?php
/* Smarty version 4.5.5, created on 2025-11-14 10:40:45
  from '/var/www/CRM/CRM-TYPE/layouts/v7/modules/PDFMaker/PDFPreview.tpl' */

/* @var Smarty_Internal_Template $_smarty_tpl */
if ($_smarty_tpl->_decodeProperties($_smarty_tpl, array (
  'version' => '4.5.5',
  'unifunc' => 'content_6917072debd826_32969194',
  'has_nocache_code' => false,
  'file_dependency' => 
  array (
    '9a42079f2dafb65d03f028fee4e4199fd47185d2' => 
    array (
      0 => '/var/www/CRM/CRM-TYPE/layouts/v7/modules/PDFMaker/PDFPreview.tpl',
      1 => 1763112789,
      2 => 'file',
    ),
  ),
  'includes' => 
  array (
  ),
),false)) {
function content_6917072debd826_32969194 (Smarty_Internal_Template $_smarty_tpl) {
?><div class="modal-dialog modal-lg"><div class="modal-content"><div class="filePreview container-fluid"><div class="modal-header row"><div class="filename col-lg-8"><h4 class="textOverflowEllipsis maxWidth50" title="<?php echo vtranslate('LBL_PREVIEW',$_smarty_tpl->tpl_vars['MODULE']->value);?>
"><b><?php echo vtranslate('LBL_PREVIEW',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</b></h4></div><div class="col-lg-1 pull-right"><button type="button" class="close" aria-label="Close" data-dismiss="modal"><span aria-hidden="true" class='fa fa-close'></span></button></div></div><div class="modal-body row" style="height:550px;"><input type="hidden" name="commontemplateid" value='<?php echo $_smarty_tpl->tpl_vars['COMMONTEMPLATEIDS']->value;?>
' /><iframe id='PDFMakerPreviewContent' src="<?php echo $_smarty_tpl->tpl_vars['FILE_PATH']->value;?>
" data-desc="<?php echo $_smarty_tpl->tpl_vars['FILE_PATH']->value;?>
" height="100%" width="100%"></iframe></div></div><div class="modal-footer"><div class='clearfix modal-footer-overwrite-style'><div class="row clearfix "><div class=' textAlignCenter col-lg-12 col-md-12 col-sm-12 '><button type='button' class='btn btn-success downloadButton' data-desc="<?php echo $_smarty_tpl->tpl_vars['DOWNLOAD_URL']->value;?>
"><i title="<?php echo vtranslate('LBL_EXPORT','PDFMaker');?>
" class="fa fa-download"></i>&nbsp;<strong><?php echo vtranslate('LBL_DOWNLOAD_FILE',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</strong></button>&nbsp;&nbsp;<?php if ($_smarty_tpl->tpl_vars['PRINT_ACTION']->value == "1") {?><button type='button' class='btn btn-success printButton'><i class="fa fa-print" aria-hidden="true"></i>&nbsp;<strong><?php echo vtranslate('LBL_PRINT',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</strong></button>&nbsp;&nbsp;<?php }
if ($_smarty_tpl->tpl_vars['SEND_EMAIL_PDF_ACTION']->value == "1") {?><button type='button' class='btn btn-success sendEmailWithPDF' data-sendtype="<?php echo $_smarty_tpl->tpl_vars['SEND_EMAIL_PDF_ACTION_TYPE']->value;?>
"><i class="fa fa-send" aria-hidden="true"></i>&nbsp;<strong><?php echo vtranslate('LBL_SEND_EMAIL');?>
</strong></button>&nbsp;&nbsp;<?php }
if ($_smarty_tpl->tpl_vars['EDIT_AND_EXPORT_ACTION']->value == "1") {?><button type='button' <?php if ($_smarty_tpl->tpl_vars['DISABLED_EXPORT_EDIT']->value) {?>disabled="disabled"<?php }?> class='btn btn-success editPDF'><i class="fa fa-edit" aria-hidden="true"></i>&nbsp;<strong><?php echo vtranslate('LBL_EDIT');?>
</strong></button>&nbsp;&nbsp;<?php }
if ($_smarty_tpl->tpl_vars['SAVE_AS_DOC_ACTION']->value == "1") {?><button type='button' class='btn btn-success savePDFToDoc'><i class="fa fa-save" aria-hidden="true"></i>&nbsp;<strong><?php echo vtranslate('LBL_SAVEASDOC','PDFMaker');?>
</strong></button>&nbsp;&nbsp;<?php }?><a class='cancelLink' href="javascript:void(0);" type="reset" data-dismiss="modal"><?php echo vtranslate('LBL_CANCEL',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</a></div></div></div></div></div></div><?php }
}
