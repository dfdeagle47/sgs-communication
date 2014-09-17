var SGSComunication = require('./coverage/instrument/src/sgs-comunication');
var sgscomunication = new SGSComunication({
	email: {
		sender: {
			stub: {},
			defaultTransport: 'stub'
		},
		templatesPath: '../../../fixtures/templates',
		attachmentsPath: 'attachments'
	}
});

// var assert = require('assert');

describe('Testing the Crypto module:', function () {
	'use strict';

	it('Send email through stub', function (callback) {
		sgscomunication.with('email', 'stub').send(
			//settings
			{
				from: 'mickael@sagacify.com',
				to: 'mickael@sagacify.com',
				lang: 'en',
				type: 'invitation'
			},
			// data
			{
				user: {
					name: 'Mickael van der Beek'
				},
				link: 'http://www.google.be'
			},
			//options
			{
				ensureSuccess: true
			},
			// callback
			function (e) {
				console.log('Email sent !');
				console.log(arguments);
				callback(e);
			}
		);
	});

});
