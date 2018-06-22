import StateDefinition from "../src/StateDefinition";
import DoNothingStateReducer from "../src/DoNothingStateReducer";
import DefaultStateReducer from "../src/DefaultStateReducer";
import DefaultStatePublisher from "../src/DefaultStatePublisher";
import NestingStateReducer from "../src/NestingStateReducer";
import NestingStatePublisher from "../src/NestingStatePublisher";
import coreRegistry from "../src/CoreRegistry";

const mockDispatch = jest.fn();

jest.mock("../src/CoreRegistry", () => ({
    default: {
        getStore: jest.fn(() => mockDispatch),
        registerState: jest.fn()
    }
}));

// tslint:disable:no-empty no-any
describe("StateDefinition", () => {
    const testKey = "testKey";
    const testActionType = "testActionType";
    const testStoreId = "testStoreId";
    const testAction = {
        type: testActionType
    };
    const testDefaultState = {
        someProp: "withSomeVal"
    };
    type State = typeof testDefaultState;
    const testNestedState = new StateDefinition("nestedStateKey", {});

    beforeEach(() => {
        (coreRegistry.getStore as any).mockClear();
        (coreRegistry.registerState as any).mockClear();
    });

    describe("buildOnStore", () => {
        it("Gets the correct store", () => {
             // Arrange
             const stateDefinition = new StateDefinition(testKey, testDefaultState);

             // Act
             stateDefinition.buildOnStore(testStoreId);

             // Assert
             const getStoreCall = (coreRegistry.getStore as any).mock.calls[0];
             expect(getStoreCall[0]).toBe(testStoreId);
        });

        describe("without reducer functions", () => {
            it("returns DoNothingStateReducer", () => {
                // Arrange
                const stateDefinition = new StateDefinition(testKey, testDefaultState);

                // Act
                stateDefinition.buildOnStore(testStoreId);

                // Assert
                const regsiterStateCall = (coreRegistry.registerState as any).mock.calls[0];
                expect(regsiterStateCall[1] as DoNothingStateReducer).not.toBeNull();
            });
        });

        describe("without nested state", () => {
            it("returns DefaultStateReducer", () => {
                // Arrange
                const stateDefinition = new StateDefinition<State, string>(testKey, testDefaultState)
                    .withReducerFor<typeof testAction>(testActionType, (state) => state);

                // Act
                stateDefinition.buildOnStore(testStoreId);

                // Assert
                const regsiterStateCall = (coreRegistry.registerState as any).mock.calls[0];
                expect(regsiterStateCall[1] as DefaultStateReducer<State, string>).not.toBeNull();
            });

            it("returns DefaultStatePublisher", () => {
                // Arrange
                const stateDefinition = new StateDefinition<State, string>(testKey, testDefaultState)
                    .withReducerFor<typeof testAction>(testActionType, (state) => state);

                // Act
                stateDefinition.buildOnStore(testStoreId);

                // Assert
                const regsiterStateCall = (coreRegistry.registerState as any).mock.calls[0];
                expect(regsiterStateCall[2] as DefaultStatePublisher<State>).not.toBeNull();
            });
        });

        describe("with nested state", () => {
            it("returns NestingStateReducer", () => {
                // Arrange
                const stateDefinition = new StateDefinition<State, string>(testKey, testDefaultState)
                    .withReducerFor<typeof testAction>(testActionType, (state) => state)
                    .withNestedState(testNestedState);

                // Act
                stateDefinition.buildOnStore(testStoreId);

                // Assert
                const regsiterStateCall = (coreRegistry.registerState as any).mock.calls[0];
                expect(regsiterStateCall[1] as NestingStateReducer<State, string>).not.toBeNull();
            });

            it("returns NestingStatePublisher", () => {
                // Arrange
                const stateDefinition = new StateDefinition<State, string>(testKey, testDefaultState)
                    .withReducerFor<typeof testAction>(testActionType, (state) => state)
                    .withNestedState(testNestedState);

                // Act
                const result = stateDefinition.buildOnStore(testStoreId);

                // Assert
                const regsiterStateCall = (coreRegistry.registerState as any).mock.calls[0];
                expect(regsiterStateCall[2] as NestingStatePublisher<State>).not.toBeNull();
            });
        });
    });
});