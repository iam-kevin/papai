/**
 * Logic for distributed stores
 */

import { Document } from "../collection";
import { Store } from "../collection/core";
import { HybridLogicalClock } from "./clock";
import { ClockedState, SSet } from "./state-based";
import { DistributedDataType } from "./types";

/**
 * Consolidation done by using `distributed/delta-based` logic
 * @param store
 */
export function getDeltaCollection(store: Store) {}

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

		const set = this._sset.get(docRef) as SSet<DistributedDataType>;

		// add new state
		set.add(new ClockedState(state, this.nextClock()));
	}

	nextClock() {
		const x = this._hlc.next();
		this._hlc = x;
		return x;
	}
}

/**
 * Consolidation done by using `distributed/state-based` logic
 * @param store
 */
export function configureForChangesCollectionStore(
	store: Store,
	initialClock: HybridLogicalClock,
	documentRefToStr: (dr: Document.Ref) => string
) {
	// Initialize the state box
	const sbox = new SSBox(initialClock);

	return store.documentObservable.subscribe((s) => {
		const documentRef = documentRefToStr(s.ref);
		if (s.action === "added" || s.action === "changed") {
			// state box
			sbox.append(documentRef, s.state);
		}
	});
}
