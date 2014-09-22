var faker = require('faker');

module.exports = function (sgscommunication) {
	'use strict';

	it('Send a single email with data', function (callback) {
		sgscommunication.with('email', 'stub').send({
			from: faker.Internet.email(),
			to: faker.Internet.email(),
			type: 'testing'
		}, {
			user: {
				firstname: faker.Name.firstName(),
				lastname: faker.Name.lastName()
			},
			link: faker.Internet.domainName()
		}, callback);
	});

	it('Send a single email with data and a static subject', function (callback) {
		sgscommunication.with('email', 'stub').send({
			subject: faker.Lorem.sentence(),
			from: faker.Internet.email(),
			to: faker.Internet.email(),
			type: 'testing'
		}, {
			user: {
				firstname: faker.Name.firstName(),
				lastname: faker.Name.lastName()
			},
			link: faker.Internet.domainName()
		}, callback);
	});

	it('Send two emails fo the same type with the different data', function (callback) {
		sgscommunication.with('email', 'stub').send({
			from: faker.Internet.email(),
			to: faker.Internet.email(),
			type: 'testing'
		}, [{
			user: {
				firstname: faker.Name.firstName(),
				lastname: faker.Name.lastName()
			},
			link: faker.Internet.domainName()
		}, {
			user: {
				firstname: faker.Name.firstName(),
				lastname: faker.Name.lastName()
			},
			link: faker.Internet.domainName()
		}], callback);
	});

};