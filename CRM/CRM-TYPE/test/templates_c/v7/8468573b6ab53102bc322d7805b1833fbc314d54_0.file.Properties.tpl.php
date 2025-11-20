<?php
/* Smarty version 4.5.5, created on 2025-11-13 10:05:01
  from '/home3/vicorelie/crm.tcerenov-design.com/layouts/v7/modules/EMAILMaker/tabs/Properties.tpl' */

/* @var Smarty_Internal_Template $_smarty_tpl */
if ($_smarty_tpl->_decodeProperties($_smarty_tpl, array (
  'version' => '4.5.5',
  'unifunc' => 'content_6915ad4d32cdf3_61480923',
  'has_nocache_code' => false,
  'file_dependency' => 
  array (
    '8468573b6ab53102bc322d7805b1833fbc314d54' => 
    array (
      0 => '/home3/vicorelie/crm.tcerenov-design.com/layouts/v7/modules/EMAILMaker/tabs/Properties.tpl',
      1 => 1754577898,
      2 => 'file',
    ),
  ),
  'includes' => 
  array (
  ),
),false)) {
function content_6915ad4d32cdf3_61480923 (Smarty_Internal_Template $_smarty_tpl) {
$_smarty_tpl->_checkPlugins(array(0=>array('file'=>'/home3/vicorelie/crm.tcerenov-design.com/vendor/smarty/smarty/libs/plugins/function.html_options.php','function'=>'smarty_function_html_options',),));
?>
<div class="tab-pane active" id="pdfContentEdit"><div class="edit-template-content col-lg-4" style="position:fixed;z-index:1000;"><br/><div id="properties_div"><div class="form-group"><label class="control-label fieldLabel col-sm-3" style="font-weight: normal"><?php if ($_smarty_tpl->tpl_vars['THEME_MODE']->value == "true") {
echo vtranslate('LBL_THEME_NAME',$_smarty_tpl->tpl_vars['MODULE']->value);
} else {
echo vtranslate('LBL_EMAIL_NAME',$_smarty_tpl->tpl_vars['MODULE']->value);
}?>:&nbsp;<span class="redColor">*</span></label><div class="controls col-sm-9"><input name="templatename" id="templatename" type="text" value="<?php echo $_smarty_tpl->tpl_vars['TEMPLATENAME']->value;?>
" data-rule-required="true" class="inputElement nameField" tabindex="1"></div></div><div class="form-group"><label class="control-label fieldLabel col-sm-3" style="font-weight: normal"><?php echo vtranslate('LBL_RECIPIENT_FIELDS','EMAILMaker');?>
:</label><div class="controls col-sm-9"><select name="r_modulename" id="r_modulename" class="select2 form-control"><?php echo smarty_function_html_options(array('options'=>$_smarty_tpl->tpl_vars['RECIPIENTMODULENAMES']->value),$_smarty_tpl);?>
</select></div></div><div class="form-group"><label class="control-label fieldLabel col-sm-3" style="font-weight: normal"></label><div class="controls col-sm-9"><div class="input-group"><select name="recipientmodulefields" id="recipientmodulefields" class="select2 form-control"><option value=""><?php echo vtranslate('LBL_SELECT_MODULE_FIELD','EMAILMaker');?>
</option></select><div class="input-group-btn"><button type="button" class="btn btn-success InsertIntoTemplate" data-type="recipientmodulefields" title="<?php echo vtranslate('LBL_INSERT_VARIABLE_TO_TEXT',$_smarty_tpl->tpl_vars['MODULE']->value);?>
"><i class="fa fa-usd"></i></button><button type="button" class="btn btn-warning InsertLIntoTemplate" data-type="recipientmodulefields" title="<?php echo vtranslate('LBL_INSERT_LABEL_TO_TEXT',$_smarty_tpl->tpl_vars['MODULE']->value);?>
"><i class="fa fa-text-width"></i></button></div></div></div></div><?php if ($_smarty_tpl->tpl_vars['THEME_MODE']->value != "true") {?><div class="form-group"><label class="control-label fieldLabel col-sm-3" style="font-weight: normal"><?php echo vtranslate('LBL_MODULENAMES',$_smarty_tpl->tpl_vars['MODULE']->value);?>
:</label><div class="controls col-sm-9"><select name="modulename" id="modulename" class="select2 form-control"><?php if ($_smarty_tpl->tpl_vars['TEMPLATEID']->value != '' || $_smarty_tpl->tpl_vars['SELECTMODULE']->value != '') {
echo smarty_function_html_options(array('options'=>$_smarty_tpl->tpl_vars['MODULENAMES']->value,'selected'=>$_smarty_tpl->tpl_vars['SELECTMODULE']->value),$_smarty_tpl);
} else {
echo smarty_function_html_options(array('options'=>$_smarty_tpl->tpl_vars['MODULENAMES']->value),$_smarty_tpl);
}?></select></div></div><div class="form-group"><label class="control-label fieldLabel col-sm-3" style="font-weight: normal"></label><div class="controls col-sm-9"><div class="input-group"><select name="modulefields" id="modulefields" class="select2 form-control"><?php if ($_smarty_tpl->tpl_vars['TEMPLATEID']->value == '' && $_smarty_tpl->tpl_vars['SELECTMODULE']->value == '') {?><option value=""><?php echo vtranslate('LBL_SELECT_MODULE_FIELD',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</option><?php } else {
echo smarty_function_html_options(array('options'=>$_smarty_tpl->tpl_vars['SELECT_MODULE_FIELD']->value),$_smarty_tpl);
}?></select><div class="input-group-btn"><button type="button" class="btn btn-success InsertIntoTemplate" data-type="modulefields" title="<?php echo vtranslate('LBL_INSERT_VARIABLE_TO_TEXT',$_smarty_tpl->tpl_vars['MODULE']->value);?>
"><i class="fa fa-usd"></i></button><button type="button" class="btn btn-warning InsertLIntoTemplate" data-type="modulefields" title="<?php echo vtranslate('LBL_INSERT_LABEL_TO_TEXT',$_smarty_tpl->tpl_vars['MODULE']->value);?>
"><i class="fa fa-text-width"></i></button></div></div></div></div><div class="form-group"><label class="control-label fieldLabel col-sm-3" style="font-weight: normal"><label class="muted pull-right"><?php echo vtranslate('LBL_RELATED_MODULES',$_smarty_tpl->tpl_vars['MODULE']->value);?>
:</label></label><div class="controls col-sm-9"><select name="relatedmodulesorce" id="relatedmodulesorce" class="select2 form-control"><option value=""><?php echo vtranslate('LBL_SELECT_MODULE',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</option><?php
$_from = $_smarty_tpl->smarty->ext->_foreach->init($_smarty_tpl, $_smarty_tpl->tpl_vars['RELATED_MODULES']->value, 'RelMod');
$_smarty_tpl->tpl_vars['RelMod']->do_else = true;
if ($_from !== null) foreach ($_from as $_smarty_tpl->tpl_vars['RelMod']->value) {
$_smarty_tpl->tpl_vars['RelMod']->do_else = false;
?><option value="<?php echo $_smarty_tpl->tpl_vars['RelMod']->value[3];?>
|<?php echo $_smarty_tpl->tpl_vars['RelMod']->value[0];?>
" data-module="<?php echo $_smarty_tpl->tpl_vars['RelMod']->value[3];?>
"><?php echo $_smarty_tpl->tpl_vars['RelMod']->value[1];?>
 (<?php echo $_smarty_tpl->tpl_vars['RelMod']->value[2];?>
)</option><?php
}
$_smarty_tpl->smarty->ext->_foreach->restore($_smarty_tpl, 1);?></select></div></div><div class="form-group"><label class="control-label fieldLabel col-sm-3" style="font-weight: normal"></label><div class="controls col-sm-9"><div class="input-group"><select name="relatedmodulefields" id="relatedmodulefields" class="select2 form-control"><option value=""><?php echo vtranslate('LBL_SELECT_MODULE_FIELD',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</option></select><div class="input-group-btn"><button type="button" class="btn btn-success InsertIntoTemplate" data-type="relatedmodulefields" title="<?php echo vtranslate('LBL_INSERT_VARIABLE_TO_TEXT',$_smarty_tpl->tpl_vars['MODULE']->value);?>
"><i class="fa fa-usd"></i></button><button type="button" class="btn btn-warning InsertLIntoTemplate" data-type="relatedmodulefields" title="<?php echo vtranslate('LBL_INSERT_LABEL_TO_TEXT',$_smarty_tpl->tpl_vars['MODULE']->value);?>
"><i class="fa fa-text-width"></i></button></div></div></div></div><div class="form-group"><label class="control-label fieldLabel col-sm-3" style="font-weight: normal"><?php echo vtranslate('LBL_RELATED_BLOCK_TPL',$_smarty_tpl->tpl_vars['MODULE']->value);?>
:</label><div class="controls col-sm-9"><div class="input-group"><select name="related_block" id="related_block" class="select2 form-control"><?php echo smarty_function_html_options(array('options'=>$_smarty_tpl->tpl_vars['RELATED_BLOCKS']->value),$_smarty_tpl);?>
</select><div class="input-group-btn"><button type="button" class="btn btn-success marginLeftZero" onclick="EMAILMaker_EditJs.InsertRelatedBlock();" title="<?php echo vtranslate('LBL_INSERT_TO_TEXT',$_smarty_tpl->tpl_vars['MODULE']->value);?>
"><i class="fa fa-usd"></i></button><button type="button" class="btn addButton marginLeftZero" onclick="EMAILMaker_EditJs.CreateRelatedBlock();" title="<?php echo vtranslate('LBL_CREATE');?>
"><i class="fa fa-plus"></i></button><button type="button" class="btn marginLeftZero" onclick="EMAILMaker_EditJs.EditRelatedBlock();" title="<?php echo vtranslate('LBL_EDIT');?>
"><i class="fa fa-edit"></i></button><button type="button" class="btn btn-danger marginLeftZero" class="crmButton small delete" onclick="EMAILMaker_EditJs.DeleteRelatedBlock();" title="<?php echo vtranslate('LBL_DELETE');?>
"><i class="fa fa-trash"></i></button></div></div></div></div><?php }?><div class="form-group"><label class="control-label fieldLabel col-sm-3" style="font-weight: normal"><?php echo vtranslate('LBL_COMPANY_INFO',$_smarty_tpl->tpl_vars['MODULE']->value);?>
:</label><div class="controls col-sm-9"><div class="input-group"><select name="acc_info" id="acc_info" class="select2 form-control"><?php echo smarty_function_html_options(array('options'=>$_smarty_tpl->tpl_vars['ACCOUNTINFORMATIONS']->value),$_smarty_tpl);?>
</select><div id="acc_info_div" class="input-group-btn"><button type="button" class="btn btn-success InsertIntoTemplate" data-type="acc_info" title="<?php echo vtranslate('LBL_INSERT_VARIABLE_TO_TEXT',$_smarty_tpl->tpl_vars['MODULE']->value);?>
"><i class="fa fa-usd"></i></button><button type="button" class="btn btn-warning InsertLIntoTemplate" data-type="acc_info" title="<?php echo vtranslate('LBL_INSERT_LABEL_TO_TEXT',$_smarty_tpl->tpl_vars['MODULE']->value);?>
"><i class="fa fa-text-width"></i></button></div></div></div></div><div class="form-group"><label class="control-label fieldLabel col-sm-3" style="font-weight: normal"><?php echo vtranslate('LBL_SELECT_USER_INFO',$_smarty_tpl->tpl_vars['MODULE']->value);?>
:</label><div class="controls col-sm-9"><select name="acc_info_type" id="acc_info_type" class="select2 form-control" onChange="EMAILMaker_EditJs.change_acc_info(this)"><?php echo smarty_function_html_options(array('options'=>$_smarty_tpl->tpl_vars['CUI_BLOCKS']->value),$_smarty_tpl);?>
</select></div></div><div class="form-group"><label class="control-label fieldLabel col-sm-3" style="font-weight: normal"></label><div class="controls col-sm-9"><div id="user_info_div" class="au_info_div"><div class="input-group"><select name="user_info" id="user_info" class="select2 form-control"><?php echo smarty_function_html_options(array('options'=>$_smarty_tpl->tpl_vars['USERINFORMATIONS']->value['s']),$_smarty_tpl);?>
</select><div class="input-group-btn"><button type="button" class="btn btn-success InsertIntoTemplate" data-type="user_info" title="<?php echo vtranslate('LBL_INSERT_VARIABLE_TO_TEXT',$_smarty_tpl->tpl_vars['MODULE']->value);?>
"><i class="fa fa-usd"></i></button><button type="button" class="btn btn-warning InsertLIntoTemplate" data-type="user_info" title="<?php echo vtranslate('LBL_INSERT_LABEL_TO_TEXT',$_smarty_tpl->tpl_vars['MODULE']->value);?>
"><i class="fa fa-text-width"></i></button></div></div></div><div id="logged_user_info_div" class="au_info_div" style="display:none;"><div class="input-group"><select name="logged_user_info" id="logged_user_info" class="select2 form-control"><?php echo smarty_function_html_options(array('options'=>$_smarty_tpl->tpl_vars['USERINFORMATIONS']->value['l']),$_smarty_tpl);?>
</select><div class="input-group-btn"><button type="button" class="btn btn-success InsertIntoTemplate" data-type="logged_user_info" title="<?php echo vtranslate('LBL_INSERT_VARIABLE_TO_TEXT',$_smarty_tpl->tpl_vars['MODULE']->value);?>
"><i class="fa fa-usd"></i></button><button type="button" class="btn btn-warning InsertLIntoTemplate" data-type="logged_user_info" title="<?php echo vtranslate('LBL_INSERT_LABEL_TO_TEXT',$_smarty_tpl->tpl_vars['MODULE']->value);?>
"><i class="fa fa-text-width"></i></button></div></div></div><div id="modifiedby_user_info_div" class="au_info_div" style="display:none;"><div class="input-group"><select name="modifiedby_user_info" id="modifiedby_user_info" class="select2 form-control"><?php echo smarty_function_html_options(array('options'=>$_smarty_tpl->tpl_vars['USERINFORMATIONS']->value['m']),$_smarty_tpl);?>
</select><div class="input-group-btn"><button type="button" class="btn btn-success InsertIntoTemplate" data-type="modifiedby_user_info" title="<?php echo vtranslate('LBL_INSERT_VARIABLE_TO_TEXT',$_smarty_tpl->tpl_vars['MODULE']->value);?>
"><i class="fa fa-usd"></i></button><button type="button" class="btn btn-warning InsertLIntoTemplate" data-type="modifiedby_user_info" title="<?php echo vtranslate('LBL_INSERT_LABEL_TO_TEXT',$_smarty_tpl->tpl_vars['MODULE']->value);?>
"><i class="fa fa-text-width"></i></button></div></div></div><div id="smcreator_user_info_div" class="au_info_div" style="display:none;"><div class="input-group"><select name="smcreator_user_info" id="smcreator_user_info" class="select2 form-control"><?php echo smarty_function_html_options(array('options'=>$_smarty_tpl->tpl_vars['USERINFORMATIONS']->value['c']),$_smarty_tpl);?>
</select><div class="input-group-btn"><button type="button" class="btn btn-success InsertIntoTemplate" data-type="smcreator_user_info" title="<?php echo vtranslate('LBL_INSERT_VARIABLE_TO_TEXT',$_smarty_tpl->tpl_vars['MODULE']->value);?>
"><i class="fa fa-usd"></i></button><button type="button" class="btn btn-warning InsertLIntoTemplate" data-type="smcreator_user_info" title="<?php echo vtranslate('LBL_INSERT_LABEL_TO_TEXT',$_smarty_tpl->tpl_vars['MODULE']->value);?>
"><i class="fa fa-text-width"></i></button></div></div></div></div></div><?php if ($_smarty_tpl->tpl_vars['MULTICOMPANYINFORMATIONS']->value != '') {?><div class="form-group"><label class="control-label fieldLabel col-sm-3" style="font-weight: normal"><?php echo $_smarty_tpl->tpl_vars['LBL_MULTICOMPANY']->value;?>
:</label><div class="controls col-sm-9"><div class="input-group"><select name="multicomapny" id="multicomapny" class="select2 form-control"><?php echo smarty_function_html_options(array('options'=>$_smarty_tpl->tpl_vars['MULTICOMPANYINFORMATIONS']->value),$_smarty_tpl);?>
</select><div class="input-group-btn"><button type="button" class="btn btn-success InsertIntoTemplate" data-type="multicomapny" title="<?php echo vtranslate('LBL_INSERT_VARIABLE_TO_TEXT',$_smarty_tpl->tpl_vars['MODULE']->value);?>
"><i class="fa fa-usd"></i></button></div></div></div></div><?php }?></div></div></div><?php }
}
