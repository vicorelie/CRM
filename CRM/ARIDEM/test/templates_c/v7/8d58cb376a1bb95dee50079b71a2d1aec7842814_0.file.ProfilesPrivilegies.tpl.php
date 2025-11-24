<?php
/* Smarty version 4.5.5, created on 2025-11-21 08:57:49
  from '/var/www/CRM/ARIDEM/layouts/v7/modules/EMAILMaker/ProfilesPrivilegies.tpl' */

/* @var Smarty_Internal_Template $_smarty_tpl */
if ($_smarty_tpl->_decodeProperties($_smarty_tpl, array (
  'version' => '4.5.5',
  'unifunc' => 'content_6920298d843c17_80292849',
  'has_nocache_code' => false,
  'file_dependency' => 
  array (
    '8d58cb376a1bb95dee50079b71a2d1aec7842814' => 
    array (
      0 => '/var/www/CRM/ARIDEM/layouts/v7/modules/EMAILMaker/ProfilesPrivilegies.tpl',
      1 => 1754574240,
      2 => 'file',
    ),
  ),
  'includes' => 
  array (
  ),
),false)) {
function content_6920298d843c17_80292849 (Smarty_Internal_Template $_smarty_tpl) {
ob_start();
echo vimage_path('Enable.png');
$_prefixVariable1=ob_get_clean();
$_smarty_tpl->_assignInScope('ENABLE_IMAGE_PATH', $_prefixVariable1);
ob_start();
echo vimage_path('Disable.png');
$_prefixVariable2=ob_get_clean();
$_smarty_tpl->_assignInScope('DISABLE_IMAGE_PATH', $_prefixVariable2);?>
<div class="container-fluid">
    <form name="profiles_privilegies" action="index.php" method="post" class="form-horizontal">
        <br>
        <label class="pull-left themeTextColor font-x-x-large"><?php echo vtranslate('LBL_PROFILES','EMAILMaker');?>
</label>
        <?php if ($_smarty_tpl->tpl_vars['MODE']->value != "edit") {?>
            <button class="btn pull-right" type="submit"><?php echo vtranslate('LBL_EDIT','EMAILMaker');?>
</button><?php }?>
        <br clear="all"><?php echo vtranslate('LBL_PROFILES_DESC','EMAILMaker');?>

        <hr>
        <input type="hidden" name="module" value="EMAILMaker"/>
        <?php if ($_smarty_tpl->tpl_vars['MODE']->value == "edit") {?>
            <input type="hidden" name="action" value="IndexAjax"/>
            <input type="hidden" name="mode" value="SaveProfilesPrivilegies"/>
        <?php } else { ?>
            <input type="hidden" name="view" value="ProfilesPrivilegies"/>
            <input type="hidden" name="mode" value="edit"/>
        <?php }?>
        <br/>
        <div class="row-fluid">
            <label class="fieldLabel"><strong><?php echo vtranslate('LBL_SETPRIVILEGIES','EMAILMaker');?>
:</strong></label><br>

            <table class="table table-striped table-bordered profilesEditView">
                <thead>
                <tr class="blockHeader">
                    <th style="border-left: 1px solid #DDD !important;" width="40%"><?php echo vtranslate('LBL_PROFILES','EMAILMaker');?>
</th>
                    <th style="border-left: 1px solid #DDD !important;" width="15%" align="center"><?php echo vtranslate('LBL_CREATE_EDIT','EMAILMaker');?>
</th>
                    <th style="border-left: 1px solid #DDD !important;" width="15%" align="center"><?php echo vtranslate('LBL_VIEW','EMAILMaker');?>
</th>
                    <th style="border-left: 1px solid #DDD !important;" width="15%" align="center"><?php echo vtranslate('LBL_DELETE','EMAILMaker');?>
</th>
                </tr>
                </thead>
                <tbody>
                <?php
$_from = $_smarty_tpl->smarty->ext->_foreach->init($_smarty_tpl, $_smarty_tpl->tpl_vars['PERMISSIONS']->value, 'arr');
$_smarty_tpl->tpl_vars['arr']->do_else = true;
if ($_from !== null) foreach ($_from as $_smarty_tpl->tpl_vars['arr']->value) {
$_smarty_tpl->tpl_vars['arr']->do_else = false;
?>
                    <?php
$_from = $_smarty_tpl->smarty->ext->_foreach->init($_smarty_tpl, $_smarty_tpl->tpl_vars['arr']->value, 'profile_arr', false, 'profile_name');
$_smarty_tpl->tpl_vars['profile_arr']->do_else = true;
if ($_from !== null) foreach ($_from as $_smarty_tpl->tpl_vars['profile_name']->value => $_smarty_tpl->tpl_vars['profile_arr']->value) {
$_smarty_tpl->tpl_vars['profile_arr']->do_else = false;
?>
                        <tr>
                            <td class="cellLabel">
                                <?php echo $_smarty_tpl->tpl_vars['profile_name']->value;?>

                            </td>
                            <td class="cellText" align="center">
                                <?php if ($_smarty_tpl->tpl_vars['MODE']->value == "edit") {?>
                                    <input type="checkbox" <?php echo $_smarty_tpl->tpl_vars['profile_arr']->value['EDIT']['checked'];?>
 id="<?php echo $_smarty_tpl->tpl_vars['profile_arr']->value['EDIT']['name'];?>
" name="<?php echo $_smarty_tpl->tpl_vars['profile_arr']->value['EDIT']['name'];?>
" onclick="other_chk_clicked(this, '<?php echo $_smarty_tpl->tpl_vars['profile_arr']->value['DETAIL']['name'];?>
');"/>
                                <?php } else { ?>
                                    <img style="margin-left: 40%" class="alignMiddle" src="<?php if ($_smarty_tpl->tpl_vars['profile_arr']->value['EDIT']['checked'] != '') {
echo $_smarty_tpl->tpl_vars['ENABLE_IMAGE_PATH']->value;
} else {
echo $_smarty_tpl->tpl_vars['DISABLE_IMAGE_PATH']->value;
}?>"/>
                                <?php }?>
                            </td>
                            <td class="cellText" align="center">
                                <?php if ($_smarty_tpl->tpl_vars['MODE']->value == "edit") {?>
                                    <input type="checkbox" <?php echo $_smarty_tpl->tpl_vars['profile_arr']->value['DETAIL']['checked'];?>
 id="<?php echo $_smarty_tpl->tpl_vars['profile_arr']->value['DETAIL']['name'];?>
" name="<?php echo $_smarty_tpl->tpl_vars['profile_arr']->value['DETAIL']['name'];?>
" onclick="view_chk_clicked(this, '<?php echo $_smarty_tpl->tpl_vars['profile_arr']->value['EDIT']['name'];?>
', '<?php echo $_smarty_tpl->tpl_vars['profile_arr']->value['DELETE']['name'];?>
');"/>
                                <?php } else { ?>
                                    <img style="margin-left: 40%" class="alignMiddle" src="<?php if ($_smarty_tpl->tpl_vars['profile_arr']->value['DETAIL']['checked'] != '') {
echo $_smarty_tpl->tpl_vars['ENABLE_IMAGE_PATH']->value;
} else {
echo $_smarty_tpl->tpl_vars['DISABLE_IMAGE_PATH']->value;
}?>"/>
                                <?php }?>
                            </td>
                            <td class="cellText" align="center">
                                <?php if ($_smarty_tpl->tpl_vars['MODE']->value == "edit") {?>
                                    <input type="checkbox" <?php echo $_smarty_tpl->tpl_vars['profile_arr']->value['DELETE']['checked'];?>
 id="<?php echo $_smarty_tpl->tpl_vars['profile_arr']->value['DELETE']['name'];?>
" name="<?php echo $_smarty_tpl->tpl_vars['profile_arr']->value['DELETE']['name'];?>
" onclick="other_chk_clicked(this, '<?php echo $_smarty_tpl->tpl_vars['profile_arr']->value['DETAIL']['name'];?>
');"/>
                                <?php } else { ?>
                                    <img style="margin-left: 40%" class="alignMiddle" src="<?php if ($_smarty_tpl->tpl_vars['profile_arr']->value['DELETE']['checked'] != '') {
echo $_smarty_tpl->tpl_vars['ENABLE_IMAGE_PATH']->value;
} else {
echo $_smarty_tpl->tpl_vars['DISABLE_IMAGE_PATH']->value;
}?>"/>
                                <?php }?>
                            </td>
                        </tr>
                    <?php
}
$_smarty_tpl->smarty->ext->_foreach->restore($_smarty_tpl, 1);?>
                <?php
}
$_smarty_tpl->smarty->ext->_foreach->restore($_smarty_tpl, 1);?>
                </tbody>
            </table>
        </div>
        <?php if ($_smarty_tpl->tpl_vars['MODE']->value == "edit") {?>
            <div class="pull-right">
                <button class="btn btn-success" type="submit"><?php echo vtranslate('LBL_SAVE',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</button>
                <a class="cancelLink" onclick="window.history.back();" type="reset"><?php echo vtranslate('LBL_CANCEL',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</a>
            </div>
        <?php }?>
    </form>
</div>

    <?php echo '<script'; ?>
 language="javascript" type="text/javascript">
        function view_chk_clicked(source_chk, edit_chk_id, delete_chk_id) {
            if (source_chk.checked == false) {
                document.getElementById(edit_chk_id).checked = false;
                document.getElementById(delete_chk_id).checked = false;
            }
        }

        function other_chk_clicked(source_chk, detail_chk) {
            if (source_chk.checked == true) {
                document.getElementById(detail_chk).checked = true;
            }
        }
    <?php echo '</script'; ?>
>
    <?php }
}
