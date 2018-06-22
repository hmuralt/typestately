import * as shallowequal from "shallowequal";
import StatePublisher from "./StatePublisher";
import StateProvider from "./StateProvider";

export type Listener<TState> = (state: TState) => void;

export default class DefaultStatePublisher<TState> implements StatePublisher {
    protected listeners: Map<number, Listener<TState>>;

    constructor(
        protected key: string,
        protected state: TState
    ) {
        this.listeners = new Map<number, (state: TState) => void>();
    }

    public publish(parentState: {}) {
        const newState = parentState[this.key];

        this.setState(newState);
    }

    public getStateProvider(): StateProvider<TState> {
        return {
            getState: this.getState.bind(this),
            subscribe: this.subscribe.bind(this)
        };
    }

    protected setState(state: TState) {
        if (shallowequal(this.state, state)) {
            return;
        }

        this.state = state;

        for (const [, listener] of this.listeners) {
            listener(this.state);
        }
    }

    private getState() {
        return this.state;
    }

    private subscribe(listener: Listener<TState>) {
        const key = this.listeners.size + 1;
        this.listeners.set(key, listener);

        return () => {
            if (!this.listeners.has(key)) {
                return;
            }
            this.listeners.delete(key);
        };
    }
}
