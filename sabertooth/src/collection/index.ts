/**
 * Implementation of a collection store
 */
import type { Collection, Document } from "./types";
import { CollectionNode, DocumentNode, Store } from "./core";

export * from "./methods";
export * from "./observable";
export * from "./types";

/**
 * Gets the reference of the collection from the sotre
 * @param store
 * @param id
 */
export function collection<D extends Document.Data>(
	store: Store,
	id: string
): CollectionNode<D> {
	return new CollectionNode<D>(
		{ collectionId: id },
		store.collectionObservable,
		store.documentObservable,
		store.performCollectionAction,
		store.performDocumentAction
	);
}

/**
 * Gets the refence for the ocument in the collection
 * @param collRef
 * @param path
 */
export function doc<D extends Document.Data>(
	coll: CollectionNode<D>,
	id: string
): DocumentNode<D> {
	return new DocumentNode(
		{
			collectionId: coll.ref.collectionId,
			documentId: id,
		},
		coll.documentObservable,
		coll.documentHandle
	);
}

export type StoreInstance = {
	coll: Collection.FnPair;
	doc: Document.FnPair;
	getCollections: () => Promise<Collection.Ref[]>;
};

/**
 * Collection
 *
 * @param collFns
 * @param docFns
 * @param docRefFn
 * @param collRefFn
 * @returns
 */
export function store(fns: StoreInstance) {
	/**
	 * Collection handler
	 * @param action
	 */
	const collectionHandler = async <A extends Document.Data>(
		action: Collection.Action<A>
	) => {
		switch (action.type) {
			case "add": {
				return await fns.coll.add<A>(action.ref, action.arguments);
			}
			case "get-docs": {
				return await fns.coll.getDocs<A>(
					action.ref,
					action.arguments.query
				);
			}
			case "add-docs": {
				return await fns.coll.addMultiple<A>(
					action.ref,
					action.arguments
				);
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
		action: Document.Action<A>
	) => {
		switch (action.type) {
			case "set": {
				// action.arguments.data;
				const d = await fns.doc.set<A>(action.ref, action.arguments);
				return d; // returns the state of the app on change
			}
			case "get": {
				const out = await fns.doc.get<A>(action.ref);
				return out;
			}
			case "update": {
				return await fns.doc.update<A>(action.ref, action.arguments);
			}
			case "delete": {
				await fns.doc.delete(action.ref);
			}
			default: {
				throw {
					code: "failed",
					// @ts-ignore
					message: `Unknown action object ${action}`,
				};
			}
		}
	};

	return new Store(collectionHandler, documentHandler, fns.getCollections);
}
