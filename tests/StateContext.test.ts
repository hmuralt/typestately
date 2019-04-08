import { combineReducers } from "redux";
import { skip, take } from "rxjs/operators";
import { createStateContext, StateBuildingBlock } from "../src/StateContext";
import { withDefaultStateToReduxReducer, withRouteReducer } from "../src/ReducerHelpers";
import { isRouteAction } from "../src/RouteAction";
import { createHubMocks } from "./Mocks";
import { StateReportType } from "../src/Hub";

jest.mock("redux");
jest.mock("../src/ReducerHelpers");

const testKey = "testKey";
const testDefaultState = {
  value: 0
};
const testStateKey = "testStateKey";
const testReducer = (state: typeof testDefaultState) => state;
const testDefaultStateReducer = (state: typeof testDefaultState) => state;
const testRouteReducer = (state: typeof testDefaultState) => state;
const testParentContextId = "testParentContextId";
const testStateBuildingBlock: StateBuildingBlock<typeof testDefaultState, string> = {
  key: testKey,
  defaultState: testDefaultState,
  stateKey: testStateKey,
  reducer: testReducer,
  routingOptions: undefined,
  parentContextId: testParentContextId
};
const {
  mockHub,
  mockDispatchingActionPublisher,
  mockDestructionPublisher,
  mockStateReportPublisher,
  mockStatePublisher,
  resetMocks
} = createHubMocks();

