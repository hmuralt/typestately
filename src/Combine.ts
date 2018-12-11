export default function combine<TState1, TState2, TState3, TState4, TState5, TState6>(
    state1: TState1,
    state2: TState2,
    state3?: TState3,
    state4?: TState4,
    state5?: TState5,
    state6?: TState6
) {
    return [
        state1,
        state2,
        state3,
        state4,
        state5,
        state6,
    ] as [
        TState1,
        TState2,
        TState3,
        TState4,
        TState5,
        TState6
    ];
}
