import { Action as ReduxAction } from "redux";

export const routeActionType = "@@typestately/ROUTE_ACTION";

export interface RouteAction extends ReduxAction<string> {
    identifier: string;
    action: ReduxAction;
}

export default function withRoute(identifier: string, action: ReduxAction): RouteAction {
    return {
        type: routeActionType,
        identifier,
        action
    };
}