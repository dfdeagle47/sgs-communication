// var SGSCommunication = require('./coverage/instrument/src/sgs-communication');
var SGSCommunication = require('../src/sgs-communication');
var sgscommunication = new SGSCommunication({
	email: {
		sender: {
			stub: {},
			defaultTransport: 'stub'
		},
		templatesDir: __dirname + '/fixtures/templates',
		attachmentsPath: 'attachments'
	}
});

// var assert = require('assert');

describe('Testing the Communication module:', function () {
	'use strict';

	it('Send email through stub', function (callback) {
		sgscommunication.with('email', 'stub').send(
			//settings
			{
				from: 'mickael@sagacify.com',
				to: 'mickael@sagacify.com',
				type: 'invitation'
			},
			// data
			[{
				user: {
					name: 'Mickael van der Beek'
				},
				link: 'http://www.google.be'
			}, {
				user: {
					name: 'Corn Flakes'
				},
				link: 'http://www.kelloggs.com'
			}],
			// callback
			function (e) {
				console.log('Email sent !');
				console.log(arguments);
				callback(e);
			}
		);
	});

});
