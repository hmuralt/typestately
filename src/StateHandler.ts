
import { Action as ReduxAction, Reducer, Dispatch } from "redux";
import StateReducer from "./StateReducer";
import StatePublisher from "./StatePublisher";
import StateProvider from "./StateProvider";
import NestingStatePublisher from "./NestingStatePublisher";
import DoNothingStateReducer from "./DoNothingStateReducer";
import DefaultStatePublisher from "./DefaultStatePublisher";
import DefaultStateReducer from "./DefaultStateReducer";
import NestingStateReducer from "./NestingStateReducer";
import withRoute from "./WithRoute";

// tslint:disable:no-any
const stateHandlerReducerProperties = new Map<new (...args: any[]) => StateHandler, Map<any, string>>();
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
            const reducerProperties = stateHandlerReducerProperties.get(constructor) || new Map();

            for (const reducerProperty of reducerProperties) {
                const reducer = this[reducerProperty[1]] as Reducer;
                this.addReducer(reducerProperty[0], reducer.bind(this));
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

export function Reducer<TActionType>(actionType: TActionType) {
    return (target: object, propertyKey: string) => {
        const stateHandlerConstructor = target.constructor as new (...args: any[]) => StateHandler;
        const reducerProperties = stateHandlerReducerProperties.get(stateHandlerConstructor) || new Map<any, string>();
        reducerProperties.set(actionType, propertyKey);
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
    private reducers = new Map<TActionType, Reducer<TState, ReduxAction<TActionType>>>();
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

    protected addReducer(actionType: TActionType, reducer: Reducer<TState, ReduxAction<TActionType>>) {
        this.reducers.set(actionType, reducer);
    }

    protected addNestedStateHandler(nestedStateHandler: StateHandler) {
        this.nestedStateHandlers.push(nestedStateHandler);
    }

    private createStateReducer() {
        if (this.reducers.size === 0) {
            return new DoNothingStateReducer();
        }

        if (this.nestedStateHandlers.length === 0) {
            return new DefaultStateReducer(this.key, this.defaultState, this.reducers, this.instanceId);
        }

        const nestedStateReducers = this.nestedStateHandlers.map((nestedStateHandler) => nestedStateHandler.stateReducer);

        return new NestingStateReducer(this.key, this.defaultState, this.reducers, this.instanceId, this.stateKey, nestedStateReducers);
    }

    private createStatePublisher(): DefaultStatePublisher<TState> {
        if (this.nestedStateHandlers.length === 0) {
            return new DefaultStatePublisher(this.key, this.defaultState);
        }

        const nestedStatePublishers = this.nestedStateHandlers.map((nestedStateHandler) => nestedStateHandler.statePublisher);

        return new NestingStatePublisher(this.key, this.defaultState, this.stateKey, nestedStatePublishers);
    }
}