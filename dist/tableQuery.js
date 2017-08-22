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

		if (value === null) return key + ' IS null';
		if (R.is(Function, value)) return '' + value(key);
		if (R.is(Array, value)) return key + ' IN (' + value.map(typeString).join(',') + ')';
		return key + ' = ' + typeString(value);
	});
	return str;
};

var composeWhereSql = function composeWhereSql() {
	var param = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

	if (R.is(String, param)) return ' WHERE ' + param + ' ';
	var arr = composeWhereArray(param);
	return arr.length > 0 ? 'WHERE ' + arr.join(' and ') : 'WHERE true ';
};

var composeOrderSql = function composeOrderSql() {
	var orders = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];

	if (R.is(String, orders)) return 'ORDER BY ' + orders;
	if (!R.is(Array, orders)) orders = [orders];
	var arr = orders.map(function (_ref5) {
		var field = _ref5.field,
		    _ref5$order = _ref5.order,
		    order = _ref5$order === undefined ? 'ASC' : _ref5$order;
		return field + ' ' + order;
	});
	var orderStr = arr.length > 0 ? 'ORDER BY ' + arr.join(',') : ' ';
	return orderStr;
};

var queryCreator = R.curry(function (connect, tablename) {
	var queryPromise = async function queryPromise(con) {
		return makePromise((await con).query, (await con));
	};
	var insert = async function insert(item) {
		return (await queryPromise(connect))('INSERT INTO ' + tablename + ' SET ?', item);
	};
	var count = async function count(cond) {
		return (await queryPromise(connect))('SELECT COUNT(1) FROM ' + tablename + ' ' + composeWhereSql(cond)).then(function (r) {
			return r[0]['COUNT(1)'];
		});
	};
	var exists = function exists(cond) {
		return count(cond).then(function (ct) {
			return ct > 0;
		});
	};
	var insertIfNotExists = async function insertIfNotExists(cond) {
		var item = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : cond;
		return (await exists(cond)) ? {
			success: false,
			message: JSON.stringify(cond) + ' already exists'
		} : insert(item);
	};

	var queryWithOptions = async function queryWithOptions() {
		var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

		var empty = function empty(param, value) {
			var nullValue = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : '';
			return param ? value : nullValue;
		};
		var getFieldStr = function getFieldStr(fields) {
			return fields == null ? '*' : R.is(String, fields) ? fields : R.is(Array, fields) && !R.isEmpty(fields) ? fields.join(', ') : '*';
		};

		var select = options.select,
		    distinct = options.distinct,
		    where = options.where,
		    groupBy = options.groupBy,
		    having = options.having,
		    orderBy = options.orderBy,
		    limit = options.limit,
		    offset = options.offset;


		var str = '\n\t\t\tSELECT ' + empty(distinct, 'DISTINCT') + ' ' + getFieldStr(select) + '\n\t\t\tFROM ' + tablename + '\n\t\t\t' + composeWhereSql(where) + '\n\t\t\t' + empty(groupBy, ' GROUP BY ' + groupBy + ' ') + '\n\t\t\t' + empty(having, ' HAVING ' + having + ' ') + '\n\t\t\t' + composeOrderSql(orderBy) + '\n\t\t\t' + empty(limit, ' LIMIT ' + limit + ' ') + '\n\t\t\t' + empty(offset, ' OFFSET ' + offset + ' ') + '\n\t\t';

		console.log('str', str);
		return (await queryPromise(connect))(str);
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
		sql: async function sql(q) {
			return (await queryPromise(connect))(q);
		},
		query: queryWithOptions,
		select: function select(cond) {
			return queryWithOptions({
				where: cond
			});
		},
		selectOne: function selectOne(cond) {
			return queryWithOptions({
				where: cond,
				limit: 1
			}).then(function (items) {
				return items && items[0];
			});
		},
		count: count,
		exists: exists,
		insert: insert,
		insertIfNotExists: insertIfNotExists,
		remove: async function remove(cond) {
			return cond == null ? Promise.reject('No condition specified in DELETE') : (await queryPromise(connect))('DELETE FROM ' + tablename + ' ' + composeWhereSql(cond));
		},
		update: async function update(cond, patch) {
			return (await queryPromise(connect))('UPDATE ' + tablename + ' SET ? ' + composeWhereSql(cond), [patch]);
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

// tq.query({
// 	orderBy: { field: 'id', order: 'desc' },
// 	fields: ['year', 'title']
// }).then(console.log)

// tq.query({
// 	where: {
// 		year: null
// 	},
// 	fields: ['id','title'],
// 	orderBy: [{
// 		field: 'title',
// 		order: 'desc'
// 	},{
// 		field: 'id',
// 		order: 'desc'
// 	}],
// 	limit: 10,
// }).then(console.log)

// tq.query({
// 	fields: ['id','title'],
// 	orderBy: [{
// 		field: 'title',
// 		order: 'desc'
// 	},{
// 		field: 'id',
// 		order: 'desc'
// 	}],
// 	limit: 10,
// })
// .then(a => a.map(x => x.title))
// 	.then(console.log)

// tq.query().then(console.log);

// tq.transaction(
// 	() => tq.select({
// 		year: 2000
// 	}),
// 	r => {
// 		console.log('r => ', r);
// 		return tq.insert({
// 			title: 'newthing'
// 		})
// 	},
// 	() => tq.insert({
// 		id: 200
// 	}),
// 	r => {
// 		console.log('r a', r);
// 		return tq.count()
// 	}
// ).then(console.log).catch(console.log)

// tq.select().then(a => console.log(a.length));
// tq.select({id: [200, 250, 300], year: null}).then(console.log)
// tq.count({year: () => 'year is not null'}).then(console.log)

// tq.query({
// 	select: '*',
// 	where: {
// 		id: [193, 194, 195, 290]
// 	},
// 	orderBy: 'id desc'
// }).then(console.log)

// tq.exists().then(console.log)
// tq.insertIfNotExists({
// 	id: 200
// }).then(console.log)

// tq.update({ id: 193 }, { title: 'pengran xindongss' }).then(console.log);
// tq.remove({id: 290}).then(console.log)