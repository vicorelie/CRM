/*********************************************************************************
 * The content of this file is subject to the ListView Colors 4 You license.
 * ("License"); You may not use this file except in compliance with the License
 * The Initial Developer of the Original Code is IT-Solutions4You s.r.o.
 * Portions created by IT-Solutions4You s.r.o. are Copyright(C) IT-Solutions4You s.r.o.
 * All Rights Reserved.
 ********************************************************************************/

Settings_Vtiger_Detail_Js("Settings_ITS4YouListViewColors_Detail_Js", {}, {

    registerEditClickEvent: function () {
        jQuery('.editLVC').on('click', function (e) {
            var element = jQuery(e.currentTarget);
            window.location.href = element.data('url');
        });
    },

    registerEvents: function () {
        var thisInstance = this;

        thisInstance.registerEditClickEvent();
    }
});  