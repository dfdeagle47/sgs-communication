var _ = require('underscore');
var i18n = require('i18n');
var emailTemplates = require('email-templates');

module.exports = (function () {
	'use strict';

	function EmailTemplates (options) {

		options = options || {};

		var engines = [
			'handlebars'
		];

		var engine = 'handlebars';
		if(_.contains(engines, options.engine)) {
			engine = options.engine;
		}

		i18n.configure(_.extend({
			locales: ['en'],
			defaultLocale: 'en',
			directory: './languages',
			indent: '\t',
			objectNotation: true
		}, options.i18n));

		this.helpers = _.extend({
			__: function () {
				return i18n.__.apply(this, arguments);
			},
			__n: function () {
				return i18n.__n.apply(this, arguments);
			}
		}, options.helpers);

		this.partials = _.extend({}, options.partials);

	}

	EmailTemplates.prototype.render = function (options, callback) {
		var helpers = _.extend(this.helpers, options.helpers);
		var partials = _.extend(this.partials, options.partials);

		emailTemplates(options.templatesDir, {
			helpers: helpers,
			partials: partials
		}, function (e, template) {
			if(e) {
				return callback(e);
			}

			this.localize(template, options.templatesDir, options.type, options.items, callback);
		}.bind(this));
	};

	EmailTemplates.prototype.localize = function (template, templatesDir, type, items, callback) {
		var Render = function (locals) {
			var uid = locals._uid;
			locals._uid = null;
			delete locals._uid;

			this.locals = locals;

			this.send = function (e, text, html) {
				callback(null, {
					uid: uid,
					html: html,
					text: text
				});
			};

			this.batch = function (batch) {
				batch(this.locals, templatesDir, this.send);
			};
		};

		template(type, true, function (e, batch) {
			if(e) {
				return callback(e);
			}

			_.each(items, function (item, index) {
				item._uid = index;
				return (new Render(item)).batch(batch);
			});
		});
	};

	return EmailTemplates;

})();
