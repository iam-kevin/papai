/**
 * JSON of serializable HLC
 */
type SerializedHybridLogicalClock = {
	ts: number;
	id: string;
	inc: number;
};

/**
 * Hybrid Logical Clock
 */
export class HybridLogicalClock {
	/**
	 * Timestamp
	 */
	private _ts: number;

	/**
	 * IDing factor
	 */
	private _id: string;

	/**
	 * Incrementing number
	 */
	private _inc: number;

	constructor(id: string, ts?: number, inc?: number) {
		this._ts = ts ?? Date.now();
		this._id = id;
		this._inc = inc ?? 0;
	}

	/**
	 * Get the next clock value
	 */
	next() {
		const now = Date.now();
		if (this.ts > now) {
			// // set 'now' as new clock time
			// this._ts = now;

			// // reset increment counter
			// this._inc = 0;
			return new HybridLogicalClock(this.id, now, 0);
		}
		// this._inc += 1;
		return new HybridLogicalClock(this.id, this.ts, this.inc + 1);
	}

	/**
	 * Convert remote clock
	 * @param remote
	 */
	receive(remote: HybridLogicalClock) {
		const now = Date.now();

		if (now > Math.max(this.ts, remote.ts)) {
			return new HybridLogicalClock(this.id, now, 0);
		}

		if (this.ts === remote.ts) {
			return new HybridLogicalClock(
				this.id,
				this.ts,
				Math.max(this.inc, remote.inc) + 1
			);
		}

		if (remote.ts > this.ts) {
			return new HybridLogicalClock(this.id, remote.ts, 0);
		}

		return this.next();
	}

	get id() {
		return this._id;
	}

	get ts() {
		return this._ts;
	}

	get inc() {
		return this._inc;
	}

	__ge__(other: HybridLogicalClock) {
		if (this.ts >= other.ts) {
			if (this.ts === other.ts) {
				return this.inc > other.inc;
			} else {
				return true;
			}
		}

		return false;
	}

	/**
	 * Serialize clock
	 * @returns
	 */
	toJSON(): SerializedHybridLogicalClock {
		return {
			ts: this._ts,
			id: this._id,
			inc: this._inc,
		};
	}

	valueOf() {
		return this.toJSON();
	}

	toString() {
		return HybridLogicalClock.stringify(this);
	}

	static stringify(o: HybridLogicalClock) {
		return `${o.id}:${o.ts}:${o.inc}`;
	}
	static parse(o: string) {
		const out = o.split(":");

		if (out.length !== 3) {
			throw new Error("Unable to parse this");
		}

		const [id, ts, inc] = out;
		return new HybridLogicalClock(id, parseInt(ts), parseInt(inc));
	}

	/**
	 * Deserialize clock
	 * @param o
	 * @returns
	 */
	static fromJSON(o: SerializedHybridLogicalClock): HybridLogicalClock {
		return new HybridLogicalClock(o.id, o.ts, o.inc);
	}
}
