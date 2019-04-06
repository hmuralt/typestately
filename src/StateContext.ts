import { Reducer, combineReducers, Action, ReducersMapObject } from "redux";
import { Observable, combineLatest, BehaviorSubject } from "rxjs";
import { filter, map, distinctUntilChanged, takeUntil, startWith, scan } from "rxjs/operators";
import * as shallowEqual from "shallowequal";
import { withRoute } from "./RouteAction";
import RoutingOption from "./RoutingOption";
import { withDefaultStateToReduxReducer, withRouteReducer } from "./ReducerHelpers";
import { Hub, StateReportType, StateReportNotification } from "./Hub";
import { Destructible } from "./Destructible";
import updateReducers from "./UpdateReducers";

export interface StateContext<TState, TActionType> extends Destructible {
  id: string;
  state: TState;
  state$: Observable<TState>;
  dispatch<TAction extends Action<TActionType>>(action: TAction, isRoutedToThisContext?: boolean): void;
}

export interface StateBuildingBlock<TState, TActionType> {
  key: string;
  stateKey: string;
  defaultState: TState;
  reducer?: Reducer<Readonly<TState>, Action<TActionType>>;
  routingOptions?: Map<TActionType, RoutingOption>;
  parentContextId: string;
}

interface StateReport {
  reducers: ReducersMapObject;
  isSingleLevelStateOnly: boolean;
}

interface BaseObservables {
  stateReport$: Observable<StateReport>;
  contextState$: Observable<{}>;
  isSingleLevelStateOnly$: Observable<boolean>;
  isDestroyed$: Observable<boolean>;
}

export function createStateContext<TState, TActionType>(
  stateBuildingBlock: StateBuildingBlock<TState, TActionType>,
  hub: Hub
): StateContext<TState, TActionType> {
  const id = `${stateBuildingBlock.parentContextId}.${stateBuildingBlock.key}`;
  const setupFuntions = getScopedSetupFunctions(stateBuildingBlock, hub);

  const destroy = setupFuntions.createDestroy(id);
  const dispatch = setupFuntions.createDispatch(id);
  const baseObservables = setupFuntions.createBaseObservables(id);
  const stateSubject = setupFuntions.createStateSubject(baseObservables);

  setupFuntions.setupSelfDestructionOnParentsDestruction(destroy, baseObservables.isDestroyed$);
  setupFuntions.setupStateRegistrationPublishing(baseObservables);
  setupFuntions.setupStatePublishing(id, baseObservables);
  setupFuntions.setupActionDispatching(id, baseObservables.isDestroyed$);
  setupFuntions.publishStateRegistration(id);

  return {
    id,
    get state() {
      return stateSubject.getValue();
    },
    state$: stateSubject.asObservable(),
    dispatch,
    destroy
  };
}

