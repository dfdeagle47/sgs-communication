var _ = require('underscore');
var fs = require('fs');
var path = require('path');
var async = require('async');
var MailParser = require('mailparser').MailParser;
// var HtmlToText = require('html-to-text');
var EmailSender = require('./EmailSender');
var EmailReceiver = require('./EmailReceiver');
var EmailTemplates = require('./EmailTemplates');

module.exports = (function () {
	'use strict';

	/**
	 * @class EmailInterface
	 * @classdesc `EmailInterface` class that serves as an interface / middleman between the code base and the EmailSender.
	 *
	 * @param {object} [options]					- Options
	 * @param {object} [options.sender]				-  {@link EmailSender} Options for the email sending service
	 * @param {object} [options.receiver]			-  {@link EmailReceiver} Options for the email sending service
	 *
	 * @return {EmailInterface}
	 */
	function EmailInterface (options) {

		options = options || {};

		this.templatesDir = options.templatesDir;

		if (options.sender) {
			this.sender = new EmailSender(options.sender);
			this.templating = new EmailTemplates(options.templating);
		}

		if (options.receiver) {
			this.receiver = new EmailReceiver(options.receiver);
		}

		this.transport = null;

	}

	/**
	 * Small chaining method that sets the transport type for the following send command.
	 *
	 * @function with
	 * @memberof EmailInterface.prototype
	 *
	 * @param {string}	transport	-	Name of the transport method (e.g: 'SES', 'direct', 'sendmail', ...etc.)
	 *
	 * @return {EmailInterface}
	 *
	 * @api public
	 */
	EmailInterface.prototype.with = function (transport) {
		return (this.transport = transport, this);
	};

	/**
	 * Chaining of some RegExps to clean up quotes and email authors.
	 *
	 * @function getCleanEmailBody
	 * @memberof EmailInterface.prototype
	 *
	 * @param {string}	email	-	The fully buffered / streamed email content
	 *
	 * @return {string}
	 *
	 * @api private
	 */
	EmailInterface.prototype.getCleanEmailBody = function (email) {
		// TODO convert from HTML to text and then cleanup if email is HTML
		email = email
			// Remove email signatures
			.replace(/(\r?\n)\-{2} ?(\r?\n)[\w\W]+/, '')
			// Remove Outlook previous message header
			.replace(/(\r?\n)\-+ ?Original Message ?\-+[\w\W]+/i, '')
			// Remove other type of Outlook previous message header
			.replace(/(\r?\n)\_{30,}[\w\W]+/, '')
			.replace(/(\r?\n)\-{30,}[\w\W]+/, '')
			// Mac OSX mail
			.replace(/(\r?\n)On ([^(\r?\n)]*?) wrote:(\r?\n)[\w\W]+/i, '')
			// Forwarded emails
			.replace(/(\r?\n)\-{5,} ?Forwarded by [\w\W]+ ?\-{5,}(\r?\n)/i, '')
			// Outlook and other email clients's reply format with multilingual support
			.replace(/(\r?\n)\*?(From|De)\*?: [\w\W]+/i, '')
			// Hotmail reply format
			.replace(/(\r?\n)Date: [\w\W]+/i, '')
			// Smartphone footer
			.replace(/(\r?\n)Sent from my [\w\W]+/i, '')
			// Sent by signature style
			.replace(/(\r?\n)Sent by:[\w\W]+/i, '')
			// Remove replies
			.replace(/(\r?\n)> [\w\W]+/i, '')
			.trim();

		return email;
	};

	/**
	 * Closure function that return new instances of a mail parser stream to which receiveid emails are piped to.
	 *
	 * @function InstanciateMailParser
	 * @memberof EmailInterface.prototype
	 *
	 * @param {function}	callback	- Callback
	 *
	 * @return {function}
	 *
	 * @api public
	 */
	EmailInterface.prototype.InstanciateMailParser = function (callback) {
		var me = this;
		return function () {
			var mailParser = new MailParser({
				debug: false
				// TODO streamAttachments
				// TODO unescapeSMTP
				// TODO defaultCharset
				// TODO showAttachmentLinks
			});

			mailParser.on('end', function (email) {
				email.text = me.getCleanEmailBody(email.text);
				// TODO clean html bodies too using JSDOM or cheerio
				callback(null, email);
			});

			return mailParser;
		};
	};

	/**
	 * Assembles an object containing all the needed informations to create a valid
	 * envelope and (HTML) email body.
	 *
	 * @function assembleEmail
	 * @memberof EmailInterface.prototype
	 *
	 * @param {object}			settings					- Data use to create the envelop and email body
	 * @param {string}			settings.from				- Sender email
	 * @param {(string|array)}	settings.to					- Destination email address(es)
	 * @param {array}			[settings.cc]				- Recipients in the Cc field
	 * @param {array}			[settings.bcc]				- Recipients in the Bcc field
	 * @param {string}			[settings.replyTo]			- ReplyTo field
	 * @param {string}			[settings.inReplyTo]		- Message Id to which the email replies to
	 * @param {string}			[settings.references]		- Messages Id list
	 * @param {string}			[settings.subject]			- Subject of the email
	 * @param {string}			[settings.text]				- Plaintext body
	 * @param {string}			[settings.html]				- HTML body
	 * @param {object}			[settings.headers]			- HTTP / SMTP headers
	 * @param {array}			[settings.attachments]		- List of attachments files / buffers or strings
	 * @param {array}			[settings.messageId]		- List of attachments files / buffers or strings
	 *
	 * @param {object}			[data]						- Data to feed to the templating engine
	 *
	 * @param {function}		callback					- Callback
	 *
	 * @return {undefined}
	 *
	 * @api private
	 */
	EmailInterface.prototype.assembleEmail = function (settings, data, callback) {
		var accumulator = {};
		var attachments = false;

		var type = settings.type;
		var subject = settings.subject;

		var accumulate = function (templates) {
			var uid = templates.uid;
			templates.uid = null;
			delete templates.uid;

			accumulator[uid] = _.extend(accumulator[uid] || {}, templates);

			var instance = accumulator[uid];

			if(instance.html && instance.subject && attachments !== false) {
				accumulator[uid] = null;
				delete accumulator[uid];
				callback(null, instance);
			}
		}.bind(this);

		var templatesDir = this.templatesDir;
		var templating = this.templating;

		async.auto({
			renderedEmail: function (cb) {
				var contentDir = path.resolve(templatesDir, 'content');

				templating.render({
					templatesDir: contentDir,
					partials: {},
					helper: {},
					items: data,
					type: type
				}, function (e, templates) {
					if(e) {
						return cb(e);
					}

					accumulate(templates);
					cb();
				});
			},
			renderedSubject: function (cb) {
				if(_.isString(subject)) {
					return accumulate({
						subject: subject
					});
				}

				var subjectDir = path.resolve(templatesDir, 'subject');

				templating.render({
					templatesDir: subjectDir,
					partials: {},
					helper: {},
					items: data,
					type: type
				}, function (e, templates) {
					if(e) {
						return cb(e);
					}

					accumulate({
						uid: templates.uid,
						subject: templates.html
					});
					cb();
				});
			},
			attachmentsFiles: function (cb) {
				var attachmentsDir = path.resolve(templatesDir, 'attachments', type);

				fs.readdir(attachmentsDir, cb);
			},
			attachmentsList: ['attachmentsFiles', function (cb, results) {
				attachments = {};
				attachments = _.map(
					results.attachmentsFiles,
					function (attachment) {
						return {
							filename: attachment,
							path: attachment,
							cid: attachment
						};
					}
				);
				cb();
			}]
		}, function (e, results) {
			if(e) {
				return callback(e);
			}

			// _.merge(emailFields, {
			// 	html: results.renderedEmail.html,
			// 	text: results.renderedEmail.text,
			// 	subject: results.renderedSubject,
			// 	attachments: results.attachmentsList
			// });

			// callback(null, emailFields);
		});
	};

	/**
	 * Send an email with wathever transport was setup by EmailSender.
	 *
	 * @function send
	 * @memberof EmailInterface.prototype
	 *
	 * @param {object}		settings	- {@link  EmailInterface#assembleEmail} Data use to create the envelop and email body
	 * @param {object}		data		- Data to feed to the templating engine
	 * @param {function}	callback	- Callback
	 *
	 * @return {undefined}
	 *
	 * @api public
	 */
	EmailInterface.prototype.send = function (settings, data, callback) {
		if(_.isArray(data) === false) {
			data = [data];
		}

		var callbackCount = data.length;

		var transport = this.transport;
		this.assembleEmail(settings, data, function (e, emailContents) {
			if (e) {
				return callback(e);
			}

			_.extend(settings, emailContents);

			var failed = [];
			var succeeded = [];

			this.sender.send(transport, settings, function (e, info) {
				callbackCount -= 1;

				if(e && _.isArray(e.errors)) {
					_.union(
						failed,
						_.map(e.errors, function (error) {
							return error.recipients;
						})
					);
				}

				if (!info || !_.isObject(info)) {
					return;
				}

				if (_.isArray(info.accepted)) {
					_.union(
						succeeded,
						info.accepted
					);
				}
				if (_.isArray(info.rejected)) {
					_.union(
						failed,
						info.rejected
					);
				}
				if (_.isArray(info.pending)) {
					_.union(
						failed,
						info.pending
					);
				}

				if (callbackCount === 0) {
					callback(null, failed, succeeded);
				}
			});
		}.bind(this));

	};

	/**
	 * Receives emails on the local email server, parses and forwards them to a callback.
	 *
	 * @function receive
	 * @memberof EmailInterface.prototype
	 *
	 * @param {function} callback	- Callback function called after the entire email has been streamed and parsed
	 *
	 * @return {undefined}
	 *
	 * @api public
	 */
	EmailInterface.prototype.receive = function (callback) {
		var mailParserInstanciator = this.InstanciateMailParser(callback);
		this.receiver.receive(mailParserInstanciator);
	};

	return EmailInterface;

})();
