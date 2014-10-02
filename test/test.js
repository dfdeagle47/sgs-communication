var SGSCommunication = require('./coverage/instrument/src/sgs-communication');
// var SGSCommunication = require('../src/sgs-communication');
SGSCommunication.init({
	email: {
		sender: {
			stub: {},
			defaultTransport: 'stub'
		},
		templatesDir: __dirname + '/fixtures/templates'
	}
});

var templatingTests = require('./templating-tests');

describe('Testing the Communication module:', function () {
	'use strict';

	describe('Testing the templating features:', function () {
		templatingTests();
	});

});
