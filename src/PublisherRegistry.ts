import StatePublisher from "./StatePublisher";

export default class PublisherRegistry {
    private publishers = new Array<StatePublisher>();

    public registerPublisher(statePublisher: StatePublisher) {
        this.publishers.push(statePublisher);
    }

    public publish(state: {}) {
        for (const publisher of this.publishers) {
            publisher.publish(state);
        }
    }
}