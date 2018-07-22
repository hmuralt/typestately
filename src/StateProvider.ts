export type Listener<TState> = (state: TState) => void;
export type Unsubscribe = () => void;

export default interface StateProvider<TState> {
    getState(): TState;
    subscribe(listener: Listener<TState>): Unsubscribe;
}