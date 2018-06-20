import { Action as ReduxAction, ReducersMapObject, combineReducers, Reducer } from "redux";
import StateReducer from "./StateReducer";
import DefaultStateReducer from "./DefaultStateReducer";

export default class NestingStateReducer<TState, TActionType> extends DefaultStateReducer<TState, TActionType> {
    constructor(
        key: string,
        defaultState: TState,
        actionHandlers: Map<TActionType, Reducer<TState, ReduxAction<TActionType>>>,
        private stateKey: string,
        private nestedStateReducers: StateReducer[],
        routeIdentifier?: string
    ) {
        super(key, defaultState, actionHandlers, routeIdentifier);
    }

    public extend(reducersMapObject: ReducersMapObject): ReducersMapObject {
        let reducers: ReducersMapObject = {};

        for (const nestedReducer of this.nestedStateReducers) {
            reducers = nestedReducer.extend(reducers);
        }

        reducers[this.stateKey] = this.reduceState.bind(this);

        return Object.assign(reducersMapObject, { [this.key]: combineReducers(reducers) });
    }
}