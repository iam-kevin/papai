import {
	addDoc,
	collection,
	doc,
	getDocs,
	getStore,
	setDoc,
	setDocs,
} from "../src/collection";
import ItemStorageStore from "../src/stores/collection/ItemStorage";

import {
	StateTrackingBox,
	onTrackStoreAddUpdateChanges,
	updateChangesToStore,
} from "../src/distributed/store";

import { nanoid } from "nanoid";
import { HybridLogicalClock } from "../src/distributed/clock";

const $ = {};

const FakeAsyncStorage = {
	async getItem(key: string): Promise<string | null> {
		return $[key] ?? null;
	},
	async setItem(key: string, value: string) {
		$[key] = value;
	},
	async multiGet(keys: string[]) {
		return keys.map((key) => [key, $[key] ?? null]) as [
			string,
			string | null
		][];
	},
	async multiSet(kvp: [string, string][]) {
		kvp.forEach(([key, value]) => {
			$[key] = value;
		});
	},
};

const nameReference = "THISNAME";
const store = getStore(
	ItemStorageStore(
		{
			nameReference,
			getCollRef: (d) => `${nameReference}/${d.collectionId}`,
			getDocRef: (d) =>
				`${nameReference}/${d.collectionId}/${d.documentId}`,
			store: FakeAsyncStorage,
		},
		nanoid
	)
);

const statebox = new StateTrackingBox(new HybridLogicalClock(nanoid(34)));

// Document
onTrackStoreAddUpdateChanges(
	store,
	statebox,
	(d) => `${d.collectionId}/${d.documentId}`,
	(ref, state) => {
		// ...
		console.log(state);
	}
);

const dummy = collection(store, "dummy$");

async function test() {
	// // pass
	const id_ = await addDoc(dummy, { d: "This is the data" });
	const id = await addDoc(dummy, { d: "another data here" });
	await addDoc(dummy, { d: "cheeese here" });

	// pass
	await setDoc(doc(dummy, id), { d: "not another one, but the only one" });

	// pass
	await setDocs(dummy, [
		[id_, { d: "yOLO asdasds" }],
		["qI_ratQzPCCq20kTHDW57", { d: "asdadasdsadas" }],
	]);

	try {
		const vx = await getDocs(dummy);
		console.log(vx);
	} catch (err) {
		console.log(err.message);
	}
}

test()
	.then(() => {
		console.log($);
	})
	.then(() => {
		console.log("StateBOX: ", Array.from(statebox.latest()));
	});
