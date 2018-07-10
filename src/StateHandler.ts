
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

// tslint:disable-next-line:no-any
export default abstract class StateHandler<TState = {}, TActionType = any> {
    private static instanceCount = 0;
    public readonly stateReducer: StateReducer;
    public readonly statePublisher: StatePublisher;
    public readonly stateProvider: StateProvider<TState>;
    private instanceId: string;
    private dispatchCallback: Dispatch;
    private reducers: Map<TActionType, Reducer<TState, ReduxAction<TActionType>>>;
    private nestedStateHandlers: StateHandler[];

    constructor(
        private key: string,
        private defaultState: TState,
        private stateKey = "state") {
        this.instanceId = `${this.key}_${StateHandler.instanceCount++}_${new Date().getTime()}`;
        this.reducers = this.getReducers();
        this.nestedStateHandlers = this.getNestedStateHandlers();
        this.stateReducer = this.createStateReducer();
        const statePublisher = this.createStatePublisher();
        this.statePublisher = statePublisher;
        this.stateProvider = statePublisher.getStateProvider();
    }

    public onDispatch(callback: Dispatch) {
        this.dispatchCallback = callback;

        for (const nestedStateHandler of this.nestedStateHandlers) {
            nestedStateHandler.onDispatch(callback);
        }
    }

    protected dispatch<TAction extends ReduxAction>(action: TAction) {
        if (this.dispatchCallback === undefined) {
            return;
        }

        this.dispatchCallback(action);
    }

    protected dispatchToThisInstance<TAction extends ReduxAction>(action: TAction) {
        if (this.dispatchCallback === undefined) {
            return;
        }

        this.dispatchCallback(withRoute(this.instanceId, action));
    }

    protected getReducers(): Map<TActionType, Reducer<TState, ReduxAction<TActionType>>> {
        return new Map();
    }

    protected getNestedStateHandlers(): StateHandler[] {
        return [];
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