describe("StateContext", () => {
  beforeEach(() => {
    resetMocks();
  });

  describe("when created", () => {
    beforeEach(() => {
      (withDefaultStateToReduxReducer as jest.Mock).mockClear();
      (withDefaultStateToReduxReducer as jest.Mock).mockReturnValue(testDefaultStateReducer);
      (withRouteReducer as jest.Mock).mockClear();
      (withRouteReducer as jest.Mock).mockReturnValue(testRouteReducer);
    });

    describe("without reducer", () => {
      it("publishes registration without reducer", () => {
        // Arrange
        const testStateBuildingBlockWithoutReducer = { ...testStateBuildingBlock, reducer: undefined };

        // Act
        createStateContext(testStateBuildingBlockWithoutReducer, mockHub);

        // Assert
        expect(mockStateReportPublisher.publish).toHaveBeenCalledWith({
          type: StateReportType.Registration,
          parentContextId: testParentContextId,
          key: testKey,
          reducer: undefined
        });
      });
    });

    describe("with reducer", () => {
      it("publishes registration with reducer enhanced as default state reducer to parent", () => {
        // Arrange
        // Act
        createStateContext(testStateBuildingBlock, mockHub);

        // Assert
        expect(withDefaultStateToReduxReducer).toHaveBeenCalledWith(testDefaultState, testReducer);
        expect(mockStateReportPublisher.publish).toHaveBeenCalledWith({
          type: StateReportType.Registration,
          parentContextId: testParentContextId,
          key: testKey,
          reducer: testDefaultStateReducer
        });
      });
    });

    describe("with reducer and routing options", () => {
      it("publishes registration with reducer enhanced as routing default state reducer to parent", () => {
        // Arrange
        const testStateBuildingBlockWithRoutingOptions = { ...testStateBuildingBlock, routingOptions: new Map() };

        // Act
        createStateContext(testStateBuildingBlockWithRoutingOptions, mockHub);

        // Assert
        expect(withDefaultStateToReduxReducer).toHaveBeenCalledWith(testDefaultState, testReducer);
        expect(withRouteReducer).toHaveBeenCalledWith(
          expect.anything(),
          testDefaultStateReducer,
          testStateBuildingBlockWithRoutingOptions.routingOptions
        );
        expect(mockStateReportPublisher.publish).toHaveBeenCalledWith({
          type: StateReportType.Registration,
          parentContextId: testParentContextId,
          key: testKey,
          reducer: testRouteReducer
        });
      });
    });
  });

  describe("when sub state reducer is registered", () => {
    it("publishes updated reducer", () => {
      // Arrange
      const subStateKey = "substate1";
      const stateContext = createStateContext(testStateBuildingBlock, mockHub);
      const combinedReducer = (state: typeof testDefaultState) => state;
      (combineReducers as jest.Mock).mockReturnValue(combinedReducer);

      // Act
      mockStateReportPublisher.publish({
        type: StateReportType.Registration,
        parentContextId: stateContext.id,
        key: subStateKey,
        reducer: testReducer
      });

      // Assert
      expect(combineReducers).toHaveBeenCalled();
      expect(mockStateReportPublisher.publish).toHaveBeenCalledWith({
        type: StateReportType.Registration,
        parentContextId: testParentContextId,
        key: testKey,
        reducer: combinedReducer
      });
    });

    it("publishes its own state for sub states", () => {
      // Arrange
      const subStateKey = "substate1";
      const contextState = {
        [testStateKey]: { value: 1 },
        [subStateKey]: {}
      };
      const parentContextState = {
        [testKey]: contextState
      };
      const stateContext = createStateContext(testStateBuildingBlock, mockHub);
      mockStateReportPublisher.publish({
        type: StateReportType.Registration,
        parentContextId: stateContext.id,
        key: subStateKey,
        reducer: testReducer
      });

      // Act
      mockStatePublisher.publish({
        contextId: testParentContextId,
        state: parentContextState
      });

      // Assert
      expect(mockStatePublisher.publish).toHaveBeenCalledWith({
        contextId: stateContext.id,
        state: contextState
      });
    });
  });

  describe("when sub state reducer is deregistered", () => {
    it("publishes updated reducer", () => {
      // Arrange
      const subStateKey = "substate1";
      const stateContext = createStateContext(testStateBuildingBlock, mockHub);
      mockStateReportPublisher.publish({
        type: StateReportType.Registration,
        parentContextId: stateContext.id,
        key: subStateKey,
        reducer: testReducer
      });

      // Act
      mockStateReportPublisher.publish({
        type: StateReportType.Deregistration,
        parentContextId: stateContext.id,
        key: subStateKey
      });

      // Assert
      expect(mockStateReportPublisher.publish).toHaveBeenCalledWith({
        type: StateReportType.Registration,
        parentContextId: testParentContextId,
        key: testKey,
        reducer: testDefaultStateReducer
      });
    });
  });

  it("provides the last state", () => {
    // Arrange
    const stateContext = createStateContext(testStateBuildingBlock, mockHub);
    // Act
    // Assert
    expect(stateContext.state).toEqual(testDefaultState);
  });

  it("updates the state", () => {
    // Arrange
    const newState = { value: 1 };
    const parentContextState = {
      [testKey]: newState
    };
    const stateContext = createStateContext(testStateBuildingBlock, mockHub);

    // Act
    mockStatePublisher.publish({
      contextId: testParentContextId,
      state: parentContextState
    });

    // Assert
    expect(stateContext.state).toEqual(newState);
  });

  it("publishes the last state", (done) => {
    // Arrange
    const stateContext = createStateContext(testStateBuildingBlock, mockHub);

    // Act
    stateContext.state$.pipe(take(1)).subscribe((state) => {
      // Assert
      expect(state).toEqual(testDefaultState);
      done();
    });
  });

  it("publishes the updated state", (done) => {
    // Arrange
    const newState = { value: 1 };
    const parentContextState = {
      [testKey]: newState
    };
    const stateContext = createStateContext(testStateBuildingBlock, mockHub);

    stateContext.state$
      .pipe(
        skip(1),
        take(1)
      )
      .subscribe((state) => {
        // Assert
        expect(state).toEqual(newState);
        done();
      });

    // Act
    mockStatePublisher.publish({
      contextId: testParentContextId,
      state: parentContextState
    });
  });

  it("publishes only distinct states", () => {
    // Arrange
    const newState = { value: 1 };
    const parentContextState = {
      [testKey]: newState
    };
    const testUpdate = {
      contextId: testParentContextId,
      state: parentContextState
    };
    const stateContext = createStateContext(testStateBuildingBlock, mockHub);

    stateContext.state$.pipe(skip(2)).subscribe(() => {
      // Assert
      fail("State published although not changed");
    });

    // Act
    mockStatePublisher.publish(testUpdate);
    mockStatePublisher.publish(testUpdate);
  });

  it("publishes actions to be dispatched to parent", () => {
    // Arrange
    const testAction = { type: "testAction" };
    const stateContext = createStateContext(testStateBuildingBlock, mockHub);

    // Act
    stateContext.dispatch(testAction);

    // Assert
    expect(mockDispatchingActionPublisher.publish).toHaveBeenCalledWith({
      parentContextId: testParentContextId,
      action: testAction
    });
  });

  it("publishes routed actions", () => {
    // Arrange
    const testAction = { type: "testAction" };
    const stateContext = createStateContext(testStateBuildingBlock, mockHub);

    // Act
    stateContext.dispatch(testAction, true);

    // Assert
    expect(mockDispatchingActionPublisher.publish).toHaveBeenCalled();
    expect(mockDispatchingActionPublisher.publish.mock.calls[0][0].parentContextId).toBe(testParentContextId);
    expect(isRouteAction(mockDispatchingActionPublisher.publish.mock.calls[0][0].action)).toBeTruthy();
  });

  it("redirects dispatching actions from itself to parent", () => {
    // Arrange
    const testAction = { type: "testAction" };
    const stateContext = createStateContext(testStateBuildingBlock, mockHub);

    // Act
    mockDispatchingActionPublisher.publish({
      parentContextId: stateContext.id,
      action: testAction
    });

    // Assert
    expect(mockDispatchingActionPublisher.publish).toHaveBeenCalledWith({
      parentContextId: testParentContextId,
      action: testAction
    });
  });

  describe("when parent destroyed", () => {
    it("publishes deregistration", () => {
      // Arrange
      createStateContext(testStateBuildingBlock, mockHub);

      // Act
      mockDestructionPublisher.publish({
        contextId: testParentContextId
      });

      // Assert
      expect(mockStateReportPublisher.publish).toHaveBeenCalledWith({
        type: StateReportType.Deregistration,
        parentContextId: testParentContextId,
        key: testKey
      });
    });

    it("publishes its destruction", () => {
      // Arrange
      const stateContext = createStateContext(testStateBuildingBlock, mockHub);

      // Act
      mockDestructionPublisher.publish({
        contextId: testParentContextId
      });

      // Assert
      expect(mockDestructionPublisher.publish).toHaveBeenCalledWith({
        contextId: stateContext.id
      });
    });
  });

  describe("when destroyed", () => {
    it("publishes deregistration", () => {
      // Arrange
      const stateContext = createStateContext(testStateBuildingBlock, mockHub);

      // Act
      stateContext.destroy();

      // Assert
      expect(mockStateReportPublisher.publish).toHaveBeenCalledWith({
        type: StateReportType.Deregistration,
        parentContextId: testParentContextId,
        key: testKey
      });
    });

    it("publishes its destruction", () => {
      // Arrange
      const stateContext = createStateContext(testStateBuildingBlock, mockHub);

      // Act
      stateContext.destroy();

      // Assert
      expect(mockDestructionPublisher.publish).toHaveBeenCalledWith({
        contextId: stateContext.id
      });
    });

    it("does not publish updated reducer anymore", () => {
      // Arrange
      const subStateKey = "substate1";
      const stateContext = createStateContext(testStateBuildingBlock, mockHub);
      stateContext.destroy();

      // Act
      mockStateReportPublisher.publish({
        type: StateReportType.Registration,
        parentContextId: stateContext.id,
        key: subStateKey,
        reducer: testReducer
      });

      // Assert
      expect(mockStateReportPublisher.publish).not.toHaveBeenCalledWith({
        type: StateReportType.Registration,
        parentContextId: testParentContextId,
        key: testKey,
        reducer: testRouteReducer
      });
    });

    it("does not publish its own state for sub states anymore", () => {
      // Arrange
      const subStateKey = "substate1";
      const contextState = {
        [testStateKey]: { value: 1 },
        [subStateKey]: {}
      };
      const parentContextState = {
        [testKey]: contextState
      };
      const stateContext = createStateContext(testStateBuildingBlock, mockHub);
      mockStateReportPublisher.publish({
        type: StateReportType.Registration,
        parentContextId: stateContext.id,
        key: subStateKey,
        reducer: testReducer
      });

      stateContext.destroy();

      const subscription = mockStateReportPublisher.notification$.subscribe(() => {
        // Assert
        fail();
      });

      // Act
      mockStatePublisher.publish({
        contextId: testParentContextId,
        state: parentContextState
      });

      subscription.unsubscribe();
    });

    it("does not publish the updated state anymore", () => {
      // Arrange
      const newState = { value: 1 };
      const parentContextState = {
        [testKey]: newState
      };
      const stateContext = createStateContext(testStateBuildingBlock, mockHub);
      stateContext.destroy();

      const subscription = stateContext.state$.pipe(skip(1)).subscribe(() => {
        // Assert
        fail();
      });

      // Act
      mockStatePublisher.publish({
        contextId: testParentContextId,
        state: parentContextState
      });

      subscription.unsubscribe();
    });

    it("doesn't redirect dispatching actions from itself to parent anymore", () => {
      // Arrange
      const testAction = { type: "testAction" };
      const stateContext = createStateContext(testStateBuildingBlock, mockHub);
      stateContext.destroy();

      const subscription = mockDispatchingActionPublisher.notification$.pipe(skip(1)).subscribe(() => {
        // Assert
        fail();
      });

      // Act
      mockDispatchingActionPublisher.publish({
        parentContextId: stateContext.id,
        action: testAction
      });

      subscription.unsubscribe();
    });
  });
});
