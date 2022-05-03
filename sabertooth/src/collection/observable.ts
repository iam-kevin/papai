import { CollectionNode, DocumentNode } from "./core";
import { Document } from "./types";

export type DocumentObservedAction<D extends Document.Data = Document.Data> = {
	ref: Document.Ref;
} & (
	| { action: "added"; state: D }
	| { action: "changed"; data: Partial<D>; state: D }
	| { action: "removed" }
);

export type CollectionObservedAction = {
	// ref: Collection.Ref;
} & (
	| { action: "updated"; document: Document.Ref }
	| { action: "added-multiple"; documents: Document.Ref[] }
	| { action: "added"; document: Document.Ref }
	| { action: "removed"; document: Document.Ref }
);

/**
 * Set up listener for the actions happening in the collection
 * @param doc
 * @param action
 * @param cb
 */
export function onDocumentSnapshot<D extends Document.Data>(
	doc: DocumentNode<D>,
	action: DocumentObservedAction<D>["action"],
	cb: (data) => void
) {
	// logic
}

/**
 * Set up listener for changes in the document
 */
export function onCollectionSnapshot<D extends Document.Data>(
	col: CollectionNode<D>,
	action: CollectionObservedAction["action"],
	cb: (data) => void
) {}
