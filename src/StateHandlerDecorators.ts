import { Action as ReduxAction, Reducer } from "redux";
import { RoutingOptions } from "./DefaultStateReducer";
import StateHandler from "./StateHandler";

// tslint:disable:no-any
interface ReducerPropertyDescription {
    actionType: any;
    propertyKey: string;
    routingOptions?: RoutingOptions;
}

type StateHandlerConstructor = new (...args: any[]) => StateHandler;

const stateHandlerReducerProperties = new Map<StateHandlerConstructor, ReducerPropertyDescription[]>();
const stateHandlerNestedStateHandlerProperties = new Map<StateHandlerConstructor, string[]>();

export function reducer<TState, TActionType>(actionType: TActionType, routingOptions?: RoutingOptions) {
    return (target: object, propertyKey: string, descriptor: TypedPropertyDescriptor<Reducer<TState, ReduxAction<TActionType>>>) => {
        const stateHandlerConstructor = target.constructor as StateHandlerConstructor;
        const reducerProperties = stateHandlerReducerProperties.get(stateHandlerConstructor) || [];
        reducerProperties.push({
            actionType,
            propertyKey,
            routingOptions
        });
        stateHandlerReducerProperties.set(stateHandlerConstructor, reducerProperties);
    };
}

export function nested(target: object, propertyKey: string) {
    const stateHandlerConstructor = target.constructor as StateHandlerConstructor;
    const nestedStateHandlers = stateHandlerNestedStateHandlerProperties.get(stateHandlerConstructor) || [];
    nestedStateHandlers.push(propertyKey);
    stateHandlerNestedStateHandlerProperties.set(stateHandlerConstructor, nestedStateHandlers);
}

export function decoratedStateHandler<TState, TActionType, T extends { new(...args: any[]): StateHandler<TState, TActionType> }>(
    constructor: T
): T {
    return class extends constructor {
        constructor(...args: any[]) {
            super(...args);
            this.setReducers();
            this.setNestedStateHandlers();
        }

        private setReducers() {
            const reducerProperties = stateHandlerReducerProperties.get(constructor) || [];

            for (const reducerProperty of reducerProperties) {
                const reducerfunc = this[reducerProperty.propertyKey] as Reducer;
                this.addReducer(reducerProperty.actionType, reducerfunc.bind(this), reducerProperty.routingOptions);
            }
        }

        private setNestedStateHandlers() {
            const nestedStateHandlerProperties = stateHandlerNestedStateHandlerProperties.get(constructor) || [];

            for (const nestedStateHandlerProperty of nestedStateHandlerProperties) {
                const nestedStateHandler = this[nestedStateHandlerProperty];
                this.addNestedStateHandler(nestedStateHandler);
            }
        }
    };
}