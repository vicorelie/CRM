<?php
/* Smarty version 4.5.5, created on 2026-01-19 18:19:19
  from '/var/www/CNK-DEM/layouts/v7/modules/PDFMaker/tabs/Basic.tpl' */

/* @var Smarty_Internal_Template $_smarty_tpl */
if ($_smarty_tpl->_decodeProperties($_smarty_tpl, array (
  'version' => '4.5.5',
  'unifunc' => 'content_696e598755c776_92343927',
  'has_nocache_code' => false,
  'file_dependency' => 
  array (
    '1df29110131ba68e98903aec059473e33edb9fb6' => 
    array (
      0 => '/var/www/CNK-DEM/layouts/v7/modules/PDFMaker/tabs/Basic.tpl',
      1 => 1766693999,
      2 => 'file',
    ),
  ),
  'includes' => 
  array (
  ),
),false)) {
function content_696e598755c776_92343927 (Smarty_Internal_Template $_smarty_tpl) {
$_smarty_tpl->_checkPlugins(array(0=>array('file'=>'/var/www/CNK-DEM/vendor/smarty/smarty/libs/plugins/function.html_options.php','function'=>'smarty_function_html_options',),));
?>
<div class="tab-pane active" id="pdfContentEdit">
    <div class="edit-template-content">
                <div class="properties_div">
                        <div class="form-group">
                <label class="control-label fieldLabel col-sm-3" style="font-weight: normal">
                    <?php echo vtranslate('LBL_PDF_NAME',$_smarty_tpl->tpl_vars['MODULE']->value);?>
:&nbsp;<span class="redColor">*</span>
                </label>
                <div class="controls col-sm-9">
                    <input name="filename" id="filename" type="text" value="<?php echo $_smarty_tpl->tpl_vars['FILENAME']->value;?>
" data-rule-required="true" class="inputElement nameField" tabindex="1">
                </div>
            </div>
            <?php if ($_smarty_tpl->tpl_vars['IS_BLOCK']->value == true) {?>
                <div class="form-group">
                    <label class="control-label fieldLabel col-sm-3" style="font-weight: normal">
                        <?php echo vtranslate('LBL_TYPE',$_smarty_tpl->tpl_vars['MODULE']->value);?>
:
                    </label>
                    <div class="controls col-sm-9">
                        <?php if ($_smarty_tpl->tpl_vars['SAVETEMPLATEID']->value != '' && $_smarty_tpl->tpl_vars['TEMPLATEBLOCKTYPE']->value != '') {?>
                            <?php echo $_smarty_tpl->tpl_vars['TEMPLATEBLOCKTYPEVAL']->value;?>

                            <input type="hidden" name="blocktype" id="blocktype" value="<?php echo $_smarty_tpl->tpl_vars['TEMPLATEBLOCKTYPE']->value;?>
">
                        <?php } else { ?>
                            <select name="blocktype" id="blocktype" class="select2 form-control" data-rule-required="true">
                                <option value="header" <?php if ($_smarty_tpl->tpl_vars['TEMPLATEBLOCKTYPE']->value == 'header') {?>selected<?php }?>><?php echo vtranslate('Header',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</option>
                                <option value="footer" <?php if ($_smarty_tpl->tpl_vars['TEMPLATEBLOCKTYPE']->value == 'footer') {?>selected<?php }?>><?php echo vtranslate('Footer',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</option>
                            </select>
                        <?php }?>
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
                                <div class="form-group" id="header_variables">
                    <label class="control-label fieldLabel col-sm-3" style="font-weight: normal">
                        <?php echo vtranslate('LBL_HEADER_FOOTER_VARIABLES',$_smarty_tpl->tpl_vars['MODULE']->value);?>
:
                    </label>
                    <div class="controls col-sm-9">
                        <div class="input-group">
                            <select name="header_var" id="header_var" class="select2 form-control">
                                <?php echo smarty_function_html_options(array('options'=>$_smarty_tpl->tpl_vars['HEAD_FOOT_VARS']->value,'selected'=>''),$_smarty_tpl);?>

                            </select>
                            <div class="input-group-btn">
                                <button type="button" class="btn btn-success InsertIntoTemplate" data-type="header_var" title="<?php echo vtranslate('LBL_INSERT_TO_TEXT',$_smarty_tpl->tpl_vars['MODULE']->value);?>
"><i class="fa fa-usd"></i></button>
                            </div>
                        </div>
                    </div>
                </div>
            <?php }?>
                        <div class="form-group">
                <label class="control-label fieldLabel col-sm-3" style="font-weight: normal">
                    <?php echo vtranslate('LBL_MODULENAMES',$_smarty_tpl->tpl_vars['MODULE']->value);?>
:<?php if ($_smarty_tpl->tpl_vars['TEMPLATEID']->value == '' && $_smarty_tpl->tpl_vars['IS_BLOCK']->value != true) {?>&nbsp;<span class="redColor">*</span>&nbsp;<?php }?>
                </label>
                <div class="controls col-sm-9">
                    <select name="modulename" id="modulename" class="select2 form-control" <?php if ($_smarty_tpl->tpl_vars['IS_BLOCK']->value != true) {?>data-rule-required="true"<?php }?>>
                        <?php if ($_smarty_tpl->tpl_vars['TEMPLATEID']->value != '' || $_smarty_tpl->tpl_vars['SELECTMODULE']->value != '') {?>
                            <?php echo smarty_function_html_options(array('options'=>$_smarty_tpl->tpl_vars['MODULENAMES']->value,'selected'=>$_smarty_tpl->tpl_vars['SELECTMODULE']->value),$_smarty_tpl);?>

                        <?php } else { ?>
                            <?php echo smarty_function_html_options(array('options'=>$_smarty_tpl->tpl_vars['MODULENAMES']->value),$_smarty_tpl);?>

                        <?php }?>
                    </select>
                </div>
            </div>
            <div class="form-group">
                <label class="control-label fieldLabel col-sm-3" style="font-weight: normal">
                </label>
                <div class="controls col-sm-9">
                    <div class="input-group">
                        <select name="modulefields" id="modulefields" class="select2 form-control">
                            <?php if ($_smarty_tpl->tpl_vars['TEMPLATEID']->value == '' && $_smarty_tpl->tpl_vars['SELECTMODULE']->value == '') {?>
                                <option value=""><?php echo vtranslate('LBL_SELECT_MODULE_FIELD',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</option>
                            <?php } else { ?>
                                <?php echo smarty_function_html_options(array('options'=>$_smarty_tpl->tpl_vars['SELECT_MODULE_FIELD']->value),$_smarty_tpl);?>

                            <?php }?>
                        </select>
                        <div class="input-group-btn">
                            <button type="button" class="btn btn-success InsertIntoTemplate" data-type="modulefields" title="<?php echo vtranslate('LBL_INSERT_VARIABLE_TO_TEXT',$_smarty_tpl->tpl_vars['MODULE']->value);?>
"><i class="fa fa-usd"></i></button>
                            <button type="button" class="btn btn-warning InsertLIntoTemplate" data-type="modulefields" title="<?php echo vtranslate('LBL_INSERT_LABEL_TO_TEXT',$_smarty_tpl->tpl_vars['MODULE']->value);?>
"><i class="fa fa-text-width"></i></button>
                        </div>
                    </div>
                </div>
            </div>
                        <div class="form-group">
                <label class="control-label fieldLabel col-sm-3" style="font-weight: normal">
                    <?php echo vtranslate('LBL_RELATED_MODULES',$_smarty_tpl->tpl_vars['MODULE']->value);?>
:
                </label>
                <div class="controls col-sm-9">
                    <select name="relatedmodulesorce" id="relatedmodulesorce" class="select2 form-control">
                        <option value=""><?php echo vtranslate('LBL_SELECT_MODULE',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</option>
                        <?php
$_from = $_smarty_tpl->smarty->ext->_foreach->init($_smarty_tpl, $_smarty_tpl->tpl_vars['RELATED_MODULES']->value, 'RelMod');
$_smarty_tpl->tpl_vars['RelMod']->do_else = true;
if ($_from !== null) foreach ($_from as $_smarty_tpl->tpl_vars['RelMod']->value) {
$_smarty_tpl->tpl_vars['RelMod']->do_else = false;
?>
                            <option value="<?php echo $_smarty_tpl->tpl_vars['RelMod']->value[3];?>
|<?php echo $_smarty_tpl->tpl_vars['RelMod']->value[0];?>
" data-module="<?php echo $_smarty_tpl->tpl_vars['RelMod']->value[3];?>
"><?php echo $_smarty_tpl->tpl_vars['RelMod']->value[1];?>
 (<?php echo $_smarty_tpl->tpl_vars['RelMod']->value[2];?>
)</option>
                        <?php
}
$_smarty_tpl->smarty->ext->_foreach->restore($_smarty_tpl, 1);?>
                    </select>
                </div>
            </div>
            <div class="form-group">
                <label class="control-label fieldLabel col-sm-3" style="font-weight: normal">
                </label>
                <div class="controls col-sm-9">
                    <div class="input-group">
                        <select name="relatedmodulefields" id="relatedmodulefields" class="select2 form-control">
                            <option value=""><?php echo vtranslate('LBL_SELECT_MODULE_FIELD',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</option>
                        </select>
                        <div class="input-group-btn">
                            <button type="button" class="btn btn-success InsertIntoTemplate" data-type="relatedmodulefields" title="<?php echo vtranslate('LBL_INSERT_VARIABLE_TO_TEXT',$_smarty_tpl->tpl_vars['MODULE']->value);?>
"><i class="fa fa-usd"></i></button>
                            <button type="button" class="btn btn-warning InsertLIntoTemplate" data-type="relatedmodulefields" title="<?php echo vtranslate('LBL_INSERT_LABEL_TO_TEXT',$_smarty_tpl->tpl_vars['MODULE']->value);?>
"><i class="fa fa-text-width"></i></button>
                        </div>
                    </div>
                </div>
            </div>
                        <?php if ($_smarty_tpl->tpl_vars['IS_BLOCK']->value != true) {?>
                <div class="form-group" id="related_block_tpl_row">
                    <label class="control-label fieldLabel col-sm-3" style="font-weight: normal">
                        <?php echo vtranslate('LBL_RELATED_BLOCK_TPL',$_smarty_tpl->tpl_vars['MODULE']->value);?>
:
                    </label>
                    <div class="controls col-sm-9">
                        <div class="input-group">
                            <select name="related_block" id="related_block" class="select2 form-control" >
                                <?php echo smarty_function_html_options(array('options'=>$_smarty_tpl->tpl_vars['RELATED_BLOCKS']->value),$_smarty_tpl);?>

                            </select>
                            <div class="input-group-btn">
                                <button type="button" class="btn btn-success marginLeftZero" onclick="PDFMaker_EditJs.InsertRelatedBlock();" title="<?php echo vtranslate('LBL_INSERT_TO_TEXT',$_smarty_tpl->tpl_vars['MODULE']->value);?>
"><i class="fa fa-usd"></i></button>
                                <button type="button" class="btn addButton marginLeftZero" onclick="PDFMaker_EditJs.CreateRelatedBlock();" title="<?php echo vtranslate('LBL_CREATE');?>
"><i class="fa fa-plus"></i></button>
                                <button type="button" class="btn marginLeftZero" onclick="PDFMaker_EditJs.EditRelatedBlock();" title="<?php echo vtranslate('LBL_EDIT');?>
"><i class="fa fa-edit"></i></button>
                                <button type="button" class="btn btn-danger marginLeftZero" class="crmButton small delete" onclick="PDFMaker_EditJs.DeleteRelatedBlock();" title="<?php echo vtranslate('LBL_DELETE');?>
"><i class="fa fa-trash"></i></button>
                            </div>
                        </div>
                    </div>
                </div>
            <?php }?>
            <div class="form-group">
                <label class="control-label fieldLabel col-sm-3" style="font-weight: normal">
                    <?php echo vtranslate('LBL_COMPANY_INFO',$_smarty_tpl->tpl_vars['MODULE']->value);?>
:
                </label>
                <div class="controls col-sm-9">
                    <div class="input-group">
                        <select name="acc_info" id="acc_info" class="select2 form-control">
                            <?php echo smarty_function_html_options(array('options'=>$_smarty_tpl->tpl_vars['ACCOUNTINFORMATIONS']->value),$_smarty_tpl);?>

                        </select>
                        <div id="acc_info_div" class="input-group-btn">
                            <button type="button" class="btn btn-success InsertIntoTemplate" data-type="acc_info" title="<?php echo vtranslate('LBL_INSERT_VARIABLE_TO_TEXT',$_smarty_tpl->tpl_vars['MODULE']->value);?>
"><i class="fa fa-usd"></i></button>
                            <button type="button" class="btn btn-warning InsertLIntoTemplate" data-type="acc_info" title="<?php echo vtranslate('LBL_INSERT_LABEL_TO_TEXT',$_smarty_tpl->tpl_vars['MODULE']->value);?>
"><i class="fa fa-text-width"></i></button>
                        </div>
                    </div>
                </div>
            </div>
            <div class="form-group">
                <label class="control-label fieldLabel col-sm-3" style="font-weight: normal">
                    <?php echo vtranslate('LBL_SELECT_USER_INFO',$_smarty_tpl->tpl_vars['MODULE']->value);?>
:
                </label>
                <div class="controls col-sm-9">
                    <select name="acc_info_type" id="acc_info_type" class="select2 form-control" onChange="PDFMaker_EditJs.change_acc_info(this)">
                        <?php echo smarty_function_html_options(array('options'=>$_smarty_tpl->tpl_vars['CUI_BLOCKS']->value),$_smarty_tpl);?>

                    </select>
                </div>
            </div>
            <div class="form-group">
                <label class="control-label fieldLabel col-sm-3" style="font-weight: normal"></label>
                <div class="controls col-sm-9">
                    <div id="user_info_div" class="au_info_div">
                        <div class="input-group">
                            <select name="user_info" id="user_info" class="select2 form-control">
                                <?php echo smarty_function_html_options(array('options'=>$_smarty_tpl->tpl_vars['USERINFORMATIONS']->value['a']),$_smarty_tpl);?>

                            </select>
                            <div class="input-group-btn">
                                <button type="button" class="btn btn-success InsertIntoTemplate" data-type="user_info" title="<?php echo vtranslate('LBL_INSERT_VARIABLE_TO_TEXT',$_smarty_tpl->tpl_vars['MODULE']->value);?>
"><i class="fa fa-usd"></i></button>
                                <button type="button" class="btn btn-warning InsertLIntoTemplate" data-type="user_info" title="<?php echo vtranslate('LBL_INSERT_LABEL_TO_TEXT',$_smarty_tpl->tpl_vars['MODULE']->value);?>
"><i class="fa fa-text-width"></i></button>
                            </div>
                        </div>
                    </div>
                    <div id="logged_user_info_div" class="au_info_div" style="display:none;">
                        <div class="input-group">
                            <select name="logged_user_info" id="logged_user_info" class="select2 form-control">
                                <?php echo smarty_function_html_options(array('options'=>$_smarty_tpl->tpl_vars['USERINFORMATIONS']->value['l']),$_smarty_tpl);?>

                            </select>
                            <div class="input-group-btn">
                                <button type="button" class="btn btn-success InsertIntoTemplate" data-type="logged_user_info" title="<?php echo vtranslate('LBL_INSERT_VARIABLE_TO_TEXT',$_smarty_tpl->tpl_vars['MODULE']->value);?>
"><i class="fa fa-usd"></i></button>
                                <button type="button" class="btn btn-warning InsertLIntoTemplate" data-type="logged_user_info" title="<?php echo vtranslate('LBL_INSERT_LABEL_TO_TEXT',$_smarty_tpl->tpl_vars['MODULE']->value);?>
"><i class="fa fa-text-width"></i></button>
                            </div>
                        </div>
                    </div>
                    <div id="modifiedby_user_info_div" class="au_info_div" style="display:none;">
                        <div class="input-group">
                            <select name="modifiedby_user_info" id="modifiedby_user_info" class="select2 form-control">
                                <?php echo smarty_function_html_options(array('options'=>$_smarty_tpl->tpl_vars['USERINFORMATIONS']->value['m']),$_smarty_tpl);?>

                            </select>
                            <div class="input-group-btn">
                                <button type="button" class="btn btn-success InsertIntoTemplate" data-type="modifiedby_user_info" title="<?php echo vtranslate('LBL_INSERT_VARIABLE_TO_TEXT',$_smarty_tpl->tpl_vars['MODULE']->value);?>
"><i class="fa fa-usd"></i></button>
                                <button type="button" class="btn btn-warning InsertLIntoTemplate" data-type="modifiedby_user_info" title="<?php echo vtranslate('LBL_INSERT_LABEL_TO_TEXT',$_smarty_tpl->tpl_vars['MODULE']->value);?>
"><i class="fa fa-text-width"></i></button>
                            </div>
                        </div>
                    </div>
                    <div id="smcreator_user_info_div" class="au_info_div" style="display:none;">
                        <div class="input-group">
                            <select name="smcreator_user_info" id="smcreator_user_info" class="select2 form-control">
                                <?php echo smarty_function_html_options(array('options'=>$_smarty_tpl->tpl_vars['USERINFORMATIONS']->value['c']),$_smarty_tpl);?>

                            </select>
                            <div class="input-group-btn">
                                <button type="button" class="btn btn-success InsertIntoTemplate" data-type="smcreator_user_info" title="<?php echo vtranslate('LBL_INSERT_VARIABLE_TO_TEXT',$_smarty_tpl->tpl_vars['MODULE']->value);?>
"><i class="fa fa-usd"></i></button>
                                <button type="button" class="btn btn-warning InsertLIntoTemplate" data-type="smcreator_user_info" title="<?php echo vtranslate('LBL_INSERT_LABEL_TO_TEXT',$_smarty_tpl->tpl_vars['MODULE']->value);?>
"><i class="fa fa-text-width"></i></button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div><?php }
}
