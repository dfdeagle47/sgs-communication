// Nodemailer plugin is imported and will be used for
//  sending emails through various transport methods.
var _ = require('underscore');
var nodemailer = require('nodemailer');
var sesTransport = require('nodemailer-ses-transport');
var stubTransport = require('nodemailer-stub-transport');
var directTransport = require('nodemailer-direct-transport');
var sendmailTransport = require('nodemailer-sendmail-transport');
var NodemailerHtmlToText = require('nodemailer-html-to-text').htmlToText;

// If Node.js version < 0.10.xx, we use the `readable-stream` module
// as a shim for the core `stream` module.
if (+process.versions.node.match(/^(\d+.\d+).\d+$/)[1] < 0.10) {
	require('readable-stream');
}

module.exports = (function () {
	'use strict';

	/**
	 * @class EmailSender
	 * @classdesc `EmailSender` class for sending and receiving emails.
	 *
	 * @param {object}						[options]					- Options
	 * @param {string}						[options.defaultTransport]	- Name of the default transport method
	 * @param {object}						[options.ses]				- {@link EmailSender#addSESTransport} Options for the SES transport
	 * @param {string}						[options.stub]				- {@link  EmailSender#addStubMailTransport} Options for the stub transport
	 * @param {string}						[options.direct]			- {@link  EmailSender#addDirectTransport} Options for the direct transport
	 * @param {object}						[options.sendmail]			- {@link  EmailSender#addSendMailTransport} Options for the sendmail transport (linux only)
	 *
	 * @return {EmailSender}
	 */
	function EmailSender (options) {

		this.transports = {};

		if (options.direct) {
			this.addDirectTransport(options.direct);
		}

		if (options.stub) {
			this.addStubMailTransport(options.stub);
		}

		if (options.ses) {
			this.addSESTransport(options.ses);
		}

		var defaultTransport = options.defaultTransport;
		if (!defaultTransport) {
			var platform = process.platform;
			defaultTransport = 'direct';
			if (platform.match(/linux/gi)) {
				defaultTransport = 'sendmail';
			}
		}

		if (defaultTransport === 'sendmail') {
			this.addSendMailTransport(options.sendmail);
		}
		else {
			this.addDirectTransport(options.direct);
		}

		this.compiler = true;
		if (_.isBoolean(options.compiler)) {
			this.compiler = options.compiler;
		}

	}

	/**
	 * Configures and adds SES transport capabilities.
	 *
	 * @function addSESTransport
	 * @memberof EmailSender.prototype
	 *
	 * @param {object} options					- Options for the SES transport
	 * @param {string} options.secretAccessKey	- AWS SES access key id
	 * @param {string} options.accessKeyId		- AWS SES secret key
	 * @param {string} [options.sessionToken]	- Session token
	 * @param {object} [options.httpOptions]	- AWS low-level HTTP request options (see: `http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/SES.html`)
	 * @param {number} [options.rateLimit]		- Limit amount of emails that can be sent each second
	 * @param {string} [options.region]			- AWS region (eg: `us-east-1`)
	 *
	 * @return {undefined}
	 *
	 * @api private
	 */
	EmailSender.prototype.addSESTransport = function (options) {
		this.transports.ses = nodemailer.createTransport(sesTransport({
			secretAccessKey: options.secretAccessKey,
			accessKeyId: options.accessKeyId,
			sessionToken: options.sessionToken,
			httpOptions: options.httpOptions,
			rateLimit: options.rateLimit,
			region: options.region
		}));
	};

	/**
	 * Configures and adds Stub transport capabilities that will mostly be used for testing.
	 *
	 * @function addStubMailTransport
	 * @memberof EmailSender.prototype
	 *
	 * @return {undefined}
	 *
	 * @api private
	 */
	EmailSender.prototype.addStubMailTransport = function () {
		this.transports.stub = nodemailer.createTransport(stubTransport());
	};

	/**
	 * Configures and adds Direct transport capabilities. Direct transport
	 * is used by default by the module.
	 *
	 * @function addDirectTransport
	 * @memberof EmailSender.prototype
	 *
	 * @param {object}		[options]			- Options for the Direct transport
	 * @param {hostname}	[options.hostname]	- Hostname for the MX server
	 * @param {boolean}		[options.debug]		- Sets the debug mode to `true` / `false`
	 *
	 * @return {undefined}
	 *
	 * @api private
	 */
	EmailSender.prototype.addDirectTransport = function (options) {
		options = options || {};
		this.transports.direct = nodemailer.createTransport(directTransport({
			hostname: options.hostname,
			debug: options.debug
		}));
	};

	/**
	 * Configures and adds Sendmail transport capabilities (UNIX only).
	 *
	 * @function addSendMailTransport
	 * @memberof EmailSender.prototype
	 *
	 * @param {object}	options			- Options for the Direct transport
	 * @param {boolean} [options.path]	- Path to the `sendmail` command, usually '/usr/local/bin/sendmail' or '/usr/sbin/sendmail'
	 * @param {object}	[options.args]	- Additional arguments for the sendmail command
	 *
	 * @return {undefined}
	 *
	 * @api private
	 */
	EmailSender.prototype.addSendMailTransport = function (options) {
		options = options || {};
		this.transports.sendmail = nodemailer.createTransport(sendmailTransport({
			path: options.path,
			args: options.args
		}));
	};

	/**
	 * The only public method exposed excluding the class constructor.
	 * Like it's name indicates, it's used to send emails and handle the
	 *  corresponding events.
	 *
	 * @function send
	 * @memberof EmailSender.prototype
	 *
	 * @param {string}							transportMethod			- Options for the Direct transport
	 * @param {object}							settings				- Parameters used to setup the envelope and email body
	 * @param {function}						callback				- Callback
	 *
	 * @return {undefined}
	 *
	 * @api public
	 */
	EmailSender.prototype.send = function (transportMethod, settings, callback) {
		var transport = this.transports[transportMethod.toLowerCase()];

		if (this.compiler) {
			transport.use('compile', NodemailerHtmlToText());
		}

		if (!transport || transportMethod === '*') {
			transportMethod = this.defaultTransport;
			transport = this.transports[transportMethod];
		}

		transport.sendMail(settings, callback);
	};

	return EmailSender;

})();
