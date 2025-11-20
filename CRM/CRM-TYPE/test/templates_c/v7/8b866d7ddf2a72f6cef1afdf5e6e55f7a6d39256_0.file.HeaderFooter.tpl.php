<?php
/* Smarty version 4.5.5, created on 2025-08-14 15:46:34
  from '/home/vicorelie/crm.tcerenov-design.com/layouts/v7/modules/PDFMaker/tabs/HeaderFooter.tpl' */

/* @var Smarty_Internal_Template $_smarty_tpl */
if ($_smarty_tpl->_decodeProperties($_smarty_tpl, array (
  'version' => '4.5.5',
  'unifunc' => 'content_689e04da9de568_45646224',
  'has_nocache_code' => false,
  'file_dependency' => 
  array (
    '8b866d7ddf2a72f6cef1afdf5e6e55f7a6d39256' => 
    array (
      0 => '/home/vicorelie/crm.tcerenov-design.com/layouts/v7/modules/PDFMaker/tabs/HeaderFooter.tpl',
      1 => 1754577870,
      2 => 'file',
    ),
  ),
  'includes' => 
  array (
  ),
),false)) {
function content_689e04da9de568_45646224 (Smarty_Internal_Template $_smarty_tpl) {
$_smarty_tpl->_checkPlugins(array(0=>array('file'=>'/home/vicorelie/crm.tcerenov-design.com/vendor/smarty/smarty/libs/plugins/function.html_options.php','function'=>'smarty_function_html_options',),));
?>
<div class="tab-pane" id="pdfContentHeaderFooter">
    <div class="edit-template-content">
                <div id="headerfooter_div">
            <?php if ($_smarty_tpl->tpl_vars['IS_BLOCK']->value != true) {?>
                                <?php
$_from = $_smarty_tpl->smarty->ext->_foreach->init($_smarty_tpl, $_smarty_tpl->tpl_vars['BLOCK_TYPES']->value, 'BLOCK_TYPE', false, 'BLOCKID');
$_smarty_tpl->tpl_vars['BLOCK_TYPE']->do_else = true;
if ($_from !== null) foreach ($_from as $_smarty_tpl->tpl_vars['BLOCKID']->value => $_smarty_tpl->tpl_vars['BLOCK_TYPE']->value) {
$_smarty_tpl->tpl_vars['BLOCK_TYPE']->do_else = false;
?>
                    <div class="form-group">
                        <label class="control-label fieldLabel col-sm-3" style="font-weight: normal">
                            <?php echo $_smarty_tpl->tpl_vars['BLOCK_TYPE']->value["name"];?>
:
                        </label>
                        <div class="controls col-sm-9">
                            <div class="blocktypeselect">
                                <select name="blocktype<?php echo $_smarty_tpl->tpl_vars['BLOCKID']->value;?>
_val" id="blocktype<?php echo $_smarty_tpl->tpl_vars['BLOCKID']->value;?>
_val" data-type="<?php echo $_smarty_tpl->tpl_vars['BLOCKID']->value;?>
" class="select2 col-sm-12">
                                    <?php echo smarty_function_html_options(array('options'=>$_smarty_tpl->tpl_vars['BLOCK_TYPE']->value["types"],'selected'=>$_smarty_tpl->tpl_vars['BLOCK_TYPE']->value["selected"]),$_smarty_tpl);?>

                                </select>
                            </div>
                            <div id="blocktype<?php echo $_smarty_tpl->tpl_vars['BLOCKID']->value;?>
" class="<?php if ($_smarty_tpl->tpl_vars['BLOCK_TYPE']->value["selected"] == "custom") {?>hide<?php }?>">
                                <select name="blocktype<?php echo $_smarty_tpl->tpl_vars['BLOCKID']->value;?>
_list" id="blocktype<?php echo $_smarty_tpl->tpl_vars['BLOCKID']->value;?>
_list" class="select2 col-sm-12">
                                    <?php
$_from = $_smarty_tpl->smarty->ext->_foreach->init($_smarty_tpl, $_smarty_tpl->tpl_vars['BLOCK_TYPE']->value["list"], 'BLOCK_TYPE_DATA');
$_smarty_tpl->tpl_vars['BLOCK_TYPE_DATA']->do_else = true;
if ($_from !== null) foreach ($_from as $_smarty_tpl->tpl_vars['BLOCK_TYPE_DATA']->value) {
$_smarty_tpl->tpl_vars['BLOCK_TYPE_DATA']->do_else = false;
?>
                                        <option value="<?php echo $_smarty_tpl->tpl_vars['BLOCK_TYPE_DATA']->value["templateid"];?>
" <?php if ($_smarty_tpl->tpl_vars['BLOCK_TYPE_DATA']->value["templateid"] == $_smarty_tpl->tpl_vars['BLOCK_TYPE']->value["selectedid"]) {?>selected<?php }?>><?php echo $_smarty_tpl->tpl_vars['BLOCK_TYPE_DATA']->value["name"];?>
</option>
                                    <?php
}
$_smarty_tpl->smarty->ext->_foreach->restore($_smarty_tpl, 1);?>
                                </select>
                            </div>
                        </div>
                    </div>
                <?php
}
$_smarty_tpl->smarty->ext->_foreach->restore($_smarty_tpl, 1);?>
            <?php }?>


                        <div class="form-group" id="header_variables">
                <label class="control-label fieldLabel col-sm-3" style="font-weight: normal">
                    <?php echo vtranslate('LBL_HEADER_FOOTER_VARIABLES',$_smarty_tpl->tpl_vars['MODULE']->value);?>
:
                </label>
                <div class="controls col-sm-9">
                    <div class="input-group">
                        <select name="header_var" id="header_var" class="select2 form-control">
                            <?php echo smarty_function_html_options(array('options'=>$_smarty_tpl->tpl_vars['HEAD_FOOT_VARS']->value,'selected'=>''),$_smarty_tpl);?>

                        </select>
                        <div class="input-group-btn">
                            <button type="button" class="btn btn-success InsertIntoTemplate" data-type="header_var" title="<?php echo vtranslate('LBL_INSERT_TO_TEXT',$_smarty_tpl->tpl_vars['MODULE']->value);?>
"><i class="fa fa-usd"></i></button>
                        </div>
                    </div>
                </div>
            </div>
                        <div class="form-group">
                <label class="control-label fieldLabel col-sm-3" style="font-weight: normal">
                    <?php echo vtranslate('LBL_DISPLAY_HEADER',$_smarty_tpl->tpl_vars['MODULE']->value);?>
:
                </label>
                <div class="controls col-sm-9">
                    <b><?php echo vtranslate('LBL_ALL_PAGES',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</b>&nbsp;<input type="checkbox" id="dh_allid" name="dh_all" onclick="PDFMaker_EditJs.hf_checkboxes_changed(this, 'header');" <?php echo $_smarty_tpl->tpl_vars['DH_ALL']->value;?>
/>
                    &nbsp;&nbsp;
                    <?php echo vtranslate('LBL_FIRST_PAGE',$_smarty_tpl->tpl_vars['MODULE']->value);?>
&nbsp;<input type="checkbox" id="dh_firstid" name="dh_first" onclick="PDFMaker_EditJs.hf_checkboxes_changed(this, 'header');" <?php echo $_smarty_tpl->tpl_vars['DH_FIRST']->value;?>
/>
                    &nbsp;&nbsp;
                    <?php echo vtranslate('LBL_OTHER_PAGES',$_smarty_tpl->tpl_vars['MODULE']->value);?>
&nbsp;<input type="checkbox" id="dh_otherid" name="dh_other" onclick="PDFMaker_EditJs.hf_checkboxes_changed(this, 'header');" <?php echo $_smarty_tpl->tpl_vars['DH_OTHER']->value;?>
/></div>
            </div>
            <div class="form-group">
                <label class="control-label fieldLabel col-sm-3" style="font-weight: normal">
                    <?php echo vtranslate('LBL_DISPLAY_FOOTER',$_smarty_tpl->tpl_vars['MODULE']->value);?>
:
                </label>
                <div class="controls col-sm-9">
                    <b><?php echo vtranslate('LBL_ALL_PAGES',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</b>&nbsp;<input type="checkbox" id="df_allid" name="df_all" onclick="PDFMaker_EditJs.hf_checkboxes_changed(this, 'footer');" <?php echo $_smarty_tpl->tpl_vars['DF_ALL']->value;?>
/>
                    &nbsp;&nbsp;
                    <?php echo vtranslate('LBL_FIRST_PAGE',$_smarty_tpl->tpl_vars['MODULE']->value);?>
&nbsp;<input type="checkbox" id="df_firstid" name="df_first" onclick="PDFMaker_EditJs.hf_checkboxes_changed(this, 'footer');" <?php echo $_smarty_tpl->tpl_vars['DF_FIRST']->value;?>
/>
                    &nbsp;&nbsp;
                    <?php echo vtranslate('LBL_OTHER_PAGES',$_smarty_tpl->tpl_vars['MODULE']->value);?>
&nbsp;<input type="checkbox" id="df_otherid" name="df_other" onclick="PDFMaker_EditJs.hf_checkboxes_changed(this, 'footer');" <?php echo $_smarty_tpl->tpl_vars['DF_OTHER']->value;?>
/>
                    &nbsp;&nbsp;
                    <?php echo vtranslate('LBL_LAST_PAGE',$_smarty_tpl->tpl_vars['MODULE']->value);?>
&nbsp;<input type="checkbox" id="df_lastid" name="df_last" onclick="PDFMaker_EditJs.hf_checkboxes_changed(this, 'footer');" <?php echo $_smarty_tpl->tpl_vars['DF_LAST']->value;?>
/>
                </div>
            </div>
        </div>
    </div>
</div><?php }
}
