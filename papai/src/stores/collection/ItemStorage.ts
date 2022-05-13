import { Collection, StoreConstructor } from "../../collection";
import { Document } from "../../collection";

type KeyValuePair = [string, string | null];
export type AsyncItemStorage = {
	getItem: (ref: string) => Promise<string | null>;
	setItem: (ref: string, item: string) => Promise<void>;
	multiGet: (refs: string[]) => Promise<readonly KeyValuePair[] | void>;
	multiSet: (kvp: Array<[string, string]>) => Promise<void>;
};

export type SyncSingleItemStorage = {
	getItem: (ref: string) => string | null;
	setItem: (ref: string, item: string) => void;
};

/**
 * Support
 * @param syncStore
 * @returns
 */
export function asyncAdapter(
	syncStore: SyncSingleItemStorage
): AsyncItemStorage {
	return {
		getItem: async (key: string) => syncStore.getItem(key),
		setItem: async (key: string, value: string) =>
			syncStore.setItem(key, value),
		multiGet: async (refs: string[]) =>
			refs.map((key) => [key, syncStore.getItem(key)]),
		multiSet: async (kvp) => {
			kvp.map(([key, val]) => {
				syncStore.setItem(key, val);
			});
		},
	};
}

const Helper = {
	get: async <T>(
		istore: AsyncItemStorage,
		key: string,
		fallback: T | undefined = undefined
	) => {
		const x = await istore.getItem(key);
		const vals: T = x !== null ? JSON.parse(x) : (fallback as T);
		return vals;
	},

	set: async <T>(istore: AsyncItemStorage, key: string, value: T) => {
		await istore.setItem(key, JSON.stringify(value));
	},
};

const setCollection = async (
	store: AsyncItemStorage,
	collRef: string,
	collectionId: string
) => {
	const refs = await Helper.get(store, collRef, []);
	await Helper.set(
		store,
		collRef,
		Array.from(new Set([...refs, collectionId]))
	);
};

type CollectionOptions = {
	createIfMissing: boolean;
};
type DocumentOptions = {
	createIfMissing: boolean;
};

const defaultCollectionOptions: CollectionOptions = {
	createIfMissing: true,
};
const defaultDocumentOptions: DocumentOptions = {
	createIfMissing: true,
};

/**
 * Actual
 * @param config
 * @param generateId
 */
export default function ItemStorageCollection(
	config: {
		nameReference: string;
		store: AsyncItemStorage;
		getDocRef: (d: Document.Ref) => string;
		getCollRef: (d: Collection.Ref) => string;
	},
	generateId: () => string
): StoreConstructor {
	// create collections map from name

	return {
		coll: {
			add: async (ref, data) => {
				// init collection
				setCollection(
					config.store,
					config.nameReference,
					ref.collectionId
				);

				const refs = await Helper.get<string[]>(
					config.store,
					config.getCollRef(ref),
					[]
				);

				const documentId = generateId();
				await Helper.set(
					config.store,
					config.getDocRef({
						collectionId: ref.collectionId,
						documentId,
					}),
					data
				);

				await Helper.set(
					config.store,
					config.getCollRef(ref),
					Array.from(new Set([...refs, documentId]))
				);

				return documentId;
			},
			addMultiple: async (ref, data) => {
				// init collection
				setCollection(
					config.store,
					config.nameReference,
					ref.collectionId
				);

				const refs = await Helper.get<string[]>(
					config.store,
					ref.collectionId,
					[]
				);

				const docIds = await Promise.all(
					data.map(async (dt) => {
						const documentId = generateId();
						await Helper.set(
							config.store,
							config.getDocRef({
								collectionId: ref.collectionId,
								documentId,
							}),
							data
						);
						return documentId;
					})
				);

				await Helper.set(
					config.store,
					config.getCollRef(ref),
					Array.from(new Set([...refs, ...docIds]))
				);

				return docIds;
			},
			getDocs: async <D extends Document.Data>(
				ref: Collection.Ref,
				query: Collection.DocumentQuery
			) => {
				// init collection
				setCollection(
					config.store,
					config.nameReference,
					ref.collectionId
				);

				const refs = await Helper.get<string[] | null>(
					config.store,
					config.getCollRef(ref),
					null
				);

				if (refs === null) {
					throw {
						code: "missing",
						message: `Collection ${ref.collectionId}`,
					};
				}

				const docRefs = refs.map((documentId) =>
					config.getDocRef({
						collectionId: ref.collectionId,
						documentId,
					})
				);

				const docRefDataPairs = (await config.store.multiGet(
					docRefs
				)) as KeyValuePair[];

				// add logic stuff here

				return docRefDataPairs
					.map(([_docRef, dataStr], ix) => {
						//..
						return [
							docRefs[ix],
							dataStr !== null
								? (JSON.parse(dataStr) as D)
								: null,
						];
					})
					.filter((d) => d[1] !== null) as [string, D][];
			},

			setDocs: async (ref, data, options) => {
				const indata = data.map(([documentId, data]) => {
					const docRef = {
						collectionId: ref.collectionId,
						documentId,
					};

					return [config.getDocRef(docRef), JSON.stringify(data)] as [
						string,
						string
					];
				});

				await config.store.multiSet(indata);
			},

			// documents
			docs: async (ref) => {
				// init collection
				setCollection(
					config.store,
					config.nameReference,
					ref.collectionId
				);
				const refs = await Helper.get<string[] | null>(
					config.store,
					config.getCollRef(ref),
					null
				);

				if (refs === null) {
					throw {
						code: "missing",
						message: `Collection ${ref.collectionId}`,
					};
				}

				return new Set(refs);
			},
		},
		doc: {
			get: async <D extends Document.Data>(ref: Document.Ref) => {
				return await Helper.get<D | null>(
					config.store,
					config.getDocRef(ref),
					null
				);
			},
			set: async <D extends Document.Data>(
				ref: Document.Ref,
				data: D
			) => {
				const d = await Helper.get<D | null>(
					config.store,
					config.getDocRef(ref),
					null
				);

				if (d === null) {
					throw {
						code: "missing-docs",
						message: `Reference ${ref}`,
					};
				}

				await Helper.set(config.store, config.getDocRef(ref), data);
				return data;
			},
			update: async <D extends Document.Data>(
				ref: Document.Ref,
				data: Partial<D>
			) => {
				const prevData = await Helper.get<D | null>(
					config.store,
					config.getDocRef(ref),
					null
				);

				if (prevData === null) {
					throw {
						code: "missing-docs",
						message: `Reference ${ref}`,
					};
				}

				const newData: D = { ...prevData, ...data };
				await Helper.set(config.store, config.getDocRef(ref), newData);

				return newData;
			},
			delete: async (ref) => {
				throw new Error("Not Implemented");
			},
		},
		getCollections: async () => {
			const refs = await Helper.get<string[]>(
				config.store,
				config.nameReference,
				[]
			);

			return new Set(refs.map((rf) => ({ collectionId: rf })));
		},

		options: {
			collection: defaultCollectionOptions,
			document: {
				collection: defaultCollectionOptions,
				document: defaultDocumentOptions,
			},
		},
	};
}
