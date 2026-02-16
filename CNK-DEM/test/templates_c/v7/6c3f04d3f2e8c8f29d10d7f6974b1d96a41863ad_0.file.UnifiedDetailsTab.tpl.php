<?php
/* Smarty version 4.5.5, created on 2026-02-16 12:32:00
  from '/var/www/CNK-DEM/layouts/v7/modules/Potentials/UnifiedDetailsTab.tpl' */

/* @var Smarty_Internal_Template $_smarty_tpl */
if ($_smarty_tpl->_decodeProperties($_smarty_tpl, array (
  'version' => '4.5.5',
  'unifunc' => 'content_6992f2204d9641_50444933',
  'has_nocache_code' => false,
  'file_dependency' => 
  array (
    '6c3f04d3f2e8c8f29d10d7f6974b1d96a41863ad' => 
    array (
      0 => '/var/www/CNK-DEM/layouts/v7/modules/Potentials/UnifiedDetailsTab.tpl',
      1 => 1771190448,
      2 => 'file',
    ),
  ),
  'includes' => 
  array (
  ),
),false)) {
function content_6992f2204d9641_50444933 (Smarty_Internal_Template $_smarty_tpl) {
$_smarty_tpl->_checkPlugins(array(0=>array('file'=>'/var/www/CNK-DEM/vendor/smarty/smarty/libs/plugins/modifier.date_format.php','function'=>'smarty_modifier_date_format',),1=>array('file'=>'/var/www/CNK-DEM/vendor/smarty/smarty/libs/plugins/modifier.count.php','function'=>'smarty_modifier_count',),));
?>
<div class="details-tab-container" id="detailsTabContainer" data-record-id="<?php echo $_smarty_tpl->tpl_vars['RECORD']->value->getId();?>
" data-module="<?php echo $_smarty_tpl->tpl_vars['MODULE_NAME']->value;?>
" data-contact-id="<?php echo $_smarty_tpl->tpl_vars['RECORD']->value->get('contact_id');?>
"><?php $_smarty_tpl->_assignInScope('SIDE_BY_SIDE_BLOCKS', array('CHARGEMENT','DESTINATION'));
$_smarty_tpl->_assignInScope('DATE_UNIQUE_CHARGEMENT', '');
$_smarty_tpl->_assignInScope('DATE_UNIQUE_LIVRAISON', '');
$_smarty_tpl->_assignInScope('PERIODE_DEBUT', '');
$_smarty_tpl->_assignInScope('PERIODE_FIN', '');
$_smarty_tpl->_assignInScope('DISTANCE_VALUE', '');
$_smarty_tpl->_assignInScope('VOLUME_ESTIME_VALUE', '');
$_smarty_tpl->_assignInScope('VOLUME_FINAL_VALUE', '');
$_from = $_smarty_tpl->smarty->ext->_foreach->init($_smarty_tpl, $_smarty_tpl->tpl_vars['RECORD_STRUCTURE']->value, 'FIELDS', false, 'BLK');
$_smarty_tpl->tpl_vars['FIELDS']->do_else = true;
if ($_from !== null) foreach ($_from as $_smarty_tpl->tpl_vars['BLK']->value => $_smarty_tpl->tpl_vars['FIELDS']->value) {
$_smarty_tpl->tpl_vars['FIELDS']->do_else = false;
$_from = $_smarty_tpl->smarty->ext->_foreach->init($_smarty_tpl, $_smarty_tpl->tpl_vars['FIELDS']->value, 'FM', false, 'FN');
$_smarty_tpl->tpl_vars['FM']->do_else = true;
if ($_from !== null) foreach ($_from as $_smarty_tpl->tpl_vars['FN']->value => $_smarty_tpl->tpl_vars['FM']->value) {
$_smarty_tpl->tpl_vars['FM']->do_else = false;
if ($_smarty_tpl->tpl_vars['FN']->value == 'cf_1043') {
$_smarty_tpl->_assignInScope('DATE_UNIQUE_CHARGEMENT', $_smarty_tpl->tpl_vars['FM']->value->get('fieldvalue'));
}
if ($_smarty_tpl->tpl_vars['FN']->value == 'cf_1049') {
$_smarty_tpl->_assignInScope('DATE_UNIQUE_LIVRAISON', $_smarty_tpl->tpl_vars['FM']->value->get('fieldvalue'));
}
if ($_smarty_tpl->tpl_vars['FN']->value == 'cf_1045') {
$_smarty_tpl->_assignInScope('PERIODE_DEBUT', $_smarty_tpl->tpl_vars['FM']->value->get('fieldvalue'));
}
if ($_smarty_tpl->tpl_vars['FN']->value == 'cf_1047') {
$_smarty_tpl->_assignInScope('PERIODE_FIN', $_smarty_tpl->tpl_vars['FM']->value->get('fieldvalue'));
}
if ($_smarty_tpl->tpl_vars['FN']->value == 'cf_961') {
$_smarty_tpl->_assignInScope('DISTANCE_VALUE', $_smarty_tpl->tpl_vars['FM']->value->get('fieldvalue'));
}
if ($_smarty_tpl->tpl_vars['FN']->value == 'cf_939') {
$_smarty_tpl->_assignInScope('VOLUME_ESTIME_VALUE', $_smarty_tpl->tpl_vars['FM']->value->get('fieldvalue'));
}
if ($_smarty_tpl->tpl_vars['FN']->value == 'cf_1259') {
$_smarty_tpl->_assignInScope('VOLUME_FINAL_VALUE', $_smarty_tpl->tpl_vars['FM']->value->get('fieldvalue'));
}
if ($_smarty_tpl->tpl_vars['FN']->value == 'cf_981') {
$_smarty_tpl->_assignInScope('FM_MOBILE', $_smarty_tpl->tpl_vars['FM']->value);
}
if ($_smarty_tpl->tpl_vars['FN']->value == 'cf_1123') {
$_smarty_tpl->_assignInScope('FM_MAIL', $_smarty_tpl->tpl_vars['FM']->value);
}
if ($_smarty_tpl->tpl_vars['FN']->value == 'cf_1259') {
$_smarty_tpl->_assignInScope('FM_VOL_FINAL', $_smarty_tpl->tpl_vars['FM']->value);
}
if ($_smarty_tpl->tpl_vars['FN']->value == 'cf_971') {
$_smarty_tpl->_assignInScope('FM_STATUT', $_smarty_tpl->tpl_vars['FM']->value);
}
if ($_smarty_tpl->tpl_vars['FN']->value == 'cf_1164') {
$_smarty_tpl->_assignInScope('FM_VALIDATION', $_smarty_tpl->tpl_vars['FM']->value);
}
if ($_smarty_tpl->tpl_vars['FN']->value == 'createdtime') {
$_smarty_tpl->_assignInScope('FM_CREATEDTIME', $_smarty_tpl->tpl_vars['FM']->value);
}
if ($_smarty_tpl->tpl_vars['FN']->value == 'potential_no') {
$_smarty_tpl->_assignInScope('FM_POTENTIAL_NO', $_smarty_tpl->tpl_vars['FM']->value);
}
if ($_smarty_tpl->tpl_vars['FN']->value == 'potentialname') {
$_smarty_tpl->_assignInScope('FM_POTENTIALNAME', $_smarty_tpl->tpl_vars['FM']->value);
}
if ($_smarty_tpl->tpl_vars['FN']->value == 'assigned_user_id') {
$_smarty_tpl->_assignInScope('FM_ASSIGNED', $_smarty_tpl->tpl_vars['FM']->value);
}
}
$_smarty_tpl->smarty->ext->_foreach->restore($_smarty_tpl, 1);
}
$_smarty_tpl->smarty->ext->_foreach->restore($_smarty_tpl, 1);?><div class="date-selector-compact"><div class="date-selector-label"><i class="fa fa-calendar"></i> Dates :</div><div class="date-mode-toggle-compact"><label class="date-mode-btn <?php if ($_smarty_tpl->tpl_vars['PERIODE_DEBUT']->value == '' && $_smarty_tpl->tpl_vars['PERIODE_FIN']->value == '') {?>active<?php }?>" data-mode="unique"><input type="radio" name="date_mode" value="unique" <?php if ($_smarty_tpl->tpl_vars['PERIODE_DEBUT']->value == '' && $_smarty_tpl->tpl_vars['PERIODE_FIN']->value == '') {?>checked<?php }?>>Date fixe</label><label class="date-mode-btn <?php if ($_smarty_tpl->tpl_vars['PERIODE_DEBUT']->value != '' || $_smarty_tpl->tpl_vars['PERIODE_FIN']->value != '') {?>active<?php }?>" data-mode="period"><input type="radio" name="date_mode" value="period" <?php if ($_smarty_tpl->tpl_vars['PERIODE_DEBUT']->value != '' || $_smarty_tpl->tpl_vars['PERIODE_FIN']->value != '') {?>checked<?php }?>>Période</label></div><div class="date-fields-compact date-unique-container" style="<?php if ($_smarty_tpl->tpl_vars['PERIODE_DEBUT']->value != '' || $_smarty_tpl->tpl_vars['PERIODE_FIN']->value != '') {?>display:none;<?php }?>"><div class="date-field-item"><span class="date-field-label"><i class="fa fa-upload" style="color:#27ae60"></i> Charg.</span><input type="date" class="date-input-compact" id="date_unique_chargement" value="<?php if ($_smarty_tpl->tpl_vars['DATE_UNIQUE_CHARGEMENT']->value) {
echo smarty_modifier_date_format($_smarty_tpl->tpl_vars['DATE_UNIQUE_CHARGEMENT']->value,'%Y-%m-%d');
}?>"></div><div class="date-field-item"><span class="date-field-label"><i class="fa fa-download" style="color:#e74c3c"></i> Livr.</span><input type="date" class="date-input-compact" id="date_unique_livraison" value="<?php if ($_smarty_tpl->tpl_vars['DATE_UNIQUE_LIVRAISON']->value) {
echo smarty_modifier_date_format($_smarty_tpl->tpl_vars['DATE_UNIQUE_LIVRAISON']->value,'%Y-%m-%d');
}?>"></div></div><div class="date-fields-compact date-period-container" style="<?php if ($_smarty_tpl->tpl_vars['PERIODE_DEBUT']->value == '' && $_smarty_tpl->tpl_vars['PERIODE_FIN']->value == '') {?>display:none;<?php }?>"><div class="date-field-item"><span class="date-field-label"><i class="fa fa-calendar-plus-o" style="color:#3498db"></i> Du</span><input type="date" class="date-input-compact" id="date_periode_debut" value="<?php if ($_smarty_tpl->tpl_vars['PERIODE_DEBUT']->value) {
echo smarty_modifier_date_format($_smarty_tpl->tpl_vars['PERIODE_DEBUT']->value,'%Y-%m-%d');
}?>"></div><div class="date-field-item"><span class="date-field-label"><i class="fa fa-calendar-times-o" style="color:#9b59b6"></i> Au</span><input type="date" class="date-input-compact" id="date_periode_fin" value="<?php if ($_smarty_tpl->tpl_vars['PERIODE_FIN']->value) {
echo smarty_modifier_date_format($_smarty_tpl->tpl_vars['PERIODE_FIN']->value,'%Y-%m-%d');
}?>"></div></div><div class="metrics-separator"></div><div class="key-metrics-compact"><div class="metric-item"><span class="metric-label"><i class="fa fa-road" style="color:#3498db"></i> Dist</span><span class="metric-value" id="metric_distance"><?php if ($_smarty_tpl->tpl_vars['DISTANCE_VALUE']->value) {
echo $_smarty_tpl->tpl_vars['DISTANCE_VALUE']->value;
} else { ?>--<?php }?></span><span class="metric-unit">km</span></div><div class="metric-item"><span class="metric-label"><i class="fa fa-cube" style="color:#9b59b6"></i> Vol inv</span><span class="metric-value" id="metric_volume_estime"><?php if ($_smarty_tpl->tpl_vars['VOLUME_ESTIME_VALUE']->value) {
echo $_smarty_tpl->tpl_vars['VOLUME_ESTIME_VALUE']->value;
} else { ?>--<?php }?></span><span class="metric-unit">m³</span></div><div class="metric-item"><span class="metric-label"><i class="fa fa-cubes" style="color:#e67e22"></i> Vol fin</span><span class="metric-value" id="metric_volume_final"><?php if ($_smarty_tpl->tpl_vars['VOLUME_FINAL_VALUE']->value) {
echo $_smarty_tpl->tpl_vars['VOLUME_FINAL_VALUE']->value;
} else { ?>--<?php }?></span><span class="metric-unit">m³</span></div></div><input type="hidden" class="unified-field-input" name="cf_1043" id="hidden_cf_1043" data-fieldname="cf_1043" data-fieldtype="date" value="<?php if ($_smarty_tpl->tpl_vars['DATE_UNIQUE_CHARGEMENT']->value) {
echo smarty_modifier_date_format($_smarty_tpl->tpl_vars['DATE_UNIQUE_CHARGEMENT']->value,'%Y-%m-%d');
}?>"><input type="hidden" class="unified-field-input" name="cf_1049" id="hidden_cf_1049" data-fieldname="cf_1049" data-fieldtype="date" value="<?php if ($_smarty_tpl->tpl_vars['DATE_UNIQUE_LIVRAISON']->value) {
echo smarty_modifier_date_format($_smarty_tpl->tpl_vars['DATE_UNIQUE_LIVRAISON']->value,'%Y-%m-%d');
}?>"><input type="hidden" class="unified-field-input" name="cf_1045" id="hidden_cf_1045" data-fieldname="cf_1045" data-fieldtype="date" value="<?php if ($_smarty_tpl->tpl_vars['PERIODE_DEBUT']->value) {
echo smarty_modifier_date_format($_smarty_tpl->tpl_vars['PERIODE_DEBUT']->value,'%Y-%m-%d');
}?>"><input type="hidden" class="unified-field-input" name="cf_1047" id="hidden_cf_1047" data-fieldname="cf_1047" data-fieldtype="date" value="<?php if ($_smarty_tpl->tpl_vars['PERIODE_FIN']->value) {
echo smarty_modifier_date_format($_smarty_tpl->tpl_vars['PERIODE_FIN']->value,'%Y-%m-%d');
}?>"></div><div class="address-row"><?php
$_from = $_smarty_tpl->smarty->ext->_foreach->init($_smarty_tpl, $_smarty_tpl->tpl_vars['SIDE_BY_SIDE_BLOCKS']->value, 'SIDE_BLOCK_KEY');
$_smarty_tpl->tpl_vars['SIDE_BLOCK_KEY']->do_else = true;
if ($_from !== null) foreach ($_from as $_smarty_tpl->tpl_vars['SIDE_BLOCK_KEY']->value) {
$_smarty_tpl->tpl_vars['SIDE_BLOCK_KEY']->do_else = false;
if ((isset($_smarty_tpl->tpl_vars['RECORD_STRUCTURE']->value[$_smarty_tpl->tpl_vars['SIDE_BLOCK_KEY']->value]))) {
$_smarty_tpl->_assignInScope('BLOCK_FIELDS', $_smarty_tpl->tpl_vars['RECORD_STRUCTURE']->value[$_smarty_tpl->tpl_vars['SIDE_BLOCK_KEY']->value]);
if ($_smarty_tpl->tpl_vars['SIDE_BLOCK_KEY']->value == 'CHARGEMENT') {
$_smarty_tpl->_assignInScope('HEADER_CLASS', 'header-green');
$_smarty_tpl->_assignInScope('ICON_CLASS', 'fa-upload');
} else {
$_smarty_tpl->_assignInScope('HEADER_CLASS', 'header-red');
$_smarty_tpl->_assignInScope('ICON_CLASS', 'fa-download');
}?><div class="card" style="padding: 0; overflow: hidden;" data-block="<?php echo $_smarty_tpl->tpl_vars['SIDE_BLOCK_KEY']->value;?>
"><div class="card-header <?php echo $_smarty_tpl->tpl_vars['HEADER_CLASS']->value;?>
" style="margin: 0; border-radius: 12px 12px 0 0;"><i class="fa <?php echo $_smarty_tpl->tpl_vars['ICON_CLASS']->value;?>
"></i> <?php if ($_smarty_tpl->tpl_vars['SIDE_BLOCK_KEY']->value == 'DESTINATION') {?>LIVRAISON<?php } else {
echo vtranslate($_smarty_tpl->tpl_vars['SIDE_BLOCK_KEY']->value,$_smarty_tpl->tpl_vars['MODULE_NAME']->value);
}?></div><div class="form-fields-grid form-fields-address" style="padding: 15px;"><?php
$_from = $_smarty_tpl->smarty->ext->_foreach->init($_smarty_tpl, $_smarty_tpl->tpl_vars['BLOCK_FIELDS']->value, 'FIELD_MODEL', false, 'FIELD_NAME');
$_smarty_tpl->tpl_vars['FIELD_MODEL']->do_else = true;
if ($_from !== null) foreach ($_from as $_smarty_tpl->tpl_vars['FIELD_NAME']->value => $_smarty_tpl->tpl_vars['FIELD_MODEL']->value) {
$_smarty_tpl->tpl_vars['FIELD_MODEL']->do_else = false;
if (!$_smarty_tpl->tpl_vars['FIELD_MODEL']->value->isViewableInDetailView()) {
continue 1;
}
if ($_smarty_tpl->tpl_vars['FIELD_NAME']->value == 'cf_1043' || $_smarty_tpl->tpl_vars['FIELD_NAME']->value == 'cf_1049' || $_smarty_tpl->tpl_vars['FIELD_NAME']->value == 'cf_1045' || $_smarty_tpl->tpl_vars['FIELD_NAME']->value == 'cf_1047') {
continue 1;
}
$_smarty_tpl->_assignInScope('fieldDataType', $_smarty_tpl->tpl_vars['FIELD_MODEL']->value->getFieldDataType());
$_smarty_tpl->_assignInScope('FIELD_VALUE', $_smarty_tpl->tpl_vars['FIELD_MODEL']->value->get('fieldvalue'));
$_smarty_tpl->_assignInScope('IS_EDITABLE', $_smarty_tpl->tpl_vars['FIELD_MODEL']->value->isEditable());
if ($_smarty_tpl->tpl_vars['FIELD_MODEL']->value->get('uitype') == '19' || $_smarty_tpl->tpl_vars['FIELD_MODEL']->value->get('uitype') == '20') {?><div class="form-group form-group-full"><label><?php echo vtranslate($_smarty_tpl->tpl_vars['FIELD_MODEL']->value->get('label'),$_smarty_tpl->tpl_vars['MODULE_NAME']->value);?>
</label><?php if ($_smarty_tpl->tpl_vars['IS_EDITABLE']->value) {?><textarea class="unified-field-input" name="<?php echo $_smarty_tpl->tpl_vars['FIELD_NAME']->value;?>
" data-fieldname="<?php echo $_smarty_tpl->tpl_vars['FIELD_NAME']->value;?>
" data-fieldtype="<?php echo $_smarty_tpl->tpl_vars['fieldDataType']->value;?>
" rows="2"><?php echo $_smarty_tpl->tpl_vars['FIELD_VALUE']->value;?>
</textarea><?php } else { ?><div class="field-value field-value-text field-readonly"><?php $_smarty_tpl->_subTemplateRender(vtemplate_path($_smarty_tpl->tpl_vars['FIELD_MODEL']->value->getUITypeModel()->getDetailViewTemplateName(),$_smarty_tpl->tpl_vars['MODULE_NAME']->value), $_smarty_tpl->cache_id, $_smarty_tpl->compile_id, 0, $_smarty_tpl->cache_lifetime, array('FIELD_MODEL'=>$_smarty_tpl->tpl_vars['FIELD_MODEL']->value,'USER_MODEL'=>$_smarty_tpl->tpl_vars['USER_MODEL']->value,'MODULE'=>$_smarty_tpl->tpl_vars['MODULE_NAME']->value,'RECORD'=>$_smarty_tpl->tpl_vars['RECORD']->value), 0, true);
?></div><?php }?></div><?php } elseif ($_smarty_tpl->tpl_vars['fieldDataType']->value == 'picklist') {?><div class="form-group"><label><?php echo vtranslate($_smarty_tpl->tpl_vars['FIELD_MODEL']->value->get('label'),$_smarty_tpl->tpl_vars['MODULE_NAME']->value);?>
</label><?php if ($_smarty_tpl->tpl_vars['IS_EDITABLE']->value) {?><select class="unified-field-input" name="<?php echo $_smarty_tpl->tpl_vars['FIELD_NAME']->value;?>
" data-fieldname="<?php echo $_smarty_tpl->tpl_vars['FIELD_NAME']->value;?>
" data-fieldtype="<?php echo $_smarty_tpl->tpl_vars['fieldDataType']->value;?>
"><option value="">--</option><?php
$_from = $_smarty_tpl->smarty->ext->_foreach->init($_smarty_tpl, $_smarty_tpl->tpl_vars['FIELD_MODEL']->value->getPicklistValues(), 'PICKLIST_VALUE');
$_smarty_tpl->tpl_vars['PICKLIST_VALUE']->do_else = true;
if ($_from !== null) foreach ($_from as $_smarty_tpl->tpl_vars['PICKLIST_VALUE']->value) {
$_smarty_tpl->tpl_vars['PICKLIST_VALUE']->do_else = false;
?><option value="<?php echo $_smarty_tpl->tpl_vars['PICKLIST_VALUE']->value;?>
" <?php if ($_smarty_tpl->tpl_vars['FIELD_VALUE']->value == $_smarty_tpl->tpl_vars['PICKLIST_VALUE']->value) {?>selected<?php }?>><?php echo vtranslate($_smarty_tpl->tpl_vars['PICKLIST_VALUE']->value,$_smarty_tpl->tpl_vars['MODULE_NAME']->value);?>
</option><?php
}
$_smarty_tpl->smarty->ext->_foreach->restore($_smarty_tpl, 1);?></select><?php } else { ?><div class="field-value field-readonly"><?php echo vtranslate($_smarty_tpl->tpl_vars['FIELD_VALUE']->value,$_smarty_tpl->tpl_vars['MODULE_NAME']->value);?>
</div><?php }?></div><?php } elseif ($_smarty_tpl->tpl_vars['fieldDataType']->value == 'boolean') {?><div class="form-group"><label><?php echo vtranslate($_smarty_tpl->tpl_vars['FIELD_MODEL']->value->get('label'),$_smarty_tpl->tpl_vars['MODULE_NAME']->value);?>
</label><?php if ($_smarty_tpl->tpl_vars['IS_EDITABLE']->value) {?><select class="unified-field-input" name="<?php echo $_smarty_tpl->tpl_vars['FIELD_NAME']->value;?>
" data-fieldname="<?php echo $_smarty_tpl->tpl_vars['FIELD_NAME']->value;?>
" data-fieldtype="<?php echo $_smarty_tpl->tpl_vars['fieldDataType']->value;?>
"><option value="1" <?php if ($_smarty_tpl->tpl_vars['FIELD_VALUE']->value == '1' || $_smarty_tpl->tpl_vars['FIELD_VALUE']->value == 'on') {?>selected<?php }?>>Oui</option><option value="0" <?php if ($_smarty_tpl->tpl_vars['FIELD_VALUE']->value == '0' || $_smarty_tpl->tpl_vars['FIELD_VALUE']->value == '' || $_smarty_tpl->tpl_vars['FIELD_VALUE']->value == 'off') {?>selected<?php }?>>Non</option></select><?php } else { ?><div class="field-value field-readonly"><?php if ($_smarty_tpl->tpl_vars['FIELD_VALUE']->value == '1' || $_smarty_tpl->tpl_vars['FIELD_VALUE']->value == 'on') {?>Oui<?php } else { ?>Non<?php }?></div><?php }?></div><?php } elseif ($_smarty_tpl->tpl_vars['fieldDataType']->value == 'date') {?><div class="form-group"><label><?php echo vtranslate($_smarty_tpl->tpl_vars['FIELD_MODEL']->value->get('label'),$_smarty_tpl->tpl_vars['MODULE_NAME']->value);?>
</label><?php if ($_smarty_tpl->tpl_vars['IS_EDITABLE']->value) {
$_smarty_tpl->_assignInScope('DATE_VALUE', '');
if ($_smarty_tpl->tpl_vars['FIELD_VALUE']->value) {
$_smarty_tpl->_assignInScope('DATE_VALUE', smarty_modifier_date_format($_smarty_tpl->tpl_vars['FIELD_VALUE']->value,'%Y-%m-%d'));
}?><input type="date" class="unified-field-input" name="<?php echo $_smarty_tpl->tpl_vars['FIELD_NAME']->value;?>
" data-fieldname="<?php echo $_smarty_tpl->tpl_vars['FIELD_NAME']->value;?>
" data-fieldtype="<?php echo $_smarty_tpl->tpl_vars['fieldDataType']->value;?>
" value="<?php echo $_smarty_tpl->tpl_vars['DATE_VALUE']->value;?>
"><?php } else { ?><div class="field-value field-readonly"><?php echo $_smarty_tpl->tpl_vars['FIELD_MODEL']->value->getDisplayValue($_smarty_tpl->tpl_vars['FIELD_VALUE']->value);?>
</div><?php }?></div><?php } elseif ($_smarty_tpl->tpl_vars['fieldDataType']->value == 'owner') {?><div class="form-group"><label><?php echo vtranslate($_smarty_tpl->tpl_vars['FIELD_MODEL']->value->get('label'),$_smarty_tpl->tpl_vars['MODULE_NAME']->value);?>
</label><?php if ($_smarty_tpl->tpl_vars['IS_EDITABLE']->value) {
$_smarty_tpl->_assignInScope('OWNER_FIELD_INFO', $_smarty_tpl->tpl_vars['FIELD_MODEL']->value->getFieldInfo());
$_smarty_tpl->_assignInScope('ALL_USERS', $_smarty_tpl->tpl_vars['OWNER_FIELD_INFO']->value['picklistvalues'][vtranslate('LBL_USERS')]);
$_smarty_tpl->_assignInScope('ALL_GROUPS', $_smarty_tpl->tpl_vars['OWNER_FIELD_INFO']->value['picklistvalues'][vtranslate('LBL_GROUPS')]);?><select class="unified-field-input" name="<?php echo $_smarty_tpl->tpl_vars['FIELD_NAME']->value;?>
" data-fieldname="<?php echo $_smarty_tpl->tpl_vars['FIELD_NAME']->value;?>
" data-fieldtype="<?php echo $_smarty_tpl->tpl_vars['fieldDataType']->value;?>
"><optgroup label="<?php echo vtranslate('LBL_USERS');?>
"><?php
$_from = $_smarty_tpl->smarty->ext->_foreach->init($_smarty_tpl, $_smarty_tpl->tpl_vars['ALL_USERS']->value, 'OWNER_NAME', false, 'OWNER_ID');
$_smarty_tpl->tpl_vars['OWNER_NAME']->do_else = true;
if ($_from !== null) foreach ($_from as $_smarty_tpl->tpl_vars['OWNER_ID']->value => $_smarty_tpl->tpl_vars['OWNER_NAME']->value) {
$_smarty_tpl->tpl_vars['OWNER_NAME']->do_else = false;
?><option value="<?php echo $_smarty_tpl->tpl_vars['OWNER_ID']->value;?>
" <?php if ($_smarty_tpl->tpl_vars['FIELD_VALUE']->value == $_smarty_tpl->tpl_vars['OWNER_ID']->value) {?>selected<?php }?>><?php echo $_smarty_tpl->tpl_vars['OWNER_NAME']->value;?>
</option><?php
}
$_smarty_tpl->smarty->ext->_foreach->restore($_smarty_tpl, 1);?></optgroup><?php if (smarty_modifier_count($_smarty_tpl->tpl_vars['ALL_GROUPS']->value) > 0) {?><optgroup label="<?php echo vtranslate('LBL_GROUPS');?>
"><?php
$_from = $_smarty_tpl->smarty->ext->_foreach->init($_smarty_tpl, $_smarty_tpl->tpl_vars['ALL_GROUPS']->value, 'OWNER_NAME', false, 'OWNER_ID');
$_smarty_tpl->tpl_vars['OWNER_NAME']->do_else = true;
if ($_from !== null) foreach ($_from as $_smarty_tpl->tpl_vars['OWNER_ID']->value => $_smarty_tpl->tpl_vars['OWNER_NAME']->value) {
$_smarty_tpl->tpl_vars['OWNER_NAME']->do_else = false;
?><option value="<?php echo $_smarty_tpl->tpl_vars['OWNER_ID']->value;?>
" <?php if ($_smarty_tpl->tpl_vars['FIELD_VALUE']->value == $_smarty_tpl->tpl_vars['OWNER_ID']->value) {?>selected<?php }?>><?php echo $_smarty_tpl->tpl_vars['OWNER_NAME']->value;?>
</option><?php
}
$_smarty_tpl->smarty->ext->_foreach->restore($_smarty_tpl, 1);?></optgroup><?php }?></select><?php } else { ?><div class="field-value field-readonly" data-field-type="<?php echo $_smarty_tpl->tpl_vars['fieldDataType']->value;?>
"><?php $_smarty_tpl->_subTemplateRender(vtemplate_path($_smarty_tpl->tpl_vars['FIELD_MODEL']->value->getUITypeModel()->getDetailViewTemplateName(),$_smarty_tpl->tpl_vars['MODULE_NAME']->value), $_smarty_tpl->cache_id, $_smarty_tpl->compile_id, 0, $_smarty_tpl->cache_lifetime, array('FIELD_MODEL'=>$_smarty_tpl->tpl_vars['FIELD_MODEL']->value,'USER_MODEL'=>$_smarty_tpl->tpl_vars['USER_MODEL']->value,'MODULE'=>$_smarty_tpl->tpl_vars['MODULE_NAME']->value,'RECORD'=>$_smarty_tpl->tpl_vars['RECORD']->value), 0, true);
?></div><?php }?></div><?php } elseif ($_smarty_tpl->tpl_vars['fieldDataType']->value == 'reference' || $_smarty_tpl->tpl_vars['fieldDataType']->value == 'multireference') {?><div class="form-group"><label><?php echo vtranslate($_smarty_tpl->tpl_vars['FIELD_MODEL']->value->get('label'),$_smarty_tpl->tpl_vars['MODULE_NAME']->value);?>
</label><div class="field-value field-readonly" data-field-type="<?php echo $_smarty_tpl->tpl_vars['fieldDataType']->value;?>
"><?php $_smarty_tpl->_subTemplateRender(vtemplate_path($_smarty_tpl->tpl_vars['FIELD_MODEL']->value->getUITypeModel()->getDetailViewTemplateName(),$_smarty_tpl->tpl_vars['MODULE_NAME']->value), $_smarty_tpl->cache_id, $_smarty_tpl->compile_id, 0, $_smarty_tpl->cache_lifetime, array('FIELD_MODEL'=>$_smarty_tpl->tpl_vars['FIELD_MODEL']->value,'USER_MODEL'=>$_smarty_tpl->tpl_vars['USER_MODEL']->value,'MODULE'=>$_smarty_tpl->tpl_vars['MODULE_NAME']->value,'RECORD'=>$_smarty_tpl->tpl_vars['RECORD']->value), 0, true);
?></div></div><?php } else { ?><div class="form-group"><label><?php echo vtranslate($_smarty_tpl->tpl_vars['FIELD_MODEL']->value->get('label'),$_smarty_tpl->tpl_vars['MODULE_NAME']->value);?>
</label><?php if ($_smarty_tpl->tpl_vars['IS_EDITABLE']->value) {?><input type="text" class="unified-field-input" name="<?php echo $_smarty_tpl->tpl_vars['FIELD_NAME']->value;?>
" data-fieldname="<?php echo $_smarty_tpl->tpl_vars['FIELD_NAME']->value;?>
" data-fieldtype="<?php echo $_smarty_tpl->tpl_vars['fieldDataType']->value;?>
" value="<?php echo htmlspecialchars((string)decode_html($_smarty_tpl->tpl_vars['FIELD_VALUE']->value), ENT_QUOTES, 'UTF-8', true);?>
"><?php } else { ?><div class="field-value field-readonly" data-field-type="<?php echo $_smarty_tpl->tpl_vars['fieldDataType']->value;?>
"><?php $_smarty_tpl->_subTemplateRender(vtemplate_path($_smarty_tpl->tpl_vars['FIELD_MODEL']->value->getUITypeModel()->getDetailViewTemplateName(),$_smarty_tpl->tpl_vars['MODULE_NAME']->value), $_smarty_tpl->cache_id, $_smarty_tpl->compile_id, 0, $_smarty_tpl->cache_lifetime, array('FIELD_MODEL'=>$_smarty_tpl->tpl_vars['FIELD_MODEL']->value,'USER_MODEL'=>$_smarty_tpl->tpl_vars['USER_MODEL']->value,'MODULE'=>$_smarty_tpl->tpl_vars['MODULE_NAME']->value,'RECORD'=>$_smarty_tpl->tpl_vars['RECORD']->value), 0, true);
?></div><?php }?></div><?php }
}
$_smarty_tpl->smarty->ext->_foreach->restore($_smarty_tpl, 1);?></div></div><?php }
}
$_smarty_tpl->smarty->ext->_foreach->restore($_smarty_tpl, 1);?></div><?php
$_from = $_smarty_tpl->smarty->ext->_foreach->init($_smarty_tpl, $_smarty_tpl->tpl_vars['RECORD_STRUCTURE']->value, 'FIELD_MODEL_LIST', false, 'BLOCK_LABEL_KEY');
$_smarty_tpl->tpl_vars['FIELD_MODEL_LIST']->do_else = true;
if ($_from !== null) foreach ($_from as $_smarty_tpl->tpl_vars['BLOCK_LABEL_KEY']->value => $_smarty_tpl->tpl_vars['FIELD_MODEL_LIST']->value) {
$_smarty_tpl->tpl_vars['FIELD_MODEL_LIST']->do_else = false;
if ($_smarty_tpl->tpl_vars['BLOCK_LABEL_KEY']->value == 'LBL_OPPORTUNITY_INFORMATION' || $_smarty_tpl->tpl_vars['BLOCK_LABEL_KEY']->value == 'LBL_POTENTIALS_INFORMATION') {
if ((isset($_smarty_tpl->tpl_vars['BLOCK_LIST']->value[$_smarty_tpl->tpl_vars['BLOCK_LABEL_KEY']->value]))) {
$_smarty_tpl->_assignInScope('BLOCK', $_smarty_tpl->tpl_vars['BLOCK_LIST']->value[$_smarty_tpl->tpl_vars['BLOCK_LABEL_KEY']->value]);
} else {
$_smarty_tpl->_assignInScope('BLOCK', '');
}
if ($_smarty_tpl->tpl_vars['BLOCK']->value != null && smarty_modifier_count($_smarty_tpl->tpl_vars['FIELD_MODEL_LIST']->value) > 0) {?><div class="form-section section-info" data-block="<?php echo $_smarty_tpl->tpl_vars['BLOCK_LABEL_KEY']->value;?>
"><div class="form-section-title title-purple"><i class="fa fa-briefcase"></i><?php echo vtranslate($_smarty_tpl->tpl_vars['BLOCK_LABEL_KEY']->value,$_smarty_tpl->tpl_vars['MODULE_NAME']->value);?>
</div><div class="form-fields-grid"><div class="form-group"><label>Nom</label><input type="text" class="unified-field-input contact-sync-field" data-fieldname="contact_lastname" data-contact-field="lastname" value="<?php echo htmlspecialchars((string)$_smarty_tpl->tpl_vars['CONTACT_LASTNAME']->value, ENT_QUOTES, 'UTF-8', true);?>
"></div><div class="form-group"><label>Prénom</label><input type="text" class="unified-field-input contact-sync-field" data-fieldname="contact_firstname" data-contact-field="firstname" value="<?php echo htmlspecialchars((string)$_smarty_tpl->tpl_vars['CONTACT_FIRSTNAME']->value, ENT_QUOTES, 'UTF-8', true);?>
"></div><?php if ((isset($_smarty_tpl->tpl_vars['FM_MOBILE']->value))) {?><div class="form-group"><label><?php echo vtranslate($_smarty_tpl->tpl_vars['FM_MOBILE']->value->get('label'),$_smarty_tpl->tpl_vars['MODULE_NAME']->value);?>
</label><input type="text" class="unified-field-input" name="cf_981" data-fieldname="cf_981" data-fieldtype="phone" value="<?php echo htmlspecialchars((string)$_smarty_tpl->tpl_vars['FM_MOBILE']->value->get('fieldvalue'), ENT_QUOTES, 'UTF-8', true);?>
"></div><?php }?><div class="form-group"><label>Mobile sup</label><input type="text" class="unified-field-input contact-sync-field" data-fieldname="contact_otherphone" data-contact-field="otherphone" value="<?php echo htmlspecialchars((string)$_smarty_tpl->tpl_vars['CONTACT_OTHERPHONE']->value, ENT_QUOTES, 'UTF-8', true);?>
"></div><?php if ((isset($_smarty_tpl->tpl_vars['FM_MAIL']->value))) {?><div class="form-group"><label><?php echo vtranslate($_smarty_tpl->tpl_vars['FM_MAIL']->value->get('label'),$_smarty_tpl->tpl_vars['MODULE_NAME']->value);?>
</label><input type="text" class="unified-field-input" name="cf_1123" data-fieldname="cf_1123" data-fieldtype="email" value="<?php echo htmlspecialchars((string)$_smarty_tpl->tpl_vars['FM_MAIL']->value->get('fieldvalue'), ENT_QUOTES, 'UTF-8', true);?>
"></div><?php }
if ((isset($_smarty_tpl->tpl_vars['FM_VOL_FINAL']->value))) {?><div class="form-group"><label><?php echo vtranslate($_smarty_tpl->tpl_vars['FM_VOL_FINAL']->value->get('label'),$_smarty_tpl->tpl_vars['MODULE_NAME']->value);?>
</label><input type="text" class="unified-field-input" name="cf_1259" data-fieldname="cf_1259" data-fieldtype="string" value="<?php echo htmlspecialchars((string)$_smarty_tpl->tpl_vars['FM_VOL_FINAL']->value->get('fieldvalue'), ENT_QUOTES, 'UTF-8', true);?>
"></div><?php }
if ((isset($_smarty_tpl->tpl_vars['FM_STATUT']->value))) {?><div class="form-group"><label><?php echo vtranslate($_smarty_tpl->tpl_vars['FM_STATUT']->value->get('label'),$_smarty_tpl->tpl_vars['MODULE_NAME']->value);?>
</label><select class="unified-field-input" name="cf_971" data-fieldname="cf_971" data-fieldtype="picklist"><option value="">--</option><?php
$_from = $_smarty_tpl->smarty->ext->_foreach->init($_smarty_tpl, $_smarty_tpl->tpl_vars['FM_STATUT']->value->getPicklistValues(), 'PV');
$_smarty_tpl->tpl_vars['PV']->do_else = true;
if ($_from !== null) foreach ($_from as $_smarty_tpl->tpl_vars['PV']->value) {
$_smarty_tpl->tpl_vars['PV']->do_else = false;
?><option value="<?php echo $_smarty_tpl->tpl_vars['PV']->value;?>
" <?php if ($_smarty_tpl->tpl_vars['FM_STATUT']->value->get('fieldvalue') == $_smarty_tpl->tpl_vars['PV']->value) {?>selected<?php }?>><?php echo vtranslate($_smarty_tpl->tpl_vars['PV']->value,$_smarty_tpl->tpl_vars['MODULE_NAME']->value);?>
</option><?php
}
$_smarty_tpl->smarty->ext->_foreach->restore($_smarty_tpl, 1);?></select></div><?php }
if ((isset($_smarty_tpl->tpl_vars['FM_VALIDATION']->value))) {?><div class="form-group"><label><?php echo vtranslate($_smarty_tpl->tpl_vars['FM_VALIDATION']->value->get('label'),$_smarty_tpl->tpl_vars['MODULE_NAME']->value);?>
</label><select class="unified-field-input" name="cf_1164" data-fieldname="cf_1164" data-fieldtype="boolean"><option value="1" <?php if ($_smarty_tpl->tpl_vars['FM_VALIDATION']->value->get('fieldvalue') == '1' || $_smarty_tpl->tpl_vars['FM_VALIDATION']->value->get('fieldvalue') == 'on') {?>selected<?php }?>>Oui</option><option value="0" <?php if ($_smarty_tpl->tpl_vars['FM_VALIDATION']->value->get('fieldvalue') == '0' || $_smarty_tpl->tpl_vars['FM_VALIDATION']->value->get('fieldvalue') == '' || $_smarty_tpl->tpl_vars['FM_VALIDATION']->value->get('fieldvalue') == 'off') {?>selected<?php }?>>Non</option></select></div><?php }
if ((isset($_smarty_tpl->tpl_vars['FM_CREATEDTIME']->value))) {?><div class="form-group"><label><?php echo vtranslate($_smarty_tpl->tpl_vars['FM_CREATEDTIME']->value->get('label'),$_smarty_tpl->tpl_vars['MODULE_NAME']->value);?>
</label><div class="field-value field-readonly"><?php echo $_smarty_tpl->tpl_vars['FM_CREATEDTIME']->value->get('fieldvalue');?>
</div></div><?php }
if ((isset($_smarty_tpl->tpl_vars['FM_POTENTIAL_NO']->value))) {?><div class="form-group"><label>Affaire N°</label><div class="field-value field-readonly"><?php echo $_smarty_tpl->tpl_vars['FM_POTENTIAL_NO']->value->get('fieldvalue');?>
</div></div><?php }
if ((isset($_smarty_tpl->tpl_vars['FM_POTENTIALNAME']->value))) {?><div class="form-group"><label>Nom de l'affaire</label><input type="text" class="unified-field-input" name="potentialname" data-fieldname="potentialname" data-fieldtype="string" value="<?php echo htmlspecialchars((string)$_smarty_tpl->tpl_vars['FM_POTENTIALNAME']->value->get('fieldvalue'), ENT_QUOTES, 'UTF-8', true);?>
"></div><?php }
if ((isset($_smarty_tpl->tpl_vars['FM_ASSIGNED']->value))) {?><div class="form-group"><label>Assigné à</label><?php $_smarty_tpl->_assignInScope('ASSIGNED_INFO', $_smarty_tpl->tpl_vars['FM_ASSIGNED']->value->getFieldInfo());
$_smarty_tpl->_assignInScope('ASSIGNED_USERS', $_smarty_tpl->tpl_vars['ASSIGNED_INFO']->value['picklistvalues'][vtranslate('LBL_USERS')]);
$_smarty_tpl->_assignInScope('ASSIGNED_GROUPS', $_smarty_tpl->tpl_vars['ASSIGNED_INFO']->value['picklistvalues'][vtranslate('LBL_GROUPS')]);?><select class="unified-field-input" name="assigned_user_id" data-fieldname="assigned_user_id" data-fieldtype="owner"><optgroup label="<?php echo vtranslate('LBL_USERS');?>
"><?php
$_from = $_smarty_tpl->smarty->ext->_foreach->init($_smarty_tpl, $_smarty_tpl->tpl_vars['ASSIGNED_USERS']->value, 'ONAME', false, 'OID');
$_smarty_tpl->tpl_vars['ONAME']->do_else = true;
if ($_from !== null) foreach ($_from as $_smarty_tpl->tpl_vars['OID']->value => $_smarty_tpl->tpl_vars['ONAME']->value) {
$_smarty_tpl->tpl_vars['ONAME']->do_else = false;
?><option value="<?php echo $_smarty_tpl->tpl_vars['OID']->value;?>
" <?php if ($_smarty_tpl->tpl_vars['FM_ASSIGNED']->value->get('fieldvalue') == $_smarty_tpl->tpl_vars['OID']->value) {?>selected<?php }?>><?php echo $_smarty_tpl->tpl_vars['ONAME']->value;?>
</option><?php
}
$_smarty_tpl->smarty->ext->_foreach->restore($_smarty_tpl, 1);?></optgroup><?php if (smarty_modifier_count($_smarty_tpl->tpl_vars['ASSIGNED_GROUPS']->value) > 0) {?><optgroup label="<?php echo vtranslate('LBL_GROUPS');?>
"><?php
$_from = $_smarty_tpl->smarty->ext->_foreach->init($_smarty_tpl, $_smarty_tpl->tpl_vars['ASSIGNED_GROUPS']->value, 'ONAME', false, 'OID');
$_smarty_tpl->tpl_vars['ONAME']->do_else = true;
if ($_from !== null) foreach ($_from as $_smarty_tpl->tpl_vars['OID']->value => $_smarty_tpl->tpl_vars['ONAME']->value) {
$_smarty_tpl->tpl_vars['ONAME']->do_else = false;
?><option value="<?php echo $_smarty_tpl->tpl_vars['OID']->value;?>
" <?php if ($_smarty_tpl->tpl_vars['FM_ASSIGNED']->value->get('fieldvalue') == $_smarty_tpl->tpl_vars['OID']->value) {?>selected<?php }?>><?php echo $_smarty_tpl->tpl_vars['ONAME']->value;?>
</option><?php
}
$_smarty_tpl->smarty->ext->_foreach->restore($_smarty_tpl, 1);?></optgroup><?php }?></select></div><?php }
$_from = $_smarty_tpl->smarty->ext->_foreach->init($_smarty_tpl, $_smarty_tpl->tpl_vars['FIELD_MODEL_LIST']->value, 'FIELD_MODEL', false, 'FIELD_NAME');
$_smarty_tpl->tpl_vars['FIELD_MODEL']->do_else = true;
if ($_from !== null) foreach ($_from as $_smarty_tpl->tpl_vars['FIELD_NAME']->value => $_smarty_tpl->tpl_vars['FIELD_MODEL']->value) {
$_smarty_tpl->tpl_vars['FIELD_MODEL']->do_else = false;
if (!$_smarty_tpl->tpl_vars['FIELD_MODEL']->value->isViewableInDetailView()) {
continue 1;
}
if ($_smarty_tpl->tpl_vars['FIELD_NAME']->value == 'cf_1043' || $_smarty_tpl->tpl_vars['FIELD_NAME']->value == 'cf_1049' || $_smarty_tpl->tpl_vars['FIELD_NAME']->value == 'cf_1045' || $_smarty_tpl->tpl_vars['FIELD_NAME']->value == 'cf_1047' || $_smarty_tpl->tpl_vars['FIELD_NAME']->value == 'cf_939' || $_smarty_tpl->tpl_vars['FIELD_NAME']->value == 'cf_961' || $_smarty_tpl->tpl_vars['FIELD_NAME']->value == 'cf_981' || $_smarty_tpl->tpl_vars['FIELD_NAME']->value == 'cf_1123' || $_smarty_tpl->tpl_vars['FIELD_NAME']->value == 'cf_1259' || $_smarty_tpl->tpl_vars['FIELD_NAME']->value == 'cf_971' || $_smarty_tpl->tpl_vars['FIELD_NAME']->value == 'cf_1164' || $_smarty_tpl->tpl_vars['FIELD_NAME']->value == 'createdtime' || $_smarty_tpl->tpl_vars['FIELD_NAME']->value == 'potential_no' || $_smarty_tpl->tpl_vars['FIELD_NAME']->value == 'potentialname' || $_smarty_tpl->tpl_vars['FIELD_NAME']->value == 'assigned_user_id') {
continue 1;
}
$_smarty_tpl->_assignInScope('fieldDataType', $_smarty_tpl->tpl_vars['FIELD_MODEL']->value->getFieldDataType());
$_smarty_tpl->_assignInScope('FIELD_VALUE', $_smarty_tpl->tpl_vars['FIELD_MODEL']->value->get('fieldvalue'));
$_smarty_tpl->_assignInScope('IS_EDITABLE', $_smarty_tpl->tpl_vars['FIELD_MODEL']->value->isEditable());
if ($_smarty_tpl->tpl_vars['FIELD_MODEL']->value->get('uitype') == '19' || $_smarty_tpl->tpl_vars['FIELD_MODEL']->value->get('uitype') == '20' || $_smarty_tpl->tpl_vars['FIELD_NAME']->value == 'description') {?><div class="form-group form-group-full"><label><?php echo vtranslate($_smarty_tpl->tpl_vars['FIELD_MODEL']->value->get('label'),$_smarty_tpl->tpl_vars['MODULE_NAME']->value);?>
</label><?php if ($_smarty_tpl->tpl_vars['IS_EDITABLE']->value) {?><textarea class="unified-field-input" name="<?php echo $_smarty_tpl->tpl_vars['FIELD_NAME']->value;?>
" data-fieldname="<?php echo $_smarty_tpl->tpl_vars['FIELD_NAME']->value;?>
" data-fieldtype="<?php echo $_smarty_tpl->tpl_vars['fieldDataType']->value;?>
" rows="3"><?php echo $_smarty_tpl->tpl_vars['FIELD_VALUE']->value;?>
</textarea><?php } else { ?><div class="field-value field-value-text field-readonly"><?php $_smarty_tpl->_subTemplateRender(vtemplate_path($_smarty_tpl->tpl_vars['FIELD_MODEL']->value->getUITypeModel()->getDetailViewTemplateName(),$_smarty_tpl->tpl_vars['MODULE_NAME']->value), $_smarty_tpl->cache_id, $_smarty_tpl->compile_id, 0, $_smarty_tpl->cache_lifetime, array('FIELD_MODEL'=>$_smarty_tpl->tpl_vars['FIELD_MODEL']->value,'USER_MODEL'=>$_smarty_tpl->tpl_vars['USER_MODEL']->value,'MODULE'=>$_smarty_tpl->tpl_vars['MODULE_NAME']->value,'RECORD'=>$_smarty_tpl->tpl_vars['RECORD']->value), 0, true);
?></div><?php }?></div><?php } elseif ($_smarty_tpl->tpl_vars['fieldDataType']->value == 'picklist') {?><div class="form-group"><label><?php echo vtranslate($_smarty_tpl->tpl_vars['FIELD_MODEL']->value->get('label'),$_smarty_tpl->tpl_vars['MODULE_NAME']->value);?>
</label><?php if ($_smarty_tpl->tpl_vars['IS_EDITABLE']->value) {?><select class="unified-field-input" name="<?php echo $_smarty_tpl->tpl_vars['FIELD_NAME']->value;?>
" data-fieldname="<?php echo $_smarty_tpl->tpl_vars['FIELD_NAME']->value;?>
" data-fieldtype="<?php echo $_smarty_tpl->tpl_vars['fieldDataType']->value;?>
"><option value="">--</option><?php
$_from = $_smarty_tpl->smarty->ext->_foreach->init($_smarty_tpl, $_smarty_tpl->tpl_vars['FIELD_MODEL']->value->getPicklistValues(), 'PICKLIST_VALUE');
$_smarty_tpl->tpl_vars['PICKLIST_VALUE']->do_else = true;
if ($_from !== null) foreach ($_from as $_smarty_tpl->tpl_vars['PICKLIST_VALUE']->value) {
$_smarty_tpl->tpl_vars['PICKLIST_VALUE']->do_else = false;
?><option value="<?php echo $_smarty_tpl->tpl_vars['PICKLIST_VALUE']->value;?>
" <?php if ($_smarty_tpl->tpl_vars['FIELD_VALUE']->value == $_smarty_tpl->tpl_vars['PICKLIST_VALUE']->value) {?>selected<?php }?>><?php echo vtranslate($_smarty_tpl->tpl_vars['PICKLIST_VALUE']->value,$_smarty_tpl->tpl_vars['MODULE_NAME']->value);?>
</option><?php
}
$_smarty_tpl->smarty->ext->_foreach->restore($_smarty_tpl, 1);?></select><?php } else { ?><div class="field-value field-readonly"><?php echo vtranslate($_smarty_tpl->tpl_vars['FIELD_VALUE']->value,$_smarty_tpl->tpl_vars['MODULE_NAME']->value);?>
</div><?php }?></div><?php } elseif ($_smarty_tpl->tpl_vars['fieldDataType']->value == 'boolean') {?><div class="form-group"><label><?php echo vtranslate($_smarty_tpl->tpl_vars['FIELD_MODEL']->value->get('label'),$_smarty_tpl->tpl_vars['MODULE_NAME']->value);?>
</label><?php if ($_smarty_tpl->tpl_vars['IS_EDITABLE']->value) {?><select class="unified-field-input" name="<?php echo $_smarty_tpl->tpl_vars['FIELD_NAME']->value;?>
" data-fieldname="<?php echo $_smarty_tpl->tpl_vars['FIELD_NAME']->value;?>
" data-fieldtype="<?php echo $_smarty_tpl->tpl_vars['fieldDataType']->value;?>
"><option value="1" <?php if ($_smarty_tpl->tpl_vars['FIELD_VALUE']->value == '1' || $_smarty_tpl->tpl_vars['FIELD_VALUE']->value == 'on') {?>selected<?php }?>>Oui</option><option value="0" <?php if ($_smarty_tpl->tpl_vars['FIELD_VALUE']->value == '0' || $_smarty_tpl->tpl_vars['FIELD_VALUE']->value == '' || $_smarty_tpl->tpl_vars['FIELD_VALUE']->value == 'off') {?>selected<?php }?>>Non</option></select><?php } else { ?><div class="field-value field-readonly"><?php if ($_smarty_tpl->tpl_vars['FIELD_VALUE']->value == '1' || $_smarty_tpl->tpl_vars['FIELD_VALUE']->value == 'on') {?>Oui<?php } else { ?>Non<?php }?></div><?php }?></div><?php } elseif ($_smarty_tpl->tpl_vars['fieldDataType']->value == 'date') {?><div class="form-group"><label><?php echo vtranslate($_smarty_tpl->tpl_vars['FIELD_MODEL']->value->get('label'),$_smarty_tpl->tpl_vars['MODULE_NAME']->value);?>
</label><?php if ($_smarty_tpl->tpl_vars['IS_EDITABLE']->value) {
$_smarty_tpl->_assignInScope('DATE_VALUE', '');
if ($_smarty_tpl->tpl_vars['FIELD_VALUE']->value) {
$_smarty_tpl->_assignInScope('DATE_VALUE', smarty_modifier_date_format($_smarty_tpl->tpl_vars['FIELD_VALUE']->value,'%Y-%m-%d'));
}?><input type="date" class="unified-field-input" name="<?php echo $_smarty_tpl->tpl_vars['FIELD_NAME']->value;?>
" data-fieldname="<?php echo $_smarty_tpl->tpl_vars['FIELD_NAME']->value;?>
" data-fieldtype="<?php echo $_smarty_tpl->tpl_vars['fieldDataType']->value;?>
" value="<?php echo $_smarty_tpl->tpl_vars['DATE_VALUE']->value;?>
"><?php } else { ?><div class="field-value field-readonly"><?php echo $_smarty_tpl->tpl_vars['FIELD_MODEL']->value->getDisplayValue($_smarty_tpl->tpl_vars['FIELD_VALUE']->value);?>
</div><?php }?></div><?php } elseif ($_smarty_tpl->tpl_vars['fieldDataType']->value == 'currency' || $_smarty_tpl->tpl_vars['fieldDataType']->value == 'double' || $_smarty_tpl->tpl_vars['fieldDataType']->value == 'integer') {?><div class="form-group"><label><?php echo vtranslate($_smarty_tpl->tpl_vars['FIELD_MODEL']->value->get('label'),$_smarty_tpl->tpl_vars['MODULE_NAME']->value);?>
</label><?php if ($_smarty_tpl->tpl_vars['IS_EDITABLE']->value) {?><input type="number" class="unified-field-input" name="<?php echo $_smarty_tpl->tpl_vars['FIELD_NAME']->value;?>
" data-fieldname="<?php echo $_smarty_tpl->tpl_vars['FIELD_NAME']->value;?>
" data-fieldtype="<?php echo $_smarty_tpl->tpl_vars['fieldDataType']->value;?>
" value="<?php echo $_smarty_tpl->tpl_vars['FIELD_VALUE']->value;?>
" step="0.01"><?php } else { ?><div class="field-value field-readonly"><?php echo $_smarty_tpl->tpl_vars['FIELD_MODEL']->value->getDisplayValue($_smarty_tpl->tpl_vars['FIELD_VALUE']->value);?>
</div><?php }?></div><?php } elseif ($_smarty_tpl->tpl_vars['fieldDataType']->value == 'owner') {?><div class="form-group"><label><?php echo vtranslate($_smarty_tpl->tpl_vars['FIELD_MODEL']->value->get('label'),$_smarty_tpl->tpl_vars['MODULE_NAME']->value);?>
</label><?php if ($_smarty_tpl->tpl_vars['IS_EDITABLE']->value) {
$_smarty_tpl->_assignInScope('OWNER_FIELD_INFO', $_smarty_tpl->tpl_vars['FIELD_MODEL']->value->getFieldInfo());
$_smarty_tpl->_assignInScope('ALL_USERS', $_smarty_tpl->tpl_vars['OWNER_FIELD_INFO']->value['picklistvalues'][vtranslate('LBL_USERS')]);
$_smarty_tpl->_assignInScope('ALL_GROUPS', $_smarty_tpl->tpl_vars['OWNER_FIELD_INFO']->value['picklistvalues'][vtranslate('LBL_GROUPS')]);?><select class="unified-field-input" name="<?php echo $_smarty_tpl->tpl_vars['FIELD_NAME']->value;?>
" data-fieldname="<?php echo $_smarty_tpl->tpl_vars['FIELD_NAME']->value;?>
" data-fieldtype="<?php echo $_smarty_tpl->tpl_vars['fieldDataType']->value;?>
"><optgroup label="<?php echo vtranslate('LBL_USERS');?>
"><?php
$_from = $_smarty_tpl->smarty->ext->_foreach->init($_smarty_tpl, $_smarty_tpl->tpl_vars['ALL_USERS']->value, 'OWNER_NAME', false, 'OWNER_ID');
$_smarty_tpl->tpl_vars['OWNER_NAME']->do_else = true;
if ($_from !== null) foreach ($_from as $_smarty_tpl->tpl_vars['OWNER_ID']->value => $_smarty_tpl->tpl_vars['OWNER_NAME']->value) {
$_smarty_tpl->tpl_vars['OWNER_NAME']->do_else = false;
?><option value="<?php echo $_smarty_tpl->tpl_vars['OWNER_ID']->value;?>
" <?php if ($_smarty_tpl->tpl_vars['FIELD_VALUE']->value == $_smarty_tpl->tpl_vars['OWNER_ID']->value) {?>selected<?php }?>><?php echo $_smarty_tpl->tpl_vars['OWNER_NAME']->value;?>
</option><?php
}
$_smarty_tpl->smarty->ext->_foreach->restore($_smarty_tpl, 1);?></optgroup><?php if (smarty_modifier_count($_smarty_tpl->tpl_vars['ALL_GROUPS']->value) > 0) {?><optgroup label="<?php echo vtranslate('LBL_GROUPS');?>
"><?php
$_from = $_smarty_tpl->smarty->ext->_foreach->init($_smarty_tpl, $_smarty_tpl->tpl_vars['ALL_GROUPS']->value, 'OWNER_NAME', false, 'OWNER_ID');
$_smarty_tpl->tpl_vars['OWNER_NAME']->do_else = true;
if ($_from !== null) foreach ($_from as $_smarty_tpl->tpl_vars['OWNER_ID']->value => $_smarty_tpl->tpl_vars['OWNER_NAME']->value) {
$_smarty_tpl->tpl_vars['OWNER_NAME']->do_else = false;
?><option value="<?php echo $_smarty_tpl->tpl_vars['OWNER_ID']->value;?>
" <?php if ($_smarty_tpl->tpl_vars['FIELD_VALUE']->value == $_smarty_tpl->tpl_vars['OWNER_ID']->value) {?>selected<?php }?>><?php echo $_smarty_tpl->tpl_vars['OWNER_NAME']->value;?>
</option><?php
}
$_smarty_tpl->smarty->ext->_foreach->restore($_smarty_tpl, 1);?></optgroup><?php }?></select><?php } else { ?><div class="field-value field-readonly" data-field-type="<?php echo $_smarty_tpl->tpl_vars['fieldDataType']->value;?>
"><?php $_smarty_tpl->_subTemplateRender(vtemplate_path($_smarty_tpl->tpl_vars['FIELD_MODEL']->value->getUITypeModel()->getDetailViewTemplateName(),$_smarty_tpl->tpl_vars['MODULE_NAME']->value), $_smarty_tpl->cache_id, $_smarty_tpl->compile_id, 0, $_smarty_tpl->cache_lifetime, array('FIELD_MODEL'=>$_smarty_tpl->tpl_vars['FIELD_MODEL']->value,'USER_MODEL'=>$_smarty_tpl->tpl_vars['USER_MODEL']->value,'MODULE'=>$_smarty_tpl->tpl_vars['MODULE_NAME']->value,'RECORD'=>$_smarty_tpl->tpl_vars['RECORD']->value), 0, true);
?></div><?php }?></div><?php } elseif ($_smarty_tpl->tpl_vars['fieldDataType']->value == 'reference' || $_smarty_tpl->tpl_vars['fieldDataType']->value == 'multireference') {?><div class="form-group"><label><?php echo vtranslate($_smarty_tpl->tpl_vars['FIELD_MODEL']->value->get('label'),$_smarty_tpl->tpl_vars['MODULE_NAME']->value);?>
</label><div class="field-value field-readonly" data-field-type="<?php echo $_smarty_tpl->tpl_vars['fieldDataType']->value;?>
"><?php $_smarty_tpl->_subTemplateRender(vtemplate_path($_smarty_tpl->tpl_vars['FIELD_MODEL']->value->getUITypeModel()->getDetailViewTemplateName(),$_smarty_tpl->tpl_vars['MODULE_NAME']->value), $_smarty_tpl->cache_id, $_smarty_tpl->compile_id, 0, $_smarty_tpl->cache_lifetime, array('FIELD_MODEL'=>$_smarty_tpl->tpl_vars['FIELD_MODEL']->value,'USER_MODEL'=>$_smarty_tpl->tpl_vars['USER_MODEL']->value,'MODULE'=>$_smarty_tpl->tpl_vars['MODULE_NAME']->value,'RECORD'=>$_smarty_tpl->tpl_vars['RECORD']->value), 0, true);
?></div></div><?php } else { ?><div class="form-group"><label><?php echo vtranslate($_smarty_tpl->tpl_vars['FIELD_MODEL']->value->get('label'),$_smarty_tpl->tpl_vars['MODULE_NAME']->value);?>
</label><?php if ($_smarty_tpl->tpl_vars['IS_EDITABLE']->value) {?><input type="text" class="unified-field-input" name="<?php echo $_smarty_tpl->tpl_vars['FIELD_NAME']->value;?>
" data-fieldname="<?php echo $_smarty_tpl->tpl_vars['FIELD_NAME']->value;?>
" data-fieldtype="<?php echo $_smarty_tpl->tpl_vars['fieldDataType']->value;?>
" value="<?php echo htmlspecialchars((string)decode_html($_smarty_tpl->tpl_vars['FIELD_VALUE']->value), ENT_QUOTES, 'UTF-8', true);?>
"><?php } else { ?><div class="field-value field-readonly" data-field-type="<?php echo $_smarty_tpl->tpl_vars['fieldDataType']->value;?>
"><?php $_smarty_tpl->_subTemplateRender(vtemplate_path($_smarty_tpl->tpl_vars['FIELD_MODEL']->value->getUITypeModel()->getDetailViewTemplateName(),$_smarty_tpl->tpl_vars['MODULE_NAME']->value), $_smarty_tpl->cache_id, $_smarty_tpl->compile_id, 0, $_smarty_tpl->cache_lifetime, array('FIELD_MODEL'=>$_smarty_tpl->tpl_vars['FIELD_MODEL']->value,'USER_MODEL'=>$_smarty_tpl->tpl_vars['USER_MODEL']->value,'MODULE'=>$_smarty_tpl->tpl_vars['MODULE_NAME']->value,'RECORD'=>$_smarty_tpl->tpl_vars['RECORD']->value), 0, true);
?></div><?php }?></div><?php }
}
$_smarty_tpl->smarty->ext->_foreach->restore($_smarty_tpl, 1);?></div></div><?php }
}
}
$_smarty_tpl->smarty->ext->_foreach->restore($_smarty_tpl, 1);
$_from = $_smarty_tpl->smarty->ext->_foreach->init($_smarty_tpl, $_smarty_tpl->tpl_vars['RECORD_STRUCTURE']->value, 'INSTR_FIELD_LIST', false, 'INSTR_BLOCK_KEY');
$_smarty_tpl->tpl_vars['INSTR_FIELD_LIST']->do_else = true;
if ($_from !== null) foreach ($_from as $_smarty_tpl->tpl_vars['INSTR_BLOCK_KEY']->value => $_smarty_tpl->tpl_vars['INSTR_FIELD_LIST']->value) {
$_smarty_tpl->tpl_vars['INSTR_FIELD_LIST']->do_else = false;
if ($_smarty_tpl->tpl_vars['INSTR_BLOCK_KEY']->value == 'INSTRUCTIONS' || strpos(strtolower($_smarty_tpl->tpl_vars['INSTR_BLOCK_KEY']->value),'instruction') !== false) {
if ((isset($_smarty_tpl->tpl_vars['BLOCK_LIST']->value[$_smarty_tpl->tpl_vars['INSTR_BLOCK_KEY']->value]))) {
$_smarty_tpl->_assignInScope('INSTR_BLOCK', $_smarty_tpl->tpl_vars['BLOCK_LIST']->value[$_smarty_tpl->tpl_vars['INSTR_BLOCK_KEY']->value]);
} else {
$_smarty_tpl->_assignInScope('INSTR_BLOCK', '');
}
if ($_smarty_tpl->tpl_vars['INSTR_BLOCK']->value != null && smarty_modifier_count($_smarty_tpl->tpl_vars['INSTR_FIELD_LIST']->value) > 0) {?><div class="card accordion-card section-instructions" style="padding: 0; overflow: hidden;" data-block="<?php echo $_smarty_tpl->tpl_vars['INSTR_BLOCK_KEY']->value;?>
"><div class="card-header header-orange accordion-header" style="margin: 0; border-radius: 12px;" onclick="UnifiedDetails.toggleAccordion(this)"><i class="fa fa-list-ul"></i> <?php echo vtranslate($_smarty_tpl->tpl_vars['INSTR_BLOCK_KEY']->value,$_smarty_tpl->tpl_vars['MODULE_NAME']->value);?>
<i class="fa fa-chevron-down accordion-arrow"></i></div><div class="accordion-content" style="display: none;"><div class="form-fields-grid form-fields-instructions" style="padding: 15px;"><?php
$_from = $_smarty_tpl->smarty->ext->_foreach->init($_smarty_tpl, $_smarty_tpl->tpl_vars['INSTR_FIELD_LIST']->value, 'FIELD_MODEL', false, 'FIELD_NAME');
$_smarty_tpl->tpl_vars['FIELD_MODEL']->do_else = true;
if ($_from !== null) foreach ($_from as $_smarty_tpl->tpl_vars['FIELD_NAME']->value => $_smarty_tpl->tpl_vars['FIELD_MODEL']->value) {
$_smarty_tpl->tpl_vars['FIELD_MODEL']->do_else = false;
if (!$_smarty_tpl->tpl_vars['FIELD_MODEL']->value->isViewableInDetailView()) {
continue 1;
}
$_smarty_tpl->_assignInScope('fieldDataType', $_smarty_tpl->tpl_vars['FIELD_MODEL']->value->getFieldDataType());
$_smarty_tpl->_assignInScope('FIELD_VALUE', $_smarty_tpl->tpl_vars['FIELD_MODEL']->value->get('fieldvalue'));
$_smarty_tpl->_assignInScope('IS_EDITABLE', $_smarty_tpl->tpl_vars['FIELD_MODEL']->value->isEditable());
$_smarty_tpl->_assignInScope('FIELD_LABEL', call_user_func_array($_smarty_tpl->registered_plugins[ 'modifier' ][ 'strtolower' ][ 0 ], array( vtranslate($_smarty_tpl->tpl_vars['FIELD_MODEL']->value->get('label'),$_smarty_tpl->tpl_vars['MODULE_NAME']->value) )));?><div class="form-group"><label><?php echo vtranslate($_smarty_tpl->tpl_vars['FIELD_MODEL']->value->get('label'),$_smarty_tpl->tpl_vars['MODULE_NAME']->value);?>
</label><?php if ($_smarty_tpl->tpl_vars['IS_EDITABLE']->value) {?><textarea class="unified-field-input instruction-textarea" name="<?php echo $_smarty_tpl->tpl_vars['FIELD_NAME']->value;?>
" data-fieldname="<?php echo $_smarty_tpl->tpl_vars['FIELD_NAME']->value;?>
" data-fieldtype="<?php echo $_smarty_tpl->tpl_vars['fieldDataType']->value;?>
" rows="4"><?php echo $_smarty_tpl->tpl_vars['FIELD_VALUE']->value;?>
</textarea><?php } else { ?><div class="field-value field-value-text field-readonly"><?php if ($_smarty_tpl->tpl_vars['FIELD_VALUE']->value) {
echo $_smarty_tpl->tpl_vars['FIELD_VALUE']->value;
} else { ?>--<?php }?></div><?php }?></div><?php
}
$_smarty_tpl->smarty->ext->_foreach->restore($_smarty_tpl, 1);?></div></div></div><?php }
}
}
$_smarty_tpl->smarty->ext->_foreach->restore($_smarty_tpl, 1);
$_smarty_tpl->_assignInScope('SUPPL_CHARGEMENT_FIELDS', null);
$_smarty_tpl->_assignInScope('SUPPL_CHARGEMENT_KEY', '');
$_smarty_tpl->_assignInScope('SUPPL_LIVRAISON_FIELDS', null);
$_smarty_tpl->_assignInScope('SUPPL_LIVRAISON_KEY', '');
$_from = $_smarty_tpl->smarty->ext->_foreach->init($_smarty_tpl, $_smarty_tpl->tpl_vars['RECORD_STRUCTURE']->value, 'SUPPL_BLOCK_FIELDS', false, 'SUPPL_BLOCK_KEY');
$_smarty_tpl->tpl_vars['SUPPL_BLOCK_FIELDS']->do_else = true;
if ($_from !== null) foreach ($_from as $_smarty_tpl->tpl_vars['SUPPL_BLOCK_KEY']->value => $_smarty_tpl->tpl_vars['SUPPL_BLOCK_FIELDS']->value) {
$_smarty_tpl->tpl_vars['SUPPL_BLOCK_FIELDS']->do_else = false;
if (strpos(strtolower($_smarty_tpl->tpl_vars['SUPPL_BLOCK_KEY']->value),'suppl') !== false) {
if (strpos(strtolower($_smarty_tpl->tpl_vars['SUPPL_BLOCK_KEY']->value),'chargement') !== false) {
$_smarty_tpl->_assignInScope('SUPPL_CHARGEMENT_FIELDS', $_smarty_tpl->tpl_vars['SUPPL_BLOCK_FIELDS']->value);
$_smarty_tpl->_assignInScope('SUPPL_CHARGEMENT_KEY', $_smarty_tpl->tpl_vars['SUPPL_BLOCK_KEY']->value);
} else {
$_smarty_tpl->_assignInScope('SUPPL_LIVRAISON_FIELDS', $_smarty_tpl->tpl_vars['SUPPL_BLOCK_FIELDS']->value);
$_smarty_tpl->_assignInScope('SUPPL_LIVRAISON_KEY', $_smarty_tpl->tpl_vars['SUPPL_BLOCK_KEY']->value);
}
}
}
$_smarty_tpl->smarty->ext->_foreach->restore($_smarty_tpl, 1);
if ($_smarty_tpl->tpl_vars['SUPPL_CHARGEMENT_FIELDS']->value != null || $_smarty_tpl->tpl_vars['SUPPL_LIVRAISON_FIELDS']->value != null) {?><div class="card accordion-card suppl-address-accordion" style="padding: 0; overflow: hidden;"><div class="card-header header-gray accordion-header" style="margin: 0; border-radius: 12px;" onclick="UnifiedDetails.toggleAccordion(this)"><i class="fa fa-plus-circle"></i> ADRESSE SUPPLÉMENTAIRE<i class="fa fa-chevron-down accordion-arrow"></i></div><div class="accordion-content" style="display: none;"><div class="suppl-address-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; padding: 15px;"><?php if ($_smarty_tpl->tpl_vars['SUPPL_CHARGEMENT_FIELDS']->value != null) {?><div class="suppl-block suppl-chargement" data-block="<?php echo $_smarty_tpl->tpl_vars['SUPPL_CHARGEMENT_KEY']->value;?>
"><div class="suppl-block-header header-green-light" style="padding: 10px 15px; border-radius: 8px 8px 0 0; color: white; font-weight: 600;"><i class="fa fa-upload"></i> Chargement</div><div class="form-fields-grid form-fields-address" style="padding: 15px; background: #f8f9fa; border-radius: 0 0 8px 8px;"><?php
$_from = $_smarty_tpl->smarty->ext->_foreach->init($_smarty_tpl, $_smarty_tpl->tpl_vars['SUPPL_CHARGEMENT_FIELDS']->value, 'FIELD_MODEL', false, 'FIELD_NAME');
$_smarty_tpl->tpl_vars['FIELD_MODEL']->do_else = true;
if ($_from !== null) foreach ($_from as $_smarty_tpl->tpl_vars['FIELD_NAME']->value => $_smarty_tpl->tpl_vars['FIELD_MODEL']->value) {
$_smarty_tpl->tpl_vars['FIELD_MODEL']->do_else = false;
if (!$_smarty_tpl->tpl_vars['FIELD_MODEL']->value->isViewableInDetailView()) {
continue 1;
}
if ($_smarty_tpl->tpl_vars['FIELD_NAME']->value == 'cf_1043' || $_smarty_tpl->tpl_vars['FIELD_NAME']->value == 'cf_1049' || $_smarty_tpl->tpl_vars['FIELD_NAME']->value == 'cf_1045' || $_smarty_tpl->tpl_vars['FIELD_NAME']->value == 'cf_1047') {
continue 1;
}
$_smarty_tpl->_assignInScope('fieldDataType', $_smarty_tpl->tpl_vars['FIELD_MODEL']->value->getFieldDataType());
$_smarty_tpl->_assignInScope('FIELD_VALUE', $_smarty_tpl->tpl_vars['FIELD_MODEL']->value->get('fieldvalue'));
$_smarty_tpl->_assignInScope('IS_EDITABLE', $_smarty_tpl->tpl_vars['FIELD_MODEL']->value->isEditable());
if ($_smarty_tpl->tpl_vars['FIELD_MODEL']->value->get('uitype') == '19' || $_smarty_tpl->tpl_vars['FIELD_MODEL']->value->get('uitype') == '20') {?><div class="form-group form-group-full"><label><?php echo vtranslate($_smarty_tpl->tpl_vars['FIELD_MODEL']->value->get('label'),$_smarty_tpl->tpl_vars['MODULE_NAME']->value);?>
</label><?php if ($_smarty_tpl->tpl_vars['IS_EDITABLE']->value) {?><textarea class="unified-field-input" name="<?php echo $_smarty_tpl->tpl_vars['FIELD_NAME']->value;?>
" data-fieldname="<?php echo $_smarty_tpl->tpl_vars['FIELD_NAME']->value;?>
" data-fieldtype="<?php echo $_smarty_tpl->tpl_vars['fieldDataType']->value;?>
" rows="2"><?php echo $_smarty_tpl->tpl_vars['FIELD_VALUE']->value;?>
</textarea><?php } else { ?><div class="field-value field-value-text field-readonly"><?php if ($_smarty_tpl->tpl_vars['FIELD_VALUE']->value) {
echo $_smarty_tpl->tpl_vars['FIELD_VALUE']->value;
} else { ?>--<?php }?></div><?php }?></div><?php } elseif ($_smarty_tpl->tpl_vars['fieldDataType']->value == 'picklist') {?><div class="form-group"><label><?php echo vtranslate($_smarty_tpl->tpl_vars['FIELD_MODEL']->value->get('label'),$_smarty_tpl->tpl_vars['MODULE_NAME']->value);?>
</label><?php if ($_smarty_tpl->tpl_vars['IS_EDITABLE']->value) {?><select class="unified-field-input" name="<?php echo $_smarty_tpl->tpl_vars['FIELD_NAME']->value;?>
" data-fieldname="<?php echo $_smarty_tpl->tpl_vars['FIELD_NAME']->value;?>
" data-fieldtype="<?php echo $_smarty_tpl->tpl_vars['fieldDataType']->value;?>
"><option value="">--</option><?php
$_from = $_smarty_tpl->smarty->ext->_foreach->init($_smarty_tpl, $_smarty_tpl->tpl_vars['FIELD_MODEL']->value->getPicklistValues(), 'PICKLIST_VALUE');
$_smarty_tpl->tpl_vars['PICKLIST_VALUE']->do_else = true;
if ($_from !== null) foreach ($_from as $_smarty_tpl->tpl_vars['PICKLIST_VALUE']->value) {
$_smarty_tpl->tpl_vars['PICKLIST_VALUE']->do_else = false;
?><option value="<?php echo $_smarty_tpl->tpl_vars['PICKLIST_VALUE']->value;?>
" <?php if ($_smarty_tpl->tpl_vars['FIELD_VALUE']->value == $_smarty_tpl->tpl_vars['PICKLIST_VALUE']->value) {?>selected<?php }?>><?php echo vtranslate($_smarty_tpl->tpl_vars['PICKLIST_VALUE']->value,$_smarty_tpl->tpl_vars['MODULE_NAME']->value);?>
</option><?php
}
$_smarty_tpl->smarty->ext->_foreach->restore($_smarty_tpl, 1);?></select><?php } else { ?><div class="field-value field-readonly"><?php echo vtranslate($_smarty_tpl->tpl_vars['FIELD_VALUE']->value,$_smarty_tpl->tpl_vars['MODULE_NAME']->value);?>
</div><?php }?></div><?php } elseif ($_smarty_tpl->tpl_vars['fieldDataType']->value == 'boolean') {?><div class="form-group"><label><?php echo vtranslate($_smarty_tpl->tpl_vars['FIELD_MODEL']->value->get('label'),$_smarty_tpl->tpl_vars['MODULE_NAME']->value);?>
</label><?php if ($_smarty_tpl->tpl_vars['IS_EDITABLE']->value) {?><select class="unified-field-input" name="<?php echo $_smarty_tpl->tpl_vars['FIELD_NAME']->value;?>
" data-fieldname="<?php echo $_smarty_tpl->tpl_vars['FIELD_NAME']->value;?>
" data-fieldtype="<?php echo $_smarty_tpl->tpl_vars['fieldDataType']->value;?>
"><option value="1" <?php if ($_smarty_tpl->tpl_vars['FIELD_VALUE']->value == '1' || $_smarty_tpl->tpl_vars['FIELD_VALUE']->value == 'on') {?>selected<?php }?>>Oui</option><option value="0" <?php if ($_smarty_tpl->tpl_vars['FIELD_VALUE']->value == '0' || $_smarty_tpl->tpl_vars['FIELD_VALUE']->value == '' || $_smarty_tpl->tpl_vars['FIELD_VALUE']->value == 'off') {?>selected<?php }?>>Non</option></select><?php } else { ?><div class="field-value field-readonly"><?php if ($_smarty_tpl->tpl_vars['FIELD_VALUE']->value == '1' || $_smarty_tpl->tpl_vars['FIELD_VALUE']->value == 'on') {?>Oui<?php } else { ?>Non<?php }?></div><?php }?></div><?php } elseif ($_smarty_tpl->tpl_vars['fieldDataType']->value == 'date') {?><div class="form-group"><label><?php echo vtranslate($_smarty_tpl->tpl_vars['FIELD_MODEL']->value->get('label'),$_smarty_tpl->tpl_vars['MODULE_NAME']->value);?>
</label><?php if ($_smarty_tpl->tpl_vars['IS_EDITABLE']->value) {
$_smarty_tpl->_assignInScope('DATE_VALUE', '');
if ($_smarty_tpl->tpl_vars['FIELD_VALUE']->value) {
$_smarty_tpl->_assignInScope('DATE_VALUE', smarty_modifier_date_format($_smarty_tpl->tpl_vars['FIELD_VALUE']->value,'%Y-%m-%d'));
}?><input type="date" class="unified-field-input" name="<?php echo $_smarty_tpl->tpl_vars['FIELD_NAME']->value;?>
" data-fieldname="<?php echo $_smarty_tpl->tpl_vars['FIELD_NAME']->value;?>
" data-fieldtype="<?php echo $_smarty_tpl->tpl_vars['fieldDataType']->value;?>
" value="<?php echo $_smarty_tpl->tpl_vars['DATE_VALUE']->value;?>
"><?php } else { ?><div class="field-value field-readonly"><?php echo $_smarty_tpl->tpl_vars['FIELD_MODEL']->value->getDisplayValue($_smarty_tpl->tpl_vars['FIELD_VALUE']->value);?>
</div><?php }?></div><?php } else { ?><div class="form-group"><label><?php echo vtranslate($_smarty_tpl->tpl_vars['FIELD_MODEL']->value->get('label'),$_smarty_tpl->tpl_vars['MODULE_NAME']->value);?>
</label><?php if ($_smarty_tpl->tpl_vars['IS_EDITABLE']->value) {?><input type="text" class="unified-field-input" name="<?php echo $_smarty_tpl->tpl_vars['FIELD_NAME']->value;?>
" data-fieldname="<?php echo $_smarty_tpl->tpl_vars['FIELD_NAME']->value;?>
" data-fieldtype="<?php echo $_smarty_tpl->tpl_vars['fieldDataType']->value;?>
" value="<?php echo htmlspecialchars((string)decode_html($_smarty_tpl->tpl_vars['FIELD_VALUE']->value), ENT_QUOTES, 'UTF-8', true);?>
"><?php } else { ?><div class="field-value field-readonly"><?php if ($_smarty_tpl->tpl_vars['FIELD_VALUE']->value) {
echo $_smarty_tpl->tpl_vars['FIELD_VALUE']->value;
} else { ?>--<?php }?></div><?php }?></div><?php }
}
$_smarty_tpl->smarty->ext->_foreach->restore($_smarty_tpl, 1);?></div></div><?php }
if ($_smarty_tpl->tpl_vars['SUPPL_LIVRAISON_FIELDS']->value != null) {?><div class="suppl-block suppl-livraison" data-block="<?php echo $_smarty_tpl->tpl_vars['SUPPL_LIVRAISON_KEY']->value;?>
"><div class="suppl-block-header header-red-light" style="padding: 10px 15px; border-radius: 8px 8px 0 0; color: white; font-weight: 600;"><i class="fa fa-download"></i> Livraison</div><div class="form-fields-grid form-fields-address" style="padding: 15px; background: #f8f9fa; border-radius: 0 0 8px 8px;"><?php
$_from = $_smarty_tpl->smarty->ext->_foreach->init($_smarty_tpl, $_smarty_tpl->tpl_vars['SUPPL_LIVRAISON_FIELDS']->value, 'FIELD_MODEL', false, 'FIELD_NAME');
$_smarty_tpl->tpl_vars['FIELD_MODEL']->do_else = true;
if ($_from !== null) foreach ($_from as $_smarty_tpl->tpl_vars['FIELD_NAME']->value => $_smarty_tpl->tpl_vars['FIELD_MODEL']->value) {
$_smarty_tpl->tpl_vars['FIELD_MODEL']->do_else = false;
if (!$_smarty_tpl->tpl_vars['FIELD_MODEL']->value->isViewableInDetailView()) {
continue 1;
}
if ($_smarty_tpl->tpl_vars['FIELD_NAME']->value == 'cf_1043' || $_smarty_tpl->tpl_vars['FIELD_NAME']->value == 'cf_1049' || $_smarty_tpl->tpl_vars['FIELD_NAME']->value == 'cf_1045' || $_smarty_tpl->tpl_vars['FIELD_NAME']->value == 'cf_1047') {
continue 1;
}
$_smarty_tpl->_assignInScope('fieldDataType', $_smarty_tpl->tpl_vars['FIELD_MODEL']->value->getFieldDataType());
$_smarty_tpl->_assignInScope('FIELD_VALUE', $_smarty_tpl->tpl_vars['FIELD_MODEL']->value->get('fieldvalue'));
$_smarty_tpl->_assignInScope('IS_EDITABLE', $_smarty_tpl->tpl_vars['FIELD_MODEL']->value->isEditable());
if ($_smarty_tpl->tpl_vars['FIELD_MODEL']->value->get('uitype') == '19' || $_smarty_tpl->tpl_vars['FIELD_MODEL']->value->get('uitype') == '20') {?><div class="form-group form-group-full"><label><?php echo vtranslate($_smarty_tpl->tpl_vars['FIELD_MODEL']->value->get('label'),$_smarty_tpl->tpl_vars['MODULE_NAME']->value);?>
</label><?php if ($_smarty_tpl->tpl_vars['IS_EDITABLE']->value) {?><textarea class="unified-field-input" name="<?php echo $_smarty_tpl->tpl_vars['FIELD_NAME']->value;?>
" data-fieldname="<?php echo $_smarty_tpl->tpl_vars['FIELD_NAME']->value;?>
" data-fieldtype="<?php echo $_smarty_tpl->tpl_vars['fieldDataType']->value;?>
" rows="2"><?php echo $_smarty_tpl->tpl_vars['FIELD_VALUE']->value;?>
</textarea><?php } else { ?><div class="field-value field-value-text field-readonly"><?php if ($_smarty_tpl->tpl_vars['FIELD_VALUE']->value) {
echo $_smarty_tpl->tpl_vars['FIELD_VALUE']->value;
} else { ?>--<?php }?></div><?php }?></div><?php } elseif ($_smarty_tpl->tpl_vars['fieldDataType']->value == 'picklist') {?><div class="form-group"><label><?php echo vtranslate($_smarty_tpl->tpl_vars['FIELD_MODEL']->value->get('label'),$_smarty_tpl->tpl_vars['MODULE_NAME']->value);?>
</label><?php if ($_smarty_tpl->tpl_vars['IS_EDITABLE']->value) {?><select class="unified-field-input" name="<?php echo $_smarty_tpl->tpl_vars['FIELD_NAME']->value;?>
" data-fieldname="<?php echo $_smarty_tpl->tpl_vars['FIELD_NAME']->value;?>
" data-fieldtype="<?php echo $_smarty_tpl->tpl_vars['fieldDataType']->value;?>
"><option value="">--</option><?php
$_from = $_smarty_tpl->smarty->ext->_foreach->init($_smarty_tpl, $_smarty_tpl->tpl_vars['FIELD_MODEL']->value->getPicklistValues(), 'PICKLIST_VALUE');
$_smarty_tpl->tpl_vars['PICKLIST_VALUE']->do_else = true;
if ($_from !== null) foreach ($_from as $_smarty_tpl->tpl_vars['PICKLIST_VALUE']->value) {
$_smarty_tpl->tpl_vars['PICKLIST_VALUE']->do_else = false;
?><option value="<?php echo $_smarty_tpl->tpl_vars['PICKLIST_VALUE']->value;?>
" <?php if ($_smarty_tpl->tpl_vars['FIELD_VALUE']->value == $_smarty_tpl->tpl_vars['PICKLIST_VALUE']->value) {?>selected<?php }?>><?php echo vtranslate($_smarty_tpl->tpl_vars['PICKLIST_VALUE']->value,$_smarty_tpl->tpl_vars['MODULE_NAME']->value);?>
</option><?php
}
$_smarty_tpl->smarty->ext->_foreach->restore($_smarty_tpl, 1);?></select><?php } else { ?><div class="field-value field-readonly"><?php echo vtranslate($_smarty_tpl->tpl_vars['FIELD_VALUE']->value,$_smarty_tpl->tpl_vars['MODULE_NAME']->value);?>
</div><?php }?></div><?php } elseif ($_smarty_tpl->tpl_vars['fieldDataType']->value == 'boolean') {?><div class="form-group"><label><?php echo vtranslate($_smarty_tpl->tpl_vars['FIELD_MODEL']->value->get('label'),$_smarty_tpl->tpl_vars['MODULE_NAME']->value);?>
</label><?php if ($_smarty_tpl->tpl_vars['IS_EDITABLE']->value) {?><select class="unified-field-input" name="<?php echo $_smarty_tpl->tpl_vars['FIELD_NAME']->value;?>
" data-fieldname="<?php echo $_smarty_tpl->tpl_vars['FIELD_NAME']->value;?>
" data-fieldtype="<?php echo $_smarty_tpl->tpl_vars['fieldDataType']->value;?>
"><option value="1" <?php if ($_smarty_tpl->tpl_vars['FIELD_VALUE']->value == '1' || $_smarty_tpl->tpl_vars['FIELD_VALUE']->value == 'on') {?>selected<?php }?>>Oui</option><option value="0" <?php if ($_smarty_tpl->tpl_vars['FIELD_VALUE']->value == '0' || $_smarty_tpl->tpl_vars['FIELD_VALUE']->value == '' || $_smarty_tpl->tpl_vars['FIELD_VALUE']->value == 'off') {?>selected<?php }?>>Non</option></select><?php } else { ?><div class="field-value field-readonly"><?php if ($_smarty_tpl->tpl_vars['FIELD_VALUE']->value == '1' || $_smarty_tpl->tpl_vars['FIELD_VALUE']->value == 'on') {?>Oui<?php } else { ?>Non<?php }?></div><?php }?></div><?php } elseif ($_smarty_tpl->tpl_vars['fieldDataType']->value == 'date') {?><div class="form-group"><label><?php echo vtranslate($_smarty_tpl->tpl_vars['FIELD_MODEL']->value->get('label'),$_smarty_tpl->tpl_vars['MODULE_NAME']->value);?>
</label><?php if ($_smarty_tpl->tpl_vars['IS_EDITABLE']->value) {
$_smarty_tpl->_assignInScope('DATE_VALUE', '');
if ($_smarty_tpl->tpl_vars['FIELD_VALUE']->value) {
$_smarty_tpl->_assignInScope('DATE_VALUE', smarty_modifier_date_format($_smarty_tpl->tpl_vars['FIELD_VALUE']->value,'%Y-%m-%d'));
}?><input type="date" class="unified-field-input" name="<?php echo $_smarty_tpl->tpl_vars['FIELD_NAME']->value;?>
" data-fieldname="<?php echo $_smarty_tpl->tpl_vars['FIELD_NAME']->value;?>
" data-fieldtype="<?php echo $_smarty_tpl->tpl_vars['fieldDataType']->value;?>
" value="<?php echo $_smarty_tpl->tpl_vars['DATE_VALUE']->value;?>
"><?php } else { ?><div class="field-value field-readonly"><?php echo $_smarty_tpl->tpl_vars['FIELD_MODEL']->value->getDisplayValue($_smarty_tpl->tpl_vars['FIELD_VALUE']->value);?>
</div><?php }?></div><?php } else { ?><div class="form-group"><label><?php echo vtranslate($_smarty_tpl->tpl_vars['FIELD_MODEL']->value->get('label'),$_smarty_tpl->tpl_vars['MODULE_NAME']->value);?>
</label><?php if ($_smarty_tpl->tpl_vars['IS_EDITABLE']->value) {?><input type="text" class="unified-field-input" name="<?php echo $_smarty_tpl->tpl_vars['FIELD_NAME']->value;?>
" data-fieldname="<?php echo $_smarty_tpl->tpl_vars['FIELD_NAME']->value;?>
" data-fieldtype="<?php echo $_smarty_tpl->tpl_vars['fieldDataType']->value;?>
" value="<?php echo htmlspecialchars((string)decode_html($_smarty_tpl->tpl_vars['FIELD_VALUE']->value), ENT_QUOTES, 'UTF-8', true);?>
"><?php } else { ?><div class="field-value field-readonly"><?php if ($_smarty_tpl->tpl_vars['FIELD_VALUE']->value) {
echo $_smarty_tpl->tpl_vars['FIELD_VALUE']->value;
} else { ?>--<?php }?></div><?php }?></div><?php }
}
$_smarty_tpl->smarty->ext->_foreach->restore($_smarty_tpl, 1);?></div></div><?php }?></div></div></div><?php }
$_from = $_smarty_tpl->smarty->ext->_foreach->init($_smarty_tpl, $_smarty_tpl->tpl_vars['RECORD_STRUCTURE']->value, 'FIELD_MODEL_LIST', false, 'BLOCK_LABEL_KEY');
$_smarty_tpl->tpl_vars['FIELD_MODEL_LIST']->do_else = true;
if ($_from !== null) foreach ($_from as $_smarty_tpl->tpl_vars['BLOCK_LABEL_KEY']->value => $_smarty_tpl->tpl_vars['FIELD_MODEL_LIST']->value) {
$_smarty_tpl->tpl_vars['FIELD_MODEL_LIST']->do_else = false;
if (in_array($_smarty_tpl->tpl_vars['BLOCK_LABEL_KEY']->value,$_smarty_tpl->tpl_vars['SIDE_BY_SIDE_BLOCKS']->value)) {
continue 1;
}
if (strpos(strtolower($_smarty_tpl->tpl_vars['BLOCK_LABEL_KEY']->value),'suppl') !== false) {
continue 1;
}
if ($_smarty_tpl->tpl_vars['BLOCK_LABEL_KEY']->value == 'LBL_OPPORTUNITY_INFORMATION' || $_smarty_tpl->tpl_vars['BLOCK_LABEL_KEY']->value == 'LBL_POTENTIALS_INFORMATION') {
continue 1;
}
if ($_smarty_tpl->tpl_vars['BLOCK_LABEL_KEY']->value == 'INSTRUCTIONS' || strpos(strtolower($_smarty_tpl->tpl_vars['BLOCK_LABEL_KEY']->value),'instruction') !== false) {
continue 1;
}
if ((isset($_smarty_tpl->tpl_vars['BLOCK_LIST']->value[$_smarty_tpl->tpl_vars['BLOCK_LABEL_KEY']->value]))) {
$_smarty_tpl->_assignInScope('BLOCK', $_smarty_tpl->tpl_vars['BLOCK_LIST']->value[$_smarty_tpl->tpl_vars['BLOCK_LABEL_KEY']->value]);
} else {
$_smarty_tpl->_assignInScope('BLOCK', '');
}
if ($_smarty_tpl->tpl_vars['BLOCK']->value == null || smarty_modifier_count($_smarty_tpl->tpl_vars['FIELD_MODEL_LIST']->value) <= 0) {
continue 1;
}
$_smarty_tpl->_assignInScope('SECTION_CLASS', 'section-default');
$_smarty_tpl->_assignInScope('TITLE_CLASS', 'title-blue');
$_smarty_tpl->_assignInScope('ICON_CLASS', 'fa-info-circle');
if ($_smarty_tpl->tpl_vars['BLOCK_LABEL_KEY']->value == 'LBL_CUSTOM_INFORMATION' || strpos(strtolower($_smarty_tpl->tpl_vars['BLOCK_LABEL_KEY']->value),'personnalis') !== false) {
$_smarty_tpl->_assignInScope('SECTION_CLASS', 'section-custom');
$_smarty_tpl->_assignInScope('TITLE_CLASS', 'title-blue');
$_smarty_tpl->_assignInScope('ICON_CLASS', 'fa-cog');
$_smarty_tpl->_assignInScope('IS_CUSTOM_ACCORDION', true);
} elseif ($_smarty_tpl->tpl_vars['BLOCK_LABEL_KEY']->value == 'LBL_DESCRIPTION_INFORMATION') {
$_smarty_tpl->_assignInScope('SECTION_CLASS', 'section-description');
$_smarty_tpl->_assignInScope('TITLE_CLASS', 'title-orange');
$_smarty_tpl->_assignInScope('ICON_CLASS', 'fa-align-left');
} elseif ($_smarty_tpl->tpl_vars['BLOCK_LABEL_KEY']->value == 'INSTRUCTIONS') {
$_smarty_tpl->_assignInScope('SECTION_CLASS', 'section-instructions');
$_smarty_tpl->_assignInScope('TITLE_CLASS', 'title-blue');
$_smarty_tpl->_assignInScope('ICON_CLASS', 'fa-list-ul');
} elseif (strpos(strtoupper($_smarty_tpl->tpl_vars['BLOCK_LABEL_KEY']->value),'SOCI') !== false) {
$_smarty_tpl->_assignInScope('SECTION_CLASS', 'section-societe');
$_smarty_tpl->_assignInScope('TITLE_CLASS', 'title-purple');
$_smarty_tpl->_assignInScope('ICON_CLASS', 'fa-building');
$_smarty_tpl->_assignInScope('IS_ACCORDION', true);
$_smarty_tpl->_assignInScope('HEADER_CLASS', 'header-purple');
} elseif (strpos($_smarty_tpl->tpl_vars['BLOCK_LABEL_KEY']->value,'suppl') !== false) {
$_smarty_tpl->_assignInScope('SECTION_CLASS', 'section-supplementaire');
$_smarty_tpl->_assignInScope('TITLE_CLASS', 'title-gray');
$_smarty_tpl->_assignInScope('ICON_CLASS', 'fa-plus-circle');
}
if (strpos(strtoupper($_smarty_tpl->tpl_vars['BLOCK_LABEL_KEY']->value),'SOCI') !== false) {?><div class="card accordion-card section-societe" style="padding: 0; overflow: hidden;" data-block="<?php echo $_smarty_tpl->tpl_vars['BLOCK_LABEL_KEY']->value;?>
"><div class="card-header header-purple accordion-header" style="margin: 0; border-radius: 12px;" onclick="UnifiedDetails.toggleAccordion(this)"><i class="fa fa-building"></i> <?php echo vtranslate($_smarty_tpl->tpl_vars['BLOCK_LABEL_KEY']->value,$_smarty_tpl->tpl_vars['MODULE_NAME']->value);?>
<i class="fa fa-chevron-down accordion-arrow"></i></div><div class="accordion-content" style="display: none;"><div class="form-fields-grid form-fields-societe" style="padding: 15px;"><?php } elseif ($_smarty_tpl->tpl_vars['BLOCK_LABEL_KEY']->value == 'LBL_CUSTOM_INFORMATION' || strpos(strtolower($_smarty_tpl->tpl_vars['BLOCK_LABEL_KEY']->value),'personnalis') !== false) {?><div class="card accordion-card section-custom" style="padding: 0; overflow: hidden;" data-block="<?php echo $_smarty_tpl->tpl_vars['BLOCK_LABEL_KEY']->value;?>
"><div class="card-header header-blue accordion-header" style="margin: 0; border-radius: 12px;" onclick="UnifiedDetails.toggleAccordion(this)"><i class="fa fa-cog"></i> <?php echo vtranslate($_smarty_tpl->tpl_vars['BLOCK_LABEL_KEY']->value,$_smarty_tpl->tpl_vars['MODULE_NAME']->value);?>
<i class="fa fa-chevron-down accordion-arrow"></i></div><div class="accordion-content" style="display: none;"><div class="form-fields-grid form-fields-custom" style="padding: 15px;"><?php } else { ?><div class="form-section <?php echo $_smarty_tpl->tpl_vars['SECTION_CLASS']->value;?>
" data-block="<?php echo $_smarty_tpl->tpl_vars['BLOCK_LABEL_KEY']->value;?>
"><div class="form-section-title <?php echo $_smarty_tpl->tpl_vars['TITLE_CLASS']->value;?>
"><i class="fa <?php echo $_smarty_tpl->tpl_vars['ICON_CLASS']->value;?>
"></i><?php echo vtranslate($_smarty_tpl->tpl_vars['BLOCK_LABEL_KEY']->value,$_smarty_tpl->tpl_vars['MODULE_NAME']->value);?>
</div><div class="form-fields-grid"><?php }
$_from = $_smarty_tpl->smarty->ext->_foreach->init($_smarty_tpl, $_smarty_tpl->tpl_vars['FIELD_MODEL_LIST']->value, 'FIELD_MODEL', false, 'FIELD_NAME');
$_smarty_tpl->tpl_vars['FIELD_MODEL']->do_else = true;
if ($_from !== null) foreach ($_from as $_smarty_tpl->tpl_vars['FIELD_NAME']->value => $_smarty_tpl->tpl_vars['FIELD_MODEL']->value) {
$_smarty_tpl->tpl_vars['FIELD_MODEL']->do_else = false;
if (!$_smarty_tpl->tpl_vars['FIELD_MODEL']->value->isViewableInDetailView()) {
continue 1;
}
if ($_smarty_tpl->tpl_vars['FIELD_NAME']->value == 'cf_1043' || $_smarty_tpl->tpl_vars['FIELD_NAME']->value == 'cf_1049' || $_smarty_tpl->tpl_vars['FIELD_NAME']->value == 'cf_1045' || $_smarty_tpl->tpl_vars['FIELD_NAME']->value == 'cf_1047' || $_smarty_tpl->tpl_vars['FIELD_NAME']->value == 'cf_939' || $_smarty_tpl->tpl_vars['FIELD_NAME']->value == 'cf_961') {
continue 1;
}
$_smarty_tpl->_assignInScope('fieldDataType', $_smarty_tpl->tpl_vars['FIELD_MODEL']->value->getFieldDataType());
$_smarty_tpl->_assignInScope('FIELD_VALUE', $_smarty_tpl->tpl_vars['FIELD_MODEL']->value->get('fieldvalue'));
$_smarty_tpl->_assignInScope('IS_EDITABLE', $_smarty_tpl->tpl_vars['FIELD_MODEL']->value->isEditable());
if ($_smarty_tpl->tpl_vars['FIELD_MODEL']->value->get('uitype') == '19' || $_smarty_tpl->tpl_vars['FIELD_MODEL']->value->get('uitype') == '20' || $_smarty_tpl->tpl_vars['FIELD_NAME']->value == 'description') {?><div class="form-group form-group-full"><label><?php echo vtranslate($_smarty_tpl->tpl_vars['FIELD_MODEL']->value->get('label'),$_smarty_tpl->tpl_vars['MODULE_NAME']->value);?>
</label><?php if ($_smarty_tpl->tpl_vars['IS_EDITABLE']->value) {?><textarea class="unified-field-input" name="<?php echo $_smarty_tpl->tpl_vars['FIELD_NAME']->value;?>
" data-fieldname="<?php echo $_smarty_tpl->tpl_vars['FIELD_NAME']->value;?>
" data-fieldtype="<?php echo $_smarty_tpl->tpl_vars['fieldDataType']->value;?>
" rows="3"><?php echo $_smarty_tpl->tpl_vars['FIELD_VALUE']->value;?>
</textarea><?php } else { ?><div class="field-value field-value-text field-readonly"><?php $_smarty_tpl->_subTemplateRender(vtemplate_path($_smarty_tpl->tpl_vars['FIELD_MODEL']->value->getUITypeModel()->getDetailViewTemplateName(),$_smarty_tpl->tpl_vars['MODULE_NAME']->value), $_smarty_tpl->cache_id, $_smarty_tpl->compile_id, 0, $_smarty_tpl->cache_lifetime, array('FIELD_MODEL'=>$_smarty_tpl->tpl_vars['FIELD_MODEL']->value,'USER_MODEL'=>$_smarty_tpl->tpl_vars['USER_MODEL']->value,'MODULE'=>$_smarty_tpl->tpl_vars['MODULE_NAME']->value,'RECORD'=>$_smarty_tpl->tpl_vars['RECORD']->value), 0, true);
?></div><?php }?></div><?php } elseif ($_smarty_tpl->tpl_vars['FIELD_MODEL']->value->get('uitype') == '69' || $_smarty_tpl->tpl_vars['FIELD_MODEL']->value->get('uitype') == '105') {?><div class="form-group form-group-full"><label><?php echo vtranslate($_smarty_tpl->tpl_vars['FIELD_MODEL']->value->get('label'),$_smarty_tpl->tpl_vars['MODULE_NAME']->value);?>
</label><div class="field-value field-readonly"><?php if ((isset($_smarty_tpl->tpl_vars['IMAGE_DETAILS']->value))) {
$_from = $_smarty_tpl->smarty->ext->_foreach->init($_smarty_tpl, $_smarty_tpl->tpl_vars['IMAGE_DETAILS']->value, 'IMAGE_INFO', false, 'ITER');
$_smarty_tpl->tpl_vars['IMAGE_INFO']->do_else = true;
if ($_from !== null) foreach ($_from as $_smarty_tpl->tpl_vars['ITER']->value => $_smarty_tpl->tpl_vars['IMAGE_INFO']->value) {
$_smarty_tpl->tpl_vars['IMAGE_INFO']->do_else = false;
if (!empty($_smarty_tpl->tpl_vars['IMAGE_INFO']->value['url'])) {?><img src="<?php echo $_smarty_tpl->tpl_vars['IMAGE_INFO']->value['url'];?>
" title="<?php echo $_smarty_tpl->tpl_vars['IMAGE_INFO']->value['orgname'];?>
" style="max-width: 200px; max-height: 150px; border-radius: 8px;"><?php }
}
$_smarty_tpl->smarty->ext->_foreach->restore($_smarty_tpl, 1);
}?></div></div><?php } elseif ($_smarty_tpl->tpl_vars['fieldDataType']->value == 'picklist') {?><div class="form-group"><label><?php echo vtranslate($_smarty_tpl->tpl_vars['FIELD_MODEL']->value->get('label'),$_smarty_tpl->tpl_vars['MODULE_NAME']->value);?>
</label><?php if ($_smarty_tpl->tpl_vars['IS_EDITABLE']->value) {?><select class="unified-field-input" name="<?php echo $_smarty_tpl->tpl_vars['FIELD_NAME']->value;?>
" data-fieldname="<?php echo $_smarty_tpl->tpl_vars['FIELD_NAME']->value;?>
" data-fieldtype="<?php echo $_smarty_tpl->tpl_vars['fieldDataType']->value;?>
"><option value="">--</option><?php
$_from = $_smarty_tpl->smarty->ext->_foreach->init($_smarty_tpl, $_smarty_tpl->tpl_vars['FIELD_MODEL']->value->getPicklistValues(), 'PICKLIST_VALUE');
$_smarty_tpl->tpl_vars['PICKLIST_VALUE']->do_else = true;
if ($_from !== null) foreach ($_from as $_smarty_tpl->tpl_vars['PICKLIST_VALUE']->value) {
$_smarty_tpl->tpl_vars['PICKLIST_VALUE']->do_else = false;
?><option value="<?php echo $_smarty_tpl->tpl_vars['PICKLIST_VALUE']->value;?>
" <?php if ($_smarty_tpl->tpl_vars['FIELD_VALUE']->value == $_smarty_tpl->tpl_vars['PICKLIST_VALUE']->value) {?>selected<?php }?>><?php echo vtranslate($_smarty_tpl->tpl_vars['PICKLIST_VALUE']->value,$_smarty_tpl->tpl_vars['MODULE_NAME']->value);?>
</option><?php
}
$_smarty_tpl->smarty->ext->_foreach->restore($_smarty_tpl, 1);?></select><?php } else { ?><div class="field-value field-readonly"><?php echo vtranslate($_smarty_tpl->tpl_vars['FIELD_VALUE']->value,$_smarty_tpl->tpl_vars['MODULE_NAME']->value);?>
</div><?php }?></div><?php } elseif ($_smarty_tpl->tpl_vars['fieldDataType']->value == 'boolean') {?><div class="form-group"><label><?php echo vtranslate($_smarty_tpl->tpl_vars['FIELD_MODEL']->value->get('label'),$_smarty_tpl->tpl_vars['MODULE_NAME']->value);?>
</label><?php if ($_smarty_tpl->tpl_vars['IS_EDITABLE']->value) {?><select class="unified-field-input" name="<?php echo $_smarty_tpl->tpl_vars['FIELD_NAME']->value;?>
" data-fieldname="<?php echo $_smarty_tpl->tpl_vars['FIELD_NAME']->value;?>
" data-fieldtype="<?php echo $_smarty_tpl->tpl_vars['fieldDataType']->value;?>
"><option value="1" <?php if ($_smarty_tpl->tpl_vars['FIELD_VALUE']->value == '1' || $_smarty_tpl->tpl_vars['FIELD_VALUE']->value == 'on') {?>selected<?php }?>>Oui</option><option value="0" <?php if ($_smarty_tpl->tpl_vars['FIELD_VALUE']->value == '0' || $_smarty_tpl->tpl_vars['FIELD_VALUE']->value == '' || $_smarty_tpl->tpl_vars['FIELD_VALUE']->value == 'off') {?>selected<?php }?>>Non</option></select><?php } else { ?><div class="field-value field-readonly"><?php if ($_smarty_tpl->tpl_vars['FIELD_VALUE']->value == '1' || $_smarty_tpl->tpl_vars['FIELD_VALUE']->value == 'on') {?>Oui<?php } else { ?>Non<?php }?></div><?php }?></div><?php } elseif ($_smarty_tpl->tpl_vars['fieldDataType']->value == 'date') {?><div class="form-group"><label><?php echo vtranslate($_smarty_tpl->tpl_vars['FIELD_MODEL']->value->get('label'),$_smarty_tpl->tpl_vars['MODULE_NAME']->value);?>
</label><?php if ($_smarty_tpl->tpl_vars['IS_EDITABLE']->value) {
$_smarty_tpl->_assignInScope('DATE_VALUE', '');
if ($_smarty_tpl->tpl_vars['FIELD_VALUE']->value) {
$_smarty_tpl->_assignInScope('DATE_VALUE', smarty_modifier_date_format($_smarty_tpl->tpl_vars['FIELD_VALUE']->value,'%Y-%m-%d'));
}?><input type="date" class="unified-field-input" name="<?php echo $_smarty_tpl->tpl_vars['FIELD_NAME']->value;?>
" data-fieldname="<?php echo $_smarty_tpl->tpl_vars['FIELD_NAME']->value;?>
" data-fieldtype="<?php echo $_smarty_tpl->tpl_vars['fieldDataType']->value;?>
" value="<?php echo $_smarty_tpl->tpl_vars['DATE_VALUE']->value;?>
"><?php } else { ?><div class="field-value field-readonly"><?php echo $_smarty_tpl->tpl_vars['FIELD_MODEL']->value->getDisplayValue($_smarty_tpl->tpl_vars['FIELD_VALUE']->value);?>
</div><?php }?></div><?php } elseif ($_smarty_tpl->tpl_vars['fieldDataType']->value == 'currency' || $_smarty_tpl->tpl_vars['fieldDataType']->value == 'double' || $_smarty_tpl->tpl_vars['fieldDataType']->value == 'integer') {?><div class="form-group"><label><?php echo vtranslate($_smarty_tpl->tpl_vars['FIELD_MODEL']->value->get('label'),$_smarty_tpl->tpl_vars['MODULE_NAME']->value);?>
</label><?php if ($_smarty_tpl->tpl_vars['IS_EDITABLE']->value) {?><input type="number" class="unified-field-input" name="<?php echo $_smarty_tpl->tpl_vars['FIELD_NAME']->value;?>
" data-fieldname="<?php echo $_smarty_tpl->tpl_vars['FIELD_NAME']->value;?>
" data-fieldtype="<?php echo $_smarty_tpl->tpl_vars['fieldDataType']->value;?>
" value="<?php echo $_smarty_tpl->tpl_vars['FIELD_VALUE']->value;?>
" step="0.01"><?php } else { ?><div class="field-value field-readonly"><?php echo $_smarty_tpl->tpl_vars['FIELD_MODEL']->value->getDisplayValue($_smarty_tpl->tpl_vars['FIELD_VALUE']->value);?>
</div><?php }?></div><?php } elseif ($_smarty_tpl->tpl_vars['fieldDataType']->value == 'owner') {?><div class="form-group"><label><?php echo vtranslate($_smarty_tpl->tpl_vars['FIELD_MODEL']->value->get('label'),$_smarty_tpl->tpl_vars['MODULE_NAME']->value);?>
</label><?php if ($_smarty_tpl->tpl_vars['IS_EDITABLE']->value) {
$_smarty_tpl->_assignInScope('OWNER_FIELD_INFO', $_smarty_tpl->tpl_vars['FIELD_MODEL']->value->getFieldInfo());
$_smarty_tpl->_assignInScope('ALL_USERS', $_smarty_tpl->tpl_vars['OWNER_FIELD_INFO']->value['picklistvalues'][vtranslate('LBL_USERS')]);
$_smarty_tpl->_assignInScope('ALL_GROUPS', $_smarty_tpl->tpl_vars['OWNER_FIELD_INFO']->value['picklistvalues'][vtranslate('LBL_GROUPS')]);?><select class="unified-field-input" name="<?php echo $_smarty_tpl->tpl_vars['FIELD_NAME']->value;?>
" data-fieldname="<?php echo $_smarty_tpl->tpl_vars['FIELD_NAME']->value;?>
" data-fieldtype="<?php echo $_smarty_tpl->tpl_vars['fieldDataType']->value;?>
"><optgroup label="<?php echo vtranslate('LBL_USERS');?>
"><?php
$_from = $_smarty_tpl->smarty->ext->_foreach->init($_smarty_tpl, $_smarty_tpl->tpl_vars['ALL_USERS']->value, 'OWNER_NAME', false, 'OWNER_ID');
$_smarty_tpl->tpl_vars['OWNER_NAME']->do_else = true;
if ($_from !== null) foreach ($_from as $_smarty_tpl->tpl_vars['OWNER_ID']->value => $_smarty_tpl->tpl_vars['OWNER_NAME']->value) {
$_smarty_tpl->tpl_vars['OWNER_NAME']->do_else = false;
?><option value="<?php echo $_smarty_tpl->tpl_vars['OWNER_ID']->value;?>
" <?php if ($_smarty_tpl->tpl_vars['FIELD_VALUE']->value == $_smarty_tpl->tpl_vars['OWNER_ID']->value) {?>selected<?php }?>><?php echo $_smarty_tpl->tpl_vars['OWNER_NAME']->value;?>
</option><?php
}
$_smarty_tpl->smarty->ext->_foreach->restore($_smarty_tpl, 1);?></optgroup><?php if (smarty_modifier_count($_smarty_tpl->tpl_vars['ALL_GROUPS']->value) > 0) {?><optgroup label="<?php echo vtranslate('LBL_GROUPS');?>
"><?php
$_from = $_smarty_tpl->smarty->ext->_foreach->init($_smarty_tpl, $_smarty_tpl->tpl_vars['ALL_GROUPS']->value, 'OWNER_NAME', false, 'OWNER_ID');
$_smarty_tpl->tpl_vars['OWNER_NAME']->do_else = true;
if ($_from !== null) foreach ($_from as $_smarty_tpl->tpl_vars['OWNER_ID']->value => $_smarty_tpl->tpl_vars['OWNER_NAME']->value) {
$_smarty_tpl->tpl_vars['OWNER_NAME']->do_else = false;
?><option value="<?php echo $_smarty_tpl->tpl_vars['OWNER_ID']->value;?>
" <?php if ($_smarty_tpl->tpl_vars['FIELD_VALUE']->value == $_smarty_tpl->tpl_vars['OWNER_ID']->value) {?>selected<?php }?>><?php echo $_smarty_tpl->tpl_vars['OWNER_NAME']->value;?>
</option><?php
}
$_smarty_tpl->smarty->ext->_foreach->restore($_smarty_tpl, 1);?></optgroup><?php }?></select><?php } else { ?><div class="field-value field-readonly" data-field-type="<?php echo $_smarty_tpl->tpl_vars['fieldDataType']->value;?>
"><?php $_smarty_tpl->_subTemplateRender(vtemplate_path($_smarty_tpl->tpl_vars['FIELD_MODEL']->value->getUITypeModel()->getDetailViewTemplateName(),$_smarty_tpl->tpl_vars['MODULE_NAME']->value), $_smarty_tpl->cache_id, $_smarty_tpl->compile_id, 0, $_smarty_tpl->cache_lifetime, array('FIELD_MODEL'=>$_smarty_tpl->tpl_vars['FIELD_MODEL']->value,'USER_MODEL'=>$_smarty_tpl->tpl_vars['USER_MODEL']->value,'MODULE'=>$_smarty_tpl->tpl_vars['MODULE_NAME']->value,'RECORD'=>$_smarty_tpl->tpl_vars['RECORD']->value), 0, true);
?></div><?php }?></div><?php } elseif ($_smarty_tpl->tpl_vars['fieldDataType']->value == 'reference' || $_smarty_tpl->tpl_vars['fieldDataType']->value == 'multireference') {?><div class="form-group"><label><?php echo vtranslate($_smarty_tpl->tpl_vars['FIELD_MODEL']->value->get('label'),$_smarty_tpl->tpl_vars['MODULE_NAME']->value);?>
</label><div class="field-value field-readonly" data-field-type="<?php echo $_smarty_tpl->tpl_vars['fieldDataType']->value;?>
"><?php $_smarty_tpl->_subTemplateRender(vtemplate_path($_smarty_tpl->tpl_vars['FIELD_MODEL']->value->getUITypeModel()->getDetailViewTemplateName(),$_smarty_tpl->tpl_vars['MODULE_NAME']->value), $_smarty_tpl->cache_id, $_smarty_tpl->compile_id, 0, $_smarty_tpl->cache_lifetime, array('FIELD_MODEL'=>$_smarty_tpl->tpl_vars['FIELD_MODEL']->value,'USER_MODEL'=>$_smarty_tpl->tpl_vars['USER_MODEL']->value,'MODULE'=>$_smarty_tpl->tpl_vars['MODULE_NAME']->value,'RECORD'=>$_smarty_tpl->tpl_vars['RECORD']->value), 0, true);
?></div></div><?php } else { ?><div class="form-group"><label><?php echo vtranslate($_smarty_tpl->tpl_vars['FIELD_MODEL']->value->get('label'),$_smarty_tpl->tpl_vars['MODULE_NAME']->value);?>
</label><?php if ($_smarty_tpl->tpl_vars['IS_EDITABLE']->value) {?><input type="text" class="unified-field-input" name="<?php echo $_smarty_tpl->tpl_vars['FIELD_NAME']->value;?>
" data-fieldname="<?php echo $_smarty_tpl->tpl_vars['FIELD_NAME']->value;?>
" data-fieldtype="<?php echo $_smarty_tpl->tpl_vars['fieldDataType']->value;?>
" value="<?php echo htmlspecialchars((string)decode_html($_smarty_tpl->tpl_vars['FIELD_VALUE']->value), ENT_QUOTES, 'UTF-8', true);?>
"><?php } else { ?><div class="field-value field-readonly" data-field-type="<?php echo $_smarty_tpl->tpl_vars['fieldDataType']->value;?>
"><?php $_smarty_tpl->_subTemplateRender(vtemplate_path($_smarty_tpl->tpl_vars['FIELD_MODEL']->value->getUITypeModel()->getDetailViewTemplateName(),$_smarty_tpl->tpl_vars['MODULE_NAME']->value), $_smarty_tpl->cache_id, $_smarty_tpl->compile_id, 0, $_smarty_tpl->cache_lifetime, array('FIELD_MODEL'=>$_smarty_tpl->tpl_vars['FIELD_MODEL']->value,'USER_MODEL'=>$_smarty_tpl->tpl_vars['USER_MODEL']->value,'MODULE'=>$_smarty_tpl->tpl_vars['MODULE_NAME']->value,'RECORD'=>$_smarty_tpl->tpl_vars['RECORD']->value), 0, true);
?></div><?php }?></div><?php }
}
$_smarty_tpl->smarty->ext->_foreach->restore($_smarty_tpl, 1);?></div><?php if (strpos(strtoupper($_smarty_tpl->tpl_vars['BLOCK_LABEL_KEY']->value),'SOCI') !== false || $_smarty_tpl->tpl_vars['BLOCK_LABEL_KEY']->value == 'LBL_CUSTOM_INFORMATION' || strpos(strtolower($_smarty_tpl->tpl_vars['BLOCK_LABEL_KEY']->value),'personnalis') !== false) {?></div><?php }?></div><?php
}
$_smarty_tpl->smarty->ext->_foreach->restore($_smarty_tpl, 1);?></div>

<style>
/* Details Tab - EXACT SAME STYLES AS Devis Tab */

/* Address Row - CHARGEMENT & DESTINATION side by side (same as forfait-products-row) */
.details-tab-container .address-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 15px;
    margin-bottom: 15px;
}

.details-tab-container .address-row .form-section {
    margin-bottom: 0;
}

/* Form Section - SAME AS DEVIS */
.details-tab-container .form-section {
    padding: 12px;
    margin-bottom: 10px;
}

/* Form Section Title - SAME AS DEVIS */
.details-tab-container .form-section-title {
    font-size: 13px;
    margin-bottom: 10px;
}

/* Form Group - SAME AS DEVIS */
.details-tab-container .form-group {
    margin-bottom: 8px;
}

/* Form Group Label - SAME AS DEVIS */
.details-tab-container .form-group label {
    font-size: 11px;
    margin-bottom: 4px;
    text-transform: uppercase;
    letter-spacing: 0.3px;
}

/* Form Inputs - SAME AS DEVIS */
.details-tab-container .form-group input,
.details-tab-container .form-group select,
.details-tab-container .unified-field-input {
    padding: 8px 10px;
    font-size: 13px;
    transition: border-color 0.3s, box-shadow 0.3s;
}

/* Auto-save visual feedback */
.details-tab-container .unified-field-input.field-saving {
    border-color: #f39c12 !important;
    box-shadow: 0 0 0 2px rgba(243, 156, 18, 0.2);
}

.details-tab-container .unified-field-input.field-saved {
    border-color: #27ae60 !important;
    box-shadow: 0 0 0 2px rgba(39, 174, 96, 0.2);
}

.details-tab-container .unified-field-input.field-error {
    border-color: #e74c3c !important;
    box-shadow: 0 0 0 2px rgba(231, 76, 60, 0.2);
}

/* 2 columns grid - SAME AS DEVIS */
.details-tab-container .form-row-2,
.details-tab-container .form-fields-address {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
}

/* 3 columns grid for other blocks */
.details-tab-container .form-fields-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
}

/* 4 columns grid for Détail/Info block */
.details-tab-container .section-info .form-fields-grid {
    grid-template-columns: repeat(4, 1fr);
}

.details-tab-container .form-group-full {
    grid-column: 1 / -1;
}

/* Card header light variants for supplementary addresses */
.details-tab-container .card-header.header-green-light {
    background: linear-gradient(135deg, #48c774 0%, #3abb67 100%);
}

.details-tab-container .card-header.header-red-light {
    background: linear-gradient(135deg, #f27c7c 0%, #e05555 100%);
}

/* Card header purple for SOCIÉTÉ */
.details-tab-container .card-header.header-purple {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

/* Card header blue for Information personnalisée */
.details-tab-container .card-header.header-blue {
    background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
}

/* Card header orange for Instructions */
.details-tab-container .card-header.header-orange {
    background: linear-gradient(135deg, #e67e22 0%, #d35400 100%);
}

/* Card header gray for Adresse Supplémentaire */
.details-tab-container .card-header.header-gray {
    background: linear-gradient(135deg, #6c757d 0%, #495057 100%);
}

/* Supplementary address blocks side by side */
.details-tab-container .suppl-address-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 15px;
}

.details-tab-container .suppl-block-header {
    padding: 10px 15px;
    border-radius: 8px 8px 0 0;
    color: white;
    font-weight: 600;
}

.details-tab-container .suppl-block-header.header-green-light {
    background: linear-gradient(135deg, #48c774 0%, #3abb67 100%);
}

.details-tab-container .suppl-block-header.header-red-light {
    background: linear-gradient(135deg, #f27c7c 0%, #e05555 100%);
}

@media (max-width: 992px) {
    .details-tab-container .suppl-address-row {
        grid-template-columns: 1fr;
    }
}

/* 4 columns grid for SOCIÉTÉ block */
.details-tab-container .form-fields-societe {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
}

/* 4 columns grid for Information personnalisée block */
.details-tab-container .form-fields-custom {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
}

/* 2 columns grid for Instructions block */
.details-tab-container .form-fields-instructions {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 15px;
}

.details-tab-container .instruction-textarea {
    min-height: 100px;
    resize: vertical;
}

/* No border for instructions accordion */
.details-tab-container .accordion-card.section-instructions {
    border-left: none !important;
}

/* Cards in address-row need no margin */
.details-tab-container .address-row .card {
    margin-bottom: 0;
}

/* Accordion styles for supplementary addresses and SOCIÉTÉ */
.details-tab-container .accordion-card {
    border-radius: 12px;
    margin-bottom: 15px;
    border-left: none !important;
}

.details-tab-container .accordion-card.section-societe {
    border-left: none !important;
}

.details-tab-container .accordion-header {
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: space-between;
    transition: all 0.3s ease;
    user-select: none;
}

.details-tab-container .accordion-header:hover {
    filter: brightness(1.05);
}

.details-tab-container .accordion-arrow {
    margin-left: auto;
    transition: transform 0.3s ease;
    font-size: 14px;
}

.details-tab-container .accordion-header.open .accordion-arrow {
    transform: rotate(180deg);
}

.details-tab-container .accordion-header.open {
    border-radius: 12px 12px 0 0 !important;
}

.details-tab-container .accordion-content {
    overflow: hidden;
    transition: max-height 0.3s ease-out;
    background: #fff;
}

/* Title colors for form-sections */

.details-tab-container .form-section-title.title-purple {
    color: #667eea;
}

.details-tab-container .form-section-title.title-purple i {
    color: #667eea;
}

.details-tab-container .form-section-title.title-orange {
    color: #e67e22;
}

.details-tab-container .form-section-title.title-orange i {
    color: #e67e22;
}

.details-tab-container .form-section-title.title-blue {
    color: #3498db;
}

.details-tab-container .form-section-title.title-blue i {
    color: #3498db;
}

.details-tab-container .form-section-title.title-gray {
    color: #6c757d;
}

.details-tab-container .form-section-title.title-gray i {
    color: #6c757d;
}

/* Info section - blue border */
.details-tab-container .section-info {
    border-left: 3px solid #3498db;
}

/* Custom section - no border when accordion */
.details-tab-container .accordion-card.section-custom {
    border-left: none !important;
}

/* Description section - orange border (same as Devis tarification) */
.details-tab-container .section-description {
    border-top: 3px solid #e67e22;
    border-left: none;
}

/* Read-only field values - compact like Devis */
.details-tab-container .form-group .field-value {
    font-size: 13px;
    color: #333;
    padding: 8px 10px;
    background: #f8f9fa;
    border-radius: 8px;
    min-height: 36px;
    display: flex;
    align-items: center;
    word-break: break-word;
}

.details-tab-container .form-group .field-value.field-readonly {
    background: #f0f0f0;
    color: #666;
}

.details-tab-container .form-group .field-value:empty::before {
    content: '--';
    color: #ccc;
}

.details-tab-container .form-group .field-value-text {
    min-height: 60px;
    align-items: flex-start;
    white-space: pre-wrap;
}

/* Style for links inside field values */
.details-tab-container .form-group .field-value a {
    color: #667eea;
    text-decoration: none;
}

.details-tab-container .form-group .field-value a:hover {
    text-decoration: underline;
}

/* Responsive */
@media (max-width: 1200px) {
    .details-tab-container .section-info .form-fields-grid {
        grid-template-columns: repeat(3, 1fr);
    }
}

@media (max-width: 1200px) {
    .details-tab-container .form-fields-societe,
    .details-tab-container .form-fields-custom {
        grid-template-columns: repeat(3, 1fr);
    }
}

@media (max-width: 992px) {
    .details-tab-container .address-row {
        grid-template-columns: 1fr;
    }

    .details-tab-container .form-fields-grid {
        grid-template-columns: repeat(2, 1fr);
    }

    .details-tab-container .section-info .form-fields-grid {
        grid-template-columns: repeat(2, 1fr);
    }

    .details-tab-container .form-fields-societe,
    .details-tab-container .form-fields-custom {
        grid-template-columns: repeat(2, 1fr);
    }
}

@media (max-width: 576px) {
    .details-tab-container .form-fields-grid,
    .details-tab-container .form-fields-address,
    .details-tab-container .form-row-2,
    .details-tab-container .section-info .form-fields-grid,
    .details-tab-container .form-fields-societe,
    .details-tab-container .form-fields-custom,
    .details-tab-container .form-fields-instructions {
        grid-template-columns: 1fr;
    }

    .details-tab-container .date-selector-compact {
        flex-direction: row;
        align-items: center;
        gap: 5px !important;
        padding: 5px !important;
        flex-wrap: wrap;
        margin-bottom: 8px !important;
    }

    .details-tab-container .date-selector-label {
        justify-content: flex-start;
        font-size: 13px;
        flex-shrink: 0;
    }

    .details-tab-container .date-mode-toggle-compact {
        flex: 1;
        justify-content: flex-end;
        min-width: 200px;
    }

    .details-tab-container .date-mode-btn {
        flex: 1;
        text-align: center;
        padding: 6px 12px !important;
        font-size: 11px !important;
    }

    .details-tab-container .date-unique-container,
    .details-tab-container .date-period-container {
        width: 100% !important;
        flex-direction: row !important;
        flex-wrap: wrap !important;
        gap: 6px !important;
    }

    .details-tab-container .date-field-item {
        width: calc(50% - 3px) !important;
        justify-content: space-between;
        flex-shrink: 0 !important;
    }

    .details-tab-container .date-field-label {
        font-size: 12px;
    }

    .details-tab-container .date-input-compact {
        flex: 1;
        width: auto;
        min-width: 0;
        font-size: 13px;
        padding: 6px 8px;
    }

    .details-tab-container .key-metrics-compact {
        width: 100% !important;
        display: flex !important;
        flex-direction: row !important;
        flex-wrap: wrap !important;
        gap: 6px !important;
    }

    .details-tab-container .metrics-separator {
        display: none !important;
    }

    .details-tab-container .metric-item {
        width: calc(33.33% - 4px) !important;
        justify-content: space-between;
        padding: 3px 6px !important;
        flex-shrink: 0 !important;
    }

    .details-tab-container .metric-label {
        font-size: 10px;
    }

    .details-tab-container .metric-value {
        font-size: 14px;
        min-width: 50px;
    }

    .details-tab-container .metric-unit {
        font-size: 12px;
    }

    .details-tab-container .metrics-separator {
        display: none;
    }
}

/* Compact Date Selector Component */
.details-tab-container .date-selector-compact {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 15px;
    padding: 5px 5px;
    background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
    border-radius: 12px;
    margin-bottom: 15px;
    flex-wrap: wrap;
}

.details-tab-container .date-selector-label {
    font-weight: 600;
    color: #00b4db;
    font-size: 13px;
    display: flex;
    align-items: center;
    gap: 6px;
}

.details-tab-container .date-selector-label i {
    font-size: 14px;
}

.details-tab-container .date-mode-toggle-compact {
    display: flex;
    gap: 5px;
    background: #fff;
    padding: 3px;
    border-radius: 20px;
    box-shadow: inset 0 1px 3px rgba(0,0,0,0.1);
}

.details-tab-container .date-mode-btn {
    padding: 6px 14px;
    border-radius: 18px;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    color: #666;
    background: transparent;
    margin-bottom:0px;
}

.details-tab-container .date-mode-btn:hover {
    background: #f0f0f0;
}

.details-tab-container .date-mode-btn.active {
    background: linear-gradient(135deg, #00b4db 0%, #0083b0 100%);
    color: #fff;
}

.details-tab-container .date-mode-btn input[type="radio"] {
    display: none;
}

.details-tab-container .date-fields-compact {
    display: flex;
    align-items: center;
    gap: 12px;
}

.details-tab-container .date-field-item {
    display: flex;
    align-items: center;
    gap: 6px;
}

.details-tab-container .date-field-label {
    font-size: 11px;
    font-weight: 600;
    color: #555;
    white-space: nowrap;
}

.details-tab-container .date-field-label i {
    font-size: 12px;
}

.details-tab-container .date-input-compact {
    padding: 6px 10px;
    font-size: 13px;
    border: 1px solid #ddd;
    border-radius: 8px;
    background: #fff;
    transition: all 0.2s ease;
    width: 140px;
}

.details-tab-container .date-input-compact:focus {
    border-color: #00b4db;
    outline: none;
    box-shadow: 0 0 0 2px rgba(0, 180, 219, 0.15);
}

/* Key Metrics Separator & Container */
.details-tab-container .metrics-separator {
    width: 1px;
    height: 30px;
    background: linear-gradient(to bottom, transparent, #ccc, transparent);
    margin: 0 5px;
}

.details-tab-container .key-metrics-compact {
    display: flex;
    align-items: center;
    gap: 15px;
}

.details-tab-container .metric-item {
    display: flex;
    align-items: center;
    gap: 4px;
    background: #fff;
    padding: 5px 10px;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.08);
}

.details-tab-container .metric-label {
    font-size: 11px;
    font-weight: 600;
    color: #555;
    white-space: nowrap;
}

.details-tab-container .metric-label i {
    margin-right: 3px;
}

.details-tab-container .metric-value {
    font-size: 13px;
    font-weight: 700;
    color: #333;
    min-width: 35px;
    text-align: right;
}

.details-tab-container .metric-unit {
    font-size: 10px;
    color: #888;
    font-weight: 500;
}

@media (max-width: 992px) {
    .details-tab-container .key-metrics-compact {
        width: 100%;
        justify-content: center;
        margin-top: 10px;
    }

    .details-tab-container .metrics-separator {
        display: none;
    }
}

/* Address Autocomplete Dropdown */
.address-autocomplete-dropdown {
    background: white;
    border: 1px solid #ddd;
    border-radius: 8px;
    box-shadow: 0 4px 15px rgba(0,0,0,0.15);
    max-height: 300px;
    overflow-y: auto;
}

.address-autocomplete-dropdown .autocomplete-item {
    padding: 10px 12px;
    cursor: pointer;
    border-bottom: 1px solid #f0f0f0;
    transition: background-color 0.15s ease;
}

.address-autocomplete-dropdown .autocomplete-item:last-child {
    border-bottom: none;
}

.address-autocomplete-dropdown .autocomplete-item:hover {
    background-color: #f5f5f5;
}

.address-autocomplete-dropdown .autocomplete-item strong {
    color: #333;
}
</style>

<?php echo '<script'; ?>
>

// UnifiedDetails controller
var UnifiedDetails = {
    recordId: null,
    moduleName: null,
    contactId: null,

    // Configuration for postal code / city pairs
    postalCityPairs: [
        { postal: 'cf_935', city: 'cf_933' },     // CHARGEMENT
        { postal: 'cf_951', city: 'cf_949' },     // DESTINATION (LIVRAISON)
        { postal: 'cf_1099', city: 'cf_1103' },   // Suppl chargement
        { postal: 'cf_1101', city: 'cf_1105' },   // Suppl chargement 2
        { postal: 'cf_1111', city: 'cf_1115' },   // Suppl livraison
        { postal: 'cf_1113', city: 'cf_1117' },   // Suppl livraison 2
        { postal: 'cf_1263', city: 'cf_1265' }    // Société
    ],

    // Configuration for address groups (address + postal + city)
    addressGroups: [
        { address: 'cf_955', postal: 'cf_935', city: 'cf_933', label: 'CHARGEMENT' },
        { address: 'cf_957', postal: 'cf_951', city: 'cf_949', label: 'LIVRAISON' },
        { address: 'cf_1107', postal: 'cf_1099', city: 'cf_1103', label: 'Suppl-Charg' },
        { address: 'cf_1109', postal: 'cf_1101', city: 'cf_1105', label: 'Suppl-Charg-2' },
        { address: 'cf_1119', postal: 'cf_1111', city: 'cf_1115', label: 'Suppl-Livr' },
        { address: 'cf_1121', postal: 'cf_1113', city: 'cf_1117', label: 'Suppl-Livr-2' },
        { address: 'cf_1267', postal: 'cf_1263', city: 'cf_1265', label: 'Société' }
    ],

    init: function() {
        var container = jQuery('#detailsTabContainer');
        this.recordId = container.data('record-id');
        this.moduleName = container.data('module');
        this.contactId = container.data('contact-id');
        console.log('[UnifiedDetails] Initialized for record', this.recordId, 'contact', this.contactId);

        // Initialize date selector
        this.initDateSelector();

        // Initialize address autocomplete
        this.registerPostalCityAutoComplete();
        this.registerAddressAutoComplete();

        // Initialize auto-save for all fields
        this.initAutoSave();
    },

    initAutoSave: function() {
        var self = this;
        var saveTimeout = {};

        // Auto-save on change for select, checkbox, date inputs (exclude contact-sync fields)
        jQuery('#detailsTabContainer').on('change', '.unified-field-input:not(.contact-sync-field)', function() {
            var field = jQuery(this);
            var fieldName = field.data('fieldname') || field.attr('name');
            self.saveField(fieldName, field.val());
        });

        // Auto-save on input for text inputs and textareas (debounced 500ms, exclude contact-sync fields)
        jQuery('#detailsTabContainer').on('input', 'input.unified-field-input[type="text"]:not(.contact-sync-field), textarea.unified-field-input', function() {
            var field = jQuery(this);
            var fieldName = field.data('fieldname') || field.attr('name');
            if (saveTimeout[fieldName]) clearTimeout(saveTimeout[fieldName]);
            saveTimeout[fieldName] = setTimeout(function() {
                self.saveField(fieldName, field.val());
            }, 500);
        });

        // Auto-save contact sync fields (Nom/Prénom) on input (debounced 500ms)
        jQuery('#detailsTabContainer').on('input', '.contact-sync-field', function() {
            var field = jQuery(this);
            var key = 'contact_' + field.data('contact-field');
            if (saveTimeout[key]) clearTimeout(saveTimeout[key]);
            saveTimeout[key] = setTimeout(function() {
                field.trigger('_contactSave');
            }, 500);
        });

        // Contact sync save handler
        jQuery('#detailsTabContainer').on('_contactSave', '.contact-sync-field', function() {
            var field = jQuery(this);
            var contactField = field.data('contact-field');
            var fieldValue = field.val();
            if (!self.contactId || !contactField) return;

            field.addClass('field-saving');
            jQuery.ajax({
                url: 'index.php',
                type: 'POST',
                data: {
                    module: 'Contacts',
                    action: 'SaveAjax',
                    record: self.contactId,
                    field: contactField,
                    value: fieldValue
                },
                success: function() {
                    field.removeClass('field-saving').addClass('field-saved');
                    setTimeout(function() { field.removeClass('field-saved'); }, 1500);
                    // Update header name and potentialname
                    var firstname = jQuery('.contact-sync-field[data-contact-field="firstname"]').val() || '';
                    var lastname = jQuery('.contact-sync-field[data-contact-field="lastname"]').val() || '';
                    var fullName = (firstname + ' ' + lastname).trim();
                    jQuery('.unified-header-left h1').html('<i class="fa fa-user-circle"></i> ' + fullName);
                    // Sync potentialname with contact name
                    if (fullName) {
                        self.saveField('potentialname', fullName);
                    }
                },
                error: function() {
                    field.removeClass('field-saving').addClass('field-error');
                    setTimeout(function() { field.removeClass('field-error'); }, 3000);
                }
            });
        });

        console.log('[UnifiedDetails] Auto-save initialized');
    },

    saveField: function(fieldName, fieldValue) {
        var self = this;

        if (!fieldName || !this.recordId) {
            console.warn('[UnifiedDetails] Cannot save: missing fieldName or recordId');
            return;
        }

        console.log('[UnifiedDetails] Saving field:', fieldName, '=', fieldValue);

        // Show saving indicator
        var field = jQuery('[data-fieldname="' + fieldName + '"], [name="' + fieldName + '"]').first();
        field.addClass('field-saving');

        // Prepare data for VTiger save
        var params = {
            module: this.moduleName,
            action: 'SaveAjax',
            record: this.recordId,
            field: fieldName,
            value: fieldValue
        };

        jQuery.ajax({
            url: 'index.php',
            type: 'POST',
            data: params,
            success: function(response) {
                field.removeClass('field-saving').addClass('field-saved');
                setTimeout(function() {
                    field.removeClass('field-saved');
                }, 1500);
                console.log('[UnifiedDetails] Field saved successfully:', fieldName);

                // Update global metrics bar + local metrics display
                if (typeof window.updateGlobalMetrics === 'function') {
                    window.updateGlobalMetrics(fieldName, fieldValue);
                }
                var localMetricMap = { 'cf_961': '#metric_distance', 'cf_939': '#metric_volume_estime', 'cf_1259': '#metric_volume_final' };
                if (localMetricMap[fieldName]) {
                    jQuery(localMetricMap[fieldName]).text(fieldValue || '--');
                }

                // Open rappel popup when status changes to "A Rappeler"
                if (fieldName === 'cf_971' && fieldValue === 'A Rappeler') {
                    setTimeout(function() {
                        var recordName = jQuery('.unified-header-left h1').text().trim() || 'Cette affaire';
                        var userId = 1;
                        try { if (typeof app !== 'undefined' && app.getUserId) userId = app.getUserId(); } catch(e) { }
                        var popupUrl = window.location.protocol + '//' + window.location.host + '/rappel_popup.php?module=Potentials&record_id=' + self.recordId + '&record_name=' + encodeURIComponent(recordName) + '&user_id=' + userId;
                        var newTab = window.open(popupUrl, '_blank');
                        if (newTab) newTab.focus();
                    }, 500);
                }

                // Sync email/mobile to Contact record and update header
                var contactFieldMap = { 'cf_1123': 'email', 'cf_981': 'mobile' };
                if (contactFieldMap[fieldName]) {
                    // Update header display
                    if (fieldName === 'cf_1123') {
                        var headerEmail = jQuery('#header-contact-email');
                        headerEmail.find('span').text(fieldValue);
                        headerEmail.toggle(!!fieldValue);
                    } else if (fieldName === 'cf_981') {
                        var headerPhone = jQuery('#header-contact-phone');
                        headerPhone.find('span').text(fieldValue);
                        headerPhone.toggle(!!fieldValue);
                    }
                    // Sync to Contact
                    if (self.contactId) {
                        jQuery.ajax({
                            url: 'index.php',
                            type: 'POST',
                            data: {
                                module: 'Contacts',
                                action: 'SaveAjax',
                                record: self.contactId,
                                field: contactFieldMap[fieldName],
                                value: fieldValue
                            },
                            success: function() {
                                console.log('[UnifiedDetails] Contact field synced:', contactFieldMap[fieldName]);
                            },
                            error: function() {
                                console.error('[UnifiedDetails] Error syncing contact field:', contactFieldMap[fieldName]);
                            }
                        });
                    }
                }
            },
            error: function(xhr, status, error) {
                field.removeClass('field-saving').addClass('field-error');
                setTimeout(function() {
                    field.removeClass('field-error');
                }, 3000);
                console.error('[UnifiedDetails] Error saving field:', fieldName, error);
                app.helper.showErrorNotification({message: 'Erreur lors de la sauvegarde de ' + fieldName});
            }
        });
    },

    initDateSelector: function() {
        var self = this;

        // Mode toggle click handlers (support both old and new selectors)
        jQuery('.date-mode-btn, .date-mode-option').on('click', function() {
            var mode = jQuery(this).data('mode');
            self.setDateMode(mode);
        });

        // Date unique inputs - update hidden fields and auto-save
        jQuery('#date_unique_chargement').on('change', function() {
            var val = jQuery(this).val();
            jQuery('#hidden_cf_1043').val(val);
            self.saveField('cf_1043', val);
        });

        jQuery('#date_unique_livraison').on('change', function() {
            var val = jQuery(this).val();
            jQuery('#hidden_cf_1049').val(val);
            self.saveField('cf_1049', val);
        });

        // Period inputs - update hidden fields and auto-save
        jQuery('#date_periode_debut').on('change', function() {
            var val = jQuery(this).val();
            jQuery('#hidden_cf_1045').val(val);
            self.saveField('cf_1045', val);
        });

        jQuery('#date_periode_fin').on('change', function() {
            var val = jQuery(this).val();
            jQuery('#hidden_cf_1047').val(val);
            self.saveField('cf_1047', val);
        });
    },

    setDateMode: function(mode) {
        var self = this;

        // Update toggle visual state (support both old and new selectors)
        jQuery('.date-mode-btn, .date-mode-option').removeClass('active');
        jQuery('.date-mode-btn[data-mode="' + mode + '"], .date-mode-option[data-mode="' + mode + '"]').addClass('active');
        jQuery('.date-mode-btn[data-mode="' + mode + '"] input, .date-mode-option[data-mode="' + mode + '"] input').prop('checked', true);

        if (mode === 'unique') {
            // Show unique date, hide period
            jQuery('.date-unique-container').show();
            jQuery('.date-period-container').hide();

            // Clear period hidden fields and save
            jQuery('#hidden_cf_1045').val('');
            jQuery('#hidden_cf_1047').val('');
            jQuery('#date_periode_debut').val('');
            jQuery('#date_periode_fin').val('');

            // Auto-save: clear period dates
            self.saveField('cf_1045', '');
            self.saveField('cf_1047', '');
        } else {
            // Show period, hide unique date
            jQuery('.date-unique-container').hide();
            jQuery('.date-period-container').show();

            // Clear unique date hidden fields and save
            jQuery('#hidden_cf_1043').val('');
            jQuery('#hidden_cf_1049').val('');
            jQuery('#date_unique_chargement').val('');
            jQuery('#date_unique_livraison').val('');

            // Auto-save: clear unique dates
            self.saveField('cf_1043', '');
            self.saveField('cf_1049', '');
        }
    },

    save: function() {
        var self = this;
        var container = jQuery('#detailsTabContainer');
        var data = {
            module: this.moduleName,
            action: 'SaveAjax',
            record: this.recordId
        };

        // Collect all editable field values
        container.find('.unified-field-input').each(function() {
            var fieldName = jQuery(this).data('fieldname');
            var fieldValue = jQuery(this).val();
            if (fieldName) {
                data[fieldName] = fieldValue;
            }
        });

        console.log('[UnifiedDetails] Saving data:', data);

        // Show loading
        var btn = jQuery('#unified_btnSaveDetails');
        var originalHtml = btn.html();
        btn.html('<i class="fa fa-spinner fa-spin"></i> Enregistrement...').prop('disabled', true);

        jQuery.ajax({
            url: 'index.php',
            type: 'POST',
            data: data,
            dataType: 'json',
            success: function(response) {
                console.log('[UnifiedDetails] Save response:', response);
                if (response.success) {
                    app.helper.showSuccessNotification({message: 'Enregistrement reussi'});
                } else {
                    app.helper.showErrorNotification({message: response.error ? response.error.message : 'Erreur lors de l\'enregistrement'});
                }
            },
            error: function(xhr, status, error) {
                console.error('[UnifiedDetails] Save error:', error);
                app.helper.showErrorNotification({message: 'Erreur de connexion'});
            },
            complete: function() {
                btn.html(originalHtml).prop('disabled', false);
            }
        });
    },

    cancel: function() {
        // Reload the tab to discard changes
        if (typeof UnifiedTabbedView !== 'undefined') {
            UnifiedTabbedView.loadedTabs['details'] = false;
            UnifiedTabbedView.loadTabContent('details');
        }
    },

    toggleAccordion: function(header) {
        var $header = jQuery(header);
        var $content = $header.next('.accordion-content');
        var isOpen = $header.hasClass('open');

        if (isOpen) {
            // Close accordion
            $content.slideUp(300, function() {
                $header.removeClass('open');
            });
        } else {
            // Open accordion
            $header.addClass('open');
            $content.slideDown(300);
        }
    },

    toggleSupplAddresses: function(header) {
        var $clickedHeader = jQuery(header);
        var isOpen = $clickedHeader.hasClass('open');

        // Find all supplementary address accordions
        var $allSupplAccordions = jQuery('.suppl-address-accordion');

        $allSupplAccordions.each(function() {
            var $accordion = jQuery(this);
            var $header = $accordion.find('.accordion-header');
            var $content = $accordion.find('.accordion-content');

            if (isOpen) {
                // Close all
                $content.slideUp(300, function() {
                    $header.removeClass('open');
                });
            } else {
                // Open all
                $header.addClass('open');
                $content.slideDown(300);
            }
        });
    },

    // =====================================================
    // ADDRESS AUTOCOMPLETE FUNCTIONS
    // =====================================================

    registerPostalCityAutoComplete: function() {
        var self = this;
        var container = jQuery('#detailsTabContainer');

        this.postalCityPairs.forEach(function(pair) {
            var postalInput = container.find('input[name="' + pair.postal + '"], input[data-fieldname="' + pair.postal + '"]');
            var cityInput = container.find('input[name="' + pair.city + '"], input[data-fieldname="' + pair.city + '"]');

            if (postalInput.length && cityInput.length) {
                // Postal code -> fetch city (on input for instant feedback + blur as fallback)
                var cityLookupTimeout;
                postalInput.on('input change blur', function() {
                    var postalCode = jQuery(this).val().trim();
                    if (postalCode.length === 5) {
                        clearTimeout(cityLookupTimeout);
                        cityLookupTimeout = setTimeout(function() {
                            self.fetchCityFromPostalCode(postalCode, cityInput, postalInput);
                        }, 300);
                    }
                });

                // City autocomplete
                self.initCityAutocomplete(cityInput, postalInput);
            }
        });

        console.log('[UnifiedDetails] Postal/City autocomplete registered');
    },

    fetchCityFromPostalCode: function(postalCode, cityInput, postalInput) {
        var self = this;
        postalInput.css('background-color', '#fffde7');

        jQuery.ajax({
            url: 'https://api-adresse.data.gouv.fr/search/',
            data: {
                q: postalCode,
                type: 'municipality',
                postcode: postalCode,
                limit: 1
            },
            success: function(data) {
                if (data.features && data.features.length > 0) {
                    var city = data.features[0].properties.city;
                    cityInput.val(city);
                    // Save city field directly
                    var cityFieldName = cityInput.data('fieldname') || cityInput.attr('name');
                    if (cityFieldName) {
                        self.saveField(cityFieldName, city);
                    }
                    postalInput.css('background-color', '#e8f5e9');
                    setTimeout(function() {
                        postalInput.css('background-color', '');
                    }, 1000);
                } else {
                    postalInput.css('background-color', '#ffebee');
                    setTimeout(function() {
                        postalInput.css('background-color', '');
                    }, 1000);
                }
            },
            error: function() {
                postalInput.css('background-color', '');
            }
        });
    },

    initCityAutocomplete: function(cityInput, postalInput) {
        var self = this;
        var autocompleteTimeout;
        var dropdownId = 'city-dropdown-' + cityInput.attr('name');

        cityInput.attr('autocomplete', 'off');
        cityInput.on('input', function() {
            clearTimeout(autocompleteTimeout);
            var query = jQuery(this).val().trim();

            if (query.length < 2) {
                jQuery('#' + dropdownId).remove();
                return;
            }

            autocompleteTimeout = setTimeout(function() {
                self.showCityAutocomplete(query, cityInput, postalInput, dropdownId);
            }, 300);
        });

        // Close dropdown on blur
        cityInput.on('blur', function() {
            setTimeout(function() {
                jQuery('#' + dropdownId).remove();
            }, 200);
        });
    },

    showCityAutocomplete: function(query, cityInput, postalInput, dropdownId) {
        jQuery.ajax({
            url: 'https://api-adresse.data.gouv.fr/search/',
            data: {
                q: query,
                type: 'municipality',
                limit: 8
            },
            success: function(data) {
                jQuery('#' + dropdownId).remove();

                if (!data.features || data.features.length === 0) return;

                var dropdown = jQuery('<div id="' + dropdownId + '" class="address-autocomplete-dropdown"></div>');

                data.features.forEach(function(feature) {
                    var city = feature.properties.city;
                    var postcode = feature.properties.postcode;
                    var item = jQuery('<div class="autocomplete-item"></div>')
                        .html('<strong>' + city + '</strong> <span style="color:#666">(' + postcode + ')</span>')
                        .on('mousedown', function(e) {
                            e.preventDefault();
                            cityInput.val(city);
                            postalInput.val(postcode);
                            jQuery('#' + dropdownId).remove();
                            // Save both fields directly
                            var cityName = cityInput.data('fieldname') || cityInput.attr('name');
                            var postalName = postalInput.data('fieldname') || postalInput.attr('name');
                            if (cityName) UnifiedDetails.saveField(cityName, city);
                            if (postalName) UnifiedDetails.saveField(postalName, postcode);
                        });
                    dropdown.append(item);
                });

                var offset = cityInput.offset();
                dropdown.css({
                    position: 'absolute',
                    top: offset.top + cityInput.outerHeight(),
                    left: offset.left,
                    width: cityInput.outerWidth(),
                    zIndex: 9999
                });

                jQuery('body').append(dropdown);
            }
        });
    },

    registerAddressAutoComplete: function() {
        var self = this;
        var container = jQuery('#detailsTabContainer');

        this.addressGroups.forEach(function(group) {
            var addressInput = container.find('input[name="' + group.address + '"], input[data-fieldname="' + group.address + '"]');
            var postalInput = container.find('input[name="' + group.postal + '"], input[data-fieldname="' + group.postal + '"]');
            var cityInput = container.find('input[name="' + group.city + '"], input[data-fieldname="' + group.city + '"]');

            if (addressInput.length) {
                self.initAddressAutocomplete(addressInput, postalInput, cityInput, group.label);
            }
        });

        console.log('[UnifiedDetails] Address autocomplete registered');
    },

    initAddressAutocomplete: function(addressInput, postalInput, cityInput, label) {
        var self = this;
        var autocompleteTimeout;
        var dropdownId = 'address-dropdown-' + addressInput.attr('name');

        addressInput.attr('autocomplete', 'off');
        addressInput.on('input', function() {
            clearTimeout(autocompleteTimeout);
            var query = jQuery(this).val().trim();

            if (query.length < 3) {
                jQuery('#' + dropdownId).remove();
                return;
            }

            autocompleteTimeout = setTimeout(function() {
                self.showAddressAutocomplete(query, addressInput, postalInput, cityInput, dropdownId);
            }, 300);
        });

        // Close dropdown on blur
        addressInput.on('blur', function() {
            setTimeout(function() {
                jQuery('#' + dropdownId).remove();
            }, 200);
        });
    },

    showAddressAutocomplete: function(query, addressInput, postalInput, cityInput, dropdownId) {
        var existingPostal = postalInput.length ? postalInput.val().trim() : '';
        var requestData = {
            q: query,
            type: 'housenumber',
            limit: 8
        };

        if (existingPostal.length === 5) {
            requestData.postcode = existingPostal;
        }

        jQuery.ajax({
            url: 'https://api-adresse.data.gouv.fr/search/',
            data: requestData,
            success: function(data) {
                jQuery('#' + dropdownId).remove();

                if (!data.features || data.features.length === 0) return;

                var dropdown = jQuery('<div id="' + dropdownId + '" class="address-autocomplete-dropdown"></div>');

                data.features.forEach(function(feature) {
                    var props = feature.properties;
                    var streetAddress = props.name;
                    var postcode = props.postcode;
                    var city = props.city;

                    var item = jQuery('<div class="autocomplete-item"></div>')
                        .html('<strong>' + streetAddress + '</strong><br><span style="color:#666;font-size:11px">' + postcode + ' ' + city + '</span>')
                        .on('mousedown', function(e) {
                            e.preventDefault();
                            addressInput.val(streetAddress);
                            if (postalInput.length) postalInput.val(postcode);
                            if (cityInput.length) cityInput.val(city);
                            jQuery('#' + dropdownId).remove();
                            // Save all three fields directly
                            var addrName = addressInput.data('fieldname') || addressInput.attr('name');
                            if (addrName) UnifiedDetails.saveField(addrName, streetAddress);
                            if (postalInput.length) {
                                var postalName = postalInput.data('fieldname') || postalInput.attr('name');
                                if (postalName) UnifiedDetails.saveField(postalName, postcode);
                            }
                            if (cityInput.length) {
                                var cityName = cityInput.data('fieldname') || cityInput.attr('name');
                                if (cityName) UnifiedDetails.saveField(cityName, city);
                            }
                        });
                    dropdown.append(item);
                });

                var offset = addressInput.offset();
                dropdown.css({
                    position: 'absolute',
                    top: offset.top + addressInput.outerHeight(),
                    left: offset.left,
                    width: Math.max(addressInput.outerWidth(), 300),
                    zIndex: 9999
                });

                jQuery('body').append(dropdown);
            }
        });
    }
};

// Initialize when DOM is ready
jQuery(document).ready(function() {
    UnifiedDetails.init();
});

<?php echo '</script'; ?>
>
<?php }
}
