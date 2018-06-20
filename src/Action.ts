import { Action as ReduxAction } from "redux";

export default abstract class Action implements ReduxAction {
    constructor(public type: string) {
    }
}

// tslint:disable-next-line:no-any
export type ActionConstructorType<TAction, TActionType> = (new (...args: any[]) => TAction) & { type: TActionType };