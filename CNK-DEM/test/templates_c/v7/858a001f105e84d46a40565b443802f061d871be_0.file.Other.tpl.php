<?php
/* Smarty version 4.5.5, created on 2026-01-19 18:19:19
  from '/var/www/CNK-DEM/layouts/v7/modules/PDFMaker/tabs/Other.tpl' */

/* @var Smarty_Internal_Template $_smarty_tpl */
if ($_smarty_tpl->_decodeProperties($_smarty_tpl, array (
  'version' => '4.5.5',
  'unifunc' => 'content_696e5987568431_88493149',
  'has_nocache_code' => false,
  'file_dependency' => 
  array (
    '858a001f105e84d46a40565b443802f061d871be' => 
    array (
      0 => '/var/www/CNK-DEM/layouts/v7/modules/PDFMaker/tabs/Other.tpl',
      1 => 1766693999,
      2 => 'file',
    ),
  ),
  'includes' => 
  array (
  ),
),false)) {
function content_696e5987568431_88493149 (Smarty_Internal_Template $_smarty_tpl) {
$_smarty_tpl->_checkPlugins(array(0=>array('file'=>'/var/www/CNK-DEM/vendor/smarty/smarty/libs/plugins/function.html_options.php','function'=>'smarty_function_html_options',),));
?>
<div class="tab-pane" id="pdfContentOther">
    <div class="edit-template-content">
        <?php if ($_smarty_tpl->tpl_vars['IS_BLOCK']->value != true) {?>
            <div class="form-group" id="listview_block_tpl_row">
                <label class="control-label fieldLabel col-sm-3" style="font-weight: normal">
                    <input type="checkbox" name="is_listview" id="isListViewTmpl" <?php if ($_smarty_tpl->tpl_vars['IS_LISTVIEW_CHECKED']->value == "yes") {?>checked="checked"<?php }?> onclick="PDFMaker_EditJs.isLvTmplClicked();" title="<?php echo vtranslate('LBL_LISTVIEW_TEMPLATE',$_smarty_tpl->tpl_vars['MODULE']->value);?>
" />&nbsp;<?php echo vtranslate('LBL_LISTVIEWBLOCK',$_smarty_tpl->tpl_vars['MODULE']->value);?>
:
                </label>
                <div class="controls col-sm-9">
                    <div class="input-group">
                        <select name="listviewblocktpl" id="listviewblocktpl" class="select2 form-control" <?php if ($_smarty_tpl->tpl_vars['IS_LISTVIEW_CHECKED']->value != "yes") {?>disabled<?php }?>>
                            <?php echo smarty_function_html_options(array('options'=>$_smarty_tpl->tpl_vars['LISTVIEW_BLOCK_TPL']->value),$_smarty_tpl);?>

                        </select>
                        <div class="input-group-btn">
                            <button type="button" id="listviewblocktpl_butt" class="btn btn-success InsertIntoTemplate" data-type="listviewblocktpl" title="<?php echo vtranslate('LBL_INSERT_TO_TEXT',$_smarty_tpl->tpl_vars['MODULE']->value);?>
" <?php if ($_smarty_tpl->tpl_vars['IS_LISTVIEW_CHECKED']->value != "yes") {?>disabled<?php }?>><i class="fa fa-usd"></i></button>
                        </div>
                    </div>
                </div>
            </div>
        <?php }?>
        <div class="form-group">
            <label class="control-label fieldLabel col-sm-3" style="font-weight: normal">
                <?php echo vtranslate('TERMS_AND_CONDITIONS',$_smarty_tpl->tpl_vars['MODULE']->value);?>
:
            </label>
            <div class="controls col-sm-9">
                <div class="input-group">
                    <select name="invterandcon" id="invterandcon" class="select2 form-control">
                        <?php echo smarty_function_html_options(array('options'=>$_smarty_tpl->tpl_vars['INVENTORYTERMSANDCONDITIONS']->value),$_smarty_tpl);?>

                    </select>
                    <div class="input-group-btn">
                        <button type="button" class="btn btn-success InsertIntoTemplate" data-type="invterandcon" title="<?php echo vtranslate('LBL_INSERT_TO_TEXT',$_smarty_tpl->tpl_vars['MODULE']->value);?>
"><i class="fa fa-usd"></i></button>
                    </div>
                </div>
            </div>
        </div>
        <div class="form-group">
            <label class="control-label fieldLabel col-sm-3" style="font-weight: normal">
                <?php echo vtranslate('LBL_CURRENT_DATE',$_smarty_tpl->tpl_vars['MODULE']->value);?>
:
            </label>
            <div class="controls col-sm-9">
                <div class="input-group">
                    <select name="dateval" id="dateval" class="select2 form-control">
                        <?php echo smarty_function_html_options(array('options'=>$_smarty_tpl->tpl_vars['DATE_VARS']->value),$_smarty_tpl);?>

                    </select>
                    <div class="input-group-btn">
                        <button type="button" class="btn btn-success InsertIntoTemplate" data-type="dateval" title="<?php echo vtranslate('LBL_INSERT_TO_TEXT',$_smarty_tpl->tpl_vars['MODULE']->value);?>
"><i class="fa fa-usd"></i></button>
                    </div>
                </div>
            </div>
        </div>
                <div class="form-group">
            <label class="control-label fieldLabel col-sm-3" style="font-weight: normal">
                <?php echo vtranslate('LBL_BARCODES',$_smarty_tpl->tpl_vars['MODULE']->value);?>
:
            </label>
            <div class="controls col-sm-9">
                <div class="input-group">
                    <select name="barcodeval" id="barcodeval" class="select2 form-control">
                        <optgroup label="<?php echo vtranslate('LBL_BARCODES_TYPE1',$_smarty_tpl->tpl_vars['MODULE']->value);?>
">
                            <option value="EAN13">EAN13</option>
                            <option value="ISBN">ISBN</option>
                            <option value="ISSN">ISSN</option>
                        </optgroup>

                        <optgroup label="<?php echo vtranslate('LBL_BARCODES_TYPE2',$_smarty_tpl->tpl_vars['MODULE']->value);?>
">
                            <option value="UPCA">UPCA</option>
                            <option value="UPCE">UPCE</option>
                            <option value="EAN8">EAN8</option>
                        </optgroup>

                        <optgroup label="<?php echo vtranslate('LBL_BARCODES_TYPE3',$_smarty_tpl->tpl_vars['MODULE']->value);?>
">
                            <option value="EAN2">EAN2</option>
                            <option value="EAN5">EAN5</option>
                            <option value="EAN13P2">EAN13P2</option>
                            <option value="ISBNP2">ISBNP2</option>
                            <option value="ISSNP2">ISSNP2</option>
                            <option value="UPCAP2">UPCAP2</option>
                            <option value="UPCEP2">UPCEP2</option>
                            <option value="EAN8P2">EAN8P2</option>
                            <option value="EAN13P5">EAN13P5</option>
                            <option value="ISBNP5">ISBNP5</option>
                            <option value="ISSNP5">ISSNP5</option>
                            <option value="UPCAP5">UPCAP5</option>
                            <option value="UPCEP5">UPCEP5</option>
                            <option value="EAN8P5">EAN8P5</option>
                        </optgroup>

                        <optgroup label="<?php echo vtranslate('LBL_BARCODES_TYPE4',$_smarty_tpl->tpl_vars['MODULE']->value);?>
">
                            <option value="IMB">IMB</option>
                            <option value="RM4SCC">RM4SCC</option>
                            <option value="KIX">KIX</option>
                            <option value="POSTNET">POSTNET</option>
                            <option value="PLANET">PLANET</option>
                        </optgroup>

                        <optgroup label="<?php echo vtranslate('LBL_BARCODES_TYPE5',$_smarty_tpl->tpl_vars['MODULE']->value);?>
">
                            <option value="C128A">C128A</option>
                            <option value="C128B">C128B</option>
                            <option value="C128C">C128C</option>
                            <option value="EAN128C">EAN128C</option>
                            <option value="C39">C39</option>
                            <option value="C39+">C39+</option>
                            <option value="C39E">C39E</option>
                            <option value="C39E+">C39E+</option>
                            <option value="S25">S25</option>
                            <option value="S25+">S25+</option>
                            <option value="I25">I25</option>
                            <option value="I25+">I25+</option>
                            <option value="I25B">I25B</option>
                            <option value="I25B+">I25B+</option>
                            <option value="C93">C93</option>
                            <option value="MSI">MSI</option>
                            <option value="MSI+">MSI+</option>
                            <option value="CODABAR">CODABAR</option>
                            <option value="CODE11">CODE11</option>
                        </optgroup>

                        <optgroup label="<?php echo vtranslate('LBL_QRCODE',$_smarty_tpl->tpl_vars['MODULE']->value);?>
">
                            <option value="QR">QR</option>
                        </optgroup>

                        <optgroup label="<?php echo vtranslate('LBL_BARCODES_CUSTOM',$_smarty_tpl->tpl_vars['MODULE']->value);?>
">
                            <option value="TYPE"><?php echo vtranslate('LBL_CUSTOM_BARCODE',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</option>
                        </optgroup>
                    </select>
                    <div class="input-group-btn">
                        <button type="button" class="btn btn-success InsertIntoTemplate" data-type="barcodeval" title="<?php echo vtranslate('LBL_INSERT_BARCODE_TO_TEXT',$_smarty_tpl->tpl_vars['MODULE']->value);?>
"><i class="fa fa-usd"></i></button>&nbsp;&nbsp;
                        <div class="dropdown displayInlineBlock">
                            <button type="button" class="btn" data-toggle="dropdown">
                                <i class="fa fa-info"></i>
                            </button>
                            <div class="dropdown-menu padding15px">
                                <h5><b><?php echo vtranslate('LBL_BARCODES_CUSTOM',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</b></h5>
                                <hr>
                                <p><?php echo vtranslate('LBL_EXAMPLE',$_smarty_tpl->tpl_vars['MODULE']->value);?>
: <b>[BARCODE|TYPE=YOURCODE|BARCODE]</b></p>
                                <p><?php echo vtranslate('LBL_BARCODES_DESC1',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</p>
                                <p>
                                    <a class="btn-link" href="https://mpdf.github.io/reference/html-control-tags/barcode.html" target="_new"><i class="fa fa-link"></i> <?php echo vtranslate('LBL_MPDF_SUPPORTED_BARCODES',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</a>
                                </p>
                                <p><?php echo vtranslate('LBL_BARCODES_DESC2',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</p>
                                <p>
                                    <a class="btn-link" href="index.php?module=PDFMaker&view=IndexAjax&mode=showBarcodes" target="_new"><i class="fa fa-link"></i> <?php echo vtranslate('LBL_BARCODES_INFO',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</a>
                                </p>
                                <hr>
                                <p><?php echo vtranslate('LBL_EXAMPLE',$_smarty_tpl->tpl_vars['MODULE']->value);?>
: <b>[BARCODE|TYPE=YOURCODE|size=1|height=1|text=1|BARCODE]</b></p>
                                <p><?php echo vtranslate('LBL_BARCODES_DESC3',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</p>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
        <?php if ($_smarty_tpl->tpl_vars['VERSION_TYPE']->value == 'professional') {?>
            <div class="form-group">
                <label class="control-label fieldLabel col-sm-3" style="font-weight: normal">
                    <?php echo vtranslate('CUSTOM_FUNCTIONS',$_smarty_tpl->tpl_vars['MODULE']->value);?>
:
                </label>
                <div class="controls col-sm-9">
                    <div class="input-group">
                        <select name="customfunction" id="customfunction" class="select2 form-control">
                            <?php echo smarty_function_html_options(array('options'=>$_smarty_tpl->tpl_vars['CUSTOM_FUNCTIONS']->value),$_smarty_tpl);?>

                        </select>
                        <div class="input-group-btn">
                            <button type="button" class="btn btn-success InsertIntoTemplate" data-type="customfunction" title="<?php echo vtranslate('LBL_INSERT_TO_TEXT',$_smarty_tpl->tpl_vars['MODULE']->value);?>
"><i class="fa fa-usd"></i></button>
                        </div>
                    </div>
                </div>
            </div>
        <?php }?>
        <div class="form-group">
            <label class="control-label fieldLabel col-sm-3" style="font-weight: normal">
                <?php echo vtranslate('LBL_FONT_AWESOME',$_smarty_tpl->tpl_vars['MODULE']->value);?>
:
            </label>
            <div class="controls col-sm-9">
                <div class="input-group">
                    <select name="fontawesomeicons" id="fontawesomeicons" class="select2 form-control">
                        <?php
$_from = $_smarty_tpl->smarty->ext->_foreach->init($_smarty_tpl, $_smarty_tpl->tpl_vars['FONTAWESOMEICONS']->value, 'FONTAWESOMEDATA');
$_smarty_tpl->tpl_vars['FONTAWESOMEDATA']->do_else = true;
if ($_from !== null) foreach ($_from as $_smarty_tpl->tpl_vars['FONTAWESOMEDATA']->value) {
$_smarty_tpl->tpl_vars['FONTAWESOMEDATA']->do_else = false;
?>
                            <?php if ($_smarty_tpl->tpl_vars['SELECTEDFONTAWESOMEICON']->value == '') {
$_smarty_tpl->_assignInScope('SELECTEDFONTAWESOMEICON', $_smarty_tpl->tpl_vars['FONTAWESOMEDATA']->value['name']);
}?>
                            <option value="<?php echo $_smarty_tpl->tpl_vars['FONTAWESOMEDATA']->value['code'];?>
" data-classname="<?php echo $_smarty_tpl->tpl_vars['FONTAWESOMEDATA']->value['name'];?>
" <?php if ($_smarty_tpl->tpl_vars['SELECTEDFONTAWESOMEICON']->value == $_smarty_tpl->tpl_vars['FONTAWESOMEDATA']->value['name']) {?>selected="selected"<?php }?>><?php echo $_smarty_tpl->tpl_vars['FONTAWESOMEDATA']->value['name'];?>
</option>
                        <?php
}
$_smarty_tpl->smarty->ext->_foreach->restore($_smarty_tpl, 1);?>

                    </select>
                    <div class="input-group-btn">
                        <button type="button" class="btn btn-warning InsertIconIntoTemplate" data-type="awesomeicon" title="<?php echo vtranslate('LBL_INSERT_TO_TEXT',$_smarty_tpl->tpl_vars['MODULE']->value);?>
"><i id="fontawesomepreview" class="fa <?php echo $_smarty_tpl->tpl_vars['SELECTEDFONTAWESOMEICON']->value;?>
"></i></button><a href="index.php?module=PDFMaker&view=IndexAjax&mode=getAwesomeInfoPDF" target="_new"><button type="button" class="btn"><i class="fa fa-info"></i></button></a>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div><?php }
}
