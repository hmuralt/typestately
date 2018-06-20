import StatePublisher from "./StatePublisher";
import DefaultStatePublisher from "./DefaultStatePublisher";

export default class NestingStatePublisher<TState> extends DefaultStatePublisher<TState> {
    constructor(
        key: string,
        state: TState,
        private stateKey: string,
        private nestedStatePublishers: StatePublisher[]
    ) {
        super(key, state);
    }

    public publish(parentState: {}) {
        const stateGroup = parentState[this.key];
        const newState = stateGroup[this.stateKey];

        this.setState(newState);

        for (const nestedStatePublisher of this.nestedStatePublishers) {
            nestedStatePublisher.publish(stateGroup);
        }
    }
}
