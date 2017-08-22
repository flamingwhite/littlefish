const R = require('ramda');
const {
	makePromise
} = require('./utils');

const typeString = param => R.is(String, param) ? `"${param}"` :
	String(param);

const composeWhereArray = obj => {
	const str = Object.entries(obj)
		.filter(([key, value]) => value !== undefined && key)
		.map(([key, value]) => {
			if (value === null) return `${key} IS null`;
			if (R.is(Function, value)) return `${value(key)}`
			if (R.is(Array, value)) return `${key} IN (${value.map(typeString).join(',')})`;
			return `${key} = ${typeString(value)}`;
		})
	return str;
};

const composeWhereSql = (param = {}) => {
	if (R.is(String, param)) return ` WHERE ${param} `;
	const arr = composeWhereArray(param)
	return arr.length > 0 ? 'WHERE ' + arr.join(' and ') : 'WHERE true ';
};

const composeOrderSql = (orders = []) => {
	if (R.is(String, orders)) return `ORDER BY ${orders}`;
	if (!R.is(Array, orders)) orders = [orders];
	const arr = orders.map(({
		field,
		order = 'ASC'
	}) => field + ' ' + order)
	const orderStr = arr.length > 0 ? `ORDER BY ${arr.join(',')}` : ' ';
	return orderStr;
}

const queryCreator = R.curry((connect, tablename) => {
	const queryPromise = async con => makePromise((await con).query, await con);
	const insert = async item => (await queryPromise(connect))(`INSERT INTO ${tablename} SET ?`, item);
	const count = async cond => (await queryPromise(connect))(`SELECT COUNT(1) FROM ${tablename} ` + composeWhereSql(cond))
		.then(r => r[0]['COUNT(1)']);
	const exists = cond => count(cond).then(ct => ct > 0);
	const insertIfNotExists = async(cond, item = cond) => (await exists(cond)) ? {
		success: false,
		message: JSON.stringify(cond) + ' already exists'
	} : insert(item)

	const queryWithOptions = async(options = {}) => {
		const empty = (param, value, nullValue = '') => param ? value : nullValue
		const getFieldStr = fields => fields == null ? '*' :
			R.is(String, fields) ? fields :
			R.is(Array, fields) && !R.isEmpty(fields) ? fields.join(', ') : '*';

		const {
			select,
			distinct,
			where,
			groupBy,
			having,
			orderBy,
			limit,
			offset
		} = options;

		let str = `
			SELECT ${empty(distinct, 'DISTINCT')} ${getFieldStr(select)}
			FROM ${tablename}
			${composeWhereSql(where)}
			${empty(groupBy, ` GROUP BY ${groupBy} `)}
			${empty(having, ` HAVING ${having} `)}
			${composeOrderSql(orderBy)}
			${empty(limit, ` LIMIT ${limit} `)}
			${empty(offset, ` OFFSET ${offset} `)}
		`;

		console.log('str', str);
		return (await queryPromise(connect))(str);
	};

	const transaction = async(...pipes) => {
		const resolvedCon = await connect;
		makePromise(resolvedCon.beginTransaction, resolvedCon);
		try {
			let r;
			for (let fn of pipes) {
				r = await fn(r);
			}
			makePromise(resolvedCon.commit, resolvedCon)();
			return r;
		} catch (err) {
			await resolvedCon.rollback();
			throw err;
		}
	}
	return {
		sql: async q => (await queryPromise(connect))(q),
		query: queryWithOptions,
		select: cond => queryWithOptions({
			where: cond
		}),
		selectOne: cond => queryWithOptions({
			where: cond,
			limit: 1
		}).then(items => items && items[0]),
		count,
		exists,
		insert,
		insertIfNotExists,
		remove: async cond => cond == null ? Promise.reject('No condition specified in DELETE') : (await queryPromise(connect))(`DELETE FROM ${tablename} ${composeWhereSql(cond)}`),
		update: async(cond, patch) => (await queryPromise(connect))(`UPDATE ${tablename} SET ? ${composeWhereSql(cond)}`, [patch]),
		transaction
	};
});

module.exports = queryCreator;

const mysql = require('mysql');

const connection = mysql.createConnection({
	connectionLimit: 10,
	host: 'localhost',
	user: 'root',
	password: '1234',
	database: 'wind'
});

const tq = queryCreator(connection, 'flaming_table');

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
