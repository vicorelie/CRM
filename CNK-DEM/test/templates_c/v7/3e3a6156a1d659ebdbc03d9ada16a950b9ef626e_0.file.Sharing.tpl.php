<?php
/* Smarty version 4.5.5, created on 2025-12-28 15:33:50
  from '/var/www/CNK-DEM/layouts/v7/modules/PDFMaker/tabs/Sharing.tpl' */

/* @var Smarty_Internal_Template $_smarty_tpl */
if ($_smarty_tpl->_decodeProperties($_smarty_tpl, array (
  'version' => '4.5.5',
  'unifunc' => 'content_69514ddec62850_05856903',
  'has_nocache_code' => false,
  'file_dependency' => 
  array (
    '3e3a6156a1d659ebdbc03d9ada16a950b9ef626e' => 
    array (
      0 => '/var/www/CNK-DEM/layouts/v7/modules/PDFMaker/tabs/Sharing.tpl',
      1 => 1766693999,
      2 => 'file',
    ),
  ),
  'includes' => 
  array (
  ),
),false)) {
function content_69514ddec62850_05856903 (Smarty_Internal_Template $_smarty_tpl) {
$_smarty_tpl->_checkPlugins(array(0=>array('file'=>'/var/www/CNK-DEM/vendor/smarty/smarty/libs/plugins/function.html_options.php','function'=>'smarty_function_html_options',),));
?>
<div class="tab-pane" id="editTabSharing">
    <div id="sharing_div" class="edit-template-content">
        <div class="form-group">
            <label class="control-label fieldLabel col-sm-3" style="font-weight: normal">
                <?php echo vtranslate('LBL_TEMPLATE_OWNER',$_smarty_tpl->tpl_vars['MODULE']->value);?>
:
            </label>
            <div class="controls col-sm-9">
                <select name="template_owner" id="template_owner" class="select2 col-sm-12">
                    <?php echo smarty_function_html_options(array('options'=>$_smarty_tpl->tpl_vars['TEMPLATE_OWNERS']->value,'selected'=>$_smarty_tpl->tpl_vars['TEMPLATE_OWNER']->value),$_smarty_tpl);?>

                </select>
            </div>
        </div>

        <div class="form-group">
            <label class="control-label fieldLabel col-sm-3" style="font-weight: normal">
                <?php echo vtranslate('LBL_SHARING_TAB',$_smarty_tpl->tpl_vars['MODULE']->value);?>
:
            </label>
            <div class="controls col-sm-9">
                <select name="sharing" id="sharing" data-toogle-members="true" class="select2 form-control">
                    <?php echo smarty_function_html_options(array('options'=>$_smarty_tpl->tpl_vars['SHARINGTYPES']->value,'selected'=>$_smarty_tpl->tpl_vars['SHARINGTYPE']->value),$_smarty_tpl);?>

                </select>
                <br>
                <div class="memberListContainer <?php if ($_smarty_tpl->tpl_vars['SHARINGTYPE']->value != 'share') {?>hide<?php }?>">
                    <select id="memberList" class="select2 form-control members" multiple="true" name="members[]" data-placeholder="<?php echo vtranslate('LBL_ADD_USERS_ROLES',$_smarty_tpl->tpl_vars['MODULE']->value);?>
" style="margin-bottom: 10px;" data-rule-required="<?php if ($_smarty_tpl->tpl_vars['SHARINGTYPE']->value == "share") {?>true<?php } else { ?>false<?php }?>">

                        <?php
$_from = $_smarty_tpl->smarty->ext->_foreach->init($_smarty_tpl, $_smarty_tpl->tpl_vars['MEMBER_GROUPS']->value, 'ALL_GROUP_MEMBERS', false, 'GROUP_LABEL');
$_smarty_tpl->tpl_vars['ALL_GROUP_MEMBERS']->do_else = true;
if ($_from !== null) foreach ($_from as $_smarty_tpl->tpl_vars['GROUP_LABEL']->value => $_smarty_tpl->tpl_vars['ALL_GROUP_MEMBERS']->value) {
$_smarty_tpl->tpl_vars['ALL_GROUP_MEMBERS']->do_else = false;
?>
                            <?php $_smarty_tpl->_assignInScope('TRANS_GROUP_LABEL', $_smarty_tpl->tpl_vars['GROUP_LABEL']->value);?>
                            <?php if ($_smarty_tpl->tpl_vars['GROUP_LABEL']->value == 'RoleAndSubordinates') {?>
                                <?php $_smarty_tpl->_assignInScope('TRANS_GROUP_LABEL', 'LBL_ROLEANDSUBORDINATE');?>
                            <?php }?>
                            <?php ob_start();
echo vtranslate($_smarty_tpl->tpl_vars['TRANS_GROUP_LABEL']->value);
$_prefixVariable2 = ob_get_clean();
$_smarty_tpl->_assignInScope('TRANS_GROUP_LABEL', $_prefixVariable2);?>
                            <optgroup label="<?php echo $_smarty_tpl->tpl_vars['TRANS_GROUP_LABEL']->value;?>
">
                                <?php
$_from = $_smarty_tpl->smarty->ext->_foreach->init($_smarty_tpl, $_smarty_tpl->tpl_vars['ALL_GROUP_MEMBERS']->value, 'MEMBER');
$_smarty_tpl->tpl_vars['MEMBER']->do_else = true;
if ($_from !== null) foreach ($_from as $_smarty_tpl->tpl_vars['MEMBER']->value) {
$_smarty_tpl->tpl_vars['MEMBER']->do_else = false;
?>
                                    <option value="<?php echo $_smarty_tpl->tpl_vars['MEMBER']->value->getId();?>
" data-member-type="<?php echo $_smarty_tpl->tpl_vars['GROUP_LABEL']->value;?>
" <?php if ((isset($_smarty_tpl->tpl_vars['SELECTED_MEMBERS_GROUP']->value[$_smarty_tpl->tpl_vars['GROUP_LABEL']->value][$_smarty_tpl->tpl_vars['MEMBER']->value->getId()]))) {?>selected="true"<?php }?>><?php echo $_smarty_tpl->tpl_vars['MEMBER']->value->getName();?>
</option>
                                <?php
}
$_smarty_tpl->smarty->ext->_foreach->restore($_smarty_tpl, 1);?>
                            </optgroup>
                        <?php
}
$_smarty_tpl->smarty->ext->_foreach->restore($_smarty_tpl, 1);?>
                    </select>
                </div>
            </div>
        </div>
    </div>
</div><?php }
}
