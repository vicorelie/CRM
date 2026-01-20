/* * *******************************************************************************
 * The content of this file is subject to the ITS4YouSignature license.
 * ("License"); You may not use this file except in compliance with the License
 * The Initial Developer of the Original Code is IT-Solutions4You s.r.o.
 * Portions created by IT-Solutions4You s.r.o. are Copyright(C) IT-Solutions4You s.r.o.
 * All Rights Reserved.
 * ****************************************************************************** */

/** @var ITS4YouSignature_Sign_Js */
jQuery.Class('ITS4YouSignature_Sign_Js', {
    instance: false,
    getInstance: function () {
        if (!this.instance) {
            this.instance = new ITS4YouSignature_Sign_Js();
        }

        return this.instance;
    },
}, {
    registerEvents: function () {
        this.registerShowModal();
        this.registerSaveSignature();
        this.registerDeleteSignature();
        this.registerAcceptSignature();
    },
    getSignPad: function () {
        return jQuery('.sigPad').signaturePad({
            lineTop: 150,
            drawOnly: true,
        })
    },
    registerSignaturePad: function () {
        this.getSignPad();
    },
    getSignatureImage: function() {
        let self = this,
            image;

        if(jQuery('.typeIt .current').length) {
            let canvas = jQuery('#signCanvas').clone()[0],
                ctx = canvas.getContext('2d'),
                typed = jQuery('.typed');

            ctx.font = typed.css('font');
            ctx.fillStyle = typed.css('color');
            ctx.fillText(typed.text(), 5, 142);
            image = canvas.toDataURL('image/png');
        } else {
            image = self.getSignPad().getSignatureImage()
        }

        return image;
    },
    getForm: function() {
        return jQuery('#signatureForm');
    },
    getOutputElement: function () {
        return $('[name="output"]');
    },
    isEmptyOutput: function () {
        return !this.getOutputElement().val();
    },
    getImageElement: function() {
        return $('[name="image"]');
    },
    isEmptyImage: function () {
        return !this.getImageElement().val()
    },
    registerSaveSign: function () {
        const self = this;

        jQuery('.sigPad').on('submit', function (e) {
            if (self.isEmptyOutput()) {
                e.preventDefault();
            } else if (self.isEmptyImage()) {
                e.preventDefault();

                self.getImageElement().val(self.getSignatureImage());
                self.getForm().submit();
            }
        });
    },
    getData: function(params) {
        const aDeferred = jQuery.Deferred();

        jQuery.ajax({
            method: 'POST',
            url: 'ITS4YouSignature.php',
            data: params
        }).done(function( data ) {
            aDeferred.resolve(data);
        });

        return aDeferred.promise();
    },
    registerShowModal: function() {
        const self = this;

        jQuery('.showModal').on('click', function () {
            const params = jQuery(this).data('request');
            params['mode'] = 'showModal';

            self.getData(params).then(function(data) {
                if(data) {
                    app.helper.showModal(data);
                }
            });
        });

        jQuery('.myModal').on('shown.bs.modal', function() {
            self.registerSignaturePad();
            self.registerSaveSign();
        });
    },
    registerSaveSignature: function () {
        const self = this;

        jQuery('.saveSignature').on('click', function () {
            const params = jQuery(this).data('request');
            params['mode'] = 'saveSignature';

            self.saveSignature(params, 'Yes');
        });
    },
    registerAcceptSignature: function() {
        const self = this;

        jQuery('.acceptSignature').on('click', function () {
            const params = jQuery(this).data('request');
            params['mode'] = 'saveSignature';

            self.saveSignature(params, 'Yes');
        });
    },
    registerDeleteSignature: function () {
        const self = this;

        jQuery('.deleteSignature').on('click', function () {
            const params = jQuery(this).data('request');
            params['mode'] = 'deleteSignature';

            let buttonsInfo = {
                cancel: {
                    label: app.vtranslate('LBL_NO'),
                    className: 'btn-default confirm-box-btn-pad pull-right'
                },
                confirm: {
                    label: app.vtranslate('LBL_YES'),
                    className: 'confirm-box-ok confirm-box-btn-pad btn-primary'
                }
            };

            app.helper.showConfirmationBox({buttons: buttonsInfo, message: app.vtranslate('JS_CLEAR_SIGNATURE_CONFIRM')}).then(function () {
                app.helper.showProgress();

                self.getData(params).then(function (data) {
                    location.reload();
                });
            });
        });
    },
    saveSignature: function (params, sendEmail) {
        const self = this;

        params['sendEmail'] = sendEmail;

        app.helper.showProgress();
        self.getData(params).then(function (data) {
            app.helper.hideProgress();

            let message;

            if('Yes' === sendEmail) {
                message = 'JS_EMAIL_SENT';
            } else {
                message = 'JS_SAVED_SIGNATURE';
            }

            if (data['success']) {
                app.helper.showSuccessNotification({message: app.vtranslate(message)});
            } else {
                app.helper.showErrorNotification({message: app.vtranslate(message)});
            }

            location.reload();
        });
    },
})

jQuery(function () {
    ITS4YouSignature_Sign_Js.getInstance().registerEvents();
});