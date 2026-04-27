/*********************************************************************************
 * The content of this file is subject to the ListView Colors 4 You license.
 * ("License"); You may not use this file except in compliance with the License
 * The Initial Developer of the Original Code is IT-Solutions4You s.r.o.
 * Portions created by IT-Solutions4You s.r.o. are Copyright(C) IT-Solutions4You s.r.o.
 * All Rights Reserved.
 ********************************************************************************/
Settings_Vtiger_List_Js("Settings_ITS4YouListViewColors_List_Js", {

    triggerCreate: function (url) {
        window.location.href = url;
    }
}, {

    registerFilterChangeEvent: function () {
        var thisInstance = this;
        var container = this.getListViewContainer();
        container.on('change', '#moduleFilter', function (e) {
            jQuery('#pageNumber').val("1");
            jQuery('#pageToJump').val('1');
            jQuery('#orderBy').val('');
            jQuery("#sortOrder").val('');
            var params = {
                module: app.getModuleName(),
                parent: app.getParentModuleName(),
                sourceModule: jQuery(e.currentTarget).val()
            }
            thisInstance.loadListViewRecords(params);
        });
    },

    placeListContents: function (contents) {
        var container = this.getListViewContainer();
        container.html(contents);
    },

    loadListViewRecords: function (urlParams) {
        var self = this;
        var aDeferred = jQuery.Deferred();
        var defParams = this.getDefaultParams();
        if (typeof urlParams == "undefined") {
            urlParams = {};
        }
        urlParams = jQuery.extend(defParams, urlParams);
        app.helper.showProgress();
        app.request.pjax({data: urlParams}).then(function (err, res) {
            self.placeListContents(res);
            app.helper.hideProgress();
            aDeferred.resolve(res);
        });
        return aDeferred.promise();
    },

    registerRowClickEvent: function () {
        var thisInstance = this;
        var listViewContentDiv = this.getListViewContainer();

        listViewContentDiv.on('click', '.listViewEntries', function (e) {

            var elem = jQuery(e.currentTarget);
            var targetElem = jQuery(e.target);
            if (targetElem.closest('.bootstrap-switch').length != 0) {
                return false;
            }
            if (targetElem.closest('.actionsRecordButton').length != 0) {
                return;
            }
            var recordUrl = elem.data('recordurl');
            if (typeof recordUrl == 'undefined') {
                return;
            }

            var postData = thisInstance.getDefaultParams();
            for (var key in postData) {
                if (postData[key]) {
                    postData['return' + key] = postData[key];
                    delete postData[key];
                } else {
                    delete postData[key];
                }
            }
            window.location.href = recordUrl + '&' + $.param(postData);
        });
    },

    getListViewContainer: function () {
        if (this.listViewContainer === false) {
            this.listViewContainer = jQuery('#list-content');
        }
        return this.listViewContainer;
    },

    getDefaultParams: function () {
        var container = this.getListViewContainer();
        var pageNumber = container.find('#pageNumber').val();
        var module = this.getModuleName();
        var parent = app.getParentModuleName();
        var params = {
            'module': module,
            'parent': parent,
            'page': pageNumber,
            'view': "List",
        }
        return params;
    },

    /**
     * Function shows and hide when user enter on a row and leave respectively
     * @returns {undefined}
     */
    registerShowDeleteActionOnHover: function () {
        var listViewContentDiv = this.getListViewContainer();
        listViewContentDiv.on('mouseover', 'tr.listViewEntries', function (e) {
            jQuery(e.currentTarget).find('.actionsRecordButton').css('opacity', 0.6);
        }).on('mouseleave', 'tr.listViewEntries', function (e) {
            jQuery(e.currentTarget).find('.actionsRecordButton').css('opacity', 0);
        });
    },
    registerEvents: function () {
        var thisInstance = this;
        this._super();
        this.registerEditLink();
        this.registerRowClickEvent();
        this.registerFilterChangeEvent();
        this.registerDeleteRecordClickEvent();
        this.registerShowDeleteActionOnHover();
    }
});