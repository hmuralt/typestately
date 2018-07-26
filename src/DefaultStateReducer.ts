import { Action as ReduxAction, ReducersMapObject, Reducer } from "redux";
import StateReducer from "./StateReducer";
import { RouteAction, routeActionType } from "./WithRoute";

export interface RoutingOptions {
    isRoutedOnly?: boolean;
    isForThisInstance?: boolean;
    isForOtherInstances?: boolean;
}

export interface ReducerSetup<TState, TActionType> {
    reducer: Reducer<TState, ReduxAction<TActionType>>;
    routingOptions?: RoutingOptions;
}

const defaultRoutingOptions: RoutingOptions = {
    isForThisInstance: true
};

export default class DefaultStateReducer<TState, TActionType> implements StateReducer {
    constructor(
        protected key: string,
        protected defaultState: TState,
        protected reducerSetups: Map<TActionType, ReducerSetup<TState, TActionType>>,
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

        const reducerSetup = this.reducerSetups.get(action.type);

        if (reducerSetup === undefined || (reducerSetup.routingOptions || defaultRoutingOptions).isRoutedOnly) {
            return state;
        }

        return reducerSetup.reducer(state, action);
    }

    private handleRoutedAction(state: TState, routeAction: RouteAction) {
        const actionToHandle = routeAction.action;
        const reducerSetup = this.reducerSetups.get(actionToHandle.type);

        if (reducerSetup === undefined) {
            return state;
        }

        const routingOptions = reducerSetup.routingOptions || defaultRoutingOptions;

        if (
            (!routingOptions.isForThisInstance && !routingOptions.isForOtherInstances) ||
            (routingOptions.isForThisInstance && !routingOptions.isForOtherInstances && routeAction.identifier !== this.instanceId) ||
            (routingOptions.isForOtherInstances && !routingOptions.isForThisInstance && routeAction.identifier === this.instanceId)
        ) {
            return state;
        }

        return reducerSetup.reducer(state, actionToHandle);
    }

    private isRouteAction(action: ReduxAction): action is RouteAction {
        const route = action as RouteAction;

        return route.type === routeActionType && route.action !== undefined && route.identifier !== undefined;
    }
}