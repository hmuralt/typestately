import { Dispatch, Action } from "redux";
import StateProvider from "./StateProvider";

 // tslint:disable-next-line:no-any
export default interface StoreProxy<TState = {}, TActionType = any> {
    instanceId: string;
    dispatch: Dispatch<Action<TActionType>>;
    stateProvider: StateProvider<TState>;
    nestedStoreProxies: Map<string, StoreProxy>;
}