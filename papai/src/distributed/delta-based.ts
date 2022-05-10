/**
 * Implementatation for delta-based crdts for
 * `collection` based stores
 */

import { HybridLogicalClock } from "./clock";
import { DistributedDataType } from "./types";
import _isEqual from "lodash.isequal";

type DV = DistributedDataType;
export class Delta<T extends DV> {
	private _units;
	private _object;

	constructor(state: Partial<T>) {
		this._object = state;
		this._units = new Set(
			Object.entries(state).map((value) => {
				return new Unit(value);
			})
		);
	}

	isEqual(other: Delta<T>) {
		return _isEqual(this.object, other.object);
	}

	get object() {
		return this._object;
	}

	get units() {
		return this._units.values();
	}
}

/**
 * Smallest unit of data
 */
export class Unit<K, V> {
	private _key;
	private _value;

	constructor([key, value]: [K, V]) {
		this._key = key;
		this._value = value;
	}

	isEqual(other: Unit<any, any>) {
		return this.key === other.key && _isEqual(this.value, other.value);
	}

	get key() {
		return this._key;
	}
	get value() {
		return this._value;
	}
}

/**
 * Versioned / Clocked
 * data unit
 */
export class ClockedUnit<K, V> {
	private _pair;
	private _clock;

	constructor(pair: Unit<K, V>, hlc: HybridLogicalClock) {
		this._clock = hlc;
		this._pair = pair;
	}

	hash() {
		return JSON.stringify([
			this.pair.key,
			this.pair.key,
			this.clock.toString(),
		]);
	}

	valueOf() {
		return this.hash();
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
 * Set with delta mutations
 *
 * Close to this: https://core.ac.uk/download/pdf/154274608.pdf
 * and https://arxiv.org/abs/1803.02750
 *
 */
export class BSet<
	T extends DV,
	K extends keyof T = keyof T,
	V extends T[K] = T[K]
> {
	private _deltaSet: Set<ClockedUnit<K, V>>;
	private _refClock;

	constructor(referenceClock: HybridLogicalClock) {
		this._deltaSet = new Set();
		this._refClock = referenceClock;
	}

	multiAdd(
		val: IterableIterator<ClockedUnit<K, V>> | Array<ClockedUnit<K, V>>
	) {
		for (let s of val) {
			this.add(new ClockedUnit(s.pair, this.incrementClock(s.clock)));
		}
	}

	referenceClock() {
		return this._refClock;
	}

	values() {
		return this._deltaSet.values();
	}

	has(value: ClockedUnit<K, V>): boolean {
		const s = new Set(Array.from(this._deltaSet).map((d) => d.pair));
		return s.has(value.pair);
	}

	add(value: ClockedUnit<K, V>): this {
		if (!this.has(value)) {
			// check if has key
			// update here
			if (this.referenceClock().isGreaterThan(value.clock)) {
				return this._add(
					new ClockedUnit(
						value.pair,
						this.incrementClock(value.clock)
					)
				);
			} else {
				return this._add(
					new ClockedUnit(value.pair, this.incrementClock())
				);
			}
		}

		return this;
	}

	private _add(value: ClockedUnit<K, V>) {
		this._deltaSet.add(value);
		return this;
	}

	clear(): void {
		this._deltaSet.clear();
	}

	delete(value: ClockedUnit<K, V>): boolean {
		throw new Error("Not Implemented");
	}

	keys(): IterableIterator<ClockedUnit<K, V>> {
		throw new Error("Not Implemented");
	}

	get size() {
		return this._deltaSet.size;
	}

	// implementing needed methods
	forEach(
		callbackfn: (
			value: ClockedUnit<K, V>,
			value2: ClockedUnit<K, V>,
			set: Set<ClockedUnit<K, V>>
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

// console.log(Array.from(dset.values()).map((d) => d.pair.hash()));

/**
 * Converges the states to a final value
 * @param bset
 * @returns
 */
export function synchronize<T extends DV>(bset: BSet<T>) {
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
