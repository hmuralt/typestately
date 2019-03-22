import { Reducer, Action } from "redux";
import RoutingOption from "./RoutingOption";
import { createStateContext, StateContext } from "./StateContext";

export interface StateContextDefinition<TState, TActionType> {
  attachTo(parentcontextId: string): StateContext<TState, TActionType>;
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
        attachTo(parentcontextId: string) {
          return createStateContext({
            key,
            defaultState,
            stateKey,
            reducer,
            routingOptions,
            parentcontextId
          });
        }
      };
    }
  };
}
