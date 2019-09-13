import { Action as ReduxAction } from "redux";

export default interface RouteAction<TActionType> extends ReduxAction<string> {
  identifier: string;
  action: ReduxAction<TActionType>;
}

export const routeActionType = "@@typestately/ROUTE_ACTION";

export function isRouteAction<TActionType>(action: ReduxAction): action is RouteAction<TActionType> {
  const route = action as RouteAction<TActionType>;

  return route.type === routeActionType && route.action !== undefined && route.identifier !== undefined;
}

export function withRoute<TActionType>(identifier: string, action: ReduxAction<TActionType>): RouteAction<TActionType> {
  return {
    type: routeActionType,
    identifier,
    action
  };
}
