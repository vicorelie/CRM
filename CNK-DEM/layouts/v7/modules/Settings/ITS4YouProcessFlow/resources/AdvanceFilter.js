/*********************************************************************************
 * The content of this file is subject to the Process Flow 4 You license.
 * ("License"); You may not use this file except in compliance with the License
 * The Initial Developer of the Original Code is IT-Solutions4You s.r.o.
 * Portions created by IT-Solutions4You s.r.o. are Copyright(C) IT-Solutions4You s.r.o.
 * All Rights Reserved.
 ********************************************************************************/
/** @var ITS4YouProcessFlow_AdvanceFilter_Js */
Vtiger_AdvanceFilter_Js('ITS4YouProcessFlow_AdvanceFilter_Js', {
    picklistFields: {},
    getOptionsFields: function (type) {
        const conditionListOptions = jQuery('.allConditionContainer .basic [name="columnname"]').find('option').clone();

        return conditionListOptions.filter(function (index, element) {
            const option = jQuery(element),
                fieldInfo = option.data('fieldinfo')

            if (fieldInfo && type === fieldInfo['type']) {
                return true;
            }

            return false;
        });
    },
    getPicklistFields: function (type, name, value) {
        const self = this,
            html = jQuery('<select class="inputElement select2" type="text"></select>');

        html.html(self.getOptionsFields(type));
        html.attr('name', name);
        html.attr('value', value);
        html.after('<input type="hidden" name="valuetype" value="' + type + '">');

        return html;
    },
}, {

    validationSupportedFieldConditionMap: {
        'email': ['e', 'n'],
        'date': ['is'],
        'datetime': ['is']
    },
    //Hols field type for which there is validations always needed
    allConditionValidationNeededFieldList: ['double', 'integer'],

    // comparators which do not have any field Specific UI.
    comparatorsWithNoValueBoxMap: ['has changed', 'is empty', 'is not empty', 'is added'],

    getFieldSpecificType: function (fieldSelected) {
        var fieldInfo = fieldSelected.data('fieldinfo');
        var type = fieldInfo.type;
        var workflowModule = jQuery('#advanceFilterContainer').find('[name="module_name"]').val();
        if (workflowModule == 'Calendar') {
            if (fieldInfo.name == 'due_date') {
                type = 'date';
            }
        }
        return type;
    },

    getModuleName: function () {
        return app.getModuleName();
    },


    /**
     * Function to add new condition row
     * @params : condtionGroupElement - group where condtion need to be added
     * @return : current instance
     */
    addNewCondition: function (conditionGroupElement) {
        var basicElement = jQuery('.basic', conditionGroupElement);
        var newRowElement = basicElement.find('.conditionRow').clone(true, true);
        jQuery('select', newRowElement).addClass('select2');
        var conditionList = jQuery('.conditionList', conditionGroupElement);
        conditionList.append(newRowElement);

        //change in to chosen elements
        vtUtils.showSelect2ElementView(newRowElement.find('select.select2'));
        newRowElement.find('[name="columnname"]').find('optgroup:first option:first').attr('selected', 'selected').trigger('change');
        return this;
    },

    /**
     * Function to load condition list for the selected field
     * (overrrided to remove "has changed" condition for related record fields in ITS4YouProcessFlow)
     * @params : fieldSelect - select element which will represents field list
     * @return : select element which will represent the condition element
     */
    loadConditions: function (fieldSelect) {
        const row = fieldSelect.closest('div.conditionRow'),
            conditionSelectElement = row.find('select[name="comparator"]'),
            conditionSelected = conditionSelectElement.val(),
            fieldSelected = fieldSelect.find('option:selected'),
            fieldLabel = fieldSelected.val(),
            match = fieldLabel.match(/\((\w+)\) (\w+)/),
            fieldSpecificType = this.getFieldSpecificType(fieldSelected);

        let conditionList = this.getConditionListFromType(fieldSpecificType);
        //for none in field name
        if (typeof conditionList == 'undefined') {
            conditionList = {};
            conditionList['none'] = '';
        }

        let options = '';
        for (let key in conditionList) {
            //IE Browser consider the prototype properties also, it should consider has own properties only.
            if (conditionList.hasOwnProperty(key)) {
                const conditionValue = conditionList[key],
                    conditionLabel = this.getConditionLabel(conditionValue);

                if (match != null) {
                    if ('has changed' !== conditionValue) {
                        options += '<option value="' + conditionValue + '"';

                        if (conditionValue === conditionSelected) {
                            options += ' selected="selected" ';
                        }

                        options += '>' + conditionLabel + '</option>';
                    }
                } else {
                    options += '<option value="' + conditionValue + '"';

                    if (conditionValue === conditionSelected) {
                        options += ' selected="selected" ';
                    }

                    options += '>' + conditionLabel + '</option>';
                }
            }
        }

        conditionSelectElement.empty().html(options).trigger('change');
        // adding validation to comparator field
        conditionSelectElement.addClass('validate[required]');

        return conditionSelectElement;
    },

    /**
     * Function to retrieve the values of the filter
     * @return : object
     */
    getValues: function () {
        var thisInstance = this;
        var filterContainer = this.getFilterContainer();

        var fieldList = new Array('columnname', 'comparator', 'value', 'valuetype', 'column_condition');

        var values = {};
        var columnIndex = 0;
        var conditionGroups = jQuery('.conditionGroup', filterContainer);
        conditionGroups.each(function (index, domElement) {
            var groupElement = jQuery(domElement);

            var conditions = jQuery('.conditionList .conditionRow', groupElement);
            if (conditions.length <= 0) {
                return true;
            }

            var iterationValues = {};
            conditions.each(function (i, conditionDomElement) {
                var rowElement = jQuery(conditionDomElement);
                var fieldSelectElement = jQuery('[name="columnname"]', rowElement);
                var valueSelectElement = jQuery('[data-value="value"]', rowElement);
                //To not send empty fields to server
                if (thisInstance.isEmptyFieldSelected(fieldSelectElement)) {
                    return true;
                }
                var fieldDataInfo = fieldSelectElement.find('option:selected').data('fieldinfo');
                var fieldType = fieldDataInfo.type;
                var rowValues = {};
                if (fieldType == 'picklist' || fieldType == 'multipicklist') {
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
                } else {
                    for (var key in fieldList) {
                        var field = fieldList[key];
                        if (field == 'value') {
                            if ((fieldType == 'date' || fieldType == 'datetime') && valueSelectElement.length > 0) {
                                var value = valueSelectElement.val();
                                var dateFormat = app.getDateFormat();
                                var dateFormatParts = dateFormat.split("-");
                                var valueArray = value.split(',');
                                for (i = 0; i < valueArray.length; i++) {
                                    var valueParts = valueArray[i].split("-");
                                    var dateInstance = new Date(valueParts[dateFormatParts.indexOf('yyyy')], parseInt(valueParts[dateFormatParts.indexOf('mm')]) - 1, valueParts[dateFormatParts.indexOf('dd')]);
                                    if (!isNaN(dateInstance.getTime())) {
                                        valueArray[i] = app.getDateInVtigerFormat('yyyy-mm-dd', dateInstance);
                                    }
                                }
                                rowValues[field] = valueArray.join(',');
                            } else {
                                rowValues[field] = valueSelectElement.val();
                            }
                        } else {
                            rowValues[field] = jQuery('[name="' + field + '"]', rowElement).val();
                        }
                    }
                }

                if (jQuery('[name="valuetype"]', rowElement).val() == 'false' || (jQuery('[name="valuetype"]', rowElement).length == 0)) {
                    rowValues['valuetype'] = 'rawtext';
                }

                if (index == '0') {
                    rowValues['groupid'] = '0';
                } else {
                    rowValues['groupid'] = '1';
                }

                if (rowElement.is(":last-child")) {
                    rowValues['column_condition'] = '';
                }
                iterationValues[columnIndex] = rowValues;
                columnIndex++;
            });

            if (!jQuery.isEmptyObject(iterationValues)) {
                values[index + 1] = {};
                //values[index+1]['columns'] = {};
                values[index + 1]['columns'] = iterationValues;
            }
            if (groupElement.find('div.groupCondition').length > 0 && !jQuery.isEmptyObject(values[index + 1])) {
                values[index + 1]['condition'] = conditionGroups.find('div.groupCondition [name="condition"]').val();
            }
        });
        return values;

    },

    /**
     * Functiont to get the field specific ui for the selected field
     * @prarms : fieldSelectElement - select element which will represents field list
     * @return : jquery object which represents the ui for the field
     */
    getFieldSpecificUi: function (fieldSelectElement) {
        var fieldSelected = fieldSelectElement.find('option:selected');
        var fieldInfo = fieldSelected.data('fieldinfo');
        if (jQuery.inArray(fieldInfo.comparatorElementVal, this.comparatorsWithNoValueBoxMap) != -1) {
            return jQuery('');
        } else {
            return this._super(fieldSelectElement);
        }
    }
});

