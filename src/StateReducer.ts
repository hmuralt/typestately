import { ReducersMapObject } from "redux";

export default interface StateReducer {
    extend(reducersMapObject: ReducersMapObject): ReducersMapObject;
}
