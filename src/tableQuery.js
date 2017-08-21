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
			if (value === null) return `${key} is null`;
			if (R.is(Function, value)) return `${value(key)}`
			if (R.is(Array, value)) return `${key} in (${value.map(typeString).join(',')})`;
			return `${key} = ${typeString(value)}`;
		})
	return str;
};

const composeWhereSql = (obj = {}) => {
	const arr = composeWhereArray(obj)
	return arr.length > 0 ? ' where ' + arr.join(' and ') : ' where true ';
};

const composeOrderSql = (orders = []) => {
	if (!R.is(Array, orders)) orders = [orders];
	const arr = orders.map(({
		field,
		order = 'asc'
	}) => field + ' ' + order)
	const orderStr = arr.length > 0 ? ` order by ${arr.join(',')}` : ' ';
	return orderStr;
}

const queryCreator = R.curry((connect, tablename) => {
	const select = `select * from ${tablename}`;

	const queryPromise = async con => makePromise((await con).query, await con);
	const insert = async item => (await queryPromise(connect))(`insert into ${tablename} set ?`, item);
	const count = async cond => (await queryPromise(connect))(`select count(1) from ${tablename} ` + composeWhereSql(cond))
		.then(r => r[0]['count(1)']);
	const exists = cond => count(cond).then(ct => ct > 0);
	const insertIfNotExists = async(cond, item) => (await exists(cond)) ? {
		success: false,
		message: JSON.stringify(cond) + ' already exists'
	} : insert(item)

	const queryWithOptions = async(options = {}) => {
		const empty = (param, value, nullValue = '') => param ? value : nullValue
		const getFieldStr = fields => fields == null ? '*' :
			R.is(String, fields) ? fields :
			R.is(Array, fields) && !R.isEmpty(fields) ? fields.join(', ') : '*';

		const {
			limit,
			orderBy,
			where,
			distinct,
			fields = [],
			offset
		} = options;
		let str = `
			select ${empty(distinct, 'distinct')} ${getFieldStr(fields)}
			from ${tablename}
			${composeWhereSql(where)}
			${composeOrderSql(orderBy)}
			${empty(limit, ` limit ${limit} `)}
			${empty(offset, ` offset ${offset} `)}
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
		select : cond => queryWithOptions({where: cond}),
		selectOne: cond => queryWithOptions({where: cond, limit: 1}).then(items => items&&items[0]),
		count,
		exists,
		insert,
		insertIfNotExists,
		remove: async cond => cond == null ? Promise.reject('no con in delete') : (await queryPromise(connect))(`delete from ${tablename} ${composeWhereSql(cond)}`),
		update: async(cond, patch) => (await queryPromise(connect))(`update ${tablename} set ? where ?`, [patch, cond]),
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

tq.select().then(a => console.log(a.length));

tq.exists().then(console.log)