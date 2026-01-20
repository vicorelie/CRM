/*********************************************************************************
 * The content of this file is subject to the ListView Colors 4 You license.
 * ("License"); You may not use this file except in compliance with the License
 * The Initial Developer of the Original Code is IT-Solutions4You s.r.o.
 * Portions created by IT-Solutions4You s.r.o. are Copyright(C) IT-Solutions4You s.r.o.
 * All Rights Reserved.
 ********************************************************************************/
Settings_Vtiger_Edit_Js("Settings_ITS4YouListViewColors_Edit_Js", {}, {
    lvcContainer: false,
    lvcActionContainer: false,

    /**
     * Function to get the container which holds all the workflow elements
     * @return jQuery object
     */
    getContainer: function () {
        return this.lvcContainer;
    },

    /**
     * Function to get the container which holds all the workflow elements
     * @return jQuery object
     */
    getActionContainer: function () {
        return this.lvcActionContainer;
    },

    /**
     * Function to set the reports container
     * @params : element - which represents the workflow container
     * @return : current instance
     */
    setContainer: function (element) {
        this.lvcContainer = element;
        return this;
    },

    /**
     * Function to set the reports step1 container
     * @params : element - which represents the reports step1 container
     * @return : current instance
     */
    setActionContainer: function (element) {
        this.lvcActionContainer = element;
        return this;
    },

    /*
     * Function to register the click event for next button
     */
    registerFormSubmitEvent: function () {
        var self = this;
        var form = jQuery('#lvc_edit');
        var params = {
            submitHandler: function (form) {
                return true;
            }
        };
        form.vtValidate(params);
    },

    getModuleName: function () {
        return app.getModuleName();
    },
    initializeColorPicker: function (element, customParams, onChangeFunc) {
        let params = {
            onChange: onChangeFunc,
            onSubmit: function (hsb, hex, rgb, el) {
                $(el).val(hex);
                $(el).ColorPickerHide();
            },
            onBeforeShow: function () {
                $(this).ColorPickerSetColor(this.value);
            }
        };

        if (typeof customParams !== 'undefined') {
            params = jQuery.extend(params, customParams);
        }

        element.ColorPicker(params).bind('keyup', function () {
            $(this).ColorPickerSetColor(this.value);
        });
    },
    registerColorPicker: function () {
        let self = this,
            editViewContainer = $('.editViewContents'),
            colorPickerHost = editViewContainer.find('.LVCColorPicker');

        editViewContainer.on('input', '.selectedColor', function () {
            self.setPreview();
        });

        $.each(colorPickerHost, function () {
            let inputElement = $(this),
                selectedColor = editViewContainer.find(inputElement.data('input')),
                customParams = {
                    color: selectedColor.val()
                };

            self.initializeColorPicker(selectedColor, customParams, function (hsb, hex, rgb) {
                let color = '#' + hex;

                selectedColor.val(color);
                self.setPreview();
            });
        });
    },
    setPreview: function() {
        $('.LVCFieldLabel').css({
            backgroundColor: $('#labelBackground').val(),
            color: $('#labelColor').val(),
        })

        $('.LVCFieldValue').css({
            backgroundColor: $('#valueBackground').val(),
            color: $('#valueColor').val(),
        })
    },
    registerEvents: function () {
        this.registerAppTriggerEvent();
        this.registerFormSubmitEvent();
        this.registerColorPicker();
        this.setPreview();
    }
});