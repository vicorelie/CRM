<?php
/* Smarty version 4.5.5, created on 2025-11-23 19:42:15
  from '/var/www/CRM/ARIDEM/layouts/v7/modules/PDFMaker/ModalEditAndExport.tpl' */

/* @var Smarty_Internal_Template $_smarty_tpl */
if ($_smarty_tpl->_decodeProperties($_smarty_tpl, array (
  'version' => '4.5.5',
  'unifunc' => 'content_692363971e0387_20422701',
  'has_nocache_code' => false,
  'file_dependency' => 
  array (
    '1b4a437ace98cf59e6972f7f4c3c590c67e30487' => 
    array (
      0 => '/var/www/CRM/ARIDEM/layouts/v7/modules/PDFMaker/ModalEditAndExport.tpl',
      1 => 1763658019,
      2 => 'file',
    ),
  ),
  'includes' => 
  array (
  ),
),false)) {
function content_692363971e0387_20422701 (Smarty_Internal_Template $_smarty_tpl) {
?><div class="modal-dialog modal-lg"><div class="modal-content"><div class="filePreview container-fluid"><div class="modal-header row"><div class="filename col-lg-8"><h4 class="textOverflowEllipsis maxWidth50" title="<?php echo $_smarty_tpl->tpl_vars['FILE_NAME']->value;?>
"><b><?php echo vtranslate('LBL_EDIT');?>
</b></h4></div><div class="col-lg-1 pull-right"><button type="button" class="close" aria-label="Close" data-dismiss="modal"><span aria-hidden="true" class='fa fa-close'></span></button></div></div><div class="modal-body row" style="height:550px;"><div id="composePDFContainer tabbable ui-sortable"><form class="form-horizontal recordEditView" id="editPDFForm" method="post" action="index.php" enctype="multipart/form-data" name="editPDFForm"><input type="hidden" name="action" id="action" value='CreatePDFFromTemplate' /><input type="hidden" name="module" value="PDFMaker"/><input type="hidden" name="commontemplateid" value='<?php echo $_smarty_tpl->tpl_vars['COMMONTEMPLATEIDS']->value;?>
' /><input type="hidden" name="template_ids" value='<?php echo $_smarty_tpl->tpl_vars['COMMONTEMPLATEIDS']->value;?>
' /><input type="hidden" name="idslist" value="<?php echo $_smarty_tpl->tpl_vars['RECORDS']->value;?>
" /><input type="hidden" name="relmodule" value="<?php echo $_REQUEST['formodule'];?>
" /><input type="hidden" name="language" value='<?php echo $_REQUEST['language'];?>
' /><input type="hidden" name="pmodule" value="<?php echo $_REQUEST['formodule'];?>
" /><input type="hidden" name="pid" value="<?php echo $_REQUEST['record'];?>
" /><input type="hidden" name="mode" value="edit" /><input type="hidden" name="print" value="" /><div id='editTemplate'><div class="row"><div class="col-xs-6"><ul class="nav nav-pills"><li class="active" data-type="body"><a data-toggle="tab" href="#pdfbodyTabA" aria-expanded="true"><strong>&nbsp;<?php echo vtranslate('LBL_BODY',$_smarty_tpl->tpl_vars['MODULE']->value);?>
&nbsp;</strong></a></li><li class="" data-type="header"><a data-toggle="tab" href="#pdfheaderTabA" aria-expanded="true"><strong>&nbsp;<?php echo vtranslate('LBL_HEADER_TAB',$_smarty_tpl->tpl_vars['MODULE']->value);?>
&nbsp;</strong></a></li><li class="" data-type="footer"><a data-toggle="tab" href="#pdffooterTabA" aria-expanded="true"><strong>&nbsp;<?php echo vtranslate('LBL_FOOTER_TAB',$_smarty_tpl->tpl_vars['MODULE']->value);?>
&nbsp;</strong></a></li></ul></div><div class="col-xs-6"><?php echo vtranslate('LBL_TEMPLATE','PDFMaker');?>
:&nbsp;<?php echo $_smarty_tpl->tpl_vars['TEMPLATE_SELECT']->value;?>
</div></div><br><div class="tab-content"><?php
$_from = $_smarty_tpl->smarty->ext->_foreach->init($_smarty_tpl, $_smarty_tpl->tpl_vars['PDF_SECTIONS']->value, 'section', false, NULL, 'sections', array (
  'index' => true,
));
$_smarty_tpl->tpl_vars['section']->do_else = true;
if ($_from !== null) foreach ($_from as $_smarty_tpl->tpl_vars['section']->value) {
$_smarty_tpl->tpl_vars['section']->do_else = false;
$_smarty_tpl->tpl_vars['__smarty_foreach_sections']->value['index']++;
?><div id="pdf<?php echo $_smarty_tpl->tpl_vars['section']->value;?>
TabA" class="tab-pane <?php ob_start();
echo (isset($_smarty_tpl->tpl_vars['__smarty_foreach_sections']->value['index']) ? $_smarty_tpl->tpl_vars['__smarty_foreach_sections']->value['index'] : null);
$_prefixVariable1 = ob_get_clean();
if ($_prefixVariable1 == 0) {?>active<?php }?>" data-section="<?php echo $_smarty_tpl->tpl_vars['section']->value;?>
"><?php ob_start();
echo $_smarty_tpl->tpl_vars['section']->value;
$_prefixVariable2 = ob_get_clean();
$_from = $_smarty_tpl->smarty->ext->_foreach->init($_smarty_tpl, $_smarty_tpl->tpl_vars['PDF_CONTENTS']->value[$_prefixVariable2], 'pdfcontent', false, 'templateid', 'pdfcontent', array (
));
$_smarty_tpl->tpl_vars['pdfcontent']->do_else = true;
if ($_from !== null) foreach ($_from as $_smarty_tpl->tpl_vars['templateid']->value => $_smarty_tpl->tpl_vars['pdfcontent']->value) {
$_smarty_tpl->tpl_vars['pdfcontent']->do_else = false;
?><div class="pdfcontent<?php echo $_smarty_tpl->tpl_vars['templateid']->value;?>
 <?php if ($_smarty_tpl->tpl_vars['DEFAULT_TEMPLATEID']->value != $_smarty_tpl->tpl_vars['templateid']->value) {?>hide<?php }?>" id="<?php echo $_smarty_tpl->tpl_vars['section']->value;?>
_div<?php echo $_smarty_tpl->tpl_vars['templateid']->value;?>
"><textarea name="<?php echo $_smarty_tpl->tpl_vars['section']->value;
echo $_smarty_tpl->tpl_vars['templateid']->value;?>
" id="<?php echo $_smarty_tpl->tpl_vars['section']->value;
echo $_smarty_tpl->tpl_vars['templateid']->value;?>
" style="height:470px" class="inputElement textAreaElement col-lg-12" tabindex="5"><?php echo $_smarty_tpl->tpl_vars['pdfcontent']->value;?>
</textarea></div><?php
}
$_smarty_tpl->smarty->ext->_foreach->restore($_smarty_tpl, 1);?></div><?php
}
$_smarty_tpl->smarty->ext->_foreach->restore($_smarty_tpl, 1);?></div><?php echo $_smarty_tpl->tpl_vars['PDF_DIVS']->value;?>
</div></form></div><div class="hide"><textarea id="ckeditorFontsFaces"><?php echo $_smarty_tpl->tpl_vars['FONTS_FACES']->value;?>
</textarea><input type="hidden" id="ckeditorFonts" value="<?php echo $_smarty_tpl->tpl_vars['FONTS']->value;?>
"></div></div></div><div class="modal-footer"><div class='clearfix modal-footer-overwrite-style'><div class="row clearfix "><div class=' textAlignCenter col-lg-12 col-md-12 col-sm-12'><button type='submit' class='btn btn-success downloadButton' data-desc="<?php echo $_smarty_tpl->tpl_vars['DOWNLOAD_URL']->value;?>
"><?php echo vtranslate('LBL_DOWNLOAD_FILE',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</button>&nbsp;&nbsp;<?php if ($_smarty_tpl->tpl_vars['PRINT_ACTION']->value == "1") {?><button type='button' class='btn btn-success printButton'><?php echo vtranslate('LBL_PRINT',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</button>&nbsp;&nbsp;<?php }
if ($_smarty_tpl->tpl_vars['SEND_EMAIL_PDF_ACTION']->value == "1") {?><button type='button' class='btn btn-success sendEmailWithPDF'><?php echo vtranslate('LBL_SEND_EMAIL');?>
</button>&nbsp;&nbsp;<?php }
if ($_smarty_tpl->tpl_vars['SAVE_AS_DOC_ACTION']->value == "1") {?><button type='button' class='btn btn-success savePDFToDoc'><?php echo vtranslate('LBL_SAVEASDOC','PDFMaker');?>
</button>&nbsp;&nbsp;<?php }?><a class='cancelLink' href="javascript:void(0);" type="reset" data-dismiss="modal"><?php echo vtranslate('LBL_CANCEL',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</a></div></div></div></div></div></div><?php }
}
