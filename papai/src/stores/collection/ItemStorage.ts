import { StoreConstructor } from "../../collection";
import { Document, Collection } from "../../collection/types";

type KeyValuePair = [string, string | null];
export type AsyncItemStorage = {
	getItem: (ref: string) => Promise<string | null>;
	setItem: (ref: string, item: string) => Promise<void>;
	removeItem: (ref: string) => Promise<void>;
	multiGet: (refs: string[]) => Promise<readonly KeyValuePair[] | void>;
	multiSet: (kvp: Array<[string, string]>) => Promise<void>;
	multiRemove: (refs: string[]) => Promise<void>;
};

export type SyncSingleItemStorage = {
	getItem: (ref: string) => string | null;
	setItem: (ref: string, item: string) => void;
	removeItem: (ref: string) => void;
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
		removeItem: async (key: string) => syncStore.removeItem(key),
		multiRemove: async (refs: string[]) => {
			for (let ref of refs) {
				syncStore.removeItem(ref);
			}
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
	const clearCollectionDocuments = async (ref: Collection.Ref) => {
		const refs = await Helper.get<string[]>(
			config.store,
			config.getCollRef(ref),
			[]
		);

		// get all document keys
		const docRefs = refs.map((documentId) =>
			config.getDocRef({
				collectionId: ref.collectionId,
				documentId,
			})
		);

		// remove all documents in the collection
		await config.store.multiRemove(docRefs);
	};

	// create collections map from name
	return {
		clearStore: async () => {
			// get all collections
			const collIds = await Helper.get<string[]>(
				config.store,
				config.nameReference,
				[]
			);

			const allDocsRefs = ([] as string[]).concat(
				...(await Promise.all(
					collIds.map(async (collectionId) => {
						const docs = await Helper.get(
							config.store,
							config.getCollRef({ collectionId }),
							[]
						);
						return docs.map((documentId) =>
							config.getDocRef({ collectionId, documentId })
						);
					})
				))
			);

			console.log({ allDocsRefs });

			// remove all
			await config.store.multiRemove(allDocsRefs);

			// reference for the mother of all collections
			await config.store.removeItem(config.nameReference);
		},
		coll: {
			clear: async (ref) => {
				const collIds = await Helper.get<string[]>(
					config.store,
					config.nameReference,
					[]
				);

				const set = new Set(collIds);
				set.delete(ref.collectionId);

				// reset value with the collection name omitted
				await Helper.set(
					config.store,
					config.nameReference,
					Array.from(set)
				);

				await clearCollectionDocuments(ref);

				// remove the collection
				await config.store.removeItem(config.getCollRef(ref));

				// remove stuff
			},
			add: async (ref, data) => {
				// init collection
				await setCollection(
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
				await setCollection(
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
				await setCollection(
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
					return [];
					// throw {
					// 	code: "missing",
					// 	message: `Collection ${ref.collectionId}`,
					// };
				}

				const docRefs = refs.map((documentId) => [
					config.getDocRef({
						collectionId: ref.collectionId,
						documentId,
					}),
					documentId,
				]);

				// map the keys
				const docRefMap = Object.fromEntries(docRefs);
				const docRefDataPairs = (await config.store.multiGet(
					docRefs.map((d) => d[0])
				)) as KeyValuePair[];

				// add logic stuff here

				return docRefDataPairs
					.map(([_docRef, dataStr]) => {
						//..
						return [
							docRefMap[_docRef],
							dataStr !== null
								? (JSON.parse(dataStr) as D)
								: null,
						];
					})
					.filter((d) => d[1] !== null || d[1] !== undefined) as [
					string,
					D
				][];
			},

			setDocs: async (ref, data, options) => {
				await setCollection(
					config.store,
					config.nameReference,
					ref.collectionId
				);

				const refs = await Helper.get<string[]>(
					config.store,
					config.getCollRef(ref),
					[]
				);

				const indataE = data.map(([documentId, data]) => {
					const docRef = {
						collectionId: ref.collectionId,
						documentId,
					};

					return [
						documentId,
						[config.getDocRef(docRef), JSON.stringify(data)] as [
							string,
							string
						],
					];
				});

				const ikeys = indataE.map((s) => s[0]);
				const indata = indataE.map((s) => s[1]) as [string, string][];

				// add documents
				await Helper.set(
					config.store,
					config.getCollRef(ref),
					Array.from(new Set([...refs, ...ikeys]))
				);

				await config.store.multiSet(indata);
			},

			// documents
			docs: async (ref) => {
				// init collection
				await setCollection(
					config.store,
					config.nameReference,
					ref.collectionId
				);
				const refs = await Helper.get<string[] | null>(
					config.store,
					config.getCollRef(ref),
					[]
					// null
				);

				// if (refs === null) {
				// 	throw {
				// 		code: "missing",
				// 		message: `Collection ${ref.collectionId}`,
				// 	};
				// }

				return new Set(refs);
			},
			// clear: () => {
			// 	// remove all items in the collection
			// },
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
				await setCollection(
					config.store,
					config.nameReference,
					ref.collectionId
				);
				// const d = await Helper.get<D | null>(
				// 	config.store,
				// 	config.getDocRef(ref),
				// 	null
				// );

				// if (d === null) {
				// 	throw {
				// 		code: "missing-docs",
				// 		message: `Reference ${ref.documentId}[COLL / ${ref.collectionId}]`,
				// 	};
				// }
				const refs = await Helper.get<string[]>(
					config.store,
					config.getCollRef(ref),
					[]
				);

				await Helper.set(
					config.store,
					config.getCollRef(ref),
					Array.from(new Set([...refs, ref.documentId]))
				);

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
						message: `Reference ${ref.documentId}[COLL / ${ref.collectionId}]`,
						// message: `Reference ${ref}`,
					};
				}

				const newData: D = { ...prevData, ...data };
				await Helper.set(config.store, config.getDocRef(ref), newData);

				return newData;
			},
			delete: async (ref) => {
				const docIds = await Helper.get<string[]>(
					config.store,
					config.getCollRef(ref),
					[]
				);
				const set = new Set(docIds);
				set.delete(ref.documentId);

				// set the new document list with the omit document
				await Helper.set(
					config.store,
					config.getCollRef(ref),
					Array.from(set)
				);

				await config.store.removeItem(config.getDocRef(ref));
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
