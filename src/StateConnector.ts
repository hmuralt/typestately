import { Observable } from "rxjs";
import { Dispatch } from "redux";
import StateReducer from "./StateReducer";

export default interface StateConnector {
    stateReducer: StateReducer;
    setState$: (state$: Observable<{}>) => void;
    setDispatch: (dispatch: Dispatch) => void;
}