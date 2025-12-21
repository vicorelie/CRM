<?php
/* Smarty version 3.1.39, created on 2025-08-13 10:44:43
  from '/home/vicorelie/crm.tcerenov-design.com/customerportal/layouts/default/templates/HelpDesk/partials/DetailContentBefore.tpl' */

/* @var Smarty_Internal_Template $_smarty_tpl */
if ($_smarty_tpl->_decodeProperties($_smarty_tpl, array (
  'version' => '3.1.39',
  'unifunc' => 'content_689c6c9b916bd1_17434351',
  'has_nocache_code' => false,
  'file_dependency' => 
  array (
    '5c74b0f3b2e6d24fe0c391edff92ea2f41e004a3' => 
    array (
      0 => '/home/vicorelie/crm.tcerenov-design.com/customerportal/layouts/default/templates/HelpDesk/partials/DetailContentBefore.tpl',
      1 => 1755006197,
      2 => 'file',
    ),
  ),
  'includes' => 
  array (
  ),
),false)) {
function content_689c6c9b916bd1_17434351 (Smarty_Internal_Template $_smarty_tpl) {
?>

<div class="col-lg-12 col-md-12 col-sm-12 col-xs-12 ticket-detail-header-row ">
  <h3 class="fsmall">
    <detail-navigator>
      <span>
        <a ng-click="navigateBack(module)" style="font-size:small;">{{ptitle}}</a>
      </span>
    </detail-navigator>
      {{record[header]}}
    <button ng-if="(closeButtonDisabled && HelpDeskIsStatusEditable && isEditable)" translate="Mark as closed" class="btn btn-success close-ticket" ng-click="close();"></button>
    <button ng-if="closeButtonDisabled && documentsEnabled" translate="Attach document to this ticket" class="btn btn-primary attach-files-ticket" ng-click="attachDocument('Documents','LBL_ADD_DOCUMENT')"></button>
    <button translate="Edit Ticket" class="btn btn-primary attach-files-ticket" ng-if="isEditable" ng-click="edit(module,id)"></button>
  </h3>
</div>
</div>
<div class="col-lg-12 col-md-12 col-sm-12 col-xs-12">
  
  <?php echo '<script'; ?>
 type="text/javascript" src="<?php echo portal_componentjs_file('Documents');?>
"><?php echo '</script'; ?>
>
  <?php $_smarty_tpl->_subTemplateRender(portal_template_resolve('Documents',"partials/IndexContentAfter.tpl"), $_smarty_tpl->cache_id, $_smarty_tpl->compile_id, 0, $_smarty_tpl->cache_lifetime, array(), 0, true);
}
}
