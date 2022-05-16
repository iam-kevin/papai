import { Subject, Observable } from "rxjs";
import type {
	CollectionObservedAction,
	DocumentObservedAction,
} from "./observable";
import { Document, Collection } from "./types";

export type GetCollections = () => Promise<Set<Collection.Ref>>;
/**
 * Store
 */
export class Store {
	private obsColl: Subject<CollectionObservedAction>;
	private obsDoc: Subject<DocumentObservedAction<any>>;

	public performCollectionAction: Collection.ActionHandler;
	public performDocumentAction: Document.ActionHandler;

	public collections: () => Promise<Set<Collection.Ref>>;

	private _defColOpts;
	private _defDocOpts;

	get defaultCollectionOptions() {
		return this._defColOpts;
	}

	get defaultDocumentOptions() {
		return this._defDocOpts;
	}

	constructor(
		collHandler: Collection.ActionHandler,
		docHandler: Document.ActionHandler,
		getCollections: GetCollections,
		defaultCollectionOptions: Collection.Options,
		defaultDocumentOptions: Document.Options
	) {
		this.obsColl = new Subject<CollectionObservedAction>();
		this.obsDoc = new Subject<DocumentObservedAction<any>>();
		this._defColOpts = defaultCollectionOptions;
		this._defDocOpts = defaultDocumentOptions;

		this.collections = async () => {
			return await getCollections();
		};

		this.performDocumentAction = async <A extends Document.Data>(
			action: Document.Action<A>,
			options: Document.Options
		) => {
			if (action.type === "delete") {
				await docHandler<A>(action, options);

				//
				this.obsColl.next({
					ref: action.ref,
					action: "removed",
					documents: [action.ref],
				});

				//
				this.obsDoc.next({
					action: "removed",
					ref: action.ref,
				});

				return;
			}

			if (action.type === "set") {
				const s = (await docHandler<A>(action, options)) as A;

				this.obsColl.next({
					ref: action.ref,
					action: "changed",
					documents: [action.ref],
				});

				this.obsDoc.next({
					action: "updated",
					ref: action.ref,
					// data: action.arguments,
					state: s,
				});

				return s;
			}

			if (action.type === "update") {
				const p = (await docHandler<A>(action, options)) as A;

				this.obsColl.next({
					ref: action.ref,
					action: "changed",
					documents: [action.ref],
				});

				this.obsDoc.next({
					action: "updated",
					ref: action.ref,
					// data: action.arguments,
					state: p,
				});

				return p;
			}

			return await docHandler<A>(action, options);
		};

		this.performCollectionAction = async <A extends Document.Data>(
			action: Collection.Action<A>,
			options: Collection.Options
		) => {
			if (action.type === "clear") {
				await collHandler<A>(action, options);

				this.obsColl.next({
					ref: action.ref,
					action: "clear",
				});

				return;
			}

			// check if action is for documents
			if (action.type === "add") {
				const documentId = (await collHandler<A>(
					action,
					options
				)) as string;

				const docRef = {
					collectionId: action.ref.collectionId,
					documentId,
				};

				//
				this.obsColl.next({
					ref: action.ref,
					action: "changed",
					documents: [docRef],
				});

				//
				this.obsDoc.next({
					ref: docRef,
					action: "updated",
					state: action.arguments,
				});

				return documentId;
			}

			if (action.type === "add-docs") {
				// something here
				const documentIds = (await collHandler<A>(
					action,
					options
				)) as string[];

				//
				this.obsColl.next({
					ref: action.ref,
					action: "changed",
					documents: documentIds.map((d) => ({
						collectionId: action.ref.collectionId,
						documentId: d,
					})),
				});

				documentIds.forEach((documentId, ix) => {
					const docRef = {
						collectionId: action.ref.collectionId,
						documentId,
					};

					this.obsDoc.next({
						ref: docRef,
						action: "updated",
						state: action.arguments[ix],
					});
				});

				return documentIds;
			}

			if (action.type === "set-docs") {
				const idDataPairs = action.arguments;

				// execute set-docs
				await collHandler<A>(action, options);

				//
				this.obsColl.next({
					ref: action.ref,
					action: "changed",
					documents: idDataPairs.map(([documentId, _]) => ({
						collectionId: action.ref.collectionId,
						documentId: documentId,
					})),
				});

				idDataPairs.forEach(([documentId, state], ix) => {
					const docRef = {
						collectionId: action.ref.collectionId,
						documentId,
					};

					this.obsDoc.next({
						ref: docRef,
						action: "updated",
						state: state,
					});
				});

				return;
			}

			return (await collHandler<A>(action, options)) as [string, A][];
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

	private _opts;

	constructor(
		ref: Document.Ref,
		obs: Observable<DocumentObservedAction<D>>,
		handler: Document.ActionHandler,
		opts: Document.Options
	) {
		this._obs = obs;
		this._ref = ref;

		this._handler = handler;

		this._opts = opts;
	}

	get handle() {
		return this._handler;
	}

	get options() {
		return this._opts;
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

	private _opts;
	private _docOpts;

	private _handler: Collection.ActionHandler;
	private _docHandler: Document.ActionHandler;

	constructor(
		ref: Collection.Ref,
		obs: Observable<CollectionObservedAction>,
		docObs: Observable<DocumentObservedAction<D>>,
		handler: Collection.ActionHandler,
		docHandler: Document.ActionHandler,
		opts: Collection.Options,
		docOpts: Document.Options
	) {
		this._obs = obs;
		this._docObs = docObs;
		this._ref = ref;

		this._handler = handler;
		this._docHandler = docHandler;

		// Configuration about the node
		this._opts = opts;
		this._docOpts = docOpts;
	}

	get handle() {
		return this._handler;
	}

	get documentHandle() {
		return this._docHandler;
	}

	get options() {
		return this._opts;
	}

	get documentOptions() {
		return this._docOpts;
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
