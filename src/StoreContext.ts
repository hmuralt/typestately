import { Store, combineReducers, ReducersMapObject, Unsubscribe } from "redux";
import { Observable } from "rxjs";
import { filter, map, takeUntil } from "rxjs/operators";
import createReducerNotificationScan from "./ReducerNotificationScan";
import { Hub, createHub } from "./Hub";
import { Destructible } from "./Destructible";

export interface StoreContext<TStore> extends Destructible {
  store: Store<TStore>;
  hub: Hub;
}

export const storeContextId = "store";

export function createStoreContext<TStore>(
  store: Store<TStore>,
  initialReducers: ReducersMapObject
): StoreContext<TStore> {
  const { object: hub, destroy: destroyHub } = createHub();
  const setupFuntions = getScopedSetupFunctions(store, initialReducers, hub);

  const storeUnsubscribe = setupFuntions.subscribeToStore(storeContextId);
  const destroy = setupFuntions.createDestroy(storeContextId, storeUnsubscribe, destroyHub);
  const isDestroyed$ = setupFuntions.createIsDestroyed$(storeContextId);

  setupFuntions.setupActionDispatching(storeContextId, isDestroyed$);
  setupFuntions.setupReducerReplacing(storeContextId, isDestroyed$);

  return {
    store,
    hub,
    destroy
  };
}

function getScopedSetupFunctions<TStore>(store: Store<TStore>, initialReducers: ReducersMapObject, hub: Hub) {
  const { dispatchingActionPublisher, destructionPublisher, stateReportPublisher, statePublisher } = hub;

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
      stateReportPublisher.notification$
        .pipe(filter((notification) => notification.parentContextId === contextId))
        .pipe(createReducerNotificationScan(initialReducers))
        .pipe(takeUntil(isDestroyed$))
        .subscribe((reducers) => {
          store.replaceReducer(combineReducers(reducers));
        });
    }
  };
}
