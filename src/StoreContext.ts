import { Store, combineReducers, ReducersMapObject, Unsubscribe } from "redux";
import { Observable } from "rxjs";
import { filter, map, takeUntil, scan } from "rxjs/operators";
import { Hub, createHub, StateReportNotification, StateReportType } from "./Hub";
import { Destructible } from "./Destructible";
import updateReducers from "./UpdateReducers";

export interface StoreContext<TStore> extends Destructible {
  store: Store<TStore>;
  hub: Hub;
}

export const storeContextId = "store";

interface StateReport {
  reducers: ReducersMapObject;
  isChanged: boolean;
}

export function createStoreContext<TStore>(
  store: Store<TStore>,
  initialReducers: ReducersMapObject,
  contextId: string = storeContextId
): StoreContext<TStore> {
  const { object: hub, destroy: destroyHub } = createHub();
  const setupFuntions = getScopedSetupFunctions(store, initialReducers, hub);

  const storeUnsubscribe = setupFuntions.subscribeToStore(contextId);
  const destroy = setupFuntions.createDestroy(contextId, storeUnsubscribe, destroyHub);
  const isDestroyed$ = setupFuntions.createIsDestroyed$(contextId);
  const stateReport$ = setupFuntions.createStateReport$(contextId);

  setupFuntions.setupActionDispatching(contextId, isDestroyed$);
  setupFuntions.setupReducerReplacing(contextId, stateReport$, isDestroyed$);

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
        this.publishState(contextId);
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

    createStateReport$(contextId: string) {
      return stateReportPublisher.notification$.pipe(
        filter((notification) => notification.parentContextId === contextId),
        scan<StateReportNotification, StateReport>(
          (stateReport, notification) => {
            if (notification.type === StateReportType.Registration && notification.reducer === undefined) {
              return {
                ...stateReport,
                isChanged: false
              };
            }

            const reducers = updateReducers(stateReport.reducers, notification);

            return {
              reducers,
              isChanged: true
            };
          },
          {
            reducers: initialReducers,
            isChanged: true
          }
        )
      );
    },

    setupActionDispatching(contextId: string, isDestroyed$: Observable<boolean>) {
      dispatchingActionPublisher.notification$
        .pipe(
          filter((notification) => notification.parentContextId === contextId),
          takeUntil(isDestroyed$)
        )
        .subscribe(({ action }) => {
          store.dispatch(action);
        });
    },

    setupReducerReplacing(contextId: string, stateReport$: Observable<StateReport>, isDestroyed$: Observable<boolean>) {
      stateReport$.pipe(takeUntil(isDestroyed$)).subscribe((stateReport) => {
        if (!stateReport.isChanged) {
          this.publishState(contextId);
          return;
        }

        store.replaceReducer(combineReducers(stateReport.reducers));
      });
    },

    publishState(contextId: string) {
      statePublisher.publish({
        contextId,
        state: store.getState()
      });
    }
  };
}
