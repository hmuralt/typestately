import { of } from "rxjs";
import StateHandler from "../src/core/StateHandler";
import { createStateDefinition, AttachableStateDefinition, StateDefinition } from "../src/core/StateContextBuild";
import { Action } from "redux";
import RoutingOption from "../src/core/RoutingOption";
import { createHubMocks } from "./Mocks";
import { StateContext } from "../src/core/StateContext";

jest.mock("../src/core/StateContextBuild");

const testKey = "testStateHandler";
const testDefaultState = {};
const testParentContextId = "testParentContextId";
const testNestedKey = "testNestedStateHandler";
const testNestedDefaultState = "testNestedDefaultState";

const { mockHub } = createHubMocks();

describe("StateHandler", () => {
  let testStateDefinition: StateDefinition<{}>;
  let testAttachableStateDefinition: AttachableStateDefinition<{}, string>;
  let testStateContext: StateContext<{}, string>;
  let stateHandler: TestStateHandler;

  beforeEach(() => {
    const testState = {};

    testStateContext = {
      id: "testContextId",
      state: testState,
      state$: of(testState),
      dispatch: jest.fn(),
      destroy: jest.fn()
    };

    const attachTo = jest.fn();
    attachTo.mockReturnValue(testStateContext);
    testAttachableStateDefinition = {
      attachTo
    };

    const setReducer = jest.fn();
    setReducer.mockReturnValue(testAttachableStateDefinition);
    testStateDefinition = {
      setReducer
    };

    (createStateDefinition as jest.Mock).mockClear();
    (createStateDefinition as jest.Mock).mockReturnValue(testStateDefinition);

    stateHandler = new TestStateHandler();
  });

  describe("when not attached", () => {
    describe("state", () => {
      it("returns default state", () => {
        // Arrange

        // Act
        const result = stateHandler.state;

        // Assert
        expect(result).toBe(testDefaultState);
      });
    });

    describe("state$", () => {
      it("returns default state", (done) => {
        // Arrange

        // Act
        stateHandler.state$.subscribe((result) => {
          // Assert
          expect(result).toBe(testDefaultState);
          done();
        });
      });
    });

    describe("attachTo", () => {
      it("detaches nested state handlers", () => {
        // Arrange

        // Act
        stateHandler.attachTo(mockHub, testParentContextId);

        // Assert
        expect(stateHandler.nested.detach).toHaveBeenCalled();
      });

      it("sets reducer and routing options", () => {
        // Arrange

        // Act
        stateHandler.attachTo(mockHub, testParentContextId);

        // Assert
        expect(testStateDefinition.setReducer).toHaveBeenCalledWith(
          stateHandler.getReducer(),
          stateHandler.getRoutingOptions()
        );
      });

      it("attaches to hub and parent context id", () => {
        // Arrange

        // Act
        stateHandler.attachTo(mockHub, testParentContextId);

        // Assert
        expect(testAttachableStateDefinition.attachTo).toHaveBeenCalledWith(mockHub, testParentContextId);
      });

      it("attaches nested state handlers", () => {
        // Arrange

        // Act
        stateHandler.attachTo(mockHub, testParentContextId);

        // Assert
        expect(stateHandler.nested.attachTo).toHaveBeenCalledWith(mockHub, testStateContext.id);
      });
    });

    describe("detach", () => {
      it("detaches nested state handlers", () => {
        // Arrange

        // Act
        stateHandler.detach();

        // Assert
        expect(stateHandler.nested.detach).toHaveBeenCalled();
      });
    });
  });

  describe("when attached", () => {
    beforeEach(() => {
      stateHandler.attachTo(mockHub, testParentContextId);
    });

    describe("state", () => {
      it("returns state context state", () => {
        // Arrange

        // Act
        const result = stateHandler.state;

        // Assert
        expect(result).toBe(testStateContext.state);
      });
    });

    describe("state$", () => {
      it("returns state context state", (done) => {
        // Arrange

        // Act
        stateHandler.state$.subscribe((result) => {
          // Assert
          expect(result).toBe(testStateContext.state);
          done();
        });
      });
    });

    describe("attachTo", () => {
      it("detaches nested state handlers", () => {
        // Arrange

        // Act
        stateHandler.attachTo(mockHub, testParentContextId);

        // Assert
        expect(stateHandler.nested.detach).toHaveBeenCalled();
      });

      it("destroys current state context", () => {
        // Arrange

        // Act
        stateHandler.attachTo(mockHub, testParentContextId);

        // Assert
        expect(testStateContext.destroy).toHaveBeenCalled();
      });
    });

    describe("detach", () => {
      it("detaches nested state handlers", () => {
        // Arrange

        // Act
        stateHandler.detach();

        // Assert
        expect(stateHandler.nested.detach).toHaveBeenCalled();
      });

      it("destroys current state context", () => {
        // Arrange

        // Act
        stateHandler.detach();

        // Assert
        expect(testStateContext.destroy).toHaveBeenCalled();
      });
    });
  });
});

class TestStateHandler extends StateHandler<{}, string> {
  public nested: NestedTestStateHandler;

  constructor() {
    super(testKey, testDefaultState);
    this.nested = new NestedTestStateHandler();
  }

  public dispatchSomething() {
    this.dispatch({
      type: "testAction"
    });
  }

  public dispatchSomethingToThisContext() {
    this.dispatch(
      {
        type: "testAction"
      },
      true
    );
  }

  public getReducer() {
    return this.reduceSomething;
  }

  public getRoutingOptions() {
    return new Map<string, RoutingOption>([["testAction", { isForThisInstance: true }]]);
  }

  public getNestedStateHandler() {
    return [this.nested];
  }

  public reduceSomething(state: {}, action: Action<string>) {
    return state;
  }
}

class NestedTestStateHandler extends StateHandler<{}, string> {
  constructor() {
    super(testNestedKey, testNestedDefaultState);

    this.detach = jest.fn();
    this.attachTo = jest.fn();
  }
}
