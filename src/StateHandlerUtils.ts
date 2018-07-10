import StateHandler from "./StateHandler";
import coreRegistry from "./CoreRegistry";

class ReadonlyStateHandler<TState> extends StateHandler<TState> {
    constructor(key: string, defaultState: TState) {
        super(key, defaultState);
    }
}

export function createReadonlyStateHandler<TState>(key: string, defaultState: TState) {
    return new ReadonlyStateHandler(key, defaultState);
}

export function registerOnStore<TState>(storeId: string, stateHandler: StateHandler<TState>) {
    coreRegistry.registerState(storeId, stateHandler.stateReducer, stateHandler.statePublisher);
    stateHandler.onDispatch(coreRegistry.getStore(storeId).dispatch);
}