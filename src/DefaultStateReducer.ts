import { Action as ReduxAction, ReducersMapObject, Reducer } from "redux";
import StateReducer from "./StateReducer";
import { RouteAction, routeActionType } from "./WithRoute";

export default class DefaultStateReducer<TState, TActionType> implements StateReducer {
    constructor(
        protected key: string,
        protected defaultState: TState,
        protected reducers: Map<TActionType, Reducer<TState, ReduxAction<TActionType>>>,
        protected instanceId: string
    ) {
    }

    public extend(reducersMapObject: ReducersMapObject): ReducersMapObject {
        return Object.assign(reducersMapObject, { [this.key]: this.reduce.bind(this) });
    }

    protected reduce(state: TState = this.defaultState, action: ReduxAction): TState {
        if (this.isRouteAction(action) && this.instanceId !== undefined && action.identifier !== this.instanceId) {
            return state;
        }

        const actionToHandle = this.isRouteAction(action) ? action.action : action;

        const reducer = this.reducers.get(actionToHandle.type);

        if (reducer === undefined) {
            return state;
        }

        return reducer(state, action);
    }

    private isRouteAction(action: ReduxAction): action is RouteAction {
        const route = action as RouteAction;

        return route.type === routeActionType && route.action !== undefined && route.identifier !== undefined;
    }
}