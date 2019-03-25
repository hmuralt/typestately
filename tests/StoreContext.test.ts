import { createStoreContext, storeContextId } from "../src/StoreContext";
import { createHubMocks } from "./Mocks";
import { createHub, StateReportType } from "../src/Hub";

jest.mock("../src/Hub");

const {
  mockHub,
  mockDispatchingActionPublisher,
  mockDestructionPublisher,
  mockStateReportPublisher,
  mockStatePublisher,
  resetMocks
} = createHubMocks();

const mockDestroyHub = jest.fn();

(createHub as jest.Mock).mockImplementation(() => {
  return {
    object: mockHub,
    destroy: mockDestroyHub
  };
});

describe("StoreContext", () => {
  let mockStore: {
    dispatch: jest.Mock;
    getState: jest.Mock;
    subscribe: jest.Mock;
    replaceReducer: jest.Mock;
  };
  let mockSubscribe: jest.Mock;
  let mockUnsubscribe: jest.Mock;

  beforeEach(() => {
    mockSubscribe = jest.fn();
    mockUnsubscribe = jest.fn();
    mockSubscribe.mockReturnValue(mockUnsubscribe);

    mockStore = {
      dispatch: jest.fn(),
      getState: jest.fn(),
      subscribe: mockSubscribe,
      replaceReducer: jest.fn()
    };

    resetMocks();
    mockDestroyHub.mockReset();
  });

  describe("when created", () => {
    it("subscribes to the store and publishes any state changes with its context id", () => {
      // Arrange
      // Act
      createStoreContext(mockStore, {});

      // Assert
      expect(mockSubscribe.mock.calls.length).toBe(1);
    });

    it("publishes any store state changes with its context id", () => {
      // Arrange
      createStoreContext(mockStore, {});
      const storeSubscribeCallback = mockSubscribe.mock.calls[0][0];

      // Act
      storeSubscribeCallback();

      // Assert
      expect(mockStatePublisher.publish).toHaveBeenCalledWith({
        contextId: storeContextId
      });
    });

    it("dispatches actions that are directed to itself on the store", () => {
      // Arrange
      createStoreContext(mockStore, {});
      const testActionNotification1 = {
        parentContextId: "fakeContextId",
        action: { type: "TESTACTION" }
      };
      const testActionNotification2 = {
        parentContextId: storeContextId,
        action: { type: "TESTACTION" }
      };

      // Act
      mockDispatchingActionPublisher.publish(testActionNotification1);
      mockDispatchingActionPublisher.publish(testActionNotification2);

      // Assert
      expect(mockStore.dispatch.mock.calls[0][0]).toBe(testActionNotification2.action);
    });

    it("replaces the stores root reducer when new reducer is registered to itself", () => {
      // Arrange
      const initialReducers = {
        testStateInitial: (state: {}) => state || {}
      };
      createStoreContext(mockStore, initialReducers);
      const teststateRegistrationNotification1 = {
        type: StateReportType.registration,
        parentContextId: "fakeContextId",
        key: "testState",
        reducer: jest.fn()
      };
      const teststateRegistrationNotification2 = {
        type: StateReportType.registration,
        parentContextId: storeContextId,
        key: "testState",
        reducer: jest.fn((state: {}) => state || {})
      };

      // Act
      mockStateReportPublisher.publish(teststateRegistrationNotification1);
      mockStateReportPublisher.publish(teststateRegistrationNotification2);

      // Assert
      expect(mockStore.replaceReducer.mock.calls.length).toBe(1);
      expect(mockStore.replaceReducer.mock.calls[0][0]({}, {})).toEqual({ testStateInitial: {}, testState: {} });
    });

    it("replaces the stores root reducer when a reducer is deregistered from itself", () => {
      // Arrange
      const initialReducers = {
        testStateInitial: (state: {}) => state || {}
      };
      createStoreContext(mockStore, initialReducers);
      const teststateRegistrationNotification = {
        type: StateReportType.registration,
        parentContextId: storeContextId,
        key: "testState",
        reducer: jest.fn((state: {}) => state || {})
      };
      mockStateReportPublisher.publish(teststateRegistrationNotification);

      const testStateDeregistrationNotification1 = {
        type: StateReportType.deregistration,
        parentContextId: "fakeContextId",
        key: "testState"
      };
      const testStateDeregistrationNotification2 = {
        type: StateReportType.deregistration,
        parentContextId: storeContextId,
        key: "testState"
      };

      // Act
      mockStateReportPublisher.publish(testStateDeregistrationNotification1);
      mockStateReportPublisher.publish(testStateDeregistrationNotification2);

      // Assert
      expect(mockStore.replaceReducer.mock.calls.length).toBe(2);
      expect(mockStore.replaceReducer.mock.calls[1][0]({}, {})).toEqual({ testStateInitial: {} });
    });
  });

  it("provides the store", () => {
    // Arrange
    // Act
    const storeContext = createStoreContext(mockStore, {});

    // Assert
    expect(storeContext.store).toBe(mockStore);
  });

  it("provides the hub", () => {
    // Arrange
    // Act
    const storeContext = createStoreContext(mockStore, {});

    // Assert
    expect(storeContext.hub).toBeDefined();
  });

  describe("when destroyed", () => {
    it("unsubscribes from store state changes", () => {
      // Arrange
      const storeContext = createStoreContext(mockStore, {});

      // Act
      storeContext.destroy();

      // Assert
      expect(mockUnsubscribe.mock.calls.length).toBe(1);
    });

    it("publishes own desctruction", () => {
      // Arrange
      const storeContext = createStoreContext(mockStore, {});

      // Act
      storeContext.destroy();

      // Assert
      expect(mockDestructionPublisher.publish).toHaveBeenCalledWith({
        contextId: storeContextId
      });
    });

    it("stops dispatching actions that are directed to itself", () => {
      // Arrange
      const storeContext = createStoreContext(mockStore, {});
      const testActionNotification = {
        parentContextId: storeContextId,
        action: { type: "TESTACTION" }
      };
      storeContext.destroy();

      // Act
      mockDispatchingActionPublisher.publish(testActionNotification);

      // Assert
      expect(mockStore.dispatch.mock.calls.length).toBe(0);
    });

    it("stops replacing the stores root reducer when new reducer is registered to itself", () => {
      // Arrange
      const storeContext = createStoreContext(mockStore, {});
      const teststateRegistrationNotification = {
        type: StateReportType.registration,
        parentContextId: storeContextId,
        key: "testState",
        reducer: jest.fn((state: {}) => state || {})
      };
      storeContext.destroy();

      // Act
      mockStateReportPublisher.publish(teststateRegistrationNotification);

      // Assert
      expect(mockStore.replaceReducer.mock.calls.length).toBe(0);
    });

    it("stops replacing the stores root reducer when a reducer is deregistered from itself", () => {
      // Arrange
      const storeContext = createStoreContext(mockStore, {});
      const testStateDeregistrationNotification = {
        type: StateReportType.deregistration,
        parentContextId: storeContextId,
        key: "testState"
      };
      storeContext.destroy();

      // Act
      mockStateReportPublisher.publish(testStateDeregistrationNotification);

      // Assert
      expect(mockStore.replaceReducer.mock.calls.length).toBe(0);
    });

    it("destroys hub", () => {
      // Arrange
      const storeContext = createStoreContext(mockStore, {});

      // Act
      storeContext.destroy();

      // Assert
      expect(mockDestroyHub).toHaveBeenCalled();
    });
  });
});
