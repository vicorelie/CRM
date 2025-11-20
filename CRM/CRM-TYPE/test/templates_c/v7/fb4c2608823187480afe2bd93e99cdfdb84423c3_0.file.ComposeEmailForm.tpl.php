<?php
/* Smarty version 4.5.5, created on 2025-11-13 10:07:56
  from '/home3/vicorelie/crm.tcerenov-design.com/layouts/v7/modules/ITS4YouEmails/ComposeEmailForm.tpl' */

/* @var Smarty_Internal_Template $_smarty_tpl */
if ($_smarty_tpl->_decodeProperties($_smarty_tpl, array (
  'version' => '4.5.5',
  'unifunc' => 'content_6915adfc0fbb30_58715840',
  'has_nocache_code' => false,
  'file_dependency' => 
  array (
    'fb4c2608823187480afe2bd93e99cdfdb84423c3' => 
    array (
      0 => '/home3/vicorelie/crm.tcerenov-design.com/layouts/v7/modules/ITS4YouEmails/ComposeEmailForm.tpl',
      1 => 1754577872,
      2 => 'file',
    ),
  ),
  'includes' => 
  array (
  ),
),false)) {
function content_6915adfc0fbb30_58715840 (Smarty_Internal_Template $_smarty_tpl) {
$_smarty_tpl->_checkPlugins(array(0=>array('file'=>'/home3/vicorelie/crm.tcerenov-design.com/vendor/smarty/smarty/libs/plugins/function.html_options.php','function'=>'smarty_function_html_options',),));
?>
<div class="SendEmailFormStep2 modal-dialog" id="composeEmailContainer" style="width: 70vw; height: 80vh;"><div class="modal-content"><form class="form-horizontal" id="massEmailForm" method="post" action="index.php" enctype="multipart/form-data" name="massEmailForm"><?php ob_start();
echo vtranslate('LBL_COMPOSE_EMAIL',$_smarty_tpl->tpl_vars['MODULE']->value);
$_prefixVariable1 = ob_get_clean();
$_smarty_tpl->_subTemplateRender(call_user_func_array($_smarty_tpl->registered_plugins[ 'modifier' ][ 'vtemplate_path' ][ 0 ], array( "ModalHeader.tpl",$_smarty_tpl->tpl_vars['MODULE']->value )), $_smarty_tpl->cache_id, $_smarty_tpl->compile_id, 0, $_smarty_tpl->cache_lifetime, array('TITLE'=>$_prefixVariable1), 0, true);
?><div class="modal-body"><input type="hidden" name="selected_ids" value=<?php echo ZEND_JSON::encode($_smarty_tpl->tpl_vars['SELECTED_IDS']->value);?>
><input type="hidden" name="excluded_ids" value=<?php echo ZEND_JSON::encode($_smarty_tpl->tpl_vars['EXCLUDED_IDS']->value);?>
><input type="hidden" name="viewname" value="<?php echo $_smarty_tpl->tpl_vars['VIEWNAME']->value;?>
"/><input type="hidden" name="module" value="<?php echo $_smarty_tpl->tpl_vars['MODULE']->value;?>
"/><input type="hidden" name="mode" value="massSave"/><input type="hidden" name="view" value="MassSaveAjax"/><input type="hidden" name="selected_sourceid" value="<?php echo $_smarty_tpl->tpl_vars['SELECTED_SOURCEID']->value;?>
"><?php
$_from = $_smarty_tpl->smarty->ext->_foreach->init($_smarty_tpl, $_smarty_tpl->tpl_vars['SOURCE_NAMES']->value, 'source_name', false, 'SID', 'sourcenames', array (
));
$_smarty_tpl->tpl_vars['source_name']->do_else = true;
if ($_from !== null) foreach ($_from as $_smarty_tpl->tpl_vars['SID']->value => $_smarty_tpl->tpl_vars['source_name']->value) {
$_smarty_tpl->tpl_vars['source_name']->do_else = false;
?><input type="hidden" name="<?php echo $_smarty_tpl->tpl_vars['SID']->value;?>
toemailinfo" value='<?php echo ZEND_JSON::encode($_smarty_tpl->tpl_vars['TOMAIL_INFO']->value[$_smarty_tpl->tpl_vars['SID']->value]);?>
'/><input type="hidden" name="<?php echo $_smarty_tpl->tpl_vars['SID']->value;?>
ccemailinfo" value='<?php echo ZEND_JSON::encode($_smarty_tpl->tpl_vars['CCMAIL_INFO']->value[$_smarty_tpl->tpl_vars['SID']->value]);?>
'/><input type="hidden" name="<?php echo $_smarty_tpl->tpl_vars['SID']->value;?>
bccemailinfo" value='<?php echo ZEND_JSON::encode($_smarty_tpl->tpl_vars['BCCMAIL_INFO']->value[$_smarty_tpl->tpl_vars['SID']->value]);?>
'/><input type="hidden" name="<?php echo $_smarty_tpl->tpl_vars['SID']->value;?>
toMailNamesList" value='<?php echo ZEND_JSON::encode($_smarty_tpl->tpl_vars['TOMAIL_NAMES_LIST']->value[$_smarty_tpl->tpl_vars['SID']->value]);?>
'/><input type="hidden" name="<?php echo $_smarty_tpl->tpl_vars['SID']->value;?>
ccMailNamesList" value='<?php echo ZEND_JSON::encode($_smarty_tpl->tpl_vars['CCMAIL_NAMES_LIST']->value[$_smarty_tpl->tpl_vars['SID']->value]);?>
'/><input type="hidden" name="<?php echo $_smarty_tpl->tpl_vars['SID']->value;?>
bccMailNamesList" value='<?php echo ZEND_JSON::encode($_smarty_tpl->tpl_vars['BCCMAIL_NAMES_LIST']->value[$_smarty_tpl->tpl_vars['SID']->value]);?>
'/><?php
}
$_smarty_tpl->smarty->ext->_foreach->restore($_smarty_tpl, 1);?><input type="hidden" name="to" value='<?php echo ZEND_JSON::encode($_smarty_tpl->tpl_vars['TO']->value);?>
'/><input type="hidden" name="cc" value='<?php echo ZEND_JSON::encode($_smarty_tpl->tpl_vars['CC']->value);?>
'/><input type="hidden" name="bcc" value='<?php echo ZEND_JSON::encode($_smarty_tpl->tpl_vars['BCC']->value);?>
'/><input type="hidden" id="flag" name="flag" value=""/><input type="hidden" id="maxUploadSize" value="<?php echo $_smarty_tpl->tpl_vars['MAX_UPLOAD_SIZE']->value;?>
"/><input type="hidden" id="documentIds" name="documentids" value='<?php echo Zend_Json::encode($_smarty_tpl->tpl_vars['DOCUMENT_IDS']->value);?>
' /><input type="hidden" name="emailMode" value="<?php echo $_smarty_tpl->tpl_vars['EMAIL_MODE']->value;?>
"/><input type="hidden" name="source_module" value="<?php echo $_smarty_tpl->tpl_vars['SOURCE_MODULE']->value;?>
"/><?php if (!empty($_smarty_tpl->tpl_vars['PARENT_EMAIL_ID']->value)) {?><input type="hidden" name="parent_id" value="<?php echo $_smarty_tpl->tpl_vars['PARENT_EMAIL_ID']->value;?>
"/><input type="hidden" name="parent_record_id" value="<?php echo $_smarty_tpl->tpl_vars['PARENT_RECORD']->value;?>
"/><?php }
if (!empty($_smarty_tpl->tpl_vars['RECORDID']->value)) {?><input type="hidden" name="record" value="<?php echo $_smarty_tpl->tpl_vars['RECORDID']->value;?>
"/><?php }?><input type="hidden" name="search_key" value="<?php echo $_smarty_tpl->tpl_vars['SEARCH_KEY']->value;?>
"/><input type="hidden" name="operator" value="<?php echo $_smarty_tpl->tpl_vars['OPERATOR']->value;?>
"/><input type="hidden" name="search_value" value="<?php echo $_smarty_tpl->tpl_vars['ALPHABET_VALUE']->value;?>
"/><input type="hidden" name="search_params" value='<?php echo ZEND_JSON::encode($_smarty_tpl->tpl_vars['SEARCH_PARAMS']->value);?>
'/><input type="hidden" name="email_template_ids" value='<?php echo $_smarty_tpl->tpl_vars['EMAIL_TEMPLATE_IDS']->value;?>
'/><input type="hidden" name="email_template_language" value='<?php echo $_smarty_tpl->tpl_vars['EMAIL_TEMPLATE_LANGUAGE']->value;?>
'/><input type="hidden" name="pdf_template_ids" value='<?php echo $_smarty_tpl->tpl_vars['PDF_TEMPLATE_IDS']->value;?>
'/><input type="hidden" name="pdf_template_language" value='<?php echo $_smarty_tpl->tpl_vars['PDF_TEMPLATE_LANGUAGE']->value;?>
'/><?php if ($_smarty_tpl->tpl_vars['IS_MERGE_TEMPLATES']->value) {?><input type="hidden" name="is_merge_templates" value='<?php echo $_smarty_tpl->tpl_vars['IS_MERGE_TEMPLATES']->value;?>
'/><?php }?><div class="topContent"><div class="row toEmailField"><div class="col-lg-12"><div class="col-lg-2"><span class="pull-right"><?php echo vtranslate('LBL_FROM_EMAIL',$_smarty_tpl->tpl_vars['MODULE']->value);?>
&nbsp</span></div><div class="col-lg-6"><?php $_smarty_tpl->_assignInScope('CURRENT_USER_ID', Users_Record_Model::getCurrentUserModel()->getId());?><select name="from_email" class="select2 inputElement"><optgroup label="<?php echo vtranslate('LBL_FROM_EMAIL',$_smarty_tpl->tpl_vars['MODULE']->value);?>
"><?php echo smarty_function_html_options(array('options'=>$_smarty_tpl->tpl_vars['FROM_EMAILS']->value,'selected'=>$_smarty_tpl->tpl_vars['SELECTED_DEFAULT_FROM']->value),$_smarty_tpl);?>
</optgroup><?php if ($_smarty_tpl->tpl_vars['SMTP_RECORDS']->value) {?><optgroup label="<?php echo vtranslate('LBL_SMTP',$_smarty_tpl->tpl_vars['MODULE']->value);?>
"><?php
$_from = $_smarty_tpl->smarty->ext->_foreach->init($_smarty_tpl, $_smarty_tpl->tpl_vars['SMTP_RECORDS']->value, 'SMTP_RECORD', false, 'SMTP_RECORD_ID');
$_smarty_tpl->tpl_vars['SMTP_RECORD']->do_else = true;
if ($_from !== null) foreach ($_from as $_smarty_tpl->tpl_vars['SMTP_RECORD_ID']->value => $_smarty_tpl->tpl_vars['SMTP_RECORD']->value) {
$_smarty_tpl->tpl_vars['SMTP_RECORD']->do_else = false;
if (!$_smarty_tpl->tpl_vars['SMTP_RECORD']->value->isEmpty('from_email_field')) {?><option value="s::<?php echo $_smarty_tpl->tpl_vars['SMTP_RECORD']->value->getId();?>
" <?php if ($_smarty_tpl->tpl_vars['SMTP_RECORD']->value->get('user_id') == $_smarty_tpl->tpl_vars['CURRENT_USER_ID']->value) {?>selected="selected"<?php }?>><?php echo $_smarty_tpl->tpl_vars['SMTP_RECORD']->value->get('from_name_field');?>
 &lt;<?php echo $_smarty_tpl->tpl_vars['SMTP_RECORD']->value->get('from_email_field');?>
&gt;</option><?php }
}
$_smarty_tpl->smarty->ext->_foreach->restore($_smarty_tpl, 1);?></optgroup><?php }?></select></div></div></div><?php if ($_smarty_tpl->tpl_vars['SINGLE_RECORD']->value != 'yes') {?><div class="row toEmailField"><div class="col-lg-12"><div class="col-lg-2"><span class="pull-right"><?php echo vtranslate('LBL_RECORDS_LIST',$_smarty_tpl->tpl_vars['SOURCEMODULE']->value);?>
&nbsp</span></div><div class="col-lg-6"><select name="emailSourcesList" class="select2 inputElement emailSourcesList"><?php echo smarty_function_html_options(array('options'=>$_smarty_tpl->tpl_vars['SOURCE_NAMES']->value,'selected'=>$_smarty_tpl->tpl_vars['SELECTED_SOURCEID']->value),$_smarty_tpl);?>
</select></div></div></div><?php }?><div class="row toEmailField"><div class="col-lg-12"><div class="col-lg-2"><span class="pull-right"><?php echo vtranslate('LBL_TO',$_smarty_tpl->tpl_vars['MODULE']->value);?>
&nbsp;<span class="redColor">*</span></span></div><div class="col-lg-6"><input id="emailField" style="width:100%" name="toEmail" type="text" class="autoComplete sourceField select2" data-rule-required="true" data-rule-multiEmails="true" value="" placeholder="<?php echo vtranslate('LBL_TYPE_AND_SEARCH',$_smarty_tpl->tpl_vars['MODULE']->value);?>
"><!-- //ITS4You:<?php echo Zend_Json::encode($_smarty_tpl->tpl_vars['TO_EMAILS']->value);?>
--></div><div class="col-lg-4 input-group"><select style="width: 140px;" class="select2 emailModulesList pull-right"><?php
$_from = $_smarty_tpl->smarty->ext->_foreach->init($_smarty_tpl, $_smarty_tpl->tpl_vars['RELATED_MODULES']->value, 'MODULE_NAME');
$_smarty_tpl->tpl_vars['MODULE_NAME']->do_else = true;
if ($_from !== null) foreach ($_from as $_smarty_tpl->tpl_vars['MODULE_NAME']->value) {
$_smarty_tpl->tpl_vars['MODULE_NAME']->do_else = false;
?><option value="<?php echo $_smarty_tpl->tpl_vars['MODULE_NAME']->value;?>
" <?php if ($_smarty_tpl->tpl_vars['MODULE_NAME']->value == $_smarty_tpl->tpl_vars['RELATED_MODULE_SELECTED']->value) {?> selected <?php }?>><?php echo vtranslate($_smarty_tpl->tpl_vars['MODULE_NAME']->value,$_smarty_tpl->tpl_vars['MODULE_NAME']->value);?>
</option><?php
}
$_smarty_tpl->smarty->ext->_foreach->restore($_smarty_tpl, 1);?></select><a href="#" class="clearReferenceSelection cursorPointer" name="clearToEmailField"> X </a><span class="input-group-addon"><span class="selectEmail cursorPointer"><i class="fa fa-search" title="<?php echo vtranslate('LBL_SELECT',$_smarty_tpl->tpl_vars['MODULE']->value);?>
"></i></span></span></div></div></div><div class="row <?php if (empty($_smarty_tpl->tpl_vars['CC']->value)) {?> hide <?php }?> ccContainer ccEmailField"><div class="col-lg-12"><div class="col-lg-2"><span class="pull-right"><?php echo vtranslate('LBL_CC',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</span></div><div class="col-lg-6"><input id="emailccField" style="width:100%" name="ccEmail" type="text" class="autoComplete sourceField select2" data-rule-multiEmails="true" value="" placeholder="<?php echo vtranslate('LBL_TYPE_AND_SEARCH',$_smarty_tpl->tpl_vars['MODULE']->value);?>
"></div><div class="col-lg-4"></div></div></div><div class="row <?php if (empty($_smarty_tpl->tpl_vars['BCC']->value)) {?> hide <?php }?> bccContainer bccEmailField"><div class="col-lg-12"><div class="col-lg-2"><span class="pull-right"><?php echo vtranslate('LBL_BCC',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</span></div><div class="col-lg-6"><input id="emailbccField" style="width:100%" name="bccEmail" type="text" class="autoComplete sourceField select2" data-rule-multiEmails="true" value="" placeholder="<?php echo vtranslate('LBL_TYPE_AND_SEARCH',$_smarty_tpl->tpl_vars['MODULE']->value);?>
"></div><div class="col-lg-4"></div></div></div><div class="row <?php if ((!empty($_smarty_tpl->tpl_vars['CC']->value)) && (!empty($_smarty_tpl->tpl_vars['BCC']->value))) {?> hide <?php }?> "><div class="col-lg-12"><div class="col-lg-2"></div><div class="col-lg-6"><a href="#" class="cursorPointer <?php if ((!empty($_smarty_tpl->tpl_vars['CC']->value))) {?>hide<?php }?>" id="ccLink"><?php echo vtranslate('LBL_ADD_CC',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</a>&nbsp;&nbsp;<a href="#" class="cursorPointer <?php if ((!empty($_smarty_tpl->tpl_vars['BCC']->value))) {?>hide<?php }?>" id="bccLink"><?php echo vtranslate('LBL_ADD_BCC',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</a></div><div class="col-lg-4"></div></div></div><div class="row subjectField"><div class="col-lg-12"><div class="col-lg-2"><span class="pull-right"><?php echo vtranslate('LBL_SUBJECT',$_smarty_tpl->tpl_vars['MODULE']->value);?>
&nbsp;<span class="redColor">*</span></span></div><div class="col-lg-6"><input type="text" name="subject" value="<?php echo $_smarty_tpl->tpl_vars['SUBJECT']->value;?>
" data-rule-required="true" id="subject" spellcheck="true" class="inputElement"/></div><div class="col-lg-4"></div></div></div><div class="row attachment"><div class="col-lg-12"><div class="col-lg-2"><span class="pull-right"><?php echo vtranslate('LBL_ATTACHMENT',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</span></div><div class="col-lg-6"><div class="dropdown display-inline-block"><div class="dropdown-toggle btn btn-default" data-toggle="dropdown"><span style="margin-right: 1rem;"><?php echo vtranslate('LBL_MORE',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</span><i class="fa fa-caret-down"></i></div><ul class="dropdown-menu dropdown-menu-right"><li><div class="dropdown-item" style="padding: 4px 6px;"><input type="file" class="<?php if ($_smarty_tpl->tpl_vars['FILE_ATTACHED']->value) {?>removeNoFileChosen<?php }?>" id="multiFile" name="file[]" title="<?php echo vtranslate('LBL_UPLOAD',$_smarty_tpl->tpl_vars['MODULE']->value);?>
"/></div></li><li><a class="dropdown-item" href="#" id="browseCrm" data-url="<?php echo $_smarty_tpl->tpl_vars['DOCUMENTS_URL']->value;?>
" title="<?php echo vtranslate('LBL_BROWSE_CRM',$_smarty_tpl->tpl_vars['MODULE']->value);?>
"><?php echo vtranslate('LBL_BROWSE_CRM',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</a></li><?php if ($_smarty_tpl->tpl_vars['RECORD_DOCUMENTS_URL']->value) {?><li><a class="dropdown-item" href="#" id="browseRecord" data-url="<?php echo $_smarty_tpl->tpl_vars['RECORD_DOCUMENTS_URL']->value;?>
" title="<?php echo vtranslate('LBL_BROWSE_RECORD',$_smarty_tpl->tpl_vars['MODULE']->value);?>
"><?php echo vtranslate('LBL_BROWSE_RECORD',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</a></li><?php }?></ul></div><div><div id="attachments" style="margin-top: 1rem;"><?php
$_from = $_smarty_tpl->smarty->ext->_foreach->init($_smarty_tpl, $_smarty_tpl->tpl_vars['ATTACHMENTS']->value, 'ATTACHMENT');
$_smarty_tpl->tpl_vars['ATTACHMENT']->do_else = true;
if ($_from !== null) foreach ($_from as $_smarty_tpl->tpl_vars['ATTACHMENT']->value) {
$_smarty_tpl->tpl_vars['ATTACHMENT']->do_else = false;
if ((call_user_func_array($_smarty_tpl->registered_plugins[ 'modifier' ][ 'array_key_exists' ][ 0 ], array( 'docid',$_smarty_tpl->tpl_vars['ATTACHMENT']->value )))) {
$_smarty_tpl->_assignInScope('DOCUMENT_ID', $_smarty_tpl->tpl_vars['ATTACHMENT']->value['docid']);
$_smarty_tpl->_assignInScope('FILE_TYPE', "document");
} else {
$_smarty_tpl->_assignInScope('FILE_TYPE', "file");
}?><div class="MultiFile-label customAttachment" data-file-id="<?php echo $_smarty_tpl->tpl_vars['ATTACHMENT']->value['fileid'];?>
" data-file-type="<?php echo $_smarty_tpl->tpl_vars['FILE_TYPE']->value;?>
" data-file-size="<?php echo $_smarty_tpl->tpl_vars['ATTACHMENT']->value['size'];?>
" <?php if ($_smarty_tpl->tpl_vars['FILE_TYPE']->value == "document") {?> data-document-id="<?php echo $_smarty_tpl->tpl_vars['DOCUMENT_ID']->value;?>
"<?php }?>><?php if ($_smarty_tpl->tpl_vars['ATTACHMENT']->value['nondeletable'] != true) {?><a name="removeAttachment" class="removeAttachment cursorPointer">x </a><?php }?><span><?php echo $_smarty_tpl->tpl_vars['ATTACHMENT']->value['attachment'];?>
</span></div><?php
}
$_smarty_tpl->smarty->ext->_foreach->restore($_smarty_tpl, 1);?></div><?php if ($_smarty_tpl->tpl_vars['PDF_TEMPLATES']->value) {?><input type="hidden" name="pdftemplateids" value="<?php echo $_smarty_tpl->tpl_vars['PDF_TEMPLATE_IDS']->value;?>
"><input type="hidden" name="pdflanguage" value="<?php echo $_smarty_tpl->tpl_vars['PDF_TEMPLATE_LANGUAGE']->value;?>
"><?php
$_from = $_smarty_tpl->smarty->ext->_foreach->init($_smarty_tpl, $_smarty_tpl->tpl_vars['PDF_TEMPLATES']->value, 'PDF_TEMPLATE_NAME', false, 'PDF_TEMPLATE_ID');
$_smarty_tpl->tpl_vars['PDF_TEMPLATE_NAME']->do_else = true;
if ($_from !== null) foreach ($_from as $_smarty_tpl->tpl_vars['PDF_TEMPLATE_ID']->value => $_smarty_tpl->tpl_vars['PDF_TEMPLATE_NAME']->value) {
$_smarty_tpl->tpl_vars['PDF_TEMPLATE_NAME']->do_else = false;
?><div class="row"><a href="#" class="generatePreviewPDF cursorPointer" data-templateid="<?php echo $_smarty_tpl->tpl_vars['PDF_TEMPLATE_ID']->value;?>
"><i class="fa fa-file-pdf-o" aria-hidden="true"></i><span style="margin-left: 1rem"><?php echo $_smarty_tpl->tpl_vars['PDF_TEMPLATE_NAME']->value;?>
</span></a></div><?php
}
$_smarty_tpl->smarty->ext->_foreach->restore($_smarty_tpl, 1);
}?></div></div><div class="col-lg-4 insertTemplate" style="text-align: right;"><button id="selectEmailTemplate" class="btn btn-success pull-right" data-url="<?php echo ITS4YouEmails_Record_Model::getSelectTemplateUrl($_smarty_tpl->tpl_vars['SOURCERECORD']->value,$_smarty_tpl->tpl_vars['SOURCEMODULE']->value);?>
"><?php echo vtranslate('LBL_SELECT_EMAIL_TEMPLATE',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</button></div></div></div><div class="row"><div class="col-lg-12"><button type="button" class="btn btn-default includeSignature"><?php echo vtranslate('LBL_INCLUDE_SIGNATURE',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</button></div></div></div><div class="container-fluid hide" id='emailTemplateWarning'><div class="alert alert-warning fade in"><a href="#" class="close" data-dismiss="alert">&times;</a><p><?php echo vtranslate('LBL_EMAILTEMPLATE_WARNING_CONTENT',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</p></div></div><div class="row templateContent"><div class="col-lg-12"><textarea style="width:390px;height:200px;" id="description" name="description"><?php echo $_smarty_tpl->tpl_vars['DESCRIPTION']->value;?>
</textarea></div></div><?php if ($_smarty_tpl->tpl_vars['RELATED_LOAD']->value == true) {?><input type="hidden" name="related_load" value=<?php echo $_smarty_tpl->tpl_vars['RELATED_LOAD']->value;?>
/><?php }?><input type="hidden" name="attachments" value='<?php echo ZEND_JSON::encode($_smarty_tpl->tpl_vars['ATTACHMENTS']->value);?>
'/><div id="emailTemplateWarningContent" style="display: none;"><?php echo vtranslate('LBL_EMAILTEMPLATE_WARNING_CONTENT',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</div></div><div class="modal-footer"><div class="pull-right cancelLinkContainer"><a href="#" class="cancelLink" type="reset" data-dismiss="modal"><?php echo vtranslate('LBL_CANCEL',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</a></div><button id="sendEmail" name="sendemail" class="btn btn-success" title="<?php echo vtranslate("LBL_SEND_EMAIL",$_smarty_tpl->tpl_vars['MODULE']->value);?>
" type="submit"><strong><?php echo vtranslate("LBL_SEND_EMAIL",$_smarty_tpl->tpl_vars['MODULE']->value);?>
</strong></button></div></form></div></div><?php }
}