Vtiger_Field_Js('ITS4YouProcessFlow_Field_Js', {}, {

    getUiTypeSpecificHtml: function () {
        var uiTypeModel = this.getUiTypeModel();
        return uiTypeModel.getUi();
    },

    getModuleName: function () {
        var currentModule = app.getModuleName();
        return currentModule;
    },

    /**
     * Funtion to get the ui for the field  - generally this will be extend by the child classes to
     * give ui type specific ui
     * return <String or Jquery> it can return either plain html or jquery object
     */
    getUi: function () {
        var html = '<input type="text" class="getPopupUi inputElement" name="' + this.getName() + '"  /><input type="hidden" name="valuetype" value="' + this.get('workflow_valuetype') + '" />';
        html = jQuery(html);
        html.filter('.getPopupUi').val(app.htmlDecode(this.getValue()));
        return this.addValidationToElement(html);
    }
});
ITS4YouProcessFlow_Field_Js('ITS4YouProcessFlow_Text_Field_Js', {}, {
    getUi: function () {
        var html = '<textarea class="getPopupUi textarea inputElement" name="' + this.getName() + '" value="">' + this.getValue() + '</textarea>' +
            '<input type="hidden" name="valuetype" value="' + this.get('workflow_valuetype') + '" />';
        html = jQuery(html);
        return this.addValidationToElement(html);
    }
});
/** @var ITS4YouProcessFlow_Integer_Field_Js */
Vtiger_Integer_Field_Js('ITS4YouProcessFlow_Integer_Field_Js', {}, {
    getUi: function () {
        let comparatorSelectedOptionVal = this.get('comparatorElementVal');

        if (0 <= jQuery.inArray(comparatorSelectedOptionVal, ['is field', 'is not field', 'is more than field', 'is less then field'])) {
            return ITS4YouProcessFlow_AdvanceFilter_Js.getPicklistFields('integer', this.getName(), this.getValue());
        } else {
            return this._super();
        }
    },

});
/** @var ITS4YouProcessFlow_Date_Field_Js */
Vtiger_Date_Field_Js('ITS4YouProcessFlow_Date_Field_Js', {}, {

    /**
     * Function to get the user date format
     */
    getDateFormat: function () {
        return this.get('date-format');
    },

    /**
     * Function to get the ui
     * @return - input text field
     */
    getUi: function () {
        let comparatorSelectedOptionVal = this.get('comparatorElementVal'),
            dateSpecificConditions = this.get('dateSpecificConditions'),
            html, element;

        if (comparatorSelectedOptionVal.length > 0) {
            if (0 <= jQuery.inArray(comparatorSelectedOptionVal, ['between', 'custom',])) {
                html = '<div class="date"><input class="dateField inputElement" style="width:auto;" data-calendar-type="range" name="' + this.getName() + '" data-date-format="' + this.getDateFormat() + '" type="text" ReadOnly="true" value="' + this.getValue() + '"></div>';
                element = jQuery(html);

                return this.addValidationToElement(element);
            } else if (this._specialDateComparator(comparatorSelectedOptionVal)) {
                html = '<input class="inputElement" name="' + this.getName() + '" type="text" value="' + this.getValue() + '" data-validation-engine="validate[funcCall[Vtiger_Base_Validator_Js.invokeValidation]]" data-validator="[{"name":"PositiveNumber"}]">\n\
							<input type="hidden" name="valuetype" value="' + this.get('workflow_valuetype') + '" />';

                return jQuery(html);
            } else if (comparatorSelectedOptionVal in dateSpecificConditions) {
                let startValue = dateSpecificConditions[comparatorSelectedOptionVal]['startdate'],
                    endValue = dateSpecificConditions[comparatorSelectedOptionVal]['enddate'];

                html = '<input name="' + this.getName() + '"  type="text" ReadOnly="true" value="' + startValue + ',' + endValue + '">';

                return jQuery(html);
            } else if (0 <= jQuery.inArray(comparatorSelectedOptionVal, ['is today', 'is tomorrow', 'is yesterday',])) {
                //show nothing
            } else if (0 <= jQuery.inArray(comparatorSelectedOptionVal, ['is field', 'is not field', 'is more than field', 'is less then field'])) {
                return ITS4YouProcessFlow_AdvanceFilter_Js.getPicklistFields('date', this.getName(), this.getValue());
            } else {
                return this._super();
            }
        } else {
            html = '<input type="text" class="getPopupUi date inputElement" name="' + this.getName() + '"  data-date-format="' + this.getDateFormat() + '"  value="' + this.getValue() + '" />' +
                '<input type="hidden" name="valuetype" value="' + this.get('workflow_valuetype') + '" />'
            element = jQuery(html);

            return this.addValidationToElement(element);
        }
    },
    _specialDateComparator: function (comp) {
        var specialComparators = ['less than days ago', 'more than days ago', 'in less than', 'in more than', 'days ago', 'days later', 'less than days later', 'more than days later'];
        for (var index in specialComparators) {
            if (comp == specialComparators[index]) {
                return true;
            }
        }
        return false;
    }
});

