import { StoreInstance, Document, Collection } from "../../collection";

/**
 * Represent storage for key value pair
 */

type DocumentId = string;
type CollectionId = string;

export default function KeyValueMap(generateId: () => string): StoreInstance {
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
			addMultiple: async (ref, data) => {
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
				query: Collection.DocumentQuery
			) => {
				// Initiate
				if (!map.has(ref.collectionId)) {
					map.set(ref.collectionId, new Map<DocumentId, D>());
					return [];
				}

				const collMap = map.get(ref.collectionId) as Map<DocumentId, D>;
				return Array.from(new Set(collMap.entries()));
			},
			docs: async (ref) => {
				if (!map.has(ref.collectionId)) {
					throw {
						code: "missing",
						message: `Missing collection ${ref.collectionId}`,
					};
				}
				const collMap = map.get(ref.collectionId) as Map<
					DocumentId,
					Document.Data
				>;

				// Get documents
				return new Set(collMap.keys());
			},
		},
		doc: {
			set: async (ref, data) => {
				const collMap = map.get(ref.collectionId);

				if (collMap === undefined) {
					throw {
						code: "missing",
						message: `Missing collection ${ref.collectionId}`,
					};
				}

				//
				collMap.set(ref.documentId, data);

				return data;
			},
			get: async <D extends Document.Data>(ref: Document.Ref) => {
				const collMap = map.get(ref.collectionId);

				if (collMap === undefined) {
					throw {
						code: "missing",
						message: `Missing collection ${ref.collectionId}`,
					};
				}

				//
				return (collMap.get(ref.documentId) ?? null) as D | null;
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
			delete: async (ref) => {
				if (!map.has(ref.collectionId)) {
					throw {
						code: "missing",
						message: `Missing collection ${ref.collectionId}`,
					};
				}

				const collMap = map.get(ref.collectionId) as Map<
					DocumentId,
					Document.Data
				>;

				if (!collMap.has(ref.documentId)) {
					throw {
						code: "missing-document",
						message: `Missing document ${ref.collectionId}`,
					};
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
	};
}
