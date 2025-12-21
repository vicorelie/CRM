<?php
/* Smarty version 4.5.5, created on 2025-12-07 21:02:08
  from '/var/www/CRM/ARIDEM/layouts/v7/modules/PDFMaker/tabs/Settings.tpl' */

/* @var Smarty_Internal_Template $_smarty_tpl */
if ($_smarty_tpl->_decodeProperties($_smarty_tpl, array (
  'version' => '4.5.5',
  'unifunc' => 'content_6935eb502492e1_41826538',
  'has_nocache_code' => false,
  'file_dependency' => 
  array (
    'e463988f812bcfb82464566c5ea3cdbef68a2c46' => 
    array (
      0 => '/var/www/CRM/ARIDEM/layouts/v7/modules/PDFMaker/tabs/Settings.tpl',
      1 => 1765057370,
      2 => 'file',
    ),
  ),
  'includes' => 
  array (
  ),
),false)) {
function content_6935eb502492e1_41826538 (Smarty_Internal_Template $_smarty_tpl) {
$_smarty_tpl->_checkPlugins(array(0=>array('file'=>'/var/www/CRM/ARIDEM/vendor/smarty/smarty/libs/plugins/function.html_options.php','function'=>'smarty_function_html_options',),));
?>
<div class="tab-pane" id="editTabSettings">
    <div id="settings_div" class="edit-template-content">
        <div class="form-group">
            <label class="control-label fieldLabel col-sm-3" style="font-weight: normal">
                <?php echo vtranslate('LBL_FILENAME',$_smarty_tpl->tpl_vars['MODULE']->value);?>
:
            </label>
            <div class="controls col-sm-9">
                <input type="text" name="nameOfFile" value="<?php echo $_smarty_tpl->tpl_vars['NAME_OF_FILE']->value;?>
" id="nameOfFile" class="inputElement getPopupUi">
            </div>
        </div>
        <div class="form-group hide">
            <label class="control-label fieldLabel col-sm-3" style="font-weight: normal">
            </label>
            <div class="controls col-sm-9">
                <select name="filename_fields" id="filename_fields" class="select2 form-control" onchange="PDFMaker_EditJs.insertFieldIntoFilename(this.value);">
                    <option value=""><?php echo vtranslate('LBL_SELECT_MODULE_FIELD',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</option>
                    <optgroup label="<?php echo vtranslate('LBL_COMMON_FILEINFO',$_smarty_tpl->tpl_vars['MODULE']->value);?>
">
                        <?php echo smarty_function_html_options(array('options'=>$_smarty_tpl->tpl_vars['FILENAME_FIELDS']->value),$_smarty_tpl);?>

                    </optgroup>
                    <?php if ($_smarty_tpl->tpl_vars['TEMPLATEID']->value != '' || $_smarty_tpl->tpl_vars['SELECTMODULE']->value != '') {?>
                        <?php echo smarty_function_html_options(array('options'=>$_smarty_tpl->tpl_vars['SELECT_MODULE_FIELD_FILENAME']->value),$_smarty_tpl);?>

                    <?php }?>
                </select>
            </div>
        </div>
        <div class="form-group">
            <label class="control-label fieldLabel col-sm-3" style="font-weight: normal">
                <?php echo vtranslate('LBL_PDF_PASSWORD',$_smarty_tpl->tpl_vars['MODULE']->value);?>
:
            </label>
            <div class="controls col-sm-9">
                <input type="text" name="PDFPassword" value="<?php echo $_smarty_tpl->tpl_vars['PDF_PASSWORD']->value;?>
" id="PDFPassword" class="getPopupUi inputElement">
            </div>
        </div>
        <div class="form-group">
            <label class="control-label fieldLabel col-sm-3" style="font-weight: normal">
                <?php echo vtranslate('LBL_DESCRIPTION',$_smarty_tpl->tpl_vars['MODULE']->value);?>
:
            </label>
            <div class="controls col-sm-9">
                <input name="description" type="text" value="<?php echo $_smarty_tpl->tpl_vars['DESCRIPTION']->value;?>
" class="inputElement" tabindex="2">
            </div>
        </div>

                <div class="form-group">
            <label class="control-label fieldLabel col-sm-3" style="font-weight: normal">
                <?php echo vtranslate('LBL_IGNORE_PICKLIST_VALUES',$_smarty_tpl->tpl_vars['MODULE']->value);?>
:
            </label>
            <div class="controls col-sm-9">
                <input type="text" name="ignore_picklist_values" value="<?php echo $_smarty_tpl->tpl_vars['IGNORE_PICKLIST_VALUES']->value;?>
" class="inputElement"/>
            </div>
        </div>

                <div class="form-group">
            <label class="control-label fieldLabel col-sm-3" style="font-weight: normal">
                <?php echo vtranslate('LBL_STATUS',$_smarty_tpl->tpl_vars['MODULE']->value);?>
:
            </label>
            <div class="controls col-sm-9">
                <select name="is_active" id="is_active" class="select2 col-sm-12" onchange="PDFMaker_EditJs.templateActiveChanged(this);">
                    <?php echo smarty_function_html_options(array('options'=>$_smarty_tpl->tpl_vars['STATUS']->value,'selected'=>$_smarty_tpl->tpl_vars['IS_ACTIVE']->value),$_smarty_tpl);?>

                </select>
            </div>
        </div>
                <div class="form-group">
            <label class="control-label fieldLabel col-sm-3" style="font-weight: normal">
                <?php echo vtranslate('LBL_SETASDEFAULT',$_smarty_tpl->tpl_vars['MODULE']->value);?>
:
            </label>
            <div class="controls col-sm-9">
                <?php echo vtranslate('LBL_FOR_DV',$_smarty_tpl->tpl_vars['MODULE']->value);?>
 <input <?php if ($_smarty_tpl->tpl_vars['IS_LISTVIEW_CHECKED']->value == "yes") {?>disabled="true"<?php }?> type="checkbox" id="is_default_dv" name="is_default_dv" <?php echo $_smarty_tpl->tpl_vars['IS_DEFAULT_DV_CHECKED']->value;?>
/>
                &nbsp;&nbsp;
                <?php echo vtranslate('LBL_FOR_LV',$_smarty_tpl->tpl_vars['MODULE']->value);?>
&nbsp;&nbsp;<input type="checkbox" id="is_default_lv" name="is_default_lv" <?php echo $_smarty_tpl->tpl_vars['IS_DEFAULT_LV_CHECKED']->value;?>
/>
                                <input type="hidden" name="tmpl_order" value="<?php echo $_smarty_tpl->tpl_vars['ORDER']->value;?>
" />
            </div>
        </div>
        <div class="form-group">
            <label class="control-label fieldLabel col-sm-3" style="font-weight: normal">
                <?php echo vtranslate('LBL_DEFAULT_PRODUCT_IMAGE',$_smarty_tpl->tpl_vars['MODULE']->value);?>
:
            </label>
            <div class="controls col-sm-9">
                <table class="table table-bordered">
                    <tr>
                        <td align="right"><?php echo vtranslate('LBL_WIDTH_PX',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</td>
                        <td>
                            <input type="text" name="product_image_width" class="inputElement" value="<?php echo $_smarty_tpl->tpl_vars['PDF_TEMPLATE_RESULT']->value['product_image_width'];?>
">
                        </td>
                    </tr>
                    <tr>
                        <td align="right"><?php echo vtranslate('LBL_HEIGHT_PX',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</td>
                        <td>
                            <input type="text" name="product_image_height" class="inputElement" value="<?php echo $_smarty_tpl->tpl_vars['PDF_TEMPLATE_RESULT']->value['product_image_height'];?>
">
                        </td>
                    </tr>
                </table>
            </div>
        </div>
        <div class="form-group">
            <label class="control-label fieldLabel col-sm-3" style="font-weight: normal">
                <?php echo vtranslate('LBL_DISABLE_EXPORT_EDIT',$_smarty_tpl->tpl_vars['MODULE']->value);?>
:
            </label>
            <div class="controls col-sm-9">
                <input type="checkbox" name="disable_export_edit" class="inputElement" value="1" <?php if ($_smarty_tpl->tpl_vars['PDF_TEMPLATE_RESULT']->value['disable_export_edit']) {?>checked<?php }?>>
            </div>
        </div>
    </div>
</div><?php }
}
