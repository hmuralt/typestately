import { ReducersMapObject } from "redux";
import StateReducer from "./StateReducer";

export default class ReducerRegistry {
    constructor(
        private listener: (newReducersMapObject: ReducersMapObject) => void,
        private reducersMapObject: ReducersMapObject = {}
    ) { }

    public registerReducer(stateReducer: StateReducer) {
        this.reducersMapObject = stateReducer.extend(this.reducersMapObject);
        this.listener(this.reducersMapObject);
    }

    public getReducers(): ReducersMapObject {
        return this.reducersMapObject;
    }
}