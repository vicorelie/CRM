/* ********************************************************************************
 * The content of this file is subject to the EMAIL Maker license.
 * ("License"); You may not use this file except in compliance with the License
 * The Initial Developer of the Original Code is IT-Solutions4You s.r.o.
 * Portions created by IT-Solutions4You s.r.o. are Copyright(C) IT-Solutions4You s.r.o.
 * All Rights Reserved.
 ********************************************************************************/

let VTEMAILMakerMailTask = {
    registerEvents() {
        this.sortableSelect2Element();
        this.sortSelect2Element();
        this.registerPDFTemplateChange();
        this.registerSubmit();
    },
    registerPDFTemplateChange() {
        const self = this;

        $('#pdf_template_select').on('change', function() {
            self.updateTemplate();
        });
    },
    sortableSelect2Element: function () {
        const self = this;

        $('#pdf_template_select').select2();
        $('#s2id_pdf_template_select .select2-choices').sortable({
            stop: function () {
                self.updateTemplate();
            }
        });
        self.sortSelect2Element();
    },
    sortSelect2Element: function () {
        let templateValue = $('#pdf_template').val();

        if(!templateValue || 'null' === templateValue) {
            return;
        }

        let selectElement = $('#pdf_template_select'),
            selectData = selectElement.select2('data'),
            sortValues = JSON.parse(templateValue),
            selectDataUpdate = [];

        $.each(sortValues, function (sortIndex, sortId) {
            $.each(selectData, function (optionIndex, optionData) {
                if (sortId === optionData.id) {
                    selectDataUpdate.push(optionData);
                }
            });
        });

        selectElement.select2('data', selectDataUpdate);
    },
    updateTemplate: function () {
        let templateData = $('#pdf_template_select').select2('data'),
            templateVal = [];

        $.each(templateData, function (index, value) {
            templateVal[index] = value.id;
        });

        $('#pdf_template').val(JSON.stringify(templateVal));
    },
    registerSubmit: function () {
        let result = '',
            recipientElement = $('input[name="recepient"]'),
            templateElement = $('select[name="template"]'),
            form = recipientElement.parents('form');

        form.on('submit', function () {
            if (!recipientElement.val()) {
                $('[href="#detailViewLayout"]').trigger('click');
                result = app.vtranslate('JS_REQUIRED_FIELD');
            } else if (!templateElement.val()) {
                $('[href="#relatedTabTemplate"]').trigger('click');
                result = app.vtranslate('JS_REQUIRED_FIELD');
            }

            if (result) {
                app.helper.showErrorNotification({message: result})
            }
        });
    }
}

Settings_Workflows_Edit_Js.prototype.registerVTEMAILMakerMailTaskEvents = function () {
    this.registerFillTaskFromEmailFieldEvent();
    this.registerCcAndBccEvents();

    VTEMAILMakerMailTask.registerEvents();
};