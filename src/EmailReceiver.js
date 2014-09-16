var simplesmtp = require('simplesmtp');

/**
 * @class EmailReceiver
 * @classdesc `EmailReceiver` class for receiving emails on the SMS protocol.
 *
 * @param {object}		[options]						- Options
 * @param {object}		[options.disableDNSValidation]	- Validate of the sender domain
 * @param {string}		[options.SMTPBanner]			- Banner sent to the client whe connecting
 * @param {boolean}		[options.debug]					- Run module in debug mode `true` / `false`
 * @param {number}		[options.port=25]				- Port on which the SMTP server will run. By default port 25.
 * @param {function}	[options.senderValidator]		- {@link  EmailReceiver#validateSender}
 * @param {function}	[options.recipientValidator]	- {@link  EmailReceiver#validateRecipient}
 *
 * @param {function}	[callback]						- Optional callback which will be called when the server is ready.
 *
 * @return {EmailReceiver}
 */
function EmailReceiver (options, callback) {

	this.smtp = simplesmtp.createServer({
		disableDNSValidation: options.disableDNSValidation || true,
		SMTPBanner: options.SMTPBanner || 'My Server',
		debug: !!options.debug
	});

	this.smtp.listen(options.port || 25, callback || function (error) {
		if(error) {
			console.log([
				'[Error:EmailReceiver] - ',
				(error.stack || error)
			].join(''));
		}
		else {
			console.log([
				'[Success:EmailReceiver] - ',
				'SMTP Email server listening on port ',
				options.port || 25
			].join(''));
		}
	});

	if(options.senderValidator) {
		this.validateSender(options.senderValidator);
	}
	if(options.recipientValidator) {
		this.validateRecipient(options.recipientValidator);
	}

}

/**
 * Generates a pseudo-random number which will be used as an emails queue id.
 *
 * @function getEmailQueueId
 * @memberof EmailReceiver.prototype
 *
 * @return {string}
 *
 * @api private
 */
EmailReceiver.prototype.getEmailQueueId = function () {
	return Math.abs(Math.random() * Math.random() * Date.now() | 0).toString();
};

/**
 * Validates the sender's email address. By default, every email address will be accepted.
 *
 * @function validateSender
 * @memberof EmailReceiver.prototype
 *
 * @param {function} [senderValidator]	- Custom sender validation method
 *
 * @return {undefined}
 *
 * @api private
 */
EmailReceiver.prototype.validateSender = function (senderValidator) {
	this.smtp.on('validateSender', senderValidator);
};

/**
 * Validates the recipient(s)'s email address(es). By default, every email address will be accepted.
 *
 * @function validateRecipient
 * @memberof EmailReceiver.prototype
 *
 * @param {function} [senderValidator]	- Custom recipient validation method
 *
 * @return {undefined}
 *
 * @api private
 */
EmailReceiver.prototype.validateRecipient = function (recipientValidator) {
	this.smtp.on('validateRecipient', recipientValidator);
};

/**
 * Validates the recipient(s)'s email address(es). By default, every email address will be accepted.
 *
 * @function validateRecipient
 * @memberof EmailReceiver.prototype
 *
 * @param {function} [stream]	- Stream function that will accumulate the email chunks
 *
 * @return {undefined}
 *
 * @api public
 */
EmailReceiver.prototype.receive = function (stream) {
	var emailQueueId = this.getEmailQueueId();
	this.smtp.on('startData', function (connection) {
		connection.saveStream = stream();
	}).on('data', function (connection, chunk) {
		connection.saveStream.write(chunk);
	}).on('dataReady', function (connection, callback) {
		connection.saveStream.end();
		callback(null, emailQueueId);
	});
};

module.exports = EmailReceiver;
