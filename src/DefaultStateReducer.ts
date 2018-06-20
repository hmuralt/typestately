import { Action as ReduxAction, ReducersMapObject, Reducer } from "redux";
import StateReducer from "./StateReducer";
import { RouteAction, routeActionType } from "./WithRoute";

export default class DefaultStateReducer<TState, TActionType> implements StateReducer {
    constructor(
        protected key: string,
        protected defaultState: TState,
        protected actionHandlers: Map<TActionType, Reducer<TState, ReduxAction<TActionType>>>,
        protected routeIdentifier?: string
    ) {
    }

    public extend(reducersMapObject: ReducersMapObject): ReducersMapObject {
        return Object.assign(reducersMapObject, { [this.key]: this.reduceState.bind(this) });
    }

    protected reduceState(state: TState = this.defaultState, action: ReduxAction): TState {
        if (this.isRouteAction(action) && this.routeIdentifier !== undefined && action.identifier !== this.routeIdentifier) {
            return state;
        }

        const actionToHandle = this.isRouteAction(action) ? action.action : action;

        const handler = this.actionHandlers.get(actionToHandle.type);

        if (handler === undefined) {
            return state;
        }

        return handler(state, action);
    }

    private isRouteAction(action: ReduxAction): action is RouteAction {
        const route = action as RouteAction;

        return route.type === routeActionType && route.action !== undefined && route.identifier !== undefined;
    }
}