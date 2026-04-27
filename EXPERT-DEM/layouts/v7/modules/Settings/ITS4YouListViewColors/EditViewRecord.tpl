{strip}
    <br>
    <div class='row'>
        <div class="col-lg-12 col-md-12 col-lg-pull-0">
            <h4 class="fieldBlockHeader">{vtranslate('LBL_PREVIEW', $MODULE)}</h4>
        </div>
    </div>
    <hr style="margin-top: 0 !important;">
    <div style="padding: 0 1.5rem">
        <div class="row">
            <div class="col-lg-3 LVCFieldLabel" style="padding: 1rem; text-align: right; font-weight: bold;">
                {vtranslate('LBL_FIELD_LABEL', $MODULE)}
            </div>
            <div class="col-lg-5 LVCFieldValue" style="padding: 1rem;">
                {vtranslate('LBL_FIELD_VALUE', $MODULE)}
            </div>
        </div>
    </div>
    <br>
    <div class='row'>
        <div class="col-lg-12 col-md-12 col-lg-pull-0">
            <h4 class="fieldBlockHeader">{vtranslate('LBL_RECORD_SETTINGS', $MODULE)}</h4>
        </div>
    </div>
    <hr style="margin-top: 0 !important;">
    <input id="record_status" name="record_status" type="hidden" value="1">
    <div class="form-group">
        <label class="control-label col-lg-3">{vtranslate('LBL_LABEL_COLOR', $MODULE)}</label>
        <div class="controls col-lg-5">
            <input class="form-control selectedColor" id="labelColor" name="record_colors[label_color]" value="{$RECORD_MODEL->getRecordColors('label_color')}">
            <div class="LVCColorPicker" data-input="#labelColor" style="margin: 1rem auto;"></div>
        </div>
    </div>
    <div class="form-group">
        <label class="control-label col-lg-3">{vtranslate('LBL_LABEL_BACKGROUND', $MODULE)}</label>
        <div class="controls col-lg-5">
            <input class="form-control selectedColor" id="labelBackground" name="record_colors[label_background]" value="{$RECORD_MODEL->getRecordColors('label_background')}">
            <div class="LVCColorPicker" data-input="#labelBackground" style="margin: 1rem auto;"></div>
        </div>
    </div>
    <div class="form-group">
        <label class="control-label col-lg-3">{vtranslate('LBL_VALUE_COLOR', $MODULE)}</label>
        <div class="controls col-lg-5">
            <input class="form-control selectedColor" id="valueColor" name="record_colors[value_color]" value="{$RECORD_MODEL->getRecordColors('value_color')}">
            <div class="LVCColorPicker" data-input="#valueColor" style="margin: 1rem auto;"></div>
        </div>
    </div>
    <div class="form-group record-colors">
        <label class="control-label col-lg-3">{vtranslate('LBL_VALUE_BACKGROUND', $MODULE)}</label>
        <div class="controls col-lg-5">
            <input class="form-control selectedColor" id="valueBackground" name="record_colors[value_background]" value="{$RECORD_MODEL->getRecordColors('value_background')}">
            <div class="LVCColorPicker" data-input="#valueBackground" style="margin: 1rem auto;"></div>
        </div>
    </div>
    <br>
{/strip}