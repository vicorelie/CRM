{*/*<!--
/*********************************************************************************
 * The content of this file is subject to the Reports 4 You license.
 * ("License"); You may not use this file except in compliance with the License
 * The Initial Developer of the Original Code is IT-Solutions4You s.r.o.
 * Portions created by IT-Solutions4You s.r.o. are Copyright(C) IT-Solutions4You s.r.o.
 * All Rights Reserved.
 ********************************************************************************/
-->*/*}
<script type="text/javascript">
jQuery().ready(function() {
    var ITS4YouKeyMetrics_Js = new ITS4YouKeyMetrics_List_Js();
    ITS4YouKeyMetrics_Js.registerEditKeyMetricsRowStep2();
    ITS4YouKeyMetrics_Js.registerEditKeyMetricsRowStep3();
});
</script>

{strip}
	<div class="main-container clearfix">
		<div id="modnavigator" class="module-nav editViewModNavigator">
			<div class="hidden-xs hidden-sm mod-switcher-container">
				{include file="partials/Menubar.tpl"|vtemplate_path:$MODULE}
			</div>
		</div>
		<div class="editViewPageDiv viewContent">
			<div class="col-sm-12 col-xs-12 content-area {if $LEFTPANELHIDE eq '1'} full-width {/if}">
				<form class="form-horizontal recordEditView" id="addKeyMetricsWidget" name="edit" method="post" action="index.php" >
                    <input type="hidden" name="module" value="{$MODULE}" />
                    
					<input type="hidden" name="id" value="{$ID}" />
                    <input type="hidden" name="km_id" id="km_id" value="{$KM_ID}">
                    <div class="modal-body">

                        <div name='editContent'>
                            {include file='modules/ITS4YouKeyMetrics/KeyMetricsRowStep.tpl'}
                        </div>

                    </div>

					<div class='modal-overlay-footer clearfix'>
						<div class="row clearfix">
							<div class='textAlignCenter col-lg-12 col-md-12 col-sm-12 '>
								<button type='submit' class='btn btn-success saveButton' >{vtranslate('LBL_SAVE', $MODULE)}</button>&nbsp;&nbsp;
								<a class='cancelLink' href="javascript:history.{if $DUPLICATE_RECORDS}go(-2){else}back(){/if}" type="reset">{vtranslate('LBL_CANCEL', $MODULE)}</a>
							</div>
						</div>
					</div>
				</form>

			</div>
		</div>
	</div>
{/strip}