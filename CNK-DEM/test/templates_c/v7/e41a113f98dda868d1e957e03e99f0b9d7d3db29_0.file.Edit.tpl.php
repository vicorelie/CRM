<?php
/* Smarty version 4.5.5, created on 2026-01-19 18:57:08
  from '/var/www/CNK-DEM/layouts/v7/modules/EMAILMaker/Edit.tpl' */

/* @var Smarty_Internal_Template $_smarty_tpl */
if ($_smarty_tpl->_decodeProperties($_smarty_tpl, array (
  'version' => '4.5.5',
  'unifunc' => 'content_696e62644fbcb5_35725928',
  'has_nocache_code' => false,
  'file_dependency' => 
  array (
    'e41a113f98dda868d1e957e03e99f0b9d7d3db29' => 
    array (
      0 => '/var/www/CNK-DEM/layouts/v7/modules/EMAILMaker/Edit.tpl',
      1 => 1766693566,
      2 => 'file',
    ),
  ),
  'includes' => 
  array (
  ),
),false)) {
function content_696e62644fbcb5_35725928 (Smarty_Internal_Template $_smarty_tpl) {
$_smarty_tpl->_checkPlugins(array(0=>array('file'=>'/var/www/CNK-DEM/vendor/smarty/smarty/libs/plugins/function.html_options.php','function'=>'smarty_function_html_options',),));
?>
<div class="contents tabbable ui-sortable" style="width: 99%;"><form class="form-horizontal recordEditView" id="EditView" name="EditView" method="post" action="index.php" enctype="multipart/form-data"><input type="hidden" name="module" value="EMAILMaker"><input type="hidden" name="parenttab" value="<?php echo $_smarty_tpl->tpl_vars['PARENTTAB']->value;?>
"><input type="hidden" name="templateid" id="templateid" value="<?php echo $_smarty_tpl->tpl_vars['SAVETEMPLATEID']->value;?>
"><input type="hidden" name="action" value="SaveEMAILTemplate"><input type="hidden" name="redirect" value="true"><input type="hidden" name="return_module" value="<?php echo $_REQUEST['return_module'];?>
"><input type="hidden" name="return_view" value="<?php echo $_REQUEST['return_view'];?>
"><input type="hidden" name="is_theme" value="<?php if ($_smarty_tpl->tpl_vars['THEME_MODE']->value == "true") {?>1<?php } else { ?>0<?php }?>"><input type="hidden" name="selectedTab" id="selectedTab" value="properties"><input type="hidden" name="selectedTab2" id="selectedTab2" value="body"><ul class="nav nav-tabs layoutTabs massEditTabs"><li class="detailviewTab active"><a data-toggle="tab" href="#pdfContentEdit" aria-expanded="true"><strong><?php echo vtranslate('LBL_PROPERTIES_TAB',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</strong></a></li><li class="detailviewTab"><a data-toggle="tab" href="#pdfContentOther" aria-expanded="false"><strong><?php echo vtranslate('LBL_OTHER_INFO',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</strong></a></li><li class="detailviewTab"><a data-toggle="tab" href="#pdfContentLabels" aria-expanded="false"><strong><?php echo vtranslate('LBL_LABELS',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</strong></a></li><?php if ($_smarty_tpl->tpl_vars['THEME_MODE']->value != "true") {?><li class="detailviewTab"><a data-toggle="tab" href="#pdfContentProducts" aria-expanded="false"><strong><?php echo vtranslate('LBL_ARTICLE',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</strong></a></li><?php }?><li class="detailviewTab"><a data-toggle="tab" href="#editTabSettings" aria-expanded="false"><strong><?php echo vtranslate('LBL_SETTINGS_TAB',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</strong></a></li><?php if ($_smarty_tpl->tpl_vars['THEME_MODE']->value != "true") {?><li class="detailviewTab"><a data-toggle="tab" href="#editTabSharing" aria-expanded="false"><strong><?php echo vtranslate('LBL_SHARING_TAB',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</strong></a></li><?php }?></ul><div><div><div class="row"><div class="left-block col-xs-4"><div><div class="tab-content layoutContent themeTableColor overflowVisible"><?php $_smarty_tpl->_subTemplateRender(call_user_func_array($_smarty_tpl->registered_plugins[ 'modifier' ][ 'vtemplate_path' ][ 0 ], array( 'tabs/Properties.tpl',$_smarty_tpl->tpl_vars['MODULE']->value )), $_smarty_tpl->cache_id, $_smarty_tpl->compile_id, 0, $_smarty_tpl->cache_lifetime, array(), 0, true);
$_smarty_tpl->_subTemplateRender(call_user_func_array($_smarty_tpl->registered_plugins[ 'modifier' ][ 'vtemplate_path' ][ 0 ], array( 'tabs/Other.tpl',$_smarty_tpl->tpl_vars['MODULE']->value )), $_smarty_tpl->cache_id, $_smarty_tpl->compile_id, 0, $_smarty_tpl->cache_lifetime, array(), 0, true);
$_smarty_tpl->_subTemplateRender(call_user_func_array($_smarty_tpl->registered_plugins[ 'modifier' ][ 'vtemplate_path' ][ 0 ], array( 'tabs/Labels.tpl',$_smarty_tpl->tpl_vars['MODULE']->value )), $_smarty_tpl->cache_id, $_smarty_tpl->compile_id, 0, $_smarty_tpl->cache_lifetime, array(), 0, true);
$_smarty_tpl->_subTemplateRender(call_user_func_array($_smarty_tpl->registered_plugins[ 'modifier' ][ 'vtemplate_path' ][ 0 ], array( 'tabs/ProductBlock.tpl',$_smarty_tpl->tpl_vars['MODULE']->value )), $_smarty_tpl->cache_id, $_smarty_tpl->compile_id, 0, $_smarty_tpl->cache_lifetime, array(), 0, true);
$_smarty_tpl->_subTemplateRender(call_user_func_array($_smarty_tpl->registered_plugins[ 'modifier' ][ 'vtemplate_path' ][ 0 ], array( 'tabs/Settings.tpl',$_smarty_tpl->tpl_vars['MODULE']->value )), $_smarty_tpl->cache_id, $_smarty_tpl->compile_id, 0, $_smarty_tpl->cache_lifetime, array(), 0, true);
$_smarty_tpl->_subTemplateRender(call_user_func_array($_smarty_tpl->registered_plugins[ 'modifier' ][ 'vtemplate_path' ][ 0 ], array( 'tabs/Sharing.tpl',$_smarty_tpl->tpl_vars['MODULE']->value )), $_smarty_tpl->cache_id, $_smarty_tpl->compile_id, 0, $_smarty_tpl->cache_lifetime, array(), 0, true);
?></div></div></div><div class="middle-block col-xs-8"><?php if ($_smarty_tpl->tpl_vars['THEME_MODE']->value != "true") {?><div><table class="table no-border"><tbody id="properties_div"><tr><td class="fieldLabel alignMiddle" nowrap="nowrap"><label class="muted pull-right"><?php echo vtranslate('LBL_EMAIL_SUBJECT','EMAILMaker');?>
:&nbsp;</label></td><td class="fieldValue"><input name="subject" id="subject" type="text" value="<?php echo $_smarty_tpl->tpl_vars['EMAIL_TEMPLATE_RESULT']->value['subject'];?>
" class="inputElement nameField" tabindex="1"></td><td class="fieldValue"><select name="subject_fields" id="subject_fields" class="select2 form-control" onchange="EMAILMaker_EditJs.insertFieldIntoSubject(this.value);"><option value=""><?php echo vtranslate('LBL_SELECT_MODULE_FIELD','EMAILMaker');?>
</option><optgroup label="<?php echo vtranslate('LBL_COMMON_EMAILINFO','EMAILMaker');?>
"><?php echo smarty_function_html_options(array('options'=>$_smarty_tpl->tpl_vars['SUBJECT_FIELDS']->value),$_smarty_tpl);?>
</optgroup><?php if ($_smarty_tpl->tpl_vars['TEMPLATEID']->value != '' || $_smarty_tpl->tpl_vars['SELECTMODULE']->value != '') {
echo smarty_function_html_options(array('options'=>$_smarty_tpl->tpl_vars['SELECT_MODULE_FIELD_SUBJECT']->value),$_smarty_tpl);
}?></select></td></tr></table></div><?php }?><div class="tab-content"><div class="tab-pane active" id="body_div2" style="margin-bottom: 2em"><textarea name="body" id="body" style="width: 100%; height:700px" class=small tabindex="5"><?php echo $_smarty_tpl->tpl_vars['EMAIL_TEMPLATE_RESULT']->value['body'];?>
</textarea></div><?php if ($_smarty_tpl->tpl_vars['ITS4YOUSTYLE_FILES']->value != '') {?><div class="tab-pane" id="cssstyle_div2"><?php
$_from = $_smarty_tpl->smarty->ext->_foreach->init($_smarty_tpl, $_smarty_tpl->tpl_vars['STYLES_CONTENT']->value, 'STYLE_DATA');
$_smarty_tpl->tpl_vars['STYLE_DATA']->do_else = true;
if ($_from !== null) foreach ($_from as $_smarty_tpl->tpl_vars['STYLE_DATA']->value) {
$_smarty_tpl->tpl_vars['STYLE_DATA']->do_else = false;
?><div class="hide"><textarea class="CodeMirrorContent" id="CodeMirrorContent<?php echo $_smarty_tpl->tpl_vars['STYLE_DATA']->value['id'];?>
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
$_smarty_tpl->smarty->ext->_foreach->restore($_smarty_tpl, 1);?></div><?php }?></div><?php echo '<script'; ?>
 type="text/javascript"> jQuery(document).ready(function () {<?php if ($_smarty_tpl->tpl_vars['ITS4YOUSTYLE_FILES']->value != '') {?>//CKEDITOR.config.contentsCss = [<?php echo $_smarty_tpl->tpl_vars['ITS4YOUSTYLE_FILES']->value;?>
];
                                    jQuery('.CodeMirrorContent').each(function (index, Element) {
                                        var stylecontent = jQuery(Element).val();
                                        CKEDITOR.addCss(stylecontent);
                                    });
                                    <?php }?>
                                    CKEDITOR.replace('body', {height: '1000'});
                                })<?php echo '</script'; ?>
></div></div></div></div><div class="modal-overlay-footer row-fluid"><div class="textAlignCenter "><button class="btn" type="submit" onclick="document.EditView.redirect.value = 'false';"><strong><?php echo vtranslate('LBL_APPLY',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</strong></button>&nbsp;&nbsp;<button class="btn btn-success" type="submit"><strong><?php echo vtranslate('LBL_SAVE',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</strong></button><?php if ($_REQUEST['return_view'] != '') {?><a class="cancelLink" type="reset" onclick="window.location.href = 'index.php?module=<?php if ($_REQUEST['return_module'] != '') {
echo $_REQUEST['return_module'];
} else { ?>EMAILMaker<?php }?>&view=<?php echo $_REQUEST['return_view'];
if ($_REQUEST['templateid'] != '' && $_REQUEST['return_view'] != "List") {?>&templateid=<?php echo $_REQUEST['templateid'];
}?>';"><?php echo vtranslate('LBL_CANCEL',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</a><?php } else { ?><a class="cancelLink" type="reset" onclick="window.history.back();"><?php echo vtranslate('LBL_CANCEL',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</a><?php }?></div></div><div class="hide" style="display: none"><div id="div_vat_block_table"><?php echo $_smarty_tpl->tpl_vars['VATBLOCK_TABLE']->value;?>
</div><div id="div_charges_block_table"><?php echo $_smarty_tpl->tpl_vars['CHARGESBLOCK_TABLE']->value;?>
</div><div id="div_company_header_signature"><?php echo $_smarty_tpl->tpl_vars['COMPANY_HEADER_SIGNATURE']->value;?>
</div><div id="div_company_stamp_signature"><?php echo $_smarty_tpl->tpl_vars['COMPANY_STAMP_SIGNATURE']->value;?>
</div><div id="div_company_logo"><?php echo $_smarty_tpl->tpl_vars['COMPANYLOGO']->value;?>
</div></div></form></div><?php echo '<script'; ?>
 type="text/javascript">var selectedTab = 'properties';var selectedTab2 = 'body';var module_blocks = [];var selected_module = '<?php echo $_smarty_tpl->tpl_vars['SELECTMODULE']->value;?>
';var constructedOptionValue;var constructedOptionName;jQuery(document).ready(function () {jQuery.fn.scrollBottom = function () {return jQuery(document).height() - this.scrollTop() - this.height();};var $el = jQuery('.edit-template-content');var $window = jQuery(window);var top = 127;$window.bind("scroll resize", function () {var gap = $window.height() - $el.height() - 20;var scrollTop = $window.scrollTop();if (scrollTop < top - 125) {$el.css({top: (top - scrollTop) + "px",bottom: "auto"});} else {$el.css({top: top + "px",bottom: "auto"});}}).scroll();});<?php echo '</script'; ?>
>
<?php }
}
