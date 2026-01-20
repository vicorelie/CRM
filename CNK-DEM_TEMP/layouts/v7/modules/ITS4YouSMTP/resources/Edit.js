Vtiger_Index_Js('ITS4YouSMTP_Edit_Js', {}, {
    registerEvents: function () {
        this.registerAppTriggerEvent();
        this.retrieveTokenButton();
    },
    getForm() {
        return $('#EditView')
    },
    retrieveTokenButton() {
        const self = this,
            form = self.getForm();

        form.on('click', '.retrieveToken', function () {
            let params = form.serializeFormData()

            params['action'] = 'Auth';
            params['mode'] = 'url';

            app.request.post({data: params}).then(function (error, data) {
                if (!error) {
                    if(data['url']) {
                        self.getTokenElement().val('');

                        window.open(data['url'], '_blank')
                    }

                    if(data['message']) {
                        app.helper.showErrorNotification({message: data['message']});
                    }
                }
            });
        });

        form.on('click', '.refreshToken', function () {
            self.loadToken();
        });
    },
    getTokenElement() {
        return this.getForm().find('[name="client_token"]');
    },
    loadToken() {
        const self = this,
            clientId = self.getForm().find('[name="client_id"]').val(),
            token = self.getTokenElement().val(),
            params = {
                module: 'ITS4YouSMTP',
                action: 'Auth',
                mode: 'token',
                client_id: clientId,
            }

        if (!clientId || token) {
            return false;
        }

        app.request.post({data: params}).then(function (error, data) {
            if (!error && data['token']) {
                self.getForm().find('[name="client_token"]').val(data['token']);
            }
        });
    },
});