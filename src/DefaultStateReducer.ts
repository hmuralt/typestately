import { Action, AnyAction } from "redux";

type DefaultStateReducer<TState, TAction extends Action = AnyAction> = (state: TState, action: TAction) => TState;

export default DefaultStateReducer;