Vtiger_Date_Field_Js('ITS4YouProcessFlow_Datetime_Field_Js', {}, {
    /**
     * Function to get the user date format
     */
    getDateFormat: function () {
        return this.get('date-format');
    },

    /**
     * Function to get the ui
     * @return - input text field
     */
    getUi: function () {
        var comparatorSelectedOptionVal = this.get('comparatorElementVal');
        if (this._specialDateTimeComparator(comparatorSelectedOptionVal)) {
            var html = '<input name="' + this.getName() + '" class="inputElement" type="text" value="' + this.getValue() + '" data-validator="[{name:PositiveNumber}]"><input type="hidden" name="valuetype" value="' + this.get('workflow_valuetype') + '" />';
            var element = jQuery(html);
        } else if (comparatorSelectedOptionVal == 'is today' || comparatorSelectedOptionVal == 'is tomorrow' || comparatorSelectedOptionVal == 'is yesterday') {
            // show nothing
        } else {
            var html = '<input type="text" class="getPopupUi datetime inputElement" name="' + this.getName() + '"  data-date-format="' + this.getDateFormat() + '"  value="' + this.getValue() + '" />' +
                '<input type="hidden" name="valuetype" value="' + this.get('workflow_valuetype') + '" />'
            var element = jQuery(html);
        }
        return element;
    },

    _specialDateTimeComparator: function (comp) {
        var specialComparators = ['less than hours before', 'less than hours later', 'more than hours later', 'more than hours before', 'less than days ago', 'less than days later', 'more than days ago', 'more than days later', 'days ago', 'days later'];
        for (var index in specialComparators) {
            if (comp == specialComparators[index]) {
                return true;
            }
        }
        return false;
    }

});

