sap.ui.define([], function() {
	"use strict";

	/*
	 * Use this file to implement your custom grouping functions
	 * The predefined functions are simple examples and might be replaced by your more complex implementations
	 * to be called with .bind() and handed over to a sap.ui.model.Sorter
	 * return value for all your functions is an object with  key-text pairs
	 * the oContext parameter is not under your control!
	 */

	return {

		/**
		 * Groups the items by Storage Type.
		 * @public
		 * @returns {Function} the grouper function you can pass to your sorter
		 */
		groupStorageType: function() {
			return function(oContext) {
				var sStorageType = oContext.getProperty("StorageType"),
				sTitle = this._oResourceBundle.getText("masterGroup1") + ": ";

				return {
					key: sStorageType,
					text: sTitle + sStorageType
				};
			};
		},

		/**
		 * Groups the items by proposed Count Date.
		 * @public
		 * @returns {Function} the grouper function you can pass to your sorter
		 */
		groupCountDate: function() {
			return function(oContext) {
				var sCountDate = oContext.getProperty("CountDate"),
					sTitle = this._oResourceBundle.getText("masterGroup2") + ": ";

				return {
					key: sCountDate,
					text:sTitle + this.formatter.formatDateMMDDYY(sCountDate)
				};
			};
		},

		/**
		 * Groups the items by User ID of the proposed Counter.
		 * @public
		 * @returns {Function} the grouper function you can pass to your sorter
		 */
		groupNameOfCounter: function() {
			return function(oContext) {
				var sNameOfCounter = oContext.getProperty("NameOfCounter"),
					sTitle = this._oResourceBundle.getText("masterGroup3") + ": ";
				
				if (!sNameOfCounter) {
					sNameOfCounter = this._oResourceBundle.getText("masterListAttrCounterUnknown");
				}

				return {
					key: sNameOfCounter,
					text: sTitle + sNameOfCounter
				};
			};
		}

	};
});