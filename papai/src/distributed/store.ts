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
	append(
		key: string,
		ref: Document.Ref,
		_state: DistributedDataType
	): HybridLogicalClock {
		throw new Error("Not Implemented");
	}

	latest(): IterableIterator<
		[Document.Ref, DistributedDataType, HybridLogicalClock]
	> {
		throw new Error("Not Implemented");
	}
}

export class DeltaTrackingBox extends TrackingBox {}

export class StateTrackingBox extends TrackingBox {
	private _sset = new Map<string, SSet<DistributedDataType>>();
	private _hlc: HybridLogicalClock;
	private _mapKey = new Map<string, Document.Ref>();

	constructor(initialClock: HybridLogicalClock) {
		super();
		this._hlc = initialClock;
	}

	mapSet() {
		return this._sset;
	}

	/**
	 * Add state changes to document box
	 * @param docRefKey
	 * @param state
	 */
	append(
		docRefKey: string,
		docRef: Document.Ref,
		state: DistributedDataType
	) {
		if (!this._sset.has(docRefKey)) {
			this._sset.set(docRefKey, new SSet(this.nextClock()));
			this._mapKey.set(docRefKey, docRef);
		}

		const set = this._sset.get(docRefKey) as SSet<DistributedDataType>;

		const clock = this.nextClock();

		// add new state
		set.add(new ClockedState(state, clock));

		// pass clock associated
		return clock;
	}

	nextClock() {
		const x = this._hlc.next();
		this._hlc = x;
		return x;
	}

	mapKey() {
		return this._mapKey;
	}

	latest() {
		const n = new Set<
			[Document.Ref, DistributedDataType, HybridLogicalClock]
		>();
		for (let [id, set] of this.mapSet()) {
			let out = latestState(set);
			const idRef = this._mapKey.get(id);

			if (idRef !== undefined) {
				n.add([idRef, out.object, out.clock]);
			}
		}

		return n.values();
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
		state: DistributedDataType,
		clock: HybridLogicalClock
	) => void
) {
	const subscription = store.documentObservable.subscribe((s) => {
		const documentRef = documentRefToKeyStr(s.ref);
		if (s.action === "updated") {
			// state box
			const clock = trackingBox.append(documentRef, s.ref, s.state);

			// fires callback after action
			callback(s.ref, s.state, clock);
		}
	});

	return subscription;
}

export async function updateChangesToStore(
	store: Store,
	updateStateTrackingBox: TrackingBox
) {
	for (let [
		{ collectionId, documentId },
		data,
		_,
	] of updateStateTrackingBox.latest()) {
		// THINK: Maybe it's time for a multi-set (or `setDocs`)
		await setDoc(doc(collection(store, collectionId), documentId), data);
	}
}
