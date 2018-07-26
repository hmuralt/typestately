import { Action as ReduxAction, Reducer } from "redux";
import DefaultStateReducer, { ReducerSetup, RoutingOptions } from "../src/DefaultStateReducer";
import withRoute from "../src/WithRoute";

describe("DefaultStateReducer", () => {
    const testKey = "theKey";
    const testInstanceId = "testInstanceId";
    const testDefaultState = { someProp: "someVal" };
    const testState = { someProp: "someOtherVal" };
    type State = typeof testDefaultState;
    const testActionType = "testActionType";
    const testAction = { type: testActionType };
    const testNotFoundAction = { type: "notFound" };
    const mockReducerState = { someProp: "mockReducerState" };
    const mockReducer = jest.fn(() => mockReducerState);
    const createStateReducer = (routingOptions?: RoutingOptions) => {
        return new DefaultStateReducer(
            testKey,
            testDefaultState,
            new Map<string, ReducerSetup<State, string>>([
                [
                    testActionType, { reducer: mockReducer, routingOptions }
                ]
            ]),
            testInstanceId
        );
    };

    beforeEach(() => {
        mockReducer.mockClear();
    });

    describe("extend", () => {
        it("adds reducer to reducers map object under passed test key", () => {
            // Arrange
            const stateReducer = createStateReducer();
            const reducersMapObject = {};

            // Act
            const extendedReducersMapObject = stateReducer.extend(reducersMapObject);

            // Assert
            expect(extendedReducersMapObject[testKey]).toBeDefined();
        });
    });

    describe("reduceState", () => {
        describe("without route", () => {
            it("returns default state if nothing passed and no reducer found for passed action", () => {
                // Arrange
                const stateReducer = createStateReducer();
                const reducersMapObject = {};
                const extendedReducersMapObject = stateReducer.extend(reducersMapObject);

                // Act
                const newState = extendedReducersMapObject[testKey](undefined, testNotFoundAction);

                // Assert
                expect(newState).toBe(testDefaultState);
            });

            it("returns state if no reducer found for passed action", () => {
                // Arrange
                const stateReducer = createStateReducer();
                const reducersMapObject = {};
                const extendedReducersMapObject = stateReducer.extend(reducersMapObject);

                // Act
                const newState = extendedReducersMapObject[testKey](testState, testNotFoundAction);

                // Assert
                expect(newState).toBe(testState);
            });

            it("returns reduced state of called reducer found for passed action", () => {
                // Arrange
                const stateReducer = createStateReducer();
                const reducersMapObject = {};
                const extendedReducersMapObject = stateReducer.extend(reducersMapObject);

                // Act
                const newState = extendedReducersMapObject[testKey](testState, testAction);

                // Assert
                expect(newState).toBe(mockReducerState);
            });

            describe("with isRoutedOnly enabled", () => {
                it("returns state and doesn't call reducer", () => {
                    // Arrange
                    const stateReducer = createStateReducer({ isRoutedOnly: true });
                    const reducersMapObject = {};
                    const extendedReducersMapObject = stateReducer.extend(reducersMapObject);

                    // Act
                    const newState = extendedReducersMapObject[testKey](testState, testAction);

                    // Assert
                    expect(newState).toBe(testState);
                    expect(mockReducer).not.toHaveBeenCalled();
                });
            });
        });

        describe("with route", () => {
            const otherTestInstanceId = "otherTestInstanceId";

            it("returns default state if nothing passed and no reducer found for passed action", () => {
                // Arrange
                const stateReducer = createStateReducer();
                const reducersMapObject = {};
                const extendedReducersMapObject = stateReducer.extend(reducersMapObject);

                // Act
                const newState = extendedReducersMapObject[testKey](undefined, withRoute(testInstanceId, testNotFoundAction));

                // Assert
                expect(newState).toBe(testDefaultState);
            });

            it("returns state if no reducer found for passed action", () => {
                // Arrange
                const stateReducer = createStateReducer();
                const reducersMapObject = {};
                const extendedReducersMapObject = stateReducer.extend(reducersMapObject);

                // Act
                const newState = extendedReducersMapObject[testKey](testState, withRoute(testInstanceId, testNotFoundAction));

                // Assert
                expect(newState).toBe(testState);
            });

            describe("with isForThisInstance enabled", () => {
                it("returns state if instanceId doesn't match", () => {
                    // Arrange
                    const stateReducer = createStateReducer({ isForThisInstance: true });
                    const reducersMapObject = {};
                    const extendedReducersMapObject = stateReducer.extend(reducersMapObject);

                    // Act
                    const newState = extendedReducersMapObject[testKey](testState, withRoute(otherTestInstanceId, testAction));

                    // Assert
                    expect(newState).toBe(testState);
                });

                it("returns reduced state of called reducer found for passed action if instanceId matches", () => {
                    // Arrange
                    const stateReducer = createStateReducer({ isForThisInstance: true });
                    const reducersMapObject = {};
                    const extendedReducersMapObject = stateReducer.extend(reducersMapObject);

                    // Act
                    const newState = extendedReducersMapObject[testKey](testState, withRoute(testInstanceId, testAction));

                    // Assert
                    expect(newState).toBe(mockReducerState);
                    expect(mockReducer).toHaveBeenCalledWith(testState, testAction);
                });
            });

            describe("with isForOtherInstances enabled", () => {
                it("returns state if instanceId not of another instance", () => {
                    // Arrange
                    const stateReducer = createStateReducer({ isForOtherInstances: true });
                    const reducersMapObject = {};
                    const extendedReducersMapObject = stateReducer.extend(reducersMapObject);

                    // Act
                    const newState = extendedReducersMapObject[testKey](testState, withRoute(testInstanceId, testAction));

                    // Assert
                    expect(newState).toBe(testState);
                });

                it("returns reduced state of called reducer found for passed action if instanceId of another instance", () => {
                    // Arrange
                    const stateReducer = createStateReducer({ isForOtherInstances: true });
                    const reducersMapObject = {};
                    const extendedReducersMapObject = stateReducer.extend(reducersMapObject);

                    // Act
                    const newState = extendedReducersMapObject[testKey](testState, withRoute(otherTestInstanceId, testAction));

                    // Assert
                    expect(newState).toBe(mockReducerState);
                    expect(mockReducer).toHaveBeenCalledWith(testState, testAction);
                });
            });

            describe("with isForThisInstance AND isForOtherInstances enabled", () => {
                it("returns reduced state of called reducer found for passed action if instanceId matches", () => {
                    // Arrange
                    const stateReducer = createStateReducer({ isForThisInstance: true, isForOtherInstances: true });
                    const reducersMapObject = {};
                    const extendedReducersMapObject = stateReducer.extend(reducersMapObject);

                    // Act
                    const newState = extendedReducersMapObject[testKey](testState, withRoute(testInstanceId, testAction));

                    // Assert
                    expect(newState).toBe(mockReducerState);
                    expect(mockReducer).toHaveBeenCalledWith(testState, testAction);
                });

                it("returns reduced state of called reducer found for passed action if instanceId of another instance", () => {
                    // Arrange
                    const stateReducer = createStateReducer({ isForThisInstance: true, isForOtherInstances: true });
                    const reducersMapObject = {};
                    const extendedReducersMapObject = stateReducer.extend(reducersMapObject);

                    // Act
                    const newState = extendedReducersMapObject[testKey](testState, withRoute(otherTestInstanceId, testAction));

                    // Assert
                    expect(newState).toBe(mockReducerState);
                    expect(mockReducer).toHaveBeenCalledWith(testState, testAction);
                });
            });

            describe("with isForThisInstance AND isForOtherInstances disabled", () => {
                it("returns state", () => {
                    // Arrange
                    const stateReducer = createStateReducer({ isForThisInstance: false, isForOtherInstances: false });
                    const reducersMapObject = {};
                    const extendedReducersMapObject = stateReducer.extend(reducersMapObject);

                    // Act
                    const newState = extendedReducersMapObject[testKey](testState, withRoute(testInstanceId, testAction));

                    // Assert
                    expect(newState).toBe(testState);
                    expect(mockReducer).not.toHaveBeenCalled();
                });
            });
        });
    });
});