Vtiger_Currency_Field_Js('ITS4YouProcessFlow_Currency_Field_Js', {}, {

    getUi: function () {
        var html = '<input type="text" class="getPopupUi marginLeftZero currency inputElement" name="' + this.getName() + '" value="' + this.getValue() + '"  />' +
            '<input type="hidden" name="valuetype" value="' + this.get('workflow_valuetype') + '" />';
        var element = jQuery(html);
        return this.addValidationToElement(element);
    }

});

Vtiger_Time_Field_Js('ITS4YouProcessFlow_Time_Field_Js', {}, {

    /**
     * Function to get the ui
     * @return - input text field
     */
    getUi: function () {
        var html = '<input type="text" class="getPopupUi time inputElement" name="' + this.getName() + '"  value="' + this.getValue() + '" />' +
            '<input type="hidden" name="valuetype" value="' + this.get('workflow_valuetype') + '" />';
        var element = jQuery(html);
        return this.addValidationToElement(element);
    }
});

Vtiger_Field_Js('Vtiger_Percentage_Field_Js', {}, {

    /**
     * Function to get the ui
     * @return - input percentage field
     */
    getUi: function () {
        var html = '<input type="text" class="getPopupUi percent inputElement" name="' + this.getName() + '" value="' + this.getValue() + '" />' +
            '<input type="hidden" name="valuetype" value="' + this.get('workflow_valuetype') + '" />';
        var element = jQuery(html);
        return this.addValidationToElement(element);
    }
});

Vtiger_Field_Js('Vtiger_Text_Field_Js', {}, {

    /**
     * Function to get the ui
     * @return - input text field
     */
    getUi: function () {
        var html = '<input type="text" class="getPopupUi text inputElement" name="' + this.getName() + '" value="' + this.getValue() + '" />' +
            '<input type="hidden" name="valuetype" value="' + this.get('workflow_valuetype') + '" />';
        var element = jQuery(html);
        return this.addValidationToElement(element);
    }
});

