
import { Action as ReduxAction, Reducer, Dispatch } from "redux";
import StateReducer from "./StateReducer";
import StatePublisher from "./StatePublisher";
import StateProvider from "./StateProvider";
import NestingStatePublisher from "./NestingStatePublisher";
import DoNothingStateReducer from "./DoNothingStateReducer";
import DefaultStatePublisher from "./DefaultStatePublisher";
import DefaultStateReducer, { ReducerSetup, RoutingOptions } from "./DefaultStateReducer";
import NestingStateReducer from "./NestingStateReducer";
import withRoute from "./WithRoute";

// tslint:disable-next-line:no-any
export default class StateHandler<TState = {}, TActionType = any> {
    private static instanceCount = 0;
    protected instanceId: string;
    private reducerSetups = new Map<TActionType, ReducerSetup<TState, TActionType>>();
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
        this.reducerSetups.set(actionType, {
            reducer,
            routingOptions: routingOptions
        });
    }

    protected addNestedStateHandler(nestedStateHandler: StateHandler) {
        this.nestedStateHandlers.push(nestedStateHandler);
    }

    private createStateReducer() {
        if (this.reducerSetups.size === 0) {
            return new DoNothingStateReducer();
        }

        if (this.nestedStateHandlers.length === 0) {
            return new DefaultStateReducer(this.key, this.defaultState, this.reducerSetups, this.instanceId);
        }

        const nestedStateReducers = this.nestedStateHandlers.map((nestedStateHandler) => nestedStateHandler.stateReducer);

        return new NestingStateReducer(this.key, this.defaultState, this.reducerSetups, this.instanceId, this.stateKey, nestedStateReducers);
    }

    private createStatePublisher(): DefaultStatePublisher<TState> {
        if (this.nestedStateHandlers.length === 0) {
            return new DefaultStatePublisher(this.key, this.defaultState);
        }

        const nestedStatePublishers = this.nestedStateHandlers.map((nestedStateHandler) => nestedStateHandler.statePublisher);

        return new NestingStatePublisher(this.key, this.defaultState, this.stateKey, nestedStatePublishers);
    }
}