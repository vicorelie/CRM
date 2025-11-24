<?php
/* Smarty version 4.5.5, created on 2025-11-21 09:02:39
  from '/var/www/CRM/ARIDEM/layouts/v7/modules/Documents/UploadDocument.tpl' */

/* @var Smarty_Internal_Template $_smarty_tpl */
if ($_smarty_tpl->_decodeProperties($_smarty_tpl, array (
  'version' => '4.5.5',
  'unifunc' => 'content_69202aaf9e8828_19551660',
  'has_nocache_code' => false,
  'file_dependency' => 
  array (
    '316aeb956ebcca7b75442c6c0d675f8262de9362' => 
    array (
      0 => '/var/www/CRM/ARIDEM/layouts/v7/modules/Documents/UploadDocument.tpl',
      1 => 1752052260,
      2 => 'file',
    ),
  ),
  'includes' => 
  array (
  ),
),false)) {
function content_69202aaf9e8828_19551660 (Smarty_Internal_Template $_smarty_tpl) {
?>
<div class="modal-dialog modelContainer"><?php ob_start();
echo vtranslate('LBL_UPLOAD_TO_VTIGER',$_smarty_tpl->tpl_vars['MODULE']->value);
$_prefixVariable1 = ob_get_clean();
$_smarty_tpl->_assignInScope('HEADER_TITLE', $_prefixVariable1);?><div class="modal-content" style="width:675px;"><form class="form-horizontal recordEditView" name="upload" method="post" action="index.php"><?php $_smarty_tpl->_subTemplateRender(call_user_func_array($_smarty_tpl->registered_plugins[ 'modifier' ][ 'vtemplate_path' ][ 0 ], array( "ModalHeader.tpl",$_smarty_tpl->tpl_vars['MODULE']->value )), $_smarty_tpl->cache_id, $_smarty_tpl->compile_id, 0, $_smarty_tpl->cache_lifetime, array('TITLE'=>$_smarty_tpl->tpl_vars['HEADER_TITLE']->value), 0, true);
?><div class="modal-body"><div class="uploadview-content container-fluid"><div class="uploadcontrols row"><div id="upload" data-filelocationtype="I"><?php if (!empty($_smarty_tpl->tpl_vars['PICKIST_DEPENDENCY_DATASOURCE']->value)) {?><input type="hidden" name="picklistDependency" value='<?php echo Vtiger_Util_Helper::toSafeHTML($_smarty_tpl->tpl_vars['PICKIST_DEPENDENCY_DATASOURCE']->value);?>
' /><?php }?><input type="hidden" name="module" value="<?php echo $_smarty_tpl->tpl_vars['MODULE']->value;?>
" /><input type="hidden" name="action" value="SaveAjax" /><input type="hidden" name="document_source" value="Vtiger" /><?php if ((isset($_smarty_tpl->tpl_vars['RELATION_OPERATOR']->value)) && $_smarty_tpl->tpl_vars['RELATION_OPERATOR']->value == 'true') {?><input type="hidden" name="relationOperation" value="<?php echo $_smarty_tpl->tpl_vars['RELATION_OPERATOR']->value;?>
" /><input type="hidden" name="sourceModule" value="<?php echo $_smarty_tpl->tpl_vars['PARENT_MODULE']->value;?>
" /><input type="hidden" name="sourceRecord" value="<?php echo $_smarty_tpl->tpl_vars['PARENT_ID']->value;?>
" /><?php if ((isset($_smarty_tpl->tpl_vars['RELATION_FIELD_NAME']->value))) {?><input type="hidden" name="<?php echo $_smarty_tpl->tpl_vars['RELATION_FIELD_NAME']->value;?>
" value="<?php echo $_smarty_tpl->tpl_vars['PARENT_ID']->value;?>
" /><?php }
}?><input type="hidden" name="max_upload_limit" value="<?php echo $_smarty_tpl->tpl_vars['MAX_UPLOAD_LIMIT_BYTES']->value;?>
" /><input type="hidden" name="max_upload_limit_mb" value="<?php echo $_smarty_tpl->tpl_vars['MAX_UPLOAD_LIMIT_MB']->value;?>
" /><div id="dragandrophandler" class="dragdrop-dotted"><div style="font-size:175%;"><span class="fa fa-upload"></span>&nbsp;&nbsp;<?php echo vtranslate('LBL_DRAG_&_DROP_FILE_HERE',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</div><div style="margin-top: 1%;text-transform: uppercase;margin-bottom: 2%;"><?php echo vtranslate('LBL_OR',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</div><div><div class="fileUploadBtn btn btn-primary"><span><i class="fa fa-laptop"></i> <?php echo vtranslate('LBL_SELECT_FILE_FROM_COMPUTER',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</span><?php $_smarty_tpl->_assignInScope('FIELD_MODEL', $_smarty_tpl->tpl_vars['FIELD_MODELS']->value['filename']);?><input type="file" name="<?php echo $_smarty_tpl->tpl_vars['FIELD_MODEL']->value->getFieldName();?>
" value="<?php if ((isset($_smarty_tpl->tpl_vars['FIELD_VALUE']->value))) {
echo $_smarty_tpl->tpl_vars['FIELD_VALUE']->value;
}?>" data-rule-required="true" /></div>&nbsp;&nbsp;&nbsp;<i class="fa fa-info-circle cursorPointer" data-toggle="tooltip" title="<?php echo vtranslate('LBL_MAX_UPLOAD_SIZE',$_smarty_tpl->tpl_vars['MODULE']->value);?>
 <?php echo $_smarty_tpl->tpl_vars['MAX_UPLOAD_LIMIT_MB']->value;
echo vtranslate('MB',$_smarty_tpl->tpl_vars['MODULE']->value);?>
"></i></div><div class="fileDetails"></div></div><table class="massEditTable table no-border"><tr><?php $_smarty_tpl->_assignInScope('FIELD_MODEL', $_smarty_tpl->tpl_vars['FIELD_MODELS']->value['notes_title']);?><td class="fieldLabel col-lg-2"><label class="muted pull-right"><?php echo vtranslate($_smarty_tpl->tpl_vars['FIELD_MODEL']->value->get('label'),$_smarty_tpl->tpl_vars['MODULE']->value);?>
&nbsp;<?php if ($_smarty_tpl->tpl_vars['FIELD_MODEL']->value->isMandatory() == true) {?><span class="redColor">*</span><?php }?></label></td><td class="fieldValue col-lg-4" colspan="3"><?php $_smarty_tpl->_subTemplateRender(vtemplate_path($_smarty_tpl->tpl_vars['FIELD_MODEL']->value->getUITypeModel()->getTemplateName(),$_smarty_tpl->tpl_vars['MODULE']->value), $_smarty_tpl->cache_id, $_smarty_tpl->compile_id, 0, $_smarty_tpl->cache_lifetime, array(), 0, true);
?></td></tr><tr><?php $_smarty_tpl->_assignInScope('FIELD_MODEL', $_smarty_tpl->tpl_vars['FIELD_MODELS']->value['assigned_user_id']);?><td class="fieldLabel col-lg-2"><label class="muted pull-right"><?php echo vtranslate($_smarty_tpl->tpl_vars['FIELD_MODEL']->value->get('label'),$_smarty_tpl->tpl_vars['MODULE']->value);?>
&nbsp;<?php if ($_smarty_tpl->tpl_vars['FIELD_MODEL']->value->isMandatory() == true) {?><span class="redColor">*</span><?php }?></label></td><td class="fieldValue col-lg-4"><?php $_smarty_tpl->_subTemplateRender(vtemplate_path($_smarty_tpl->tpl_vars['FIELD_MODEL']->value->getUITypeModel()->getTemplateName(),$_smarty_tpl->tpl_vars['MODULE']->value), $_smarty_tpl->cache_id, $_smarty_tpl->compile_id, 0, $_smarty_tpl->cache_lifetime, array(), 0, true);
?></td><?php $_smarty_tpl->_assignInScope('FIELD_MODEL', $_smarty_tpl->tpl_vars['FIELD_MODELS']->value['folderid']);
if ($_smarty_tpl->tpl_vars['FIELD_MODELS']->value['folderid']) {?><td class="fieldLabel col-lg-2"><label class="muted pull-right"><?php echo vtranslate($_smarty_tpl->tpl_vars['FIELD_MODEL']->value->get('label'),$_smarty_tpl->tpl_vars['MODULE']->value);?>
&nbsp;<?php if ($_smarty_tpl->tpl_vars['FIELD_MODEL']->value->isMandatory() == true) {?><span class="redColor">*</span><?php }?></label></td><td class="fieldValue col-lg-4"><?php $_smarty_tpl->_subTemplateRender(vtemplate_path($_smarty_tpl->tpl_vars['FIELD_MODEL']->value->getUITypeModel()->getTemplateName(),$_smarty_tpl->tpl_vars['MODULE']->value), $_smarty_tpl->cache_id, $_smarty_tpl->compile_id, 0, $_smarty_tpl->cache_lifetime, array(), 0, true);
?></td><?php }?></tr><tr><?php $_smarty_tpl->_assignInScope('FIELD_MODEL', $_smarty_tpl->tpl_vars['FIELD_MODELS']->value['notecontent']);
if ($_smarty_tpl->tpl_vars['FIELD_MODELS']->value['notecontent']) {?><td class="fieldLabel col-lg-2" colspan="1"><label class="muted pull-right"><?php echo vtranslate($_smarty_tpl->tpl_vars['FIELD_MODEL']->value->get('label'),$_smarty_tpl->tpl_vars['MODULE']->value);?>
&nbsp;<?php if ($_smarty_tpl->tpl_vars['FIELD_MODEL']->value->isMandatory() == true) {?><span class="redColor">*</span><?php }?></label></td><td class="fieldValue col-lg-4" colspan="3"><?php $_smarty_tpl->_subTemplateRender(vtemplate_path($_smarty_tpl->tpl_vars['FIELD_MODEL']->value->getUITypeModel()->getTemplateName(),$_smarty_tpl->tpl_vars['MODULE']->value), $_smarty_tpl->cache_id, $_smarty_tpl->compile_id, 0, $_smarty_tpl->cache_lifetime, array(), 0, true);
?></td><?php }?></tr><tr><?php $_smarty_tpl->_assignInScope('HARDCODED_FIELDS', call_user_func_array($_smarty_tpl->registered_plugins[ 'modifier' ][ 'explode' ][ 0 ], array( ',',"filename,assigned_user_id,folderid,notecontent,notes_title" )));
$_smarty_tpl->_assignInScope('COUNTER', 0);
$_from = $_smarty_tpl->smarty->ext->_foreach->init($_smarty_tpl, $_smarty_tpl->tpl_vars['FIELD_MODELS']->value, 'FIELD_MODEL', false, 'FIELD_NAME');
$_smarty_tpl->tpl_vars['FIELD_MODEL']->do_else = true;
if ($_from !== null) foreach ($_from as $_smarty_tpl->tpl_vars['FIELD_NAME']->value => $_smarty_tpl->tpl_vars['FIELD_MODEL']->value) {
$_smarty_tpl->tpl_vars['FIELD_MODEL']->do_else = false;
if (!in_array($_smarty_tpl->tpl_vars['FIELD_NAME']->value,$_smarty_tpl->tpl_vars['HARDCODED_FIELDS']->value) && $_smarty_tpl->tpl_vars['FIELD_MODEL']->value->isQuickCreateEnabled()) {
$_smarty_tpl->_assignInScope('isReferenceField', $_smarty_tpl->tpl_vars['FIELD_MODEL']->value->getFieldDataType());
$_smarty_tpl->_assignInScope('referenceList', $_smarty_tpl->tpl_vars['FIELD_MODEL']->value->getReferenceList());
$_smarty_tpl->_assignInScope('referenceListCount', php7_count($_smarty_tpl->tpl_vars['referenceList']->value));
if ($_smarty_tpl->tpl_vars['FIELD_MODEL']->value->get('uitype') == "19") {
if ($_smarty_tpl->tpl_vars['COUNTER']->value == '1') {?><td></td><td></td></tr><tr><?php $_smarty_tpl->_assignInScope('COUNTER', 0);
}
}
if ($_smarty_tpl->tpl_vars['COUNTER']->value == 2) {?></tr><tr><?php $_smarty_tpl->_assignInScope('COUNTER', 1);
} else {
$_smarty_tpl->_assignInScope('COUNTER', $_smarty_tpl->tpl_vars['COUNTER']->value+1);
}?><td class='fieldLabel col-lg-2'><?php if ($_smarty_tpl->tpl_vars['isReferenceField']->value != "reference") {?><label class="muted pull-right"><?php }
if ($_smarty_tpl->tpl_vars['isReferenceField']->value == "reference") {
if ($_smarty_tpl->tpl_vars['referenceListCount']->value > 1) {
$_smarty_tpl->_assignInScope('DISPLAYID', $_smarty_tpl->tpl_vars['FIELD_MODEL']->value->get('fieldvalue'));
$_smarty_tpl->_assignInScope('REFERENCED_MODULE_STRUCT', $_smarty_tpl->tpl_vars['FIELD_MODEL']->value->getUITypeModel()->getReferenceModule($_smarty_tpl->tpl_vars['DISPLAYID']->value));
if (!empty($_smarty_tpl->tpl_vars['REFERENCED_MODULE_STRUCT']->value)) {
$_smarty_tpl->_assignInScope('REFERENCED_MODULE_NAME', $_smarty_tpl->tpl_vars['REFERENCED_MODULE_STRUCT']->value->get('name'));
}?><span class="pull-right"><select style="width:150px;" class="select2 referenceModulesList <?php if ($_smarty_tpl->tpl_vars['FIELD_MODEL']->value->isMandatory() == true) {?>reference-mandatory<?php }?>"><?php
$_from = $_smarty_tpl->smarty->ext->_foreach->init($_smarty_tpl, $_smarty_tpl->tpl_vars['referenceList']->value, 'value', false, 'index');
$_smarty_tpl->tpl_vars['value']->do_else = true;
if ($_from !== null) foreach ($_from as $_smarty_tpl->tpl_vars['index']->value => $_smarty_tpl->tpl_vars['value']->value) {
$_smarty_tpl->tpl_vars['value']->do_else = false;
?><option value="<?php echo $_smarty_tpl->tpl_vars['value']->value;?>
" <?php if ($_smarty_tpl->tpl_vars['value']->value == $_smarty_tpl->tpl_vars['REFERENCED_MODULE_NAME']->value) {?> selected <?php }?> ><?php echo vtranslate($_smarty_tpl->tpl_vars['value']->value,$_smarty_tpl->tpl_vars['value']->value);?>
</option><?php
}
$_smarty_tpl->smarty->ext->_foreach->restore($_smarty_tpl, 1);?></select></span><?php } else { ?><label class="muted pull-right"><?php echo vtranslate($_smarty_tpl->tpl_vars['FIELD_MODEL']->value->get('label'),$_smarty_tpl->tpl_vars['MODULE']->value);?>
&nbsp;<?php if ($_smarty_tpl->tpl_vars['FIELD_MODEL']->value->isMandatory() == true) {?> <span class="redColor">*</span> <?php }?></label><?php }
} elseif ($_smarty_tpl->tpl_vars['FIELD_MODEL']->value->get('uitype') == '83') {
$_smarty_tpl->_subTemplateRender(vtemplate_path($_smarty_tpl->tpl_vars['FIELD_MODEL']->value->getUITypeModel()->getTemplateName(),$_smarty_tpl->tpl_vars['MODULE']->value), $_smarty_tpl->cache_id, $_smarty_tpl->compile_id, 0, $_smarty_tpl->cache_lifetime, array('COUNTER'=>$_smarty_tpl->tpl_vars['COUNTER']->value,'MODULE'=>$_smarty_tpl->tpl_vars['MODULE']->value), 0, true);
if ($_smarty_tpl->tpl_vars['TAXCLASS_DETAILS']->value) {
$_smarty_tpl->_assignInScope('taxCount', php7_count($_smarty_tpl->tpl_vars['TAXCLASS_DETAILS']->value)%2);
if ($_smarty_tpl->tpl_vars['taxCount']->value == 0) {
if ($_smarty_tpl->tpl_vars['COUNTER']->value == 2) {
$_smarty_tpl->_assignInScope('COUNTER', 1);
} else {
$_smarty_tpl->_assignInScope('COUNTER', 2);
}
}
}
} else {
echo vtranslate($_smarty_tpl->tpl_vars['FIELD_MODEL']->value->get('label'),$_smarty_tpl->tpl_vars['MODULE']->value);?>
&nbsp;<?php if ($_smarty_tpl->tpl_vars['FIELD_MODEL']->value->isMandatory() == true) {?> <span class="redColor">*</span> <?php }
}
if ($_smarty_tpl->tpl_vars['isReferenceField']->value != "reference") {?></label><?php }?></td><?php if ($_smarty_tpl->tpl_vars['FIELD_MODEL']->value->get('uitype') != '83') {?><td class="fieldValue col-lg-4" <?php if ($_smarty_tpl->tpl_vars['FIELD_MODEL']->value->get('uitype') == '19') {?> colspan="3" <?php $_smarty_tpl->_assignInScope('COUNTER', $_smarty_tpl->tpl_vars['COUNTER']->value+1);?> <?php }?>><?php $_smarty_tpl->_subTemplateRender(vtemplate_path($_smarty_tpl->tpl_vars['FIELD_MODEL']->value->getUITypeModel()->getTemplateName(),$_smarty_tpl->tpl_vars['MODULE']->value), $_smarty_tpl->cache_id, $_smarty_tpl->compile_id, 0, $_smarty_tpl->cache_lifetime, array(), 0, true);
?></td><?php }
}
}
$_smarty_tpl->smarty->ext->_foreach->restore($_smarty_tpl, 1);?></tr></table></div></div></div></div><?php ob_start();
echo vtranslate('LBL_UPLOAD',$_smarty_tpl->tpl_vars['MODULE']->value);
$_prefixVariable2 = ob_get_clean();
$_smarty_tpl->_assignInScope('BUTTON_NAME', $_prefixVariable2);
$_smarty_tpl->_assignInScope('BUTTON_ID', "js-upload-document");
$_smarty_tpl->_subTemplateRender(call_user_func_array($_smarty_tpl->registered_plugins[ 'modifier' ][ 'vtemplate_path' ][ 0 ], array( "ModalFooter.tpl",$_smarty_tpl->tpl_vars['MODULE']->value )), $_smarty_tpl->cache_id, $_smarty_tpl->compile_id, 0, $_smarty_tpl->cache_lifetime, array(), 0, true);
?></form></div></div>
<?php }
}
