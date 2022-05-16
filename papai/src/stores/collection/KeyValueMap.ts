import { StoreConstructor, Document, Collection } from "../../collection";

/**
 * Represent storage for key value pair
 */

type DocumentId = string;
type CollectionId = string;

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

export default function KeyValueMapCollection(
	generateId: () => string
): StoreConstructor {
	// entire map the collections
	const map = new Map<CollectionId, Map<DocumentId, Document.Data>>();

	return {
		clearStore: async () => {
			// cler the entire store
			map.clear();
		},
		coll: {
			add: async (ref, data, options) => {
				// Initiate
				if (!map.has(ref.collectionId)) {
					map.set(
						ref.collectionId,
						new Map<DocumentId, Document.Data>()
					);
				}

				const collMap = map.get(ref.collectionId) as Map<
					DocumentId,
					Document.Data
				>;
				const documentId = generateId();

				// Add new record
				collMap.set(documentId, data);

				// Output the Id for the new record
				return documentId;
			},
			addMultiple: async (ref, data, options) => {
				if (!map.has(ref.collectionId)) {
					map.set(
						ref.collectionId,
						new Map<DocumentId, Document.Data>()
					);
				}

				// get collection
				const collMap = map.get(ref.collectionId) as Map<
					DocumentId,
					Document.Data
				>;

				return data.map((d) => {
					const docId = generateId();

					// Add new record
					collMap.set(docId, d);

					return docId;
				});
			},
			getDocs: async <D extends Document.Data>(
				ref: Collection.Ref,
				query: Collection.DocumentQuery,
				options: Collection.Options
			) => {
				// Initiate
				if (!map.has(ref.collectionId)) {
					map.set(ref.collectionId, new Map<DocumentId, D>());
					return [];
				}

				const collMap = map.get(ref.collectionId) as Map<DocumentId, D>;
				return Array.from(new Set(collMap.entries()));
			},
			setDocs: async <D extends Document.Data>(
				ref: Collection.Ref,
				data: [string, D][],
				options: Collection.Options
			) => {
				if (!map.has(ref.collectionId)) {
					map.set(ref.collectionId, new Map<DocumentId, D>());
				}

				const collMap = map.get(ref.collectionId) as Map<DocumentId, D>;

				// set documents
				data.forEach(([documentId, data]) => {
					// set up
					collMap.set(documentId, data);
				});

				return;
			},
			docs: async (ref, options) => {
				if (!map.has(ref.collectionId)) {
					return new Set();
					// map.set(ref.collectionId, new Map());
					// throw {
					// 	code: "missing",
					// 	message: `Missing collection ${ref.collectionId}`,
					// };
				}

				const collMap = map.get(ref.collectionId) as Map<
					DocumentId,
					Document.Data
				>;

				// Get documents
				return new Set(collMap.keys());
			},
			clear: async (ref, options) => {
				if (!map.has(ref.collectionId)) {
					return;
				}

				const collMap = map.get(ref.collectionId) as Map<
					DocumentId,
					Document.Data
				>;

				// clear document
				collMap.clear();
			},
		},
		doc: {
			set: async (ref, data, options) => {
				if (!map.has(ref.collectionId)) {
					map.set(ref.collectionId, new Map());
					// throw {
					// 	code: "missing",
					// 	message: `Missing collection ${ref.collectionId}`,
					// };
				}
				const collMap = map.get(ref.collectionId) as Map<
					DocumentId,
					Document.Data
				>;

				//
				collMap.set(ref.documentId, data);

				return data;
			},
			get: async <D extends Document.Data>(
				ref: Document.Ref,
				options: Document.Options
			) => {
				// const collMap = map.get(ref.collectionId);

				// if (collMap === undefined) {
				// 	throw {
				// 		code: "missing",
				// 		message: `Missing collection ${ref.collectionId}`,
				// 	};
				// }

				if (!map.has(ref.collectionId)) {
					map.set(ref.collectionId, new Map());
					// throw {
					// 	code: "missing",
					// 	message: `Missing collection ${ref.collectionId}`,
					// };
				}
				const collMap = map.get(ref.collectionId) as Map<
					DocumentId,
					Document.Data
				>;

				//
				return (collMap.get(ref.documentId) ?? null) as D | null;
			},
			update: async <D extends Document.Data>(
				ref: Document.Ref,
				partialData: Partial<D>,
				options: Document.Options
			) => {
				if (!map.has(ref.collectionId)) {
					throw {
						code: "missing",
						message: `Missing collection ${ref.collectionId}`,
					};
				}

				const collMap = map.get(ref.collectionId) as Map<DocumentId, D>;

				if (!collMap.has(ref.documentId)) {
					throw {
						code: "missing-document",
						message: `Missing document ${ref.collectionId}`,
					};
				}

				const prev = collMap.get(ref.documentId) as D;
				const newData = { ...prev, ...partialData } as D;

				collMap.set(ref.documentId, newData);
				return newData;
			},
			delete: async (ref, options) => {
				if (!map.has(ref.collectionId)) {
					return;
					// throw {
					// 	code: "missing",
					// 	message: `Missing collection ${ref.collectionId}`,
					// };
				}

				const collMap = map.get(ref.collectionId) as Map<
					DocumentId,
					Document.Data
				>;

				if (!collMap.has(ref.documentId)) {
					return;
					// throw {
					// 	code: "missing-document",
					// 	message: `Missing document ${ref.collectionId}`,
					// };
				}

				// delete document
				collMap.delete(ref.documentId);
			},
		},
		/**
		 * Get the list of all collections
		 */
		getCollections: async () => {
			return new Set(
				Array.from(map.keys()).map((ref) => ({ collectionId: ref }))
			);
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
