import { Reducer, Action } from "redux";
import RouteAction, { isRouteAction } from "./RouteAction";
import RoutingOption from "./RoutingOption";
import DefaultStateReducer from "./DefaultStateReducer";

export interface DefaultStateReducerWithOptionalRoutingOptions<TState, TActionType>
  extends DefaultStateReducer<TState, Action<TActionType>> {
  routingOptions?: Map<TActionType, RoutingOption>;
}

export interface ExtensibleReducer<TState, TActionType>
  extends DefaultStateReducerWithOptionalRoutingOptions<TState, TActionType> {
  routingOptions: Map<TActionType, RoutingOption>;
  handling<TAction extends Action<TActionType>>(
    type: TActionType,
    reducerFunction: DefaultStateReducer<Readonly<TState>, TAction>,
    routingOption?: RoutingOption
  ): ExtensibleReducer<TState, TActionType>;
}

export function createExtensibleReducer<TState, TActionType>(): ExtensibleReducer<TState, TActionType> {
  const reducerFunctions = new Map<TActionType, Reducer<Readonly<TState>, Action<TActionType>>>();
  const routingOptions = new Map<TActionType, RoutingOption>();

  function handling<TAction extends Action<TActionType>>(
    type: TActionType,
    reducerFunction: DefaultStateReducer<Readonly<TState>, TAction>,
    routingOption?: RoutingOption
  ) {
    reducerFunctions.set(type, reducerFunction);

    if (routingOption !== undefined) {
      routingOptions.set(type, routingOption);
    }

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
  reducer.routingOptions = routingOptions;

  return reducer;
}

export function withDefaultStateToReduxReducer<TState, TActionType>(
  defaultState: TState,
  reducer: DefaultStateReducer<Readonly<TState>, Action<TActionType>>
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
