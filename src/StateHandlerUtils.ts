import StateHandler from "./StateHandler";
import coreRegistry from "./CoreRegistry";

export function registerOnStore<TState>(storeId: string, stateHandler: StateHandler<TState>) {
    coreRegistry.registerState(storeId, stateHandler.stateReducer, stateHandler.statePublisher);
    stateHandler.onDispatch(coreRegistry.getStore(storeId).dispatch);
}