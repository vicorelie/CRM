<?php
/* Smarty version 4.5.5, created on 2025-11-24 12:56:45
  from '/var/www/CRM/CRM-TYPE/layouts/v7/modules/PDFMaker/tabs/Products.tpl' */

/* @var Smarty_Internal_Template $_smarty_tpl */
if ($_smarty_tpl->_decodeProperties($_smarty_tpl, array (
  'version' => '4.5.5',
  'unifunc' => 'content_6924560ddc3e87_55488204',
  'has_nocache_code' => false,
  'file_dependency' => 
  array (
    'e5b12c88569e95389c6e982a515986e547888de3' => 
    array (
      0 => '/var/www/CRM/CRM-TYPE/layouts/v7/modules/PDFMaker/tabs/Products.tpl',
      1 => 1763716215,
      2 => 'file',
    ),
  ),
  'includes' => 
  array (
  ),
),false)) {
function content_6924560ddc3e87_55488204 (Smarty_Internal_Template $_smarty_tpl) {
$_smarty_tpl->_checkPlugins(array(0=>array('file'=>'/var/www/CRM/CRM-TYPE/vendor/smarty/smarty/libs/plugins/function.html_options.php','function'=>'smarty_function_html_options',),));
?>
<div class="tab-pane" id="pdfContentProducts">
    <div class="edit-template-content">
                <div id="products_div">
                        <div class="form-group">
                <label class="control-label fieldLabel col-sm-4" style="font-weight: normal">
                    <?php echo vtranslate('LBL_PRODUCT_BLOC_TPL',$_smarty_tpl->tpl_vars['MODULE']->value);?>
:
                </label>
                <div class="controls col-sm-8">
                    <div class="input-group">
                        <select name="productbloctpl2" id="productbloctpl2" class="select2 form-control">
                            <?php echo smarty_function_html_options(array('options'=>$_smarty_tpl->tpl_vars['PRODUCT_BLOC_TPL']->value),$_smarty_tpl);?>

                        </select>
                        <span class="input-group-btn">
                                                                <button type="button" class="btn btn-success InsertIntoTemplate" data-type="productbloctpl2" title="<?php echo vtranslate('LBL_INSERT_TO_TEXT',$_smarty_tpl->tpl_vars['MODULE']->value);?>
"><i class="fa fa-usd"></i></button>
                                                            </span>
                    </div>
                </div>
            </div>
            <div class="form-group">
                <label class="control-label fieldLabel col-sm-4" style="font-weight: normal">
                    <?php echo vtranslate('LBL_ARTICLE',$_smarty_tpl->tpl_vars['MODULE']->value);?>
:
                </label>
                <div class="controls col-sm-8">
                    <div class="input-group">
                        <select name="articelvar" id="articelvar" class="select2 form-control">
                            <?php echo smarty_function_html_options(array('options'=>$_smarty_tpl->tpl_vars['ARTICLE_STRINGS']->value),$_smarty_tpl);?>

                        </select>
                        <span class="input-group-btn">
                                                                <button type="button" class="btn btn-success InsertIntoTemplate" data-type="articelvar" title="<?php echo vtranslate('LBL_INSERT_TO_TEXT',$_smarty_tpl->tpl_vars['MODULE']->value);?>
"><i class="fa fa-usd"></i></button>
                                                            </span>
                    </div>
                </div>
            </div>
                        <div class="form-group">
                <label class="control-label fieldLabel col-sm-4" style="font-weight: normal">
                    *<?php echo vtranslate('LBL_PRODUCTS_AVLBL',$_smarty_tpl->tpl_vars['MODULE']->value);?>
:
                </label>
                <div class="controls col-sm-8">
                    <div class="input-group">
                        <select name="psfields" id="psfields" class="select2 form-control">
                            <?php echo smarty_function_html_options(array('options'=>$_smarty_tpl->tpl_vars['SELECT_PRODUCT_FIELD']->value),$_smarty_tpl);?>

                        </select>
                        <span class="input-group-btn">
                                                                <button type="button" class="btn btn-success InsertIntoTemplate" data-type="psfields" title="<?php echo vtranslate('LBL_INSERT_VARIABLE_TO_TEXT',$_smarty_tpl->tpl_vars['MODULE']->value);?>
"><i class="fa fa-usd"></i></button>
                                                            </span>
                    </div>
                </div>
            </div>
                        <div class="form-group">
                <label class="control-label fieldLabel col-sm-4" style="font-weight: normal">
                    *<?php echo vtranslate('LBL_PRODUCTS_FIELDS',$_smarty_tpl->tpl_vars['MODULE']->value);?>
:
                </label>
                <div class="controls col-sm-8">
                    <div class="input-group">
                        <select name="productfields" id="productfields" class="select2 form-control">
                            <?php echo smarty_function_html_options(array('options'=>$_smarty_tpl->tpl_vars['PRODUCTS_FIELDS']->value),$_smarty_tpl);?>

                        </select>
                        <span class="input-group-btn">
                                                                <button type="button" class="btn btn-success InsertIntoTemplate" data-type="productfields" title="<?php echo vtranslate('LBL_INSERT_VARIABLE_TO_TEXT',$_smarty_tpl->tpl_vars['MODULE']->value);?>
"><i class="fa fa-usd"></i></button>
                                                            </span>
                    </div>
                </div>
            </div>
                        <div class="form-group">
                <label class="control-label fieldLabel col-sm-4" style="font-weight: normal">
                    *<?php echo vtranslate('LBL_SERVICES_FIELDS',$_smarty_tpl->tpl_vars['MODULE']->value);?>
:
                </label>
                <div class="controls col-sm-8">
                    <div class="input-group">
                        <select name="servicesfields" id="servicesfields" class="select2 form-control">
                            <?php echo smarty_function_html_options(array('options'=>$_smarty_tpl->tpl_vars['SERVICES_FIELDS']->value),$_smarty_tpl);?>

                        </select>
                        <span class="input-group-btn">
                                                                 <button type="button" class="btn btn-success InsertIntoTemplate" data-type="servicesfields" title="<?php echo vtranslate('LBL_INSERT_VARIABLE_TO_TEXT',$_smarty_tpl->tpl_vars['MODULE']->value);?>
"><i class="fa fa-usd"></i></button>
                                                            </span>
                    </div>
                </div>
            </div>
            <div class="form-group">
                <div class="controls col-sm-12">
                    <label class="muted"><?php echo vtranslate('LBL_PRODUCT_FIELD_INFO',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</label>
                </div>
            </div>
        </div>
    </div>
</div><?php }
}
