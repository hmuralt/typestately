import { Action as ReduxAction, ReducersMapObject, Reducer } from "redux";
import StateReducer from "./StateReducer";
import { RouteAction, routeActionType } from "./WithRoute";

export interface RoutingOptions {
    isRoutedOnly?: boolean;
    isForThisInstance?: boolean;
    isForOtherInstances?: boolean;
}

export interface ReducerFunction<TState, TActionType> {
    reduce: Reducer<TState, ReduxAction<TActionType>>;
    routingOptions?: RoutingOptions;
}

const defaultRoutingOptions: RoutingOptions = {
    isForThisInstance: true
};

export default class DefaultStateReducer<TState, TActionType> implements StateReducer {
    constructor(
        protected key: string,
        protected defaultState: TState,
        protected reducerFunctions: Map<TActionType, ReducerFunction<TState, TActionType>>,
        protected instanceId: string
    ) {
    }

    public extend(reducersMapObject: ReducersMapObject): ReducersMapObject {
        return Object.assign(reducersMapObject, { [this.key]: this.reduce.bind(this) });
    }

    protected reduce(state: TState = this.defaultState, action: ReduxAction): TState {
        if (this.isRouteAction(action)) {
            return this.handleRoutedAction(state, action);
        }

        const reducerFunction = this.reducerFunctions.get(action.type);

        if (reducerFunction === undefined || (reducerFunction.routingOptions || defaultRoutingOptions).isRoutedOnly) {
            return state;
        }

        return reducerFunction.reduce(state, action);
    }

    private handleRoutedAction(state: TState, routeAction: RouteAction) {
        const actionToHandle = routeAction.action;
        const reducerFunction = this.reducerFunctions.get(actionToHandle.type);

        if (reducerFunction === undefined) {
            return state;
        }

        const routingOptions = reducerFunction.routingOptions || defaultRoutingOptions;

        if (
            (!routingOptions.isForThisInstance && !routingOptions.isForOtherInstances) ||
            (routingOptions.isForThisInstance && !routingOptions.isForOtherInstances && routeAction.identifier !== this.instanceId) ||
            (routingOptions.isForOtherInstances && !routingOptions.isForThisInstance && routeAction.identifier === this.instanceId)
        ) {
            return state;
        }

        return reducerFunction.reduce(state, actionToHandle);
    }

    private isRouteAction(action: ReduxAction): action is RouteAction {
        const route = action as RouteAction;

        return route.type === routeActionType && route.action !== undefined && route.identifier !== undefined;
    }
}