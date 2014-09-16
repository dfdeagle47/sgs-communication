// Nodemailer plugin is imported and will be used for both
// sending and receiving emails through various transports.
var nodemailer = require('nodemailer')
  , fs = require('fs');

// If Node.js version < 0.10.xx, we use the `readable-stream` module
// as a shim for the core `stream` module.
if(+process.versions.node.split('.').join('') < 1000) {
	require('readable-stream');
}

/**
 * @class EmailSender
 * @classdesc `EmailSender` class for sending and receiving emails.
 *
 * @param {object}						[options]					- Options
 * @param {string}						[options.defaultTransport]	- Name of the default transport method
 * @param {object}						[options.ses]				- {@link EmailSender#addSESTransport} Options for the SES transport
 * @param {string}						[options.direct]			- {@link  EmailSender#addDirectTransport} Options for the direct transport
 * @param {object}						[options.sendmail]			- {@link  EmailSender#addSendMailTransport} Options for the sendmail transport (linux only)
 * @param {object}						[options.dkim]				- {@link  EmailSender#useDKIM} Options DKIM signing
 *
 * @return {EmailSender}
 */
function EmailSender (options) {
	this.transports = {};

	if(options.ses) {
		this.addSESTransport(options.ses);
	}

	var defaultTransport = options.defaultTransport;
	if(!defaultTransport) {
		var os = process.platform;
		defaultTransport = 'direct';
		if(os.match(/linux/gi)) {
			defaultTransport = 'sendmail';
		}
	}

	if(defaultTransport === 'sendmail') {
		this.addSendMailTransport(options.sendmail);
	}
	else {
		this.addDirectTransport(options.direct);
	}

	this.useDKIM(options.DKIM);
}

/**
 * Configures and adds SES transport capabilities.
 *
 * @function addSESTransport
 * @memberof EmailSender.prototype
 *
 * @param {object} options					- Options for the SES transport
 * @param {string} options.AWSAccessKeyID	- AWS SES access key id
 * @param {string} options.AWSSecretKey		- AWS SES secret key
 *
 * @return {undefined}
 *
 * @api private
 */
EmailSender.prototype.addSESTransport = function (options) {
	this.transports.ses = nodemailer.createTransport('SES', {
		AWSAccessKeyID: options.AWSAccessKeyID,
		AWSSecretKey: options.AWSSecretKey,
		ServiceUrl: options.ServiceUrl
	});
};

/**
 * Configures and adds Direct transport capabilities. Direct transport
 * is used by default by the module.
 *
 * @function addDirectTransport
 * @memberof EmailSender.prototype
 *
 * @param {object}	[options]		- Options for the Direct transport
 * @param {boolean} [options.debug]	- Sets the debug mode to `true` / `false`
 *
 * @return {undefined}
 *
 * @api private
 */
EmailSender.prototype.addDirectTransport = function (options) {
	options = options || {};
	this.transports.direct = nodemailer.createTransport('direct', {
		debug: !!options.debug
	});
};

/**
 * Configures and adds Sendmail transport capabilities (UNIX only).
 *
 * @function addSendMailTransport
 * @memberof EmailSender.prototype
 *
 * @param {object}	options			- Options for the Direct transport
 * @param {boolean} [options.path]	- Path to the `sendmail` command, usually '/usr/local/bin/sendmail' or '/usr/sbin/sendmail'
 *
 * @return {undefined}
 *
 * @api private
 */
EmailSender.prototype.addSendMailTransport = function (options) {
	options = options || {};
	this.transports.sendmail = nodemailer.createTransport('sendmail', {
		path: options.path
	});
};

/**
 * The only public method exposed excluding the class constructor.
 * Like it's name indicates, it's used to send emails and handle the 
 * corresponding events.
 *
 * @function send
 * @memberof EmailSender.prototype
 *
 * @param {string}							transportMethod			- Options for the Direct transport
 * @param {object}							parameters				- Parameters used to setup the envelope and email body
 * @param {object}							options					- Options related to the event handlers of a send action
 * @param {boolean}							[options.ensureSuccess]	- Should wait for the full response before calling the callback (slower)
 * @param {function}						callback				- Callback
 *
 * @return {undefined}
 *
 * @api public
 */
EmailSender.prototype.send = function (transportMethod, parameters, options, callback) {
	var transport = this.transports[transportMethod.toLowerCase()];
	if(!transport || transportMethod === '*') {
		transportMethod = this.defaultTransport;
		transport = this.transports[transportMethod];
	}

	var ensureSuccess = !!options.ensureSuccess
	  , handler = ensureSuccess ? 'on' : 'once';

	transport.sendMail(parameters, function (error, response) {
		if(error) {
			return callback(error);
		}

		if(transportMethod !== 'direct') {
			return callback.apply(null, arguments);
		}

		response.statusHandler[handler]('failed', function (data) {
			callback(
				'[Error:EmailSender] - ' +
				'Permanently failed to send email to ' + data.domain + ' ' +
				'and got the following response ' + data.response + '.'
			);
		});

		response.statusHandler[handler]('sent', function (data) {
			callback(null);
		});

	});
};

/**
 * Sets-up the DKIM email signing mechanism.
 *
 * @function useDKIM
 * @memberof EmailSender.prototype
 *
 * @param {object}	[options]							- Options DKIM signing
 * @param {array}	options.transports					- Dictionary of transports that should use DKIM signing
 * @param {array}	options.transports.keySelector		- Key selectore for the TXT record with the DKIM public key
 * @param {array}	options.transports.privateKey		- Private RSA secret DKIM key used for the signing process
 * @param {array}	options.transports.domainName		- Domain used to sign
 *
 * @return {undefined}
 *
 * @api private
 */
EmailSender.prototype.useDKIM = function (options) {
	options = options || {};
	var transportsConfig = options.transports || {}
	  , transportConfig
	  , transportNames = transports ? Object.keys(transports) : []
	  , transportName
	  , transports = this.transports
	  , transport
	  , len = transports.length;

	while(len--) {
		transportName = transportNames[len];
		transportConfig = transportsConfig[transportName];
		if((transport = transports[transportName])) {
			transport.useDKIM({
				keySelector: transportConfig.keySelector,
				privateKey: fs.readFileSync(transportConfig.privateKey),
				domainName: transportConfig.domainName
			});
		}
	}

};

module.exports = EmailSender;
