/*********************************************************************************
 * The content of this file is subject to the Key Metrics 4 You license.
 * ("License"); You may not use this file except in compliance with the License
 * The Initial Developer of the Original Code is IT-Solutions4You s.r.o.
 * Portions created by IT-Solutions4You s.r.o. are Copyright(C) IT-Solutions4You s.r.o.
 * All Rights Reserved.
 ********************************************************************************/

Vtiger_List_Js("ITS4YouKeyMetrics_List_Js", {

	listInstance : false,

	triggerAddKeyWidget : function(url) {
		app.helper.showProgress();
		app.request.get({url: url}).then(
			function(error, data) {
				app.helper.hideProgress();
				var callback = function(data) {
					var addForm = jQuery('#addKeyMetricsWidget');
					addForm.vtValidate({
						submitHandler: function(addForm) {
							var formData = jQuery(addForm).serializeFormData();
                							
							app.request.post({data:formData}).then(function(error,data){
								if(error == null){
									app.helper.hideModal();
									app.helper.showSuccessNotification({message:data.message});
									location.reload(true);
								} else {
									app.helper.showErrorNotification({'message' : error.message});
                                    jQuery('#addKeyMetricsWidget input[name="name"]').focus();
								}
							});
						},
						validationMeta : false
					});
				}
				var params = {};
				params.cb = callback
				app.helper.showModal(data, params);
            }
		)
	},
    
    deleteRecord : function(recorid) {
        if(typeof(recorid) == 'undefined')
            return false;
            var listInstance = ITS4YouKeyMetrics_List_Js.listInstance;
            var message = app.vtranslate('LBL_DELETE_CONFIRMATION');
        	app.helper.showConfirmationBox({'message' : message}).then(
                function(e) {
                    var deleteURL = "index.php?module=ITS4YouKeyMetrics&view=DeleteKeyMetrics&id="+recorid;
                    var deleteMessage = app.vtranslate('JS_RECORDS_ARE_GETTING_DELETED');
                    var progressIndicatorElement = jQuery.progressIndicator({
                            'message' : deleteMessage,
                            'position' : 'html',
                            'blockInfo' : {
                                'enabled' : true
                            }
                    });
                    app.request.post({url: deleteURL}).then(
                        function(error,data) {
                            progressIndicatorElement.progressIndicator({'mode' : 'hide'});
                        	if(error === null){
                                if(data.success) {
                                    app.hideModalWindow();
                                    /*
									var params = {
                                        title : app.vtranslate('JS_INFORMATION'),
                                        type : 'success',
                                        text : data.message
                                    }
                                    Vtiger_Helper_Js.showPnotify(params);
                                    */
                                    app.helper.showSuccessNotification({
				                        'message' : app.vtranslate('JS_DELETED')
				                    });
                                    location.reload(true);
                                } else {
                                    app.hideModalWindow();
                                    var params = {
                                        title : app.vtranslate('JS_LBL_PERMISSION'),
                                        text : data.result.message
                                    }
                                    Vtiger_Helper_Js.showPnotify(params);
                                }
                            }else {
                                aDeferred.reject();
                            }
                        });
                    },
                function(error, err){
                }
            );
    },

	massDelete : function(url) {
		var listInstance = ITS4YouKeyMetrics_List_Js.listInstance;
		var validationResult = listInstance.checkListRecordSelected();
		if(validationResult != true){
			// Compute selected ids, excluded ids values, along with cvid value and pass as url parameters
			var selectedIds = listInstance.readSelectedIds(true);
			var excludedIds = listInstance.readExcludedIds(true);
			var cvId = listInstance.getCurrentCvId();
			
			var message = app.vtranslate('LBL_DELETE_CONFIRMATION');
                        Vtiger_Helper_Js.showConfirmationBox({'message' : message}).then(
				function(e) {
					var deleteURL = url+'&viewname='+cvId+'&selected_ids='+selectedIds+'&excluded_ids='+excludedIds;
					var deleteMessage = app.vtranslate('JS_RECORDS_ARE_GETTING_DELETED');
					var progressIndicatorElement = jQuery.progressIndicator({
						'message' : deleteMessage,
						'position' : 'html',
						'blockInfo' : {
							'enabled' : true
						}
					});
					AppConnector.request(deleteURL).then(
						function(data) {
							progressIndicatorElement.progressIndicator({
								'mode' : 'hide'
							})
							if(data){
								listInstance.massActionPostOperations(data);
							}
						});
				},
				function(error, err){
				}
			);
		} else {
			listInstance.noRecordSelectedAlert();
		}

	}

},{

	init : function(){
		ITS4YouKeyMetrics_List_Js.listInstance = this;
	},

	updateCustomFilter : function (info){
		var folderId = info.folderId;
		var customFilter =  jQuery("#customFilter");
		var constructedOption = this.constructOptionElement(info);
		var optionId = 'filterOptionId_'+folderId;
		var optionElement = jQuery('#'+optionId);
		if(optionElement.length > 0){
			optionElement.replaceWith(constructedOption);
			customFilter.trigger("liszt:updated");
		} else {
			customFilter.find('#foldersBlock').append(constructedOption).trigger("liszt:updated");
		}
	},

	constructOptionElement : function(info){
		return '<option data-editable="'+info.isEditable+'" data-deletable="'+info.isDeletable+'" data-editurl="'+info.editURL+'" data-deleteurl="'+info.deleteURL+'" class="filterOptionId_'+info.folderId+'" id="filterOptionId_'+info.folderId+'" value="'+info.folderId+'" data-id="'+info.folderId+'">'+info.folderName+'</option>';
	},

	/*
	 * Function to perform the operations after the mass action
	 */
	massActionPostOperations : function(data){
		var thisInstance = this;
		var cvId = this.getCurrentCvId();
		if(data.result){
        	//TODO use pines alert for showing ketMetrics has saved
            var result = data.result;            
			app.hideModalWindow();
			var info = result.info;
			
            var params = {
				title : app.vtranslate('JS_INFORMATION'),
				text : result.message
			}
			Vtiger_Helper_Js.showPnotify(params);
		    location.reload(true);
		} else {
			app.hideModalWindow();
			var params = {
				title : app.vtranslate('JS_LBL_PERMISSION'),
				text : data.error.message+ ' : ' + data.error.code
			}
			Vtiger_Helper_Js.showPnotify(params);
		}
	},

	/*
	 * function to delete the folder
	 */
	deleteFolder : function(event,url){
		var thisInstance =this;
		AppConnector.request(url).then(
			function(data){
				if(data.success) {
					var chosenOption = jQuery(event.currentTarget).closest('.select2-result-selectable');
					var selectOption = thisInstance.getSelectOptionFromChosenOption(chosenOption);
					selectOption.remove();
					var customFilterElement = thisInstance.getFilterSelectElement();
					customFilterElement.trigger("liszt:updated");
					var defaultCvid = customFilterElement.find('option:first').val();
					customFilterElement.select2("val", defaultCvid);
					customFilterElement.trigger('change');
				} else {
					app.hideModalWindow();
					var params = {
						title : app.vtranslate('JS_INFORMATION'),
						text : data.error.message
					}
					Vtiger_Helper_Js.showPnotify(params);
				}
			}
		)
	},

	/*
	 * Function to register the click event for edit filter
	 */
	registerEditFilterClickEvent : function(){
		var thisInstance = this;
		var listViewFilterBlock = this.getFilterBlock();
		listViewFilterBlock.on('mouseup','li i.editFilter',function(event){
			var liElement = jQuery(event.currentTarget).closest('.select2-result-selectable');
			var currentOptionElement = thisInstance.getSelectOptionFromChosenOption(liElement);
			var editUrl = currentOptionElement.data('editurl');
			ITS4YouKeyMetrics_List_Js.triggerAddFolder(editUrl);
			event.stopPropagation();
		});
	},

	/*
	 * Function to register the click event for delete filter
	 */
	registerDeleteFilterClickEvent: function(){
		var thisInstance = this;
		var listViewFilterBlock = this.getFilterBlock();
		//used mouseup event to stop the propagation of customfilter select change event.
		listViewFilterBlock.on('mouseup','li i.deleteFilter',function(event){
			// To close the custom filter Select Element drop down
			thisInstance.getFilterSelectElement().data('select2').close();
			var liElement = jQuery(event.currentTarget).closest('.select2-result-selectable');
			var message = app.vtranslate('JS_LBL_ARE_YOU_SURE_YOU_WANT_TO_DELETE');
			Vtiger_Helper_Js.showConfirmationBox({'message' : message}).then(
				function(e) {
					var currentOptionElement = thisInstance.getSelectOptionFromChosenOption(liElement);
					var deleteUrl = currentOptionElement.data('deleteurl');
					thisInstance.deleteFolder(event,deleteUrl);
				},
				function(error, err){
				}
			);
			event.stopPropagation();
		});
	},

    /*
	 * Function to register the list view edit record click event
	 */
    registerEditRecordClickEvent: function(){
        var thisInstance = this;
        var listViewContentDiv = this.getListViewContentContainer();
        listViewContentDiv.on('click','.editRecordButton',function(e){
            var elem = jQuery(e.currentTarget);
            var recordId = elem.closest('tr').data('id');
            ITS4YouKeyMetrics_List_Js.triggerAddKeyWidget('index.php?module=ITS4YouKeyMetrics&view=EditKeyMetrics&id='+recordId);
            e.stopPropagation();
        });
	},

	/*
	 * Function to register the list view delete record click event
	 */
	registerDeleteRecordClickEvent: function(){
		var thisInstance = this;
		var listViewContentDiv = this.getListViewContentContainer();
		listViewContentDiv.on('click','.deleteRecordButton',function(e){
			var elem = jQuery(e.currentTarget);
			var recordId = elem.closest('tr').data('id');
			ITS4YouKeyMetrics_List_Js.deleteRecord(recordId);
			e.stopPropagation();
		});
	},

    /*
	 * Function which will give you all the list view params
	 */
	getListViewRecords : function(urlParams) {
		var aDeferred = jQuery.Deferred();
		if(typeof urlParams == 'undefined') {
			urlParams = {};
		}

		var thisInstance = this;
		var loadingMessage = jQuery('.listViewLoadingMsg').text();
		var progressIndicatorElement = jQuery.progressIndicator({
			'message' : loadingMessage,
			'position' : 'html',
			'blockInfo' : {
				'enabled' : true
			}
		});
        
		var urlParams = this.getDefaultParams();

		AppConnector.requestPjax(urlParams).then(
			function(data){
				progressIndicatorElement.progressIndicator({
					'mode' : 'hide'
				})
                var listViewContentsContainer = jQuery('#listViewContent')
                listViewContentsContainer.html(data);

				vtUtils.showSelect2ElementView(listViewContentsContainer);
                app.changeSelectElementView(listViewContentsContainer);

                thisInstance.registerListSearch();

			},

			function(textStatus, errorThrown){
				aDeferred.reject(textStatus, errorThrown);
			}
		);
		return aDeferred.promise();
	},

    /**
     * Function to register the list view row search event
     */
    registerListViewSearch: function () {
        var listViewPageDiv = this.getListViewContainer();
        var thisInstance = this;
        listViewPageDiv.on('click', '[data-trigger="listSearch"]', function (e) {
            e.preventDefault();
            var params = {
                'page': '1'
            }
            thisInstance.loadListViewRecords(params).then(
                function (data) {
                    //To unmark the all the selected ids
                    jQuery('#deSelectAllMsgDiv').trigger('click');
                },
                function (textStatus, errorThrown) {
                }
            );
        });

        //floatThead change event object has undefined keyCode, using keyup instead
        var prevSearchValues = [];
        listViewPageDiv.on('keyup', '.listSearchContributor', function (e) {
            var element = jQuery(e.currentTarget);
            var fieldName = element.attr('name');
            var searchValue = element.val();
            if (e.keyCode == 13 && prevSearchValues[fieldName] !== searchValue) {
                e.preventDefault();
                var element = jQuery(e.currentTarget);
                var parentElement = element.closest('tr');
                var searchTriggerElement = parentElement.find('[data-trigger="listSearch"]');
                searchTriggerElement.trigger('click');
                prevSearchValues[fieldName] = searchValue;
            }
        });

        listViewPageDiv.on('datepicker-change', '.dateField', function (e) {
            var element = jQuery(e.currentTarget);
            element.trigger('change');
        });
    },

    loadListViewRecords: function (urlParams) {
        var self = this;
        var aDeferred = jQuery.Deferred();
        var defParams = this.getDefaultParams();
        if (typeof urlParams == "undefined") {
            urlParams = {};
        }
        if (typeof urlParams.search_params == "undefined") {
            urlParams.search_params = JSON.stringify(this.getListSearchParams(false));
        }

        urlParams = jQuery.extend(defParams, urlParams);

        app.helper.showProgress();

        app.request.post({data: urlParams}).then(
            function(error,data){
                aDeferred.resolve(data);
                self.postLoadListViewRecords(data);
            },
            function(textStatus, errorThrown){
                aDeferred.reject(textStatus, errorThrown);
            }
        );

        return aDeferred.promise();
    },

    registerPostLoadListViewActions : function() {
        Vtiger_List_Js.prototype.registerPostLoadListViewActions();
        var listViewContentsContainer = jQuery('#listViewContent')
        vtUtils.showSelect2ElementView(listViewContentsContainer.find('select.select2'));
	},

    registerEditKeyMetricsRowStep1 : function() {
        var deleteElement = jQuery('.fa-trash');
        deleteElement.on('click', function(e) {
            var element = jQuery(e.currentTarget);
            var currentRow = jQuery(element).closest('.pickListValue');
            var key_metrics_row_id = currentRow.attr('data-key-id');
            
            if(typeof(key_metrics_row_id) == 'undefined')
                return false;
                var message = app.vtranslate('LBL_DELETE_CONFIRMATION');

            	app.helper.showConfirmationBox({'message' : message}).then(
                    function(e) {
                        
                        var deleteURL = "index.php?module=ITS4YouKeyMetrics&action=IndexAjax&mode=deleteKeyMetricRecord&id="+key_metrics_row_id;
                        var deleteMessage = app.vtranslate('JS_RECORDS_ARE_GETTING_DELETED');
                        var progressIndicatorElement = jQuery.progressIndicator({
                                'message' : deleteMessage,
                                'position' : 'html',
                                'blockInfo' : {
                                    'enabled' : true
                                }
                        });

                        app.helper.showProgress();
                        app.request.get({url: deleteURL}).then(
                            function (error, data) {
                                		app.hideModalWindow();
                                        if(data){
                                            if(data.success) {
                            					var params = {
                            						title : app.vtranslate('JS_DELETED'),
                                                    type : 'success',
                            						text : app.vtranslate('JS_DELETED')
                            					}
                            					Vtiger_Helper_Js.showPnotify(params);
                                                location.reload(true);
                            				} else {
                            					var params = {
                                    				title : app.vtranslate('JS_LBL_PERMISSION'),
                                    				text : data.result.message
                                    			}
                                    			Vtiger_Helper_Js.showPnotify(params);
                            				}
                                        }
                                });
                        },
                    function(error, err){
                    }
                );
        });
        var editElement = jQuery('.fa-pencil-square-o');
        editElement.on('click', function(e) {
            var element = jQuery(e.currentTarget);
            var currentRow = jQuery(element).closest('.pickListValue');
            var key_metrics_row_id = currentRow.attr('data-key-id');
            
            if(typeof(key_metrics_row_id) == 'undefined')
                return false;
            
            var km_id = jQuery("#km_id").val();
            if(typeof(km_id) == 'undefined' || km_id=="")
                return false;
            
            var editUrl = 'index.php?module=ITS4YouKeyMetrics&view=EditKeyMetricsRow&km_id='+km_id+'&id='+key_metrics_row_id+'&reportid=';
            window.location.href=editUrl;
        });
    },
        
    registerEditKeyMetricsRowStep2 : function() {
        
        var thisInstance = this;
        var next_rep_top = jQuery('#next_rep_top');
        
        var km_id = jQuery('#km_id').val();
        var location_href = 'index.php?module=ITS4YouKeyMetrics&view=EditKeyMetricsRow&km_id='+km_id+'&id=&reportid=';
        
        next_rep_top.on('click',function(){
            var reportid = jQuery('#reportname').val();
            if(reportid==""){
                alert(app.vtranslate('MISSING_REPORT_NAME'));
                return false;
            }
        	window.location.href=location_href+reportid;
        });
        var next_rep_top2 = jQuery('#next_rep_top2');
        next_rep_top2.on('click',function(){
        	var reportid = jQuery('#reportname').val();
            if(reportid==""){
                alert(app.vtranslate('MISSING_REPORT_NAME'));
                return false;
            }
            window.location.href=location_href+reportid;
        });
    },
    
    registerEditKeyMetricsRowStep3 : function() {
        var thisInstance = this;

        var form = jQuery('#addKeyMetricsWidget');

        let km_id = jQuery('#km_id').val();
        //register validation engine
        var params = {
            submitHandler : function(form) {
                app.helper.showProgress();
                let formData = jQuery(form).serializeFormData();
                let params = {
                    'url': 'index.php?module=ITS4YouKeyMetrics&action=SaveKeyMetricsRow',
                    "data": formData
                };
                app.request.get(params).then(
                    function (error, data) {
                        let res_status = data['success'];
                        let res_data = data['data'];

                        app.hideModalWindow();
                        if (true === res_status) {
                        	window.location.href = 'index.php?module=ITS4YouKeyMetrics&view=KeyMetricsRows&id=' + km_id;
                        	return true;
                        } else {
                            var params = {
                                title: app.vtranslate('JS_ERROR'),
                                text: res_data
                            }
                            Vtiger_Helper_Js.showPnotify(params);
                        }
                    }
                );
            }
        };
        if (form.length) {
            form.vtValidate(params);
            form.on('submit', function(e){
                e.preventDefault();
                return false;
            });
        }

    },
    
    registedAddNewWidget : function(){
        var add_widget_href = jQuery('#add_widget_href');
        add_widget_href.on('click', function(e) {
            ITS4YouKeyMetrics_List_Js.triggerAddKeyWidget('index.php?module=ITS4YouKeyMetrics&view=EditKeyMetrics');
        });
        jQuery('#ITS4YouKeyMetrics_listView_basicAction_LBL_ADD_RECORD').on('click', function(e) {
            ITS4YouKeyMetrics_List_Js.triggerAddKeyWidget('index.php?module=ITS4YouKeyMetrics&view=EditKeyMetrics');
        });
    },
    
    /*
	 * Function to register the click event for edit filter
	 */
	registerReportChangeEvent : function(){
		var thisInstance = this;
		var reportNameElement = jQuery('#reportname');
		reportNameElement.on('change', function(e) {
			var element = jQuery(e.currentTarget);
			var reportid = element.val();

            var url = 'index.php?module=ITS4YouKeyMetrics&action=IndexAjax&mode=getKeyMetricReportColumns&reportid='+reportid;

            jQuery("#column_str").removeClass('chzn-done');
            jQuery("#column_str").removeClass('chzn-select');
            jQuery("#column_str_chzn").remove();
            
//window.open(url);
            app.request.get({url: url}).then(
                function(error, data) {
                    let res_status = data['success'];
                    let res_data = data['data'];

					app.hideModalWindow();
                    if (true === res_status) {
                        var column_str = jQuery("#column_str");
                        column_str.html(res_data);
                        column_str.trigger("liszt:updated").trigger('change',false);
                    }else{
    					var params = {
    						title : app.vtranslate('JS_ERROR'),
    						text : res_data
    					}
    					Vtiger_Helper_Js.showPnotify(params);
                    }
                }
            );
                        
		});
	},

    initializePaginationEvents: function () {

	},

	registerEvents : function(){
		this._super();

		Vtiger_Index_Js.getInstance().registerAppTriggerEvent();

        this.registedAddNewWidget();
        
        this.registerEditRecordClickEvent();

        this.registerListViewSort();

		//Just reset all the checkboxes on page load: added for chrome issue.
		var listViewContainer = this.getListViewContentContainer();
		listViewContainer.find('#listViewEntriesMainCheckBox,.listViewEntriesCheckBox').prop('checked', false);
        
        this.registerListViewSearch();
	}, 
    
    registerPickListValuesSortableEvent : function() {
		var thisInstance = this;
        var tbody = jQuery( "tbody",jQuery('#pickListValuesTable'));
		tbody.sortable({
			'helper' : function(e,ui){
				//while dragging helper elements td element will take width as contents width
				//so we are explicity saying that it has to be same width so that element will not
				//look like distrubed
				ui.children().each(function(index,element){
					element = jQuery(element);
					element.width(element.width());
				})
				return ui;
			},
			'containment' : tbody,
			'revert' : true,
			update: function(e, ui ) {
				thisInstance.registerSaveSequenceClickEvent();
			}
		});
	},
    
    registerSaveSequenceClickEvent : function() {
		var progressIndicatorElement = jQuery.progressIndicator({
			'position' : 'html',
			'blockInfo' : {
				'enabled' : true,
				'elementToBlock' : jQuery('.tab-content')
			}
		});
		var pickListValuesSequenceArray = {}
		var pickListValues = jQuery('#pickListValuesTable').find('.pickListValue');
		jQuery.each(pickListValues,function(i,element) {
			pickListValuesSequenceArray[jQuery(element).data('key-id')] = ++i;
		});
		var params = {
			module : app.getModuleName(),
			parent : app.getParentModuleName(),
			action : 'IndexAjax',
			mode : 'saveKeyMetricsOrder',
			picklistValues : pickListValuesSequenceArray,
			picklistName : jQuery('[name="picklistName"]').val()
		}
        
		AppConnector.request(params).then(function(data) {
			if(typeof data.result != 'undefined') {
            	var result = data.result;
				var textVal = result.message;
				if(result.success){
            		progressIndicatorElement.progressIndicator({mode : 'hide'});
    				var params = {
    					title : app.vtranslate('JS_INFORMATION'),
                        type : 'success',
    					text : textVal
    				}
                    Vtiger_Helper_Js.showMessage(params);
				} else {
            		progressIndicatorElement.progressIndicator({mode : 'hide'});
    				var params = {
    					title : app.vtranslate('JS_ERROR'),
    					text : textVal
    				}
                    Vtiger_Helper_Js.showPnotify(params);
				}
			}
		});
	}
    
});
