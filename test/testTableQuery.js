const mysql = require('mysql');
const queryCreator = require('../dist/tableQuery');

const connection = mysql.createConnection({
	connectionLimit: 10,
	host: 'localhost',
	user: 'root',
	password: '1234',
	database: 'wind'
});

const tq = queryCreator(connection, 'books');

tq.selectOne({id: 101}).then(console.log)


