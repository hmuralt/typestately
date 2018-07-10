import { Action as ReduxAction, Reducer } from "redux";
import DefaultStateReducer from "../src/DefaultStateReducer";
import withRoute from "../src/WithRoute";

describe("DefaultStateReducer", () => {
    const testKey = "theKey";
    const testInstanceId = "testInstanceId";
    const testDefaultState = { someProp: "someVal" };
    const testState = { someProp: "someOtherVal" };
    type State = typeof testDefaultState;
    const testActionType1 = "testActionType1";
    const testActionType2 = "testActionType2";
    const testActionType3 = "testActionType3";
    const testAction1 = { type: testActionType1 };
    const testAction2 = { type: testActionType2 };
    const testAction3 = { type: testActionType3 };
    const mockReducer1 = jest.fn();
    const mockReducer2 = jest.fn();
    const testReducers = new Map<string, Reducer<State, ReduxAction<string>>>();
    testReducers.set(testActionType1, mockReducer1);
    testReducers.set(testActionType2, mockReducer2);
    let stateReducer: DefaultStateReducer<State, string>;

    beforeEach(() => {
        mockReducer1.mockClear();
        mockReducer2.mockClear();
    });

    describe("without route", () => {
        beforeEach(() => {
            stateReducer = new DefaultStateReducer(
                testKey,
                testDefaultState,
                testReducers,
                testInstanceId
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
                expect(mockReducer2).toHaveBeenCalledWith(testState, testAction2);
            });
        });
    });

    describe("with route", () => {
        const wrongInstanceId = "WrongDefaultStatePublisherInstanceId";

        beforeEach(() => {
            stateReducer = new DefaultStateReducer(
                testKey,
                testDefaultState,
                testReducers,
                testInstanceId
            );
        });

        describe("reduceState", () => {
            it("returns default state if nothing passed and no action handler for passed action", () => {
                // Arrange
                const reducersMapObject = {};
                const extendedReducersMapObject = stateReducer.extend(reducersMapObject);

                // Act
                const newState = extendedReducersMapObject[testKey](undefined, withRoute(testInstanceId, testAction3));

                // Assert
                expect(newState).toBe(testDefaultState);
            });

            it("returns state if no action handler for passed action", () => {
                // Arrange
                const reducersMapObject = {};
                const extendedReducersMapObject = stateReducer.extend(reducersMapObject);

                // Act
                const newState = extendedReducersMapObject[testKey](testState, withRoute(testInstanceId, testAction3));

                // Assert
                expect(newState).toBe(testState);
            });

            it("returns state if route does not match", () => {
                // Arrange
                const reducersMapObject = {};
                const extendedReducersMapObject = stateReducer.extend(reducersMapObject);

                // Act
                const newState = extendedReducersMapObject[testKey](testState, withRoute(wrongInstanceId, testAction1));

                // Assert
                expect(newState).toBe(testState);
            });

            it("doesn't call action handler if route does not match", () => {
                // Arrange
                const reducersMapObject = {};
                const extendedReducersMapObject = stateReducer.extend(reducersMapObject);

                // Act
                extendedReducersMapObject[testKey](testState, withRoute(wrongInstanceId, testAction1));

                // Assert
                expect(mockReducer1).not.toBeCalled();
            });

            it("calls correct action handler", () => {
                // Arrange
                const reducersMapObject = {};
                const extendedReducersMapObject = stateReducer.extend(reducersMapObject);
                const routeAction = withRoute(testInstanceId, testAction2);

                // Act
                extendedReducersMapObject[testKey](testState, routeAction);

                // Assert
                expect(mockReducer2).toHaveBeenCalledWith(testState, testAction2);
            });
        });
    });

});