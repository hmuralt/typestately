import { withDefaultStateToReduxReducer, withRouteReducer, createExtensibleReducer } from "../src/ReducerHelpers";
import { withRoute } from "../src/RouteAction";

describe("withDefaultStateReducer", () => {
  it("passes default state to reducer when undefined passed as state", () => {
    // Arrange
    const testDefaultState = {};
    const reducer = jest.fn();
    const testAction = { type: "testAction" };
    const enhancedReducer = withDefaultStateToReduxReducer(testDefaultState, reducer);

    // Act
    enhancedReducer(undefined, testAction);

    // Assert
    expect(reducer.mock.calls[0][0]).toBe(testDefaultState);
  });

  it("returns state that was returned by reducer", () => {
    // Arrange
    const testDefaultState = {};
    const reducer = jest.fn();
    const returnedState = {};
    reducer.mockReturnValue(returnedState);
    const testAction = { type: "testAction" };
    const enhancedReducer = withDefaultStateToReduxReducer(testDefaultState, reducer);

    // Act
    const result = enhancedReducer({}, testAction);

    // Assert
    expect(result).toBe(returnedState);
  });
});

describe("withRouteReducer", () => {
  const testIdentifier = "testIdentifier";
  const testOtherIdentifier = "testOtherIdentifier";
  const returnedState = {};
  let testReducer: jest.Mock;

  beforeEach(() => {
    testReducer = jest.fn();
    testReducer.mockReturnValue(returnedState);
  });

  describe("when passed action is not route action", () => {
    it("calls reducer with state and action", () => {
      // Arrange
      const testState = {};
      const testAction = { type: "testAction" };
      const enhancedReducer = withRouteReducer(testIdentifier, testReducer, new Map());

      // Act
      enhancedReducer(testState, testAction);

      // Assert
      expect(testReducer).toHaveBeenCalledWith(testState, testAction);
    });

    it("returns state that was returned by reducer", () => {
      // Arrange
      const testState = {};
      const testAction = { type: "testAction" };
      const enhancedReducer = withRouteReducer(testIdentifier, testReducer, new Map());

      // Act
      const result = enhancedReducer(testState, testAction);

      // Assert
      expect(result).toBe(returnedState);
    });

    describe("when routed only action for this type of action", () => {
      it("does not call reducer", () => {
        // Arrange
        const testState = {};
        const testAction = { type: "testAction" };
        const enhancedReducer = withRouteReducer(
          testIdentifier,
          testReducer,
          new Map([["testAction", { isRoutedOnly: true }]])
        );

        // Act
        enhancedReducer(testState, testAction);

        // Assert
        expect(testReducer).not.toHaveBeenCalled();
      });

      it("returns passed state", () => {
        // Arrange
        const testState = {};
        const testAction = { type: "testAction" };
        const enhancedReducer = withRouteReducer(
          testIdentifier,
          testReducer,
          new Map([["testAction", { isRoutedOnly: true }]])
        );

        // Act
        const result = enhancedReducer(testState, testAction);

        // Assert
        expect(result).toBe(testState);
      });
    });
  });

  describe("when passed action is route action", () => {
    describe("when identifier matches", () => {
      it("calls reducer with state and action", () => {
        // Arrange
        const testState = {};
        const testAction = { type: "testAction" };
        const testRouteAction = withRoute(testIdentifier, testAction);
        const enhancedReducer = withRouteReducer(testIdentifier, testReducer, new Map());

        // Act
        enhancedReducer(testState, testRouteAction);

        // Assert
        expect(testReducer).toHaveBeenCalledWith(testState, testAction);
      });

      it("returns state that was returned by reducer", () => {
        // Arrange
        const testState = {};
        const testAction = { type: "testAction" };
        const testRouteAction = withRoute(testIdentifier, testAction);
        const enhancedReducer = withRouteReducer(testIdentifier, testReducer, new Map());

        // Act
        const result = enhancedReducer(testState, testRouteAction);

        // Assert
        expect(result).toBe(returnedState);
      });

      describe("when option for other instances is set", () => {
        it("does not call reducer", () => {
          // Arrange
          const testState = {};
          const testAction = { type: "testAction" };
          const testRouteAction = withRoute(testIdentifier, testAction);
          const enhancedReducer = withRouteReducer(
            testIdentifier,
            testReducer,
            new Map([["testAction", { isForOtherInstances: true }]])
          );

          // Act
          enhancedReducer(testState, testRouteAction);

          // Assert
          expect(testReducer).not.toHaveBeenCalled();
        });

        it("returns passed state", () => {
          // Arrange
          const testState = {};
          const testAction = { type: "testAction" };
          const testRouteAction = withRoute(testIdentifier, testAction);
          const enhancedReducer = withRouteReducer(
            testIdentifier,
            testReducer,
            new Map([["testAction", { isForOtherInstances: true }]])
          );

          // Act
          const result = enhancedReducer(testState, testRouteAction);

          // Assert
          expect(result).toBe(testState);
        });
      });
    });

    describe("when identifier does not match", () => {
      it("does not call reducer", () => {
        // Arrange
        const testState = {};
        const testAction = { type: "testAction" };
        const testRouteAction = withRoute(testOtherIdentifier, testAction);
        const enhancedReducer = withRouteReducer(testIdentifier, testReducer, new Map());

        // Act
        enhancedReducer(testState, testRouteAction);

        // Assert
        expect(testReducer).not.toHaveBeenCalled();
      });

      it("returns passed state", () => {
        // Arrange
        const testState = {};
        const testAction = { type: "testAction" };
        const testRouteAction = withRoute(testOtherIdentifier, testAction);
        const enhancedReducer = withRouteReducer(testIdentifier, testReducer, new Map());

        // Act
        const result = enhancedReducer(testState, testRouteAction);

        // Assert
        expect(result).toBe(testState);
      });

      describe("when option for other instances is set", () => {
        it("calls reducer with state and action", () => {
          // Arrange
          const testState = {};
          const testAction = { type: "testAction" };
          const testRouteAction = withRoute(testOtherIdentifier, testAction);
          const enhancedReducer = withRouteReducer(
            testIdentifier,
            testReducer,
            new Map([["testAction", { isForOtherInstances: true }]])
          );

          // Act
          enhancedReducer(testState, testRouteAction);

          // Assert
          expect(testReducer).toHaveBeenCalledWith(testState, testAction);
        });

        it("returns state that was returned by reducer", () => {
          // Arrange
          const testState = {};
          const testAction = { type: "testAction" };
          const testRouteAction = withRoute(testOtherIdentifier, testAction);
          const enhancedReducer = withRouteReducer(
            testIdentifier,
            testReducer,
            new Map([["testAction", { isForOtherInstances: true }]])
          );

          // Act
          const result = enhancedReducer(testState, testRouteAction);

          // Assert
          expect(result).toBe(returnedState);
        });
      });
    });
  });
});

describe("combineToReducer created reducer", () => {
  const returnedState = {};
  let testReducer: jest.Mock;

  beforeEach(() => {
    testReducer = jest.fn();
    testReducer.mockReturnValue(returnedState);
  });

  it("returns state that was returned by reducer", () => {
    // Arrange
    const testState = {};
    const testAction = { type: "testAction" };
    const reducer = createExtensibleReducer<{}, string>().handling("testAction", testReducer);

    // Act
    const result = reducer(testState, testAction);

    // Assert
    expect(result).toBe(returnedState);
  });

  describe("when action type not handled by any function", () => {
    it("returns passed state", () => {
      // Arrange
      const testState = {};
      const testAction = { type: "testAnotherAction" };
      const reducer = createExtensibleReducer<{}, string>().handling("testAction", testReducer);

      // Act
      const result = reducer(testState, testAction);

      // Assert
      expect(result).toBe(testState);
    });
  });
});
