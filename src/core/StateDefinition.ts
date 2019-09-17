import { BehaviorSubject } from "rxjs";
import { Action } from "redux";
import RoutingOption from "./RoutingOption";
import { Hub } from "./Hub";
import DefaultStateReducer from "./DefaultStateReducer";
import { withDefaultStateToReduxReducer } from "./ReducerHelpers";
import { createStateContext, StateContext } from "./StateContext";
import { storeContextId } from "./StoreContext";
import StateProvider from "./StateProvider";

// tslint:disable: no-any

export interface StateDefinition<TState, TStateOperations extends StateOperations<TState>> {
  createStandaloneStateHandler(): StateProvider<TState> & HigherStateOperations<TState, TStateOperations>;
  setStoreKey(key: string, stateKey?: string): StateDefinitionWithStateKeys<TState, TStateOperations>;
}

export interface StateDefinitionWithStateKeys<TState, TStateOperations extends StateOperations<TState>> {
  setActions<TActionType>(
    actionDispatchers: ActionDispatchers<TState, TStateOperations, TActionType>
  ): StateDefinitionWithActions<TState, TStateOperations, TActionType>;
}

export interface StateDefinitionWithActions<TState, TStateOperations extends StateOperations<TState>, TActionType> {
  setReducer(
    reducerBuilder?: ReducerBuilder<TState, TStateOperations, TActionType>,
    routingOptions?: Map<TActionType, RoutingOption>
  ): StoreStateDefinition<TState, TStateOperations, TActionType>;
}

export interface StoreStateDefinition<TState, TStateOperations extends StateOperations<TState>, TActionType> {
  createStateHandler(
    hub: Hub,
    parentContextId?: string
  ): StateContext<TState, TActionType> & HigherActionOperations<TState, TStateOperations, TActionType>;
}

export interface StateOperations<TState> {
  [operationKey: string]: (state: TState, ...args: any[]) => TState;
}

export interface DefaultStateReducerWithOptionalRoutingOptions<TState, TActionType>
  extends DefaultStateReducer<TState, Action<TActionType>> {
  routingOptions?: Map<TActionType, RoutingOption>;
}

export type ActionDispatchers<TState, TStateOperations extends StateOperations<TState>, TActionType> = {
  [OperationKey in keyof TStateOperations]: (
    dispatch: Dispatch<TActionType>,
    ...args: ParametersWithoutState<TState, TStateOperations[OperationKey]>
  ) => void;
} & {
  [OperationKey: string]: (dispatch: Dispatch<TActionType>, ...args: any[]) => void;
};

export type Dispatch<TActionType> = <TAction extends Action<TActionType>>(
  action: TAction,
  isRoutedToThisContext?: boolean
) => void;

export type ReducerBuilder<TState, TStateOperations extends StateOperations<TState>, TActionType> = (
  stateOperations: TStateOperations
) => DefaultStateReducerWithOptionalRoutingOptions<TState, TActionType>;

export type HigherStateOperations<TState, TStateOperations extends StateOperations<TState>> = {
  [OperationKey in keyof TStateOperations]: (
    ...args: ParametersWithoutState<TState, TStateOperations[OperationKey]>
  ) => void;
};

export type ParametersWithoutState<TState, T extends (state: TState, ...args: any[]) => any> = T extends (
  state: TState,
  ...args: infer P
) => any
  ? P
  : never;

export type HigherActionOperations<TState, TStateOperations extends StateOperations<TState>, TActionType> = {
  [ActionKey in keyof ActionDispatchers<TState, TStateOperations, TActionType>]: (
    ...args: ParametersWithoutDispatch<TActionType, ActionDispatchers<TState, TStateOperations, TActionType>[ActionKey]>
  ) => void;
};

type ParametersWithoutDispatch<
  TActionType,
  T extends (dispatch: Dispatch<TActionType>, ...args: any[]) => any
> = T extends (dispatch: Dispatch<TActionType>, ...args: infer P) => any ? P : never;

export const defaultStateKey = "state";

export function createStateDefinition<TState, TStateOperations extends StateOperations<TState>>(
  defaultState: TState,
  stateOperations: TStateOperations
): StateDefinition<TState, TStateOperations> {
  return {
    createStandaloneStateHandler() {
      const stateSubject = new BehaviorSubject(defaultState);
      const operations = getHigherStateOperations(stateOperations, stateSubject);
      const standaloneStateContext = {
        get state() {
          return stateSubject.value;
        },
        state$: stateSubject.asObservable()
      };

      return Object.assign(standaloneStateContext, operations);
    },
    setStoreKey(key: string, stateKey: string = defaultStateKey) {
      return createStateDefinitionWithStateKeys<TState, TStateOperations>(defaultState, stateOperations, key, stateKey);
    }
  };
}

