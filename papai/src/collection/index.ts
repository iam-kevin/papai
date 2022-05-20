/**
 * Implementation of a collection store
 */
import type { Collection, Document } from "./types";
import { CollectionNode, DocumentNode, GetCollections, Store } from "./core";

export * from "./methods";
export * from "./observable";
export * from "./types";

/**
 * Document Node
 * @param store
 * @param docRef
 * @returns
 */
export function documentNode<D extends Document.Data>(
	store: Store,
	docRef: Document.Ref
) {
	return doc(collection<D>(store, docRef.collectionId), docRef.documentId);
}

/**
 * Collection Node
 * @param store
 * @param collRef
 * @returns
 */
export function collectionNode<D extends Document.Data>(
	store: Store,
	collRef: Collection.Ref
) {
	return collection<D>(store, collRef.collectionId);
}

/**
 * Gets the reference of the collection from the sotre
 * @param store
 * @param id
 */
export function collection<D extends Document.Data>(
	store: Store,
	id: string,
	options?: {
		collection?: Collection.Options;
		document?: Document.Options;
	}
): CollectionNode<D> {
	return new CollectionNode<D>(
		{ collectionId: id },
		store.collectionObservable,
		store.documentObservable,
		store.performCollectionAction,
		store.performDocumentAction,
		// configuration on the node. This might change in the future
		options?.collection ?? store.defaultCollectionOptions,
		options?.document ?? store.defaultDocumentOptions
	);
}

/**
 * Gets the refence for the ocument in the collection
 * @param coll {CollectionNode}
 * @param id {string}
 */
export function doc<D extends Document.Data>(
	coll: CollectionNode<D>,
	id: string,
	documentOptions?: Document.Options
): DocumentNode<D> {
	return new DocumentNode(
		{
			collectionId: coll.ref.collectionId,
			documentId: id,
		},
		coll.documentObservable,
		coll.documentHandle,
		documentOptions ?? coll.documentOptions
	);
}

export type StoreConstructor = {
	coll: Collection.FnPair;
	doc: Document.FnPair;
	getCollections: GetCollections;
	clearStore: () => Promise<void>;
	options: {
		collection: Collection.Options;
		document: Document.Options;
	};
};

export async function wipeStore(store: Store) {
	return await store.wipeStore();
}

/**
 * Creates a store instance from a `StoreConstructor`.
 * Providing an API to interact with store
 *
 * @returns
 */
export function getStore(args: StoreConstructor) {
	/**
	 * Collection handler
	 * @param action
	 */
	const collectionHandler = async <A extends Document.Data>(
		action: Collection.Action<A>,
		collectionOptions: Collection.Options
	) => {
		switch (action.type) {
			case "add": {
				return await args.coll.add<A>(
					action.ref,
					action.arguments,
					collectionOptions
				);
			}
			case "get-docs": {
				return await args.coll.getDocs<A>(
					action.ref,
					action.arguments.query,
					collectionOptions
				);
			}
			case "set-docs": {
				return await args.coll.setDocs<A>(
					action.ref,
					action.arguments,
					collectionOptions
				);
			}
			case "add-docs": {
				return await args.coll.addMultiple<A>(
					action.ref,
					action.arguments,
					collectionOptions
				);
			}

			case "docs": {
				return await args.coll.docs(action.ref, collectionOptions);
			}
			case "clear": {
				return await args.coll.clear(action.ref, collectionOptions);
			}
			default: {
				throw {
					code: "failed",
					// @ts-ignore
					message: `Unknown action object ${action.type}`,
				};
			}
		}
	};

	/**
	 * Document handler
	 * @param action
	 * @returns
	 */
	const documentHandler = async <A extends Document.Data>(
		action: Document.Action<A>,
		documentOptions: Document.Options
	) => {
		switch (action.type) {
			case "set": {
				// action.arguments.data;
				const d = await args.doc.set<A>(
					action.ref,
					action.arguments,
					documentOptions
				);
				return d; // returns the state of the app on change
			}
			case "get": {
				const out = await args.doc.get<A>(action.ref, documentOptions);
				return out;
			}
			case "update": {
				return await args.doc.update<A>(
					action.ref,
					action.arguments,
					documentOptions
				);
			}
			case "delete": {
				return await args.doc.delete(action.ref, documentOptions);
			}
			default: {
				throw {
					code: "failed",
					// @ts-ignore
					message: `Unknown action object ${action.type}`,
				};
			}
		}
	};

	return new Store(
		collectionHandler,
		documentHandler,
		args.getCollections,
		args.clearStore,
		args.options.collection,
		args.options.document
	);
}
