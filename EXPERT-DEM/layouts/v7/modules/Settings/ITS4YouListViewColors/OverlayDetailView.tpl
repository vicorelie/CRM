{*<!--
/*********************************************************************************
* The content of this file is subject to the Dynamic Fields 4 You.
* ("License"); You may not use this file except in compliance with the License
* The Initial Developer of the Original Code is IT-Solutions4You s.r.o.
* Portions created by IT-Solutions4You s.r.o. are Copyright(C) IT-Solutions4You s.r.o.
* All Rights Reserved.
********************************************************************************/
-->*}
<div class='fc-overlay-modal overlayDetail'>
    <div class="modal-content" style="overflow: hidden">
        <div class="overlayDetailHeader col-lg-12 col-md-12 col-sm-12">
            <div class="col-lg-9 col-md-9 col-sm-9">
                <h4>{vtranslate($MODULE, $QUALIFIED_MODULE)}</h4>
            </div>
            <div class="col-lg-2 col-md-2 col-sm-2">
                <div class="clearfix">
                    <div class="btn-group">
                        <button class="btn btn-default fullDetailsButton" onclick="window.location.href = '{$RECORD_MODEL->getDetailViewUrl()}'">
                            {vtranslate('LBL_DETAILS',$MODULE_NAME)}</button>
                        <button class="btn btn-default editRelatedRecord" data-url="{$RECORD_MODEL->getEditViewUrl()}">{vtranslate('LBL_EDIT',$MODULE_NAME)}</button>
                    </div>
                    <div class="pull-right">
                        <button type="button" class="close" aria-label="Close" data-dismiss="modal">
                            <span aria-hidden="true" class='fa fa-close'></span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
        <div class='modal-body'>
            <div class="detailViewContainer">
                {include file='DetailView.tpl'|@vtemplate_path:$QUALIFIED_MODULE IS_OVERLAY="yes"}
            </div>
        </div>
    </div>
</div>