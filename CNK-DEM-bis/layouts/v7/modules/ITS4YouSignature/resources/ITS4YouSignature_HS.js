/* * *******************************************************************************
 * The content of this file is subject to the ITS4YouSignature license.
 * ("License"); You may not use this file except in compliance with the License
 * The Initial Developer of the Original Code is IT-Solutions4You s.r.o.
 * Portions created by IT-Solutions4You s.r.o. are Copyright(C) IT-Solutions4You s.r.o.
 * All Rights Reserved.
 * ****************************************************************************** */

/** @var ITS4YouSignature_HS */
jQuery.Class('ITS4YouSignature_HS', {
    instance: false,
    getInstance() {
        if (!this.instance) {
            this.instance = new ITS4YouSignature_HS();
        }

        return this.instance;
    },
    sendToSignature: function (sourceRecord, sourceModule) {
        const params = {
            sourceRecord: sourceRecord,
            sourceModule: sourceModule,
        };

        this.getInstance().createSignature(params);
    },
    signDocument: function(sourceRecord, sourceModule) {
        const params = {
            sourceRecord: sourceRecord,
            sourceModule: sourceModule,
            mode: 'SignSelectPDF',
        };

        this.getInstance().createSignature(params);
    },
    acceptSignature: function (sourceRecord, sourceModule) {
        const params = {
            sourceRecord: sourceRecord,
            sourceModule: sourceModule,
            mode: 'AcceptRecords',
        };

        this.getInstance().createSignature(params);
    },
}, {
    progressMessage: 'Signature',
    getFormSelectPDF: function () {
        return jQuery('.SendToSignature_SelectPDF');
    },
    getFormSignSelectPDF: function () {
        return jQuery('.SendToSignature_SignSelectPDF');
    },
    getFormPreviewPDF: function () {
        return jQuery('.SendToSignature_PreviewPDF');
    },
    getFormSelectRecipient: function () {
        return jQuery('.SendToSignature_SelectRecipient');
    },
    getFormSelectEmail: function () {
        return jQuery('.SendToSignature_SelectEmail');
    },
    validateSelectPDF: function (form) {
        const self = this;

        form.vtValidate({
            submitHandler: function () {
                if (!form.find('.templateId:checked').length) {
                    app.helper.showErrorNotification({message: app.vtranslate('JS_SELECT_TEMPLATE')});
                } else {
                    const params = form.serializeFormData();

                    self.createSignature(params);
                }
            }
        });
    },
    validateSignSelectPDF: function (form) {
        const self = this;

        form.vtValidate({
            submitHandler: function () {
                let data = form.serializeFormData();

                if (!form.find('.templateId:checked').length) {
                    app.helper.showErrorNotification({message: app.vtranslate('JS_SELECT_TEMPLATE')});
                } else if (!data['recipientModule']) {
                    self.createSignature(data);
                } else {
                    self.submitSignSelectedPDF(form)
                }
            }
        });
    },
    validateSignSelectRecipient: function (form) {
        const self = this;

        form.vtValidate({
            submitHandler: function () {
                self.submitSignSelectedPDF(form)
            }
        });
    },
    validateEditPDF: function (form) {
        const self = this;

        form.vtValidate({
            submitHandler: function () {
                if (!form.find('[name="templateId"]').val()) {
                    app.helper.showErrorNotification({message: app.vtranslate('JS_EMPTY_TEMPLATE')});
                } else {
                    self.updateTemplateBody(form);

                    if('SelectPDF' === form.find('#prevMode').val()) {
                        self.createSignature(form.serializeFormData());
                    } else {
                        self.submitSignSelectedPDF(form);
                    }
                }
            }
        });
    },
    updateTemplateBody: function(form) {
        form.find('[name="templateBody"]').val(CKEDITOR.instances['templateBody'].getData());
    },
    submitSignSelectedPDF: function (form) {
        const self = this,
            params = form.serializeFormData();
        delete params['view'];

        params['action'] = 'SignDocument';

        app.helper.showProgress(self.progressMessage);
        app.helper.hideModal();
        app.request.post({data: params}).then(function (error, data) {
            app.helper.hideProgress();

            if (!error) {
                app.helper.showSuccessNotification({message: data.message});

                window.open(data.url, '_blank');
            }
        });
    },
    clickSelectPDF: function () {
        const self = this,
            templateTr = jQuery('.selectSignatureTemplate');

        templateTr.on('click', function () {
            const thisTr = jQuery(this);

            templateTr.css({background: '#fff'});
            thisTr.css({background: '#eee'});
            thisTr.find('.templateId').prop('checked', true);

            self.setTemplateId(thisTr.data('id'));
            self.setEditButton(thisTr.data('disable_export_edit'));
            self.setTemplateLanguage();
        });

        templateTr.on('change', '.templateLanguage', function () {
            self.setTemplateLanguage();
        });

        if (!templateTr.find('.templateId:checked').length) {
            templateTr.first().trigger('click');
        }
    },
    setEditButton: function (disable) {
        const button = $('.editPDFTemplate');

        if (1 === disable) {
            button.attr('disabled', 'disabled');
        } else {
            button.removeAttr('disabled');
        }
    },
    setTemplateLanguage: function () {
        const self = this;

        $('#SendToSignature').find('[name="templateLanguage"]').val(self.getLanguage());
    },
    setTemplateId: function(id) {
        $('#templateId').val(id);
    },
    getLanguage: function () {
        const tr = jQuery('.templateId:checked').parents('tr');

        if (tr.length) {
            return tr.find('.templateLanguage').select2('val');
        }

        return jQuery('[name="templateLanguage"]').val();
    },
    previewSelectPDF: function () {
        const self = this;

        jQuery('.templatePreview').on('click', function () {
            const params = self.getFormSelectPDF().serializeFormData();

            params['mode'] = 'PreviewPDF';

            self.createSignature(params);
        });
    },
    backModes: {
        'CreateSignature' : 'SelectRecipient',
        'SelectEmail' : 'SelectPDF',
    },
    getForm: function() {
        return jQuery('#SendToSignature form');
    },
    registerBackLink: function() {
        const self = this,
            form = self.getForm();

        form.on('click', '.backLink', function() {
            const params = form.serializeFormData();

            params['mode'] = self.backModes[params['mode']];

            self.createSignature(params);
        });
    },
    registerSelectPDF: function () {
        const self = this,
            form = self.getFormSelectPDF();

        if (form.length) {
            self.validateSelectPDF(form);
            self.clickSelectPDF();
            self.previewSelectPDF();
        }
    },
    registerSignSelectPDF: function() {
        const self = this,
            form = self.getFormSignSelectPDF();

        if(form.length) {
            self.validateSignSelectPDF(form);
            self.clickSelectPDF();
        }
    },
    getFormSignSelectRecipient: function () {
        return $('.SendToSignature_SignSelectRecipient');
    },
    registerSignSelectRecipient: function () {
        const self = this,
            form = self.getFormSignSelectRecipient();

        if (form.length) {
            self.validateSignSelectRecipient(form);
            self.selectRecipientModule(form);
            self.updateRecipientModule(form);
        }
    },
    updateRecipientModule: function (form) {
        form.find('[name="recipientModule"]').val($('#recipientModule').val());
    },
    selectRecipientModule: function (form) {
        const self = this;

        form.on('change', '#recipientModule', function () {
            self.updateRecipientModule(form)
        });
    },
    registerPreviewPDF: function () {
        const self = this,
            form = self.getFormPreviewPDF();

        if (form.length) {
            form.find('iframe').height(jQuery(window).height() - 200);
            form.vtValidate({
                submitHandler: function() {
                    const params = form.serializeFormData();

                    self.createSignature(params);
                }
            });
        }
    },
    validateEmail: function(email) {
        const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

        return re.test(String(email).toLowerCase());
    },
    registerSelectRecipient: function () {
        const self = this,
            form = self.getFormSelectRecipient();

        if (form.length) {
            const recipientId = form.find('#recipientId'),
                recipientEmail = jQuery('#recipientEmail');
            let recipientData = jQuery('.recipientEmails').text();

            if(recipientData) {
                recipientData = JSON.parse(recipientData);
            }

            form.vtValidate({
                submitHandler: function() {
                    self.createSignature(form.serializeFormData());
                }
            });
            recipientId.on('change', function () {
                let emails = [],
                    email = false,
                    data = recipientData[recipientId.val()];

                if(data) {
                    jQuery.each(data, function(index, value) {
                        if(!email) {
                            email = index;
                        }

                        emails.push(index);
                    });
                }

                recipientEmail.select2({
                    tags: emails,
                    createSearchChoice: function (term) {
                        return {id: term, text: term};
                    },
                });

                if(email) {
                    recipientEmail.val(email).trigger('change');
                }
            });
            recipientId.trigger('change');
        }
    },
    registerSelectEmail: function() {
        const self = this,
            form = self.getFormSelectEmail();

        if (form.length) {
            form.vtValidate({
                submitHandler: function() {
                    const params = form.serializeFormData();
                    delete params['view'];
                    params['action'] = 'CreateSignature';

                    app.helper.showProgress(self.progressMessage);
                    app.helper.hideModal();
                    app.request.post({data: params}).then(function(error, data) {
                        app.helper.hideProgress();

                        if (!error) {
                            app.helper.showSuccessNotification({message: data.message});
                        }
                    });
                },
            });
        }
    },
    registerEvents: function () {
        this.registerSelectPDF();
        this.registerSignSelectPDF();
        this.registerPreviewPDF();
        this.registerSelectRecipient();
        this.registerSignSelectRecipient();
        this.registerSelectEmail();
        this.registerBackLink();
        this.registerEditTemplate();
    },
    registerEditTemplate: function () {
        const self = this,
            form = $('.SendToSignature_EditPDF');

        $('.editPDFTemplate').on('click', function () {
            let form = $(this).parents('form'),
                params = form.serializeFormData();

            params['mode'] = 'EditPDF';
            params['currentMode'] = form.find('.currentMode').val();

            self.createSignature(params);
        });

        $('.selectRecipient').on('click', function () {
            let form = $(this).parents('form'),
                params = form.serializeFormData();

            params['mode'] = 'SignSelectRecipient';
            params['currentMode'] = form.find('.currentMode').val();

            self.createSignature(params);
        });

        if (form.length) {
            self.registerCKEditor();
            self.validateEditPDF(form);
        }
    },
    registerCKEditor: function() {
        CKEDITOR.replace('templateBody');
        CKEDITOR.config.height = '50vh';
    },
    createSignature: function (extendParams) {
        const self = this;
        let params = {
            module: 'ITS4YouSignature',
            view: 'SendToSignature',
            mode: 'SelectPDF',
        };

        if (extendParams) {
            params = jQuery.extend(params, extendParams);
        }

        app.helper.showProgress(self.progressMessage);
        app.request.post({data: params}).then(function (error, data) {
            app.helper.hideProgress();
            if (!error) {
                const modal = jQuery('.myModal');

                if (modal.is('.in')) {
                    modal.find('.modal-dialog').replaceWith(data);

                    self.registerEvents();

                    vtUtils.applyFieldElementsView(modal.find('.modal-dialog'));
                } else {
                    app.helper.showModal(data, {
                        cb: function () {
                            self.registerEvents();
                        }
                    });
                }
            }
        });
    },
});

jQuery(function () {
    ITS4YouSignature_HS.getInstance().registerEvents();
});