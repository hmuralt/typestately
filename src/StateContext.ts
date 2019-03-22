import { Reducer, combineReducers, Action, ReducersMapObject } from "redux";
import { Observable, merge, combineLatest, BehaviorSubject } from "rxjs";
import { filter, map, distinctUntilChanged, takeUntil, startWith } from "rxjs/operators";
import * as shallowEqual from "shallowequal";
import createReducerNotificationScan from "./ReducerNotificationScan";
import {
  reducerRegistrationPublisher,
  reducerDeregistrationPublisher,
  dispatchedActionPublisher,
  statePublisher,
  destructionPublisher
} from "./Hub";
import { withRoute } from "./RouteAction";
import RoutingOption from "./RoutingOption";
import { withDefaultStateReducer, withRouteReducer } from "./ReducerHelpers";

export interface StateContext<TState, TActionType> {
  id: string;
  state: TState;
  state$: Observable<TState>;
  dispatch<TAction extends Action<TActionType>>(action: TAction, isRoutedToThisContext?: boolean): void;
  destroy(): void;
}

export interface StateBuildingBlock<TState, TActionType> {
  key: string;
  stateKey: string;
  defaultState: TState;
  reducer?: Reducer<Readonly<TState>, Action<TActionType>>;
  routingOptions?: Map<TActionType, RoutingOption>;
  parentcontextId: string;
}

interface ReducersData {
  reducers: ReducersMapObject;
  isSingleLevelStateOnly: boolean;
}

interface BaseObservables {
  reducers$: Observable<ReducersData>;
  contextState$: Observable<{}>;
  isSingleLevelStateOnly$: Observable<boolean>;
  isDestroyed$: Observable<boolean>;
}

export function createStateContext<TState, TActionType>(
  stateBuildingBlock: StateBuildingBlock<TState, TActionType>
): StateContext<TState, TActionType> {
  const { key, defaultState, stateKey, parentcontextId } = stateBuildingBlock;
  const id = `${parentcontextId}.${key}`;
  const destroy = createDestroy(id, parentcontextId, key);
  const dispatch = createDispatch(id, parentcontextId);
  const baseObservables = createBaseObservables(id, parentcontextId, key, stateKey);
  const stateSubject = createStateSubject(defaultState, stateKey, baseObservables);

  setupSelfDestructionOnParentsDestruction(parentcontextId, destroy, baseObservables.isDestroyed$);
  setupStateReducerRegistrationPublishing(parentcontextId, key, stateKey, baseObservables);
  setupStatePublishing(id, baseObservables);
  setupActionDispatching(id, parentcontextId, baseObservables.isDestroyed$);
  publishOwnReducer(id, stateBuildingBlock);

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

function createDestroy(contextId: string, parentcontextId: string, key: string) {
  return () => {
    reducerDeregistrationPublisher.publish({
      parentcontextId,
      key
    });

    destructionPublisher.publish({
      contextId
    });
  };
}

function createIsDestroyed$(contextId: string) {
  return destructionPublisher.notification$.pipe(
    filter((notification) => notification.contextId === contextId),
    map(() => true)
  );
}

function createDispatch<TActionType>(contextId: string, parentcontextId: string) {
  return (action: Action<TActionType>, isRoutedToThisContext = false) => {
    const actionToDispatch = isRoutedToThisContext ? withRoute(contextId, action) : action;

    dispatchedActionPublisher.publish({
      parentcontextId,
      action: actionToDispatch
    });
  };
}

function createBaseObservables(
  contextId: string,
  parentcontextId: string,
  key: string,
  stateKey: string
): BaseObservables {
  const reducers$ = createReducers$(contextId, stateKey);
  const contextState$ = createContext$(parentcontextId, key);
  const isSingleLevelStateOnly$ = createIsSingleLevelStateOnly$(reducers$);
  const isDestroyed$ = createIsDestroyed$(contextId);

  return {
    reducers$,
    contextState$,
    isSingleLevelStateOnly$,
    isDestroyed$
  };
}

function createReducers$(contextId: string, stateKey: string) {
  return merge(reducerRegistrationPublisher.notification$, reducerDeregistrationPublisher.notification$).pipe(
    filter((notification) => notification.parentcontextId === contextId),
    createReducerNotificationScan(),
    map((reducers) => {
      const keys = Object.getOwnPropertyNames(reducers);
      const isSingleLevelStateOnly = keys.length === 1 && keys[0] === stateKey;
      return {
        reducers,
        isSingleLevelStateOnly
      } as ReducersData;
    })
  );
}

function createIsSingleLevelStateOnly$(reducers$: Observable<ReducersData>) {
  return reducers$.pipe(
    map(({ isSingleLevelStateOnly }) => isSingleLevelStateOnly),
    startWith(true),
    distinctUntilChanged()
  );
}

function createContext$(parentcontextId: string, key: string) {
  return statePublisher.notification$.pipe(
    filter((notification) => notification.contextId === parentcontextId),
    map((notification) => notification.state[key] as {})
  );
}
function setupSelfDestructionOnParentsDestruction(
  parentcontextId: string,
  destroy: () => void,
  isDestroyed$: Observable<boolean>
) {
  destructionPublisher.notification$
    .pipe(
      filter((notification) => notification.contextId === parentcontextId),
      takeUntil(isDestroyed$)
    )
    .subscribe(() => {
      destroy();
    });
}

function setupStateReducerRegistrationPublishing(
  parentcontextId: string,
  key: string,
  stateKey: string,
  baseObservables: BaseObservables
) {
  baseObservables.reducers$
    .pipe(takeUntil(baseObservables.isDestroyed$))
    .subscribe(({ reducers, isSingleLevelStateOnly }) => {
      const stateContextReducer = isSingleLevelStateOnly ? reducers[stateKey] : combineReducers(reducers);

      reducerRegistrationPublisher.publish({
        parentcontextId,
        key,
        reducer: stateContextReducer
      });
    });
}

function setupStatePublishing(contextId: string, baseObservables: BaseObservables) {
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
}

function createStateSubject<TState>(defaultState: TState, stateKey: string, baseObservables: BaseObservables) {
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
}

function setupActionDispatching(contextId: string, parentcontextId: string, isDestroyed$: Observable<boolean>) {
  dispatchedActionPublisher.notification$
    .pipe(
      filter((notification) => notification.parentcontextId === contextId),
      takeUntil(isDestroyed$)
    )
    .subscribe(({ action }) => {
      dispatchedActionPublisher.publish({
        parentcontextId,
        action
      });
    });
}

function publishOwnReducer<TState, TActionType>(
  contextId: string,
  reducerBuildingBlock: StateBuildingBlock<TState, TActionType>
) {
  if (reducerBuildingBlock.reducer === undefined) {
    return;
  }

  const { defaultState, reducer, routingOptions, stateKey } = reducerBuildingBlock;

  const defaultStateReducer = withDefaultStateReducer(defaultState, reducer);
  const routeReducer =
    routingOptions !== undefined
      ? withRouteReducer(contextId, defaultStateReducer, routingOptions)
      : defaultStateReducer;

  reducerRegistrationPublisher.publish({
    parentcontextId: contextId,
    key: stateKey,
    reducer: routeReducer
  });
}
