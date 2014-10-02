var EmailInterface = require('./EmailInterface');

module.exports = (function () {
	'use strict';

	/**
	 * @class SGSCommunication
	 * @classdesc `SGSCommunication` class for communicating with different protocols like SMS and emails.
	 *
	 * @return {SGSCommunication}
	 */
	function SGSCommunication () {}

	/**
	 * @function init
	 * @memberof SGSCommunication.prototype
	 *
	 * @param {object}	[options]			- Options
	 * @param {object}	[options.email]		- {@link EmailInterface} Options for the email protocol
	 *
	 * @return {SGSCommunication}
	 *
	 * @api public
	 */
	SGSCommunication.prototype.init = function (options) {

		this.protocols = {};

		if (options.email) {
			this.protocols.email = new EmailInterface(options.email);
		}

		// if (options.sms) {
			// new SMS Interface
		// }

	};

	/**
	 * Tells `SGSCommunication` what communication protocol and transport method to use.
	 *
	 * @function with
	 * @memberof SGSCommunication.prototype
	 *
	 * @param {string} protocol			- Protocol to use (SMS or email at the moment)
	 * @param {string} [transport]		- Transport method (SES, direct, sendmail ...etc.)
	 *
	 * @return {(undefined|EmailInterface)}
	 *
	 * @api public
	 */
	SGSCommunication.prototype.with = function (protocol, transport) {
		if (protocol in this.protocols) {
			return this.protocols[protocol].with(transport);
		}
	};

	return new SGSCommunication();

})();
