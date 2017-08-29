const makePromise = (fn, context) => (...args) =>
	new Promise((resolve, reject) => {
		const r = fn.call(context, ...args, (err, result) => err ? reject(err) : resolve(result));
		if (r.then) resolve(r);
	});

const dev = ['dev', 'development'].includes(process.env.NODE_ENV);
const log = (...msg) => dev && console.log(...msg);

module.exports = {
	makePromise,
	log, 
	dev
};