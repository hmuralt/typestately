import { Reducer, Action } from "redux";
import RouteAction, { isRouteAction } from "./RouteAction";
import RoutingOption from "./RoutingOption";
import DefaultStateReducer from "./DefaultStateReducer";

export interface ExtensibleReducer<TState, TActionType> extends Reducer<TState, Action<TActionType>> {
  handling<TAction extends Action<TActionType>>(
    type: TActionType,
    reducerFunction: DefaultStateReducer<Readonly<TState>, TAction>
  ): ExtensibleReducer<TState, TActionType>;
}

export function createReducer<TState, TActionType>(): ExtensibleReducer<TState, TActionType> {
  const reducerFunctions = new Map<TActionType, Reducer<Readonly<TState>, Action<TActionType>>>();

  function handling<TAction extends Action<TActionType>>(
    type: TActionType,
    reducerFunction: DefaultStateReducer<Readonly<TState>, TAction>
  ) {
    reducerFunctions.set(type, reducerFunction);
    return reducer;
  }

  function reducer(state: TState, action: Action<TActionType>) {
    if (!reducerFunctions.has(action.type)) {
      return state;
    }

    const reducerFunction = reducerFunctions.get(action.type)!;

    return reducerFunction(state, action);
  }

  reducer.handling = handling;

  return reducer;
}

export function withDefaultStateToReduxReducer<TState, TActionType>(
  defaultState: TState,
  reducer: Reducer<TState, Action<TActionType>>
): Reducer<TState, Action<TActionType>> {
  return (state: TState | undefined = defaultState, action: Action<TActionType>) => {
    return reducer(state, action);
  };
}

export function withRouteReducer<TState, TActionType>(
  identifier: string,
  reducer: Reducer<TState, Action<TActionType>>,
  routingOptions: Map<TActionType, RoutingOption>
) {
  return (state: TState, action: Action<TActionType> | RouteAction<TActionType>) => {
    if (!isRouteAction(action)) {
      return routingOptions.has(action.type) && routingOptions.get(action.type)!.isRoutedOnly
        ? state
        : reducer(state, action);
    }

    const actionToHandle = action.action;
    const routingOption = routingOptions.get(actionToHandle.type) || {
      isForThisInstance: true
    };

    if (
      (!routingOption.isForThisInstance && !routingOption.isForOtherInstances) ||
      (routingOption.isForThisInstance && !routingOption.isForOtherInstances && action.identifier !== identifier) ||
      (routingOption.isForOtherInstances && !routingOption.isForThisInstance && action.identifier === identifier)
    ) {
      return state;
    }

    return reducer(state, actionToHandle);
  };
}
