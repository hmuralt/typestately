import NestingStatePublisher from "../src/NestingStatePublisher";
import StateProvider from "../src/StateProvider";
import StatePublisher from "../src/StatePublisher";

// tslint:disable:no-any
describe("NestingStatePublisher", () => {
    const testKey = "theKey";
    const testStateKey = "theStateKey";
    const testStateStart = { someProp: "someVal" };
    const testStateChanged = { someProp: "someNewVal" };
    const mockNestedStatePublisher: StatePublisher = {
        publish: jest.fn()
    };
    let statePublisher: NestingStatePublisher<typeof testStateStart>;
    let stateProvider: StateProvider<typeof testStateStart>;

    beforeEach(() => {
        statePublisher = new NestingStatePublisher(
            testKey,
            testStateStart,
            testStateKey,
            [mockNestedStatePublisher]
        );
        stateProvider = statePublisher.getStateProvider();
    });

    describe("publish", () => {
        it("calls subscribed listener when new state published", () => {
            // Arrange
            const mockListener = jest.fn();
            stateProvider.subscribe(mockListener);

            // Act
            statePublisher.publish({
                [testKey]: {
                    [testStateKey]: testStateChanged
                }
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
                [testKey]: {
                    [testStateKey]: testStateChanged
                }
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
                [testKey]: {
                    [testStateKey]: testStateStart
                }
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

        it("calls publish of nested state publishers", () => {
            // Arrange

            // Act
            statePublisher.publish({
                [testKey]: {
                    [testStateKey]: testStateChanged
                }
            });

            // Assert
            expect(mockNestedStatePublisher.publish).toHaveBeenCalled();
        });

        it("calls publish of nested state publishers even if own state not changed", () => {
            // Arrange

            // Act
            statePublisher.publish({
                [testKey]: {
                    [testStateKey]: testStateStart
                }
            });

            // Assert
            expect(mockNestedStatePublisher.publish).toHaveBeenCalled();
        });
    });
});