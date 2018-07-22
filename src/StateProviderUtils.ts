import StateProvider from "./StateProvider";

// tslint:disable:no-any

// Haven't found better way to support type inference
export function combine<TState1, TState2, TState3, TState4, TState5, TState6>(
    p1: StateProvider<TState1>,
    p2: StateProvider<TState2>,
    p3?: StateProvider<TState3>,
    p4?: StateProvider<TState4>,
    p5?: StateProvider<TState5>,
    p6?: StateProvider<TState6>
) {
    const providers: Array<StateProvider<any>> = [p1, p2];

    if (p3 !== undefined) {
        providers.push(p3);
    }

    if (p4 !== undefined) {
        providers.push(p4);
    }

    if (p5 !== undefined) {
        providers.push(p5);
    }

    if (p6 !== undefined) {
        providers.push(p6);
    }

    return combineProviders<[TState1, TState2, TState3, TState4, TState5, TState6]>(providers);
}

export function combineProviders<TStateFinal extends any[]>(stateProviders: Array<StateProvider<any>>): StateProvider<TStateFinal> {
    const getState = () => {
        return stateProviders.map((stateProvider) => stateProvider.getState()) as TStateFinal;
    };

    const subscribe = (listener: (state: TStateFinal) => void) => {
        const unsubscribes = stateProviders.map((stateProvider, index) => {
            const unsubscribe = stateProvider.subscribe((state) => {
                listener(stateProviders.map((innerStateProvider, innerIndex) => innerIndex === index ? state : innerStateProvider.getState()) as TStateFinal);
            });

            return unsubscribe;
        });

        return () => {
            for (const unsubscribe of unsubscribes) {
                unsubscribe();
            }
        };
    };

    return {
        getState,
        subscribe
    };
}