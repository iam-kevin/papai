import { StoreInstance, Document } from "../../collection";

/**
 * Represent storage for key value pair
 */

type DocumentId = string;
type CollectionId = string;

export function KeyValueMap(generateId: () => string): StoreInstance {
	// entire map the collections
	const map = new Map<CollectionId, Map<DocumentId, Document.Data>>();

	return {
		coll: {
			add: async (ref, data) => {
				// Initiate
				if (!map.has(ref.collectionId)) {
					map.set(
						ref.collectionId,
						new Map<DocumentId, Document.Data>()
					);
				}

				const collMap = map.get(ref.collectionId);
				const documentId = generateId();

				// Add new record
				collMap.set(documentId, data);

				// Output the Id for the new record
				return documentId;
			},
			addMultiple: async (ref, data) => {
				if (!map.has(ref.collectionId)) {
					map.set(
						ref.collectionId,
						new Map<DocumentId, Document.Data>()
					);
				}

				// get collection
				const collMap = map.get(ref.collectionId);

				return data.map((d) => {
					const docId = generateId();

					// Add new record
					collMap.set(docId, d);

					return docId;
				});
			},
			getDocs: async <D extends Document.Data>(ref, query) => {
				// Initiate
				if (!map.has(ref.collectionId)) {
					map.set(ref.collectionId, new Map<DocumentId, D>());

					return [];
				}

				const collMap = map.get(ref.collectionId);

				return Array.from(collMap.values()) as D[];
			},
		},
		doc: {
			set: async (ref, data) => {
				if (!map.has(ref.collectionId)) {
					throw {
						code: "missing",
						message: `Missing collection ${ref.collectionId}`,
					};
				}

				const collMap = map.get(ref.collectionId);

				//
				collMap.set(ref.documentId, data);

				return data;
			},
			get: async <D extends Document.Data>(ref) => {
				if (!map.has(ref.collectionId)) {
					throw {
						code: "missing",
						message: `Missing collection ${ref.collectionId}`,
					};
				}

				const collMap = map.get(ref.collectionId);

				//
				return (collMap.get(ref.documentId) as D) ?? null;
			},
			update: async <D extends Document.Data>(
				ref: Document.Ref,
				partialData: Partial<D>
			) => {
				if (!map.has(ref.collectionId)) {
					throw {
						code: "missing",
						message: `Missing collection ${ref.collectionId}`,
					};
				}

				const collMap = map.get(ref.collectionId);

				if (!collMap.has(ref.documentId)) {
					throw {
						code: "missing-document",
						message: `Missing document ${ref.collectionId}`,
					};
				}

				const prev = collMap.get(ref.documentId);
				const newData = { ...prev, ...partialData } as D;

				collMap.set(ref.documentId, newData);
				return newData;
			},
			delete: async (ref) => {
				if (!map.has(ref.collectionId)) {
					throw {
						code: "missing",
						message: `Missing collection ${ref.collectionId}`,
					};
				}

				const collMap = map.get(ref.collectionId);

				if (!collMap.has(ref.documentId)) {
					throw {
						code: "missing-document",
						message: `Missing document ${ref.collectionId}`,
					};
				}

				collMap.delete(ref.documentId);
			},
		},
		/**
		 * Get the list of all collections
		 */
		getCollections: async () => {
			return Array.from(map.keys()).map((ref) => ({ collectionId: ref }));
		},
	};
}
