import { HybridLogicalClock } from "./clock";
import { Delta, ClockedUnit } from "./delta-based";
import { ClockedState } from "./state-based";
import { DistributedDataType } from "./types";

export * from "./types";

function delta<T extends DistributedDataType>(
	object: T,
	clock: HybridLogicalClock
) {
	const deltas = new Delta<T>(object);
	return Array.from(deltas.units).map(
		(d) => new ClockedUnit(d, clock.next())
	);
}

function state<T extends DistributedDataType>(
	object: T,
	clock: HybridLogicalClock
) {
	return new ClockedState(object, clock);
}
