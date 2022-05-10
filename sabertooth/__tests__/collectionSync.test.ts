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

import { ClockedState, latestState, SSet } from "../distributed/state-based";
import { HybridLogicalClock } from "../distributed/clock";

import { DistributedDataType } from "../distributed/types";
import { Store } from "../collection/core";

type DummyDataType = {
	name: string;
	age: number;
};

const store = getStore(KeyValueMapStore(() => nanoid(20)));
const dummy = collection<DummyDataType>(store, "dummyData");

function state<T extends DistributedDataType>(
	object: T,
	clock: HybridLogicalClock
) {
	return new ClockedState(object, clock);
}

async function main() {
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

	console.log(await getDocs(dummy));
}

class SSBox {
	private _sset = new Map<string, SSet<DistributedDataType>>();
	private _hlc: HybridLogicalClock;

	constructor(hlc: HybridLogicalClock) {
		this._hlc = hlc;
	}

	mapSet() {
		return this._sset;
	}

	/**
	 * Add state changes to document box
	 * @param docRef
	 * @param state
	 */
	append(docRef: string, state: DistributedDataType) {
		if (!this._sset.has(docRef)) {
			this._sset.set(docRef, new SSet(this.nextClock()));
		}

		const sx = this._sset.get(docRef);

		// something
		sx.add(new ClockedState(state, this.nextClock()));
	}

	nextClock() {
		const x = this._hlc.next();
		this._hlc = x;
		return x;
	}

	latest() {
		const n = new Map<string, DistributedDataType>();
		for (let [id, set] of this.mapSet()) {
			let out = latestState(set);
			n.set(id, out.object);
		}

		return n.entries();
	}
}

/**
 * Reflect changes in the database
 */
function onReflectChanges(
	sbox: SSBox,
	store: Store,
	docRefToStr: (d: Document.Ref) => string
) {
	return store.documentObservable.subscribe((s) => {
		const documentRef = docRefToStr(s.ref);
		if (s.action === "added" || s.action === "changed") {
			// state box
			sbox.append(documentRef, s.state);
		}
	});
}

async function updateStore(
	store: Store,
	sbox: SSBox,
	strToDocRef: (str: string) => Document.Ref,
	cb?: () => void
) {
	for (let [id, data] of sbox.latest()) {
		const { collectionId, documentId } = strToDocRef(id);

		console.log(id);

		// THINK: Maybe it's time for a multi-set (or `setDocs`)
		await setDoc(doc(collection(store, collectionId), documentId), data);
	}
}

const initClock = new HybridLogicalClock(nanoid(8));
const sbox = new SSBox(initClock);

// reflect changes
onReflectChanges(sbox, store, (d) => `${d.collectionId}#${d.documentId}`);

const storeDump = getStore(KeyValueMapStore(() => nanoid(20)));

// run app
main().then(async () => {
	const ls = Array.from(sbox.mapSet().entries());

	console.log(ls);
	// console.log(Array.from(sbox.latest()));

	await updateStore(storeDump, sbox, (id) => {
		const [collectionId, documentId] = id.split("#");

		return {
			collectionId,
			documentId,
		};
	});

	const s = await getDocs(collection(storeDump, "dummyData"));
	console.log(s);
});
