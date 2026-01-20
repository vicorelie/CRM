<?php
/* Smarty version 3.1.39, created on 2025-08-13 10:44:43
  from '/home/vicorelie/crm.tcerenov-design.com/customerportal/layouts/default/templates/Portal/partials/UpdatesContent.tpl' */

/* @var Smarty_Internal_Template $_smarty_tpl */
if ($_smarty_tpl->_decodeProperties($_smarty_tpl, array (
  'version' => '3.1.39',
  'unifunc' => 'content_689c6c9b92b535_08498557',
  'has_nocache_code' => false,
  'file_dependency' => 
  array (
    '6def60c9a8a6d84839ce1c68a47cba773721bc54' => 
    array (
      0 => '/home/vicorelie/crm.tcerenov-design.com/customerportal/layouts/default/templates/Portal/partials/UpdatesContent.tpl',
      1 => 1755006199,
      2 => 'file',
    ),
  ),
  'includes' => 
  array (
  ),
),false)) {
function content_689c6c9b92b535_08498557 (Smarty_Internal_Template $_smarty_tpl) {
?>

<div class="row">
	<div class="container-fluid">
		<div class="col-lg-12 col-md-12 col-sm-12 col-xs-12">
			<div class="container-fluid updatesContainer">
				<div class="row">
					<div class="col-lg-12 col-md-12 col-sm-12 col-xs-12">
						<div class="container-fluid">
							<div class="row" ng-show="updates === ''">
								<span class="value">No Updates Found.</span>
							</div>
							<div class="row update-row" ng-repeat="update in updates" ng-if="isLanguage(update)">

								<div class="col-lg-12 col-md-12 col-sm-12 col-xs-12" ng-repeat="(fieldname,value) in update" ng-if="isLanguage(update)">
									<p ng-if="value.updateStatus=='updated'">
										<span class="update-bullet">&nbsp;</span>
										<strong> {{fieldname}} </strong>
										<span class="value">
											<span ng-if="value.previous!==''">&nbsp;{{'changed from'|translate}}&nbsp;
												<strong class="break" style="white-space:pre-line;">{{value.previous}}&nbsp;</strong>
												<span ng-if="value.current!==''">&nbsp;{{'to'|translate}}&nbsp;</span>
											</span>
										</span>
										<span class="value">
											<span ng-if="value.previous =='' && value.current!==''">&nbsp;{{'changed to'|translate}}&nbsp;</span>
											<strong class="break" style="white-space:pre-line;">{{value.current}}</strong>
										</span>
										<span class="value">
											<span ng-if="value.previous =='' && value.current==''">&nbsp;{{'deleted'|translate}}&nbsp;</span>
										</span>
										<small class="text-muted update-time">{{update.modifiedtime}}</small>
									</p>
									<p ng-if="value.updateStatus=='created'">
										<span class="update-bullet">&nbsp;</span>
										<span>
											<strong>{{update.created.user}}</strong>&nbsp;{{'created'|translate}}</span>
										<small class="text-muted update-time">{{update.modifiedtime}}</small>
									</p>
								</div>
							</div>
							<a ng-if="!updatesLoaded && !noUpdates  && created" ng-click="loadHistoryPage(historyPageNo)">{{'more'|translate}}...</a>
							<p ng-if="updatesLoaded && !noUpdates" class="text-muted">{{'No more updates'|translate}}</p>
							<p ng-if="!updatesLoaded && noUpdates" class="text-muted">{{'No updates'|translate}}</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>

<?php }
}
