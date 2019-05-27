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

export interface StateDefinition<TState, TActionType> {
  setReducer(
    reducer?: DefaultStateReducer<Readonly<TState>, Action<TActionType>>,
    routingOptions?: Map<TActionType, RoutingOption>
  ): AttachableStateDefinition<TState, TActionType>;
}

// tslint:disable-next-line: no-any
export function createStateDefinition<TState = {}, TActionType = any>(
  key: string,
  defaultState: TState,
  stateKey = "state"
): StateDefinition<TState, TActionType> {
  return {
    setReducer(
      reducer?: DefaultStateReducer<Readonly<TState>, Action<TActionType>>,
      routingOptions?: Map<TActionType, RoutingOption>
    ) {
      const defaultStateReducer =
        reducer !== undefined ? withDefaultStateToReduxReducer(defaultState, reducer) : undefined;
      const defaultRoutingOptions = routingOptions !== undefined ? routingOptions : new Map();

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
