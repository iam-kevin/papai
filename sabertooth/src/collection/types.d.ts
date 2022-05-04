type ActionConfig<T extends string, Ref, Arg> = {
	type: T;
	ref: Ref;
	arguments: Arg;
};

type UnitQuery = {
	[field: string]: UnitData | { $text?: string; $eq?: UnitData };
};

export declare namespace Collection {
	type Ref = { collectionId: string };
	type DocumentQuery = UnitQuery & { $or: UnitQuery[] };

	type Action<D extends Document.Data> =
		| ActionConfig<"add", Ref, D>
		| ActionConfig<"add-docs", Ref, D[]>
		| ActionConfig<"get-docs", Ref, { query: DocumentQuery }>;

	type ActionHandler = <A extends Document.Data>(
		action: Collection.Action<A>
	) => Promise<string | A[] | string[]>;

	type FnPair = {
		add: <D extends Document.Data>(ref: Ref, data: D) => Promise<string>;
		addMultiple: <D extends Document.Data>(
			ref: Ref,
			data: D[]
		) => Promise<string[]>;
		getDocs: <D extends Document.Data>(
			ref: Ref,
			query: DocumentQuery
		) => Promise<D[]>;
	};
}

type UnitData =
	| string
	| number
	| boolean
	| null
	| { [x: string]: UnitData }
	| UnitData[];

export declare namespace Document {
	type Ref = { collectionId: string; documentId: string };

	/**
	 * Data that's typically stored in the
	 * in a document
	 */
	type Data = { [x: string]: UnitData };

	type Action<D extends Document.Data> =
		| ActionConfig<"get", Ref, null>
		| ActionConfig<"set", Ref, D>
		| ActionConfig<"update", Ref, Partial<D>>
		| ActionConfig<"delete", Ref, null>;

	type ActionHandler = <A extends Document.Data>(
		action: Document.Action<A>
	) => Promise<A | void>;

	type FnPair = {
		set: <D extends Document.Data>(ref: Ref, data: D) => Promise<D>;
		update: <D extends Document.Data>(
			ref: Ref,
			data: Partial<D>
		) => Promise<D>;
		get: <D extends Document.Data>(ref: Ref) => Promise<D | null>;
		delete: (ref: Ref) => Promise<void>;
	};
}
