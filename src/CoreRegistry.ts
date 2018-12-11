import { Store, ReducersMapObject, combineReducers, Unsubscribe } from "redux";
import { Subject } from "rxjs";
import ReducerRegistry from "./ReducerRegistry";
import StateConnector from "./StateConnector";
export type Listener = (store: Store) => void;
export type Unsubscribe = () => void;

interface Entry {
    store: Store;
    listeners: Map<number, Listener>;
    storeUnsubscribe: Unsubscribe;
    state$: Subject<{}>;
    reducerRegistry: ReducerRegistry;
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
        entry.state$.complete();
        entry.state$.unsubscribe();
        this.storeEntries.delete(storeId);

        this.registerStoreWith(storeId, store, initialReducers, entry.listeners);

        for (const [, listener] of entry.listeners) {
            listener(store);
        }
    }

    public getStore(storeId: string): Store {
        const entry = this.storeEntries.get(storeId);

        if (entry === undefined) {
            throw new Error(`Store with id "${storeId}" is not registered.`);
        }

        return entry.store;
    }

    public subscribe(storeId: string, listener: Listener): Unsubscribe {
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

    public registerState(storeId: string, stateConnector: StateConnector) {
        const entry = this.storeEntries.get(storeId);

        if (entry === undefined) {
            throw new Error(`Store with id "${storeId}" is not registered.`);
        }

        stateConnector.setState$(entry.state$.asObservable());
        stateConnector.setDispatch(entry.store.dispatch);
        entry.reducerRegistry.registerReducer(stateConnector.stateReducer);
    }

    private registerStoreWith<TState>(storeId: string, store: Store<TState>, initialReducers: ReducersMapObject, listeners: Map<number, Listener>) {
        const reducerRegistry = new ReducerRegistry(
            (newReducers) => store.replaceReducer(combineReducers(newReducers)),
            initialReducers
        );

        const state$ = new Subject<TState>();
        const storeUnsubscribe = store.subscribe(() => {
            if (state$.closed) {
                return;
            }

            state$.next(store.getState());
        });

        this.storeEntries.set(storeId, {
            store,
            listeners,
            storeUnsubscribe,
            state$,
            reducerRegistry
        });
    }
}

const coreRegistry = new CoreRegistry();

export default coreRegistry;