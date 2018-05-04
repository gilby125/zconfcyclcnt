sap.ui.define([], function() {
	"use strict";

	return {

		/**
		 * Removes leading zeros from a string of numbers.
		 * @public
		 * @param {string} sValueIn value to be formatted
		 * @returns {string} formatted value
		 */
		removeLeadingZeros: function(sValueIn) {
			var sValueOut = "";
			if (sValueIn) {
				sValueOut = sValueIn.replace(/\b0+/g, '');
				if (!sValueOut) {
					sValueOut = "0";
				}
			}
			return sValueOut;
		},

		/**
		 * Removes leading zeros from a string of numbers.
		 * @public
		 * @param {string} dValue date value to be formatted
		 * @returns {string} formatted sting date
		 */
		formatDateMMDDYY: function(dValue) {
			var sDate = "";
			if (dValue && Object.prototype.toString.call(dValue) === "[object Date]") {
				sDate = (dValue.getMonth() + 1) + "/" + dValue.getDate() + "/" +  dValue.getFullYear();
			}
			return sDate;
		}

	};

});