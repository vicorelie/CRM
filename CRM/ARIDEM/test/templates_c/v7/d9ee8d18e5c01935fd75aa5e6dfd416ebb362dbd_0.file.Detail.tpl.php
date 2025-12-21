<?php
/* Smarty version 4.5.5, created on 2025-12-07 21:01:02
  from '/var/www/CRM/ARIDEM/layouts/v7/modules/PDFMaker/Detail.tpl' */

/* @var Smarty_Internal_Template $_smarty_tpl */
if ($_smarty_tpl->_decodeProperties($_smarty_tpl, array (
  'version' => '4.5.5',
  'unifunc' => 'content_6935eb0e3a5358_54300823',
  'has_nocache_code' => false,
  'file_dependency' => 
  array (
    'd9ee8d18e5c01935fd75aa5e6dfd416ebb362dbd' => 
    array (
      0 => '/var/www/CRM/ARIDEM/layouts/v7/modules/PDFMaker/Detail.tpl',
      1 => 1765057370,
      2 => 'file',
    ),
  ),
  'includes' => 
  array (
  ),
),false)) {
function content_6935eb0e3a5358_54300823 (Smarty_Internal_Template $_smarty_tpl) {
?><div class="detailview-content container-fluid"><div class="details row"><form id="detailView" method="post" action="index.php" name="etemplatedetailview" onsubmit="VtigerJS_DialogBox.block();"><input type="hidden" name="action" value=""><input type="hidden" name="view" value=""><input type="hidden" name="module" value="PDFMaker"><input type="hidden" name="retur_module" value="PDFMaker"><input type="hidden" name="return_action" value="PDFMaker"><input type="hidden" name="return_view" value="Detail"><input type="hidden" name="templateid" value="<?php echo $_smarty_tpl->tpl_vars['TEMPLATEID']->value;?>
"><input type="hidden" name="parenttab" value="<?php echo $_smarty_tpl->tpl_vars['PARENTTAB']->value;?>
"><input type="hidden" name="isDuplicate" value="false"><input type="hidden" name="subjectChanged" value=""><input id="recordId" value="<?php echo $_smarty_tpl->tpl_vars['TEMPLATEID']->value;?>
" type="hidden"><div class="col-lg-12"><div class="left-block col-lg-4"><div class="summaryView"><div class="summaryViewHeader"><h4 class="display-inline-block"><?php if ($_smarty_tpl->tpl_vars['IS_BLOCK']->value == true) {
echo vtranslate('LBL_HEADER_INFORMATIONS','PDFMaker');
} else {
echo vtranslate('LBL_TEMPLATE_INFORMATIONS','PDFMaker');
}?></h4></div><div class="summaryViewFields"><div class="recordDetails"><table class="summary-table no-border"><tbody><tr class="summaryViewEntries"><td class="fieldLabel"><label class="muted textOverflowEllipsis"><?php echo vtranslate('LBL_PDF_NAME','PDFMaker');?>
</label></td><td class="fieldValue"><?php echo $_smarty_tpl->tpl_vars['FILENAME']->value;?>
</td></tr><tr class="summaryViewEntries"><td class="fieldLabel"><label class="muted textOverflowEllipsis"><?php echo vtranslate('LBL_DESCRIPTION','PDFMaker');?>
</label></td><td class="fieldValue" valign=top><?php echo $_smarty_tpl->tpl_vars['DESCRIPTION']->value;?>
</td></tr><?php if ($_smarty_tpl->tpl_vars['MODULENAME']->value != '') {?><tr class="summaryViewEntries"><td class="fieldLabel"><label class="muted textOverflowEllipsis"><?php echo vtranslate('LBL_MODULENAMES','PDFMaker');?>
</label></td><td class="fieldValue" valign=top><?php echo $_smarty_tpl->tpl_vars['MODULENAME']->value;?>
</td></tr><?php }
if ($_smarty_tpl->tpl_vars['IS_BLOCK']->value != true) {?><tr class="summaryViewEntries"><td class="fieldLabel"><label class="muted textOverflowEllipsis"><?php echo vtranslate('Status');?>
</label></td><td class="fieldValue" valign=top><?php echo $_smarty_tpl->tpl_vars['IS_ACTIVE']->value;?>
</td></tr><tr class="summaryViewEntries"><td class="fieldLabel"><label class="muted textOverflowEllipsis"><?php echo vtranslate('LBL_SETASDEFAULT','PDFMaker');?>
</label></td><td class="fieldValue" valign=top><?php echo $_smarty_tpl->tpl_vars['IS_DEFAULT']->value;?>
</td></tr><?php }
if ($_smarty_tpl->tpl_vars['WATERMARK']->value['type'] != "none") {?><tr class="summaryViewEntries"><td class="fieldLabel"><label class="muted textOverflowEllipsis"><?php echo vtranslate('Watermark','PDFMaker');?>
 (<?php echo $_smarty_tpl->tpl_vars['WATERMARK']->value['type_label'];?>
)</label></td><td class="fieldValue" valign=top><?php if ($_smarty_tpl->tpl_vars['WATERMARK']->value['type'] == "image") {?><a href="<?php echo $_smarty_tpl->tpl_vars['WATERMARK']->value['image_url'];?>
"><?php echo $_smarty_tpl->tpl_vars['WATERMARK']->value['image_name'];?>
</a><?php } else {
echo $_smarty_tpl->tpl_vars['WATERMARK']->value['text'];
}?></td></tr><?php }?></tbody></table></div></div></div><br><?php if ($_smarty_tpl->tpl_vars['IS_BLOCK']->value != true) {
if ($_smarty_tpl->tpl_vars['EDIT_PERMISSIONS']->value) {?><div class="summaryView"><div class="summaryViewHeader"><h4 class="display-inline-block"><?php echo vtranslate('LBL_DISPLAY_TAB',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</h4><div class="pull-right"><button type="button" class="btn btn-default editDisplayConditions" data-url="index.php?module=PDFMaker&view=EditDisplayConditions&templateid=<?php echo $_smarty_tpl->tpl_vars['TEMPLATEID']->value;?>
">&nbsp;<?php echo vtranslate('LBL_EDIT',$_smarty_tpl->tpl_vars['MODULE']->value);?>
&nbsp;<?php echo vtranslate('LBL_CONDITIONS',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</button></div></div><div class="summaryViewFields"><div class="recordDetails"><?php $_smarty_tpl->_subTemplateRender(call_user_func_array($_smarty_tpl->registered_plugins[ 'modifier' ][ 'vtemplate_path' ][ 0 ], array( 'DetailDisplayConditions.tpl',$_smarty_tpl->tpl_vars['MODULE']->value )), $_smarty_tpl->cache_id, $_smarty_tpl->compile_id, 0, $_smarty_tpl->cache_lifetime, array(), 0, true);
?></div></div></div><br><?php if ($_smarty_tpl->tpl_vars['ISSTYLESACTIVE']->value == "yes") {?><div class="summaryView"><div class="summaryViewHeader"><h4 class="display-inline-block"><?php echo vtranslate('LBL_CSS_STYLE_TAB',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</h4><div class="pull-right"><button type="button" class="btn btn-default addButton addStyleContentBtn" data-modulename="ITS4YouStyles"><?php echo vtranslate('LBL_ADD');?>
&nbsp;<?php echo vtranslate('SINGLE_ITS4YouStyles','ITS4YouStyles');?>
</button>&nbsp;&nbsp;<button type="button" class="btn btn-default addButton selectRelationStyle" data-modulename="ITS4YouStyles">&nbsp;<?php echo vtranslate('LBL_SELECT');?>
&nbsp;<?php echo vtranslate('SINGLE_ITS4YouStyles','ITS4YouStyles');?>
</button></div></div><br><div class="summaryWidgetContainer noContent"><?php if ($_smarty_tpl->tpl_vars['STYLES_LIST']->value) {?><div id="table-content" class="table-container"><table id="listview-table" class="table listview-table"><thead><tr class="listViewContentHeader"><th style="width:55px;"></th><th nowrap><?php echo vtranslate('Name','ITS4YouStyles');?>
</th><th nowrap><?php echo vtranslate('Priority','ITS4YouStyles');?>
</th></tr></thead><tbody class="overflow-y"><?php
$_from = $_smarty_tpl->smarty->ext->_foreach->init($_smarty_tpl, $_smarty_tpl->tpl_vars['STYLES_LIST']->value, 'style_data');
$_smarty_tpl->tpl_vars['style_data']->do_else = true;
if ($_from !== null) foreach ($_from as $_smarty_tpl->tpl_vars['style_data']->value) {
$_smarty_tpl->tpl_vars['style_data']->do_else = false;
?><tr class="" data-id="<?php echo $_smarty_tpl->tpl_vars['style_data']->value['id'];?>
"><td style="width:55px"><?php if ($_smarty_tpl->tpl_vars['style_data']->value['iseditable'] == "yes") {?><span class="actionImages">&nbsp;&nbsp;&nbsp;<a name="styleEdit" data-url="index.php?module=ITS4YouStyles&view=Edit&record=<?php echo $_smarty_tpl->tpl_vars['style_data']->value['id'];?>
"><i title="Edit" class="fa fa-pencil"></i></a> &nbsp;&nbsp;<a class="relationDelete"><i title="Unlink" class="vicon-linkopen"></i></a></span><?php }?></td><td class="listViewEntryValue textOverflowEllipsis " width="%" nowrap><a name="styleEdit" data-url="index.php?module=ITS4YouStyles&view=Detail&record=<?php echo $_smarty_tpl->tpl_vars['style_data']->value['id'];?>
"><?php echo $_smarty_tpl->tpl_vars['style_data']->value['name'];?>
</a></td><td class="listViewEntryValue textOverflowEllipsis " width="%" nowrap><?php echo $_smarty_tpl->tpl_vars['style_data']->value['priority'];?>
</td></tr><?php
}
$_smarty_tpl->smarty->ext->_foreach->restore($_smarty_tpl, 1);?></tbody></table></div><?php } else { ?><p class="textAlignCenter"><?php echo vtranslate('LBL_NO_RELATED',$_smarty_tpl->tpl_vars['MODULE']->value);?>
 <?php echo vtranslate('LBL_STYLES',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</p><?php }?></div></div><br><?php }
}
}?></div><div class="middle-block col-lg-8"><?php if ($_smarty_tpl->tpl_vars['IS_BLOCK']->value != true) {?><div id="ContentEditorTabs"><ul class="nav nav-pills"><li class="active" data-type="body"><a href="#body_div2" aria-expanded="false" style="margin-right: 5px" data-toggle="tab"><?php echo vtranslate('LBL_BODY',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</a></li><li data-type="header"><a href="#header_div2" aria-expanded="false" style="margin-right: 5px" data-toggle="tab"><?php echo vtranslate('LBL_HEADER_TAB',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</a></li><li data-type="footer"><a href="#footer_div2" aria-expanded="false" data-toggle="tab"><?php echo vtranslate('LBL_FOOTER_TAB',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</a></li></ul></div><?php }?><div class="tab-content marginTop5px"><div class="tab-pane active" id="body_div2"><div id="previewcontent_body" class="hide"><?php echo $_smarty_tpl->tpl_vars['BODY']->value;?>
</div><iframe id="preview_body" style="width: 100%;height:1200px;"></iframe></div><?php if ($_smarty_tpl->tpl_vars['IS_BLOCK']->value != true) {?><div class="tab-pane" id="header_div2"><div id="previewcontent_header" class="hide"><?php echo $_smarty_tpl->tpl_vars['HEADER']->value;?>
</div><iframe id="preview_header" style="width: 100%;height:500px;"></iframe></div><div class="tab-pane" id="footer_div2"><div id="previewcontent_footer" class="hide"><?php echo $_smarty_tpl->tpl_vars['FOOTER']->value;?>
</div><iframe id="preview_footer" style="width: 100%;height:500px;"></iframe></div><?php }?></div></div></div></form></div></div><?php echo '<script'; ?>
 type="text/javascript">
    jQuery(document).ready(function() {
        PDFMaker_Detail_Js.setPreviewContent('body');
        PDFMaker_Detail_Js.setPreviewContent('header');
        PDFMaker_Detail_Js.setPreviewContent('footer');
    });
<?php echo '</script'; ?>
><?php }
}
