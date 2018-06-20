import DefaultStatePublisher from "../src/DefaultStatePublisher";
import StateProvider from "../src/StateProvider";

describe("DefaultStatePublisher (StateProvider)", () => {
    const testKey = "theKey";
    const testStateStart = { someProp: "someVal" };
    const testStateChanged = { someProp: "someNewVal" };
    let statePublisher: DefaultStatePublisher<typeof testStateStart>;
    let stateProvider: StateProvider<typeof testStateStart>;

    beforeEach(() => {
        statePublisher = new DefaultStatePublisher(testKey, testStateStart);
        stateProvider = statePublisher.getStateProvider();
    });

    describe("getState", () => {
        it("returns the state", () => {
            // Arrange

            // Act
            const state = stateProvider.getState();

            // Assert
            expect(state).toBe(testStateStart);
        });
    });

    describe("publish", () => {
        it("calls subscribed listener when new state published", () => {
            // Arrange
            const mockListener = jest.fn();
            stateProvider.subscribe(mockListener);

            // Act
            statePublisher.publish({
                [testKey]: testStateChanged
            });

            // Assert
            expect(mockListener).toHaveBeenCalledWith(testStateChanged);
        });

        it("calls subscribed for all listeners when new state published", () => {
            // Arrange
            const mockListener1 = jest.fn();
            const mockListener2 = jest.fn();
            stateProvider.subscribe(mockListener1);
            stateProvider.subscribe(mockListener2);

            // Act
            statePublisher.publish({
                [testKey]: testStateChanged
            });

            // Assert
            expect(mockListener1).toHaveBeenCalledWith(testStateChanged);
            expect(mockListener2).toHaveBeenCalledWith(testStateChanged);
        });

        it("doesn't call subscribed listener when old state published", () => {
            // Arrange
            const mockListener = jest.fn();
            stateProvider.subscribe(mockListener);

            // Act
            statePublisher.publish({
                [testKey]: testStateStart
            });

            // Assert
            expect(mockListener).not.toHaveBeenCalled();
        });

        it("doesn't call unsubscribed listener", () => {
            // Arrange
            const mockListener = jest.fn();
            const unsubscribe = stateProvider.subscribe(mockListener);
            unsubscribe();

            // Act
            statePublisher.publish({
                [testKey]: testStateChanged
            });

            // Assert
            expect(mockListener).not.toHaveBeenCalled();
        });
    });

    describe("unsubscribe", () => {
        it("can be called multiple times without error", () => {
            // Arrange
            const mockListener = jest.fn();
            const unsubscribe = stateProvider.subscribe(mockListener);

            // Act
            // Assert
            unsubscribe();
            unsubscribe();
            unsubscribe();
        });
    });
});