import { createStoreContext } from "../src/StoreContext";
import {
  reducerRegistrationPublisher,
  reducerDeregistrationPublisher,
  dispatchedActionPublisher,
  statePublisher,
  destructionPublisher
} from "../src/Hub";

jest.mock("../src/GenerateUUID", () => ({
  default: () => "0103e331-da06-40f5-9ee6-d89df83719ad"
}));

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
  });

  describe("when created", () => {
    it("subscribes to the store and publishes any state changes with its context id", () => {
      // Arrange
      // Act
      createStoreContext(mockStore, {});

      // Assert
      expect(mockSubscribe.mock.calls.length).toBe(1);
    });

    it("publishes any store state changes with its context id", (done) => {
      // Arrange
      const storeContext = createStoreContext(mockStore, {});
      const storeSubscribeCallback = mockSubscribe.mock.calls[0][0];
      statePublisher.notification$.subscribe((notification) => {
        // Assert
        expect(notification.contextId === storeContext.id);
        done();
      });

      // Act
      storeSubscribeCallback();
    });

    it("dispatches actions that are directed to itself on the store", () => {
      // Arrange
      const storeContext = createStoreContext(mockStore, {});
      const testActionNotification1 = {
        parentcontextId: "fakeContextId",
        action: { type: "TESTACTION" }
      };
      const testActionNotification2 = {
        parentcontextId: storeContext.id,
        action: { type: "TESTACTION" }
      };

      // Act
      dispatchedActionPublisher.publish(testActionNotification1);
      dispatchedActionPublisher.publish(testActionNotification2);

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
        parentcontextId: "fakeContextId",
        key: "testState",
        reducer: jest.fn()
      };
      const testReducerRegistrationNotification2 = {
        parentcontextId: storeContext.id,
        key: "testState",
        reducer: jest.fn((state: {}) => state || {})
      };

      // Act
      reducerRegistrationPublisher.publish(testReducerRegistrationNotification1);
      reducerRegistrationPublisher.publish(testReducerRegistrationNotification2);

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
        parentcontextId: storeContext.id,
        key: "testState",
        reducer: jest.fn((state: {}) => state || {})
      };
      reducerRegistrationPublisher.publish(testReducerRegistrationNotification);

      const testReducerDeregistrationNotification1 = {
        parentcontextId: "fakeContextId",
        key: "testState"
      };
      const testReducerDeregistrationNotification2 = {
        parentcontextId: storeContext.id,
        key: "testState"
      };

      // Act
      reducerDeregistrationPublisher.publish(testReducerDeregistrationNotification1);
      reducerDeregistrationPublisher.publish(testReducerDeregistrationNotification2);

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

    it("publishes own desctruction", (done) => {
      // Arrange
      const storeContext = createStoreContext(mockStore, {});

      destructionPublisher.notification$.subscribe((notification) => {
        // Assert
        expect(notification.contextId).toBe(storeContext.id);
        done();
      });

      // Act
      storeContext.destroy();
    });

    it("stops dispatching actions that are directed to itself", () => {
      // Arrange
      const storeContext = createStoreContext(mockStore, {});
      const testActionNotification = {
        parentcontextId: storeContext.id,
        action: { type: "TESTACTION" }
      };
      storeContext.destroy();

      // Act
      dispatchedActionPublisher.publish(testActionNotification);

      // Assert
      expect(mockStore.dispatch.mock.calls.length).toBe(0);
    });

    it("stops replacing the stores root reducer when new reducer is registered to itself", () => {
      // Arrange
      const storeContext = createStoreContext(mockStore, {});
      const testReducerRegistrationNotification = {
        parentcontextId: storeContext.id,
        key: "testState",
        reducer: jest.fn((state: {}) => state || {})
      };
      storeContext.destroy();

      // Act
      reducerRegistrationPublisher.publish(testReducerRegistrationNotification);

      // Assert
      expect(mockStore.replaceReducer.mock.calls.length).toBe(0);
    });

    it("stops replacing the stores root reducer when a reducer is deregistered from itself", () => {
      // Arrange
      const storeContext = createStoreContext(mockStore, {});
      const testReducerRegistrationNotification = {
        parentcontextId: storeContext.id,
        key: "testState"
      };
      storeContext.destroy();

      // Act
      reducerDeregistrationPublisher.publish(testReducerRegistrationNotification);

      // Assert
      expect(mockStore.replaceReducer.mock.calls.length).toBe(0);
    });
  });
});
