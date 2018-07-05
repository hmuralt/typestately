import { Action as ReduxAction, Reducer } from "redux";
import NestingStateReducer from "../src/NestingStateReducer";
import StateReducer from "../src/StateReducer";

// tslint:disable:no-any
describe("NestingStateReducer", () => {
    const testKey = "theKey";
    const testInstanceId = "testInstanceId";
    const testStateKey = "testStateKey";
    const testDefaultState = { someProp: "someVal" };
    type State = typeof testDefaultState;
    const testReducers = new Map<string, Reducer<State, ReduxAction<string>>>();
    const mockReducer = jest.fn((state) => state || {});
    const mockNestedStateReducer: StateReducer = {
        extend: (reducersMapObject) => Object.assign(reducersMapObject, { mockReducer })
    };
    let stateReducer: NestingStateReducer<State, string>;

    beforeEach(() => {
        stateReducer = new NestingStateReducer(
            testKey,
            testDefaultState,
            testReducers,
            testInstanceId,
            testStateKey,
            [mockNestedStateReducer]
        );
    });

    describe("extend", () => {
        it("adds new reducers map object to passed reducers map object under passed test key", () => {
            // Arrange
            const reducersMapObject = {};

            // Act
            const extendedReducersMapObject = stateReducer.extend(reducersMapObject);

            // Assert
            expect(extendedReducersMapObject[testKey]).toBeDefined();
        });

        it("combines nested reducer", () => {
            // Arrange
            const reducersMapObject = {};

            // Act
            stateReducer.extend(reducersMapObject);

            // Assert
            expect(mockReducer).toHaveBeenCalled();
        });
    });

});