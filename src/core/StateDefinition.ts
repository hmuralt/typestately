import { BehaviorSubject } from "rxjs";
import { DefaultStateReducerWithOptionalRoutingOptions, withDefaultStateToReduxReducer } from "./ReducerHelpers";
import RoutingOption from "./RoutingOption";
import { storeContextId } from "./StoreContext";
import { Hub } from "./Hub";
import { Action } from "redux";
import { createStateContext } from "./StateContext";
import StateProvider from "./StateProvider";
import { Destructible } from "./Destructible";

/* eslint-disable @typescript-eslint/no-explicit-any */

type ParametersWithoutFirst<T extends (first: any, ...args: any[]) => any> = T extends (
  first: any,
  ...args: infer P
) => any
  ? P
  : never;

interface StateHandlerBuildingBlock<
  TState,
  TStateOperations extends StateOperations<TState>,
  TActionType,
  TActionDispatchers extends ActionDispatchers<TActionType>,
  TReducerActionType
> {
  defaultState: TState;
  stateOperations: TStateOperations;
  key: string;
  stateKey: string;
  actionDispatchers: TActionDispatchers;
  reducerBuilder?: ReducerBuilder<TState, TStateOperations, TReducerActionType>;
  routingOptions?: Map<TReducerActionType, RoutingOption>;
}

type StateHandlerCreator<TState, TActionType, TActionDispatchers extends ActionDispatchers<TActionType>> = (
  hub: Hub,
  parentContextId?: string
) => PlainStateHandler<TState, TActionType, TActionDispatchers>;

export type PlainStateHandler<
  TState,
  TActionType,
  TActionDispatchers extends ActionDispatchers<TActionType>
> = StateProvider<TState> &
  Destructible &
  HigherActionOperations<TActionType, TActionDispatchers> & {
    contextId: string;
    dispatch<TAction extends Action<TActionType>>(action: TAction, isRoutedToThisContext?: boolean): void;
  };

export interface StateOperations<TState> {
  [operationKey: string]: (state: TState, ...args: any[]) => TState;
}

export type HigherStateOperations<TState, TStateOperations extends StateOperations<TState>> = {
  [OperationKey in keyof TStateOperations]: (...args: ParametersWithoutFirst<TStateOperations[OperationKey]>) => void;
};

export interface ActionDispatchers<TActionType> {
  [OperationKey: string]: (dispatch: Dispatch<TActionType>, ...args: any[]) => any;
}

export type HigherActionOperations<TActionType, TActionDispatchers extends ActionDispatchers<TActionType>> = {
  [ActionKey in keyof TActionDispatchers]: (
    ...args: ParametersWithoutFirst<TActionDispatchers[ActionKey]>
  ) => ReturnType<TActionDispatchers[ActionKey]>;
};

export type Dispatch<TActionType> = <TAction extends Action<TActionType>>(
  action: TAction,
  isRoutedToThisContext?: boolean
) => void;

export type ReducerBuilder<TState, TStateOperations extends StateOperations<TState>, TActionType> = (
  stateOperations: TStateOperations
) => DefaultStateReducerWithOptionalRoutingOptions<TState, TActionType>;

export const defaultStateKey = "state";

