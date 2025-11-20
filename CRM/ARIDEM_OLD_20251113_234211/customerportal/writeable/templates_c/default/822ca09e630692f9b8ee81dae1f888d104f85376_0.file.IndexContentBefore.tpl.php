<?php
/* Smarty version 3.1.39, created on 2025-08-13 10:50:14
  from '/home/vicorelie/crm.tcerenov-design.com/customerportal/layouts/default/templates/Portal/partials/IndexContentBefore.tpl' */

/* @var Smarty_Internal_Template $_smarty_tpl */
if ($_smarty_tpl->_decodeProperties($_smarty_tpl, array (
  'version' => '3.1.39',
  'unifunc' => 'content_689c6de6eb8ad1_02984192',
  'has_nocache_code' => false,
  'file_dependency' => 
  array (
    '822ca09e630692f9b8ee81dae1f888d104f85376' => 
    array (
      0 => '/home/vicorelie/crm.tcerenov-design.com/customerportal/layouts/default/templates/Portal/partials/IndexContentBefore.tpl',
      1 => 1755006199,
      2 => 'file',
    ),
  ),
  'includes' => 
  array (
  ),
),false)) {
function content_689c6de6eb8ad1_02984192 (Smarty_Internal_Template $_smarty_tpl) {
?>

<div class="navigation-controls-row">
<div ng-if="checkRecordsVisibility(filterPermissions)" class="panel-title col-md-12 module-title">{{ptitle}}
</div>
</div>
    <div class="row portal-controls-row">
        <div class="col-lg-2 col-md-2 col-sm-8 col-xs-8">
		<div ng-if="!checkRecordsVisibility(filterPermissions)" class="panel-title col-md-12 module-title">{{ptitle}}</div>
            <div class="btn-group btn-group-justified" ng-if="checkRecordsVisibility(filterPermissions)">
                <div class="btn-group">
                    <button type="button" translate="Mine"
                            ng-class="{'btn btn-default btn-primary':searchQ.onlymine, 'btn btn-default':!searchQ.onlymine}" ng-click="searchQ.onlymine=true"></button>
                </div>
                <div class="btn-group">
                    <button type="button" translate = "All"
                            ng-class="{'btn btn-default btn-primary':!searchQ.onlymine, 'btn btn-default':searchQ.onlymine}" ng-click="searchQ.onlymine=false"></button>
                </div>
            </div>
        </div>
        <div class="col-lg-2 col-md-2 col-sm-4 col-xs-4">
          <div class="addbtnContainer" ng-if="isCreatable">
            <button class="btn btn-primary" ng-click="createRecord(module)">New {{ptitle}}</button>
          </div>
        </div>
        <div class="col-lg-3 col-md-3 col-sm-4 col-xs-4">
          &nbsp;
        </div>
        <div class="col-lg-2 col-md-2 col-sm-12 col-xs-12">
          <button class="btn btn-primary" ng-if="exportEnabled" ng-csv="exportRecords(module)" csv-header="csvHeaders" add-bom="true" filename="{{filename}}.csv">{{'Export'|translate}}&nbsp;{{ptitle}}</button>
        </div>
        <div class="col-lg-3 col-md-3 col-sm-12 col-xs-12 pagination-holder">
            <div class="pull-right">
                <div class="text-center">
                    <pagination
                        total-items="totalPages" max-size="3" ng-model="currentPage" ng-change="pageChanged(currentPage)" boundary-links="true">
                    </pagination>
                </div>
            </div>
        </div>
    </div>

<?php }
}
