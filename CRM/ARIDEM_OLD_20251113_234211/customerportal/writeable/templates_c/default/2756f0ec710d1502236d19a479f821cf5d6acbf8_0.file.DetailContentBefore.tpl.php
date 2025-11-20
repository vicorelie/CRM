<?php
/* Smarty version 3.1.39, created on 2025-08-13 10:50:21
  from '/home/vicorelie/crm.tcerenov-design.com/customerportal/layouts/default/templates/Quotes/partials/DetailContentBefore.tpl' */

/* @var Smarty_Internal_Template $_smarty_tpl */
if ($_smarty_tpl->_decodeProperties($_smarty_tpl, array (
  'version' => '3.1.39',
  'unifunc' => 'content_689c6ded05d286_44849178',
  'has_nocache_code' => false,
  'file_dependency' => 
  array (
    '2756f0ec710d1502236d19a479f821cf5d6acbf8' => 
    array (
      0 => '/home/vicorelie/crm.tcerenov-design.com/customerportal/layouts/default/templates/Quotes/partials/DetailContentBefore.tpl',
      1 => 1755006201,
      2 => 'file',
    ),
  ),
  'includes' => 
  array (
  ),
),false)) {
function content_689c6ded05d286_44849178 (Smarty_Internal_Template $_smarty_tpl) {
?>

<div class="col-lg-12 col-md-12 col-sm-12 col-xs-12 ticket-detail-header-row ">
  <h3 class="fsmall">
    <detail-navigator>
      <span>
        <a ng-click="navigateBack(module)" style="font-size:small;">{{ptitle}}</a>
      </span>
    </detail-navigator>
      {{record[header]}}
    <button ng-if="quoteAccepted" translate="Accept Quote" class="btn btn-success close-ticket" ng-click="acceptQuote();"></button>
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