function getHigherStateOperations<TState, TStateOperations extends StateOperations<TState>>(
  stateOperations: TStateOperations,
  stateSubject: BehaviorSubject<TState>
) {
  const toHigherStateOperationEnhancer = toHigherStateOperation(stateSubject);
  const higherStateOperations = Object.keys(stateOperations).reduce((currentHigherStateOperations, operationKey) => {
    return {
      ...currentHigherStateOperations,
      [operationKey]: toHigherStateOperationEnhancer(stateOperations[operationKey])
    };
  }, {} as HigherStateOperations<TState, TStateOperations>);

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

function getHigherActionOperations<TActionType, TActionDispatchers extends ActionDispatchers<TActionType>>(
  actionDispatchers: TActionDispatchers,
  dispatch: Dispatch<TActionType>
) {
  const toHigherActionOperationEnhancer = toHigherActionOperation<TActionType>(dispatch);
  const higherActionOperations = Object.keys(actionDispatchers).reduce((currentHigherActionOperations, actionKey) => {
    return {
      ...currentHigherActionOperations,
      [actionKey]: toHigherActionOperationEnhancer(actionDispatchers[actionKey])
    };
  }, {} as HigherActionOperations<TActionType, TActionDispatchers>);

  return higherActionOperations;
}

function toHigherActionOperation<TActionType>(dispatch: Dispatch<TActionType>) {
  return <TArgs extends any[], TReturnType>(
    actionDispatcher: (dispatch: Dispatch<TActionType>, ...args: TArgs) => TReturnType
  ) => {
    const higherActionOperation = (...args: TArgs) => {
      return actionDispatcher(dispatch, ...args);
    };

    return higherActionOperation;
  };
}

export function defineState<TState, TStateOperations extends StateOperations<TState>>(
  defaultState: TState,
  stateOperations: TStateOperations = {} as any
) {
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
    makeStorableUsingKey(key: string, stateKey: string = defaultStateKey) {
      return createStoreStateDefinition({
        defaultState,
        stateOperations,
        key,
        stateKey,
        actionDispatchers: {}
      });
    }
  };
}

function createStoreStateDefinition<
  TState,
  TStateOperations extends StateOperations<TState>,
  TActionType,
  TActionDispatchers extends ActionDispatchers<TActionType>,
  TReducerActionType
>(
  stateHandlerBuildingBlock: StateHandlerBuildingBlock<
    TState,
    TStateOperations,
    TActionType,
    TActionDispatchers,
    TReducerActionType
  >
) {
  const createStateHandler = getStateHandlerCreator<
    TState,
    TStateOperations,
    TActionType,
    TActionDispatchers,
    TReducerActionType
  >(stateHandlerBuildingBlock);

  return {
    createStateHandler,
    setActionDispatchers<TActionType, TActionDispatchers extends ActionDispatchers<TActionType>>(
      actionDispatchers: TActionDispatchers
    ) {
      return createStoreStateDefinition<TState, TStateOperations, TActionType, TActionDispatchers, TReducerActionType>({
        ...stateHandlerBuildingBlock,
        actionDispatchers
      });
    },
    setReducer<TReducerActionType>(
      reducerBuilder?: ReducerBuilder<TState, TStateOperations, TReducerActionType>,
      routingOptions?: Map<TReducerActionType, RoutingOption>
    ) {
      return createStoreStateDefinition<TState, TStateOperations, TActionType, TActionDispatchers, TReducerActionType>({
        ...stateHandlerBuildingBlock,
        reducerBuilder,
        routingOptions
      });
    }
  };
}

function getStateHandlerCreator<
  TState,
  TStateOperations extends StateOperations<TState>,
  TActionType,
  TActionDispatchers extends ActionDispatchers<TActionType>,
  TReducerActionType
>(
  stateHandlerBuildingBlock: StateHandlerBuildingBlock<
    TState,
    TStateOperations,
    TActionType,
    TActionDispatchers,
    TReducerActionType
  >
): StateHandlerCreator<TState, TActionType, TActionDispatchers> {
  return (hub: Hub, parentContextId: string = storeContextId) => {
    const {
      defaultState,
      stateOperations,
      key,
      stateKey,
      actionDispatchers,
      reducerBuilder,
      routingOptions
    } = stateHandlerBuildingBlock;

    const reducer = reducerBuilder !== undefined ? reducerBuilder(stateOperations) : undefined;
    const defaultStateReducer =
      reducer !== undefined
        ? withDefaultStateToReduxReducer<TState, TReducerActionType>(defaultState, reducer)
        : undefined;
    const defaultRoutingOptions =
      routingOptions || (reducer && reducer.routingOptions) || new Map<TReducerActionType, RoutingOption>();

    const stateContext = createStateContext<TState, TActionType, TReducerActionType>(
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

    const operations = getHigherActionOperations<TActionType, TActionDispatchers>(
      actionDispatchers,
      stateContext.dispatch
    );

    return Object.assign(stateContext, { contextId: stateContext.id }, operations);
  };
}
