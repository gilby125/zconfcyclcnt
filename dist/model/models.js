sap.ui.define([
	"sap/ui/model/json/JSONModel",
	"sap/ui/Device"
], function(JSONModel, Device) {
	"use strict";

	return {
		createDeviceModel: function() {
			var oModel = new JSONModel(Device);
			oModel.setDefaultBindingMode("OneWay");
			return oModel;
		},

		createFLPModel: function() {
			var fnGetuser = jQuery.sap.getObject("sap.ushell.Container.getUser"),
				bIsShareInJamActive = fnGetuser ? fnGetuser().isJamActive() : false,
				oModel = new JSONModel({
					isShareInJamActive: bIsShareInJamActive
				});
			oModel.setDefaultBindingMode("OneWay");
			return oModel;
		},

		createStateModel: function(oComponent) {
			// Get the URL (startup) paramters for the configured intent/action.
			var mParams = oComponent.getComponentData().startupParameters,
				sPersona = mParams.hasOwnProperty("Persona") ? mParams.Persona[0] : "";

			var oModel = new JSONModel({
				Persona: sPersona,
				WarehouseNumber: "",
				WarehouseText: "",
				DifferenceIndicators: []
			});
			oModel.setDefaultBindingMode("OneWay");
			return oModel;
		}
	};

});