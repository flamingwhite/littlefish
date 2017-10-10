'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var firebase = require('firebase');
var Rx = require('rxjs/Rx');

var _require = require('ramda'),
    curry = _require.curry;

var connect = function connect(config) {
	return app = firebase.initializeApp(config);
};

var config = {
	apiKey: "AIzaSyDhghirxL19-LekWjgvfq4uLGXOO_zDeRo",
	authDomain: "justdemo-ac305.firebaseapp.com",
	databaseURL: "https://justdemo-ac305.firebaseio.com",
	projectId: "justdemo-ac305",
	storageBucket: "justdemo-ac305.appspot.com",
	messagingSenderId: "338492799528"
};
firebase.initializeApp(config);

var rxOn = function rxOn(target, event) {
	return Rx.Observable.create(function (obs) {
		target.on(event, function (evt) {
			obs.next(evt);
		});
	});
};

// let getRef = refOrPath => typeof refOrPath == 'string' ? firebase.database().ref(refOrPath) : refOrPath;

var fireStream = function fireStream(ref) {
	return rxOn(ref, 'value').map(function (value) {
		return value.val() || {};
	});
};

var fireArrayStream = function fireArrayStream(ref) {
	return fireStream(ref).map(function (data) {
		return Object.entries(data || {}).map(function (_ref) {
			var _ref2 = _slicedToArray(_ref, 2),
			    _id = _ref2[0],
			    value = _ref2[1];

			return _extends({
				_id: _id
			}, value);
		});
	});
};

fireArrayStream('users/').subscribe(function (v) {
	return console.log(v);
});

var firePush = curry(function (ref, data) {
	var newRecord = ref.push();
	newRecord.set(_extends({}, data));
	return newRecord;
});

var fireUpdate = curry(function (ref, data) {
	return ref.set(data);
});

var fireRemoveById = curry(function (ref, _id) {
	return ref.child(_id).remove();
});

var fireOnce = function fireOnce(ref) {
	return Rx.Observable.create(function (obs) {
		ref.once('value').then(function (data) {
			obs.next(data.val());
			obs.complete();
		});
	});
};

var fireArrayOnce = function fireArrayOnce(ref) {
	return fireOnce(ref).map(function (data) {
		return Object.entries(data).map(function (_ref3) {
			var _ref4 = _slicedToArray(_ref3, 2),
			    _id = _ref4[0],
			    value = _ref4[1];

			return _extends({
				_id: _id
			}, value);
		});
	});
};

// let fireUpdateById = curry((refOrPath, _id, patch) => {
// 	let ref = getRef(refOrPath);
// 	return ref.child(_id).update(patch);
// })

var fireUpdateById = curry(function (ref, _id, patch) {
	return ref.child(_id).update(patch);
});

var fireRef = function fireRef(ref) {
	return {
		stream: function stream() {
			return fireStream(ref);
		},
		arrayStream: function arrayStream() {
			return fireArrayStream(ref);
		},
		once: function once() {
			return fireOnce(ref);
		},
		arrayOnce: function arrayOnce() {
			return fireArrayOnce(ref);
		},
		push: firePush(ref),
		removeById: fireRemoveById(ref),
		updateById: fireUpdateById(ref)
	};
};

module.exports = {
	connect: connect,
	firebase: firebase,
	fireRef: fireRef,
	fireStream: fireStream,
	fireArrayStream: fireArrayStream,
	fireUpdate: fireUpdate,
	fireRemoveById: fireRemoveById
};