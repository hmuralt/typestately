import { Reducer, Action } from "redux";
import RoutingOption from "./RoutingOption";
import { createStateContext, StateContext } from "./StateContext";
import { Hub } from "./Hub";
import { storeId } from "./StoreContext";

export interface StateContextDefinition<TState, TActionType> {
  attachTo(hub: Hub, parentContextId: string): StateContext<TState, TActionType>;
}

export interface StateContextStructure<TState, TActionType> {
  setReducer(
    reducer?: Reducer<Readonly<TState>, Action<TActionType>>,
    routingOptions?: Map<TActionType, RoutingOption>
  ): StateContextDefinition<TState, TActionType>;
}

// tslint:disable-next-line: no-any
export function buildStateContext<TState = {}, TActionType = any>(
  key: string,
  defaultState: TState,
  stateKey = "state"
): StateContextStructure<TState, TActionType> {
  return {
    setReducer(
      reducer?: Reducer<Readonly<TState>, Action<TActionType>>,
      routingOptions?: Map<TActionType, RoutingOption>
    ) {
      return {
        attachTo(hub: Hub, parentContextId: string = storeId) {
          return createStateContext(
            {
              key,
              defaultState,
              stateKey,
              reducer,
              routingOptions,
              parentContextId
            },
            hub
          );
        }
      };
    }
  };
}
