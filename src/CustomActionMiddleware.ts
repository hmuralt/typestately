import { Action  as ReduxAction, Middleware } from "redux";
import Action from "./Action";
import DispatchingAction from "./DispatchingAction";

declare module "redux" {
    export interface Dispatch<A extends ReduxAction = AnyAction> {
        (action: Action): void;
        (dispatchingAction: DispatchingAction): void;
    }
}

// tslint:disable-next-line:no-any
const customActionMiddleware: Middleware = ({ dispatch }) => (next) => (action) => {
    if (action instanceof DispatchingAction) {
        return action.execute(dispatch);
    }

    if (action instanceof Action) {
        return next(Object.assign({}, action));
    }

    return next(action);
};

export default customActionMiddleware;