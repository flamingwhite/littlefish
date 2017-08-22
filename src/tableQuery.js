const R = require('ramda');
const {
	makePromise,
	log
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

		log('str', str);
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
