import { CollectionNode, DocumentNode, Store } from "./core";
import { Collection, Document } from "./types";

import _isEqual from "lodash.isequal";
import { collectionNode, documentNode } from ".";

export type DocumentObservedAction<D extends Document.Data = Document.Data> = {
	ref: Document.Ref;
} & ({ action: "updated"; state: D } | { action: "removed" });

export type CollectionObservedAction = {
	ref: Collection.Ref;
} & (
	| { action: "removed"; documents: Document.Ref[] }
	| { action: "changed"; documents: Document.Ref[] }
	| { action: "clear" }
);

export function onSnapshot<D extends Document.Data>(
	store: Store,
	cb: (colnode: CollectionNode<D>, docnode: DocumentNode<D>) => void
) {
	return store.documentObservable.subscribe((f) => {
		// ...
		cb(
			collectionNode<D>(store, { collectionId: f.ref.collectionId }),
			documentNode<D>(store, f.ref)
		);
	});
}

/**
 * Set up listener for the actions happening in the collection
 * @param doc
 * @param cb
 */
export function onDocumentSnapshot<D extends Document.Data>(
	doc: DocumentNode<D>,
	cb: (action: DocumentObservedAction<D>["action"], data?: D) => void
) {
	return doc.observable.subscribe((o) => {
		if (_isEqual(o.ref, doc.ref)) {
			if (o.action === "removed") {
				cb(o.action);
			} else {
				cb(o.action, o.state);
			}
		}
	});
}

/**
 * Set up listener for changes in the document
 */
export function onCollectionSnapshot<D extends Document.Data>(
	col: CollectionNode<D>,
	cb: (
		action: CollectionObservedAction["action"],
		documents?: Document.Ref[]
	) => void
) {
	return col.observable.subscribe((o) => {
		if (_isEqual(o.ref, col.ref)) {
			if (o.action === "clear") {
				cb(o.action);
			} else {
				cb(o.action, o.documents);
			}
		}
	});
}
