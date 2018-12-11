import StateHandler from "./StateHandler";

export class ReadonlyStateHandler<TState> extends StateHandler<TState> {
    constructor(key: string, defaultState: TState) {
        super(key, defaultState);
    }
}

export function createReadonlyStateHandler<TState>(key: string, defaultState: TState) {
    return new ReadonlyStateHandler(key, defaultState);
}