import { skip } from "rxjs/operators";
import { StateContext, createStateContext } from "../src/core/StateContext";
import { createStateDefinition, defaultStateKey } from "../src/core/StateDefinition";
import { createHubMocks } from "./Mocks";
import { BehaviorSubject } from "rxjs";
import RoutingOption from "../src/core/RoutingOption";
import { storeContextId } from "../src/core/StoreContext";
import { withDefaultStateToReduxReducer } from "../src/core/ReducerHelpers";

jest.mock("../src/core/StateContext");
jest.mock("../src/core/ReducerHelpers");

const testDefaultState = {
  value: 234
};

type TestState = typeof testDefaultState;

const testStateOperations = {
  update(state: TestState, newValue: number) {
    return {
      ...state,
      value: newValue
    };
  }
};

const testStoreKey = "testStoreKey";
const testAction = jest.fn();
const testReducer = jest.fn();
const testReducerBuilder = jest.fn();
testReducerBuilder.mockReturnValue(testReducer);
const testReduxReducer = jest.fn();

const testStateContext: StateContext<TestState, string> = {
  id: "asdf",
  state: testDefaultState,
  state$: new BehaviorSubject(testDefaultState),
  dispatch: jest.fn(),
  destroy: jest.fn()
};

const {
  mockHub,
  // mockDispatchingActionPublisher,
  // mockDestructionPublisher,
  // mockStateReportPublisher,
  // mockStatePublisher,
  resetMocks
} = createHubMocks();

describe("StateDefinition", () => {
  describe("createStandaloneStateHandler", () => {
    it("returns state handler", () => {
      // Arrange
      const stateDefinition = createStateDefinition(testDefaultState, testStateOperations);

      // Act
      const standaloneStateHandler = stateDefinition.createStandaloneStateHandler();

      // Assert
      expect(standaloneStateHandler.state).toBeDefined();
      expect(standaloneStateHandler.state$).toBeDefined();
      expect(standaloneStateHandler.update).toBeDefined();
    });

    describe("standalone state handler", () => {
      it("returns default state per default", () => {
        // Arrange
        const stateDefinition = createStateDefinition(testDefaultState, testStateOperations);

        // Act
        const standaloneStateHandler = stateDefinition.createStandaloneStateHandler();

        // Assert
        expect(standaloneStateHandler.state).toBe(testDefaultState);
      });

      it("updates state after state operation call", () => {
        // Arrange
        const stateDefinition = createStateDefinition(testDefaultState, testStateOperations);
        const standaloneStateHandler = stateDefinition.createStandaloneStateHandler();
        const newTestValue = 2233;

        // Act
        standaloneStateHandler.update(newTestValue);

        // Assert
        expect(standaloneStateHandler.state).toEqual({ value: newTestValue });
      });

      it("notifies observer upon subscription", (done) => {
        // Arrange
        const stateDefinition = createStateDefinition(testDefaultState, testStateOperations);
        const standaloneStateHandler = stateDefinition.createStandaloneStateHandler();

        // Act
        standaloneStateHandler.state$.subscribe((state) => {
          // Assert
          expect(state).toEqual(testDefaultState);
          done();
        });
      });

      it("notifies observer on state change", (done) => {
        // Arrange
        const stateDefinition = createStateDefinition(testDefaultState, testStateOperations);
        const standaloneStateHandler = stateDefinition.createStandaloneStateHandler();
        const newTestValue = 2233;

        standaloneStateHandler.state$.pipe(skip(1)).subscribe((state) => {
          // Assert
          expect(state).toEqual({ value: newTestValue });
          done();
        });

        // Act
        standaloneStateHandler.update(newTestValue);
      });
    });
  });

  describe("createStateHandler", () => {
    beforeEach(() => {
      resetMocks();
      (createStateContext as jest.Mock).mockClear();
      (createStateContext as jest.Mock).mockReturnValue(testStateContext);
      (withDefaultStateToReduxReducer as jest.Mock).mockClear();
      (withDefaultStateToReduxReducer as jest.Mock).mockReturnValue(testReduxReducer);
    });

    it("returns state handler", () => {
      // Arrange
      const stateDefinition = createStateDefinition(testDefaultState, testStateOperations);

      // Act
      const stateHandler = stateDefinition
        .setStoreKey(testStoreKey)
        .setActions({ update: testAction })
        .setReducer(testReducerBuilder)
        .createStateHandler(mockHub);

      // Assert
      expect(stateHandler.id).toBeDefined();
      expect(stateHandler.state).toBeDefined();
      expect(stateHandler.state$).toBeDefined();
      expect(stateHandler.update).toBeDefined();
      expect(stateHandler.dispatch).toBeDefined();
      expect(stateHandler.destroy).toBeDefined();
    });

    it("creates correct state context", () => {
      // Arrange
      const stateDefinition = createStateDefinition(testDefaultState, testStateOperations);
      const testRoutingOptions = new Map<string, RoutingOption>();

      // Act
      stateDefinition
        .setStoreKey(testStoreKey)
        .setActions({ update: testAction })
        .setReducer(testReducerBuilder, testRoutingOptions)
        .createStateHandler(mockHub);

      // Assert
      expect(createStateContext).toHaveBeenCalledWith(
        {
          key: testStoreKey,
          stateKey: defaultStateKey,
          defaultState: testDefaultState,
          reducer: testReduxReducer,
          routingOptions: testRoutingOptions,
          parentContextId: storeContextId
        },
        mockHub
      );
    });

    describe("state handler", () => {
      it("calls action dispatcher with dispatch and arguments", () => {
        // Arrange
        const stateDefinition = createStateDefinition(testDefaultState, testStateOperations);
        const newTestValue = 123;
        const stateHandler = stateDefinition
          .setStoreKey(testStoreKey)
          .setActions({ update: testAction })
          .setReducer(testReducerBuilder)
          .createStateHandler(mockHub);

        // Act
        stateHandler.update(newTestValue);

        // Assert
        expect(testAction).toHaveBeenCalledWith(testStateContext.dispatch, newTestValue);
      });
    });
  });
});
