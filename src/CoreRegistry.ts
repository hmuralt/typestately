import { Store, ReducersMapObject, combineReducers, Unsubscribe } from "redux";
import ReducerRegistry from "./ReducerRegistry";
import PublisherRegistry from "./PublisherRegistry";
import StateAccess from "./StateAccess";

export type Listener = (store: Store) => void;

interface Entry {
    store: Store<{}>;
    listeners: Map<number, Listener>;
    storeUnsubscribe: Unsubscribe;
    reducerRegistry: ReducerRegistry;
    publisherRegistry: PublisherRegistry;
}

class CoreRegistry {
    private storeEntries = new Map<string, Entry>();

    public registerStore<TStore>(store: Store<TStore>, initialReducers: ReducersMapObject) {
        const storeId = `store_${this.storeEntries.size + 1}_${new Date().getTime()}`;

        this.registerStoreWith(storeId, store, initialReducers, new Map<number, Listener>());

        return storeId;
    }

    public replaceStore<TStore>(storeId: string, store: Store<TStore>, initialReducers: ReducersMapObject) {
        const entry = this.storeEntries.get(storeId);

        if (entry === undefined) {
            throw new Error(`Store with id "${storeId}" is not registered.`);
        }

        entry.storeUnsubscribe();
        this.storeEntries.delete(storeId);

        this.registerStoreWith(storeId, store, initialReducers, entry.listeners);

        for (const [, listener] of entry.listeners) {
            listener(store);
        }
    }

    public getStore(storeId: string): Store<{}> | undefined {
        const entry = this.storeEntries.get(storeId);

        return entry === undefined ? undefined : entry.store;
    }

    public subscribe(storeId: string, listener: Listener) {
        const entry = this.storeEntries.get(storeId);

        if (entry === undefined) {
            throw new Error(`Store with id "${storeId}" is not registered.`);
        }

        const key = entry.listeners.size + 1;
        entry.listeners.set(key, listener);

        return () => {
            if (!entry.listeners.has(key)) {
                return;
            }
            entry.listeners.delete(key);
        };
    }

    public registerState<TState>(storeId: string, stateAccess: StateAccess<TState>) {
        const entry = this.storeEntries.get(storeId);

        if (entry === undefined) {
            throw new Error(`Store with id "${storeId}" is not registered.`);
        }

        entry.reducerRegistry.registerReducer(stateAccess.reducer);
        entry.publisherRegistry.registerPublisher(stateAccess.publisher);
    }

    private registerStoreWith<TState>(storeId: string, store: Store<TState>, initialReducers: ReducersMapObject, listeners: Map<number, Listener>) {
        const reducerRegistry = new ReducerRegistry(
            (newReducers) => store.replaceReducer(combineReducers(newReducers)),
            initialReducers
        );
        const publisherRegistry = new PublisherRegistry();
        const storeUnsubscribe = store.subscribe(() => {
            publisherRegistry.publish(store.getState());
        });

        this.storeEntries.set(storeId, {
            store,
            listeners,
            storeUnsubscribe,
            reducerRegistry,
            publisherRegistry
        });
    }
}

const coreRegistry = new CoreRegistry();

export default coreRegistry;