function getScopedSetupFunctions<TState, TActionType>(
  stateBuildingBlock: StateBuildingBlock<TState, TActionType>,
  hub: Hub
) {
  const { key, defaultState, stateKey, parentContextId, reducer, routingOptions } = stateBuildingBlock;
  const { dispatchingActionPublisher, destructionPublisher, stateReportPublisher, statePublisher } = hub;

  return {
    createDestroy(contextId: string) {
      return () => {
        stateReportPublisher.publish({
          type: StateReportType.Deregistration,
          parentContextId: parentContextId,
          key
        });

        destructionPublisher.publish({
          contextId
        });
      };
    },

    createIsDestroyed$(contextId: string) {
      return destructionPublisher.notification$.pipe(
        filter((notification) => notification.contextId === contextId),
        map(() => true)
      );
    },

    createDispatch(contextId: string) {
      return (action: Action<TActionType>, isRoutedToThisContext = false) => {
        const actionToDispatch = isRoutedToThisContext ? withRoute(contextId, action) : action;

        dispatchingActionPublisher.publish({
          parentContextId: parentContextId,
          action: actionToDispatch
        });
      };
    },

    createBaseObservables(contextId: string): BaseObservables {
      const stateReport$ = this.createStateReport$(contextId);
      const contextState$ = this.createContextState$();
      const isSingleLevelStateOnly$ = this.createIsSingleLevelStateOnly$(stateReport$);
      const isDestroyed$ = this.createIsDestroyed$(contextId);

      return {
        stateReport$,
        contextState$,
        isSingleLevelStateOnly$,
        isDestroyed$
      };
    },

    createStateReport$(contextId: string) {
      return stateReportPublisher.notification$.pipe(
        filter((notification) => notification.parentContextId === contextId),
        scan<StateReportNotification, StateReport>(
          (stateReport, notification) => {
            const reducers = updateReducers(stateReport.reducers, notification);
            const keys = Object.keys(reducers);
            const isSingleLevelStateOnly = keys.length === 0 || (keys.length === 1 && keys[0] === stateKey);

            return {
              reducers,
              isSingleLevelStateOnly
            };
          },
          {
            reducers: {},
            isSingleLevelStateOnly: true
          }
        )
      );
    },

    createIsSingleLevelStateOnly$(StateReport$: Observable<StateReport>) {
      return StateReport$.pipe(
        map(({ isSingleLevelStateOnly }) => isSingleLevelStateOnly),
        startWith(true),
        distinctUntilChanged()
      );
    },

    createContextState$() {
      return statePublisher.notification$.pipe(
        filter((notification) => notification.contextId === parentContextId),
        map((notification) => notification.state[key] as {})
      );
    },

    setupSelfDestructionOnParentsDestruction(destroy: () => void, isDestroyed$: Observable<boolean>) {
      destructionPublisher.notification$
        .pipe(
          filter((notification) => notification.contextId === parentContextId),
          takeUntil(isDestroyed$)
        )
        .subscribe(() => {
          destroy();
        });
    },

    setupStateRegistrationPublishing(baseObservables: BaseObservables) {
      baseObservables.stateReport$
        .pipe(takeUntil(baseObservables.isDestroyed$))
        .subscribe(({ reducers, isSingleLevelStateOnly }) => {
          let stateContextReducer;

          if (Object.keys(reducers).length > 0) {
            stateContextReducer = isSingleLevelStateOnly ? reducers[stateKey] : combineReducers(reducers);
          }

          stateReportPublisher.publish({
            type: StateReportType.Registration,
            parentContextId: parentContextId,
            key,
            reducer: stateContextReducer
          });
        });
    },

    setupStatePublishing(contextId: string, baseObservables: BaseObservables) {
      combineLatest(baseObservables.contextState$, baseObservables.isSingleLevelStateOnly$)
        .pipe(takeUntil(baseObservables.isDestroyed$))
        .subscribe(([state, isSingleLevelStateOnly]) => {
          if (isSingleLevelStateOnly) {
            return;
          }

          statePublisher.publish({
            contextId,
            state
          });
        });
    },

    createStateSubject(baseObservables: BaseObservables) {
      const stateSubject = new BehaviorSubject(defaultState);

      combineLatest(baseObservables.contextState$, baseObservables.isSingleLevelStateOnly$)
        .pipe(
          map(([contextState, isSingleLevelStateOnly]) => {
            return isSingleLevelStateOnly ? contextState : contextState[stateKey];
          }),
          distinctUntilChanged(shallowEqual),
          takeUntil(baseObservables.isDestroyed$)
        )
        .subscribe(stateSubject);
      return stateSubject;
    },

    setupActionDispatching(contextId: string, isDestroyed$: Observable<boolean>) {
      dispatchingActionPublisher.notification$
        .pipe(
          filter((notification) => notification.parentContextId === contextId),
          takeUntil(isDestroyed$)
        )
        .subscribe(({ action }) => {
          dispatchingActionPublisher.publish({
            parentContextId: parentContextId,
            action
          });
        });
    },

    publishStateRegistration(contextId: string) {
      let finalReducer;

      if (reducer !== undefined) {
        const defaultStateReducer = withDefaultStateToReduxReducer(defaultState, reducer);
        finalReducer =
          routingOptions !== undefined
            ? withRouteReducer(contextId, defaultStateReducer, routingOptions)
            : defaultStateReducer;
      }

      stateReportPublisher.publish({
        type: StateReportType.Registration,
        parentContextId: contextId,
        key: stateKey,
        reducer: finalReducer
      });
    }
  };
}
