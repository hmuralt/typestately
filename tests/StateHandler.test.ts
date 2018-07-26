import { Dispatch, Reducer } from "redux";
import StateHandler from "../src/StateHandler";
import DoNothingStateReducer from "../src/DoNothingStateReducer";
import DefaultStateReducer, { ReducerFunction } from "../src/DefaultStateReducer";
import NestingStateReducer from "../src/NestingStateReducer";
import DefaultStatePublisher from "../src/DefaultStatePublisher";
import NestingStatePublisher from "../src/NestingStatePublisher";
import { RouteAction } from "../src/WithRoute";

// tslint:disable:no-any

jest.mock("../src/DefaultStateReducer");

const testKey = "testKey";
const testState = {};
const testAction = {
    type: "TEST_ACTION"
};

class TestStateHandler extends StateHandler {
    // tslint:disable-next-line:no-any
    constructor(reducerFunctions = new Map<any, ReducerFunction<{}, string>>(), nestedStateHandlers: StateHandler[] = []) {
        super(testKey, testState);

        for (const reducer of reducerFunctions) {
            this.addReducer(reducer[0], reducer[1].reduce, reducer[1].routingOptions);
        }

        for (const nestedStateHandler of nestedStateHandlers) {
            this.addNestedStateHandler(nestedStateHandler);
        }
    }

    public dispatchAction() {
        this.dispatch(testAction);
    }

    public dispatchActionToThisInstance() {
        this.dispatch(testAction, this.instanceId);
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
    let testReducerFunctions: Map<any, ReducerFunction<{}, string>>;

    beforeEach(() => {
        testReducerFunctions = new Map();
        (DefaultStateReducer as any).mockClear();
    });

    describe("stateReducer", () => {
        it("gets reducerFunctions with passed route options", () => {
            // Arrange
            const routingOptions = { isForOtherInstances: true, isRoutedOnly: true };
            testReducerFunctions.set("test", { reduce: (state, action) => state, routingOptions });
            const stateHandler = new TestStateHandler(testReducerFunctions);

            // Act
            const stateReducer = stateHandler.stateReducer;

            // Assert
            const passedReducerFunctions = (DefaultStateReducer as any).mock.calls[0][2];
            const testReducerFunction = passedReducerFunctions.get("test") as ReducerFunction<{}, string>;
            expect(stateReducer).toBeInstanceOf(DefaultStateReducer);
            expect(testReducerFunction.routingOptions).toBe(routingOptions);
        });

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
            testReducerFunctions.set("test", { reduce: (state, action) => state });
            const stateHandler = new TestStateHandler(testReducerFunctions);

            // Act
            const stateReducer = stateHandler.stateReducer;

            // Assert
            expect(stateReducer).toBeInstanceOf(DefaultStateReducer);
        });

        it("is NestingStateReducer when there are reducers and nested states", () => {
            // Arrange
            testReducerFunctions.set("test", { reduce: (state, action) => state });
            const stateHandler = new TestStateHandler(testReducerFunctions, [new NestedTestStateHandler()]);

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
            const stateHandler = new TestStateHandler(testReducerFunctions, [new NestedTestStateHandler()]);

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
            const stateHandler = new TestStateHandler(testReducerFunctions, [nestedStateHandler]);
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