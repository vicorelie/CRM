/*********************************************************************************
 * The content of this file is subject to the Process Flow 4 You license.
 * ("License"); You may not use this file except in compliance with the License
 * The Initial Developer of the Original Code is IT-Solutions4You s.r.o.
 * Portions created by IT-Solutions4You s.r.o. are Copyright(C) IT-Solutions4You s.r.o.
 * All Rights Reserved.
 ********************************************************************************/
/** @var Settings_ITS4YouProcessFlow_Edit_Js */
Settings_Vtiger_Edit_Js('Settings_ITS4YouProcessFlow_Edit_Js', {}, {
    pfContainer: false,
    advanceFilterInstance: false,
    fieldValueMap: false,

    /**
     * Function to get the container which holds all the workflow elements
     * @return jQuery object
     */
    getContainer: function () {
        return this.pfContainer;
    },

    /**
     * Function to set the reports container
     * @params : element - which represents the workflow container
     * @return : current instance
     */
    setContainer: function (element) {
        this.pfContainer = element;
        return this;
    },

    /**
     * Function to set the reports step1 container
     * @params : element - which represents the reports step1 container
     * @return : current instance
     */
    setActionContainer: function (element) {
        this.workFlowsActionContainer = element;
        return this;
    },

    calculateValues: function () {
        var advfilterlist = this.advanceFilterInstance.getValues();
        jQuery('#advanced_filter').val(JSON.stringify(advfilterlist));
    },

    checkExpressionValidation: function (form) {
        var params = {
            'module': app.module(),
            'parent': app.getParentModuleName(),
            'action': 'ValidateExpression',
            'mode': 'ForWorkflowEdit'
        };
        var serializeForm = form.serializeFormData();
        params = jQuery.extend(serializeForm, params);

        app.request.post({'data': params}).then(function (error, data) {
            if (error == null) {
                form.get(0).submit();
            } else {
                jQuery(form).find('button.saveButton').removeAttr('disabled');
                app.helper.showErrorNotification({'message': app.vtranslate('LBL_EXPRESSION_INVALID')});
            }
        });
    },

    /*
     * Function to register the click event for next button
     */
    registerFormSubmitEvent: function () {
        const self = this,
            form = jQuery('#pf_edit'),
            params = {
                submitHandler: function (form) {
                    form = jQuery(form);
                    self.calculateValues();
                    window.onbeforeunload = null;
                    form.find('button.saveButton').attr('disabled', 'disabled');
                    self.checkExpressionValidation(form);

                    return false;
                }
            };
        form.vtValidate(params);
    },
    getPopUp: function (container) {
        var thisInstance = this;
        if (typeof container == 'undefined') {
            container = thisInstance.getContainer();
        }
        var isPopupShowing = false;
        container.on('click', '.getPopupUi', function (e) {
            // Added to prevent multiple clicks event
            if (isPopupShowing) {
                return false;
            }
            var fieldValueElement = jQuery(e.currentTarget);
            var fieldValue = fieldValueElement.val();
            var fieldUiHolder = fieldValueElement.closest('.fieldUiHolder');
            var valueType = fieldUiHolder.find('[name="valuetype"]').val();
            if (valueType == '' || valueType == 'null') {
                valueType = 'rawtext';
            }
            var conditionsContainer = fieldValueElement.closest('.conditionsContainer');
            var conditionRow = fieldValueElement.closest('.conditionRow');

            var clonedPopupUi = conditionsContainer.find('.popupUi').clone(true, true).removeClass('hide').removeClass('popupUi').addClass('clonedPopupUi');
            clonedPopupUi.find('select').addClass('select2');
            clonedPopupUi.find('.fieldValue').val(fieldValue);
            clonedPopupUi.find('.fieldValue').removeClass('hide');
            if (fieldValueElement.hasClass('date')) {
                clonedPopupUi.find('.textType').find('option[value="rawtext"]').attr('data-ui', 'input');
                var dataFormat = fieldValueElement.data('date-format');
                if (valueType == 'rawtext') {
                    var value = fieldValueElement.val();
                } else {
                    value = '';
                }
                var clonedDateElement = '<input type="text" style="width: 30%;" class="dateField fieldValue inputElement" value="' + value + '" data-date-format="' + dataFormat + '" data-input="true" >'
                clonedPopupUi.find('.fieldValueContainer div').prepend(clonedDateElement);
            } else if (fieldValueElement.hasClass('time')) {
                clonedPopupUi.find('.textType').find('option[value="rawtext"]').attr('data-ui', 'input');
                if (valueType == 'rawtext') {
                    var value = fieldValueElement.val();
                } else {
                    value = '';
                }
                var clonedTimeElement = '<input type="text" style="width: 30%;" class="timepicker-default fieldValue inputElement" value="' + value + '" data-input="true" >'
                clonedPopupUi.find('.fieldValueContainer div').prepend(clonedTimeElement);
            } else if (fieldValueElement.hasClass('boolean')) {
                clonedPopupUi.find('.textType').find('option[value="rawtext"]').attr('data-ui', 'input');
                if (valueType == 'rawtext') {
                    var value = fieldValueElement.val();
                } else {
                    value = '';
                }
                var clonedBooleanElement = '<input type="checkbox" style="width: 30%;" class="fieldValue inputElement" value="' + value + '" data-input="true" >';
                clonedPopupUi.find('.fieldValueContainer div').prepend(clonedBooleanElement);

                var fieldValue = clonedPopupUi.find('.fieldValueContainer input').val();
                if (value == 'true:boolean' || value == '') {
                    clonedPopupUi.find('.fieldValueContainer input').attr('checked', 'checked');
                } else {
                    clonedPopupUi.find('.fieldValueContainer input').removeAttr('checked');
                }
            }
            var callBackFunction = function (data) {
                isPopupShowing = false;
                data.find('.clonedPopupUi').removeClass('hide');
                var moduleNameElement = conditionRow.find('[name="modulename"]');
                if (moduleNameElement.length > 0) {
                    var moduleName = moduleNameElement.val();
                    data.find('.useFieldElement').addClass('hide');
                    jQuery(data.find('[name="' + moduleName + '"]').get(0)).removeClass('hide');
                }
                thisInstance.postShowModalAction(data, valueType);
                thisInstance.registerChangeFieldEvent(data);
                thisInstance.registerSelectOptionEvent(data);
                thisInstance.registerPopUpSaveEvent(data, fieldUiHolder);
                thisInstance.registerRemoveModalEvent(data);
                data.find('.fieldValue').filter(':visible').trigger('focus');
            }
            conditionsContainer.find('.clonedPopUp').html(clonedPopupUi);
            jQuery('.clonedPopupUi').on('shown', function () {
                if (typeof callBackFunction == 'function') {
                    callBackFunction(jQuery('.clonedPopupUi', conditionsContainer));
                }
            });
            isPopupShowing = true;
            app.helper.showModal(jQuery('.clonedPopUp', conditionsContainer).find('.clonedPopupUi'), {cb: callBackFunction});
        });
    },

    registerRemoveModalEvent: function (data) {
        data.on('click', '.closeModal', function (e) {
            data.modal('hide');
        });
    },

    registerPopUpSaveEvent: function (data, fieldUiHolder) {
        jQuery('[name="saveButton"]', data).on('click', function (e) {
            var valueType = jQuery('select.textType', data).val();

            fieldUiHolder.find('[name="valuetype"]').val(valueType);
            var fieldValueElement = fieldUiHolder.find('.getPopupUi');
            if (valueType != 'rawtext') {
                fieldValueElement.addClass('ignore-validation');
            } else {
                fieldValueElement.removeClass('ignore-validation');
            }
            var fieldType = data.find('.fieldValue').filter(':visible').attr('type');
            var fieldValue = data.find('.fieldValue').filter(':visible').val();
            //For checkbox field type, handling fieldValue
            if (fieldType == 'checkbox') {
                if (data.find('.fieldValue').filter(':visible').is(':checked')) {
                    fieldValue = 'true:boolean';
                } else {
                    fieldValue = 'false:boolean';
                }
            }
            fieldValueElement.val(fieldValue);
            data.modal('hide');
        });
    },

    registerSelectOptionEvent: function (data) {
        jQuery('.useField,.useFunction', data).on('change', function (e) {
            var currentElement = jQuery(e.currentTarget);
            var newValue = currentElement.val();
            var oldValue = data.find('.fieldValue').filter(':visible').val();
            var textType = currentElement.closest('.clonedPopupUi').find('select.textType').val();
            if (currentElement.hasClass('useField')) {
                //If it is fieldname mode then we need to allow only one field
                if (oldValue != '' && textType != 'fieldname') {
                    var concatenatedValue = oldValue + ' ' + newValue;
                } else {
                    concatenatedValue = newValue;
                }
            } else {
                concatenatedValue = oldValue + newValue;
            }
            data.find('.fieldValue').val(concatenatedValue);
            currentElement.val('').select2("val", '');
        });
    },
    registerChangeFieldEvent: function (data) {
        jQuery('.textType', data).on('change', function (e) {
            var valueType = jQuery(e.currentTarget).val();
            var useFieldContainer = jQuery('.useFieldContainer', data);
            var useFunctionContainer = jQuery('.useFunctionContainer', data);
            var uiType = jQuery(e.currentTarget).find('option:selected').data('ui');
            jQuery('.fieldValue', data).hide();
            jQuery('[data-' + uiType + ']', data).show();
            if (valueType == 'fieldname') {
                useFieldContainer.removeClass('hide');
                useFunctionContainer.addClass('hide');
            } else if (valueType == 'expression') {
                useFieldContainer.removeClass('hide');
                useFunctionContainer.removeClass('hide');
            } else {
                useFieldContainer.addClass('hide');
                useFunctionContainer.addClass('hide');
            }
            jQuery('.helpmessagebox', data).addClass('hide');
            jQuery('#' + valueType + '_help', data).removeClass('hide');
            data.find('.fieldValue').val('');
        });
    },
    postShowModalAction: function (data, valueType) {
        if ('fieldname' === valueType) {
            jQuery('.useFieldContainer', data).removeClass('hide');
            jQuery('.textType', data).val(valueType).trigger('change');
        } else if ('expression' === valueType) {
            jQuery('.useFieldContainer', data).removeClass('hide');
            jQuery('.useFunctionContainer', data).removeClass('hide');
            jQuery('.textType', data).val(valueType).trigger('change');
        }

        jQuery('#' + valueType + '_help', data).removeClass('hide');

        const uiType = jQuery('.textType', data).find('option:selected').data('ui');

        jQuery('.fieldValue', data).hide();
        jQuery('[data-' + uiType + ']', data).show();
    },
    registerEventForShowModuleFilterCondition: function () {
        const self = this,
            moduleInput = jQuery('#module_name');

        moduleInput.on('change', function (e) {
            const currentElement = jQuery(e.currentTarget),
                selectedOption = currentElement.find('option:selected'),
                params = {
                    'module': 'ITS4YouProcessFlow',
                    'parent': 'Settings',
                    'view': 'EditAjax',
                    'mode': 'getProcessFlowConditions',
                    'record': jQuery('input[name="record"]').val(),
                    'module_name': currentElement.val()
                };

            jQuery('#workflowTriggerCreate').html(selectedOption.data('create-label'));
            jQuery('#workflowTriggerUpdate').html(selectedOption.data('update-label'));

            app.helper.showProgress();
            app.request.get({data: params}).then(function (error, data) {
                app.helper.hideProgress();

                self.updateCondition(data);
                self.registerAdvanceFilter();

                app.helper.registerLeavePageWithoutSubmit(jQuery('#pf_edit'));
            });
        });

        moduleInput.trigger('change');
    },
    updateCondition: function (data) {
        const condition = jQuery('#pf_condition');

        condition.html(data);
        vtUtils.applyFieldElementsView(condition);
    },
    registerAdvanceFilter: function () {
        const advanceFilterContainer = jQuery('#advanceFilterContainer');

        this.advanceFilterInstance = ITS4YouProcessFlow_AdvanceFilter_Js.getInstance(jQuery('.filterContainer', advanceFilterContainer));
        this.getPopUp(advanceFilterContainer);
    },
    /**
     * Function to check if the field selected is empty field
     * @params : select element which represents the field
     * @return : boolean true/false
     */
    isEmptyFieldSelected: function (fieldSelect) {
        var selectedOption = fieldSelect.find('option:selected');
        //assumption that empty field will be having value none
        if (selectedOption.val() == 'none') {
            return true;
        }
        return false;
    },
    getValues: function (tasktype) {
        var thisInstance = this;
        var conditionsContainer = jQuery('#save_fieldvaluemapping');
        var fieldListFunctionName = 'get' + tasktype + 'FieldList';
        if (typeof thisInstance[fieldListFunctionName] != 'undefined') {
            var fieldList = thisInstance[fieldListFunctionName].apply()
        }

        var values = [];
        var conditions = jQuery('.conditionRow', conditionsContainer);
        conditions.each(function (i, conditionDomElement) {
            var rowElement = jQuery(conditionDomElement);
            var fieldSelectElement = jQuery('[name="fieldname"]', rowElement);
            var valueSelectElement = jQuery('[data-value="value"]', rowElement);
            //To not send empty fields to server
            if (thisInstance.isEmptyFieldSelected(fieldSelectElement)) {
                return true;
            }
            var fieldDataInfo = fieldSelectElement.find('option:selected').data('fieldinfo');
            var fieldType = fieldDataInfo.type;
            var rowValues = {};
            if (fieldType == 'owner') {
                for (var key in fieldList) {
                    var field = fieldList[key];
                    if (field == 'value' && valueSelectElement.is('select')) {
                        rowValues[field] = valueSelectElement.find('option:selected').val();
                    } else {
                        rowValues[field] = jQuery('[name="' + field + '"]', rowElement).val();
                    }
                }
            } else if (fieldType == 'picklist' || fieldType == 'multipicklist') {
                for (var key in fieldList) {
                    var field = fieldList[key];
                    if (field == 'value' && valueSelectElement.is('input')) {
                        var commaSeperatedValues = valueSelectElement.val();
                        var pickListValues = valueSelectElement.data('picklistvalues');
                        var valuesArr = commaSeperatedValues.split(',');
                        var newvaluesArr = [];
                        for (i = 0; i < valuesArr.length; i++) {
                            if (typeof pickListValues[valuesArr[i]] != 'undefined') {
                                newvaluesArr.push(pickListValues[valuesArr[i]]);
                            } else {
                                newvaluesArr.push(valuesArr[i]);
                            }
                        }
                        var reconstructedCommaSeperatedValues = newvaluesArr.join(',');
                        rowValues[field] = reconstructedCommaSeperatedValues;
                    } else if (field == 'value' && valueSelectElement.is('select') && fieldType == 'picklist') {
                        rowValues[field] = valueSelectElement.val();
                    } else if (field == 'value' && valueSelectElement.is('select') && fieldType == 'multipicklist') {
                        var value = valueSelectElement.val();
                        if (value == null) {
                            rowValues[field] = value;
                        } else {
                            rowValues[field] = value.join(',');
                        }
                    } else {
                        rowValues[field] = jQuery('[name="' + field + '"]', rowElement).val();
                    }
                }

            } else if (fieldType == 'text') {
                for (var key in fieldList) {
                    var field = fieldList[key];
                    if (field == 'value') {
                        rowValues[field] = rowElement.find('textarea').val();
                    } else {
                        rowValues[field] = jQuery('[name="' + field + '"]', rowElement).val();
                    }
                }
            } else {
                for (var key in fieldList) {
                    var field = fieldList[key];
                    if (field == 'value') {
                        rowValues[field] = valueSelectElement.val();
                    } else {
                        rowValues[field] = jQuery('[name="' + field + '"]', rowElement).val();
                    }
                }
            }
            if (jQuery('[name="valuetype"]', rowElement).val() == 'false' || (jQuery('[name="valuetype"]', rowElement).length == 0)) {
                rowValues['valuetype'] = 'rawtext';
            }

            values.push(rowValues);
        });
        return values;
    },

    registerAddFieldEvent: function () {
        jQuery('#addFieldBtn').on('click', function (e) {
            var newAddFieldContainer = jQuery('.basicAddFieldContainer').clone(true, true).removeClass('basicAddFieldContainer hide').addClass('conditionRow');
            jQuery('select', newAddFieldContainer).addClass('select2');
            jQuery('#save_fieldvaluemapping').append(newAddFieldContainer);
            vtUtils.showSelect2ElementView(newAddFieldContainer.find('.select2'));
        });
    },
    registerDeleteConditionEvent: function () {
        jQuery('#saveTask').on('click', '.deleteCondition', function (e) {
            jQuery(e.currentTarget).closest('.conditionRow').remove();
        })
    },
    /**
     * Function which will register field change event
     */
    registerFieldChange: function () {
        var thisInstance = this;
        jQuery('#saveTask').on('change', 'select[name="fieldname"]', function (e) {
            var selectedElement = jQuery(e.currentTarget);
            if (selectedElement.val() != 'none') {
                var conditionRow = selectedElement.closest('.conditionRow');
                var moduleNameElement = conditionRow.find('[name="modulename"]');
                if (moduleNameElement.length > 0) {
                    var selectedOptionFieldInfo = selectedElement.find('option:selected').data('fieldinfo');
                    var type = selectedOptionFieldInfo.type;
                    if (type == 'picklist' || type == 'multipicklist') {
                        var moduleName = jQuery('#createEntityModule').val();
                        moduleNameElement.find('option[value="' + moduleName + '"]').attr('selected', true);
                        moduleNameElement.trigger('change');
                        moduleNameElement.select2("disable");
                    }
                }
                thisInstance.loadFieldSpecificUi(selectedElement);
            }
        });
    },
    getModuleName: function () {
        return app.getModuleName();
    },
    getFieldValueMapping: function () {
        var fieldValueMap = this.fieldValueMap;
        if (fieldValueMap != false) {
            return fieldValueMap;
        } else {
            return '';
        }
    },
    fieldValueReMapping: function () {
        var object = JSON.parse(jQuery('#fieldValueMapping').val());
        var fieldValueReMap = {};

        jQuery.each(object, function (i, array) {
            fieldValueReMap[array.fieldname] = {};
            var values = {}
            jQuery.each(array, function (key, value) {
                values[key] = value;
            });
            fieldValueReMap[array.fieldname] = values
        });
        this.fieldValueMap = fieldValueReMap;
    },

    registerEventForChangeStatus: function () {
        const self = this,
            editViewContainer = this.getEditViewContainer(),
            statusMessage = {message: app.vtranslate('JS_TASK_STATUS_CHANGED')};

        jQuery(editViewContainer).on('switchChange.bootstrapSwitch', '.taskStatus', function (e) {
            const currentElement = jQuery(e.currentTarget);
            let status = 'true';

            if ('on' === currentElement.val()) {
                status = 'false';
                currentElement.attr('value', 'off');
            } else {
                currentElement.attr('value', 'on');
            }

            if (currentElement.data('statusurl')) {
                const url = currentElement.data('statusurl') + "&status=" + status;

                app.helper.showProgress();
                app.request.post({url: url}).then(function (error, data) {
                    app.helper.hideProgress();

                    if (data) {
                        app.helper.showSuccessNotification(statusMessage);
                        self.getTaskList();
                    }
                });
            } else {
                const parent = currentElement.closest('.listViewEntries'),
                    taskElement = parent.find('.taskData'),
                    taskData = JSON.parse(taskElement.val());

                taskData.active = status;
                taskElement.val(JSON.stringify(taskData));
                app.helper.showSuccessNotification(statusMessage);
            }
        });
    },

    registerEnableFilterOption: function () {
        const editViewContainer = this.getEditViewContainer();

        editViewContainer.on('change', '[name="conditionstype"]', function (e) {
            const advanceFilterContainer = jQuery('#advanceFilterContainer'),
                currentRadioButtonElement = jQuery(e.currentTarget);

            if (currentRadioButtonElement.hasClass('recreate')) {
                if (currentRadioButtonElement.is(':checked')) {
                    advanceFilterContainer.removeClass('zeroOpacity');
                    advanceFilterContainer.find('.conditionList').find('[name="columnname"]').find('optgroup:first option:first').attr('selected', 'selected').trigger('change');
                }
            } else {
                advanceFilterContainer.addClass('zeroOpacity');
            }
        });
    },

    addComponents: function () {
        this._super();
        this.addModuleSpecificComponent('Index', 'Vtiger', app.getParentModuleName());
    },

    registerEvents: function () {
        this.registerEventForShowModuleFilterCondition();
        this.registerFormSubmitEvent();
        this.registerEnableFilterOption();
        this.registerEventForChangeStatus();
    }
});

//http://stackoverflow.com/questions/946534/insert-text-into-textarea-with-jquery
jQuery.fn.extend({
    insertAtCaret: function (myValue) {
        return this.each(function (i) {
            if (document.selection) {
                //For browsers like Internet Explorer
                this.focus();
                var sel = document.selection.createRange();
                sel.text = myValue;
                this.focus();
            } else if (this.selectionStart || this.selectionStart == '0') {
                //For browsers like Firefox and Webkit based
                var startPos = this.selectionStart;
                var endPos = this.selectionEnd;
                var scrollTop = this.scrollTop;
                this.value = this.value.substring(0, startPos) + myValue + this.value.substring(endPos, this.value.length);
                this.focus();
                this.selectionStart = startPos + myValue.length;
                this.selectionEnd = startPos + myValue.length;
                this.scrollTop = scrollTop;
            } else {
                this.value += myValue;
                this.focus();
            }
        });
    }
});