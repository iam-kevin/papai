![Logo](./assets/Papai-main.png)

**Papai** is storage provider intended for Local-first use with support for distrubuted storage implementation.

With ever-growing implementations for different storage options like `localStorage`, `AsyncStorage`, `level`, `IndexedDB`, `WebSQL`, **Papai** makes it possible to use the same interface attached to different storage options, leaving you concerned with building the business side of your applications.

## Features

-   [x] Data provider for
    -   [ ] collection-document modelled data (like `depth=1` in NoSQL databases)
    -   [ ] append-only data (useful for storing data like logs / errors thrown in apps)
-   [x] Functional API (inspired by firebase `v9` API)
-   [x] Stores to start off with (`ItemStorageCollection` + `KeyValuMapCollection`) (You can ignore these options and implement your own!)
-   Attach observers to action done onto the stores
    -   [x] Collection
    -   [ ] Logs
-   [ ] Distributed storage support of collection and logs (65%)

## Usage

\*For the sake of demonstration, we'll it's being used in a web project

### Installation

Install papai and the storage option of your choice

-   Install `papai`

    ```bash
    # include papai in the project
    yarn add papai
    ```

-   Installing storage option of choice - in the case of a project, we'll use `localStorage`

### Actual use

Instantiate the store through the papai collection provider

```ts
import { getStore } from "papai/collection";
import type { Document, Collection } from "papai/collection";
import { ItemStorageCollection, asyncAdapter } from "papai/stores/collection";

import { v4 as uuidV4 } from "uuid";

/**
 * Id generator for new documents created.
 * Alternatively, you can use anyother id generating
 * functions that suits your need: (e.g. nanoid, react-native-uuid etc.)
 */
const generateId = () => uuidV4() as string;

const STORAGE_NAME = `@DEMO_DATABASE`; // database name

// function to define how to refernce a collection and document respectively in the storage
const refenceCollection = (r: Collection.Ref) =>
	`${STORAGE_NAME}/${r.collectionId}`;
const referenceDocument = (r: Document.Ref) =>
	`${STORAGE_NAME}/${r.collectionId}/${r.documentId}`;

// Created a storage instance with `localStorage`
const store = getStore(
	ItemStorageCollection({
		nameReference: STORAGE_NAME,
		store: asyncAdapter(localStorage), // makes local storage useful to `ItemStorage`
		getDocRef: referenceDocument,
		getCollRef: referenceCollection,
	})
);
```

Use the store in your projects

-   Get students collection reference

    ```ts
    import { collection } from "papai/collection";

    // Reference to reference (may or may not exist yet)
    // collection is type aware
    const students = collection<{ name: string; course: "science" | "arts" }>(
    	store,
    	"students"
    );
    ```

-   Add to student collection

    ```ts
    import { addDoc } from "papai/collection";

    // add to collection | this is type-safe
    const johnId = await addDoc(students, { name: "John Doe", course: "arts" });
    ```

-   Read data

    ```ts
    import { doc, getDoc } from "papai/collection";

    // read document of id from students collection
    const [_id, data] = await getDoc(doc(students, johnId));
    ```

-   Update data

    ```ts
    import { doc, updateDoc } from "papai/collection";

    // read document of id from students collection | still type-safe
    await updateDoc(doc(students, johnId), { course: "science" });
    ```

## Roadmap

-   store providers
    -   [ ] `core` - Housing core logic for the entire app.
    -   [x] `collection`
    -   [ ] `log`
-   store implemetation
    -   `stores/collection`
        -   [x] `ItemStorageCollection` - collection store wrapper for stores with `AsynStorage`-like interface s
            -   [x] `SyncItemStorage` - Adapter for stores with `localstorage`-like interfaces
        -   [x] `KeyValMapCollection` - uses Javascript's `Map` as in-memory data storage
    -   `stores/log`
        -   [ ] `ItemStorageLog` - logs store wrapper for `logs` type data
        -   [ ] `KeyValMapLog` - uses Javascript's `Map` as in-memory data storage
-   CRDTs for distributed storage support
    -   [x] State-based CRDTs
        -   [x] CRDTs for `collection` type data
        -   [x] CRDTs for `logs` type data
        -   [x] Data consolidation logic
    -   [ ] Delta-based CRDTs
        -   Check papers https://arxiv.org/abs/1410.2803 + https://arxiv.org/abs/1803.02750
        -   [ ] CRDTs for `collection` type data
        -   [ ] CRDTs for `logs` type data
        -   [ ] Data consolidation logic
    -   [ ] <strike> Operation-based CRDT</strike> (Might not implement this)
-   Supporting development
    -   [ ] Tests, Tests, Tests
    -   [ ] Docs, Docs, Docs (on site somewhere)
        -   [ ] How to create a papai `store`
        -   [ ] Nature of functions to support distributed nature (idempotent \* associative ...)
    -   [ ] Stress test server for distributed system
    -   [ ] Contribution

## Contibution

Contribution is highly encouraged. Let's help make thinking about storage logic a thing of the past, making it development close and closer about the buisness. Please check out the [`CONTRIBUTION`]() guideline and [`CODE OF CONDUCT`]()

## License

This project is under the [MIT Licence](./LICENSE)
