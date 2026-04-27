{*<!--
/*********************************************************************************
* The content of this file is subject to the Process Flow 4 You.
* ("License"); You may not use this file except in compliance with the License
* The Initial Developer of the Original Code is IT-Solutions4You s.r.o.
* Portions created by IT-Solutions4You s.r.o. are Copyright(C) IT-Solutions4You s.r.o.
* All Rights Reserved.
********************************************************************************/
-->*}
{strip}
    <input type="hidden" name="conditions" id="advanced_filter" value=''/>
    <div class="editViewHeader">
        <div class='row'>
            <div class="col-lg-12 col-md-12 col-lg-pull-0">
                <h4>{vtranslate('LBL_PROCESSFLOW_CONDITION', $QUALIFIED_MODULE)}</h4>
            </div>
        </div>
    </div>
    <hr style="margin-top: 0px !important;">
    <div class="editViewBody">
        <div class="editViewContents" style="padding-bottom: 0px;">
            <div class="form-group">
                <div class="col-sm-12">
                    <div id="advanceFilterContainer" class="conditionsContainer">
                        <div class="col-sm-12">
                            <div class="table table-bordered" style="padding: 5%">
                                {include file='AdvanceFilter.tpl'|@vtemplate_path:$QUALIFIED_MODULE RECORD_STRUCTURE=$RECORD_STRUCTURE}
                            </div>
                        </div>
                        {include file="FieldExpressions.tpl"|@vtemplate_path:$QUALIFIED_MODULE EXECUTION_CONDITION=$RECORD_MODEL->get('execution_condition')}
                    </div>
                </div>
            </div>
        </div>
    </div>
{/strip}
