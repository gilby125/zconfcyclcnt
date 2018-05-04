sap.ui.define([
	"sap/ui/base/Object",
	"sap/ui/model/Sorter",
	"com/woodward/zconfcyclcnt/model/formatter"
], function(BaseObject, Sorter, formatter) {
	"use strict";

	return BaseObject.extend("com.woodward.zconfcyclcnt.model.GroupSortState", {

		formatter: formatter,

		/**
		 * Creates sorters and groupers for the master list.
		 * Since grouping also means sorting, this class modifies the viewmodel.
		 * If a user groups by a field, and there is a corresponding sort option, the option will be chosen.
		 * If a user ungroups, the sorting will be reset to the default sorting.
		 * @class
		 * @public
		 * @alias com.woodward.zconfcyclcnt.model.GroupSortState
		 * @param {sap.ui.model.json.JSONModel} oViewModel the model of the current view
		 * @param {sap.ui.model.ResourceBundle} oResourceBundle the model of the Text Resources
		 * @param {function} fnGroupStorageType the grouping function to be applied for StorageType
		 * @param {function} fnGroupCountDate the grouping function to be applied for CountDate
		 * @param {function} fnGroupNameOfCounter the grouping function to be applied for NameOfCounter
		 */
		constructor: function(oViewModel, oResourceBundle, fnGroupStorageType, fnGroupCountDate, fnGroupNameOfCounter) {
			this._oViewModel = oViewModel;
			this._oResourceBundle = oResourceBundle;
			this._fnGroupStorageType = fnGroupStorageType;
			this._fnGroupCountDate = fnGroupCountDate;
			this._fnGroupNameOfCounter = fnGroupNameOfCounter;
		},

		/**
		 * Sorts by the value passed in (sKey).
		 * @param {string} sKey - the key of the field used for grouping
		 * @returns {sap.ui.model.Sorter[]} an array of sorters
		 */
		sort: function(sKey) {
			var sGroupedBy = this._oViewModel.getProperty("/groupBy");

			if (sGroupedBy !== "None") {
				// If the list is grouped, remove the grouping since the user wants to sort by something different
				// Grouping only works if the list is primary sorted by the grouping - the first sorten contains a grouper function
				this._oViewModel.setProperty("/groupBy", "None");
			}

			return [new Sorter(sKey, false)];
		},

		/**
		 * Groups depending on the value passed in as the "Key".
		 * @param {string} sKey - the key of the field used for grouping
		 * @returns {sap.ui.model.Sorter[]} an array of sorters
		 */
		group: function(sKey) {
			var aSorters = [],
				fnGrouper = this["_fnGroup" + sKey];

			if (fnGrouper) {
				this._oViewModel.setProperty("/sortBy", sKey);
				aSorters.push(
					new Sorter(sKey, false, fnGrouper.bind(this))
				);
			} else {
				this._oViewModel.setProperty("/sortBy", "InventoryDocNumber");	// default
			}

			return aSorters;
		}

	});
});