Vtiger_Field_Js('Vtiger_Boolean_Field_Js', {}, {

    /**
     * Function to get the ui
     * @return - input text field
     */
    getUi: function () {
        var html = '<input type="text" class="getPopupUi boolean inputElement" name="' + this.getName() + '" value="' + this.getValue() + '" />' +
            '<input type="hidden" name="valuetype" value="' + this.get('workflow_valuetype') + '" />';
        var element = jQuery(html);
        return this.addValidationToElement(element);
    }
});

Vtiger_Owner_Field_Js('ITS4YouProcessFlow_Owner_Field_Js', {}, {

    getUi: function () {
        var html = '<select class="inputElement select2" name="' + this.getName() + '">';
        html += '<option value="">&nbsp;</option>';
        var pickListValues = this.getPickListValues();
        var selectedOption = this.getValue();
        for (var optGroup in pickListValues) {
            html += '<optgroup label="' + optGroup + '">';
            var optionGroupValues = pickListValues[optGroup];
            for (var option in optionGroupValues) {
                html += '<option value="' + option + '" ';
                if (option == selectedOption) {
                    html += ' selected ';
                }
                html += '>' + optionGroupValues[option] + '</option>';
            }
            html += '</optgroup>'
        }

        html += '</select>';
        var selectContainer = jQuery(html);
        this.addValidationToElement(selectContainer);
        return selectContainer;
    }
});

Vtiger_Owner_Field_Js('ITS4YouProcessFlow_Ownergroup_Field_Js', {}, {
    getUi: function () {
        var html = '<select class="select2 inputElement" name="' + this.getName() + '" id="field_' + this.getModuleName() + '_' + this.getName() + '">';
        var pickListValues = this.getPickListValues();
        var selectedOption = this.getValue();
        html += '<option value=""></option>';
        for (var option in pickListValues) {
            html += '<option value="' + option + '" ';
            if (option == selectedOption) {
                html += ' selected ';
            }
            html += '>' + pickListValues[option] + '</option>';
        }
        html += '</select>';
        var selectContainer = jQuery(html);
        this.addValidationToElement(selectContainer);
        return selectContainer;
    }
});

Vtiger_Picklist_Field_Js('ITS4YouProcessFlow_Picklist_Field_Js', {}, {

    getUi: function () {
        let selectedOption = app.htmlEncode(this.getValue()),
            pickListValues = this.getPickListValues(),
            html = '<select class="select2 inputElement inlinewidth" name="'+ this.getName() +'" id="field_'+this.getModuleName()+'_'+this.getName()+'">'

        $.each(pickListValues, function(index, value) {
            let selected = selectedOption === index ? 'selected="selected"' : '';

            html += '<option value="'  + index + '" ' + selected + '>' + value + '</option>'
        });

        html += '</select>';

        let selectContainer = $(html);

        this.addValidationToElement(selectContainer);
        return selectContainer;
    }
});

Vtiger_Multipicklist_Field_Js('ITS4YouProcessFlow_Multipicklist_Field_Js', {}, {

    getUi: function () {
        var selectedOptions = new Array();
        var selectedRawOption = app.htmlDecode(this.getValue());
        if (selectedRawOption) {
            var selectedOptions = selectedRawOption.split(',');
        }
        var pickListValues = this.getPickListValues();

        var tagsArray = new Array();
        var pickListValuesArrayFlip = {};
        var selectedOption = '';
        jQuery.map(pickListValues, function (pickListValue, key) {
            (jQuery.inArray(key, selectedOptions) !== -1);
            if (jQuery.inArray(key, selectedOptions) !== -1) {
                selectedOption += pickListValue + ',';
            }
            tagsArray.push(pickListValue);
            pickListValuesArrayFlip[pickListValue] = key;
        })
        selectedOption = selectedOption.substring(0, selectedOption.lastIndexOf(','));

        var html = '<input type="hidden" class="col-lg-12 select2" name="' + this.getName() + '[]" id="' + this.getName() + '" data-fieldtype="multipicklist" >';
        var selectContainer = jQuery(html).val(selectedOption);
        selectContainer.data('tags', tagsArray).data('picklistvalues', pickListValuesArrayFlip);
        selectContainer.data('placeholder', app.vtranslate('JS_PLEASE_SELECT_ATLEAST_ONE_OPTION')).data('closeOnSelect', true);
        this.addValidationToElement(selectContainer);
        return selectContainer;
    }
});
