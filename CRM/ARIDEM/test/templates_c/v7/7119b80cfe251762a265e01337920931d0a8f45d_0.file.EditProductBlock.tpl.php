<?php
/* Smarty version 4.5.5, created on 2025-11-21 08:59:15
  from '/var/www/CRM/ARIDEM/layouts/v7/modules/EMAILMaker/EditProductBlock.tpl' */

/* @var Smarty_Internal_Template $_smarty_tpl */
if ($_smarty_tpl->_decodeProperties($_smarty_tpl, array (
  'version' => '4.5.5',
  'unifunc' => 'content_692029e3e9a848_48256205',
  'has_nocache_code' => false,
  'file_dependency' => 
  array (
    '7119b80cfe251762a265e01337920931d0a8f45d' => 
    array (
      0 => '/var/www/CRM/ARIDEM/layouts/v7/modules/EMAILMaker/EditProductBlock.tpl',
      1 => 1754574240,
      2 => 'file',
    ),
  ),
  'includes' => 
  array (
  ),
),false)) {
function content_692029e3e9a848_48256205 (Smarty_Internal_Template $_smarty_tpl) {
$_smarty_tpl->_checkPlugins(array(0=>array('file'=>'/var/www/CRM/ARIDEM/vendor/smarty/smarty/libs/plugins/function.html_options.php','function'=>'smarty_function_html_options',),));
?>
<div class='editViewContainer'><form class="form-horizontal" id="EditView" name="EditView" method="post" action="index.php" enctype="multipart/form-data" data-detail-url="?module=EMAILMaker&view=ProductBlocks"><input type="hidden" name="module" value="EMAILMaker"/><input type="hidden" name="action" value="IndexAjax"/><input type="hidden" name="mode" value="SaveProductBlock"/><input type="hidden" name="tplid" value="<?php echo $_smarty_tpl->tpl_vars['EDIT_TEMPLATE']->value['id'];?>
"><div class="contentHeader row-fluid"><?php if ($_smarty_tpl->tpl_vars['EMODE']->value == 'edit') {
if ($_smarty_tpl->tpl_vars['MODE']->value != "duplicate") {?><span class="span8 font-x-x-large textOverflowEllipsis" title="<?php echo vtranslate('LBL_EDIT','EMAILMaker');?>
 &quot;<?php echo $_smarty_tpl->tpl_vars['FILENAME']->value;?>
&quot;"><?php echo vtranslate('LBL_EDIT','EMAILMaker');?>
 &quot;<?php echo $_smarty_tpl->tpl_vars['EDIT_TEMPLATE']->value['name'];?>
&quot;</span><?php } else { ?><span class="span8 font-x-x-large textOverflowEllipsis" title="<?php echo vtranslate('LBL_DUPLICATE','EMAILMaker');?>
 &quot;<?php echo $_smarty_tpl->tpl_vars['DUPLICATE_FILENAME']->value;?>
&quot;"><?php echo vtranslate('LBL_DUPLICATE','EMAILMaker');?>
 &quot;<?php echo $_smarty_tpl->tpl_vars['EDIT_TEMPLATE']->value['name'];?>
&quot;</span><?php }
} else { ?><span class="span8 font-x-x-large textOverflowEllipsis"><?php echo vtranslate('LBL_NEW_TEMPLATE','EMAILMaker');?>
</span><?php }?></div><div class="contents tabbable ui-sortable"><ul class="nav nav-tabs layoutTabs massEditTabs"><li class="active detailviewTab"><a data-toggle="tab" href="#pContentEdit"><?php echo vtranslate('LBL_PROPERTIES_TAB','EMAILMaker');?>
</a></li><li class="detailviewTab"><a data-toggle="tab" href="#pContentLabels"><?php echo vtranslate('LBL_LABELS','EMAILMaker');?>
</a></li></ul><div class="tab-content layoutContent themeTableColor overflowVisible"><div class="tab-pane active" id="pContentEdit"><table class="table no-border"><tbody><tr><td class="fieldLabel alignMiddle"><label class="muted pull-right"><?php echo vtranslate('LBL_EMAIL_NAME','EMAILMaker');?>
:<span class="redColor">*</span></label></td><td class="fieldValue"><input name="template_name" id="template_name" type="text" value="<?php if ($_smarty_tpl->tpl_vars['MODE']->value != "duplicate") {
echo $_smarty_tpl->tpl_vars['EDIT_TEMPLATE']->value['name'];
}?>" class="inputElement" tabindex="1" data-rule-required="true">&nbsp;</td></tr><tr><td class="fieldLabel alignMiddle"><label class="muted pull-right"><?php echo vtranslate('LBL_ARTICLE','EMAILMaker');?>
:</label></td><td class="fieldValue"><select name="articelvar" id="articelvar" class="select2 col-sm-9"><?php echo smarty_function_html_options(array('options'=>$_smarty_tpl->tpl_vars['ARTICLE_STRINGS']->value),$_smarty_tpl);?>
</select><button type="button" class="btn btn-success small create" onclick="InsertIntoTemplate('articelvar');"><i class="fa fa-usd"></i> <?php echo vtranslate('LBL_INSERT_TO_TEXT','EMAILMaker');?>
</button></td></tr><tr><td class="fieldLabel alignMiddle"><label class="muted pull-right">*<?php echo vtranslate('LBL_PRODUCTS_AVLBL','EMAILMaker');?>
:</label></td><td class="fieldValue"><select name="psfields" id="psfields" class="select2 col-sm-9"><?php echo smarty_function_html_options(array('options'=>$_smarty_tpl->tpl_vars['SELECT_PRODUCT_FIELD']->value),$_smarty_tpl);?>
</select><button type="button" class="btn btn-success small create" onclick="InsertIntoTemplate('psfields');"><i class="fa fa-usd"></i> <?php echo vtranslate('LBL_INSERT_TO_TEXT','EMAILMaker');?>
</button></td></tr><tr><td class="fieldLabel alignMiddle"><label class="muted pull-right">*<?php echo vtranslate('LBL_PRODUCTS_FIELDS','EMAILMaker');?>
:</label></td><td class="fieldValue"><select name="productfields" id="productfields" class="select2 col-sm-9"><?php echo smarty_function_html_options(array('options'=>$_smarty_tpl->tpl_vars['PRODUCTS_FIELDS']->value),$_smarty_tpl);?>
</select><button type="button" class="btn btn-success small create" onclick="InsertIntoTemplate('productfields');"><i class="fa fa-usd"></i> <?php echo vtranslate('LBL_INSERT_TO_TEXT','EMAILMaker');?>
</button></td></tr><tr><td class="fieldLabel alignMiddle"><label class="muted pull-right">*<?php echo vtranslate('LBL_SERVICES_FIELDS','EMAILMaker');?>
:</label></td><td class="fieldValue"><select name="servicesfields" id="servicesfields" class="select2 col-sm-9"><?php echo smarty_function_html_options(array('options'=>$_smarty_tpl->tpl_vars['SERVICES_FIELDS']->value),$_smarty_tpl);?>
</select><button type="button" class="btn btn-success small create" onclick="InsertIntoTemplate('servicesfields');"><i class="fa fa-usd"></i> <?php echo vtranslate('LBL_INSERT_TO_TEXT','EMAILMaker');?>
</button></td></tr><tr><td colspan="2"><small><?php echo vtranslate('LBL_PRODUCT_FIELD_INFO','EMAILMaker');?>
</small></td></tr></tbody></table></div><div class="tab-pane" id="pContentLabels"><table class="table no-border"><tr><td class="fieldLabel alignMiddle"><label class="muted pull-right"><?php echo vtranslate('LBL_GLOBAL_LANG','EMAILMaker');?>
:</label></td><td class="fieldValue"><select name="global_lang" id="global_lang" class="select2 col-sm-9"><?php echo smarty_function_html_options(array('options'=>$_smarty_tpl->tpl_vars['GLOBAL_LANG_LABELS']->value),$_smarty_tpl);?>
</select><button type="button" class="btn btn-success small create" onclick="InsertIntoTemplate('global_lang');"><i class="fa fa-usd"></i> <?php echo vtranslate('LBL_INSERT_TO_TEXT','PDFMaker');?>
</button></td></tr><tr><td class="fieldLabel alignMiddle"><label class="muted pull-right"><?php echo vtranslate('LBL_CUSTOM_LABELS','EMAILMaker');?>
:</label></td><td class="fieldValue"><select name="custom_lang" id="custom_lang" class="select2 col-sm-9"><?php echo smarty_function_html_options(array('options'=>$_smarty_tpl->tpl_vars['CUSTOM_LANG_LABELS']->value),$_smarty_tpl);?>
</select><button type="button" class="btn btn-success small create" onclick="InsertIntoTemplate('custom_lang');"><i class="fa fa-usd"></i> <?php echo vtranslate('LBL_INSERT_TO_TEXT','PDFMaker');?>
</button></td></tr></table></div></div></div><textarea name="body" id="body" style="width:90%;height:700px" class=small tabindex="5"><?php echo $_smarty_tpl->tpl_vars['EDIT_TEMPLATE']->value['body'];?>
</textarea><div class="modal-overlay-footer row-fluid"><div class="textAlignCenter "><button class="btn btn-success" type="submit" onclick="if(EMAILMaker_EditJs.saveEMAIL()) this.form.submit();"><strong><?php echo vtranslate('LBL_SAVE',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</strong></button><?php if ($_REQUEST['applied'] == 'true') {?><a class="cancelLink" type="reset" onclick="window.location.href = 'index.php?action=DetailViewEMAILTemplate&module=EMAILMaker&templateid=<?php echo $_smarty_tpl->tpl_vars['SAVETEMPLATEID']->value;?>
&parenttab=Tools';"><?php echo vtranslate('LBL_CANCEL',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</a><?php } else { ?><a class="cancelLink" type="reset" onclick="window.history.back();"><?php echo vtranslate('LBL_CANCEL',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</a><?php }?></div></div></form></div><?php echo '<script'; ?>
 type="text/javascript"> jQuery(document).ready(function () {
        CKEDITOR.replace('body', {height: '1000'});
        var EMAILMakerProductBlocksJs = EMAILMaker_ProductBlocks_Js.getInstance();
        EMAILMakerProductBlocksJs.registerEvents();
    });

    var selectedTab = "properties";

    function InsertIntoTemplate(elementType) {

        var insert_value = "";
        var selectField = document.getElementById(elementType).value;
        var oEditor = CKEDITOR.instances.body;

        if (elementType == "articelvar" || selectField == "LISTVIEWBLOCK_START" || selectField == "LISTVIEWBLOCK_END") {
            insert_value = '#' + selectField + '#';
        } else if (elementType == "relatedmodulefields") {
            insert_value = '$R_' + selectField + '$';
        } else if (elementType == "productbloctpl" || elementType == "productbloctpl2") {
            insert_value = selectField;
        } else if (elementType == "global_lang") {
            insert_value = '%G_' + selectField + '%';
        } else if (elementType == "custom_lang") {
            insert_value = '%' + selectField + '%';
        } else {
            insert_value = '$' + selectField + '$';
        }
        oEditor.insertHtml(insert_value);
    }
    <?php echo '</script'; ?>
><?php }
}
