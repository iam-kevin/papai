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

import { nanoid } from "nanoid";

const $ = {};

const FakeAsyncStorage = {
	async getItem(key: string): Promise<string | null> {
		console.log("getItem fired!");
		return $[key] ?? null;
	},
	async setItem(key: string, value: string) {
		console.log("setItem fired!");
		$[key] = value;
	},
	async multiGet(keys: string[]) {
		console.log("multiGet fired!");
		return keys.map((key) => [key, $[key] ?? null]) as [
			string,
			string | null
		][];
	},
	async multiSet(kvp: [string, string][]) {
		console.log("multiSet fired!");
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
		["wWau0KUBpum1Y3u7Vjftm", { d: "yOLO asdasds" }],
		["qI_ratQzPCCq20kTHDW57", { d: "asdadasdsadas" }],
	]);

	try {
		const vx = await getDocs(dummy);
		console.log(vx);
	} catch (err) {
		console.log(err.message);
	}
}

test().then(() => {
	console.log($);
});
