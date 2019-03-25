import { Store, combineReducers, ReducersMapObject, Unsubscribe } from "redux";
import { merge, Observable } from "rxjs";
import { filter, map, takeUntil } from "rxjs/operators";
import createReducerNotificationScan from "./ReducerNotificationScan";
import { Hub, createHub } from "./Hub";
import { Destructible } from "./Destructible";

export interface StoreContext<TStore> extends Destructible {
  store: Store<TStore>;
  hub: Hub;
}

export const storeId = "store";

export function createStoreContext<TStore>(
  store: Store<TStore>,
  initialReducers: ReducersMapObject
): StoreContext<TStore> {
  const { object: hub, destroy: destroyHub } = createHub();
  const setupFuntions = getScopedSetupFunctions(store, initialReducers, hub);

  const storeUnsubscribe = setupFuntions.subscribeToStore(storeId);
  const destroy = setupFuntions.createDestroy(storeId, storeUnsubscribe, destroyHub);
  const isDestroyed$ = setupFuntions.createIsDestroyed$(storeId);

  setupFuntions.setupActionDispatching(storeId, isDestroyed$);
  setupFuntions.setupReducerReplacing(storeId, isDestroyed$);

  return {
    store,
    hub,
    destroy
  };
}

function getScopedSetupFunctions<TStore>(store: Store<TStore>, initialReducers: ReducersMapObject, hub: Hub) {
  const {
    dispatchingActionPublisher,
    destructionPublisher,
    reducerRegistrationPublisher,
    reducerDeregistrationPublisher,
    statePublisher
  } = hub;

  return {
    subscribeToStore(contextId: string) {
      return store.subscribe(() => {
        statePublisher.publish({
          contextId,
          state: store.getState()
        });
      });
    },

    createDestroy(contextId: string, storeUnsubscribe: Unsubscribe, destroyHub: () => void) {
      return () => {
        storeUnsubscribe();

        destructionPublisher.publish({
          contextId
        });

        destroyHub();
      };
    },

    createIsDestroyed$(contextId: string) {
      return destructionPublisher.notification$
        .pipe(filter((notification) => notification.contextId === contextId))
        .pipe(map(() => true));
    },

    setupActionDispatching(contextId: string, isDestroyed$: Observable<boolean>) {
      dispatchingActionPublisher.notification$
        .pipe(filter((notification) => notification.parentContextId === contextId))
        .pipe(takeUntil(isDestroyed$))
        .subscribe(({ action }) => {
          store.dispatch(action);
        });
    },

    setupReducerReplacing(contextId: string, isDestroyed$: Observable<boolean>) {
      merge(reducerRegistrationPublisher.notification$, reducerDeregistrationPublisher.notification$)
        .pipe(filter((notification) => notification.parentContextId === contextId))
        .pipe(createReducerNotificationScan(initialReducers))
        .pipe(takeUntil(isDestroyed$))
        .subscribe((reducers) => {
          store.replaceReducer(combineReducers(reducers));
        });
    }
  };
}
