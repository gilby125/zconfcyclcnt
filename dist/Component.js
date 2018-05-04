/**
 * Load the Woodward custom library.
 */
sap.ui.getCore().loadLibrary("zlibrary", "/sap/bc/ui5_ui5/sap/zlibrary");	// ABAP FES
sap.ui.getCore().loadLibrary("zlibrary", "/sap/fiori/zlibrary");			// HCP


sap.ui.define([
	"sap/ui/core/UIComponent",
	"sap/ui/Device",
	"com/woodward/zconfcyclcnt/model/models",
	"com/woodward/zconfcyclcnt/controller/ListSelector",
	"com/woodward/zconfcyclcnt/controller/ErrorHandler",
	"zlibrary/ca/BarcodeScanHandler",
	"zlibrary/wm/WarehouseSelector"
], function(UIComponent, Device, models, ListSelector, ErrorHandler, BarcodeScanHandler, WarehouseSelector) {
	"use strict";

	return UIComponent.extend("com.woodward.zconfcyclcnt.Component", {

		metadata: {
			manifest: "json"
		},

		/**
		 * The component is initialized by UI5 automatically during the startup of the app and calls the init method once.
		 * In this method, the FLP and device models are set and the router is initialized.
		 * @public
		 * @override
		 */
		init: function() {
			// Set the device model.
			this.setModel(models.createDeviceModel(), "device");
			// Set the FLP model.
			this.setModel(models.createFLPModel(), "FLP");
			// Set the app State model.
			this.setModel(models.createStateModel(this), "appState");

			// Bind the User Info object.
			var fnGetUser = jQuery.sap.getObject("sap.ushell.Container.getUser");
			if (fnGetUser) {
				this._oUserInfo = fnGetUser();
			}

			// Bind the List Selector and OData Error Handle convinience APIs.
			this.oListSelector = new ListSelector();
			this.oErrorHandler = new ErrorHandler(this);

			// Call the base component's init function and create the App view.
			UIComponent.prototype.init.apply(this, arguments);

			// Install the Barcode handler from the Woodward custom library.
			this.oBarcodeScanHandler = new BarcodeScanHandler(this, "FioriNoInput");

			// Install the Warehouse Selector from the Woodward custom library.
			this.oWarehouseSelector = new WarehouseSelector(function(mWhse) {

				// Update the app state model.
				var oAppStateModel = this.getModel("appState");
				oAppStateModel.setProperty("/WarehouseNumber", mWhse.WarehouseNumber);
				oAppStateModel.setProperty("/WarehouseText", mWhse.WarehouseText);
				oAppStateModel.setProperty("/hasCameraScanner", this.oBarcodeScanHandler.hasCameraScanner());

				// Start the router.
				this.getRouter().initialize();
			}.bind(this), this);
		},

		/**
		 * The component is destroyed by UI5 automatically.
		 * In this method, the ListSelector and ErrorHandler are destroyed.
		 * @public
		 * @override
		 */
		destroy: function() {
			// Resest the Datawedge scan profile back to the default profile.
			if (this.oBarcodeScanHandler.hasHardwareScanner()) {
				this.oBarcodeScanHandler.setScanProfile(this.oBarcodeScanHandler.sDefaultProfile);
			}

			// Destroy all of the previously constructed components.
			this.oListSelector.destroy();
			this.oErrorHandler.destroy();
			this.oBarcodeScanHandler.destroy();
			this.oWarehouseSelector.destroy();

			// call the base component's destroy function
			UIComponent.prototype.destroy.apply(this, arguments);
		},

		/**
		 * This method can be called to determine whether the sapUiSizeCompact or sapUiSizeCozy
		 * design mode class should be set, which influences the size appearance of some controls.
		 * @public
		 * @return {string} css class, either 'sapUiSizeCompact' or 'sapUiSizeCozy' - or an empty string if no css class should be set
		 */
		getContentDensityClass: function() {
			if (this._sContentDensityClass === undefined) {
				// check whether FLP has already set the content density class; do nothing in this case
				if (jQuery(document.body).hasClass("sapUiSizeCozy") || jQuery(document.body).hasClass("sapUiSizeCompact")) {
					this._sContentDensityClass = "";
				} else if (!Device.support.touch) { // apply "compact" mode if touch is not supported
					this._sContentDensityClass = "sapUiSizeCompact";
				} else {
					// "cozy" in case of touch support; default for most sap.m controls, but needed for desktop-first controls like sap.ui.table.Table
					this._sContentDensityClass = "sapUiSizeCozy";
				}
			}
			return this._sContentDensityClass;
		}

	});

});