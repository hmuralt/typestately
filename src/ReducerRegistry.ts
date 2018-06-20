import { ReducersMapObject } from "redux";
import StateReducer from "./StateReducer";

export default class ReducerRegistry {
    constructor(
        private listener: (newReducers: ReducersMapObject) => void,
        private reducers: ReducersMapObject = {}
    ) { }

    public registerReducer(stateReducer: StateReducer) {
        this.reducers = stateReducer.extend(this.reducers);
        this.listener(this.reducers);
    }

    public getReducers(): ReducersMapObject {
        return this.reducers;
    }
}