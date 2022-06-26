/**
 * Logic for distributed stores
 */

import { collection, doc, setDoc } from "../collection";
import type { Document } from "../collection/types";
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
		docRef: Document.Ref,
		state: DistributedDataType,
		clock?: HybridLogicalClock
	): HybridLogicalClock | null {
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

	private _dr2str;
	constructor(
		initialClock: HybridLogicalClock,
		docRefToKey: (dr: Document.Ref) => string = (d) =>
			`${d.collectionId}/${d.documentId}`
	) {
		super();
		this._hlc = initialClock;
		this._dr2str = docRefToKey;
	}

	getKey(d: Document.Ref) {
		return this._dr2str(d);
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
		docRef: Document.Ref,
		state: DistributedDataType,
		clock?: HybridLogicalClock
	) {
		const docRefKey = this.getKey(docRef);
		if (!this._sset.has(docRefKey)) {
			this._sset.set(docRefKey, new SSet(this.nextClock()));
			this._mapKey.set(docRefKey, docRef);
		}

		const set = this._sset.get(docRefKey) as SSet<DistributedDataType>;

		const c_ = clock ?? this.nextClock();

		// add new state
		const val = new ClockedState(state, c_);
		if (set.has(val)) {
			return null;
		}

		// update
		set.add(val);
		this._sset.set(docRefKey, set);

		// pass clock associated
		return c_;
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
 * Subscription for new store changes
 * @param store
 */
export function onTrackNewStoreChanges(
	store: Store,
	trackingBox: TrackingBox,
	callback?: (
		doc: Document.Ref,
		state: DistributedDataType,
		clock: HybridLogicalClock
	) => void
) {
	const subscription = store.documentObservable.subscribe((s) => {
		if (s.action === "updated") {
			// state box
			const clock = trackingBox.append(s.ref, s.state);

			if (clock !== null && callback !== undefined) {
				// fires call back when received something new
				callback(s.ref, s.state, clock);
			}
		}
	});

	return subscription;
}

/**
 * @deprecated use `onTrackNewStoreChanges`
 * Subscription for new store changes
 */
export const onTrackStoreAddUpdateChanges = onTrackNewStoreChanges;

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
