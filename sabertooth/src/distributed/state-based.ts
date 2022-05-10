/**
 * GCounter CRDT based implementation for
 * `collection` modelled data
 */

import { DistributedDataType } from "./";
import { HybridLogicalClock } from "./clock";

import _isEqual from "lodash.isequal";

type DV = DistributedDataType;

export class State<T extends DV> {
	private _object;
	constructor(object: T) {
		this._object = object;
	}

	isEqual(other: State<T>) {
		return _isEqual(this.object, other.object);
	}

	get object() {
		return this._object;
	}
}

export class ClockedState<T extends DV> {
	private _state;
	private _clock;

	constructor(state: T, clock: HybridLogicalClock) {
		this._state = new State<T>(state);
		this._clock = clock;
	}

	get state() {
		return this._state;
	}

	get object() {
		return this._state.object;
	}

	get clock() {
		return this._clock;
	}
}

/**
 * Regular implementation for
 */
export class SSet<T extends DV> extends Set<ClockedState<T>> {
	private _stateSet: Set<ClockedState<T>>;
	private _refClock: HybridLogicalClock;

	constructor(referenceClock: HybridLogicalClock) {
		super();
		this._refClock = referenceClock;
		this._stateSet = new Set();
	}

	multiAdd(val: IterableIterator<ClockedState<T>> | Array<ClockedState<T>>) {
		for (let s of val) {
			this.add(new ClockedState(s.object, this.incrementClock(s.clock)));
		}
	}

	referenceClock() {
		return this._refClock;
	}

	has(value: ClockedState<T>): boolean {
		for (let s of this._stateSet) {
			const x = s.state.isEqual(value.state);
			if (x) {
				return true;
			}
		}

		return false;
	}

	delete(value: ClockedState<T>): boolean {
		throw new Error("Not Implemntation");
	}

	states() {
		return {};
	}

	values(): IterableIterator<ClockedState<T>> {
		return this._stateSet.values();
	}

	clear(): void {
		this._stateSet.clear();
	}

	add(value: ClockedState<T>): this {
		if (!this.has(value)) {
			if (this.referenceClock().isGreaterThan(value.clock)) {
				return this._add(
					new ClockedState<T>(
						value.object,
						this.incrementClock(value.clock)
					)
				);
			} else {
				return this._add(
					new ClockedState<T>(value.object, this.incrementClock())
				);
			}
		}
		return this;
	}

	private _add(value: ClockedState<T>) {
		this._stateSet.add(value);
		return this;
	}

	forEach(
		callbackfn: (
			value: ClockedState<T>,
			value2: ClockedState<T>,
			set: Set<ClockedState<T>>
		) => void,
		thisArg?: any
	): void {
		this._stateSet.forEach(callbackfn, thisArg);
	}

	get size() {
		return this._stateSet.size;
	}

	// Get the next clock
	protected incrementClock(clock?: HybridLogicalClock) {
		const nxt =
			clock === undefined
				? this._refClock.next()
				: this._refClock.receive(clock);

		this._refClock = nxt;
		return nxt;
	}
}

/**
 * Obtain the latest state
 * @param sset
 */
export function latestState<T extends DV>(sset: SSet<T>): ClockedState<T> {
	let latest: ClockedState<T> | null = null;
	sset.forEach((value) => {
		// ...
		if (latest === null) {
			latest = value;
			return;
		}

		// check if tatest
		if (value.clock.isGreaterThan(latest.clock)) {
			latest = value;
		}
	});

	return latest as unknown as ClockedState<T>;
}
