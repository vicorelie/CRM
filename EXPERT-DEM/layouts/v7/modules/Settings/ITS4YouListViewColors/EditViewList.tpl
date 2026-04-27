{strip}
    <br>
    <br>
    <div class='row'>
        <div class="col-lg-12 col-md-12 col-lg-pull-0">
            <h4 class="fieldBlockHeader">{vtranslate('LBL_LIST_SETTINGS', $MODULE)}</h4>
        </div>
    </div>
    <hr style="margin-top: 0 !important;">
    <div class="form-group">
        <label class="control-label col-lg-3">{vtranslate('LBL_TYPE', $MODULE)}</label>
        <div class="col-sm-5 controls">
            <select class="select2 inputElement" id="coloring_type" name="coloring_type">
                {html_options  options=$COLORING_TYPES selected=$RECORD_MODEL->get('coloring_type')}
            </select>
        </div>
    </div>
    <div class="form-group">
        <label class="control-label col-lg-3">{vtranslate('LBL_SELECT_COLOR', $MODULE)}<span class="redColor">*</span></label>
        <div class="controls col-lg-5">
            <input class="form-control selectedColor" id="selectedColor" name="color" value="{$RECORD_MODEL->get('color')}" data-rule-required="true">
            <div class="LVCColorPicker" data-input="#selectedColor" style="margin: 1rem auto;"></div>
        </div>
    </div>
{/strip}