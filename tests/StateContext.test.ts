jest.mock("redux");
jest.mock("../src/ReducerHelpers");

import { combineReducers } from "redux";
import { filter, take, skip } from "rxjs/operators";
import { createStateContext, StateBuildingBlock } from "../src/StateContext";
import {
  reducerRegistrationPublisher,
  reducerDeregistrationPublisher,
  dispatchedActionPublisher,
  statePublisher,
  destructionPublisher
} from "../src/Hub";
import { withDefaultStateReducer, withRouteReducer } from "../src/ReducerHelpers";
import { isRouteAction } from "../src/RouteAction";

const testKey = "testKey";
const testDefaultState = {
  value: 0
};
const testStateKey = "testStateKey";
const testReducer = (state: typeof testDefaultState) => state;
const testDefaultStateReducer = (state: typeof testDefaultState) => state;
const testRouteReducer = (state: typeof testDefaultState) => state;
const testParentcontextId = "testParentContextId";
const testStateBuildingBlock: StateBuildingBlock<typeof testDefaultState, string> = {
  key: testKey,
  defaultState: testDefaultState,
  stateKey: testStateKey,
  reducer: testReducer,
  routingOptions: undefined,
  parentcontextId: testParentcontextId
};

describe("StateContext", () => {
  describe("when created", () => {
    beforeEach(() => {
      (withDefaultStateReducer as jest.Mock).mockClear();
      (withDefaultStateReducer as jest.Mock).mockReturnValue(testDefaultStateReducer);
      (withRouteReducer as jest.Mock).mockClear();
      (withRouteReducer as jest.Mock).mockReturnValue(testRouteReducer);
    });

    describe("with reducer", () => {
      it("publishes reducer enhanced as default state reducer to parent", (done) => {
        // Arrange
        reducerRegistrationPublisher.notification$
          .pipe(
            filter((notification) => notification.parentcontextId === testParentcontextId),
            take(1)
          )
          .subscribe((notification) => {
            // Assert
            expect(withDefaultStateReducer).toHaveBeenCalledWith(testDefaultState, testReducer);
            expect(notification.key).toBe(testKey);
            expect(notification.reducer).toBe(testDefaultStateReducer);
            done();
          });

        // Act
        createStateContext(testStateBuildingBlock);
      });
    });

    describe("with reducer and routing options", () => {
      it("publishes reducer enhanced as routing default state reducer to parent", (done) => {
        // Arrange
        const testStateBuildingBlockWithRoutingOptions = { ...testStateBuildingBlock, routingOptions: new Map() };

        reducerRegistrationPublisher.notification$
          .pipe(
            filter((notification) => notification.parentcontextId === testParentcontextId),
            take(1)
          )
          .subscribe((notification) => {
            // Assert
            expect(withDefaultStateReducer).toHaveBeenCalledWith(testDefaultState, testReducer);
            expect(withRouteReducer).toHaveBeenCalledWith(
              expect.anything(),
              testDefaultStateReducer,
              testStateBuildingBlockWithRoutingOptions.routingOptions
            );
            expect(notification.key).toBe(testKey);
            expect(notification.reducer).toBe(testRouteReducer);
            done();
          });

        // Act
        createStateContext(testStateBuildingBlockWithRoutingOptions);
      });
    });
  });

  describe("when sub state reducer is registered", () => {
    it("publishes updated reducer", (done) => {
      // Arrange
      const subStateKey = "substate1";
      const stateContext = createStateContext(testStateBuildingBlock);
      const combinedReducer = (state: typeof testDefaultState) => state;
      (combineReducers as jest.Mock).mockReturnValue(combinedReducer);

      reducerRegistrationPublisher.notification$
        .pipe(
          filter((notification) => notification.parentcontextId === testParentcontextId),
          take(1)
        )
        .subscribe((notification) => {
          // Assert
          expect(combineReducers).toHaveBeenCalled();
          expect(notification.key).toBe(testKey);
          expect(notification.reducer).toBe(combinedReducer);
          done();
        });

      // Act
      reducerRegistrationPublisher.publish({
        parentcontextId: stateContext.id,
        key: subStateKey,
        reducer: testReducer
      });
    });

    it("publishes its own state for sub states", (done) => {
      // Arrange
      const subStateKey = "substate1";
      const contextState = {
        [testStateKey]: { value: 1 },
        [subStateKey]: {}
      };
      const parentContextState = {
        [testKey]: contextState
      };
      const stateContext = createStateContext(testStateBuildingBlock);
      reducerRegistrationPublisher.publish({
        parentcontextId: stateContext.id,
        key: subStateKey,
        reducer: testReducer
      });

      statePublisher.notification$
        .pipe(
          filter((notification) => notification.contextId === stateContext.id),
          take(1)
        )
        .subscribe((notification) => {
          // Assert
          expect(notification.state).toBe(contextState);
          done();
        });

      // Act
      statePublisher.publish({
        contextId: testParentcontextId,
        state: parentContextState
      });
    });
  });

  describe("when sub state reducer is deregistered", () => {
    it("publishes updated reducer", (done) => {
      // Arrange
      const subStateKey = "substate1";
      const stateContext = createStateContext(testStateBuildingBlock);
      reducerRegistrationPublisher.publish({
        parentcontextId: stateContext.id,
        key: subStateKey,
        reducer: testReducer
      });

      reducerRegistrationPublisher.notification$
        .pipe(
          filter((notification) => notification.parentcontextId === testParentcontextId),
          take(1)
        )
        .subscribe((notification) => {
          // Assert
          expect(notification.key).toBe(testKey);
          expect(notification.reducer).toBe(testDefaultStateReducer);
          done();
        });

      // Act
      reducerDeregistrationPublisher.publish({
        parentcontextId: stateContext.id,
        key: subStateKey
      });
    });
  });

  it("provides the last state", () => {
    // Arrange
    const stateContext = createStateContext(testStateBuildingBlock);
    // Act
    // Assert
    expect(stateContext.state).toEqual(testDefaultState);
  });

  it("updates the state", (done) => {
    // Arrange
    const newState = { value: 1 };
    const parentContextState = {
      [testKey]: newState
    };
    const stateContext = createStateContext(testStateBuildingBlock);

    stateContext.state$
      .pipe(
        skip(1),
        take(1)
      )
      .subscribe(() => {
        // Assert
        expect(stateContext.state).toEqual(newState);
        done();
      });

    // Act
    statePublisher.publish({
      contextId: testParentcontextId,
      state: parentContextState
    });
  });

  it("publishes the last state", (done) => {
    // Arrange
    const stateContext = createStateContext(testStateBuildingBlock);

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
    const stateContext = createStateContext(testStateBuildingBlock);

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
    statePublisher.publish({
      contextId: testParentcontextId,
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
      contextId: testParentcontextId,
      state: parentContextState
    };
    const stateContext = createStateContext(testStateBuildingBlock);

    stateContext.state$.pipe(skip(2)).subscribe(() => {
      // Assert
      fail("State published although not changed");
    });

    // Act
    statePublisher.publish(testUpdate);
    statePublisher.publish(testUpdate);
  });

  it("publishes actions to be dispatched to parent", (done) => {
    // Arrange
    const testAction = { type: "testAction" };
    const stateContext = createStateContext(testStateBuildingBlock);

    dispatchedActionPublisher.notification$.pipe(take(1)).subscribe((notification) => {
      // Assert
      expect(notification.parentcontextId).toBe(testParentcontextId);
      expect(notification.action).toBe(testAction);
      done();
    });

    // Act
    stateContext.dispatch(testAction);
  });

  it("publishes routed actions", (done) => {
    // Arrange
    const testAction = { type: "testAction" };
    const stateContext = createStateContext(testStateBuildingBlock);

    dispatchedActionPublisher.notification$.pipe(take(1)).subscribe((notification) => {
      // Assert
      expect(notification.parentcontextId).toBe(testParentcontextId);
      expect(isRouteAction(notification.action)).toBe(true);
      done();
    });

    // Act
    stateContext.dispatch(testAction, true);
  });

  it("redirects dispatched actions to itself to parent", (done) => {
    // Arrange
    const testAction = { type: "testAction" };
    const stateContext = createStateContext(testStateBuildingBlock);

    dispatchedActionPublisher.notification$
      .pipe(
        filter((notification) => notification.parentcontextId === testParentcontextId),
        take(1)
      )
      .subscribe((notification) => {
        // Assert
        expect(notification.parentcontextId).toBe(testParentcontextId);
        expect(notification.action).toBe(testAction);
        done();
      });

    // Act
    dispatchedActionPublisher.publish({
      parentcontextId: stateContext.id,
      action: testAction
    });
  });

  describe("when parent destroyed", () => {
    it("publishes deregistration", (done) => {
      // Arrange
      createStateContext(testStateBuildingBlock);

      reducerDeregistrationPublisher.notification$
        .pipe(
          filter((notification) => notification.parentcontextId === testParentcontextId),
          take(1)
        )
        .subscribe((notification) => {
          // Assert
          expect(notification.key).toBe(testKey);
          done();
        });

      // Act
      destructionPublisher.publish({
        contextId: testParentcontextId
      });
    });

    it("publishes its destruction", (done) => {
      // Arrange
      const stateContext = createStateContext(testStateBuildingBlock);

      destructionPublisher.notification$
        .pipe(
          filter((notification) => notification.contextId === stateContext.id),
          take(1)
        )
        .subscribe(() => {
          // Assert
          done();
        });

      // Act
      destructionPublisher.publish({
        contextId: testParentcontextId
      });
    });
  });

  describe("when destroyed", () => {
    it("publishes deregistration", (done) => {
      // Arrange
      const stateContext = createStateContext(testStateBuildingBlock);

      reducerDeregistrationPublisher.notification$
        .pipe(
          filter((notification) => notification.parentcontextId === testParentcontextId),
          take(1)
        )
        .subscribe((notification) => {
          // Assert
          expect(notification.key).toBe(testKey);
          done();
        });

      // Act
      stateContext.destroy();
    });

    it("publishes its destruction", (done) => {
      // Arrange
      const stateContext = createStateContext(testStateBuildingBlock);

      destructionPublisher.notification$
        .pipe(
          filter((notification) => notification.contextId === stateContext.id),
          take(1)
        )
        .subscribe(() => {
          // Assert
          done();
        });

      // Act
      stateContext.destroy();
    });

    it("does not publish updated reducer anymore", () => {
      // Arrange
      const subStateKey = "substate1";
      const stateContext = createStateContext(testStateBuildingBlock);
      stateContext.destroy();

      const subscription = reducerRegistrationPublisher.notification$.pipe(skip(1)).subscribe(() => {
        // Assert
        fail();
      });

      // Act
      reducerRegistrationPublisher.publish({
        parentcontextId: stateContext.id,
        key: subStateKey,
        reducer: testReducer
      });

      subscription.unsubscribe();
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
      const stateContext = createStateContext(testStateBuildingBlock);
      reducerRegistrationPublisher.publish({
        parentcontextId: stateContext.id,
        key: subStateKey,
        reducer: testReducer
      });

      stateContext.destroy();

      const subscription = reducerRegistrationPublisher.notification$.subscribe(() => {
        // Assert
        fail();
      });

      // Act
      statePublisher.publish({
        contextId: testParentcontextId,
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
      const stateContext = createStateContext(testStateBuildingBlock);
      stateContext.destroy();

      const subscription = stateContext.state$.pipe(skip(1)).subscribe(() => {
        // Assert
        fail();
      });

      // Act
      statePublisher.publish({
        contextId: testParentcontextId,
        state: parentContextState
      });

      subscription.unsubscribe();
    });

    it("doesn't redirect dispatched actions to itself to parent anymore", () => {
      // Arrange
      const testAction = { type: "testAction" };
      const stateContext = createStateContext(testStateBuildingBlock);
      stateContext.destroy();

      const subscription = dispatchedActionPublisher.notification$.pipe(skip(1)).subscribe(() => {
        // Assert
        fail();
      });

      // Act
      dispatchedActionPublisher.publish({
        parentcontextId: stateContext.id,
        action: testAction
      });

      subscription.unsubscribe();
    });
  });
});
