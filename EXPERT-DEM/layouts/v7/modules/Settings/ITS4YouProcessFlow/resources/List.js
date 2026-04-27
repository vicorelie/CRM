/*********************************************************************************
 * The content of this file is subject to the Process Flow 4 You license.
 * ("License"); You may not use this file except in compliance with the License
 * The Initial Developer of the Original Code is IT-Solutions4You s.r.o.
 * Portions created by IT-Solutions4You s.r.o. are Copyright(C) IT-Solutions4You s.r.o.
 * All Rights Reserved.
 ********************************************************************************/
/** @var Settings_ITS4YouProcessFlow_List_Js */

Settings_Vtiger_List_Js("Settings_ITS4YouProcessFlow_List_Js", {}, {
    registerEvents: function () {
        this._super();
        this.registerModuleClick();
    },
    getPageDiv: function() {
        return jQuery('.listViewPageDiv');
    },
    registerModuleClick: function() {
        this.getPageDiv().on('click', '.listViewEntries', function() {
            window.location.href = jQuery(this).data('recordurl');
        });
    },
});