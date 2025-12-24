<?php
/* Smarty version 4.5.5, created on 2025-12-21 13:28:48
  from '/var/www/CNK-DEM/layouts/v7/modules/PDFMaker/tabs/Properties.tpl' */

/* @var Smarty_Internal_Template $_smarty_tpl */
if ($_smarty_tpl->_decodeProperties($_smarty_tpl, array (
  'version' => '4.5.5',
  'unifunc' => 'content_6947f610c683c7_05663031',
  'has_nocache_code' => false,
  'file_dependency' => 
  array (
    '928d3ce69cbf2b5acabb5b0276bea524183ad84f' => 
    array (
      0 => '/var/www/CNK-DEM/layouts/v7/modules/PDFMaker/tabs/Properties.tpl',
      1 => 1765893765,
      2 => 'file',
    ),
  ),
  'includes' => 
  array (
  ),
),false)) {
function content_6947f610c683c7_05663031 (Smarty_Internal_Template $_smarty_tpl) {
$_smarty_tpl->_checkPlugins(array(0=>array('file'=>'/var/www/CNK-DEM/vendor/smarty/smarty/libs/plugins/function.html_options.php','function'=>'smarty_function_html_options',),));
?>
<div class="tab-pane" id="editTabProperties">
    <div id="properties_div" class="edit-template-content">
                <div class="form-group">
            <label class="control-label fieldLabel col-sm-3" style="font-weight: normal">
                <?php echo vtranslate('LBL_PDF_FORMAT',$_smarty_tpl->tpl_vars['MODULE']->value);?>
:
            </label>
            <div class="controls col-sm-9">
                <select name="pdf_format" id="pdf_format" class="select2 col-sm-12" onchange="PDFMaker_EditJs.CustomFormat();">
                    <?php echo smarty_function_html_options(array('options'=>$_smarty_tpl->tpl_vars['FORMATS']->value,'selected'=>$_smarty_tpl->tpl_vars['SELECT_FORMAT']->value),$_smarty_tpl);?>

                </select>
                <table class="table showInlineTable" id="custom_format_table" <?php if ($_smarty_tpl->tpl_vars['SELECT_FORMAT']->value != 'Custom') {?>style="display:none"<?php }?>>
                    <tr>
                        <td align="right" nowrap><?php echo vtranslate('LBL_WIDTH',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</td>
                        <td>
                            <input type="text" name="pdf_format_width" id="pdf_format_width" class="inputElement" value="<?php echo $_smarty_tpl->tpl_vars['CUSTOM_FORMAT']->value['width'];?>
" style="width:50px">
                        </td>
                        <td align="right" nowrap><?php echo vtranslate('LBL_HEIGHT',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</td>
                        <td>
                            <input type="text" name="pdf_format_height" id="pdf_format_height" class="inputElement" value="<?php echo $_smarty_tpl->tpl_vars['CUSTOM_FORMAT']->value['height'];?>
" style="width:50px">
                        </td>
                    </tr>
                </table>
            </div>
        </div>
                <div class="form-group">
            <label class="control-label fieldLabel col-sm-3" style="font-weight: normal">
                <?php echo vtranslate('LBL_PDF_ORIENTATION',$_smarty_tpl->tpl_vars['MODULE']->value);?>
:
            </label>
            <div class="controls col-sm-9">
                <select name="pdf_orientation" id="pdf_orientation" class="select2 col-sm-12">
                    <?php echo smarty_function_html_options(array('options'=>$_smarty_tpl->tpl_vars['ORIENTATIONS']->value,'selected'=>$_smarty_tpl->tpl_vars['SELECT_ORIENTATION']->value),$_smarty_tpl);?>

                </select>
            </div>
        </div>
                <?php $_smarty_tpl->_assignInScope('margin_input_width', '50px');?>
        <?php $_smarty_tpl->_assignInScope('margin_label_width', '50px');?>
        <div class="form-group">
            <label class="control-label fieldLabel col-sm-3" style="font-weight: normal">
                <?php echo vtranslate('LBL_MARGINS',$_smarty_tpl->tpl_vars['MODULE']->value);?>
:
            </label>
            <div class="controls col-sm-9">
                <table class="table table-bordered">
                    <tr>
                        <td align="right" nowrap><?php echo vtranslate('LBL_TOP',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</td>
                        <td>
                            <input type="text" name="margin_top" id="margin_top" class="inputElement" value="<?php echo $_smarty_tpl->tpl_vars['MARGINS']->value['top'];?>
" style="width:<?php echo $_smarty_tpl->tpl_vars['margin_input_width']->value;?>
" onKeyUp="PDFMaker_EditJs.ControlNumber('margin_top', false);">
                        </td>
                    </tr>
                    <tr>
                        <td align="right" nowrap><?php echo vtranslate('LBL_BOTTOM',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</td>
                        <td>
                            <input type="text" name="margin_bottom" id="margin_bottom" class="inputElement" value="<?php echo $_smarty_tpl->tpl_vars['MARGINS']->value['bottom'];?>
" style="width:<?php echo $_smarty_tpl->tpl_vars['margin_input_width']->value;?>
" onKeyUp="PDFMaker_EditJs.ControlNumber('margin_bottom', false);">
                        </td>
                    </tr>
                    <tr>
                        <td align="right" nowrap><?php echo vtranslate('LBL_LEFT',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</td>
                        <td>
                            <input type="text" name="margin_left"  id="margin_left" class="inputElement" value="<?php echo $_smarty_tpl->tpl_vars['MARGINS']->value['left'];?>
" style="width:<?php echo $_smarty_tpl->tpl_vars['margin_input_width']->value;?>
" onKeyUp="PDFMaker_EditJs.ControlNumber('margin_left', false);">
                        </td>
                    </tr>
                    <tr>
                        <td align="right" nowrap><?php echo vtranslate('LBL_RIGHT',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</td>
                        <td>
                            <input type="text" name="margin_right" id="margin_right" class="inputElement" value="<?php echo $_smarty_tpl->tpl_vars['MARGINS']->value['right'];?>
" style="width:<?php echo $_smarty_tpl->tpl_vars['margin_input_width']->value;?>
" onKeyUp="PDFMaker_EditJs.ControlNumber('margin_right', false);">
                        </td>
                    </tr>
                </table>
            </div>
        </div>
                <div class="form-group">
            <label class="control-label fieldLabel col-sm-3" style="font-weight: normal">
                <?php echo vtranslate('LBL_DECIMALS',$_smarty_tpl->tpl_vars['MODULE']->value);?>
:
            </label>
            <div class="controls col-sm-9">
                <table class="table table-bordered">
                    <tr>
                        <td align="right" nowrap><?php echo vtranslate('LBL_DEC_POINT',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</td>
                        <td><input type="text" maxlength="2" name="dec_point" class="inputElement" value="<?php echo $_smarty_tpl->tpl_vars['DECIMALS']->value['point'];?>
" style="width:<?php echo $_smarty_tpl->tpl_vars['margin_input_width']->value;?>
"/></td>
                    </tr>
                    <tr>
                        <td align="right" nowrap><?php echo vtranslate('LBL_DEC_DECIMALS',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</td>
                        <td><input type="text" maxlength="2" name="dec_decimals" class="inputElement" value="<?php echo $_smarty_tpl->tpl_vars['DECIMALS']->value['decimals'];?>
" style="width:<?php echo $_smarty_tpl->tpl_vars['margin_input_width']->value;?>
"/></td>
                    </tr>
                    <tr>
                        <td align="right" nowrap><?php echo vtranslate('LBL_DEC_THOUSANDS',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</td>
                        <td><input type="text" maxlength="2" name="dec_thousands" class="inputElement" value="<?php echo $_smarty_tpl->tpl_vars['DECIMALS']->value['thousands'];?>
" style="width:<?php echo $_smarty_tpl->tpl_vars['margin_input_width']->value;?>
"/></td>
                    </tr>
                    <tr>
                        <td align="right" nowrap><?php echo vtranslate('Truncate Trailing Zeros',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</td>
                        <td><input type="checkbox" value="1" name="dec_truncate_zero" class="inputElement" <?php if ($_smarty_tpl->tpl_vars['PDF_TEMPLATE_RESULT']->value['truncate_zero']) {?>checked<?php }?> /></td>
                    </tr>
                </table>
            </div>
        </div>
                <div class="form-group">
            <label class="control-label fieldLabel col-sm-3" style="font-weight: normal">
                <?php echo vtranslate('LBL_CURRENCY_FORMAT',$_smarty_tpl->tpl_vars['MODULE']->value);?>
:
            </label>
            <div class="controls col-sm-9">
                <table class="table table-bordered">
                    <tr>
                        <td align="right" nowrap><?php echo vtranslate('LBL_CURRENCY_ACTIVE',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</td>
                        <td><input type="checkbox" maxlength="2" name="is_currency" <?php if ($_smarty_tpl->tpl_vars['PDF_TEMPLATE_RESULT']->value['is_currency']) {?>checked<?php }?>></td>
                    </tr>
                    <tr>
                        <td align="right" nowrap><?php echo vtranslate('LBL_DEC_POINT',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</td>
                        <td><input type="text" maxlength="2" name="currency_point" class="inputElement" value="<?php echo $_smarty_tpl->tpl_vars['PDF_TEMPLATE_RESULT']->value['currency_point'];?>
" style="width:<?php echo $_smarty_tpl->tpl_vars['margin_input_width']->value;?>
"/></td>
                    </tr>
                    <tr>
                        <td align="right" nowrap><?php echo vtranslate('LBL_DEC_DECIMALS',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</td>
                        <td><input type="text" maxlength="2" name="currency" class="inputElement" value="<?php echo $_smarty_tpl->tpl_vars['PDF_TEMPLATE_RESULT']->value['currency'];?>
" style="width:<?php echo $_smarty_tpl->tpl_vars['margin_input_width']->value;?>
"/></td>
                    </tr>
                    <tr>
                        <td align="right" nowrap><?php echo vtranslate('LBL_DEC_THOUSANDS',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</td>
                        <td><input type="text" maxlength="2" name="currency_thousands" class="inputElement" value="<?php echo $_smarty_tpl->tpl_vars['PDF_TEMPLATE_RESULT']->value['currency_thousands'];?>
" style="width:<?php echo $_smarty_tpl->tpl_vars['margin_input_width']->value;?>
"/></td>
                    </tr>
                </table>
            </div>
        </div>
                <div class="form-group">
            <label class="control-label fieldLabel col-sm-3" style="font-weight: normal">
                <?php echo vtranslate('Watermark',$_smarty_tpl->tpl_vars['MODULE']->value);?>
:
            </label>
            <div class="controls col-sm-9">
                <table class="table table-bordered">
                    <tr>
                        <td align="right" nowrap width="20%"><?php echo vtranslate('Type',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</td>
                        <td>
                            <select name="watermark_type" id="watermark_type" class="select2 col-sm-12">
                                <?php echo smarty_function_html_options(array('options'=>$_smarty_tpl->tpl_vars['WATERMARK']->value['types'],'selected'=>$_smarty_tpl->tpl_vars['WATERMARK']->value['type']),$_smarty_tpl);?>

                            </select>
                        </td>
                    </tr>
                    <tr id="watermark_image_tr" <?php if ($_smarty_tpl->tpl_vars['WATERMARK']->value['type'] != "image") {?>class="hide"<?php }?>>
                        <td align="right" nowrap ><?php echo vtranslate('Image',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</td>
                        <td>
                            <input type="hidden" name="watermark_img_id" class="inputElement" value="<?php echo $_smarty_tpl->tpl_vars['WATERMARK']->value['image_id'];?>
"/>
                            <div id="uploadedWatermarkFileImage" <?php if ($_smarty_tpl->tpl_vars['WATERMARK']->value['image_name'] != '') {?>class="hide"<?php }?>>
                                <input type="file" name="watermark_image" class="inputElement"/>
                                <div class="uploadedFileDetails">
                                    <div class="uploadedFileSize"></div>
                                    <div class="uploadFileSizeLimit redColor">
                                        <?php echo vtranslate('LBL_MAX_UPLOAD_SIZE',$_smarty_tpl->tpl_vars['MODULE']->value);?>
&nbsp;<span class="maxUploadSize" data-value="<?php echo $_smarty_tpl->tpl_vars['MAX_UPLOAD_LIMIT_BYTES']->value;?>
"><?php echo $_smarty_tpl->tpl_vars['MAX_UPLOAD_LIMIT_MB']->value;
echo vtranslate('MB',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</span>
                                    </div>
                                </div>
                            </div>
                            <div id="uploadedWatermarkFileName" <?php if ($_smarty_tpl->tpl_vars['WATERMARK']->value['image_name'] == '') {?>class="hide"<?php }?>>
                                <a href="<?php echo $_smarty_tpl->tpl_vars['WATERMARK']->value['image_url'];?>
"><?php echo $_smarty_tpl->tpl_vars['WATERMARK']->value['image_name'];?>
</a>
                                <span class="deleteWatermarkFile cursorPointer col-lg-1">
                                                                        <i class="alignMiddle fa fa-trash"></i>
                                                                    </span>
                            </div>
                        </td>
                    </tr>
                    <tr id="watermark_text_tr" <?php if ($_smarty_tpl->tpl_vars['WATERMARK']->value['type'] != "text") {?>class="hide"<?php }?>>
                        <td align="right" nowrap><?php echo vtranslate('Text',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</td>
                        <td><input type="text" name="watermark_text" class="inputElement getPopupUi" value="<?php echo $_smarty_tpl->tpl_vars['WATERMARK']->value['text'];?>
"/></td>
                    </tr>
                    <tr id="watermark_alpha_tr" <?php if ($_smarty_tpl->tpl_vars['WATERMARK']->value['type'] == "none") {?>class="hide"<?php }?>>
                        <td align="right" nowrap><?php echo vtranslate('Alpha',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</td>
                        <td><input type="text" name="watermark_alpha" class="inputElement" <?php if ($_smarty_tpl->tpl_vars['WATERMARK']->value['alpha'] == '') {?>placeholder="0.1"<?php }?> value="<?php echo $_smarty_tpl->tpl_vars['WATERMARK']->value['alpha'];?>
"/></td>
                    </tr>

                </table>
            </div>
        </div>
    </div>
</div><?php }
}
