<?php
/* Smarty version 4.5.5, created on 2026-01-19 18:56:59
  from '/var/www/CNK-DEM/layouts/v7/modules/EMAILMaker/ListEMAILTemplatesContents.tpl' */

/* @var Smarty_Internal_Template $_smarty_tpl */
if ($_smarty_tpl->_decodeProperties($_smarty_tpl, array (
  'version' => '4.5.5',
  'unifunc' => 'content_696e625bc43717_94632405',
  'has_nocache_code' => false,
  'file_dependency' => 
  array (
    '02de2f9d64d2a7213ac3b3baa892f84a5b36f292' => 
    array (
      0 => '/var/www/CNK-DEM/layouts/v7/modules/EMAILMaker/ListEMAILTemplatesContents.tpl',
      1 => 1766693566,
      2 => 'file',
    ),
  ),
  'includes' => 
  array (
  ),
),false)) {
function content_696e625bc43717_94632405 (Smarty_Internal_Template $_smarty_tpl) {
$_smarty_tpl->_checkPlugins(array(0=>array('file'=>'/var/www/CNK-DEM/vendor/smarty/smarty/libs/plugins/function.html_options.php','function'=>'smarty_function_html_options',),));
if ($_smarty_tpl->tpl_vars['DIR']->value == 'ASC') {
$_smarty_tpl->_assignInScope('dir_img', '<i class="fa fa-sort fa-sort-asc"></i>');
} else {
$_smarty_tpl->_assignInScope('dir_img', '<i class="fa fa-sort fa-sort-desc"></i>');
}
$_smarty_tpl->_assignInScope('customsort_img', '<i class="fa fa-sort customsort"></i>');
$_smarty_tpl->_assignInScope('name_dir', 'ASC');
$_smarty_tpl->_assignInScope('module_dir', 'ASC');
$_smarty_tpl->_assignInScope('description_dir', 'ASC');
$_smarty_tpl->_assignInScope('order_dir', 'ASC');
$_smarty_tpl->_assignInScope('sharingtype_dir', 'ASC');
$_smarty_tpl->_assignInScope('category_dir', 'ASC');
if ($_smarty_tpl->tpl_vars['ORDERBY']->value == 'templatename' && $_smarty_tpl->tpl_vars['DIR']->value == 'ASC') {
$_smarty_tpl->_assignInScope('name_dir', 'DESC');
} elseif ($_smarty_tpl->tpl_vars['ORDERBY']->value == 'module' && $_smarty_tpl->tpl_vars['DIR']->value == 'ASC') {
$_smarty_tpl->_assignInScope('module_dir', 'DESC');
} elseif ($_smarty_tpl->tpl_vars['ORDERBY']->value == 'description' && $_smarty_tpl->tpl_vars['DIR']->value == 'ASC') {
$_smarty_tpl->_assignInScope('description_dir', 'DESC');
} elseif ($_smarty_tpl->tpl_vars['ORDERBY']->value == 'order' && $_smarty_tpl->tpl_vars['DIR']->value == 'ASC') {
$_smarty_tpl->_assignInScope('order_dir', 'DESC');
} elseif ($_smarty_tpl->tpl_vars['ORDERBY']->value == 'sharingtype' && $_smarty_tpl->tpl_vars['DIR']->value == 'ASC') {
$_smarty_tpl->_assignInScope('sharingtype_dir', 'DESC');
} elseif ($_smarty_tpl->tpl_vars['ORDERBY']->value == 'category' && $_smarty_tpl->tpl_vars['DIR']->value == 'ASC') {
$_smarty_tpl->_assignInScope('category_dir', 'DESC');
}?><div class="col-sm-12 col-xs-12 "><input type="hidden" name="idlist"><input type="hidden" name="module" value="<?php echo $_smarty_tpl->tpl_vars['MODULE']->value;?>
"><input type="hidden" name="parenttab" value="Tools"><input type="hidden" name="view" value="List"><input type="hidden" name="cvid" value="1"/><input type="hidden" name="action" value=""><input type="hidden" name="orderBy" id="orderBy" value="<?php echo $_smarty_tpl->tpl_vars['ORDERBY']->value;?>
"><input type="hidden" name="sortOrder" id="sortOrder" value="<?php echo $_smarty_tpl->tpl_vars['DIR']->value;?>
"><input type="hidden" name="currentSearchParams" value="<?php echo Vtiger_Util_Helper::toSafeHTML(Zend_JSON::encode($_smarty_tpl->tpl_vars['SEARCH_DETAILS']->value));?>
" id="currentSearchParams"/><?php $_smarty_tpl->_subTemplateRender(call_user_func_array($_smarty_tpl->registered_plugins[ 'modifier' ][ 'vtemplate_path' ][ 0 ], array( 'ListEMAILActions.tpl',$_smarty_tpl->tpl_vars['MODULE']->value )), $_smarty_tpl->cache_id, $_smarty_tpl->compile_id, 0, $_smarty_tpl->cache_lifetime, array(), 0, true);
?><div id="table-content" class="table-container" style="overflow: auto;"><form name='list' id='listedit' action='' onsubmit="return false;"><table id="listview-table" class="table <?php if ($_smarty_tpl->tpl_vars['LISTVIEW_ENTRIES_COUNT']->value == '0') {?>listview-table-norecords <?php }?> listview-table"><thead><tr class="listViewContentHeader"><th><div class="table-actions"><div class="dropdown" style="float:left;"><span class="input dropdown-toggle" data-toggle="dropdown" title="<?php echo vtranslate('LBL_CLICK_HERE_TO_SELECT_ALL_RECORDS',$_smarty_tpl->tpl_vars['MODULE']->value);?>
"><input class="listViewEntriesMainCheckBox" type="checkbox"></span></div></div></th><th nowrap="nowrap"><a href="#" data-columnname="name" data-nextsortorderval="<?php echo $_smarty_tpl->tpl_vars['name_dir']->value;?>
" class="listViewContentHeaderValues"><?php if ($_smarty_tpl->tpl_vars['ORDERBY']->value == 'templatename') {
echo $_smarty_tpl->tpl_vars['dir_img']->value;
} else {
echo $_smarty_tpl->tpl_vars['customsort_img']->value;
}?>&nbsp;<?php echo vtranslate('LBL_EMAIL_NAME',$_smarty_tpl->tpl_vars['MODULE']->value);?>
&nbsp;</a></th><th nowrap="nowrap"><a href="#" data-columnname="module" data-nextsortorderval="<?php echo $_smarty_tpl->tpl_vars['module_dir']->value;?>
" class="listViewContentHeaderValues"><?php if ($_smarty_tpl->tpl_vars['ORDERBY']->value == 'module') {
echo $_smarty_tpl->tpl_vars['dir_img']->value;
} else {
echo $_smarty_tpl->tpl_vars['customsort_img']->value;
}?>&nbsp;<?php echo vtranslate('LBL_MODULENAMES',$_smarty_tpl->tpl_vars['MODULE']->value);?>
&nbsp;</a></th><th nowrap="nowrap"><a href="#" data-columnname="category" data-nextsortorderval="<?php echo $_smarty_tpl->tpl_vars['category_dir']->value;?>
" class="listViewContentHeaderValues"><?php if ($_smarty_tpl->tpl_vars['ORDERBY']->value == 'category') {
echo $_smarty_tpl->tpl_vars['dir_img']->value;
} else {
echo $_smarty_tpl->tpl_vars['customsort_img']->value;
}?>&nbsp;<?php echo vtranslate('LBL_CATEGORY',$_smarty_tpl->tpl_vars['MODULE']->value);?>
&nbsp;</a></th><th nowrap="nowrap"><a href="#" data-columnname="description" data-nextsortorderval="<?php echo $_smarty_tpl->tpl_vars['description_dir']->value;?>
" class="listViewContentHeaderValues"><?php if ($_smarty_tpl->tpl_vars['ORDERBY']->value == 'description') {
echo $_smarty_tpl->tpl_vars['dir_img']->value;
} else {
echo $_smarty_tpl->tpl_vars['customsort_img']->value;
}?>&nbsp;<?php echo vtranslate('LBL_DESCRIPTION',$_smarty_tpl->tpl_vars['MODULE']->value);?>
&nbsp;</a></th><th nowrap="nowrap"><a href="#" data-columnname="sharingtype" data-nextsortorderval="<?php echo $_smarty_tpl->tpl_vars['sharingtype_dir']->value;?>
" class="listViewContentHeaderValues"><?php if ($_smarty_tpl->tpl_vars['ORDERBY']->value == 'sharingtype') {
echo $_smarty_tpl->tpl_vars['dir_img']->value;
} else {
echo $_smarty_tpl->tpl_vars['customsort_img']->value;
}?>&nbsp;<?php echo vtranslate('LBL_SHARING_TAB',$_smarty_tpl->tpl_vars['MODULE']->value);?>
&nbsp;</a></th><th nowrap="nowrap"><?php echo vtranslate("LBL_TEMPLATE_OWNER",$_smarty_tpl->tpl_vars['MODULE']->value);?>
</th><th><?php echo vtranslate("Status");?>
</th></tr><tr class="searchRow"><th class="inline-search-btn"><div class="table-actions"><button class="btn btn-sm btn-success <?php if (count($_smarty_tpl->tpl_vars['SEARCH_DETAILS']->value) > 0) {?>hide<?php }?>" data-trigger="listSearch"><i class="fa fa-search"></i>&nbsp;<span class="s2-btn-text"><?php echo vtranslate("LBL_SEARCH",$_smarty_tpl->tpl_vars['MODULE']->value);?>
</span></button><button class="searchAndClearButton btn btn-sm btn-danger <?php if (count($_smarty_tpl->tpl_vars['SEARCH_DETAILS']->value) == 0) {?>hide<?php }?>" data-trigger="clearListSearch"><i class="fa fa-close"></i>&nbsp;<?php echo vtranslate("LBL_CLEAR",$_smarty_tpl->tpl_vars['MODULE']->value);?>
</button></div></th><th><input type="text" class="listSearchContributor inputElement" data-field-type="string" name="templatename" data-fieldinfo='{"column":"templatename","type":"string","name":"templatename","label":"<?php echo vtranslate("LBL_EMAIL_NAME",$_smarty_tpl->tpl_vars['MODULE']->value);?>
"}' value="<?php echo $_smarty_tpl->tpl_vars['SEARCH_TEMPLATENAMEVAL']->value;?>
"></th><th><div class="select2_search_div"><input type="text" class="listSearchContributor inputElement select2_input_element"/><select class="select2 listSearchContributor" name="formodule" data-fieldinfo='{"column":"formodule","type":"picklist","name":"formodule","label":"<?php echo vtranslate("LBL_MODULENAMES",$_smarty_tpl->tpl_vars['MODULE']->value);?>
"}' style="display: none"><option value=""></option><?php echo smarty_function_html_options(array('options'=>$_smarty_tpl->tpl_vars['SEARCHSELECTBOXDATA']->value['modules'],'selected'=>$_smarty_tpl->tpl_vars['SEARCH_FORMODULEVAL']->value),$_smarty_tpl);?>
</select></div></th><th><div><input type="text" class="listSearchContributor inputElement" name="category" data-fieldinfo='' value="<?php echo $_smarty_tpl->tpl_vars['SEARCH_CATEGORYVAL']->value;?>
"></div></th><th><div><input type="text" class="listSearchContributor inputElement" name="description" data-fieldinfo='' value="<?php echo $_smarty_tpl->tpl_vars['SEARCH_DESCRIPTIONVAL']->value;?>
"></div></th><th><div class="select2_search_div"><input type="text" class="listSearchContributor inputElement select2_input_element"/><select class="select2 listSearchContributor" name="sharingtype" data-fieldinfo='{"column":"sharingtype","type":"picklist","name":"sharingtype","label":"<?php echo vtranslate("LBL_SHARING_TAB",$_smarty_tpl->tpl_vars['MODULE']->value);?>
"}' style="display: none"><?php echo smarty_function_html_options(array('options'=>$_smarty_tpl->tpl_vars['SHARINGTYPES']->value,'selected'=>$_smarty_tpl->tpl_vars['SEARCH_SHARINGTYPEVAL']->value),$_smarty_tpl);?>
</select></div></th><th><div class="select2_search_div"><input type="text" class="listSearchContributor inputElement select2_input_element"/><select class="select2 listSearchContributor" name="owner" data-fieldinfo='{"column":"owner","type":"owner","name":"owner","label":"<?php echo vtranslate("LBL_TEMPLATE_OWNER",$_smarty_tpl->tpl_vars['MODULE']->value);?>
"}' style="display: none"><option value=""></option><?php echo smarty_function_html_options(array('options'=>$_smarty_tpl->tpl_vars['SEARCHSELECTBOXDATA']->value['owners'],'selected'=>$_smarty_tpl->tpl_vars['SEARCH_OWNERVAL']->value),$_smarty_tpl);?>
</select></div></th><th><div class="select2_search_div"><input type="text" class="listSearchContributor inputElement select2_input_element"/><select class="select2 listSearchContributor" name="status" data-fieldinfo='{"column":"status","type":"picklist","name":"status","label":"<?php echo vtranslate("Status",$_smarty_tpl->tpl_vars['MODULE']->value);?>
"}' style="display: none"><option value=""></option><?php echo smarty_function_html_options(array('options'=>$_smarty_tpl->tpl_vars['STATUSOPTIONS']->value,'selected'=>$_smarty_tpl->tpl_vars['SEARCH_STATUSVAL']->value),$_smarty_tpl);?>
</select></div></th></tr></thead><tbody><?php
$_from = $_smarty_tpl->smarty->ext->_foreach->init($_smarty_tpl, $_smarty_tpl->tpl_vars['EMAILTEMPLATES']->value, 'template', false, NULL, 'mailmerge', array (
));
$_smarty_tpl->tpl_vars['template']->do_else = true;
if ($_from !== null) foreach ($_from as $_smarty_tpl->tpl_vars['template']->value) {
$_smarty_tpl->tpl_vars['template']->do_else = false;
?><tr class="listViewEntries" <?php if ($_smarty_tpl->tpl_vars['template']->value['status'] == 0) {?> style="font-style:italic;" <?php }?> data-id="<?php echo $_smarty_tpl->tpl_vars['template']->value['templateid'];?>
" data-recordurl="index.php?module=<?php echo $_smarty_tpl->tpl_vars['MODULE']->value;?>
&view=Detail&templateid=<?php echo $_smarty_tpl->tpl_vars['template']->value['templateid'];?>
" id="<?php echo $_smarty_tpl->tpl_vars['MODULE']->value;?>
_listView_row_<?php echo $_smarty_tpl->tpl_vars['template']->value['templateid'];?>
"><td class="listViewRecordActions"><div class="table-actions"><span class="input"><input type="checkbox" class="listViewEntriesCheckBox" value="<?php echo $_smarty_tpl->tpl_vars['template']->value['templateid'];?>
"></span><span class="more dropdown action"><span href="javascript:;" class="dropdown-toggle" data-toggle="dropdown"><i class="fa fa-ellipsis-v icon"></i></span><ul class="dropdown-menu"><li><a data-id="<?php echo $_smarty_tpl->tpl_vars['template']->value['templateid'];?>
" href="index.php?module=<?php echo $_smarty_tpl->tpl_vars['MODULE']->value;?>
&view=Detail&record=<?php echo $_smarty_tpl->tpl_vars['template']->value['templateid'];?>
&app=<?php echo $_smarty_tpl->tpl_vars['SELECTED_MENU_CATEGORY']->value;?>
"><?php echo vtranslate('LBL_DETAILS',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</a></li><?php if ($_smarty_tpl->tpl_vars['VERSION_TYPE']->value != 'deactivate') {
echo $_smarty_tpl->tpl_vars['template']->value['edit'];
}?></ul></span></div></td><td class="listViewEntryValue"><?php echo $_smarty_tpl->tpl_vars['template']->value['templatename'];?>
</td><td class="listViewEntryValue" <?php if ($_smarty_tpl->tpl_vars['template']->value['status'] == 0) {?> style="color:#888;" <?php }?>><?php echo $_smarty_tpl->tpl_vars['template']->value['module'];?>
</a></td><td class="listViewEntryValue" <?php if ($_smarty_tpl->tpl_vars['template']->value['status'] == 0) {?> style="color:#888;" <?php }?>><?php echo $_smarty_tpl->tpl_vars['template']->value['category'];?>
&nbsp;</td><td class="listViewEntryValue" <?php if ($_smarty_tpl->tpl_vars['template']->value['status'] == 0) {?> style="color:#888;" <?php }?>><?php echo $_smarty_tpl->tpl_vars['template']->value['description'];?>
&nbsp;</td><td class="listViewEntryValue" <?php if ($_smarty_tpl->tpl_vars['template']->value['status'] == 0) {?> style="color:#888;" <?php }?>><?php echo $_smarty_tpl->tpl_vars['template']->value['sharingtype'];?>
&nbsp;</td><td class="listViewEntryValue" <?php if ($_smarty_tpl->tpl_vars['template']->value['status'] == 0) {?> style="color:#888;" <?php }?> nowrap><?php echo $_smarty_tpl->tpl_vars['template']->value['owner'];?>
&nbsp;</td><td class="listViewEntryValue" <?php if ($_smarty_tpl->tpl_vars['template']->value['status'] == 0) {?> style="color:#888;" <?php }?>><?php echo $_smarty_tpl->tpl_vars['template']->value['status_lbl'];?>
&nbsp;</td></tr><?php
}
if ($_smarty_tpl->tpl_vars['template']->do_else) {
?><tr><td style="background-color:#efefef;" align="center" colspan="9"><table class="emptyRecordsDiv"><tbody><tr><td><?php echo vtranslate("LBL_NO");?>
 <?php echo vtranslate("LBL_TEMPLATE",$_smarty_tpl->tpl_vars['MODULE']->value);?>
 <?php echo vtranslate("LBL_FOUND",$_smarty_tpl->tpl_vars['MODULE']->value);?>
<br><br><a href="index.php?module=<?php echo $_smarty_tpl->tpl_vars['MODULE']->value;?>
&view=Edit"><?php echo vtranslate("LBL_CREATE_NEW");?>
 <?php echo vtranslate("LBL_TEMPLATE",$_smarty_tpl->tpl_vars['MODULE']->value);?>
</a></td></tr></tbody></table></td></tr><?php
}
$_smarty_tpl->smarty->ext->_foreach->restore($_smarty_tpl, 1);?></tbody></table></form></div></div><?php }
}
