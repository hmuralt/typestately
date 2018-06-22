import { Dispatch, Action } from "redux";
import StateProvider from "./StateProvider";

export default interface SubStore<TState, TActionType> {
    dispatch: Dispatch<Action<TActionType>>;
    stateProvider: StateProvider<TState>;
}