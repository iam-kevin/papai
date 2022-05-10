type UnitValueDataType =
	| string
	| number
	| null
	| boolean
	| { [key: string]: UnitValueDataType };
export type DistributedDataType = {
	[field: string]: UnitValueDataType;
};
