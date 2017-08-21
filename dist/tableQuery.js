'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var R = require('ramda');

var _require = require('./utils'),
    makePromise = _require.makePromise;

var typeString = function typeString(param) {
	return R.is(String, param) ? '"' + param + '"' : String(param);
};

var composeWhereArray = function composeWhereArray(obj) {
	var str = Object.entries(obj).filter(function (_ref) {
		var _ref2 = _slicedToArray(_ref, 2),
		    key = _ref2[0],
		    value = _ref2[1];

		return value !== undefined && key;
	}).map(function (_ref3) {
		var _ref4 = _slicedToArray(_ref3, 2),
		    key = _ref4[0],
		    value = _ref4[1];

		if (R.is(Function, value)) return '' + value(key);
		if (R.is(Array, value)) return key + ' in (' + value.map(typeString).join(',') + ')';
		if (value === null) return key + ' is null';
		return key + ' = ' + typeString(value);
	});
	return str;
};

var composeWhereSql = function composeWhereSql() {
	var obj = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

	var arr = composeWhereArray(obj);
	return arr.length > 0 ? ' where ' + arr.join(' and ') : ' where true ';
};

var queryCreator = R.curry(function (connect, tablename) {
	var _select = 'select * from ' + tablename;

	var _query = async function _query(con) {
		return makePromise((await con).query, (await con));
	};
	var insert = async function insert(item) {
		return (await _query(connect))('insert into ' + tablename + ' set ?', item);
	};
	var count = async function count(cond) {
		return (await _query(connect))('select count(1) from ' + tablename + ' ' + composeWhereSql(cond)).then(function (r) {
			return r[0]['count(1)'];
		});
	};
	var exists = function exists(cond) {
		return count(cond).then(function (ct) {
			return ct > 0;
		});
	};
	var insertIfNotExists = async function insertIfNotExists(cond, item) {
		return (await exists(cond)) ? {
			success: false,
			message: JSON.stringify(cond) + ' already exists'
		} : insert(item);
	};
	var transaction = async function transaction() {
		for (var _len = arguments.length, pipes = Array(_len), _key = 0; _key < _len; _key++) {
			pipes[_key] = arguments[_key];
		}

		var resolvedCon = await connect;
		makePromise(resolvedCon.beginTransaction, resolvedCon);
		try {
			var r = void 0;
			var _iteratorNormalCompletion = true;
			var _didIteratorError = false;
			var _iteratorError = undefined;

			try {
				for (var _iterator = pipes[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
					var fn = _step.value;

					r = await fn(r);
				}
			} catch (err) {
				_didIteratorError = true;
				_iteratorError = err;
			} finally {
				try {
					if (!_iteratorNormalCompletion && _iterator.return) {
						_iterator.return();
					}
				} finally {
					if (_didIteratorError) {
						throw _iteratorError;
					}
				}
			}

			makePromise(resolvedCon.commit, resolvedCon)();
			return r;
		} catch (err) {
			await resolvedCon.rollback();
			throw err;
		}
	};

	return {
		query: async function query(q) {
			return (await _query(connect))(q);
		},
		select: async function select(cond) {
			return (await _query(connect))(_select + composeWhereSql(cond));
		},
		selectAll: async function selectAll() {
			return (await _query(connect))(_select);
		},
		selectOne: async function selectOne(cond) {
			return (await _query(connect))(_select + composeWhereSql(cond) + ' limit 1').then(function (items) {
				return items && items[0];
			});
		},
		count: count,
		exists: exists,
		insert: insert,
		insertIfNotExists: insertIfNotExists,
		remove: async function remove(cond) {
			return cond == null ? Promise.reject('no con in delete') : (await _query(connect))('delete from ' + tablename + ' ' + composeWhereSql(cond));
		},
		update: async function update(cond, patch) {
			return (await _query(connect))('update ' + tablename + ' set ? where ?', [patch, cond]);
		},
		transaction: transaction
	};
});

module.exports = queryCreator;

var mysql = require('mysql');

var connection = mysql.createConnection({
	connectionLimit: 10,
	host: 'localhost',
	user: 'root',
	password: '1234',
	database: 'wind'
});

var tq = queryCreator(connection, 'flaming_table');

// const a = async() => {
// 	// var item = await tq.select({
// 	// 	title: '雨人'
// 	// });
// 	// console.log(item)
// 	return tq.exists({
// 		id: (await tq.selectOne({
// 			id: 200
// 		})).id
// 	})
// }

// a().then(x => console.log(x, ' from a'))

tq.selectOne().then(console.log);

tq.select({
	year: function year(y) {
		return y + ' > 200';
	},
	id: [193, 300, 194, '344']
}).then(console.log);

tq.exists({
	title: '雨人'
}).then(console.log);

tq.exists({
	title: 'aaaa雨人'
}).then(console.log);

tq.select({
	title: '雨人'
}).then(function (item) {
	return console.log(item.length);
});

tq.selectOne({
	title: '雨人'
}).then(console.log);

tq.count({ year: function year(_) {
		return _ + ' > 200';
	} }).then(console.log);

tq.transaction(function () {
	return tq.select({ id: 200 });
},
// () => tq.insert({id: 770, title: 'what is that'}),
function () {
	return tq.count();
}, function (r) {
	console.log('from last', r);
	tq.select({ id: 100, title: 'what is that' });
}, function () {
	return tq.select({ id: 100, title: 'what is that' });
}).then(console.log).catch(function (e) {
	return console.log('errrrrrr,', e);
});