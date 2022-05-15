/**
 * Logic for distributed stores
 */

import { collection, doc, Document, setDoc } from "../collection";
import { Store } from "../collection/core";
import { HybridLogicalClock } from "./clock";
import { ClockedState, latestState, SSet } from "./state-based";
import { DistributedDataType } from "./types";

/**
 * Consolidation done by using `distributed/delta-based` logic
 * @param store
 */
export function getDeltaCollection(store: Store) {}

class TrackingBox {
	append(_docRef: string, _state: DistributedDataType) {
		throw new Error("Not Implemented");
	}

	latest(): IterableIterator<[string, DistributedDataType]> {
		throw new Error("Not Implemented");
	}
}

export class DeltaTrackingBox extends TrackingBox {}

export class StateTrackingBox extends TrackingBox {
	private _sset = new Map<string, SSet<DistributedDataType>>();
	private _hlc: HybridLogicalClock;

	constructor(initialClock: HybridLogicalClock) {
		super();
		this._hlc = initialClock;
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

		const set = this._sset.get(docRef) as SSet<DistributedDataType>;

		// add new state
		set.add(new ClockedState(state, this.nextClock()));
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
 * Consolidation done by using `distributed/state-based` logic
 * @param store
 */
export function onTrackStoreAddUpdateChanges(
	store: Store,
	trackingBox: TrackingBox,
	// hash key to identify associated state
	documentRefToKeyStr: (dr: Document.Ref) => string,
	callback: (
		doc: Document.Ref,
		documentRef: string,
		state: DistributedDataType
	) => void
) {
	const subscription = store.documentObservable.subscribe((s) => {
		const documentRef = documentRefToKeyStr(s.ref);
		if (s.action === "added" || s.action === "changed") {
			// state box
			trackingBox.append(documentRef, s.state);

			// fires callback after action
			callback(s.ref, documentRef, s.state);
		}
	});

	return subscription;
}

export async function updateChangesToStore(
	store: Store,
	updateStateTrackingBox: TrackingBox,
	keyStrToDocumentRef: (str: string) => Document.Ref
) {
	for (let [id, data] of updateStateTrackingBox.latest()) {
		const { collectionId, documentId } = keyStrToDocumentRef(id);

		// THINK: Maybe it's time for a multi-set (or `setDocs`)
		await setDoc(doc(collection(store, collectionId), documentId), data);
	}
}
