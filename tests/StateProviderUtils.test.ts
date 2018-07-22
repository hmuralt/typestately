import StateProvider, { Unsubscribe, Listener } from "../src/StateProvider";
import { combine } from "../src/StateProviderUtils";

describe("StateProviderUtils", () => {
    describe("combine", () => {
        const state1 = 4;
        const state2 = "test state value";
        let mockUnsubscribe1: Unsubscribe;
        let mockStateProvider1: StateProvider<number>;
        let listener1: Listener<number>;
        let mockUnsubscribe2: Unsubscribe;
        let mockStateProvider2: StateProvider<string>;
        let listener2: Listener<string>;

        beforeEach(() => {
            mockUnsubscribe1 = jest.fn();
            mockStateProvider1 = {
                getState: jest.fn(() => state1),
                subscribe: jest.fn((listener) => { listener1 = listener; return mockUnsubscribe1; })
            };
            mockUnsubscribe2 = jest.fn();
            mockStateProvider2 = {
                getState: jest.fn(() => state2),
                subscribe: jest.fn((listener) => { listener2 = listener; return mockUnsubscribe2; })
            };
        });

        describe("returned state providers getState", () => {
            it("is defined", () => {
                // Arrange
                // Act
                const combinedStateProvider = combine(mockStateProvider1, mockStateProvider2);

                // Assert
                expect(combinedStateProvider.getState).toBeDefined();
            });

            it("returns the combined state", () => {
                // Arrange
                const combinedStateProvider = combine(mockStateProvider1, mockStateProvider2);

                // Act
                const combinedState = combinedStateProvider.getState();

                // Assert
                expect(combinedState).toEqual([state1, state2]);
            });
        });

        describe("returned state providers subscribe", () => {
            it("is defined", () => {
                // Arrange
                // Act
                const combinedStateProvider = combine(mockStateProvider1, mockStateProvider2);

                // Assert
                expect(combinedStateProvider.subscribe).toBeDefined();
            });

            it("is hooks up listeners for first state provider correctly", () => {
                // Arrange¨
                const newState1 = 10;
                const combinedStateProvider = combine(mockStateProvider1, mockStateProvider2);
                const mockListener = jest.fn();
                combinedStateProvider.subscribe(mockListener);

                // Act
                listener1(newState1);

                // Assert
                expect(mockListener).toHaveBeenCalledWith([newState1, state2]);
            });

            it("is hooks up listeners for second state provider correctly", () => {
                // Arrange
                const newState2 = "new test state value";
                const combinedStateProvider = combine(mockStateProvider1, mockStateProvider2);
                const mockListener = jest.fn();
                combinedStateProvider.subscribe(mockListener);

                // Act
                listener2(newState2);

                // Assert
                expect(mockListener).toHaveBeenCalledWith([state1, newState2]);
            });


            it("returns the unsubscribe function", () => {
                // Arrange
                const combinedStateProvider = combine(mockStateProvider1, mockStateProvider2);

                // Act
                const unsubscribe = combinedStateProvider.subscribe(jest.fn());

                // Assert
                expect(unsubscribe).toBeDefined();
            });

            it("returns a unsubscribe function that calls all other unsubscribe functions", () => {
                // Arrange
                const combinedStateProvider = combine(mockStateProvider1, mockStateProvider2);
                const unsubscribe = combinedStateProvider.subscribe(jest.fn());

                // Act
                unsubscribe();

                // Assert
                expect(mockUnsubscribe1).toHaveBeenCalled();
                expect(mockUnsubscribe2).toHaveBeenCalled();
            });
        });
    });
});