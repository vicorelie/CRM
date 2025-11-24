<?php
/* Smarty version 4.5.5, created on 2025-11-23 20:27:08
  from '/var/www/CRM/ARIDEM/layouts/v7/modules/PDFMaker/CreateDocument.tpl' */

/* @var Smarty_Internal_Template $_smarty_tpl */
if ($_smarty_tpl->_decodeProperties($_smarty_tpl, array (
  'version' => '4.5.5',
  'unifunc' => 'content_69236e1cb02ca1_15615684',
  'has_nocache_code' => false,
  'file_dependency' => 
  array (
    '1ea66e0c6e5a764fb32aa6fa172c58ac815cdccb' => 
    array (
      0 => '/var/www/CRM/ARIDEM/layouts/v7/modules/PDFMaker/CreateDocument.tpl',
      1 => 1763928225,
      2 => 'file',
    ),
  ),
  'includes' => 
  array (
  ),
),false)) {
function content_69236e1cb02ca1_15615684 (Smarty_Internal_Template $_smarty_tpl) {
?>
<div class="modal-dialog modelContainer"><div class="modal-content" style="width:675px;"><?php ob_start();
echo $_smarty_tpl->tpl_vars['MODULE_NAME']->value;
$_prefixVariable1 = ob_get_clean();
ob_start();
echo vtranslate('LBL_SAVEASDOC',$_prefixVariable1);
$_prefixVariable2 = ob_get_clean();
$_smarty_tpl->_assignInScope('HEADER_TITLE', $_prefixVariable2);
$_smarty_tpl->_assignInScope('MODULE', "Documents");
$_smarty_tpl->_subTemplateRender(call_user_func_array($_smarty_tpl->registered_plugins[ 'modifier' ][ 'vtemplate_path' ][ 0 ], array( "ModalHeader.tpl",$_smarty_tpl->tpl_vars['MODULE']->value )), $_smarty_tpl->cache_id, $_smarty_tpl->compile_id, 0, $_smarty_tpl->cache_lifetime, array('TITLE'=>$_smarty_tpl->tpl_vars['HEADER_TITLE']->value), 0, true);
?><div class="modal-body"><div class="uploadview-content container-fluid"><div id="create"><form class="form-horizontal recordEditView" name="upload" method="post" action="index.php"><input type="hidden" name="module" value="<?php echo $_smarty_tpl->tpl_vars['MODULE_NAME']->value;?>
" /><input type="hidden" name="action" value="SaveIntoDocuments" /><input type="hidden" name="pmodule" value="<?php echo $_smarty_tpl->tpl_vars['PMODULE']->value;?>
" /><input type="hidden" name="pid" value="<?php echo $_smarty_tpl->tpl_vars['PID']->value;?>
" /><?php
$_from = $_smarty_tpl->smarty->ext->_foreach->init($_smarty_tpl, $_smarty_tpl->tpl_vars['FORM_ATTRIBUTES']->value, 'ATTR_VALUE', false, 'ATTR_NAME');
$_smarty_tpl->tpl_vars['ATTR_VALUE']->do_else = true;
if ($_from !== null) foreach ($_from as $_smarty_tpl->tpl_vars['ATTR_NAME']->value => $_smarty_tpl->tpl_vars['ATTR_VALUE']->value) {
$_smarty_tpl->tpl_vars['ATTR_VALUE']->do_else = false;
?><input type="hidden" name="<?php echo $_smarty_tpl->tpl_vars['ATTR_NAME']->value;?>
" value="<?php echo $_smarty_tpl->tpl_vars['ATTR_VALUE']->value;?>
" /><?php
}
$_smarty_tpl->smarty->ext->_foreach->restore($_smarty_tpl, 1);
$_from = $_smarty_tpl->smarty->ext->_foreach->init($_smarty_tpl, $_smarty_tpl->tpl_vars['TEMPLATE_ATTRIBUTES']->value, 'TEMPLATE_VALUE', false, 'TEMPLATE_KEY');
$_smarty_tpl->tpl_vars['TEMPLATE_VALUE']->do_else = true;
if ($_from !== null) foreach ($_from as $_smarty_tpl->tpl_vars['TEMPLATE_KEY']->value => $_smarty_tpl->tpl_vars['TEMPLATE_VALUE']->value) {
$_smarty_tpl->tpl_vars['TEMPLATE_VALUE']->do_else = false;
?><textarea name="<?php echo $_smarty_tpl->tpl_vars['TEMPLATE_KEY']->value;?>
" class="hide"><?php echo $_smarty_tpl->tpl_vars['TEMPLATE_VALUE']->value;?>
</textarea><?php
}
$_smarty_tpl->smarty->ext->_foreach->restore($_smarty_tpl, 1);?><table class="massEditTable table no-border"><tr><?php $_smarty_tpl->_assignInScope('FIELD_MODEL', $_smarty_tpl->tpl_vars['FIELD_MODELS']->value['notes_title']);?><td class="fieldLabel col-lg-2"><label class="muted pull-right"><?php echo vtranslate($_smarty_tpl->tpl_vars['FIELD_MODEL']->value->get('label'),$_smarty_tpl->tpl_vars['MODULE']->value);?>
&nbsp;<?php if ($_smarty_tpl->tpl_vars['FIELD_MODEL']->value->isMandatory() == true) {?><span class="redColor">*</span><?php }?></label></td><td class="fieldValue col-lg-4" colspan="3"><?php $_smarty_tpl->_subTemplateRender(vtemplate_path($_smarty_tpl->tpl_vars['FIELD_MODEL']->value->getUITypeModel()->getTemplateName(),$_smarty_tpl->tpl_vars['MODULE']->value), $_smarty_tpl->cache_id, $_smarty_tpl->compile_id, 0, $_smarty_tpl->cache_lifetime, array(), 0, true);
?></td></tr><tr><?php $_smarty_tpl->_assignInScope('FIELD_MODEL', $_smarty_tpl->tpl_vars['FIELD_MODELS']->value['assigned_user_id']);?><td class="fieldLabel col-lg-2"><label class="muted pull-right"><?php echo vtranslate($_smarty_tpl->tpl_vars['FIELD_MODEL']->value->get('label'),$_smarty_tpl->tpl_vars['MODULE']->value);?>
&nbsp;<?php if ($_smarty_tpl->tpl_vars['FIELD_MODEL']->value->isMandatory() == true) {?><span class="redColor">*</span><?php }?></label></td><td class="fieldValue col-lg-4"><?php $_smarty_tpl->_subTemplateRender(vtemplate_path($_smarty_tpl->tpl_vars['FIELD_MODEL']->value->getUITypeModel()->getTemplateName(),$_smarty_tpl->tpl_vars['MODULE']->value), $_smarty_tpl->cache_id, $_smarty_tpl->compile_id, 0, $_smarty_tpl->cache_lifetime, array(), 0, true);
?></td><?php $_smarty_tpl->_assignInScope('FIELD_MODEL', $_smarty_tpl->tpl_vars['FIELD_MODELS']->value['folderid']);
if ($_smarty_tpl->tpl_vars['FIELD_MODELS']->value['folderid']) {?><td class="fieldLabel col-lg-2"><label class="muted pull-right"><?php echo vtranslate($_smarty_tpl->tpl_vars['FIELD_MODEL']->value->get('label'),$_smarty_tpl->tpl_vars['MODULE']->value);?>
&nbsp;<?php if ($_smarty_tpl->tpl_vars['FIELD_MODEL']->value->isMandatory() == true) {?><span class="redColor">*</span><?php }?></label></td><td class="fieldValue col-lg-4"><?php $_smarty_tpl->_subTemplateRender(vtemplate_path($_smarty_tpl->tpl_vars['FIELD_MODEL']->value->getUITypeModel()->getTemplateName(),$_smarty_tpl->tpl_vars['MODULE']->value), $_smarty_tpl->cache_id, $_smarty_tpl->compile_id, 0, $_smarty_tpl->cache_lifetime, array(), 0, true);
?></td><?php }?></tr><input type="hidden" name='filelocationtype' value="I" /><?php $_smarty_tpl->_assignInScope('FIELD_MODEL', $_smarty_tpl->tpl_vars['FIELD_MODELS']->value['notecontent']);
if ($_smarty_tpl->tpl_vars['FIELD_MODELS']->value['notecontent']) {?></tr><td class="fieldLabel col-lg-2"><label class="muted pull-right"><?php echo vtranslate($_smarty_tpl->tpl_vars['FIELD_MODEL']->value->get('label'),$_smarty_tpl->tpl_vars['MODULE']->value);?>
&nbsp;<?php if ($_smarty_tpl->tpl_vars['FIELD_MODEL']->value->isMandatory() == true) {?><span class="redColor">*</span><?php }?></label></td><td class="fieldValue col-lg-4" colspan="3"><?php $_smarty_tpl->_subTemplateRender(vtemplate_path($_smarty_tpl->tpl_vars['FIELD_MODEL']->value->getUITypeModel()->getTemplateName(),$_smarty_tpl->tpl_vars['MODULE']->value), $_smarty_tpl->cache_id, $_smarty_tpl->compile_id, 0, $_smarty_tpl->cache_lifetime, array(), 0, true);
?></td></tr><?php }?><tr><?php $_smarty_tpl->_assignInScope('HARDCODED_FIELDS', call_user_func_array($_smarty_tpl->registered_plugins[ 'modifier' ][ 'explode' ][ 0 ], array( ',',"filename,assigned_user_id,folderid,notecontent,notes_title,filelocationtype" )));
$_smarty_tpl->_assignInScope('COUNTER', 0);
$_from = $_smarty_tpl->smarty->ext->_foreach->init($_smarty_tpl, $_smarty_tpl->tpl_vars['FIELD_MODELS']->value, 'FIELD_MODEL', false, 'FIELD_NAME');
$_smarty_tpl->tpl_vars['FIELD_MODEL']->do_else = true;
if ($_from !== null) foreach ($_from as $_smarty_tpl->tpl_vars['FIELD_NAME']->value => $_smarty_tpl->tpl_vars['FIELD_MODEL']->value) {
$_smarty_tpl->tpl_vars['FIELD_MODEL']->do_else = false;
if (!in_array($_smarty_tpl->tpl_vars['FIELD_NAME']->value,$_smarty_tpl->tpl_vars['HARDCODED_FIELDS']->value) && ($_smarty_tpl->tpl_vars['FIELD_MODEL']->value->isMandatory() || $_smarty_tpl->tpl_vars['FIELD_MODEL']->value->isQuickCreateEnabled())) {
$_smarty_tpl->_assignInScope('isReferenceField', $_smarty_tpl->tpl_vars['FIELD_MODEL']->value->getFieldDataType());
$_smarty_tpl->_assignInScope('referenceList', $_smarty_tpl->tpl_vars['FIELD_MODEL']->value->getReferenceList());
$_smarty_tpl->_assignInScope('referenceListCount', PDFMaker_Utils_Helper::count($_smarty_tpl->tpl_vars['referenceList']->value));
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
$_smarty_tpl->_assignInScope('taxCount', PDFMaker_Utils_Helper::count($_smarty_tpl->tpl_vars['TAXCLASS_DETAILS']->value)%2);
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
$_smarty_tpl->smarty->ext->_foreach->restore($_smarty_tpl, 1);?></tr></table></form></div></div></div><?php ob_start();
echo vtranslate('LBL_CREATE',$_smarty_tpl->tpl_vars['MODULE']->value);
$_prefixVariable3 = ob_get_clean();
$_smarty_tpl->_assignInScope('BUTTON_NAME', $_prefixVariable3);
$_smarty_tpl->_assignInScope('BUTTON_ID', "js-create-document");
$_smarty_tpl->_subTemplateRender(call_user_func_array($_smarty_tpl->registered_plugins[ 'modifier' ][ 'vtemplate_path' ][ 0 ], array( "ModalFooter.tpl",$_smarty_tpl->tpl_vars['MODULE']->value )), $_smarty_tpl->cache_id, $_smarty_tpl->compile_id, 0, $_smarty_tpl->cache_lifetime, array(), 0, true);
?></div></div><?php }
}
