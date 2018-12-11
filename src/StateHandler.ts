
import { Action as ReduxAction, Reducer, Dispatch } from "redux";
import { Observable, Subject } from "rxjs";
import { map } from "rxjs/operators";
import DoNothingStateReducer from "./DoNothingStateReducer";
import DefaultStateReducer, { ReducerSetup, RoutingOptions } from "./DefaultStateReducer";
import NestingStateReducer from "./NestingStateReducer";
import withRoute from "./WithRoute";
import StateConnector from "./StateConnector";

// tslint:disable-next-line:no-any
export default class StateHandler<TState = {}, TActionType = any> {
    private static instanceCount = 0;
    protected instanceId: string;
    private reducerSetups = new Map<TActionType, ReducerSetup<TState, TActionType>>();
    private nestedStateHandlers: StateHandler[] = [];
    private mappedState$ = new Subject<TState>();
    private currentState: TState;
    private dispatchCallback: Dispatch;
    private stateConnector: StateConnector;

    constructor(
        private key: string,
        private defaultState: TState,
        private stateKey = "state") {
        this.instanceId = `${this.key}_${StateHandler.instanceCount++}_${new Date().getTime()}`;
        this.mappedState$.subscribe((state) => this.currentState = state);
    }

    public get state() {
        return this.currentState || this.defaultState;
    }

    public get state$() {
        return this.mappedState$.asObservable();
    }

    public get connector(): StateConnector {
        if (this.stateConnector === undefined) {
            this.stateConnector = {
                stateReducer: this.createStateReducer(),
                setState$: this.setState$.bind(this),
                setDispatch: this.setDispatch.bind(this)
            };
        }

        return this.stateConnector;
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

    private setState$(state$: Observable<{}>) {
        if (this.nestedStateHandlers.length === 0) {
            state$.pipe(map((state) => state[this.key] as TState)).subscribe(this.mappedState$);
            return;
        }

        state$.pipe(map((state) => state[this.key][this.stateKey] as TState)).subscribe(this.mappedState$);

        const nestedState$ = state$.pipe(map((state) => state[this.key]));

        for (const nestedStateHandler of this.nestedStateHandlers) {
            nestedStateHandler.setState$(nestedState$);
        }
    }

    private setDispatch(dispatch: Dispatch) {
        this.dispatchCallback = dispatch;

        for (const nestedStateHandler of this.nestedStateHandlers) {
            nestedStateHandler.setDispatch(dispatch);
        }
    }

    private createStateReducer() {
        if (this.reducerSetups.size === 0) {
            return new DoNothingStateReducer();
        }

        if (this.nestedStateHandlers.length === 0) {
            return new DefaultStateReducer(this.key, this.defaultState, this.reducerSetups, this.instanceId);
        }

        const nestedStateReducers = this.nestedStateHandlers.map((nestedStateHandler) => nestedStateHandler.connector.stateReducer);

        return new NestingStateReducer(this.key, this.defaultState, this.reducerSetups, this.instanceId, this.stateKey, nestedStateReducers);
    }
}