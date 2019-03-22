import { Store, combineReducers, ReducersMapObject, Unsubscribe } from "redux";
import { merge, Observable } from "rxjs";
import { filter, map, takeUntil } from "rxjs/operators";
import generateUUID from "./GenerateUUID";
import {
  reducerRegistrationPublisher,
  reducerDeregistrationPublisher,
  dispatchedActionPublisher,
  statePublisher,
  destructionPublisher
} from "./Hub";
import createReducerNotificationScan from "./ReducerNotificationScan";

export interface StoreContext {
  id: string;
  destroy(): void;
}

export function createStoreContext<TStore>(store: Store<TStore>, initialReducers: ReducersMapObject): StoreContext {
  const id = `store_${generateUUID()}`;
  const storeUnsubscribe = subscribeToStore<TStore>(id, store);
  const destroy = createDestroy(id, storeUnsubscribe);
  const isDestroyed$ = createIsDestroyed$(id);

  setupActionDispatching(id, store, isDestroyed$);
  setupReducerReplacing(id, store, isDestroyed$, initialReducers);

  return {
    id,
    destroy
  };
}

function subscribeToStore<TStore>(contextId: string, store: Store<TStore>) {
  return store.subscribe(() => {
    statePublisher.publish({
      contextId,
      state: store.getState()
    });
  });
}

function createDestroy(contextId: string, storeUnsubscribe: Unsubscribe) {
  return () => {
    storeUnsubscribe();

    destructionPublisher.publish({
      contextId
    });
  };
}

function createIsDestroyed$(contextId: string) {
  return destructionPublisher.notification$
    .pipe(filter((notification) => notification.contextId === contextId))
    .pipe(map(() => true));
}

function setupActionDispatching<TStore>(contextId: string, store: Store<TStore>, isDestroyed$: Observable<boolean>) {
  dispatchedActionPublisher.notification$
    .pipe(filter((notification) => notification.parentcontextId === contextId))
    .pipe(takeUntil(isDestroyed$))
    .subscribe(({ action }) => {
      store.dispatch(action);
    });
}

function setupReducerReplacing<TStore>(
  contextId: string,
  store: Store<TStore>,
  isDestroyed$: Observable<boolean>,
  initialReducers: ReducersMapObject
) {
  merge(reducerRegistrationPublisher.notification$, reducerDeregistrationPublisher.notification$)
    .pipe(filter((notification) => notification.parentcontextId === contextId))
    .pipe(createReducerNotificationScan(initialReducers))
    .pipe(takeUntil(isDestroyed$))
    .subscribe((reducers) => {
      store.replaceReducer(combineReducers(reducers));
    });
}
