<?php
/* Smarty version 4.5.5, created on 2025-11-23 20:09:49
  from '/var/www/CRM/ARIDEM/layouts/v7/modules/PDFMaker/Install.tpl' */

/* @var Smarty_Internal_Template $_smarty_tpl */
if ($_smarty_tpl->_decodeProperties($_smarty_tpl, array (
  'version' => '4.5.5',
  'unifunc' => 'content_69236a0d8585c8_87481186',
  'has_nocache_code' => false,
  'file_dependency' => 
  array (
    '22235f5d9cd6b9e8a75dbd1c0d58dac1b21e71d2' => 
    array (
      0 => '/var/www/CRM/ARIDEM/layouts/v7/modules/PDFMaker/Install.tpl',
      1 => 1763928225,
      2 => 'file',
    ),
  ),
  'includes' => 
  array (
  ),
),false)) {
function content_69236a0d8585c8_87481186 (Smarty_Internal_Template $_smarty_tpl) {
?>
<div style="width: 80%; max-width: 1000px; padding: 15px; margin: 0 auto;">
    <div class="modal-content">
        <div class="modal-header">
            <h4><?php echo vtranslate('LBL_MODULE_NAME','PDFMaker');?>
 <?php echo vtranslate('LBL_INSTALL','PDFMaker');?>
</h4>
        </div>
        <form name="install" id="editLicense" method="POST" action="index.php" class="form-horizontal">
            <input type="hidden" name="module" value="PDFMaker"/>
            <input type="hidden" name="view" value="List"/>
            <div class="modal-body">
                <input type="hidden" name="installtype" value="download_src"/>
                <div class="controls">
                    <div>
                        <strong><?php echo vtranslate('LBL_DOWNLOAD_SRC','PDFMaker');?>
</strong>
                    </div>
                    <br>
                    <div class="clearfix">
                    </div>
                </div>
                <div class="controls">
                    <div>
                        <?php echo vtranslate('LBL_DOWNLOAD_SRC_DESC','PDFMaker');?>

                        <?php if ($_smarty_tpl->tpl_vars['MB_STRING_EXISTS']->value == 'false') {?>
                            <br>
                            <?php echo vtranslate('LBL_MB_STRING_ERROR','PDFMaker');?>

                        <?php }?>
                    </div>
                    <br>
                    <div class="clearfix">
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <div style="text-align: center;">
                    <button type="button" id="download_button" class="btn btn-success">
                        <strong><?php echo vtranslate('LBL_DOWNLOAD','PDFMaker');?>
</strong>
                    </button>&nbsp;&nbsp;
                </div>
            </div>
        </form>
    </div>
</div><?php }
}
