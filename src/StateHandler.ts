
import { Action as ReduxAction, Reducer, Dispatch } from "redux";
import StateReducer from "./StateReducer";
import StatePublisher from "./StatePublisher";
import StateProvider from "./StateProvider";
import NestingStatePublisher from "./NestingStatePublisher";
import DoNothingStateReducer from "./DoNothingStateReducer";
import DefaultStatePublisher from "./DefaultStatePublisher";
import DefaultStateReducer, { ReducerFunction, RoutingOptions } from "./DefaultStateReducer";
import NestingStateReducer from "./NestingStateReducer";
import withRoute from "./WithRoute";

// tslint:disable:no-any
interface ReducerPropertyDescription {
    actionType: any;
    propertyKey: string;
    routingOptions?: RoutingOptions;
}

const stateHandlerReducerProperties = new Map<new (...args: any[]) => StateHandler, ReducerPropertyDescription[]>();
const stateHandlerNestedStateHandlerProperties = new Map<new (...args: any[]) => StateHandler, string[]>();

export function DecoratedStateHandler<TState, TActionType, T extends { new(...args: any[]): StateHandler<TState, TActionType> }>(
    constructor: T
): T {
    return class ExtendedStateHandler extends constructor {
        constructor(...args: any[]) {
            super(...args);
            this.setReducers();
            this.setNestedStateHandlers();
        }

        private setReducers() {
            const reducerProperties = stateHandlerReducerProperties.get(constructor) || [];

            for (const reducerProperty of reducerProperties) {
                const reducer = this[reducerProperty.propertyKey] as Reducer;
                this.addReducer(reducerProperty.actionType, reducer.bind(this), reducerProperty.routingOptions);
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

export function Reducer<TState, TActionType>(actionType: TActionType, routingOptions?: RoutingOptions) {
    return (target: object, propertyKey: string, descriptor: TypedPropertyDescriptor<Reducer<TState, ReduxAction<TActionType>>>) => {
        const stateHandlerConstructor = target.constructor as new (...args: any[]) => StateHandler;
        const reducerProperties = stateHandlerReducerProperties.get(stateHandlerConstructor) || [];
        reducerProperties.push({
            actionType,
            propertyKey,
            routingOptions
        });
        stateHandlerReducerProperties.set(stateHandlerConstructor, reducerProperties);
    };
}

export function Nested(target: object, propertyKey: string) {
    const stateHandlerConstructor = target.constructor as new (...args: any[]) => StateHandler;
    const nestedStateHandlers = stateHandlerNestedStateHandlerProperties.get(stateHandlerConstructor) || [];
    nestedStateHandlers.push(propertyKey);
    stateHandlerNestedStateHandlerProperties.set(stateHandlerConstructor, nestedStateHandlers);
}

export default class StateHandler<TState = {}, TActionType = any> {
    private static instanceCount = 0;
    protected instanceId: string;
    private reducerFunctions = new Map<TActionType, ReducerFunction<TState, TActionType>>();
    private nestedStateHandlers: StateHandler[] = [];
    private reducer: StateReducer;
    private publisher: DefaultStatePublisher<TState>;
    private provider: StateProvider<TState>;
    private dispatchCallback: Dispatch;

    constructor(
        private key: string,
        private defaultState: TState,
        private stateKey = "state") {
        this.instanceId = `${this.key}_${StateHandler.instanceCount++}_${new Date().getTime()}`;
    }

    public get stateReducer(): StateReducer {
        if (this.reducer === undefined) {
            this.reducer = this.createStateReducer();
        }

        return this.reducer;
    }

    public get statePublisher(): StatePublisher {
        if (this.publisher === undefined) {
            this.publisher = this.createStatePublisher();
        }

        return this.publisher;
    }

    public get stateProvider(): StateProvider<TState> {
        if (this.publisher === undefined) {
            this.publisher = this.createStatePublisher();
        }

        if (this.provider === undefined) {
            this.provider = this.publisher.getStateProvider();
        }

        return this.provider;
    }

    public onDispatch(callback: Dispatch) {
        this.dispatchCallback = callback;

        for (const nestedStateHandler of this.nestedStateHandlers) {
            nestedStateHandler.onDispatch(callback);
        }
    }

    protected dispatch<TAction extends ReduxAction<TActionType>>(action: TAction, instanceId?: string) {
        if (this.dispatchCallback === undefined) {
            return;
        }

        instanceId === undefined ? this.dispatchCallback(action) : this.dispatchCallback(withRoute(instanceId, action));
    }

    protected addReducer(actionType: TActionType, reducer: Reducer<TState, ReduxAction<TActionType>>, routingOptions?: RoutingOptions) {
        this.reducerFunctions.set(actionType, {
            reduce: reducer,
            routingOptions: routingOptions
        });
    }

    protected addNestedStateHandler(nestedStateHandler: StateHandler) {
        this.nestedStateHandlers.push(nestedStateHandler);
    }

    private createStateReducer() {
        if (this.reducerFunctions.size === 0) {
            return new DoNothingStateReducer();
        }

        if (this.nestedStateHandlers.length === 0) {
            return new DefaultStateReducer(this.key, this.defaultState, this.reducerFunctions, this.instanceId);
        }

        const nestedStateReducers = this.nestedStateHandlers.map((nestedStateHandler) => nestedStateHandler.stateReducer);

        return new NestingStateReducer(this.key, this.defaultState, this.reducerFunctions, this.instanceId, this.stateKey, nestedStateReducers);
    }

    private createStatePublisher(): DefaultStatePublisher<TState> {
        if (this.nestedStateHandlers.length === 0) {
            return new DefaultStatePublisher(this.key, this.defaultState);
        }

        const nestedStatePublishers = this.nestedStateHandlers.map((nestedStateHandler) => nestedStateHandler.statePublisher);

        return new NestingStatePublisher(this.key, this.defaultState, this.stateKey, nestedStatePublishers);
    }
}