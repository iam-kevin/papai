import { CollectionNode, DocumentNode } from "./core";
import { Collection, Document } from "./types";

/**
 * Document functions
 * ------------
 */
export async function getDoc<D extends Document.Data>(doc: DocumentNode<D>) {
	return (await doc.handle(
		{ ref: doc.ref, arguments: null, type: "get" },
		doc.options
	)) as D | null;
}

export async function setDoc<D extends Document.Data>(
	doc: DocumentNode<D>,
	data: D
) {
	return (await doc.handle(
		{ ref: doc.ref, arguments: data, type: "set" },
		doc.options
	)) as void;
}

export async function updateDoc<D extends Document.Data>(
	doc: DocumentNode<D>,
	data: Partial<D>
) {
	return (await doc.handle(
		{ ref: doc.ref, arguments: data, type: "update" },
		doc.options
	)) as D;
}

export async function deleteDoc<D extends Document.Data>(doc: DocumentNode<D>) {
	await doc.handle(
		{ ref: doc.ref, arguments: null, type: "delete" },
		doc.options
	);
	return;
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

export async function setDocs<D extends Document.Data>(
	coll: CollectionNode<D>,
	data: [string, D][]
) {
	return (await coll.handle(
		{
			ref: coll.ref,
			arguments: data,
			type: "set-docs",
		},
		coll.options
	)) as void;
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
