import { BehaviorSubject } from "rxjs";
import { Action } from "redux";
import RoutingOption from "./RoutingOption";
import { Hub } from "./Hub";
import { withDefaultStateToReduxReducer, DefaultStateReducerWithOptionalRoutingOptions } from "./ReducerHelpers";
import { createStateContext, StateContext } from "./StateContext";
import { storeContextId } from "./StoreContext";
import StateProvider from "./StateProvider";

// tslint:disable: no-any

export interface StateDefinition<TState, TStateOperations extends StateOperations<TState>> {
  createStandaloneStateHandler(): StateProvider<TState> & HigherStateOperations<TState, TStateOperations>;
  makeStorableUsing<TActionType extends any>(
    key: string,
    stateKey?: string
  ): StateDefinitionWithStateKeys<TState, TStateOperations, TActionType>;
}

export interface StateDefinitionWithStateKeys<TState, TStateOperations extends StateOperations<TState>, TActionType> {
  setActionDispatchers<TActionDispatchers extends ActionDispatchers<TActionType>>(
    actionDispatchers: TActionDispatchers
  ): StateDefinitionWithActions<TState, TStateOperations, TActionType, TActionDispatchers>;
}

export interface StateDefinitionWithActions<
  TState,
  TStateOperations extends StateOperations<TState>,
  TActionType,
  TActionDispatchers extends ActionDispatchers<TActionType>
> {
  setReducer(
    reducerBuilder?: ReducerBuilder<TState, TStateOperations, TActionType>,
    routingOptions?: Map<TActionType, RoutingOption>
  ): StoreStateDefinition<TState, TActionType, TActionDispatchers>;
}

export interface StoreStateDefinition<TState, TActionType, TActionDispatchers extends ActionDispatchers<TActionType>> {
  createStateHandler(
    hub: Hub,
    parentContextId?: string
  ): StateContext<TState, TActionType> & HigherActionOperations<TActionType, TActionDispatchers>;
}

export interface StateOperations<TState> {
  [operationKey: string]: (state: TState, ...args: any[]) => TState;
}

export interface ActionDispatchers<TActionType> {
  [OperationKey: string]: (dispatch: Dispatch<TActionType>, ...args: any[]) => void;
}

export type Dispatch<TActionType> = <TAction extends Action<TActionType>>(
  action: TAction,
  isRoutedToThisContext?: boolean
) => void;

export type ReducerBuilder<TState, TStateOperations extends StateOperations<TState>, TActionType> = (
  stateOperations: TStateOperations
) => DefaultStateReducerWithOptionalRoutingOptions<TState, TActionType>;

export type HigherStateOperations<TState, TStateOperations extends StateOperations<TState>> = {
  [OperationKey in keyof TStateOperations]: (...args: ParametersWithoutFirst<TStateOperations[OperationKey]>) => void;
};

export type HigherActionOperations<TActionType, TActionDispatchers extends ActionDispatchers<TActionType>> = {
  [ActionKey in keyof TActionDispatchers]: (...args: ParametersWithoutFirst<TActionDispatchers[ActionKey]>) => void;
};

type ParametersWithoutFirst<T extends (first: any, ...args: any[]) => any> = T extends (
  first: any,
  ...args: infer P
) => any
  ? P
  : never;

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
    makeStorableUsing<TActionType extends any>(key: string, stateKey: string = defaultStateKey) {
      return createStateDefinitionWithStateKeys<TState, TStateOperations, TActionType>(
        defaultState,
        stateOperations,
        key,
        stateKey
      );
    }
  };
}

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

function createStateDefinitionWithStateKeys<TState, TStateOperations extends StateOperations<TState>, TActionType>(
  defaultState: TState,
  stateOperations: TStateOperations,
  key: string,
  stateKey: string
): StateDefinitionWithStateKeys<TState, TStateOperations, TActionType> {
  return {
    setActionDispatchers<TActionDispatchers extends ActionDispatchers<TActionType>>(
      actionDispatchers: TActionDispatchers
    ) {
      return createStateDefinitionWithActions<TState, TStateOperations, TActionType, TActionDispatchers>(
        defaultState,
        stateOperations,
        key,
        stateKey,
        actionDispatchers
      );
    }
  };
}

function createStateDefinitionWithActions<
  TState,
  TStateOperations extends StateOperations<TState>,
  TActionType,
  TActionDispatchers extends ActionDispatchers<TActionType>
>(
  defaultState: TState,
  stateOperations: TStateOperations,
  key: string,
  stateKey: string,
  actionDispatchers: TActionDispatchers
): StateDefinitionWithActions<TState, TStateOperations, TActionType, TActionDispatchers> {
  return {
    setReducer(
      reducerBuilder?: ReducerBuilder<TState, TStateOperations, TActionType>,
      routingOptions?: Map<TActionType, RoutingOption>
    ) {
      return createStateDefinitionWithReducer<TState, TStateOperations, TActionType, TActionDispatchers>(
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

function createStateDefinitionWithReducer<
  TState,
  TStateOperations extends StateOperations<TState>,
  TActionType,
  TActionDispatchers extends ActionDispatchers<TActionType>
>(
  defaultState: TState,
  stateOperations: TStateOperations,
  key: string,
  stateKey: string,
  actionDispatchers: TActionDispatchers,
  reducerBuilder?: ReducerBuilder<TState, TStateOperations, TActionType>,
  routingOptions?: Map<TActionType, RoutingOption>
): StoreStateDefinition<TState, TActionType, TActionDispatchers> {
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

      const operations = getHigherActionOperations<TActionType, TActionDispatchers>(
        actionDispatchers,
        stateContext.dispatch
      );

      return Object.assign(stateContext, operations);
    }
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
  return <TArgs extends any[]>(actionDispatcher: (dispatch: Dispatch<TActionType>, ...args: TArgs) => void) => {
    const higherActionOperation = (...args: TArgs) => {
      actionDispatcher(dispatch, ...args);
    };

    return higherActionOperation;
  };
}
