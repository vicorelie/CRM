/*********************************************************************************
 * The content of this file is subject to the Process Flow 4 You license.
 * ("License"); You may not use this file except in compliance with the License
 * The Initial Developer of the Original Code is IT-Solutions4You s.r.o.
 * Portions created by IT-Solutions4You s.r.o. are Copyright(C) IT-Solutions4You s.r.o.
 * All Rights Reserved.
 ********************************************************************************/

Settings_Vtiger_Detail_Js("Settings_ITS4YouProcessFlow_Detail_Js", {

    getParentType: function (type) {
        var parenttype = 0;
        var Element = jQuery(".no" + type + "Tab");
        if (Element.length > 0) {
            if (Element.hasClass("active")) {
                parenttype = 1;
            }
        }
        return parenttype;
    },
    createRelation: function (element) {
        const url = element.getAttribute('data-url'),
            parentType = this.getParentType('Action');

        window.open(url + '&parenttype=' + parentType, '_blank');
    },
    selectRelation: function (moduleName) {
        const thisInstance = this,
            relatedController = thisInstance.getRelatedController(moduleName);

        if (relatedController) {
            const popupParams = relatedController.getPopupParams(),
                popupjs = new Vtiger_Popup_Js();

            popupParams['parentmodule'] =  jQuery('#source_module').val();
            popupParams['parenttype'] = this.getParentType("Action");
            popupjs.showPopup(popupParams, "post.PFRelatedList.click");
        }
    },
    getRelatedController: function (relatedModuleName) {
        var thisInstance = this;
        var recordId = app.getRecordId();
        var moduleName = app.getModuleName();
        var selectedTabElement = jQuery('#ActionsRelationDiv');

        var relatedListClass = 'Vtiger_RelatedList_Js';
        if (typeof window[relatedListClass] != 'undefined') {
            return Vtiger_RelatedList_Js.getInstance(recordId, moduleName, selectedTabElement, relatedModuleName);
        }
        return null;
    },
}, {
    listContainer: false,
    registerEditClickEvent: function () {
        jQuery('.editProcessFlow').on('click', function (e) {
            var element = jQuery(e.currentTarget);
            window.location.href = element.data('url');
        });
    },
    registerDebugClickEvent: function () {
        jQuery('.debugProcessFlow').on('click', function (e) {

            var moduleName = jQuery("#source_module").val();
            var thisInstance = this;
            var relatedController = Settings_ITS4YouProcessFlow_Detail_Js.getRelatedController(moduleName);
            if (relatedController) {
                var popupParams = relatedController.getPopupParams();
                var popupjs = new Vtiger_Popup_Js();
                //popupParams['parenttype'] = this.getParentType("Action");
                popupjs.showPopup(popupParams, "post.its4you.PFDebug.click");
            }

        });

        app.event.on("post.its4you.PFDebug.click", function (event, data) {

            var moduleName = jQuery("#source_module").val();
            var responseData = JSON.parse(data);
            var idList = [];
            for (var id in responseData) {
                window.location.href = "index.php?module=ITS4YouProcessFlow&view=Info&parent=Settings&for_module=" + moduleName + "&for_view=Detail&record=" + id;
            }
        });


    },
    registerAddClickEvent: function () {
        jQuery('.addProcessFlow').on('click', function (e) {
            var element = jQuery(e.currentTarget);
            var url = element.data('url');

            var parenttype = Settings_ITS4YouProcessFlow_Detail_Js.getParentType("PF");
            window.location.href = url + "&parenttype=" + parenttype;
        });
    },
    addRelation: function (idList) {
        var thisInstance = this;
        var aDeferred = jQuery.Deferred();


        var params = {};
        params['mode'] = "addRelation";
        params['module'] = app.getModuleName();
        params['parent'] = 'Settings';
        params['action'] = 'RelationAjax';
        params['src_module'] = jQuery("#source_module").val();
        params['src_record'] = app.getRecordId();
        params['related_record_list'] = JSON.stringify(idList);

        app.helper.showProgress();
        app.request.post({"data": params}).then(
            function (responseData) {
                app.helper.hideProgress();
                aDeferred.resolve(responseData);
            },

            function (textStatus, errorThrown) {
                app.helper.hideProgress();
                aDeferred.reject(textStatus, errorThrown);
            }
        );
        return aDeferred.promise();
    },
    registerRelatedActionsEvent: function () {
        const container = jQuery('table#relatedActionsList');

        this.registerActionEntryEvent(container);
        this.registerActionDeleteEvent(container);
        this.registerActionStatusChangeEvent(container);
        jQuery(".processFlowActionStatus").bootstrapSwitch();
    },
    registerActionStatusChangeEvent: function (container) {

        var thisInstance = this;
        container.on('switchChange.bootstrapSwitch', ".processFlowActionStatus", function (e) {
            var currentElement = jQuery(e.currentTarget);
            var status = 'true';
            if (currentElement.val() == 'on') {
                status = 'false';
                currentElement.attr('value', 'off');
            } else {
                currentElement.attr('value', 'on');
            }

            var url = currentElement.data('statusurl') + "&status=" + status;

            app.helper.showProgress();
            app.request.post({url: url}).then(function (error, data) {
                app.helper.hideProgress();
                if (data) {
                    app.helper.showSuccessNotification({message: app.vtranslate('JS_ACTION_STATUS_CHANGED')});
                    thisInstance.getTaskList();
                }
            });

        });
    },
    showScroll: function (container) {
        var params = {
            setHeight: container.height,
            alwaysShowScrollbar: 2,
            autoExpandScrollbar: true,
            setTop: 0,
            scrollInertia: 70,
            mouseWheel: {preventDefault: true}
        };
        app.helper.showVerticalScroll(container, params);
    },

    registerActionEntryEvent: function (container) {
        var thisInstance = this;

        container.on('click', '.listViewEntryValue', function (e) {
            var parentRecordId = app.getRecordId();
            var target = jQuery(e.target, jQuery(e.currentTarget));
            var recordUrl = target.closest('tr').data('recordurl');

            if (typeof recordUrl != "undefined") {
                var params = app.convertUrlToDataParams(recordUrl);
                //Display Mode to show details in overlay
                params['mode'] = 'showDetailViewByMode';
                params['requestMode'] = 'full';
                params['displayMode'] = 'overlay';

                //app.helper.showProgress();
                app.request.get({data: params}).then(function (err, response) {
                    app.helper.hideProgress();
                    var overlayParams = {'backdrop': 'static', 'keyboard': false};

                    app.helper.loadPageContentOverlay(response, overlayParams).then(function (container) {
                        thisInstance.showScroll(jQuery('.overlayDetail .modal-body'));
                        app.event.trigger('post.overlay.load', parentRecordId, params);
                        container.find('.editRelatedRecord').on('click', function (e) {
                            var element = jQuery(e.currentTarget);

                            var parentmodule = jQuery("#source_module").val()
                            var url = element.data('url') + '&parentmodule=' + parentmodule;
                            if (parentRecordId != "" && parentRecordId != "0") {
                                url += '&parentid=' + parentRecordId;
                            }

                            window.location.href = url;
                        });
                    });
                });
            }
        });


        /*
                container.on('click', '.listViewEntryValue', function (e) {
                    var target = jQuery(e.target, jQuery(e.currentTarget));
                    var recordUrl = target.closest('tr').data('recordurl');
                    if(typeof recordUrl == 'undefined') {
                        return;
                    }
                    window.location.href = recordUrl;
                });*/


    },
    registerActionDeleteEvent: function (container) {
        container.on('click', '.deleteRelatedAction', function (e) {
            const message = app.vtranslate('LBL_DELETE_CONFIRMATION');

            app.helper.showConfirmationBox({'message': message}).then(function () {
                const currentElement = jQuery(e.currentTarget),
                    deleteUrl = currentElement.data('deleteurl');

                app.helper.showProgress();
                app.request.post({url: deleteUrl}).then(function (error, data) {
                    app.helper.hideProgress();

                    if (data) {
                        const target = jQuery(e.target, jQuery(e.currentTarget));
                        target.closest('tr').remove();

                        app.helper.showSuccessNotification({message: app.vtranslate('JS_ACTION_DELETED_SUCCESSFULLY')});
                    }
                });
            });
        });
    },
    getListContainer: function () {
        if (this.listContainer === false) {
            this.listContainer = jQuery('#listContainer');
        }
        return this.listContainer;
    },
    registerDeleteRecordClickEvent: function () {
        var thisInstance = this;
        var listContentDiv = this.getListContainer();
        listContentDiv.on('click', '.deleteRecordButton', function (e) {
            var elem = jQuery(e.currentTarget);
            var parent = elem;
            var params = {};

            var recordId = parent.closest('tr').data('id');
            var message = app.vtranslate('LBL_DELETE_CONFIRMATION');
            app.helper.showConfirmationBox({'message': message}).then(function () {
                var module = app.getModuleName();
                var postData = {
                    "data": {
                        "module": module,
                        "action": "DeleteAjax",
                        "record": recordId,
                        "parent": app.getParentModuleName()
                    }
                };
                app.helper.showProgress();
                app.request.post(postData).then(
                    function (err, data) {
                        if (err == null) {
                            app.helper.hideProgress();
                            parent.closest('tr').remove();
                            app.helper.showSuccessNotification({message: app.vtranslate('JS_PROCESSFLOW_DELETED_SUCCESSFULLY')});
                        } else {
                            app.helper.hideProgress();
                            app.helper.showErrorNotification({message: app.vtranslate(err.message)})
                        }
                    });
            });
        });
    },
    registerRowClickEvent: function () {
        var thisInstance = this;
        var listContentDiv = this.getListContainer();

        listContentDiv.on('click', '.listViewEntries', function (e) {
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
            window.location.href = recordUrl;
        });
        listContentDiv.on('click', 'a[name="editlink"]', function (e) {
            var element = jQuery(e.currentTarget);
            var url = element.data('url');
            window.location.href = url;
        });

    },
    registerEventForChangeITS4YouProcessFlowtate: function () {
        var listContentDiv = this.getListContainer();
        jQuery(listContentDiv).on('switchChange.bootstrapSwitch', "input[name='processflowstatus']", function (e) {
            var currentElement = jQuery(e.currentTarget);
            if (currentElement.val() == 'on') {
                currentElement.attr('value', 'off');
            } else {
                currentElement.attr('value', 'on');
            }
            var params = {
                module: app.getModuleName(),
                parent: app.getParentModuleName(),
                'action': 'SaveAjax',
                'record': currentElement.data('id'),
                'status': currentElement.val()
            }

            app.request.post({
                data: params
            }).then(function (error, data) {
                if (data) {
                    app.helper.showSuccessNotification({
                        message: app.vtranslate('JS_WORKFLOWS_STATUS_CHANGED')
                    });
                }
            });
        });
    },
    registerShowDeleteActionOnHover: function () {
        var listContentDiv = this.getListContainer();
        listContentDiv.on('mouseover', 'tr.listViewEntries', function (e) {
            jQuery(e.currentTarget).find('.actionsRecordButton').css('opacity', 0.6);
        }).on('mouseleave', 'tr.listViewEntries', function (e) {
            jQuery(e.currentTarget).find('.actionsRecordButton').css('opacity', 0);
        });
    },
    registerEvents: function () {
        var thisInstance = this;

        thisInstance.registerEditClickEvent();
        thisInstance.registerDebugClickEvent();
        thisInstance.registerAddClickEvent();
        thisInstance.registerRelatedActionsEvent();
        thisInstance.registerRowClickEvent();
        thisInstance.registerDeleteRecordClickEvent();
        thisInstance.registerEventForChangeITS4YouProcessFlowtate();
        thisInstance.registerShowDeleteActionOnHover();
        jQuery("input[name='processflowstatus']").bootstrapSwitch();

        app.event.on("post.PFRelatedList.click", function (event, data) {
            var responseData = JSON.parse(data);
            var idList = [];
            for (var id in responseData) {
                idList.push(responseData[id].info);
            }
            app.helper.hideModal();

            thisInstance.addRelation(idList).then(function () {
                location.reload();
            });
        });
    }
});  