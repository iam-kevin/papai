type ActionConfig<T extends string, Ref, Arg> = {
	type: T;
	ref: Ref;
	arguments: Arg;
};

type UnitQuery = {
	[field: string]: UnitData | { $text: string } | { $eq: UnitData };
};

export declare namespace Collection {
	type Ref = { collectionId: string };

	// update query logic
	type DocumentQuery = {
		$where?: Partial<UnitQuery & { $or: UnitQuery[]; $and: UnitQuery[] }>;
		$order?: {
			order?: "asc" | "desc";
			key: string;
		};
	};

	type Action<D extends Document.Data> =
		| ActionConfig<"add", Ref, D>
		| ActionConfig<"add-docs", Ref, D[]>
		| ActionConfig<"set-docs", Ref, [string, D][]>
		| ActionConfig<"get-docs", Ref, { query: DocumentQuery }>
		| ActionConfig<"docs", Ref, null>
		| ActionConfig<"clear", Ref, null>;

	type ActionHandler = <A extends Document.Data>(
		action: Collection.Action<A>,
		collectionOptions: Options
	) => Promise<string | void | [string, A][] | string[] | Set<string>>;

	type Options = {
		createIfMissing: boolean;
	};

	/**
	 * Output's for this must be serializable
	 * ------------
	 * - For compatibility with
	 */
	type FnPair = {
		add: <D extends Document.Data>(
			ref: Ref,
			data: D,
			options: Options
		) => Promise<string>;
		addMultiple: <D extends Document.Data>(
			ref: Ref,
			data: D[],
			options: Options
		) => Promise<string[]>;
		getDocs: <D extends Document.Data>(
			ref: Ref,
			query: DocumentQuery,
			options: Options
		) => Promise<Array<[string, D]>>;
		setDocs: <D extends Document.Data>(
			ref: Ref,
			data: [string, D][],
			options: Options
		) => Promise<void>;
		docs: (ref: Ref, options: Options) => Promise<Set<string>>;

		/**
		 *
		 */
		clear: (ref: Ref, options: Options) => Promise<void>;
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
		action: Document.Action<A>,
		documentOptions: Options
	) => Promise<A | null | void>;

	type Options = {
		collection: Collection.Options;
		document: {
			createIfMissing: boolean;
		};
	};

	type FnPair = {
		// // Ideally this is only fires when with `addDocs` or `setDocs`;
		// // then again, that's an extra check step
		// create?: (ref: Ref) => Promise<void>;
		set: <D extends Document.Data>(
			ref: Ref,
			data: D,
			options: Options
		) => Promise<D>;
		update: <D extends Document.Data>(
			ref: Ref,
			data: Partial<D>,
			options: Options
		) => Promise<D>;
		get: <D extends Document.Data>(
			ref: Ref,
			options: Options
		) => Promise<D | null>;
		delete: (ref: Ref, options: Options) => Promise<void>;
	};
}
