import { nanoid } from "nanoid";

import {
	getStore,
	collection,
	addDoc,
	getDocs,
	doc,
	Document,
	updateDoc,
	setDoc,
} from "../collection";
import KeyValueMapStore from "../stores/collection/KeyValueMap";

import {
	onTrackStoreChanges,
	StateTrackingBox,
	updateChangesToStore,
} from "../distributed/store";
import { HybridLogicalClock } from "../distributed/clock";
type DummyDataType = {
	name: string;
	age: number;
};

const store = getStore(KeyValueMapStore(() => nanoid(20)));
const dummy = collection<DummyDataType>(store, "dummyData");

async function activity() {
	await addDoc(dummy, {
		name: "Kevin",
		age: 23,
	});

	const id = await addDoc(dummy, {
		name: "Brian",
		age: 21,
	});

	const idb = await addDoc(dummy, {
		name: "Jack",
		age: 23,
	});

	await Promise.all([
		updateDoc(doc(dummy, id), {
			age: 94,
		}),

		updateDoc(doc(dummy, idb), {
			age: 104,
		}),

		updateDoc(doc(dummy, id), {
			name: "Micheal",
		}),
	]);
}

const newStore = getStore(KeyValueMapStore(() => nanoid(14)));

const initClock = new HybridLogicalClock(nanoid(13));
async function run() {
	// place where the changes are stored
	const tbox = new StateTrackingBox(initClock.next());

	// set listener to observe changes
	// happening in store
	const sub = onTrackStoreChanges(
		store,
		tbox,
		(dr) => `${dr.collectionId}/${dr.documentId}`
	);

	// run app
	await activity();

	// load contents
	// console.log(await getDocs(dummy));

	// update store changes
	await updateChangesToStore(newStore, tbox, (str) => {
		const [collectionId, documentId] = str.split("/");
		return { collectionId, documentId };
	});

	console.log(await getDocs(collection(newStore, "dummyData")));
}

// run
run();
