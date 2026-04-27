/*********************************************************************************
 * The content of this file is subject to the ListView Colors 4 You license.
 * ("License"); You may not use this file except in compliance with the License
 * The Initial Developer of the Original Code is IT-Solutions4You s.r.o.
 * Portions created by IT-Solutions4You s.r.o. are Copyright(C) IT-Solutions4You s.r.o.
 * All Rights Reserved.
 ********************************************************************************/
/** @var ITS4YouListViewColors_PFActions_Js */

Vtiger.Class('ITS4YouListViewColors_PFActions_Js', {

    getInstance: function () {
    },

    getInstanceByModuleName: function (moduleName) {
    },
}, {
    trLinesElement: false,
    trLinesBGColors: [],
    trLinesColors: [],
    animateLength: 400,
    animateInterval: 1200,
    getLineElement: function (data) {
        const self = this;

        if ('undefined' === typeof self.trLinesElement[data['for_record']]) {
            self.trLinesElement = [];
            self.getEntries().each(function (index, element) {
                let trElement = $(this),
                    trRecordId = trElement.data('id');

                self.trLinesElement[trRecordId] = trElement;
            });
        }
        if ('undefined' !== typeof self.trLinesElement[data['for_record']]) {
            return self.trLinesElement[data['for_record']];
        } else {
            return false;
        }

    },
    getEntries: function () {
        return $('.listViewEntries');
    },
    registerBackground: function (element, data) {
        const self = this,
            record = data['for_record'],
            color = data['color'],
            field = data['field_name'];

        if (!self.hasRecordBackground(record, field)) {
            self.setRecordBackground(record, color, field);

            if (field) {
                self.setFieldBackground(element, color, field);
            } else {
                self.setBackground(element, color);
            }
        }

        setInterval(function () {
            if (field) {
                self.animateFieldBackground(element, color, field);
            } else {
                self.animateBackground(element, color);
            }
        }, self.animateInterval);
    },
    registerColor: function (element, data) {
        const self = this,
            record = data['for_record'],
            color = data['color'],
            field = data['field_name'];

        if (!self.hasRecordColor(record, field)) {
            self.setRecordColor(record, color, field);

            if (field) {
                self.setFieldColor(element, color, field);
            } else {
                self.setColor(element, color);
            }
        }

        setInterval(function () {
            if (field) {
                self.animateFieldColor(element, color, field);
            } else {
                self.animateColor(element, color);
            }
        }, self.animateInterval);
    },
    registerListColors: function (data) {
        const self = this,
            lineElement = self.getLineElement(data);

        if (lineElement) {
            if ('background' === data['coloring_type']) {
                self.registerBackground(lineElement, data);
            } else {
                self.registerColor(lineElement, data);
            }
        }
    },
    getDefaultField: function (field) {
        return field ? field : 'all';
    },
    setRecordColor: function (record, color, field) {
        field = this.getDefaultField(field);

        this.trLinesColors[record + field] = color;
    },
    setRecordBackground: function (record, color, field) {
        field = this.getDefaultField(field);

        this.trLinesBGColors[record + field] = color;
    },
    hasRecordColor: function (record, field) {
        field = this.getDefaultField(field);

        return 'undefined' !== typeof this.trLinesColors[record + field];
    },
    hasRecordBackground: function (record, field) {
        field = this.getDefaultField(field);

        return 'undefined' !== typeof this.trLinesBGColors[record + field];
    },
    setBackground: function (element, color) {
        this.getRecordColumns(element).css('background-color', color);
    },
    setFieldBackground: function (element, color, field) {
        this.getFieldColumn(element, field).css('background-color', color);
        this.getRelationFieldColumn(element, field).css('background-color', color);
    },
    getRecordColumns: function (element) {
        return element.find('td').filter(function () {
            let currentElement = $(this);

            return !!(currentElement.is('.listViewEntryValue') ||
                currentElement.is('.listViewRecordActions') ||
                currentElement.is('.related-list-actions') ||
                currentElement.is('.relatedListEntryValues')
            );
        });
    },
    animateBackground: function (element, color) {
        const self = this;

        self.getRecordColumns(element).animate({backgroundColor: color}, self.animateLength);
    },
    animateFieldBackground: function (element, color, field) {
        const self = this;

        this.getFieldColumn(element, field).animate({backgroundColor: color}, self.animateLength);
        this.getRelationFieldColumn(element, field).animate({backgroundColor: color}, self.animateLength);
    },
    setColor: function (element, color) {
        element.find('.value').css('color', color);
        element.find('.value .picklist-color').css('color', color);

        element.find('.value a').attr('style', 'color:' + color + ' !important');
        element.find('.value .picklist-color').css('background-color', 'rgba(0,0,0,0)');
    },
    setFieldColor: function (element, color, field) {
        const self = this;

        self.setColor(self.getFieldColumn(element, field), color);
        self.setColor(self.getRelationFieldColumn(element, field), color)
    },
    animateColor: function (element, color) {
        const self = this,
            animate = {color: color};

        element.find('.value').animate(animate, self.animateLength);
        element.find('.value .picklist-color').animate(animate, self.animateLength);

        element.find('.value a').attr('style', 'color:' + color + ' !important');
        element.find('.value .picklist-color').css('background-color', 'rgba(0,0,0,0)');
    },
    animateFieldColor: function (element, color, field) {
        const self = this,
            animate = {color: color},
            fields = self.getFieldColumn(element, field),
            relationFields = self.getRelationFieldColumn(element, field);

        fields.find('.value').animate(animate, self.animateLength);
        fields.find('.value .picklist-color').animate(animate, self.animateLength);

        relationFields.find('.value').animate(animate, self.animateLength);
        relationFields.find('.value .picklist-color').animate(animate, self.animateLength);
    },
    getFieldColumn: function (element, field) {
        const self = this,
            fieldData = field.split('::'),
            fieldModule = fieldData[0],
            fieldName = fieldData[1];

        return element.find('.listViewEntryValue').filter(function () {
            if (self.isCurrentModule(fieldModule) && $(this).is('[data-name="' + fieldName + '"]')) {
                return true;
            }
            if ($(this).is('[data-name*="(' + fieldModule + ')"]') && $(this).is('[data-name*="' + fieldName + '"]')) {
                return true;
            }

            return false;
        });
    },
    getRelationFieldColumn: function (element, field) {
        const self = this,
            fieldData = field.split('::'),
            fieldModule = fieldData[0],
            fieldName = fieldData[1];

        return element.find('.relatedListEntryValues').filter(function () {
            const index = $(this).index() + 1;

            if (self.isCurrentModule(fieldModule)) {
                if ($('.searchRow th:nth-child(' + index + ') input').is('[name="' + fieldName + '"]')) {
                    return true;
                }
                if ($('.listViewHeaders th:nth-child(' + index + ') a').is('[data-fieldname="' + fieldName + '"]')) {
                    return true;
                }
            }

            return false;
        });
    },
    getDetailView: function () {
        return jQuery('#detailView');
    },
    isCurrentModule: function (module) {
        let currentModule = $('.relatedModuleName').val()

        if (!currentModule) {
            currentModule = app.getModuleName();
        }

        return (currentModule === module) || ('Calendar' === currentModule && 'Events' === module);
    },
    registerDetailColors: function (data) {
        const self = this,
            field = data['field_name'],
            fieldData = field.split('::'),
            colors = $.parseJSON(data['record_colors']);

        if (!field || !self.isCurrentModule(fieldData[0])) {
            return;
        }

        let detailValue = jQuery('#' + fieldData[0] + '_detailView_fieldValue_' + fieldData[1]),
            detailLabel = jQuery('#' + fieldData[0] + '_detailView_fieldLabel_' + fieldData[1]);

        if (!detailValue.length) {
            let summaryField = jQuery('[data-name="' + fieldData[1] + '"]');

            detailValue = summaryField.parents('.fieldValue');
            detailLabel = summaryField.parents('.summaryViewEntries').find('.fieldLabel');
        }

        if (!detailValue.length) {
            let editField = jQuery('[name="' + fieldData[1] + '"]');

            detailValue = editField.parents('.fieldValue');
            detailLabel = detailValue.prev('.fieldLabel');
        }

        let animateValue = {},
            animateLabel = {};

        if (colors['label_color']) {
            animateLabel.color = colors['label_color'];
        }

        if (colors['label_background']) {
            animateLabel.backgroundColor = colors['label_background'];
        }

        if (colors['value_color']) {
            animateValue.color = colors['value_color'];
        }

        if (colors['value_background']) {
            animateValue.backgroundColor = colors['value_background'];
        }

        setInterval(function () {
            if (animateValue.color || animateValue.backgroundColor) {
                detailValue.animate(animateValue, self.animateLength);
            }
            if (animateLabel.color || animateLabel.backgroundColor) {
                detailLabel.animate(animateLabel, self.animateLength);

                detailLabel.css({opacity: 1});
                detailLabel.find('.muted').removeClass('muted');
            }
        }, self.animateInterval);

        self.animateInterval += self.animateLength;
    },
    getEditView: function () {
        return jQuery('#EditView');
    },
    run: function (recordId, actionData) {
        if ('setColor' === actionData['data']['action']) {
            if ('Record' === actionData['data']['coloring_mode']) {
                if (this.getDetailView().length || this.getEditView().length) {
                    this.registerDetailColors(actionData['data']);
                }
            } else {
                if (this.getEntries().length) {
                    this.registerListColors(actionData['data']);
                }
            }
        }
    }
});
