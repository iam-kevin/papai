/**
 * Implementatation for delta-based crdts for
 * `collection` based stores
 */

import { nanoid } from "nanoid";
import { HybridLogicalClock } from "./clock";

type DV = { [x: string]: any };
class Delta<T extends DV> {
	private _unit;

	constructor(state: Partial<T>) {
		this._unit = new Set(
			Object.entries(state).map((value) => {
				return new Pair(value);
			})
		);
	}

	get state() {
		return this._unit.values();
	}
}

/**
 * delta state to merge data with
 */
class DeltaState<T> {
	private _state: Partial<T>;
	constructor(state: Partial<T>) {
		this._state = state;
	}

	get state() {
		return this._state;
	}
}

/**
 * State that's sent across the network
 * @param action
 * @param state
 */
function delta<T>(
	state: Partial<T>,
	hlc: HybridLogicalClock
): ClockedDeltaState<T> {
	return new ClockedDeltaState<T>(raw_delta(state), hlc);
}

function raw_delta<T extends DV>(state: Partial<T>): Delta<T> {
	return new Delta(state);
}

class Pair<K, V> {
	private _key;
	private _value;

	constructor([key, value]: [K, V]) {
		this._key = key;
		this._value = value;
	}

	equals(other: Pair<any, any>) {
		return this.key === other.key && this.value === other.value;
	}

	hash() {
		return [this.key, this.value];
	}

	get key() {
		return this._key;
	}
	get value() {
		return this._value;
	}
}

class ClockedPair<K, V> {
	private _pair;
	private _clock;

	constructor(pair: Pair<K, V>, hlc: HybridLogicalClock) {
		this._clock = hlc;
		this._pair = pair;
	}

	hash() {
		return [...this.pair.hash(), this.clock.toString()];
	}

	get pair() {
		return this._pair;
	}

	get clock() {
		return this._clock;
	}

	get key() {
		return this.pair.key;
	}
	get value() {
		return this.pair.value;
	}
}

/**
 * with clock
 */
class ClockedDeltaState<T extends DV> {
	private _delta;
	private _clock;

	constructor(delta: Delta<T>, hlc: HybridLogicalClock) {
		this._delta = new Set(
			Array.from(delta.state).map((s) => new ClockedPair(s, hlc.next()))
		);
		this._clock = hlc;
	}

	/**
	 * Get the state
	 */
	get states() {
		return this.delta.values();
	}

	/**
	 * Get `DeltaState` object
	 */
	get delta() {
		return this._delta;
	}

	/**
	 * Clock that versions the state
	 */
	get clock() {
		return this._clock;
	}
}

/**
 * Set with delta mutations
 *
 * Close to this: https://core.ac.uk/download/pdf/154274608.pdf
 * and https://arxiv.org/abs/1803.02750
 *
 */
class BSet<T extends DV, K extends keyof T = keyof T, V extends T[K] = T[K]> {
	private _deltaSet: Set<ClockedPair<K, V>>;
	private _refClock;

	constructor(referenceClock: HybridLogicalClock) {
		this._deltaSet = new Set();
		this._refClock = referenceClock;
	}

	referenceClock() {
		return this._refClock;
	}

	values() {
		return this._deltaSet.values();
	}

	/**
	 * Check if the Set has the delta state
	 */
	// has(value: ClockedDeltaState<T>): boolean {
	// 	const s = new Set(Array.from(this._deltaSet).map((d) => d.state));
	// 	return s.has(value.state);
	// }

	has(value: ClockedPair<K, V>): boolean {
		const s = new Set(Array.from(this._deltaSet).map((d) => d.pair));
		return s.has(value.pair);
	}

	add(value: ClockedPair<K, V>): this {
		if (!this.has(value)) {
			// check if has key
			// update here
			if (this.referenceClock() > value.clock) {
				this._add(
					new ClockedPair(
						value.pair,
						this.incrementClock(value.clock)
					)
				);
			} else {
				this._add(new ClockedPair(value.pair, this.incrementClock()));
			}
		}

		return this;
	}

	private _add(value: ClockedPair<K, V>) {
		this._deltaSet.add(value);
	}
	// add(value: ClockedDeltaState<T>): this {
	// 	// if state isn't contained in the set,
	// 	if (!this.has(value)) {
	// 		this.add(
	// 			new ClockedDeltaState<T>(value.delta, this.incrementClock())
	// 		);
	// 	}

	// 	return this;
	// }

	clear(): void {
		this._deltaSet.clear();
	}

	delete(value: ClockedPair<K, V>): boolean {
		throw new Error("Not Implemented");
	}

	keys(): IterableIterator<ClockedPair<K, V>> {
		throw new Error("Not Implemented");
	}
	// implementing needed methods
	forEach(
		callbackfn: (
			value: ClockedPair<K, V>,
			value2: ClockedPair<K, V>,
			set: Set<ClockedPair<K, V>>
		) => void,
		thisArg?: any
	): void {
		this._deltaSet.forEach(callbackfn, thisArg);
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

const initClock = new HybridLogicalClock(nanoid(10));

type Value = {
	name: string;
	age: number;
};
const dset = new BSet(initClock);

function adelta<T>(state: Partial<T>) {
	return delta<T>(state, initClock.next());
}

function appendToSet<V>(data: V) {
	const cp = adelta(data);
	for (let c of cp.states) {
		dset.add(c);
	}
}

// add the values to the set
appendToSet({ age: 98 });
appendToSet({ name: "Kevin" });
appendToSet({ age: 101 });
appendToSet({ name: "James" });

// console.log(Array.from(dset.values()).map((d) => d.pair.hash()));

/**
 * Converges the states to a final value
 * @param bset
 * @returns
 */
function syncronize<T extends DV>(bset: BSet<T>) {
	type K = keyof T;
	type V = T[K];

	// dont use this.
	const bs = new Map<K, V>();
	// To cache timer
	const _map = new Map<K, HybridLogicalClock>();
	bset.forEach((value) => {
		const x = _map.get(value.key);
		if (x !== undefined) {
			if (x > value.clock) {
				// ...
				return;
			}
		}
		// set clock
		bs.set(value.key, value.value);
		_map.set(value.key, value.clock);
		// ...
	});

	return bs;
	// ...
}

const x = syncronize(dset);
console.log(x);
