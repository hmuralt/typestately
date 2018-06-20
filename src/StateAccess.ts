import StateReducer from "./StateReducer";
import StatePublisher from "./StatePublisher";
import StateProvider from "./StateProvider";

export default interface StateAccess<TState> {
    reducer: StateReducer;
    publisher: StatePublisher;
    provider: StateProvider<TState>;
}