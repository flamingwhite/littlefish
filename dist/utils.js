'use strict';

var makePromise = function makePromise(fn, context) {
	return function () {
		for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
			args[_key] = arguments[_key];
		}

		return new Promise(function (resolve, reject) {
			var r = fn.call.apply(fn, [context].concat(args, [function (err, result) {
				return err ? reject(err) : resolve(result);
			}]));
			if (r.then) resolve(r);
		});
	};
};

var dev = ['dev', 'development'].includes(process.env.NODE_ENV);
var log = function log() {
	var _console;

	return dev && (_console = console).log.apply(_console, arguments);
};

module.exports = {
	makePromise: makePromise,
	log: log
};