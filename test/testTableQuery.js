const mysql = require('mysql');
const queryCreator = require('../dist/tableQuery');

const connection = mysql.createConnection({
	connectionLimit: 10,
	host: 'localhost',
	user: 'root',
	password: '1234',
	database: 'wind'
});

const tq = queryCreator(connection, 'flaming_table');

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

tq.selectOne().then(console.log)

tq.select({
	year: y => y + ' > 200',
	id: [193, 300, 194, '344']
}).then(console.log)

tq.exists({
	title: '雨人'
}).then(console.log);

tq.exists({
	title: 'aaaa雨人'
}).then(console.log);

tq.select({
	title: '雨人'
}).then(item => console.log(item.length));

tq.selectOne({
	title: '雨人'
}).then(console.log);

tq.count({year: _ => _ +' > 200'}).then(console.log)



tq.transaction(
	() => tq.select({id: 200}),
	// () => tq.insert({id: 770, title: 'what is that'}),
	() => tq.count(),
	r => {
		console.log('from last', r);
		tq.select({ id: 100, title: 'what is that' })
	},
	() => tq.select({id: 100, title: 'what is that'}),
	// () => tq.insert({id: 200, title: 'what is that'})
).then(console.log).catch(e => console.log('errrrrrr,', e))