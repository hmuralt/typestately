import PublisherRegistry from "../src/PublisherRegistry";

describe("PublisherRegistry", () => {
    describe("publish", () => {
        it("calls publish for each registered publisher", () => {
            // Arrange
            const stateToPublish = {};
            const publisherRegistry = new PublisherRegistry();
            const mockStatePublisher1 = {
                publish: jest.fn()
            };
            const mockStatePublisher2 = {
                publish: jest.fn()
            };
            publisherRegistry.registerPublisher(mockStatePublisher1);
            publisherRegistry.registerPublisher(mockStatePublisher2);

            // Act
            publisherRegistry.publish(stateToPublish);

            // Assert
            expect(mockStatePublisher1.publish).toHaveBeenCalledWith(stateToPublish);
            expect(mockStatePublisher2.publish).toHaveBeenCalledWith(stateToPublish);
        });
    });
});