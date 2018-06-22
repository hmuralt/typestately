import { Dispatch, Action } from "redux";
import StateProvider from "./StateProvider";

export default interface StateAccess<TState, TActionType> {
    dispatch: Dispatch<Action<TActionType>>;
    provider: StateProvider<TState>;
}