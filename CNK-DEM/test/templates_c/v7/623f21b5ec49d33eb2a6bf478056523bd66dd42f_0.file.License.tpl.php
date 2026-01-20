<?php
/* Smarty version 4.5.5, created on 2026-01-19 18:53:06
  from '/var/www/CNK-DEM/layouts/v7/modules/Settings/ITS4YouInstaller/rows/License.tpl' */

/* @var Smarty_Internal_Template $_smarty_tpl */
if ($_smarty_tpl->_decodeProperties($_smarty_tpl, array (
  'version' => '4.5.5',
  'unifunc' => 'content_696e61726ed180_52498323',
  'has_nocache_code' => false,
  'file_dependency' => 
  array (
    '623f21b5ec49d33eb2a6bf478056523bd66dd42f' => 
    array (
      0 => '/var/www/CNK-DEM/layouts/v7/modules/Settings/ITS4YouInstaller/rows/License.tpl',
      1 => 1766693999,
      2 => 'file',
    ),
  ),
  'includes' => 
  array (
  ),
),false)) {
function content_696e61726ed180_52498323 (Smarty_Internal_Template $_smarty_tpl) {
?><tr class="<?php echo $_smarty_tpl->tpl_vars['LICENSE']->value->getParentClass();?>
">
    <td style="border-left:none;border-right:none;">
        <a class="licenseColors" href="#<?php if ($_smarty_tpl->tpl_vars['LICENSE']->value->get('service_usageunit') != 'Package') {
echo $_smarty_tpl->tpl_vars['LICENSE']->value->get('cf_identifier');
}?>">
            <?php echo $_smarty_tpl->tpl_vars['LICENSE_KEY']->value;?>

        </a>
    </td>
    <td style="border-left:none;border-right:none;">
        <?php echo $_smarty_tpl->tpl_vars['LICENSE']->value->get('servicename');?>

    </td>
    <?php if ($_smarty_tpl->tpl_vars['LICENSE']->value->isHostingLicense()) {?>
        <td colspan="3" style="border-left:none;">
            <?php echo vtranslate('LBL_HOSTING_LICENSE',$_smarty_tpl->tpl_vars['QUALIFIED_MODULE']->value);?>

        </td>
    <?php } else { ?>
        <td style="border-left:none;border-right:none;">
            <?php if ($_smarty_tpl->tpl_vars['LICENSE']->value->get('due_date') != '') {?>
                <?php echo Vtiger_Util_Helper::formatDateIntoStrings($_smarty_tpl->tpl_vars['LICENSE']->value->get('due_date'));?>

            <?php }?>
        </td>
        <td style="border-left:none;border-right:none;">
            <?php if ($_smarty_tpl->tpl_vars['LICENSE']->value->hasParentLicense()) {?>
                <?php echo vtranslate('LBL_SUBLICENSE',$_smarty_tpl->tpl_vars['QUALIFIED_MODULE']->value);?>

            <?php } elseif ($_smarty_tpl->tpl_vars['LICENSE']->value->get('subscription') == "1") {?>
                <?php echo vtranslate('LBL_SUBSCRIPTION',$_smarty_tpl->tpl_vars['QUALIFIED_MODULE']->value);?>

            <?php } elseif ($_smarty_tpl->tpl_vars['LICENSE']->value->get('demo_free') == "1") {?>
                <?php echo vtranslate('LBL_DEMO_FREE',$_smarty_tpl->tpl_vars['QUALIFIED_MODULE']->value);?>

            <?php } else { ?>
                <?php echo vtranslate('LBL_FULL',$_smarty_tpl->tpl_vars['QUALIFIED_MODULE']->value);?>

            <?php }?>
        </td>
        <?php if ($_smarty_tpl->tpl_vars['LICENSE']->value->hasParentLicense()) {?>
            <td style="border-left:none;border-right:none;"></td>
        <?php } else { ?>
            <td style="border-left:none;border-right:none;">
                <?php if ($_smarty_tpl->tpl_vars['LICENSE']->value->isRenewReady() && $_smarty_tpl->tpl_vars['EXTENSION_MODEL']->value->isAllowedBuyLicense()) {?>
                    <?php if ($_smarty_tpl->tpl_vars['LICENSE']->value->get('subscription') == "1") {?>
                        <a class="btn btn-info" target="_blank" href="<?php echo $_smarty_tpl->tpl_vars['LICENSE']->value->getRenewUrl();?>
"><?php echo vtranslate('LBL_PROLONG_LICENSE',$_smarty_tpl->tpl_vars['QUALIFIED_MODULE']->value);?>
</a>
                    <?php } elseif ($_smarty_tpl->tpl_vars['LICENSE']->value->get('demo_free') == true) {?>
                        <a class="btn btn-success" target="_blank" href="<?php echo $_smarty_tpl->tpl_vars['LICENSE']->value->getConvertUrl();?>
"><?php echo vtranslate('LBL_BUY_LICENSE',$_smarty_tpl->tpl_vars['QUALIFIED_MODULE']->value);?>
</a>
                    <?php } else { ?>
                        <a class="btn btn-primary" target="_blank" href="<?php echo $_smarty_tpl->tpl_vars['LICENSE']->value->getRenewUrl();?>
"><?php echo vtranslate('LBL_RENEW_LICENSE',$_smarty_tpl->tpl_vars['QUALIFIED_MODULE']->value);?>
</a>
                    <?php }?>
                    &nbsp;&nbsp;
                <?php }?>
                <button class="btn btn-danger actionLicenses" type="button" data-mode="deactivate" data-license="<?php echo $_smarty_tpl->tpl_vars['LICENSE_KEY']->value;?>
"><?php echo vtranslate('LBL_DEACTIVATE_LICENSES',$_smarty_tpl->tpl_vars['QUALIFIED_MODULE']->value);?>
</button>
                <div class="pull-right">
                    <?php if ($_smarty_tpl->tpl_vars['LICENSE']->value->isExpired()) {?>
                        <div class="alert alert-danger displayInlineBlock" style="margin:0;"><?php if ($_smarty_tpl->tpl_vars['LICENSE']->value->isTrial()) {
echo vtranslate('LBL_TRIAL_INACTIVE',$_smarty_tpl->tpl_vars['QUALIFIED_MODULE']->value);
} else {
echo vtranslate('LBL_MEMBERSHIP_INACTIVE',$_smarty_tpl->tpl_vars['QUALIFIED_MODULE']->value);
}
echo $_smarty_tpl->tpl_vars['LICENSE']->value->getExpireString();?>
</div>
                    <?php } else { ?>
                        <div class="alert alert-<?php if ($_smarty_tpl->tpl_vars['LICENSE']->value->isRenewReady()) {?>warning<?php } else { ?>info<?php }?> displayInlineBlock" style="margin:0;"><?php if ($_smarty_tpl->tpl_vars['LICENSE']->value->isTrial()) {
echo vtranslate('LBL_TRIAL_ACTIVE',$_smarty_tpl->tpl_vars['QUALIFIED_MODULE']->value);
} else {
echo vtranslate('LBL_MEMBERSHIP_ACTIVE',$_smarty_tpl->tpl_vars['QUALIFIED_MODULE']->value);
}
echo $_smarty_tpl->tpl_vars['LICENSE']->value->getExpireString();?>
</div>
                    <?php }?>
                </div>
            </td>
        <?php }?>
    <?php }?>
</tr><?php }
}
