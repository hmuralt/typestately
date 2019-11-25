import { Action } from "redux";
import RoutingOption from "./RoutingOption";
import { createStateContext, StateContext } from "./StateContext";
import { Hub } from "./Hub";
import { storeContextId } from "./StoreContext";
import DefaultStateReducer from "./DefaultStateReducer";
import { withDefaultStateToReduxReducer } from "./ReducerHelpers";

export interface AttachableStateDefinition<TState, TActionType> {
  attachTo(hub: Hub, parentContextId?: string): StateContext<TState, TActionType>;
}

export interface StateDefinition<TState> {
  setReducer<TActionType>(
    reducer?: DefaultStateReducer<Readonly<TState>, Action<TActionType>>,
    routingOptions?: Map<TActionType, RoutingOption>
  ): AttachableStateDefinition<TState, TActionType>;
}

export function createStateDefinition<TState = {}>(
  key: string,
  defaultState: TState,
  stateKey = "state"
): StateDefinition<TState> {
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setReducer<TActionType = any>(
      reducer?: DefaultStateReducer<Readonly<TState>, Action<TActionType>>,
      routingOptions?: Map<TActionType, RoutingOption>
    ) {
      const defaultStateReducer =
        reducer !== undefined ? withDefaultStateToReduxReducer(defaultState, reducer) : undefined;
      const defaultRoutingOptions = routingOptions || new Map<TActionType, RoutingOption>();

      return {
        attachTo(hub: Hub, parentContextId: string = storeContextId) {
          return createStateContext(
            {
              key,
              defaultState,
              stateKey,
              reducer: defaultStateReducer,
              routingOptions: defaultRoutingOptions,
              parentContextId
            },
            hub
          );
        }
      };
    }
  };
}
