import { CollectionNode, DocumentNode } from "./core";
import { Collection, Document } from "./types";

/**
 * Document functions
 * ------------
 */
export function getDoc<D extends Document.Data>(doc: DocumentNode<D>) {
	return doc.handle({ ref: doc.ref, arguments: null, type: "get" });
}

export function setDoc<D extends Document.Data>(doc: DocumentNode<D>, data: D) {
	return doc.handle({ ref: doc.ref, arguments: data, type: "set" });
}

export function updateDoc<D extends Document.Data>(
	doc: DocumentNode<D>,
	data: Partial<D>
) {
	return doc.handle({ ref: doc.ref, arguments: data, type: "update" });
}

export function deleteDoc<D extends Document.Data>(doc: DocumentNode<D>) {
	return doc.handle({ ref: doc.ref, arguments: null, type: "delete" });
}

/**
 * Collection function
 * --------------------
 */

export function getDocs<D extends Document.Data>(
	coll: CollectionNode<D>,
	query: Collection.DocumentQuery
) {
	return coll.handle({
		ref: coll.ref,
		arguments: { query },
		type: "get-docs",
	});
}

export function addDoc<D extends Document.Data>(
	coll: CollectionNode<D>,
	data: D
) {
	return coll.handle({ type: "add", ref: coll.ref, arguments: data });
}

export function addDocs<D extends Document.Data>(
	coll: CollectionNode<D>,
	data: D[]
) {
	return coll.handle({ type: "add-docs", ref: coll.ref, arguments: data });
}
