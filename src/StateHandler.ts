import { Reducer, Action } from "redux";
import { of, Observable } from "rxjs";
import { Hub } from "./Hub";
import RoutingOption from "./RoutingOption";
import { storeContextId } from "./StoreContext";
import { StateContext } from "./StateContext";
import { createStateDefinition, StateDefinition } from "./StateContextBuild";
import DefaultStateReducer from "./DefaultStateReducer";
import { createExtensibleReducer } from "./ReducerHelpers";

// tslint:disable: no-any

interface ReducerPropertyDescription {
  actionType: any;
  propertyKey: string;
  routingOption?: RoutingOption;
}

export default abstract class StateHandler<TState, TActionType> {
  public get state() {
    return this.stateContext.state;
  }

  public get state$() {
    return this.stateContext.state$;
  }

  protected get id() {
    return this.stateContext.id;
  }

  private reducerFunctionProperties: ReducerPropertyDescription[];
  private nestedStateHandlerProperties: string[];
  private stateDefinition: StateDefinition<TState, TActionType>;
  private detachedStateContext: StateContext<TState, TActionType>;
  private stateContext: StateContext<TState, TActionType>;

  constructor(key: string, defaultState: TState, stateKey = "state") {
    this.stateDefinition = createStateDefinition<TState, TActionType>(key, defaultState, stateKey);
    this.detachedStateContext = new DetachedStateContext(key, defaultState);
    this.stateContext = this.detachedStateContext;
  }

  public static reducer<TState, TActionType>(actionType: TActionType, routingOption?: RoutingOption) {
    return <TAction extends Action<TActionType>>(
      target: StateHandler<TState, TActionType>,
      propertyKey: string,
      descriptor: TypedPropertyDescriptor<DefaultStateReducer<TState, TAction>>
    ) => {
      if (target.reducerFunctionProperties === undefined) {
        target.reducerFunctionProperties = [];
      }
      target.reducerFunctionProperties.push({
        actionType,
        propertyKey,
        routingOption
      });
    };
  }

  public static nested(target: StateHandler<any, any>, propertyKey: string) {
    if (target.nestedStateHandlerProperties === undefined) {
      target.nestedStateHandlerProperties = [];
    }

    target.nestedStateHandlerProperties.push(propertyKey);
  }

  public attachTo(hub: Hub, parentContextId: string = storeContextId) {
    this.detach();

    this.stateContext = this.stateDefinition
      .setReducer(this.getReducer(), this.getRoutingOptions())
      .attachTo(hub, parentContextId);

    this.attachNestedStateHandlers(hub, this.stateContext.id);
  }

  public detach() {
    this.detachNestedStateHandlers();

    this.stateContext.destroy();
    this.stateContext = this.detachedStateContext;
  }

  protected getReducer(): Reducer<TState, Action<TActionType>> | undefined {
    if (this.reducerFunctionProperties === undefined) {
      return undefined;
    }

    const extensibleReducer = createExtensibleReducer<TState, TActionType>();

    for (const { actionType, propertyKey } of this.reducerFunctionProperties) {
      extensibleReducer.handling(actionType, this[propertyKey].bind(this));
    }

    return extensibleReducer;
  }

  protected getRoutingOptions(): Map<TActionType, RoutingOption> | undefined {
    if (this.reducerFunctionProperties === undefined) {
      return undefined;
    }

    const routingOptions = new Map<TActionType, RoutingOption>();

    for (const { actionType, routingOption } of this.reducerFunctionProperties) {
      if (routingOption === undefined) {
        continue;
      }

      routingOptions.set(actionType, routingOption);
    }

    return routingOptions;
  }

  protected getNestedStateHandler() {
    if (this.nestedStateHandlerProperties === undefined) {
      return [];
    }

    const nestedStateHandlers = new Array<StateHandler<any, any>>();

    for (const nesteStateHandlerProperty of this.nestedStateHandlerProperties) {
      nestedStateHandlers.push(this[nesteStateHandlerProperty]);
    }

    return nestedStateHandlers;
  }

  protected dispatch<TAction extends Action<TActionType>>(
    action: TAction,
    isRoutedToThisContext?: boolean | undefined
  ) {
    this.stateContext.dispatch(action, isRoutedToThisContext);
  }

  private attachNestedStateHandlers(hub: Hub, parentContextId: string) {
    for (const nestedStateHandler of this.getNestedStateHandler()) {
      nestedStateHandler.attachTo(hub, parentContextId);
    }
  }

  private detachNestedStateHandlers() {
    for (const nestedStateHandler of this.getNestedStateHandler()) {
      nestedStateHandler.detach();
    }
  }
}

class DetachedStateContext<TState, TActionType> implements StateContext<TState, TActionType> {
  public id: string;
  public state: TState;
  public state$: Observable<TState>;

  constructor(key: string, defaultState: TState) {
    this.id = key;
    this.state = defaultState;
    this.state$ = of(defaultState);
  }

  public dispatch<TAction extends Action<TActionType>>(action: TAction, isRoutedToThisContext?: boolean) {
    // do nothing here
  }

  public destroy() {
    // do nothing here
  }
}
