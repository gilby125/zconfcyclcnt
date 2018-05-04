/*global location */
sap.ui.define([
	"com/woodward/zconfcyclcnt/controller/BaseController",
	"sap/ui/model/json/JSONModel",
	"sap/m/MessageBox",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/m/MessageToast",
	"com/woodward/zconfcyclcnt/model/formatter"
], function(BaseController, JSONModel, MessageBox, Filter, FilterOperator, MessageToast, formatter) {
	"use strict";

	return BaseController.extend("com.woodward.zconfcyclcnt.controller.Detail", {

		formatter: formatter,

		/* =========================================================== */
		/* lifecycle methods                                           */
		/* =========================================================== */

		onInit: function() {
			// Bind the component and the default OData model.
			this._oComponent = this.getOwnerComponent();
			this._oODataModel = this._oComponent.getModel();
			this._oResourceBundle = this.getResourceBundle();

			// Model used to manipulate control states. The chosen values make sure,
			// detail page is busy indication immediately so there is no break in
			// between the busy indication for loading the view's meta data
			var oViewModel = new JSONModel({
				busy: false,
				delay: 0
			});
			this.setModel(oViewModel, "detailView");

			// Register the Transfer Order and Actual Bin search field for scanner event handlers.
			this._oComponent.oBarcodeScanHandler.registerScanListener({
				id: "DetailList",
				controller: this,
				onScan: this.onListBarcodeScan.bind(this)
			});

			this.getRouter().getRoute("object").attachPatternMatched(this._onObjectMatched, this);


			this.getOwnerComponent().getModel().metadataLoaded().then(this._onMetadataLoaded.bind(this));
		},

		/* =========================================================== */
		/* event handlers                                              */
		/* =========================================================== */

		/**
		 * Updates the item count within the line item table's header
		 * @param {object} oEvent an event containing the total number of items in the list
		 * @private
		 */
		onListUpdateFinished: function(oEvent) {
			// Update the scroller are.
			// this.setListScrollerHeight();
		},

		/**
		 * Called when the "Expand" event is fired on the header panel (expand button).
		 * @param {sap.ui.base.Event} oEvent header expand event object.
		 * @public
		 */
		onDetailPanelExpand: function(oEvent) {
			if (oEvent.getId() !== "expand") {
				var oPanel = this.getView().byId("detailPanel");
				oPanel.setExpanded(!oPanel.getExpanded());
			}

			// Wait until the panel open/close animation completes, then recalculate
			// the detail view scroller area.
			jQuery.sap.delayedCall(500, this, function() {
				this.setListScrollerHeight();
			}.bind(this));
		},

		/**
		 * Event handler for "Top-of-Page" event.  Moves the list to the top.
		 * @param {sap.ui.base.Event} oEvent the Go-To-Top button press event
		 * @public
		 */
		onGoToTop: function() {
			var oItem = this.getView().byId("detailList").getItems()[0];
			if (oItem) {
				var oScroller = this.getView().byId("detailListScroller");
				oScroller.scrollToElement(oItem, 300);
			}
		},

		/**
		 * Event handler for refresh event. Reload the OData entity bound to the list.
		 * @public
		 */
		onRefresh: function() {
			this._loadItemList();
		},

		/**
		 * Event handler for the detail list search field. Applies filter
		 * value and triggers a new search. If the search field's "refresh"
		 * button was been pressed, all of the list's filters are cleard.
		 * @param {sap.ui.base.Event} oEvent the search event
		 * @public
		 */
		onSearch: function(oEvent) {
			var oParams = oEvent.getParameters(),
				oList = this.getView().byId("detailList"),
				oFilter = null;

			if (!oParams.refreshButtonPressed) {
				var sQuery = oEvent.getParameter("query").toUpperCase();
				if (sQuery) {
					oFilter = new Filter([
						new Filter("Material", FilterOperator.Contains, sQuery),
						new Filter("Batch", FilterOperator.Contains, sQuery),
						new Filter("DestinationBin", FilterOperator.Contains, sQuery)
					], false);	// -or-
				}
			}

			oList.getBinding("items").filter(oFilter ? [oFilter] : [], "Application");

			if (oParams.fromScan && !(oParams.refreshButtonPressed || oParams.clearButtonPressed)) {
				// Navigate if there is only one row left.
				var aItems = oList.getItems();
				if (aItems.length === 1) {
					this._confirmInventoryItem(aItems[0]);
				} else if (aItems.length === 0) {
					MessageToast.show(this._oResourceBundle.getText("detailLineItemScanNoDataText", [sQuery]), {
						duration: 3000	// default
					});
				}

				// Clear the search field so it will not stick around. 
				this.getView().byId("detailSearchField").setValue().fireSearch({
					refreshButtonPressed: false,
					query: "",
					clearButtonPressed: true
				});
			} else if (oParams.refreshButtonPressed) {
				this._loadItemList();
			}
		},


		/**
		 * Detail Material list item press event handler.
		 * @param {object} oEvent Event object from list time selection
		 * @public
		 */
		onItemPress: function(oEvent) {
			var oList = oEvent.getSource(),
				oItem = oEvent.getParameter("listItem");
			// isConfirmed = this._oComponent.getModel().getProperty(oItem.getBindingContextPath()).Confirmation;

			oList.removeSelections();
			// if (!isConfirmed) {
			this._confirmInventoryItem(oItem);
			// } else {
			// 	this._showDetail(oItem);
			// }
		},

		/**
		 * Event handler called when the Dialog has been rendered. Set the focus to the QTY field.
		 * @pbulic
		 */
		onInvItemAfterOpen: function() {
			jQuery.sap.delayedCall(300, this, function() {
				var oInput = sap.ui.getCore().byId("inventoryItemCount");
				oInput.focus();
				$(oInput.getFocusDomRef()).select();
			});
		},

		/**
		 * Event handler for the Inventory Item dialog "Update". Call the OData update service.
		 * @param {object} oEvent - Button click event object.
		 * @public
		 */
		onInvItemUpdate: function(oEvent) {
			var sItemPath = this._oInvItemDialog.getBindingContext().getPath(),
				oItem = this._oODataModel.getProperty(sItemPath),
				sCounted = sap.ui.getCore().byId("inventoryItemCount").getValue();

			this._oInvItemDialog.setBusy(true);

			// Update the Count
			oItem.QuantityCounted = sCounted;

			var _fnUdateItem = function(sPath, oEntity) {
				// Send the OData "Update" request.
				this._oODataModel.update(sPath, oEntity, {
					success: function(odata, oRespone) {
						this._oInvItemDialog.close();
					}.bind(this),
					error: function(oError) {
						this._oODataModel.resetChanges();
						this._oInvItemDialog.setBusy(false);
					}.bind(this)
				});
			}.bind(this);

			// Check for zero quantity.
			if (parseInt(sCounted, 10) === 0) {
				MessageBox.confirm(this._oResourceBundle.getText("detailLineDialogConfirmZeroMsg"), {
					title: this._oResourceBundle.getText("detailLineDialogConfirmAmtTitle"),
					styleClass: this._oComponent.getContentDensityClass(),
					initialFocus: MessageBox.Action.CANCEL,
					onClose: function(sAction) {
						if (sAction === MessageBox.Action.CANCEL) {
							this._oODataModel.resetChanges();
							this._oInvItemDialog.setBusy(false);
						} else {
							oItem.ZeroStock = "X";
							_fnUdateItem(sItemPath, oItem);
						}
					}.bind(this)
				});

			} else {
				// Check the count for tollerance.
				var sHeaderPath = this.getView().getBindingContext().sPath,
					oHeader = this.getModel().getProperty(sHeaderPath),
					iExpected = parseInt(oItem.QuantityExpected, 10),
					iDifference = iExpected - parseInt(sCounted, 10),
					iTolerance = parseInt(oHeader.DifferenceAllowed, 10) / 100,	// percent
					iMinMax = Math.ceil(iExpected * iTolerance);
				// if (iMinMax - Math.abs(iDifference) < 0 ) {
				if ((iDifference / iExpected) >= iTolerance) {
					// var sMessage = this._oResourceBundle.getText("detailLineDialogConfirmAmtMsg",[
					// 	iMinMax.toString(),
					// 	iExpected.toString(),
					// 	sCounted,
					// 	Math.abs(iDifference).toString(),
					// 	iDifference > 0 ?	this._oResourceBundle.getText("detailLineDialogConfirmToFew") :
					// 						this._oResourceBundle.getText("detailLineDialogConfirmToMany")
					// ]);
					var iPercentage = (iDifference / iExpected) * -100,
						sMessage = this._oResourceBundle.getText("detailLineDialogConfirmAmtMsg", [Math.round(iPercentage)]);
					MessageBox.confirm(sMessage, {
						title: this._oResourceBundle.getText("detailLineDialogConfirmAmtTitle"),
						styleClass: this._oComponent.getContentDensityClass(),
						initialFocus: MessageBox.Action.CANCEL,
						onClose: function(sAction) {
							if (sAction === MessageBox.Action.CANCEL) {
								this._oODataModel.resetChanges();
								this._oInvItemDialog.setBusy(false);
							} else {
								_fnUdateItem(sItemPath, oItem);
							}
						}.bind(this)
					});
				} else {
					_fnUdateItem(sItemPath, oItem);
				}
			}
		},

		/**
		 * Event handler for the "Cancel" button press of the Transfer Order item 
		 * confirmation dialog for the Difference Indicator.
		 * @param {object} oEvent - Button click event object.
		 * @public
		 */
		onInvItemCancel: function(oEvent) {
			this._oODataModel.resetChanges();
			this._oInvItemDialog.close();
		},

		/**
		 * After Close event handler for the Transfer Order item confirmation dialog for the Difference Indicator.
		 * @param {object} oEvent - Button click event object.
		 * @public
		 */
		onInvItemAfterClose: function(oEvent) {
			this._oInvItemDialog.destroy();

			// Set the Barcode Scanner back to sending input to the Detail List search field.
			this._oComponent.oBarcodeScanHandler.setScanId("DetailList");
		},

		/**
		 * Activate the camera for List Search field barcode scanning.
		 * @param {sap.ui.base.Event} oEvent the Camera Scanner button event object
		 * @public
		 */
		onCameraScannerBtn: function() {
			this._oComponent.oBarcodeScanHandler.onCameraScanner();
		},

		/**
		 * If a hardware scan event is picked up (only when Cordova is running - DataWedge plugin),
		 * This function will be called with the details of the scan.
		 * @param {string} sScanValue value of scanned bar code.
		 * @public
		 */
		onListBarcodeScan: function(sScanValue) {
			var oSearch = this.getView().byId("detailSearchField");
			oSearch.setValue(sScanValue).fireSearch({
				refreshButtonPressed: false,
				query: sScanValue,
				clearButtonPressed: false,
				fromScan: true
			});
		},

		/**
		 * Event handler when the share by E-Mail button has been clicked
		 * @public
		 */
		onShareEmailPress: function() {
			var oViewModel = this.getModel("detailView");

			sap.m.URLHelper.triggerEmail(
				null,
				oViewModel.getProperty("/shareSendEmailSubject"),
				oViewModel.getProperty("/shareSendEmailMessage")
			);
		},

		/**
		 * Event handler when the share in JAM button has been clicked
		 * @public
		 */
		onShareInJamPress: function() {
			var oViewModel = this.getModel("detailView"),
				oShareDialog = sap.ui.getCore().createComponent({
					name: "sap.collaboration.components.fiori.sharing.dialog",
					settings: {
						object: {
							id: location.href,
							share: oViewModel.getProperty("/shareOnJamTitle")
						}
					}
				});

			oShareDialog.open();
		},

		/* =========================================================== */
		/* begin: helper methods                                       */
		/* =========================================================== */

		/**
		 * For the currently selected Icon Tab, calculate and set scroller height to
		 * take up the remainder of the view below the toolbar.
		 * @param {string} sTabKey the Detail view's tab identifier.
		 * @public
		 */
		setListScrollerHeight: function(sTabKey) {
			var oScroller = this.getView().byId("detailListScroller");
			if (!oScroller) {
				return;
			}

			var oPage = this.getView().byId("detailPage"),
				oToolBar = this.getView().byId("detailToolBar"),
				iPageHeight = oPage.$().outerHeight(true),
				iToolBarHeight = oToolBar ? oToolBar.$().outerHeight(true) : 0,
				iToolBarFromtop = oToolBar ? oToolBar.$().offset().top : 0,
				iFooterHeight = oPage.getAggregation("_page").getAggregation("footer").$().outerHeight(true),
				iHeight = iPageHeight - iToolBarFromtop - iToolBarHeight - iFooterHeight;

			oScroller.setHeight(iHeight.toString() + "px");
		},

		/* =========================================================== */
		/* begin: internal methods                                     */
		/* =========================================================== */

		/**
		 * Binds the view to the object path and expands the aggregated line items.
		 * @function
		 * @param {sap.ui.base.Event} oEvent pattern match event in route 'object'
		 * @private
		 */
		_onObjectMatched: function(oEvent) {
			var mArguments = oEvent.getParameter("arguments");
			this.getModel().metadataLoaded().then(function() {
				var sObjectPath = this.getModel().createKey("InventoryDocHeaderSet", {
					WarehouseNumber: mArguments.whseNbr,
					InventoryDocNumber: mArguments.docNbr
				});
				this._bindView("/" + sObjectPath);
			}.bind(this));

			// Set the Barcode Scanner to send input to the Detail List search field.
			this._oComponent.oBarcodeScanHandler.setScanId("DetailList");

			// Colapse the header panel (in case it was previously left open).
			this.byId("detailPanel").setExpanded(false);
		},

		/**
		 * Binds the view to the object path. Makes sure that detail view displays
		 * a busy indicator while data for the corresponding element binding is loaded.
		 * @function
		 * @param {string} sObjectPath path to the object to be bound to the view.
		 * @private
		 */
		_bindView: function(sObjectPath) {
			// Set busy indicator during view binding
			var oViewModel = this.getModel("detailView");

			// If the view was not bound yet its not busy, only if the binding requests data it is set to busy again
			oViewModel.setProperty("/busy", false);

			this.getView().bindElement({
				path: sObjectPath,
				events: {
					change: this._onBindingChange.bind(this),
					dataRequested: function() {
						oViewModel.setProperty("/busy", true);
					},
					dataReceived: function() {
						oViewModel.setProperty("/busy", false);
					}
				}
			});
		},

		_onBindingChange: function() {
			var oView = this.getView(),
				oElementBinding = oView.getElementBinding();

			// No data for the binding
			if (!oElementBinding.getBoundContext()) {
				this.getRouter().getTargets().display("detailObjectNotFound");
				// if object could not be found, the selection in the master list
				// does not make sense anymore.
				this.getOwnerComponent().oListSelector.clearMasterListSelection();
				return;
			}

			var sPath = oElementBinding.getPath(),
				oObject = oView.getModel().getObject(sPath),
				sObjectId = oObject.InventoryDocNumber,
				sObjectName = oObject.InventoryDocNumber,
				oViewModel = this.getModel("detailView");

			this.getOwnerComponent().oListSelector.selectAListItem(sPath);

			oViewModel.setProperty("/saveAsTileTitle", this._oResourceBundle.getText("shareSaveTileAppTitle", [sObjectName]));
			oViewModel.setProperty("/shareOnJamTitle", sObjectName);
			oViewModel.setProperty("/shareSendEmailSubject",
				this._oResourceBundle.getText("shareSendEmailObjectSubject", [sObjectId]));
			oViewModel.setProperty("/shareSendEmailMessage",
				this._oResourceBundle.getText("shareSendEmailObjectMessage", [sObjectName, sObjectId, location.href]));
		},

		_onMetadataLoaded: function() {
			// Store original busy indicator delay for the detail view
			var iOriginalViewBusyDelay = this.getView().getBusyIndicatorDelay(),
				oViewModel = this.getModel("detailView"),
				oLineItemTable = this.byId("detailList"),
				iOriginalLineItemTableBusyDelay = oLineItemTable.getBusyIndicatorDelay();

			// Make sure busy indicator is displayed immediately when
			// detail view is displayed for the first time
			oViewModel.setProperty("/delay", 0);
			oViewModel.setProperty("/lineItemTableDelay", 0);

			oLineItemTable.attachEventOnce("updateFinished", function() {
				// Restore original busy indicator delay for line item table
				oViewModel.setProperty("/lineItemTableDelay", iOriginalLineItemTableBusyDelay);
			});

			// Binding the view will set it to not busy - so the view is always busy if it is not bound
			oViewModel.setProperty("/busy", true);

			// Restore original busy indicator delay for the detail view
			oViewModel.setProperty("/delay", iOriginalViewBusyDelay);
		},

		/**
		 * Load the Inventory Document item list from the OData model.
		 * @private
		 */
		_loadItemList: function() {
			var sPath = this.getView().getBindingContext().sPath;
			this._oComponent.getModel().read(sPath + "/InventoryDocItemSet", {
				success: function(oData, oResult) {
					this.byId("detailPullToRefresh").hide();
				}.bind(this),
				error: function(oError) {
					this.byId("detailPullToRefresh").hide();
				}.bind(this)
			});
		},

		/**
		 * Show the dialog to collect the (confirmed) quantity.  Buttons are to Confirm
		 * or Cancel the action.
		 * @param {object} oItem is the Transfer Order Item bound to the dialog.
		 * @private
		 */
		_confirmInventoryItem: function(oItem) {
			this._oInvItemDialog = sap.ui.xmlfragment("com.woodward.zconfcyclcnt.view.fragment.InventoryItemDialog", this);
			this._oInvItemDialog.setModel(this._oComponent.getModel());
			this._oInvItemDialog.bindElement(oItem.getBindingContextPath());
			this._oInvItemDialog.setModel(this._oComponent.getModel("i18n"), "i18n");
			this._oInvItemDialog.setModel(this._oComponent.getModel("device"), "Device");
			this._oInvItemDialog.setModel(this.getModel("detailView"), "detailView");
			this._oInvItemDialog.addStyleClass(this._oComponent.getContentDensityClass());

			// Disable the Barcode Scanner so nothing gets sent the Material List (search field).
			this._oComponent.oBarcodeScanHandler.setScanId("");

			// Start the dialog.
			this._oInvItemDialog.open();
		}
	});

});