function getHigherStateOperations<TState, TStateOperations extends StateOperations<TState>>(
  stateOperations: TStateOperations,
  stateSubject: BehaviorSubject<TState>
) {
  const toHigherStateOperationEnhancer = toHigherStateOperation(stateSubject);
  const higherStateOperations = Object.keys(stateOperations).reduce(
    (currentHigherStateOperations, operationKey) => {
      return {
        ...currentHigherStateOperations,
        [operationKey]: toHigherStateOperationEnhancer(stateOperations[operationKey])
      };
    },
    {} as HigherStateOperations<TState, TStateOperations>
  );

  return higherStateOperations;
}

function toHigherStateOperation<TState>(stateSubject: BehaviorSubject<TState>) {
  return <TArgs extends any[]>(stateOperation: (state: TState, ...args: TArgs) => TState) => {
    const higherStateOperation = (...args: TArgs) => {
      const newState = stateOperation(stateSubject.value, ...args);
      stateSubject.next(newState);
    };

    return higherStateOperation;
  };
}

function createStateDefinitionWithStateKeys<TState, TStateOperations extends StateOperations<TState>>(
  defaultState: TState,
  stateOperations: TStateOperations,
  key: string,
  stateKey: string
): StateDefinitionWithStateKeys<TState, TStateOperations> {
  return {
    setActions<TActionType = any>(actionDispatchers: ActionDispatchers<TState, TStateOperations, TActionType>) {
      return createStateDefinitionWithActions<TState, TStateOperations, TActionType>(
        defaultState,
        stateOperations,
        key,
        stateKey,
        actionDispatchers
      );
    }
  };
}

function createStateDefinitionWithActions<TState, TStateOperations extends StateOperations<TState>, TActionType = any>(
  defaultState: TState,
  stateOperations: TStateOperations,
  key: string,
  stateKey: string,
  actionDispatchers: ActionDispatchers<TState, TStateOperations, TActionType>
): StateDefinitionWithActions<TState, TStateOperations, TActionType> {
  return {
    setReducer(
      reducerBuilder?: ReducerBuilder<TState, TStateOperations, TActionType>,
      routingOptions?: Map<TActionType, RoutingOption>
    ) {
      return createStateDefinitionWithReducer<TState, TStateOperations, TActionType>(
        defaultState,
        stateOperations,
        key,
        stateKey,
        actionDispatchers,
        reducerBuilder,
        routingOptions
      );
    }
  };
}

function createStateDefinitionWithReducer<TState, TStateOperations extends StateOperations<TState>, TActionType = any>(
  defaultState: TState,
  stateOperations: TStateOperations,
  key: string,
  stateKey: string,
  actionDispatchers: ActionDispatchers<TState, TStateOperations, TActionType>,
  reducerBuilder?: ReducerBuilder<TState, TStateOperations, TActionType>,
  routingOptions?: Map<TActionType, RoutingOption>
): StoreStateDefinition<TState, TStateOperations, TActionType> {
  return {
    createStateHandler(hub: Hub, parentContextId: string = storeContextId) {
      const reducer = reducerBuilder !== undefined ? reducerBuilder(stateOperations) : undefined;
      const defaultStateReducer =
        reducer !== undefined ? withDefaultStateToReduxReducer<TState, TActionType>(defaultState, reducer) : undefined;
      const defaultRoutingOptions =
        routingOptions || (reducer && reducer.routingOptions) || new Map<TActionType, RoutingOption>();

      const stateContext = createStateContext<TState, TActionType>(
        {
          key,
          stateKey,
          defaultState,
          reducer: defaultStateReducer,
          routingOptions: defaultRoutingOptions,
          parentContextId
        },
        hub
      );

      const operations = getHigherActionOperations<TState, TStateOperations, TActionType>(
        actionDispatchers,
        stateContext.dispatch
      );

      return Object.assign(stateContext, operations);
    }
  };
}

function getHigherActionOperations<TState, TStateOperations extends StateOperations<TState>, TActionType>(
  actionDispatchers: ActionDispatchers<TState, TStateOperations, TActionType>,
  dispatch: Dispatch<TActionType>
) {
  const toHigherActionOperationEnhancer = toHigherActionOperation<TActionType>(dispatch);
  const higherActionOperations = Object.keys(actionDispatchers).reduce(
    (currentHigherActionOperations, actionKey) => {
      return {
        ...currentHigherActionOperations,
        [actionKey]: toHigherActionOperationEnhancer(actionDispatchers[actionKey])
      };
    },
    {} as HigherActionOperations<TState, TStateOperations, TActionType>
  );

  return higherActionOperations;
}

function toHigherActionOperation<TActionType>(dispatch: Dispatch<TActionType>) {
  return <TArgs extends any[]>(actionDispatcher: (dispatch: Dispatch<TActionType>, ...args: TArgs) => void) => {
    const higherActionOperation = (...args: TArgs) => {
      actionDispatcher(dispatch, ...args);
    };

    return higherActionOperation;
  };
}
