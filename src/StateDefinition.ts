import { Action as ReduxAction, Reducer, Dispatch } from "redux";
import { ActionConstructorType } from "./Action";
import StoreProxy from "./StoreProxy";
import DefaultStatePublisher from "./DefaultStatePublisher";
import NestingStatePublisher from "./NestingStatePublisher";
import DefaultStateReducer from "./DefaultStateReducer";
import NestingStateReducer from "./NestingStateReducer";
import DoNothingStateReducer from "./DoNothingStateReducer";
import coreRegistry from "./CoreRegistry";
import StateReducer from "./StateReducer";
import StatePublisher from "./StatePublisher";

// tslint:disable-next-line:no-any
interface BuildedState<TState = {}, TActionType = any> {
    key: string;
    stateReducer: StateReducer;
    statePublisher: DefaultStatePublisher<TState>;
    storeProxy: StoreProxy<TState, TActionType>;
}

// tslint:disable-next-line:no-any
export default class StateDefinition<TState = {}, TActionType = any> {
    private static stateKey = "state";
    private nestedStates: StateDefinition[] = [];
    private reducers = new Map<TActionType, Reducer<TState, ReduxAction<TActionType>>>();
    private buildCount = 0;

    constructor(private key: string, private defaultState: TState) { }

    public withReducerFor<TAction extends ReduxAction>(actionType: ActionConstructorType<TAction, TActionType> | TActionType, reducer: (state: TState, action: TAction) => TState)
        : StateDefinition<TState, TActionType> {

        if ((actionType as ActionConstructorType<TAction, TActionType>).type) {
            this.reducers.set((actionType as ActionConstructorType<TAction, TActionType>).type, reducer);
            return this;
        }

        this.reducers.set(actionType as TActionType, reducer);

        return this;
    }

    public withNestedState<TNestedState>(nestedState: StateDefinition<TNestedState>): StateDefinition<TState, TActionType> {
        this.nestedStates.push(nestedState);

        return this;
    }

    public buildOnStore(storeId: string): StoreProxy<TState, TActionType> {
        const buildedState = this.build(coreRegistry.getStore(storeId).dispatch);

        coreRegistry.registerState(storeId, buildedState.stateReducer, buildedState.statePublisher);

        return buildedState.storeProxy;
    }

    public getStoreProxy(storeProxies: Map<string, StoreProxy>): StoreProxy<TState, TActionType> {
        return storeProxies.get(this.key) as StoreProxy<TState, TActionType>;
    }

    private build(dispatch: Dispatch<ReduxAction<TActionType>>): BuildedState<TState, TActionType> {
        const instanceId = `${this.key}_${this.buildCount}`;
        const buildedNestedStates = this.nestedStates.map((nestedState) => nestedState.build(dispatch));
        const stateReducer = this.createStateReducer(buildedNestedStates.map((buildedNestedState) => buildedNestedState.stateReducer), instanceId);
        const statePublisher = this.createStatePublisher(buildedNestedStates.map((buildedNestedState) => buildedNestedState.statePublisher));
        const nestedStoreProxies = buildedNestedStates.reduce((map, buildedNestedState) => {
            map.set(buildedNestedState.key, buildedNestedState.storeProxy);
            return map;
        }, new Map<string, StoreProxy>());

        const storeProxy = {
            instanceId,
            dispatch,
            stateProvider: statePublisher.getStateProvider(),
            nestedStoreProxies
        };

        ++this.buildCount;

        return {
            key: this.key,
            stateReducer,
            statePublisher,
            storeProxy
        };
    }

    private createStateReducer(nestedStateReducers: StateReducer[], instanceId: string): DoNothingStateReducer | DefaultStateReducer<TState, TActionType> | NestingStateReducer<TState, TActionType> {
        if (this.reducers.size === 0) {
            return new DoNothingStateReducer();
        }

        return nestedStateReducers.length > 0 ?
            new NestingStateReducer(
                this.key,
                this.defaultState,
                this.reducers,
                instanceId,
                StateDefinition.stateKey,
                nestedStateReducers
            )
            :
            new DefaultStateReducer(
                this.key,
                this.defaultState,
                this.reducers,
                instanceId
            );
    }

    private createStatePublisher(nestedStatePublisher: StatePublisher[]): DefaultStatePublisher<TState> | NestingStatePublisher<TState> {

        return nestedStatePublisher.length > 0 ?
            new NestingStatePublisher(
                this.key,
                this.defaultState,
                StateDefinition.stateKey,
                nestedStatePublisher
            )
            :
            new DefaultStatePublisher(
                this.key,
                this.defaultState
            );
    }
}