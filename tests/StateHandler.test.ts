import { Dispatch, Reducer } from "redux";
import StateHandler from "../src/StateHandler";
import DoNothingStateReducer from "../src/DoNothingStateReducer";
import DefaultStateReducer, { ReducerSetup } from "../src/DefaultStateReducer";
import NestingStateReducer from "../src/NestingStateReducer";
import { RouteAction } from "../src/WithRoute";
import { Observable, Subject } from "rxjs";

// tslint:disable:no-any

jest.mock("../src/DefaultStateReducer");

const testStateKey = "state";
const testKey = "testKey";
const testDefaultState = {};
const nestedTestKey = "nestedTestKey";
const nestedTestDefaultState = {};
const testAction = {
    type: "TEST_ACTION"
};
const nestedTestAction = {
    type: "TEST_ACTION"
};

class TestStateHandler extends StateHandler {
    // tslint:disable-next-line:no-any
    constructor(reducerSetups = new Map<any, ReducerSetup<{}, string>>(), nestedStateHandlers: StateHandler[] = []) {
        super(testKey, testDefaultState, testStateKey);

        for (const reducer of reducerSetups) {
            this.addReducer(reducer[0], reducer[1].reducer, reducer[1].routingOptions);
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
        super(nestedTestKey, nestedTestDefaultState);
    }

    public dispatchAction() {
        this.dispatch(nestedTestAction);
    }
}

describe("StateHandler", () => {
    describe("connector.stateReducer", () => {
        let testReducerSetups: Map<any, ReducerSetup<{}, string>>;

        beforeEach(() => {
            testReducerSetups = new Map();
            (DefaultStateReducer as any).mockClear();
        });

        it("gets reducerSetups with passed route options", () => {
            // Arrange
            const routingOptions = { isForOtherInstances: true, isRoutedOnly: true };
            testReducerSetups.set("test", { reducer: (state, action) => state, routingOptions });
            const stateHandler = new TestStateHandler(testReducerSetups);

            // Act
            const stateReducer = stateHandler.connector.stateReducer;

            // Assert
            const passedReducerSetups = (DefaultStateReducer as any).mock.calls[0][2];
            const testReducerSetup = passedReducerSetups.get("test") as ReducerSetup<{}, string>;
            expect(stateReducer).toBeInstanceOf(DefaultStateReducer);
            expect(testReducerSetup.routingOptions).toBe(routingOptions);
        });

        it("is DoNothingStateReducer when there are no reducers", () => {
            // Arrange
            const stateHandler = new TestStateHandler();

            // Act
            const stateReducer = stateHandler.connector.stateReducer;

            // Assert
            expect(stateReducer).toBeInstanceOf(DoNothingStateReducer);
        });

        it("is DefaultStateReducer when there are reducers and no nested states", () => {
            // Arrange
            testReducerSetups.set("test", { reducer: (state, action) => state });
            const stateHandler = new TestStateHandler(testReducerSetups);

            // Act
            const stateReducer = stateHandler.connector.stateReducer;

            // Assert
            expect(stateReducer).toBeInstanceOf(DefaultStateReducer);
        });

        it("is NestingStateReducer when there are reducers and nested states", () => {
            // Arrange
            testReducerSetups.set("test", { reducer: (state, action) => state });
            const stateHandler = new TestStateHandler(testReducerSetups, [new NestedTestStateHandler()]);

            // Act
            const stateReducer = stateHandler.connector.stateReducer;

            // Assert
            expect(stateReducer).toBeInstanceOf(NestingStateReducer);
        });
    });

    describe("without nested states", () => {
        const testStoreState = {
            [testKey]: {}
        };
        let testState$: Subject<typeof testStoreState>;

        beforeEach(() => {
            testState$ = new Subject<typeof testStoreState>();
        });

        describe("state", () => {
            it("returns default state when not connected", () => {
                // Arrange
                const stateHandler = new TestStateHandler();

                // Act
                const result = stateHandler.state;

                // Assert
                expect(result).toBe(testDefaultState);
            });

            it("returns current state when connected", () => {
                // Arrange
                const stateHandler = new TestStateHandler();
                stateHandler.connector.setState$(testState$);
                testState$.next(testStoreState);

                // Act
                const result = stateHandler.state;

                // Assert
                expect(result).toBe(testStoreState[testKey]);
            });
        });

        describe("state$", () => {
            it("passes current state to listeners", () => {
                // Arrange
                const stateHandler = new TestStateHandler();
                let result;
                stateHandler.state$.subscribe((state) => result = state);
                stateHandler.connector.setState$(testState$);

                // Act
                testState$.next(testStoreState);

                // Assert
                expect(result).toBe(testStoreState[testKey]);
            });
        });

        describe("dispatchAction", () => {
            let mockDispatch: jest.Mock;

            beforeEach(() => {
                mockDispatch = jest.fn();
            });

            it("calls dispatch with action", () => {
                // Arrange
                const stateHandler = new TestStateHandler();
                stateHandler.connector.setDispatch(mockDispatch);

                // Act
                stateHandler.dispatchAction();

                // Assert
                expect(mockDispatch).toHaveBeenCalledWith(testAction);
            });

            it("calls dispatch with route action when action needs to be dispatched to own state instance", () => {
                // Arrange
                const stateHandler = new TestStateHandler();
                stateHandler.connector.setDispatch(mockDispatch);

                // Act
                stateHandler.dispatchActionToThisInstance();

                // Assert
                expect(mockDispatch).toHaveBeenCalled();
                const dispatchedAction = mockDispatch.mock.calls[0][0] as RouteAction;
                expect(dispatchedAction.identifier).toBeDefined();
                expect(dispatchedAction.action).toBe(testAction);
            });
        });
    });

    describe("with nested states", () => {
        const testStoreState = {
            [testKey]: {
                [testStateKey]: {},
                [nestedTestKey]: {}
            }
        };
        let testState$: Subject<typeof testStoreState>;

        beforeEach(() => {
            testState$ = new Subject<typeof testStoreState>();
        });

        describe("state", () => {
            it("returns default state when not connected", () => {
                // Arrange
                const nestedStateHandler = new NestedTestStateHandler();
                const stateHandler = new TestStateHandler(new Map<any, ReducerSetup<{}, string>>(), [nestedStateHandler]);

                // Act
                const result = stateHandler.state;
                const nestedResult = nestedStateHandler.state;

                // Assert
                expect(result).toBe(testDefaultState);
                expect(nestedResult).toBe(nestedTestDefaultState);
            });

            it("returns current state when connected", () => {
                // Arrange
                const nestedStateHandler = new NestedTestStateHandler();
                const stateHandler = new TestStateHandler(new Map<any, ReducerSetup<{}, string>>(), [nestedStateHandler]);
                stateHandler.connector.setState$(testState$);
                testState$.next(testStoreState);

                // Act
                const result = stateHandler.state;
                const nestedResult = nestedStateHandler.state;

                // Assert
                expect(result).toBe(testStoreState[testKey][testStateKey]);
                expect(nestedResult).toBe(testStoreState[testKey][nestedTestKey]);
            });
        });

        describe("state$", () => {
            it("passes current state to listeners", () => {
                // Arrange
                const nestedStateHandler = new NestedTestStateHandler();
                let nestedResult;
                nestedStateHandler.state$.subscribe((state) => nestedResult = state);
                const stateHandler = new TestStateHandler(new Map<any, ReducerSetup<{}, string>>(), [nestedStateHandler]);
                let result;
                stateHandler.state$.subscribe((state) => result = state);
                stateHandler.connector.setState$(testState$);

                // Act
                testState$.next(testStoreState);

                // Assert
                expect(result).toBe(testStoreState[testKey][testStateKey]);
                expect(nestedResult).toBe(testStoreState[testKey][nestedTestKey]);
            });
        });

        describe("dispatchAction", () => {
            let mockDispatch: jest.Mock;

            beforeEach(() => {
                mockDispatch = jest.fn();
            });

            it("calls dispatch with action", () => {
                // Arrange
                const nestedStateHandler = new NestedTestStateHandler();
                const stateHandler = new TestStateHandler(new Map<any, ReducerSetup<{}, string>>(), [nestedStateHandler]);
                stateHandler.connector.setDispatch(mockDispatch);

                // Act
                stateHandler.dispatchAction();
                nestedStateHandler.dispatchAction();

                // Assert
                expect(mockDispatch).toHaveBeenCalledWith(testAction);
                expect(mockDispatch).toHaveBeenCalledWith(nestedTestAction);
            });

            it("calls dispatch with route action when action needs to be dispatched to own state instance", () => {
                // Arrange
                const stateHandler = new TestStateHandler();
                stateHandler.connector.setDispatch(mockDispatch);

                // Act
                stateHandler.dispatchActionToThisInstance();

                // Assert
                expect(mockDispatch).toHaveBeenCalled();
                const dispatchedAction = mockDispatch.mock.calls[0][0] as RouteAction;
                expect(dispatchedAction.identifier).toBeDefined();
                expect(dispatchedAction.action).toBe(testAction);
            });
        });
    });

});