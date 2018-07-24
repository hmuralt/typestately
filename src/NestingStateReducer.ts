import { Action as ReduxAction, ReducersMapObject, combineReducers, Reducer } from "redux";
import StateReducer from "./StateReducer";
import DefaultStateReducer from "./DefaultStateReducer";

export default class NestingStateReducer<TState, TActionType> extends DefaultStateReducer<TState, TActionType> {
    constructor(
        key: string,
        defaultState: TState,
        reducers: Map<TActionType, Reducer<TState, ReduxAction<TActionType>>>,
        instanceId: string,
        private stateKey: string,
        private nestedStateReducers: StateReducer[],
    ) {
        super(key, defaultState, reducers, instanceId);
    }

    public extend(reducersMapObject: ReducersMapObject): ReducersMapObject {
        let subReducersMapObject: ReducersMapObject = {};

        for (const nestedReducer of this.nestedStateReducers) {
            subReducersMapObject = nestedReducer.extend(subReducersMapObject);
        }

        subReducersMapObject[this.stateKey] = this.reduce.bind(this);

        return Object.assign(reducersMapObject, { [this.key]: combineReducers(subReducersMapObject) });
    }
}