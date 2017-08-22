const makePromise = (fn, context) => (...args) =>
	new Promise((resolve, reject) => {
		const r = fn.call(context, ...args, (err, result) => err ? reject(err) : resolve(result));
		if (r.then) resolve(r);
	});



module.exports = {
	makePromise
};

