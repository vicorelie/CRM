<?php
/* Smarty version 4.5.5, created on 2025-08-14 15:46:34
  from '/home/vicorelie/crm.tcerenov-design.com/layouts/v7/modules/PDFMaker/Edit.tpl' */

/* @var Smarty_Internal_Template $_smarty_tpl */
if ($_smarty_tpl->_decodeProperties($_smarty_tpl, array (
  'version' => '4.5.5',
  'unifunc' => 'content_689e04da7fee27_23529234',
  'has_nocache_code' => false,
  'file_dependency' => 
  array (
    'c7823fb2b228d82791f634733d8bf2b930ba9c95' => 
    array (
      0 => '/home/vicorelie/crm.tcerenov-design.com/layouts/v7/modules/PDFMaker/Edit.tpl',
      1 => 1754577870,
      2 => 'file',
    ),
  ),
  'includes' => 
  array (
  ),
),false)) {
function content_689e04da7fee27_23529234 (Smarty_Internal_Template $_smarty_tpl) {
$_smarty_tpl->_checkPlugins(array(0=>array('file'=>'/home/vicorelie/crm.tcerenov-design.com/vendor/smarty/smarty/libs/plugins/function.html_options.php','function'=>'smarty_function_html_options',),));
?>
<div class="contents tabbable ui-sortable"><form class="form-horizontal recordEditView" id="EditView" name="EditView" method="post" action="index.php" enctype="multipart/form-data"><input type="hidden" name="module" value="PDFMaker"><input type="hidden" name="parenttab" value="<?php echo $_smarty_tpl->tpl_vars['PARENTTAB']->value;?>
"><input type="hidden" name="templateid" id="templateid" value="<?php echo $_smarty_tpl->tpl_vars['SAVETEMPLATEID']->value;?>
"><input type="hidden" name="action" value="SavePDFTemplate"><input type="hidden" name="redirect" value="true"><input type="hidden" name="return_module" value="<?php echo $_REQUEST['return_module'];?>
"><input type="hidden" name="return_view" value="<?php echo $_REQUEST['return_view'];?>
"><input type="hidden" name="selectedTab" id="selectedTab" value="properties"><input type="hidden" name="selectedTab2" id="selectedTab2" value="body"><ul class="nav nav-tabs layoutTabs massEditTabs"><li class="PDFMakerToggleLeftBlock"><div class="fa fa-chevron-left"></div></li><li class="detailviewTab active"><a data-toggle="tab" href="#pdfContentEdit" aria-expanded="true"><strong><?php echo vtranslate('LBL_BASIC_TAB',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</strong></a></li><li class="detailviewTab"><a data-toggle="tab" href="#pdfContentOther" aria-expanded="false"><strong><?php echo vtranslate('LBL_OTHER_INFO',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</strong></a></li><li class="detailviewTab"><a data-toggle="tab" href="#pdfContentLabels" aria-expanded="false"><strong><?php echo vtranslate('LBL_LABELS',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</strong></a></li><?php if ($_smarty_tpl->tpl_vars['IS_BLOCK']->value != true) {?><li class="detailviewTab"><a data-toggle="tab" href="#pdfContentProducts" aria-expanded="false"><strong><?php echo vtranslate('LBL_ARTICLE',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</strong></a></li><li class="detailviewTab"><a data-toggle="tab" href="#pdfContentHeaderFooter" aria-expanded="false"><strong><?php echo vtranslate('LBL_HEADER_TAB',$_smarty_tpl->tpl_vars['MODULE']->value);?>
 / <?php echo vtranslate('LBL_FOOTER_TAB',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</strong></a></li><li class="detailviewTab"><a data-toggle="tab" href="#editTabProperties" aria-expanded="false"><strong><?php echo vtranslate('LBL_PROPERTIES_TAB',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</strong></a></li><li class="detailviewTab"><a data-toggle="tab" href="#editTabSettings" aria-expanded="false"><strong><?php echo vtranslate('LBL_SETTINGS_TAB',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</strong></a></li><?php if ($_smarty_tpl->tpl_vars['IS_ACTIVE_SIGNATURE']->value) {?><li class="detailviewTab"><a data-toggle="tab" href="#editTabSignature" aria-expanded="false"><strong><?php echo vtranslate('LBL_SIGNATURE_TAB',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</strong></a></li><?php }?><li class="detailviewTab"><a data-toggle="tab" href="#editTabSharing" aria-expanded="false"><strong><?php echo vtranslate('LBL_SHARING_TAB',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</strong></a></li><?php }?></ul><div ><div><div class="row PDFMakerContentBlock" ><div class="left-block PDFMakerLeftBlock col-xs-4"><div><div class="tab-content layoutContent themeTableColor overflowVisible"><?php $_smarty_tpl->_subTemplateRender(call_user_func_array($_smarty_tpl->registered_plugins[ 'modifier' ][ 'vtemplate_path' ][ 0 ], array( 'tabs/Basic.tpl',$_smarty_tpl->tpl_vars['MODULE']->value )), $_smarty_tpl->cache_id, $_smarty_tpl->compile_id, 0, $_smarty_tpl->cache_lifetime, array(), 0, true);
$_smarty_tpl->_subTemplateRender(call_user_func_array($_smarty_tpl->registered_plugins[ 'modifier' ][ 'vtemplate_path' ][ 0 ], array( 'tabs/Other.tpl',$_smarty_tpl->tpl_vars['MODULE']->value )), $_smarty_tpl->cache_id, $_smarty_tpl->compile_id, 0, $_smarty_tpl->cache_lifetime, array(), 0, true);
$_smarty_tpl->_subTemplateRender(call_user_func_array($_smarty_tpl->registered_plugins[ 'modifier' ][ 'vtemplate_path' ][ 0 ], array( 'tabs/Labels.tpl',$_smarty_tpl->tpl_vars['MODULE']->value )), $_smarty_tpl->cache_id, $_smarty_tpl->compile_id, 0, $_smarty_tpl->cache_lifetime, array(), 0, true);
if ($_smarty_tpl->tpl_vars['IS_BLOCK']->value != true) {
$_smarty_tpl->_subTemplateRender(call_user_func_array($_smarty_tpl->registered_plugins[ 'modifier' ][ 'vtemplate_path' ][ 0 ], array( 'tabs/Products.tpl',$_smarty_tpl->tpl_vars['MODULE']->value )), $_smarty_tpl->cache_id, $_smarty_tpl->compile_id, 0, $_smarty_tpl->cache_lifetime, array(), 0, true);
$_smarty_tpl->_subTemplateRender(call_user_func_array($_smarty_tpl->registered_plugins[ 'modifier' ][ 'vtemplate_path' ][ 0 ], array( 'tabs/HeaderFooter.tpl',$_smarty_tpl->tpl_vars['MODULE']->value )), $_smarty_tpl->cache_id, $_smarty_tpl->compile_id, 0, $_smarty_tpl->cache_lifetime, array(), 0, true);
$_smarty_tpl->_subTemplateRender(call_user_func_array($_smarty_tpl->registered_plugins[ 'modifier' ][ 'vtemplate_path' ][ 0 ], array( 'tabs/Properties.tpl',$_smarty_tpl->tpl_vars['MODULE']->value )), $_smarty_tpl->cache_id, $_smarty_tpl->compile_id, 0, $_smarty_tpl->cache_lifetime, array(), 0, true);
$_smarty_tpl->_subTemplateRender(call_user_func_array($_smarty_tpl->registered_plugins[ 'modifier' ][ 'vtemplate_path' ][ 0 ], array( 'tabs/Settings.tpl',$_smarty_tpl->tpl_vars['MODULE']->value )), $_smarty_tpl->cache_id, $_smarty_tpl->compile_id, 0, $_smarty_tpl->cache_lifetime, array(), 0, true);
if ($_smarty_tpl->tpl_vars['IS_ACTIVE_SIGNATURE']->value) {
$_smarty_tpl->_subTemplateRender(call_user_func_array($_smarty_tpl->registered_plugins[ 'modifier' ][ 'vtemplate_path' ][ 0 ], array( 'tabs/Signature.tpl',$_smarty_tpl->tpl_vars['MODULE']->value )), $_smarty_tpl->cache_id, $_smarty_tpl->compile_id, 0, $_smarty_tpl->cache_lifetime, array(), 0, true);
}
$_smarty_tpl->_subTemplateRender(call_user_func_array($_smarty_tpl->registered_plugins[ 'modifier' ][ 'vtemplate_path' ][ 0 ], array( 'tabs/Sharing.tpl',$_smarty_tpl->tpl_vars['MODULE']->value )), $_smarty_tpl->cache_id, $_smarty_tpl->compile_id, 0, $_smarty_tpl->cache_lifetime, array(), 0, true);
}?></div></div></div><div class="middle-block PDFMakerMiddleBlock col-xs-8"><div class="PDFMakerMiddleBlock_content"><?php if ($_smarty_tpl->tpl_vars['IS_BLOCK']->value != true) {?><div id="ContentEditorTabs"><ul class="nav nav-pills"><li id="bodyDivTab" class="ContentEditorTab active" data-type="body" style="margin-right: 5px"><a href="#body_div2" aria-expanded="false" data-toggle="tab"><?php echo vtranslate('LBL_BODY',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</a></li><li id="headerDivTab" class="ContentEditorTab" data-type="header" style="margin: 0px 5px 0px 5px"><a href="#header_div2" aria-expanded="false" data-toggle="tab"><?php echo vtranslate('LBL_HEADER_TAB',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</a></li><li id="footerDivTab" class="ContentEditorTab" data-type="footer" style="margin: 0px 5px 0px 5px"><a href="#footer_div2" aria-expanded="false" data-toggle="tab"><?php echo vtranslate('LBL_FOOTER_TAB',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</a></li><?php if ($_smarty_tpl->tpl_vars['STYLES_CONTENT']->value != '') {?><li data-type="templateCSSStyleTabLayout" class="ContentEditorTab" style="margin: 0px 5px 0px 5px"><a href="#cssstyle_div2" aria-expanded="false" data-toggle="tab"><?php echo vtranslate('LBL_CSS_STYLE_TAB',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</a></li><?php }?></ul></div><?php }?><div class="tab-content"><div class="tab-pane ContentTabPanel active" id="body_div2"><textarea name="body" id="body" style="width:90%;height:700px" class=small tabindex="5"><?php echo $_smarty_tpl->tpl_vars['BODY']->value;?>
</textarea></div><?php if ($_smarty_tpl->tpl_vars['IS_BLOCK']->value != true) {?><div class="tab-pane ContentTabPanel" id="header_div2"><textarea name="header_body" id="header_body" style="width:90%;height:200px" class="small"><?php echo $_smarty_tpl->tpl_vars['HEADER']->value;?>
</textarea></div><div class="tab-pane ContentTabPanel" id="footer_div2"><textarea name="footer_body" id="footer_body" style="width:90%;height:200px" class="small"><?php echo $_smarty_tpl->tpl_vars['FOOTER']->value;?>
</textarea></div><?php if ($_smarty_tpl->tpl_vars['STYLES_CONTENT']->value != '') {?><div class="tab-pane ContentTabPanel" id="cssstyle_div2"><?php
$_from = $_smarty_tpl->smarty->ext->_foreach->init($_smarty_tpl, $_smarty_tpl->tpl_vars['STYLES_CONTENT']->value, 'STYLE_DATA');
$_smarty_tpl->tpl_vars['STYLE_DATA']->do_else = true;
if ($_from !== null) foreach ($_from as $_smarty_tpl->tpl_vars['STYLE_DATA']->value) {
$_smarty_tpl->tpl_vars['STYLE_DATA']->do_else = false;
if ($_smarty_tpl->tpl_vars['IS_DUPLICATE']->value) {?><input type="hidden" name="its4you_styles[]" value="<?php echo $_smarty_tpl->tpl_vars['STYLE_DATA']->value['id'];?>
"><?php }?><div class="hide"><textarea class="CodeMirrorContent" id="CodeMirrorContent<?php echo $_smarty_tpl->tpl_vars['STYLE_DATA']->value['id'];?>
" style="border: 1px solid black; " class="CodeMirrorTextarea " tabindex="5"><?php echo $_smarty_tpl->tpl_vars['STYLE_DATA']->value['stylecontent'];?>
</textarea></div><table class="table table-bordered"><thead><tr class="listViewHeaders"><th><div class="pull-left"><a href="index.php?module=ITS4YouStyles&view=Detail&record=<?php echo $_smarty_tpl->tpl_vars['STYLE_DATA']->value['id'];?>
" target="_blank"><?php echo $_smarty_tpl->tpl_vars['STYLE_DATA']->value['name'];?>
</a></div><div class="pull-right actions"><a href="index.php?module=ITS4YouStyles&view=Detail&record=<?php echo $_smarty_tpl->tpl_vars['STYLE_DATA']->value['id'];?>
" target="_blank"><i title="<?php echo vtranslate('LBL_SHOW_COMPLETE_DETAILS',$_smarty_tpl->tpl_vars['MODULE']->value);?>
" class="icon-th-list alignMiddle"></i></a>&nbsp;<?php if ($_smarty_tpl->tpl_vars['STYLE_DATA']->value['iseditable'] == "yes") {?><a href="index.php?module=ITS4YouStyles&view=Edit&record=<?php echo $_smarty_tpl->tpl_vars['STYLE_DATA']->value['id'];?>
" target="_blank" class="cursorPointer"><i class="icon-pencil alignMiddle" title="<?php echo vtranslate('LBL_EDIT',$_smarty_tpl->tpl_vars['MODULE']->value);?>
"></i></a><?php }?></div></th></tr></thead><tbody><tr><td id="CodeMirrorContent<?php echo $_smarty_tpl->tpl_vars['STYLE_DATA']->value['id'];?>
Output" class="cm-s-default"></td></tr></tbody></table><br><?php
}
$_smarty_tpl->smarty->ext->_foreach->restore($_smarty_tpl, 1);?></div><?php }
}?></div><div class="hide"><textarea id="fontawesomeclass"><?php echo $_smarty_tpl->tpl_vars['FONTAWESOMECLASS']->value;?>
</textarea><textarea id="ckeditorFontsFaces"><?php echo $_smarty_tpl->tpl_vars['FONTS_FACES']->value;?>
</textarea><input type="hidden" id="ckeditorFonts" value="<?php echo $_smarty_tpl->tpl_vars['FONTS']->value;?>
"><input type="hidden" id="isBlock" value="<?php echo $_smarty_tpl->tpl_vars['IS_BLOCK']->value;?>
"></div></div></div></div></div></div><div class="modal-overlay-footer row-fluid"><div class="textAlignCenter "><button class="btn" type="submit" onclick="document.EditView.redirect.value = 'false';" ><strong><?php echo vtranslate('LBL_APPLY',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</strong></button>&nbsp;&nbsp;<button class="btn btn-success" type="submit" ><strong><?php echo vtranslate('LBL_SAVE',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</strong></button><?php if ($_REQUEST['return_view'] != '') {?><a class="cancelLink" type="reset" onclick="window.location.href = 'index.php?module=<?php if ($_REQUEST['return_module'] != '') {
echo $_REQUEST['return_module'];
} else { ?>PDFMaker<?php }?>&view=<?php echo $_REQUEST['return_view'];
if ($_REQUEST['templateid'] != '' && $_REQUEST['return_view'] != "List") {?>&templateid=<?php echo $_REQUEST['templateid'];
}?>';"><?php echo vtranslate('LBL_CANCEL',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</a><?php } else { ?><a class="cancelLink" type="reset" onclick="javascript:window.history.back();"><?php echo vtranslate('LBL_CANCEL',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</a><?php }?></div></div></form><div class="hide" style="display: none"><div id="div_vat_block_table"><?php echo $_smarty_tpl->tpl_vars['VATBLOCK_TABLE']->value;?>
</div><div id="div_charges_block_table"><?php echo $_smarty_tpl->tpl_vars['CHARGESBLOCK_TABLE']->value;?>
</div><div id="div_company_header_signature"><?php echo $_smarty_tpl->tpl_vars['COMPANY_HEADER_SIGNATURE']->value;?>
</div><div id="div_company_stamp_signature"><?php echo $_smarty_tpl->tpl_vars['COMPANY_STAMP_SIGNATURE']->value;?>
</div><div class="popupUi modal-dialog modal-md" data-backdrop="false"><div class="modal-content"><?php ob_start();
echo vtranslate('LBL_SET_VALUE',$_smarty_tpl->tpl_vars['QUALIFIED_MODULE']->value);
$_prefixVariable1 = ob_get_clean();
$_smarty_tpl->_assignInScope('HEADER_TITLE', $_prefixVariable1);
$_smarty_tpl->_subTemplateRender(call_user_func_array($_smarty_tpl->registered_plugins[ 'modifier' ][ 'vtemplate_path' ][ 0 ], array( "ModalHeader.tpl",$_smarty_tpl->tpl_vars['MODULE']->value )), $_smarty_tpl->cache_id, $_smarty_tpl->compile_id, 0, $_smarty_tpl->cache_lifetime, array('TITLE'=>$_smarty_tpl->tpl_vars['HEADER_TITLE']->value), 0, true);
?><div class="modal-body"><div class="row"><div class="col-sm-12" ><div class="form-group"><label class="control-label fieldLabel col-sm-3" style="font-weight: normal"><?php echo vtranslate('LBL_MODULENAMES',$_smarty_tpl->tpl_vars['MODULE']->value);?>
:</label><div class="controls col-sm-9"><div class="input-group"><select name="filename_fields2" id="filename_fields2" class="form-control"><?php if ($_smarty_tpl->tpl_vars['TEMPLATEID']->value == '' && $_smarty_tpl->tpl_vars['SELECTMODULE']->value == '') {?><option value=""><?php echo vtranslate('LBL_SELECT_MODULE_FIELD',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</option><?php } else {
echo smarty_function_html_options(array('options'=>$_smarty_tpl->tpl_vars['SELECT_MODULE_FIELD']->value),$_smarty_tpl);
}?></select><div class="input-group-btn"><button type="button" class="btn btn-success InsertIntoTextarea" data-type="filename_fields2" title="<?php echo vtranslate('LBL_INSERT_TO_TEXT',$_smarty_tpl->tpl_vars['MODULE']->value);?>
"><i class="fa fa-usd"></i></button></div></div></div></div></div></div><br><div class="row"><div class="col-sm-12" ><div class="form-group"><label class="control-label fieldLabel col-sm-3" style="font-weight: normal"><?php echo vtranslate('LBL_RELATED_MODULES',$_smarty_tpl->tpl_vars['MODULE']->value);?>
:</label><div class="controls col-sm-9"><select name="relatedmodulesorce2" id="relatedmodulesorce2" class="form-control"></select></div></div></div></div><br><div class="row mainContent"><div class="col-sm-12"><div class="form-group"><label class="control-label fieldLabel col-sm-3" style="font-weight: normal"></label><div class="controls col-sm-9"><div class="input-group"><select name="relatedmodulefields2" id="relatedmodulefields2" class="form-control"><option value=""><?php echo vtranslate('LBL_SELECT_MODULE_FIELD',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</option></select><div class="input-group-btn"><button type="button" class="btn btn-success InsertIntoTextarea" data-type="relatedmodulefields2" title="<?php echo vtranslate('LBL_INSERT_TO_TEXT',$_smarty_tpl->tpl_vars['MODULE']->value);?>
"><i class="fa fa-usd"></i></button></div></div></div></div></div></div><br><div class="row fieldValueContainer"><div class="col-sm-12"><textarea data-textarea="true" class="fieldValue inputElement hide" style="height: inherit;"></textarea></div></div><br></div><?php $_smarty_tpl->_subTemplateRender(call_user_func_array($_smarty_tpl->registered_plugins[ 'modifier' ][ 'vtemplate_path' ][ 0 ], array( "ModalFooter.tpl",$_smarty_tpl->tpl_vars['MODULE']->value )), $_smarty_tpl->cache_id, $_smarty_tpl->compile_id, 0, $_smarty_tpl->cache_lifetime, array(), 0, true);
?></div></div></div><div class="clonedPopUp"></div></div><?php echo '<script'; ?>
 type="text/javascript">var selectedTab = 'properties';var selectedTab2 = 'body';var module_blocks = new Array();var selected_module = '<?php echo $_smarty_tpl->tpl_vars['SELECTMODULE']->value;?>
';var constructedOptionValue;var constructedOptionName;jQuery(document).ready(function() {jQuery.fn.scrollBottom = function() {return jQuery(document).height() - this.scrollTop() - this.height();};});<?php echo '</script'; ?>
><?php }
}
