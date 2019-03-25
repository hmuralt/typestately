import { createStoreContext } from "../src/StoreContext";
import { createHubMocks } from "./Mocks";
import { createHub } from "../src/Hub";

jest.mock("../src/GenerateUUID", () => ({
  default: () => "0103e331-da06-40f5-9ee6-d89df83719ad"
}));

jest.mock("../src/Hub");

const {
  mockHub,
  mockDispatchedActionPublisher,
  mockDestructionPublisher,
  mockReducerRegistrationPublisher,
  mockReducerDeregistrationPublisher,
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
      const storeContext = createStoreContext(mockStore, {});
      const storeSubscribeCallback = mockSubscribe.mock.calls[0][0];

      // Act
      storeSubscribeCallback();

      // Assert
      expect(mockStatePublisher.publish).toHaveBeenCalledWith({
        contextId: storeContext.id
      });
    });

    it("dispatches actions that are directed to itself on the store", () => {
      // Arrange
      const storeContext = createStoreContext(mockStore, {});
      const testActionNotification1 = {
        parentContextId: "fakeContextId",
        action: { type: "TESTACTION" }
      };
      const testActionNotification2 = {
        parentContextId: storeContext.id,
        action: { type: "TESTACTION" }
      };

      // Act
      mockDispatchedActionPublisher.publish(testActionNotification1);
      mockDispatchedActionPublisher.publish(testActionNotification2);

      // Assert
      expect(mockStore.dispatch.mock.calls[0][0]).toBe(testActionNotification2.action);
    });

    it("replaces the stores root reducer when new reducer is registered to itself", () => {
      // Arrange
      const initialReducers = {
        testStateInitial: (state: {}) => state || {}
      };
      const storeContext = createStoreContext(mockStore, initialReducers);
      const testReducerRegistrationNotification1 = {
        parentContextId: "fakeContextId",
        key: "testState",
        reducer: jest.fn()
      };
      const testReducerRegistrationNotification2 = {
        parentContextId: storeContext.id,
        key: "testState",
        reducer: jest.fn((state: {}) => state || {})
      };

      // Act
      mockReducerRegistrationPublisher.publish(testReducerRegistrationNotification1);
      mockReducerRegistrationPublisher.publish(testReducerRegistrationNotification2);

      // Assert
      expect(mockStore.replaceReducer.mock.calls.length).toBe(1);
      expect(mockStore.replaceReducer.mock.calls[0][0]({}, {})).toEqual({ testStateInitial: {}, testState: {} });
    });

    it("replaces the stores root reducer when a reducer is deregistered from itself", () => {
      // Arrange
      const initialReducers = {
        testStateInitial: (state: {}) => state || {}
      };
      const storeContext = createStoreContext(mockStore, initialReducers);
      const testReducerRegistrationNotification = {
        parentContextId: storeContext.id,
        key: "testState",
        reducer: jest.fn((state: {}) => state || {})
      };
      mockReducerRegistrationPublisher.publish(testReducerRegistrationNotification);

      const testReducerDeregistrationNotification1 = {
        parentContextId: "fakeContextId",
        key: "testState"
      };
      const testReducerDeregistrationNotification2 = {
        parentContextId: storeContext.id,
        key: "testState"
      };

      // Act
      mockReducerDeregistrationPublisher.publish(testReducerDeregistrationNotification1);
      mockReducerDeregistrationPublisher.publish(testReducerDeregistrationNotification2);

      // Assert
      expect(mockStore.replaceReducer.mock.calls.length).toBe(2);
      expect(mockStore.replaceReducer.mock.calls[1][0]({}, {})).toEqual({ testStateInitial: {} });
    });
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
        contextId: storeContext.id
      });
    });

    it("stops dispatching actions that are directed to itself", () => {
      // Arrange
      const storeContext = createStoreContext(mockStore, {});
      const testActionNotification = {
        parentContextId: storeContext.id,
        action: { type: "TESTACTION" }
      };
      storeContext.destroy();

      // Act
      mockDispatchedActionPublisher.publish(testActionNotification);

      // Assert
      expect(mockStore.dispatch.mock.calls.length).toBe(0);
    });

    it("stops replacing the stores root reducer when new reducer is registered to itself", () => {
      // Arrange
      const storeContext = createStoreContext(mockStore, {});
      const testReducerRegistrationNotification = {
        parentContextId: storeContext.id,
        key: "testState",
        reducer: jest.fn((state: {}) => state || {})
      };
      storeContext.destroy();

      // Act
      mockReducerRegistrationPublisher.publish(testReducerRegistrationNotification);

      // Assert
      expect(mockStore.replaceReducer.mock.calls.length).toBe(0);
    });

    it("stops replacing the stores root reducer when a reducer is deregistered from itself", () => {
      // Arrange
      const storeContext = createStoreContext(mockStore, {});
      const testReducerRegistrationNotification = {
        parentContextId: storeContext.id,
        key: "testState"
      };
      storeContext.destroy();

      // Act
      mockReducerDeregistrationPublisher.publish(testReducerRegistrationNotification);

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
