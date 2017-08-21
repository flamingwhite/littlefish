"use strict";

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

module.exports = {
	makePromise: makePromise
};

// var test = (d, cb) => {
// 	cb(null, 'resolved data');
// }

// makePromise(test)(4444).then(a => console.log(' cccc ', a)).catch(console.log)

// var test2 = d => Promise.resolve(d);

// test2(555433).then(console.log)

// makePromise(test2)(555433).then(console.log)