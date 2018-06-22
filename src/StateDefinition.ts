import { Action as ReduxAction, Reducer } from "redux";
import { ActionConstructorType } from "./Action";
import StoreProxy from "./StoreProxy";
import DefaultStatePublisher from "./DefaultStatePublisher";
import NestingStatePublisher from "./NestingStatePublisher";
import DefaultStateReducer from "./DefaultStateReducer";
import NestingStateReducer from "./NestingStateReducer";
import DoNothingStateReducer from "./DoNothingStateReducer";
import coreRegistry from "./CoreRegistry";

export default class StateDefinition<TState, TActionType = string> {
    private static stateKey = "state";
    private nestedState: Array<StateDefinition<{}>> = [];
    private actionHandlers = new Map<TActionType, Reducer<TState, ReduxAction<TActionType>>>();

    constructor(private key: string, private defaultState: TState, private routeIdentifier?: string) { }

    public withReducerFor<TAction extends ReduxAction>(actionType: ActionConstructorType<TAction, TActionType> | TActionType, handler: (state: TState, action: TAction) => TState)
        : StateDefinition<TState, TActionType> {

        if ((actionType as ActionConstructorType<TAction, TActionType>).type) {
            this.actionHandlers.set((actionType as ActionConstructorType<TAction, TActionType>).type, handler);
            return this;
        }

        this.actionHandlers.set(actionType as TActionType, handler);

        return this;
    }

    public withNestedState<TNestedState>(nestedState: StateDefinition<TNestedState>): StateDefinition<TState, TActionType> {
        this.nestedState.push(nestedState);

        return this;
    }

    public buildOnStore(storeId: string): StoreProxy<TState, TActionType> {
        const stateReducer = this.createStateReducer();
        const statePublisher = this.createStatePublisher();
        const dispatch = coreRegistry.getStore(storeId).dispatch;
        coreRegistry.registerState(storeId, stateReducer, statePublisher);

        return {
            dispatch,
            stateProvider: statePublisher.getStateProvider()
        };
    }

    private createStateReducer(): DoNothingStateReducer | DefaultStateReducer<TState, TActionType> | NestingStateReducer<TState, TActionType> {
        if (this.actionHandlers.size === 0) {
            return new DoNothingStateReducer();
        }

        const nestedStateReducers = this.nestedState.map((nestedState) => nestedState.createStateReducer());

        return nestedStateReducers.length > 0 ?
            new NestingStateReducer(
                this.key,
                this.defaultState,
                this.actionHandlers,
                StateDefinition.stateKey,
                nestedStateReducers,
                this.routeIdentifier
            )
            :
            new DefaultStateReducer(
                this.key,
                this.defaultState,
                this.actionHandlers
            );
    }

    private createStatePublisher(): DefaultStatePublisher<TState> | NestingStatePublisher<TState> {
        const nestedStatePublisher = this.nestedState.map((nestedState) => nestedState.createStatePublisher());

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
