/*******************************************************************************
 * The content of this file is subject to the ITS4YouSignature license.
 * ("License"); You may not use this file except in compliance with the License
 * The Initial Developer of the Original Code is IT-Solutions4You s.r.o.
 * Portions created by IT-Solutions4You s.r.o. are Copyright(C) IT-Solutions4You s.r.o.
 * All Rights Reserved.
 ***************************************************************************** */

/** @var Settings_ITS4YouSignature_Edit_Js */
Settings_Vtiger_Index_Js('Settings_ITS4YouSignature_Edit_Js', {}, {
    registerEvents: function() {
        this._super();
        this.registerFormValidation();
    },
    registerFormValidation: function () {
        this.getFormElement().validate();
    },
    getFormElement: function () {
        return $('#EditView');
    },
});