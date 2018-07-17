export type Listener<TState> = (state: TState) => void;
export type Unsubscribe = () => void;

export default interface StateProvider<TState> {
    getState(): TState;
    subscribe(listener: Listener<TState>): Unsubscribe;
}

// Haven't found better way to support type inference
export function combine<TState1, TState2>(
    p1: StateProvider<TState1>,
    p2: StateProvider<TState2>):
    StateProvider<[TState1, TState2]> {
    const getState = () => {
        return [
            p1.getState(),
            p2.getState()
        ] as [TState1, TState2];
    };

    const subscribe = (listener: (state: [TState1, TState2]) => void) => {
        const unsubscribe1 = p1.subscribe((state1: TState1) => {
            listener([state1, p2.getState()]);
        });

        const unsubscribe2 = p2.subscribe((state2: TState2) => {
            listener([p1.getState(), state2]);
        });

        return () => {
            unsubscribe1();
            unsubscribe2();
        };
    };

    return {
        getState,
        subscribe
    };
}