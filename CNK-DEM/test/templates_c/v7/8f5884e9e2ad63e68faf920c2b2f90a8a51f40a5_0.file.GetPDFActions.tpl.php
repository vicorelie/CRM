<?php
/* Smarty version 4.5.5, created on 2025-12-21 04:55:08
  from '/var/www/CNK-DEM/layouts/v7/modules/PDFMaker/GetPDFActions.tpl' */

/* @var Smarty_Internal_Template $_smarty_tpl */
if ($_smarty_tpl->_decodeProperties($_smarty_tpl, array (
  'version' => '4.5.5',
  'unifunc' => 'content_69477daca01be8_16665942',
  'has_nocache_code' => false,
  'file_dependency' => 
  array (
    '8f5884e9e2ad63e68faf920c2b2f90a8a51f40a5' => 
    array (
      0 => '/var/www/CNK-DEM/layouts/v7/modules/PDFMaker/GetPDFActions.tpl',
      1 => 1765893765,
      2 => 'file',
    ),
  ),
  'includes' => 
  array (
  ),
),false)) {
function content_69477daca01be8_16665942 (Smarty_Internal_Template $_smarty_tpl) {
$_smarty_tpl->_checkPlugins(array(0=>array('file'=>'/var/www/CNK-DEM/vendor/smarty/smarty/libs/plugins/function.html_options.php','function'=>'smarty_function_html_options',),));
if ($_smarty_tpl->tpl_vars['ENABLE_PDFMAKER']->value == 'true') {?>
        <li>
        <a href="javascript:;" class="PDFMakerDownloadPDF PDFMakerTemplateAction"><i title="<?php echo vtranslate('LBL_EXPORT','PDFMaker');?>
" class="fa fa-download"></i>&nbsp;<?php echo vtranslate('LBL_EXPORT','PDFMaker');?>
</a>
    </li>
        <li>
        <a href="javascript:;" class="PDFModalPreview PDFMakerTemplateAction"><i title="<?php echo vtranslate('LBL_EXPORT','PDFMaker');?>
" class="fa fa-file-pdf-o"></i>&nbsp;<?php echo vtranslate('LBL_PREVIEW','PDFMaker');?>
</a>
    </li>
        <?php if ($_smarty_tpl->tpl_vars['SEND_EMAIL_PDF_ACTION']->value == "1") {?>
        <li>
            <a href="javascript:;" class="sendEmailWithPDF PDFMakerTemplateAction" data-sendtype="<?php echo $_smarty_tpl->tpl_vars['SEND_EMAIL_PDF_ACTION_TYPE']->value;?>
"><i class="fa fa-send" aria-hidden="true"></i>&nbsp;<?php echo vtranslate('LBL_SEND_EMAIL');?>
</a>
        </li>
    <?php }?>
        <?php if ($_smarty_tpl->tpl_vars['EDIT_AND_EXPORT_ACTION']->value == "1") {?>
        <li>
            <a href="javascript:;" class="editPDF PDFMakerTemplateAction"><i class="fa fa-edit" aria-hidden="true"></i>&nbsp;<?php echo vtranslate('LBL_EDIT');?>
 <?php echo vtranslate('LBL_AND');?>
 <?php echo vtranslate('LBL_EXPORT','PDFMaker');?>
</a>
        </li>
    <?php }?>
        <?php if ($_smarty_tpl->tpl_vars['SAVE_AS_DOC_ACTION']->value == "1") {?>
        <li>
            <a href="javascript:;" class="savePDFToDoc PDFMakerTemplateAction"><i class="fa fa-save" aria-hidden="true"></i>&nbsp;<?php echo vtranslate('LBL_SAVEASDOC','PDFMaker');?>
</a>
        </li>
    <?php }?>
        <?php if ($_smarty_tpl->tpl_vars['EXPORT_TO_RTF_ACTION']->value == "1") {?>
        <li>
            <a href="javascript:;" class="PDFMakerTemplateAction"><?php echo vtranslate('LBL_EXPORT_TO_RTF','PDFMaker');?>
</a>
        </li>
    <?php }?>
    <li class="dropdown-header">
        <span class="fa fa-wrench" aria-hidden="true" title="<?php echo vtranslate('LBL_SETTINGS','PDFMaker');?>
"></span> <?php echo vtranslate('LBL_SETTINGS','PDFMaker');?>

    </li>
        <?php if ($_smarty_tpl->tpl_vars['MODULE']->value == 'Invoice' || $_smarty_tpl->tpl_vars['MODULE']->value == 'SalesOrder' || $_smarty_tpl->tpl_vars['MODULE']->value == 'PurchaseOrder' || $_smarty_tpl->tpl_vars['MODULE']->value == 'Quotes' || $_smarty_tpl->tpl_vars['MODULE']->value == 'Receiptcards' || $_smarty_tpl->tpl_vars['MODULE']->value == 'Issuecards') {?>
        <li>
            <a href="javascript:;" class="showPDFBreakline"><?php echo vtranslate('LBL_PRODUCT_BREAKLINE','PDFMaker');?>
</a>
        </li>
    <?php }?>
    <?php if ($_smarty_tpl->tpl_vars['MODULE']->value == 'Invoice' || $_smarty_tpl->tpl_vars['MODULE']->value == 'SalesOrder' || $_smarty_tpl->tpl_vars['MODULE']->value == 'PurchaseOrder' || $_smarty_tpl->tpl_vars['MODULE']->value == 'Quotes' || $_smarty_tpl->tpl_vars['MODULE']->value == 'Receiptcards' || $_smarty_tpl->tpl_vars['MODULE']->value == 'Issuecards' || $_smarty_tpl->tpl_vars['MODULE']->value == 'Products') {?>
    <li>
        <a href="javascript:;" class="showProductImages"><?php echo vtranslate('LBL_PRODUCT_IMAGE','PDFMaker');?>
</a>
    </li>
    <?php }?>

    <?php if (sizeof($_smarty_tpl->tpl_vars['TEMPLATE_LANGUAGES']->value) > 1) {?>
        <li class="dropdown-header">
            <i class="fa fa-language" title="<?php echo vtranslate('LBL_PDF_LANGUAGE','PDFMaker');?>
"></i> <?php echo vtranslate('LBL_PDF_LANGUAGE','PDFMaker');?>

        </li>
        <li>
            <select name="template_language" id="template_language" class="col-lg-12">
                <?php echo smarty_function_html_options(array('options'=>$_smarty_tpl->tpl_vars['TEMPLATE_LANGUAGES']->value,'selected'=>$_smarty_tpl->tpl_vars['CURRENT_LANGUAGE']->value),$_smarty_tpl);?>

            </select>
        </li>
    <?php } else { ?>
        <?php
$_from = $_smarty_tpl->smarty->ext->_foreach->init($_smarty_tpl, ((string)$_smarty_tpl->tpl_vars['TEMPLATE_LANGUAGES']->value), 'lang', false, 'lang_key');
$_smarty_tpl->tpl_vars['lang']->do_else = true;
if ($_from !== null) foreach ($_from as $_smarty_tpl->tpl_vars['lang_key']->value => $_smarty_tpl->tpl_vars['lang']->value) {
$_smarty_tpl->tpl_vars['lang']->do_else = false;
?>
            <input type="hidden" name="template_language" id="template_language" value="<?php echo $_smarty_tpl->tpl_vars['lang_key']->value;?>
"/>
        <?php
}
$_smarty_tpl->smarty->ext->_foreach->restore($_smarty_tpl, 1);?>
    <?php }
} else { ?>
    <div class="row-fluid">
        <div class="span10">
            <ul class="nav nav-list">
                <li><a href="index.php?module=PDFMaker&view=List"><?php echo vtranslate('LBL_PLEASE_FINISH_INSTALLATION','PDFMaker');?>
</a></li>
            </ul>
        </div>
    </div>
<?php }
}
}
