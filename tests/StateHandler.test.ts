import { Dispatch } from "redux";
import StateHandler from "../src/StateHandler";
import DoNothingStateReducer from "../src/DoNothingStateReducer";
import DefaultStateReducer from "../src/DefaultStateReducer";
import NestingStateReducer from "../src/NestingStateReducer";
import DefaultStatePublisher from "../src/DefaultStatePublisher";
import NestingStatePublisher from "../src/NestingStatePublisher";
import { RouteAction } from "../src/WithRoute";

const testKey = "testKey";
const testState = {};
const testAction = {
    type: "TEST_ACTION"
};
let getReducers = () => new Map();
let getNestedStateHandlers = () => [];

class TestStateHandler extends StateHandler {
    constructor() {
        super(testKey, testState);
    }

    public dispatchAction() {
        this.dispatch(testAction);
    }

    public dispatchActionToThisInstance() {
        this.dispatchToThisInstance(testAction);
    }

    protected getReducers() {
        return getReducers();
    }

    protected getNestedStateHandlers() {
        return getNestedStateHandlers();
    }
}

class NestedTestStateHandler extends StateHandler {
    public setDispatchCallback: Dispatch;

    constructor() {
        super(testKey, testState);
    }

    public onDispatch(callback: Dispatch) {
        this.setDispatchCallback = callback;
    }

    protected getReducers() {
        return new Map();
    }

    protected getNestedStateHandlers() {
        return [];
    }
}

describe("StateHandler", () => {
    describe("stateReducer", () => {
        it("is DoNothingStateReducer when there are no reducers", () => {
            // Arrange
            const stateHandler = new TestStateHandler();

            // Act
            const stateReducer = stateHandler.stateReducer;

            // Assert
            expect(stateReducer).toBeInstanceOf(DoNothingStateReducer);
        });

        it("is DefaultStateReducer when there are reducers and no nested states", () => {
            // Arrange
            getReducers = () => new Map([["test", (state, action) => state]]);
            const stateHandler = new TestStateHandler();

            // Act
            const stateReducer = stateHandler.stateReducer;

            // Assert
            expect(stateReducer).toBeInstanceOf(DefaultStateReducer);
        });

        it("is NestingStateReducer when there are reducers and nested states", () => {
            // Arrange
            getReducers = () => new Map([["test", (state, action) => state]]);
            getNestedStateHandlers = () => [new NestedTestStateHandler()];
            const stateHandler = new TestStateHandler();

            // Act
            const stateReducer = stateHandler.stateReducer;

            // Assert
            expect(stateReducer).toBeInstanceOf(NestingStateReducer);
        });
    });

    describe("statePublisher", () => {
        it("is DefaultStatePublisher when there are no nested states", () => {
            // Arrange
            const stateHandler = new TestStateHandler();

            // Act
            const statePublisher = stateHandler.statePublisher;

            // Assert
            expect(statePublisher).toBeInstanceOf(DefaultStatePublisher);
        });

        it("is NestingStatePublisher when there are nested states", () => {
            // Arrange
            getNestedStateHandlers = () => [new NestedTestStateHandler()];
            const stateHandler = new TestStateHandler();

            // Act
            const statePublisher = stateHandler.statePublisher;

            // Assert
            expect(statePublisher).toBeInstanceOf(NestingStatePublisher);
        });
    });

    describe("stateProvider", () => {
        it("is defined", () => {
            // Arrange
            const stateHandler = new TestStateHandler();

            // Act
            const stateProvider = stateHandler.stateProvider;

            // Assert
            expect(stateProvider).toBeDefined();
        });
    });

    describe("onDispatch", () => {
        it("sets callback on nested handlers", () => {
            // Arrange
            const nestedStateHandler = new NestedTestStateHandler();
            getNestedStateHandlers = () => [nestedStateHandler];
            const stateHandler = new TestStateHandler();
            const mockDispatchCallback = jest.fn();

            // Act
            stateHandler.onDispatch(mockDispatchCallback);

            // Assert
            expect(nestedStateHandler.setDispatchCallback).toBe(mockDispatchCallback);
        });

        it("callback is called when action needs to be dispatched", () => {
            // Arrange
            const stateHandler = new TestStateHandler();
            const mockDispatchCallback = jest.fn();

            // Act
            stateHandler.onDispatch(mockDispatchCallback);
            stateHandler.dispatchAction();

            // Assert
            expect(mockDispatchCallback).toHaveBeenCalledWith(testAction);
        });

        it("callback is called with route action when action needs to be dispatched to own state instance", () => {
            // Arrange
            const stateHandler = new TestStateHandler();
            const mockDispatchCallback = jest.fn();

            // Act
            stateHandler.onDispatch(mockDispatchCallback);
            stateHandler.dispatchActionToThisInstance();

            // Assert
            expect(mockDispatchCallback).toHaveBeenCalled();
            const dispatchedAction = mockDispatchCallback.mock.calls[0][0] as RouteAction;
            expect(dispatchedAction.identifier).toBeDefined();
            expect(dispatchedAction.action).toBe(testAction);
        });
    });
});