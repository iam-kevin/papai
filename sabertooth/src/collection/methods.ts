import { CollectionNode, DocumentNode } from "./core";
import { Collection, Document } from "./types";

/**
 * Document functions
 * ------------
 */
export function getDoc<D extends Document.Data>(doc: DocumentNode<D>) {
	return doc.handle(
		{ ref: doc.ref, arguments: null, type: "get" },
		doc.options
	);
}

export function setDoc<D extends Document.Data>(doc: DocumentNode<D>, data: D) {
	return doc.handle(
		{ ref: doc.ref, arguments: data, type: "set" },
		doc.options
	);
}

export function updateDoc<D extends Document.Data>(
	doc: DocumentNode<D>,
	data: Partial<D>
) {
	return doc.handle(
		{ ref: doc.ref, arguments: data, type: "update" },
		doc.options
	);
}

export function deleteDoc<D extends Document.Data>(doc: DocumentNode<D>) {
	return doc.handle(
		{ ref: doc.ref, arguments: null, type: "delete" },
		doc.options
	);
}

/**
 * Collection function
 * --------------------
 */

export async function getDocs<D extends Document.Data>(
	coll: CollectionNode<D>,
	query: Collection.DocumentQuery = {}
) {
	return (await coll.handle(
		{
			ref: coll.ref,
			arguments: { query },
			type: "get-docs",
		},
		coll.options
	)) as Array<[string, D]>;
}

export async function addDoc<D extends Document.Data>(
	coll: CollectionNode<D>,
	data: D
) {
	return (await coll.handle(
		{
			type: "add",
			ref: coll.ref,
			arguments: data,
		},
		coll.options
	)) as string;
}

export async function addDocs<D extends Document.Data>(
	coll: CollectionNode<D>,
	data: D[]
) {
	return (await coll.handle(
		{
			type: "add-docs",
			ref: coll.ref,
			arguments: data,
		},
		coll.options
	)) as string[];
}
