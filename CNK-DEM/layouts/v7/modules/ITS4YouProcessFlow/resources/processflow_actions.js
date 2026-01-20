/*********************************************************************************
 * The content of this file is subject to the Process Flow 4 You license.
 * ("License"); You may not use this file except in compliance with the License
 * The Initial Developer of the Original Code is IT-Solutions4You s.r.o.
 * Portions created by IT-Solutions4You s.r.o. are Copyright(C) IT-Solutions4You s.r.o.
 * All Rights Reserved.
 ********************************************************************************/

/** @var ITS4YouProcessFlow_Actions_Js */
Vtiger.Class('ITS4YouProcessFlow_Actions_Js', {
    instance: false,
    getInstance: function () {
        if (!this.instance) {
            this.instance = new ITS4YouProcessFlow_Actions_Js();
        }

        return this.instance;
    }
}, {
    its4you_modulefields: [],
    its4you_nummodulefields: [],
    its4you_modulefields_data: [],
    instances: [],
    modulefields: false,
    nummodulefields: 0,
    formElement: false,
    pfContainer: false,
    forModule: false,
    forView: false,
    debug: false,
    setDebugText: function (text) {
        if (window.console && this.debug) console.log('[ITS4YouProcessFlow_Actions_Js] ' + text);
    },
    registerEvents: function () {
        let view = app.view();
        let parentModule = app.getParentModuleName();

        if ('Settings' !== parentModule) {
            this.getListActions(view, '');
            this.registerPostEventsListener();

            if ('Edit' === view) {
                this.registerEditEventsListener();
            }
        }
    },
    getFieldName: function (field) {
        let fieldName = field.data('fieldname');

        if ('undefined' === typeof fieldName) {
            return field.attr('name');
        }

        return fieldName;
    },
    isActiveModuleField: function (fieldName) {
        const moduleFields = this.getModuleFields();

        return jQuery.inArray(fieldName, moduleFields) !== -1;
    },
    getModuleFields: function () {
        return this.its4you_modulefields;
    },
    isActiveReferenceField: function (fieldName) {
        const self = this,
            moduleFields = this.getModuleFields();
        let result = false;

        $.each(moduleFields, function (index, moduleField) {
            if (fieldName === self.getReferenceFieldName(moduleField)) {
                result = true;
            }
        });

        return result;
    },
    isDefinedModuleFields: function () {
        return 'undefined' != typeof this.its4you_modulefields_data
    },
    isChangedValue: function (fieldName, value) {
        return value != this.its4you_modulefields_data[fieldName];
    },
    controlField: function (field, validate) {
        const self = this;

        self.setDebugText('control field start');

        let forFieldName = self.getFieldName(field);

        self.setDebugText('control field name:' + forFieldName);

        if ('undefined' !== typeof forFieldName) {
            if ('[]' === forFieldName.substring(forFieldName.length - 2, forFieldName.length)) {
                forFieldName = forFieldName.substring(0, forFieldName.length - 2);
            }

            self.setDebugText('control field A');

            if (self.isActiveModuleField(forFieldName) || self.isActiveReferenceField(forFieldName)) {
                self.setDebugText('control field B');

                if ('undefined' != typeof field && !self.isDefinedModuleFields()) {
                    let fieldValue = field.val();

                    if ('checkbox' === field.attr('type')) {
                        if (field.not(':checked')) {
                            fieldValue = '';
                        }
                    }

                    if (!self.isChangedValue(forFieldName, fieldValue)) {
                        return false;
                    }
                }

                self.setDebugText('control field C');
                self.controlFields();
            } else {
                self.setDebugText('control field A end');
            }
        }
    },
    getFieldElementByName: function (fieldName) {
        let fieldElement = jQuery("[name='" + fieldName + "[]']");

        if (!fieldElement.length) {
            fieldElement = jQuery("[name='" + fieldName + "']");
        }

        if (!fieldElement.length) {
            fieldElement = jQuery("[name='" + this.getReferenceFieldName(fieldName) + "']");
        }

        return fieldElement;
    },
    requestValues: false,
    getRequestValue: function (name) {
        if (!this.requestValues) {
            this.requestValues = new URLSearchParams(window.location.search);
        }

        if (this.requestValues.has(name)) {
            return this.requestValues.get(name);
        }

        return '';
    },
    getReferenceFieldName: function (fieldName) {
        return fieldName.match(/([a-zA-Z_]+)/)[0];
    },
    isReferenceField: function (fieldElement) {
        return fieldElement.is('.sourceField');
    },
    controlFields: function () {
        let self = this,
            moduleFields = self.its4you_modulefields,
            numModuleFields = self.its4you_nummodulefields,
            formElement = self.getForm(),
            for_module = self.getForModule(),
            for_view = self.getForView();

        let params = {
                module: 'ITS4YouProcessFlow',
                action: 'IndexAjax',
                mode: 'controlFields',
                for_module: for_module,
                for_view: for_view,
                record: formElement.find('[name=record]').val()
            },
            postData = {},
            formData = formElement.serializeFormData();

        for (let i = 0; i < numModuleFields; i++) {
            let fieldName = moduleFields[i];
            let fieldValue = formData[fieldName];
            let fieldElement = self.getFieldElementByName(fieldName);

            if (typeof fieldElement != 'undefined') {
                let fieldtype = fieldElement.data('fieldtype');

                if ('undefined' == typeof fieldtype) {
                    if (self.isReferenceField(fieldElement)) {
                        fieldName = self.getReferenceFieldName(fieldName);
                        fieldtype = 'reference';
                        fieldValue = fieldElement.val();
                    } else {
                        let alterElement = jQuery("#" + for_module + "_editView_fieldName_" + fieldName);

                        if (typeof alterElement != 'undefined') {
                            fieldtype = alterElement.data('fieldtype');
                            fieldElement = alterElement;
                        }
                    }
                }

                if ('undefined' != typeof fieldtype) {
                    if ('multipicklist' === fieldtype) {
                        fieldValue = "";

                        if (fieldElement.val() != null) {
                            fieldValue = fieldElement.val().join(" |##| ");
                        }
                    }

                    if ('file' === fieldtype) {
                        let fieldValue = "";

                        if (fieldElement.val() != null && fieldElement.val() != "") {
                            fieldValue = fieldElement.val();
                        } else {
                            let closestDiv = fieldElement.closest("div");
                            let inputElements = jQuery(".uploadedFileDetails", closestDiv).find("input[value='1']");

                            if (inputElements && inputElements.length > 0) {
                                fieldValue = "1";
                            }
                        }
                    }

                    if ('checkbox' === fieldtype) {
                        if (fieldElement.is(':checked')) {
                            fieldValue = "1";
                        } else {
                            fieldValue = "0";
                        }
                    }
                }
            }

            postData[fieldName] = fieldValue;
        }

        self.its4you_modulefields_data = postData;
        params['postData'] = JSON.stringify(postData);

        let str = jQuery.param(params);
        self.setDebugText(str);

        app.request.post({data: params}).then(
            function (error, result) {
                app.helper.hideProgress();
                if (!error) {
                    if (result.success) {
                        jQuery.each(result.entries, function (i, data) {
                            self.executeActions(i, data);
                        });
                    }
                }
            }
        )
    },
    getForm: function () {
        if (!this.formElement) {
            let editForm = $('#EditView'),
                detailForm = $('#detailView');

            this.setForm(editForm);

            if (detailForm.length) {
                this.setForm(detailForm);
            }
        }

        return this.formElement;
    },
    setForm: function (element) {
        this.formElement = element;
        return this;
    },
    getForModule: function () {
        const self = this;

        if (!self.forModule) {
            let module = $('#EditView [name="module"]').val();

            if (!module) {
                module = app.getModuleName()
            }

            self.setForModule(module);
        }

        return self.forModule;
    },
    setForModule: function (for_module) {
        if ('Calendar' === for_module) {
            if ('Events' === this.getRequestValue('mode')) {
                for_module = 'Events';
            }

            let formModule = this.getFromModule();

            if (formModule) {
                for_module = formModule;
            }
        }

        this.forModule = for_module;

        return this;
    },
    getFromModule: function () {
        let form = this.getForm(),
            id = form.length ? form.find('[id*="_fieldValue_"]').attr('id') : null;

        if (id) {
            return id.split('_')[0];
        }

        return null;
    },
    getForViewFromDetail: function() {
        let linkKey = this.getLinkKey(),
            view = 'relatedList';

        if('LBL_RECORD_DETAILS' === linkKey || 'LBL_RECORD_SUMMARY' === linkKey) {
            view = 'Detail';
        }

        return view;
    },
    getForView: function () {
        if (!this.forView) {
            let view = app.view();

            if('Detail' === view) {
                view = this.getForViewFromDetail();
            }

            this.setForView(view);
        }
        return this.forView;
    },
    setForView: function (for_view) {
        this.forView = for_view;
        return this;
    },
    registerEditEventsListener: function () {
        const self = this,
            formElement = this.getForm();

        formElement.on('Vtiger.Validation.Hide.Messsage', '.inputElement', function (e) {
            self.setDebugText('Vtiger.Validation.Hide.Messsage inputElement:' + jQuery(this).val());

            self.controlField(jQuery(this), false);
        });

        formElement.on('Vtiger.Validation.Hide.Messsage', '.dateField', function (e) {
            self.setDebugText('Vtiger.Validation.Hide.Messsage dateField:' + jQuery(this).val());

            self.controlField(jQuery(this), false);
        });

        formElement.on('change', '.select2', function () {
            self.setDebugText('change select2: ' + jQuery(this).val());

            self.controlField(jQuery(this), false);
        });

        formElement.on('click', '[type=checkbox]', function () {
            self.setDebugText('click checkbox: ' + jQuery(this).val());

            self.controlField(jQuery(this), false);
        });

        formElement.on('Vtiger.Reference.Selection', 'input', function (e, data) {
            let selectElement = jQuery(e.target);

            self.setDebugText('Vtiger.Reference.Selection: ' + jQuery(this).val());

            self.controlField(selectElement, false);
        });

        formElement.on('click', '.clearReferenceSelection', function (e, data) {
            let selectElement = $(this).parent().find('.sourceField');

            self.setDebugText('clearReferenceSelection' + selectElement.val());

            self.controlField(selectElement, false);
        });
    },
    getListViewContainer: function () {
        if (this.listViewContainer === false) {
            this.listViewContainer = jQuery('#listViewContent');
        }
        return this.listViewContainer;
    },

    executeActions: function (id, actions) {
        const self = this;

        jQuery.each(actions, function (i, action) {
            try {
                let instance = self.getPFActionInstanceByModuleName(action.parent_module);

                if (instance) {
                    instance.run(id, action, self.getContainer());
                }
            } catch (e) {
                console.log(e);
            }
        });
    },
    getPFActionInstanceByModuleName: function (moduleName) {
        let moduleClassName = moduleName + '_PFActions_Js';

        if ('undefined' === typeof this.instances[moduleClassName]) {
            if ('undefined' !== typeof window[moduleClassName]) {
                this.instances[moduleClassName] = new window[moduleClassName]();
            }
        }

        return this.instances[moduleClassName];
    },
    getFormRecord: function() {
        return this.getForm().find('[name=record]').val();
    },
    getFormModule: function() {
        return this.getForm().find('[name=module]').val();
    },
    getListActionsParams: function (for_view, event_name) {
        let self = this,
            params = {},
            actualInstance = window.app.controller();

        if (actualInstance && typeof actualInstance.getDefaultParams == "function") {
            params = actualInstance.getDefaultParams();
        }

        if ('relatedEdit' === for_view) {
            params['record'] = self.getFormRecord();
            params['relatedModule'] = self.getFormModule();
        } else if ('Edit' === for_view) {
            params['record'] = self.getFormRecord();
        } else if ('List' === for_view && actualInstance && jQuery.isFunction(actualInstance.getListSearchParams)) {
            params['search_params'] = JSON.stringify(actualInstance.getListSearchParams());
        } else if ('ListEdit' === for_view) {
            params['record'] = self.getContainer().data('id');
        } else if ('relatedDetail' === for_view) {
            params['record'] = self.getContainer().find('#recordId').val();
            params['relatedModule'] = self.getFormModule();
        }

        params['module'] = 'ITS4YouProcessFlow';
        params['for_module'] = self.getForModule();
        params['for_view'] = for_view;
        params['event_name'] = event_name;
        params['action'] = 'IndexAjax';
        params['mode'] = 'getPFListActions';

        delete params['view'];

        return params;
    },
    getListActions: function (for_view, event_name) {
        const self = this,
            params = self.getListActionsParams(for_view, event_name);

        self.instances = [];

        self.setDebugText('getListActions');
        self.setDebugText(jQuery.param(params));

        app.helper.showProgress();
        app.request.post({data: params}).then(function (error, data) {
            app.helper.hideProgress();

            if (!error) {
                if (data.fields) {
                    self.its4you_modulefields = data['fields'];
                    self.its4you_nummodulefields = data['numfields'];
                }
                if (data.success) {
                    jQuery.each(data.entries, function (i, data) {
                        self.executeActions(i, data);
                    });

                    app.event.trigger('ProcessFlow.Actions.Loaded');
                }
            }
        })
    },
    registerPostEventsListener: function () {

        let self = this;
        app.event.on('post.listViewFilter.click', function (event, searchRow) {
            self.getListActions('List', 'post.listViewFilter.click');
        });
        app.event.on('post.relatedListLoad.click', function (event, searchRow) {
            let forView = self.getForViewFromDetail();

            self.setForView(forView);
            self.setForModule(app.getModuleName());
            self.getListActions(forView, 'post.relatedListLoad.click');
        });
        app.event.on('post.overlay.load', function (event, parentRecordId, params) {
            self.setContainer($('#overlayPageContent'));
            self.setForm($('#detailView'));
            self.setForView('related' + params.view);
            self.setForModule(params.module);

            self.getListActions('relatedDetail', 'post.overlay.load');
        });

        app.event.on('post.QuickCreateForm.save', function (event, data) {
            if('Edit' !== app.getViewName()) {
                self.getListActions('Detail', 'post.QuickCreateForm.save');
            }
        });

        app.event.on('PostAjaxSaveEvent', function (e, fieldBasicData, postSaveRecordDetails, contentHolder) {
            let for_view = $('#overlayPageContent:visible').length ? 'relatedDetail' : 'Detail';

            self.getListActions(for_view, 'PostAjaxSaveEvent');
        });

        app.event.on('post.overLayEditView.loaded', function (e, container) {
            let forView = 'relatedEdit',
                formElement = container.find('#EditView'),
                forModule = formElement.find('[name=module]').val();

            self.setContainer(container);
            self.setForm(formElement);
            self.setForView(forView);
            self.setForModule(forModule);

            self.getListActions(forView, 'post.overLayEditView.loaded');
            self.registerEditEventsListener();
        });

        app.event.on('post.listViewInlineEdit.click', function(e, container) {
            self.setContainer(container);
            self.getListActions('ListEdit', 'post.listViewInlineEdit.click');
        });

    },
    getContainer: function () {
        return this.pfContainer;
    },
    setContainer: function (element) {
        this.pfContainer = element;
        return this;
    },
    getLinkKey: function () {

        let link_key = '';
        let tabContainer = jQuery('div.related-tabs');

        if (tabContainer.length) {
            let active_tab = tabContainer.find('li.active');

            if (active_tab.length) {
                link_key = active_tab.attr('data-link-key');
            }
        }
        return link_key;
    },
});

jQuery(document).ready(function () {
    ITS4YouProcessFlow_Actions_Js.getInstance().registerEvents();
});
