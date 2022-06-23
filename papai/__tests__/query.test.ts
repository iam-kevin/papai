import { nanoid } from "nanoid";
import { addDoc, collection, getStore, query } from "../src/collection";
import { HybridLogicalClock } from "../src/distributed/clock";

import KeyValueMapCollection from "../src/stores/collection/KeyValueMap";

const storage = getStore(KeyValueMapCollection(() => nanoid()));

async function run() {
	const somethingCollection = collection(storage, "something");
	await addDoc(somethingCollection, { name: "Kevin", age: "3" });
	const d = await query(somethingCollection);

	console.log(d.toArray());
}

run();
