<?php
/* Smarty version 4.5.5, created on 2025-12-06 20:25:47
  from '/var/www/CRM/ARIDEM/layouts/v7/modules/Vtiger/DocumentsSummaryWidgetContents.tpl' */

/* @var Smarty_Internal_Template $_smarty_tpl */
if ($_smarty_tpl->_decodeProperties($_smarty_tpl, array (
  'version' => '4.5.5',
  'unifunc' => 'content_6934914b8ae054_20311797',
  'has_nocache_code' => false,
  'file_dependency' => 
  array (
    'a5b169db1036a09b3dc7b05c3e99ceefce3df567' => 
    array (
      0 => '/var/www/CRM/ARIDEM/layouts/v7/modules/Vtiger/DocumentsSummaryWidgetContents.tpl',
      1 => 1752052260,
      2 => 'file',
    ),
  ),
  'includes' => 
  array (
  ),
),false)) {
function content_6934914b8ae054_20311797 (Smarty_Internal_Template $_smarty_tpl) {
?><div class="paddingLeft5px"><span class="col-sm-5"><strong><?php echo vtranslate('Title','Documents');?>
</strong></span><span class="col-sm-7"><strong><?php echo vtranslate('File Name','Documents');?>
</strong></span><?php
$_from = $_smarty_tpl->smarty->ext->_foreach->init($_smarty_tpl, $_smarty_tpl->tpl_vars['RELATED_RECORDS']->value, 'RELATED_RECORD');
$_smarty_tpl->tpl_vars['RELATED_RECORD']->do_else = true;
if ($_from !== null) foreach ($_from as $_smarty_tpl->tpl_vars['RELATED_RECORD']->value) {
$_smarty_tpl->tpl_vars['RELATED_RECORD']->do_else = false;
$_smarty_tpl->_assignInScope('DOWNLOAD_FILE_URL', $_smarty_tpl->tpl_vars['RELATED_RECORD']->value->getDownloadFileURL());
$_smarty_tpl->_assignInScope('DOWNLOAD_STATUS', $_smarty_tpl->tpl_vars['RELATED_RECORD']->value->get('filestatus'));
$_smarty_tpl->_assignInScope('DOWNLOAD_LOCATION_TYPE', $_smarty_tpl->tpl_vars['RELATED_RECORD']->value->get('filelocationtype'));?><div class="recentActivitiesContainer row"><ul class="" style="padding-left: 0px;list-style-type: none;"><li><div class="" id="documentRelatedRecord pull-left"><span class="col-sm-5 textOverflowEllipsis"><a href="<?php echo $_smarty_tpl->tpl_vars['RELATED_RECORD']->value->getDetailViewUrl();?>
" id="<?php echo $_smarty_tpl->tpl_vars['MODULE']->value;?>
_<?php echo $_smarty_tpl->tpl_vars['RELATED_MODULE']->value;?>
_Related_Record_<?php echo $_smarty_tpl->tpl_vars['RELATED_RECORD']->value->get('id');?>
" title="<?php echo $_smarty_tpl->tpl_vars['RELATED_RECORD']->value->getDisplayValue('notes_title');?>
"><?php echo $_smarty_tpl->tpl_vars['RELATED_RECORD']->value->getDisplayValue('notes_title');?>
</a></span><span class="col-sm-5 textOverflowEllipsis" id="DownloadableLink"><?php if ($_smarty_tpl->tpl_vars['DOWNLOAD_STATUS']->value == 1) {
echo $_smarty_tpl->tpl_vars['RELATED_RECORD']->value->getDisplayValue('filename',$_smarty_tpl->tpl_vars['RELATED_RECORD']->value->getId(),$_smarty_tpl->tpl_vars['RELATED_RECORD']->value);
} else {
echo $_smarty_tpl->tpl_vars['RELATED_RECORD']->value->get('filename');
}?></span><span class="col-sm-2"><?php $_smarty_tpl->_assignInScope('RECORD_ID', $_smarty_tpl->tpl_vars['RELATED_RECORD']->value->getId());
if (isPermitted('Documents','DetailView',$_smarty_tpl->tpl_vars['RECORD_ID']->value) == 'yes') {
$_smarty_tpl->_assignInScope('DOCUMENT_RECORD_MODEL', Vtiger_Record_Model::getInstanceById($_smarty_tpl->tpl_vars['RECORD_ID']->value));
if ($_smarty_tpl->tpl_vars['DOCUMENT_RECORD_MODEL']->value->get('filename') && $_smarty_tpl->tpl_vars['DOCUMENT_RECORD_MODEL']->value->get('filestatus')) {?><a name="viewfile" href="javascript:void(0)" data-filelocationtype="<?php echo $_smarty_tpl->tpl_vars['DOCUMENT_RECORD_MODEL']->value->get('filelocationtype');?>
" data-filename="<?php echo $_smarty_tpl->tpl_vars['DOCUMENT_RECORD_MODEL']->value->get('filename');?>
" onclick="Vtiger_Header_Js.previewFile(event,<?php echo $_smarty_tpl->tpl_vars['RECORD_ID']->value;?>
)"><i title="<?php echo vtranslate('LBL_VIEW_FILE','Documents');?>
" class="fa fa-picture-o alignMiddle"></i></a>&nbsp;<?php }
if ($_smarty_tpl->tpl_vars['DOCUMENT_RECORD_MODEL']->value->get('filename') && $_smarty_tpl->tpl_vars['DOCUMENT_RECORD_MODEL']->value->get('filestatus') && $_smarty_tpl->tpl_vars['DOCUMENT_RECORD_MODEL']->value->get('filelocationtype') == 'I') {?><a name="downloadfile" href="<?php echo $_smarty_tpl->tpl_vars['DOCUMENT_RECORD_MODEL']->value->getDownloadFileURL();?>
"><i title="<?php echo vtranslate('LBL_DOWNLOAD_FILE','Documents');?>
" class="fa fa-download alignMiddle"></i></a>&nbsp;<?php }
}?></span></div></li></ul></div><?php
}
$_smarty_tpl->smarty->ext->_foreach->restore($_smarty_tpl, 1);?></div><?php $_smarty_tpl->_assignInScope('NUMBER_OF_RECORDS', php7_count($_smarty_tpl->tpl_vars['RELATED_RECORDS']->value));
if ($_smarty_tpl->tpl_vars['NUMBER_OF_RECORDS']->value == 5) {?><div class="row"><div class="pull-right"><a class="moreRecentDocuments cursorPointer"><?php echo vtranslate('LBL_MORE',$_smarty_tpl->tpl_vars['MODULE_NAME']->value);?>
</a></div></div><?php }
}
}
