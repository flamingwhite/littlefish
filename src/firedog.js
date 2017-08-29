let firebase = require('firebase');
let Rx = require('rxjs/Rx');
let {
	curry
} = require('ramda');

let connect = config => app = firebase.initializeApp(config);

var config = {
	apiKey: "AIzaSyDhghirxL19-LekWjgvfq4uLGXOO_zDeRo",
	authDomain: "justdemo-ac305.firebaseapp.com",
	databaseURL: "https://justdemo-ac305.firebaseio.com",
	projectId: "justdemo-ac305",
	storageBucket: "justdemo-ac305.appspot.com",
	messagingSenderId: "338492799528"
};
firebase.initializeApp(config);


let rxOn = (target, event) => Rx.Observable.create(obs => {
	target.on(event, evt => {
		obs.next(evt);
	});
});

// let getRef = refOrPath => typeof refOrPath == 'string' ? firebase.database().ref(refOrPath) : refOrPath;

let fireStream = ref => rxOn(ref, 'value').map(value => value.val() || {});

let fireArrayStream = ref => fireStream(ref).map(data => Object.entries(data || {}).map(([_id, value]) => ({
	_id,
	...value
})));

fireArrayStream('users/').subscribe(v => console.log(v));

let firePush = curry((ref, data) => {
	let newRecord = ref.push();
	newRecord.set({ ...data
	});
});

let fireUpdate = curry((ref, data) => ref.set(data));

let fireRemoveById = curry((ref, _id) => ref.child(_id).remove());


let fireOnce = ref => {
	return Rx.Observable.create(obs => {
		ref.once('value').then(data => {
			obs.next(data.val());
			obs.complete();
		});
	});
}

let fireArrayOnce = ref => fireOnce(ref).map(data => Object.entries(data).map(([_id, value]) => ({
	_id,
	...value
})));

// let fireUpdateById = curry((refOrPath, _id, patch) => {
// 	let ref = getRef(refOrPath);
// 	return ref.child(_id).update(patch);
// })

let fireUpdateById = curry((ref, _id, patch) => ref.child(_id).update(patch));

let fireRef = ref => {
	return {
		stream: () => fireStream(ref),
		arrayStream: () => fireArrayStream(ref),
		once: () => fireOnce(ref),
		arrayOnce: () => fireArrayOnce(ref),
		push: firePush(ref),
		removeById: fireRemoveById(ref),
		updateById: fireUpdateById(ref)
	};
}


module.exports = {
	connect,
	firebase,
	fireRef,
	fireStream,
	fireArrayStream,
	fireUpdate,
	fireRemoveById
};