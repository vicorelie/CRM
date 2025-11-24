<?php
/* Smarty version 4.5.5, created on 2025-11-21 09:03:07
  from '/var/www/CRM/ARIDEM/layouts/v7/modules/Documents/ListViewRecordActions.tpl' */

/* @var Smarty_Internal_Template $_smarty_tpl */
if ($_smarty_tpl->_decodeProperties($_smarty_tpl, array (
  'version' => '4.5.5',
  'unifunc' => 'content_69202acb024dc7_78237174',
  'has_nocache_code' => false,
  'file_dependency' => 
  array (
    'ac2ee4113478b0e675537e0b01fdc61aa46929ca' => 
    array (
      0 => '/var/www/CRM/ARIDEM/layouts/v7/modules/Documents/ListViewRecordActions.tpl',
      1 => 1752052260,
      2 => 'file',
    ),
  ),
  'includes' => 
  array (
  ),
),false)) {
function content_69202acb024dc7_78237174 (Smarty_Internal_Template $_smarty_tpl) {
?><!--LIST VIEW RECORD ACTIONS--><div class="table-actions"><?php if (!$_smarty_tpl->tpl_vars['SEARCH_MODE_RESULTS']->value) {?><span class="input" ><input type="checkbox" value="<?php echo $_smarty_tpl->tpl_vars['LISTVIEW_ENTRY']->value->getId();?>
" class="listViewEntriesCheckBox"/></span><?php }
if ($_smarty_tpl->tpl_vars['LISTVIEW_ENTRY']->value->get('starred') == vtranslate('LBL_YES',$_smarty_tpl->tpl_vars['MODULE']->value)) {
$_smarty_tpl->_assignInScope('STARRED', true);
} else {
$_smarty_tpl->_assignInScope('STARRED', false);
}
if ($_smarty_tpl->tpl_vars['MODULE_MODEL']->value->isStarredEnabled()) {?><span><a class="markStar fa icon action <?php if ($_smarty_tpl->tpl_vars['STARRED']->value) {?> fa-star active <?php } else { ?> fa-star-o<?php }?>" title="<?php if ($_smarty_tpl->tpl_vars['STARRED']->value) {?> <?php echo vtranslate('LBL_STARRED',$_smarty_tpl->tpl_vars['MODULE']->value);?>
 <?php } else { ?> <?php echo vtranslate('LBL_NOT_STARRED',$_smarty_tpl->tpl_vars['MODULE']->value);
}?>"></a></span><?php }?><span class="more dropdown action"><span class="dropdown-toggle" data-toggle="dropdown"><i class="fa fa-ellipsis-v icon"></i></span><ul class="dropdown-menu"><li><a data-id="<?php echo $_smarty_tpl->tpl_vars['LISTVIEW_ENTRY']->value->getId();?>
" href="<?php echo $_smarty_tpl->tpl_vars['LISTVIEW_ENTRY']->value->getFullDetailViewUrl();?>
"><?php echo vtranslate('LBL_DETAILS',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</a></li><?php if ($_smarty_tpl->tpl_vars['RECORD_ACTIONS']->value) {
if ($_smarty_tpl->tpl_vars['RECORD_ACTIONS']->value['edit']) {?><li><a data-id="<?php echo $_smarty_tpl->tpl_vars['LISTVIEW_ENTRY']->value->getId();?>
" href="javascript:void(0);" data-url="<?php echo $_smarty_tpl->tpl_vars['LISTVIEW_ENTRY']->value->getEditViewUrl();?>
" name="editlink"><?php echo vtranslate('LBL_EDIT',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</a></li><?php }
if ($_smarty_tpl->tpl_vars['RECORD_ACTIONS']->value['delete']) {?><li><a data-id="<?php echo $_smarty_tpl->tpl_vars['LISTVIEW_ENTRY']->value->getId();?>
" href="javascript:void(0);" class="deleteRecordButton"><?php echo vtranslate('LBL_DELETE',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</a></li><?php }
}
$_smarty_tpl->_assignInScope('RECORD_ID', $_smarty_tpl->tpl_vars['LISTVIEW_ENTRY']->value->getId());
$_smarty_tpl->_assignInScope('DOCUMENT_RECORD_MODEL', Vtiger_Record_Model::getInstanceById($_smarty_tpl->tpl_vars['RECORD_ID']->value));
if ($_smarty_tpl->tpl_vars['DOCUMENT_RECORD_MODEL']->value->get('filename') && $_smarty_tpl->tpl_vars['DOCUMENT_RECORD_MODEL']->value->get('filestatus')) {?><li><a data-id="<?php echo $_smarty_tpl->tpl_vars['LISTVIEW_ENTRY']->value->getId();?>
" name="viewfile" href="javascript:void(0)" data-filelocationtype="<?php echo $_smarty_tpl->tpl_vars['DOCUMENT_RECORD_MODEL']->value->get('filelocationtype');?>
" data-filename="<?php echo $_smarty_tpl->tpl_vars['DOCUMENT_RECORD_MODEL']->value->get('filename');?>
" onclick="Vtiger_Header_Js.previewFile(event)">File Preview</a></li><?php }
if ($_smarty_tpl->tpl_vars['DOCUMENT_RECORD_MODEL']->value->get('filename') && $_smarty_tpl->tpl_vars['DOCUMENT_RECORD_MODEL']->value->get('filestatus') && $_smarty_tpl->tpl_vars['DOCUMENT_RECORD_MODEL']->value->get('filelocationtype') == 'I') {?><li><a data-id="<?php echo $_smarty_tpl->tpl_vars['LISTVIEW_ENTRY']->value->getId();?>
" name="downloadfile" href="<?php echo $_smarty_tpl->tpl_vars['DOCUMENT_RECORD_MODEL']->value->getDownloadFileURL();?>
">Download</a></li><?php }?></ul></span><div class="btn-group inline-save hide"><button class="button btn-success btn-small save" name="save"><i class="fa fa-check"></i></button><button class="button btn-danger btn-small cancel" name="Cancel"><i class="fa fa-close"></i></button></div></div>
<?php }
}
