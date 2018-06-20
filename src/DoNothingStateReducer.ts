import { ReducersMapObject } from "redux";
import StateReducer from "./StateReducer";

export default class DoNothingStateReducer implements StateReducer {
    public extend(reducersMapObject: ReducersMapObject) {
        return reducersMapObject;
    }
}