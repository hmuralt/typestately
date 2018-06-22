import StateDefinition from "../src/StateDefinition";
import DoNothingStateReducer from "../src/DoNothingStateReducer";
import DefaultStateReducer from "../src/DefaultStateReducer";
import DefaultStatePublisher from "../src/DefaultStatePublisher";
import NestingStateReducer from "../src/NestingStateReducer";
import NestingStatePublisher from "../src/NestingStatePublisher";

// tslint:disable:no-empty no-any
describe("StateDefinition", () => {
    const testKey = "testKey";
    const testActionType = "testActionType";
    const testAction = {
        type: testActionType
    };
    const testDefaultState = {
        someProp: "withSomeVal"
    };
    type State = typeof testDefaultState;
    const testNestedState = new StateDefinition("nestedStateKey", {});

    describe("build", () => {
        describe("without reducer functions", () => {
            it("returns DoNothingStateReducer", () => {
                // Arrange
                const stateDefinition = new StateDefinition(testKey, testDefaultState);

                // Act
                const result = stateDefinition.build();

                // Assert
                expect(result.reducer as DoNothingStateReducer).not.toBeNull();
            });
        });

        describe("without nested state", () => {
            it("returns DefaultStateReducer", () => {
                // Arrange
                const stateDefinition = new StateDefinition<State, string>(testKey, testDefaultState)
                    .withReducerFor<typeof testAction>(testActionType, (state) => state);

                // Act
                const result = stateDefinition.build();

                // Assert
                expect(result.reducer as DefaultStateReducer<State, string>).not.toBeNull();
            });

            it("returns DefaultStatePublisher", () => {
                // Arrange
                const stateDefinition = new StateDefinition<State, string>(testKey, testDefaultState)
                    .withReducerFor<typeof testAction>(testActionType, (state) => state);

                // Act
                const result = stateDefinition.build();

                // Assert
                expect(result.publisher as DefaultStatePublisher<State>).not.toBeNull();
            });
        });

        describe("with nested state", () => {
            it("returns NestingStateReducer", () => {
                // Arrange
                const stateDefinition = new StateDefinition<State, string>(testKey, testDefaultState)
                    .withReducerFor<typeof testAction>(testActionType, (state) => state)
                    .withNestedState(testNestedState);

                // Act
                const result = stateDefinition.build();

                // Assert
                expect(result.reducer as NestingStateReducer<State, string>).not.toBeNull();
            });

            it("returns NestingStatePublisher", () => {
                // Arrange
                const stateDefinition = new StateDefinition<State, string>(testKey, testDefaultState)
                    .withReducerFor<typeof testAction>(testActionType, (state) => state)
                    .withNestedState(testNestedState);

                // Act
                const result = stateDefinition.build();

                // Assert
                expect(result.publisher as NestingStatePublisher<State>).not.toBeNull();
            });
        });
    });
});