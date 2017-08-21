const makePromise = (fn, context) => (...args) =>
	new Promise((resolve, reject) => {
		const r = fn.call(context, ...args, (err, result) => err ? reject(err) : resolve(result));
		if (r.then) resolve(r);
	});



module.exports = {
	makePromise
};



// var test = (d, cb) => {
// 	cb(null, 'resolved data');
// }

// makePromise(test)(4444).then(a => console.log(' cccc ', a)).catch(console.log)

// var test2 = d => Promise.resolve(d);

// test2(555433).then(console.log)

// makePromise(test2)(555433).then(console.log)