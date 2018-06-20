import { Action as ReduxAction, Reducer } from "redux";
import DefaultStateReducer from "../src/DefaultStateReducer";
import withRoute from "../src/WithRoute";

describe("DefaultStateReducer", () => {
    const testKey = "theKey";
    const testDefaultState = { someProp: "someVal" };
    const testState = { someProp: "someOtherVal" };
    type State = typeof testDefaultState;
    const testActionType1 = "testActionType1";
    const testActionType2 = "testActionType2";
    const testActionType3 = "testActionType3";
    const testAction1 = { type: testActionType1 };
    const testAction2 = { type: testActionType2 };
    const testAction3 = { type: testActionType3 };
    const mockActionHandler1 = jest.fn();
    const mockActionHandler2 = jest.fn();
    const testActionHandlers = new Map<string, Reducer<State, ReduxAction<string>>>();
    testActionHandlers.set(testActionType1, mockActionHandler1);
    testActionHandlers.set(testActionType2, mockActionHandler2);
    let stateReducer: DefaultStateReducer<State, string>;

    describe("without route", () => {
        beforeEach(() => {
            stateReducer = new DefaultStateReducer(
                testKey,
                testDefaultState,
                testActionHandlers
            );
        });

        describe("extend", () => {
            it("adds reducer function to reducers map object under passed test key", () => {
                // Arrange
                const reducersMapObject = {};

                // Act
                const extendedReducersMapObject = stateReducer.extend(reducersMapObject);

                // Assert
                expect(extendedReducersMapObject[testKey]).toBeDefined();
            });
        });

        describe("reduceState", () => {
            it("returns default state if nothing passed and no action handler for passed action", () => {
                // Arrange
                const reducersMapObject = {};
                const extendedReducersMapObject = stateReducer.extend(reducersMapObject);

                // Act
                const newState = extendedReducersMapObject[testKey](undefined, testAction3);

                // Assert
                expect(newState).toBe(testDefaultState);
            });

            it("returns state if no action handler for passed action", () => {
                // Arrange
                const reducersMapObject = {};
                const extendedReducersMapObject = stateReducer.extend(reducersMapObject);

                // Act
                const newState = extendedReducersMapObject[testKey](testState, testAction3);

                // Assert
                expect(newState).toBe(testState);
            });

            it("calls correct action handler", () => {
                // Arrange
                const reducersMapObject = {};
                const extendedReducersMapObject = stateReducer.extend(reducersMapObject);

                // Act
                extendedReducersMapObject[testKey](testState, testAction2);

                // Assert
                expect(mockActionHandler2).toHaveBeenCalledWith(testState, testAction2);
            });
        });
    });

    describe("with route", () => {
        const testRouteIdentifier = "DefaultStatePublisherTestRoute";
        const wrongRouteIdentifier = "WrongDefaultStatePublisherTestRoute";

        beforeEach(() => {
            stateReducer = new DefaultStateReducer(
                testKey,
                testDefaultState,
                testActionHandlers,
                testRouteIdentifier
            );
        });

        describe("reduceState", () => {
            it("returns default state if nothing passed and no action handler for passed action", () => {
                // Arrange
                const reducersMapObject = {};
                const extendedReducersMapObject = stateReducer.extend(reducersMapObject);

                // Act
                const newState = extendedReducersMapObject[testKey](undefined, withRoute(testRouteIdentifier, testAction3));

                // Assert
                expect(newState).toBe(testDefaultState);
            });

            it("returns state if no action handler for passed action", () => {
                // Arrange
                const reducersMapObject = {};
                const extendedReducersMapObject = stateReducer.extend(reducersMapObject);

                // Act
                const newState = extendedReducersMapObject[testKey](testState, withRoute(testRouteIdentifier, testAction3));

                // Assert
                expect(newState).toBe(testState);
            });

            it("returns state if route does not match", () => {
                // Arrange
                const reducersMapObject = {};
                const extendedReducersMapObject = stateReducer.extend(reducersMapObject);

                // Act
                const newState = extendedReducersMapObject[testKey](testState, withRoute(wrongRouteIdentifier, testAction1));

                // Assert
                expect(newState).toBe(testState);
            });

            it("doesn't call action handler if route does not match", () => {
                // Arrange
                const reducersMapObject = {};
                const extendedReducersMapObject = stateReducer.extend(reducersMapObject);

                // Act
                extendedReducersMapObject[testKey](testState, withRoute(wrongRouteIdentifier, testAction1));

                // Assert
                expect(mockActionHandler1).not.toBeCalled();
            });

            it("calls correct action handler", () => {
                // Arrange
                const reducersMapObject = {};
                const extendedReducersMapObject = stateReducer.extend(reducersMapObject);

                // Act
                extendedReducersMapObject[testKey](testState, withRoute(testRouteIdentifier, testAction2));

                // Assert
                expect(mockActionHandler2).toHaveBeenCalledWith(testState, testAction2);
            });
        });
    });

});