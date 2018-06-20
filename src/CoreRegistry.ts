import { Store, ReducersMapObject, combineReducers, Unsubscribe } from "redux";
import ReducerRegistry from "./ReducerRegistry";
import PublisherRegistry from "./PublisherRegistry";
import StateAccess from "./StateAccess";

interface Entry {
    store: Store<{}>;
    storeUnsubscribe: Unsubscribe;
    reducerRegistry: ReducerRegistry;
    publisherRegistry: PublisherRegistry;
}

class CoreRegistry {
    private storeEntries = new Map<string, Entry>();

    public registerStore<TStore>(store: Store<TStore>, initialReducers: ReducersMapObject) {
        const storeId = `store_${this.storeEntries.size + 1}_${new Date().getTime()}`;

        const reducerRegistry = new ReducerRegistry(
            (newReducers) => store.replaceReducer(combineReducers(newReducers)),
            initialReducers
        );
        const publisherRegistry = new PublisherRegistry();
        const storeUnsubscribe = store.subscribe(() => {
            publisherRegistry.publish(store.getState());
        });

        this.storeEntries.set(storeId, {
            store: store,
            storeUnsubscribe,
            reducerRegistry,
            publisherRegistry
        });

        return storeId;
    }

    public removeStore(storeId: string) {
        const entry = this.storeEntries.get(storeId);

        if (entry === undefined) {
            return;
        }

        entry.storeUnsubscribe();

        this.storeEntries.delete(storeId);
    }

    public getStore(storeId: string): Store<{}> | undefined {
        const entry = this.storeEntries.get(storeId);

        return entry === undefined ? undefined : entry.store;
    }

    public registerState<TState>(storeId: string, stateAccess: StateAccess<TState>) {
        const entry = this.storeEntries.get(storeId);

        if (entry === undefined) {
            throw new Error(`Store with id "${storeId}" is not registered.`);
        }

        entry.reducerRegistry.registerReducer(stateAccess.reducer);
        entry.publisherRegistry.registerPublisher(stateAccess.publisher);
    }
}

const coreRegistry = new CoreRegistry();

export default coreRegistry;