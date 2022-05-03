import { Subject, Observable } from "rxjs";
import type {
	CollectionObservedAction,
	DocumentObservedAction,
} from "./observable";
import { Document, Collection } from "./types";

/**
 * Store
 */
export class Store {
	private obsColl: Subject<CollectionObservedAction>;
	private obsDoc: Subject<DocumentObservedAction<any>>;

	public performCollectionAction: Collection.ActionHandler;
	public performDocumentAction: Document.ActionHandler;

	constructor(
		collHandler: Collection.ActionHandler,
		docHandler: Document.ActionHandler
	) {
		this.obsColl = new Subject<CollectionObservedAction>();
		this.obsDoc = new Subject<DocumentObservedAction<any>>();

		this.performDocumentAction = async <A extends Document.Data>(
			action: Document.Action<A>
		) => {
			if (action.type === "delete") {
				await docHandler(action);

				//
				this.obsColl.next({
					action: "removed",
					document: action.ref,
				});

				//
				this.obsDoc.next({
					action: "removed",
					ref: action.ref,
				});

				return;
			}

			if (action.type === "set") {
				const s = (await docHandler(action)) as A;

				this.obsColl.next({
					action: "updated",
					document: action.ref,
				});

				this.obsDoc.next({
					action: "changed",
					ref: action.ref,
					data: action.arguments,
					state: s,
				});

				return s;
			}

			if (action.type === "update") {
				const p = (await docHandler(action)) as A;

				this.obsColl.next({
					action: "updated",
					document: action.ref,
				});

				this.obsDoc.next({
					action: "changed",
					ref: action.ref,
					state: action.arguments,
					data: p,
				});

				return p;
			}

			return await docHandler(action);
		};

		this.performCollectionAction = async <A extends Document.Data>(
			action: Collection.Action<A>
		) => {
			// check if action is for documents
			if (action.type === "add") {
				const documentId = (await collHandler<A>(action)) as string;

				const docRef = {
					collectionId: action.ref.collectionId,
					documentId,
				};

				//
				this.obsColl.next({
					action: "updated",
					document: docRef,
				});

				//
				this.obsDoc.next({
					ref: docRef,
					action: "added",
					state: action.arguments,
				});

				return documentId;
			}

			if (action.type === "add-docs") {
				// something here
				const documentIds = (await collHandler<A>(action)) as string[];

				//
				this.obsColl.next({
					action: "added-multiple",
					documents: documentIds.map((d) => ({
						collectionId: action.ref.collectionId,
						documentId: d,
					})),
				});

				documentIds.forEach((documentId) => {
					const docRef = {
						collectionId: action.ref.collectionId,
						documentId,
					};

					this.obsDoc.next({
						ref: docRef,
						action: "added",
						state: action.arguments,
					});
				});

				return documentIds;
			}

			return (await collHandler<A>(action)) as A[];
		};
	}

	get documentObservable() {
		return this.obsDoc.asObservable();
	}

	get collectionObservable() {
		return this.obsColl.asObservable();
	}
}

/**
 * Document Node
 */
export class DocumentNode<D extends Document.Data> {
	private _obs: Observable<DocumentObservedAction<D>>;
	private _ref: Document.Ref;

	private _handler: Document.ActionHandler;

	constructor(
		ref: Document.Ref,
		obs: Observable<DocumentObservedAction<D>>,
		handler: Document.ActionHandler
	) {
		this._obs = obs;
		this._ref = ref;

		this._handler = async (action) => handler(action);
	}

	get handle() {
		return this._handler;
	}

	get observable() {
		return this._obs;
	}

	get ref() {
		return this._ref;
	}
}

/**
 * Collection Node
 */
export class CollectionNode<D extends Document.Data> {
	private _obs: Observable<CollectionObservedAction>;
	private _docObs: Observable<DocumentObservedAction<D>>;
	private _ref: Collection.Ref;

	private _handler: Collection.ActionHandler;
	private _docHandler: Document.ActionHandler;

	constructor(
		ref: Collection.Ref,
		obs: Observable<CollectionObservedAction>,
		docObs: Observable<DocumentObservedAction<D>>,
		handler: Collection.ActionHandler,
		docHandler: Document.ActionHandler
	) {
		this._obs = obs;
		this._docObs = docObs;
		this._ref = ref;

		this._handler = handler;
		this._docHandler = docHandler;
	}

	get handle() {
		return this._handler;
	}

	get documentHandle() {
		return this._docHandler;
	}

	get observable() {
		return this._obs;
	}

	get documentObservable() {
		return this._docObs;
	}

	get ref() {
		return this._ref;
	}
}
