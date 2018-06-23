import { Store } from "redux";
import coreRegistry from "../src/CoreRegistry";
import ReducerRegistry from "../src/ReducerRegistry";
import PublisherRegistry from "../src/PublisherRegistry";
import StateReducer from "../src/StateReducer";
import StatePublisher from "../src/StatePublisher";
// redux-mock-store not working with TS, so mocking store manually here

jest.mock("../src/ReducerRegistry");
jest.mock("../src/PublisherRegistry");

// tslint:disable:no-any
describe("CoreRegistry", () => {
    let mockStore: Store;
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

        (ReducerRegistry as any).mockClear();
        (PublisherRegistry as any).mockClear();
    });

    describe("registerStore", () => {
        it("returns a store reference id", () => {
            // Arrange

            // Act
            const storeId = coreRegistry.registerStore(mockStore, {});

            // Assert
            expect(storeId).toBeDefined();
        });

        it("returns different store reference id for", () => {
            // Arrange
            const firstId = coreRegistry.registerStore(mockStore, {});

            // Act
            const secondId = coreRegistry.registerStore(mockStore, {});

            // Assert
            expect(firstId === secondId).toBeFalsy();
        });
    });

    describe("replaceStore", () => {
        let mockStoreNew: Store;

        beforeEach(() => {
            mockStoreNew = {
                dispatch: jest.fn(),
                getState: jest.fn(),
                subscribe: mockSubscribe,
                replaceReducer: jest.fn()
            };
        });

        it("calls the unsubscribe", () => {
            // Arrange
            const storeId = coreRegistry.registerStore(mockStore, {});

            // Act
            coreRegistry.replaceStore(storeId, mockStoreNew, {});

            // Assert
            expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
        });

        it("calls the subscribed listeners", () => {
            // Arrange
            const storeId = coreRegistry.registerStore(mockStore, {});
            const mockListener1 = jest.fn();
            const mockListener2 = jest.fn();
            coreRegistry.subscribe(storeId, mockListener1);
            coreRegistry.subscribe(storeId, mockListener2);

            // Act
            coreRegistry.replaceStore(storeId, mockStoreNew, {});

            // Assert
            expect(mockListener1).toHaveBeenCalledWith(mockStoreNew);
            expect(mockListener2).toHaveBeenCalledWith(mockStoreNew);
        });

        it("calls the subscribed listeners after second replacement", () => {
            // Arrange
            const storeId = coreRegistry.registerStore(mockStore, {});
            const mockListener1 = jest.fn();
            const mockListener2 = jest.fn();
            coreRegistry.subscribe(storeId, mockListener1);
            coreRegistry.subscribe(storeId, mockListener2);
            coreRegistry.replaceStore(storeId, mockStore, {});

            // Act
            coreRegistry.replaceStore(storeId, mockStoreNew, {});

            // Assert
            expect(mockListener1).toHaveBeenCalledWith(mockStoreNew);
            expect(mockListener2).toHaveBeenCalledWith(mockStoreNew);
        });
    });

    describe("getStore", () => {
        it("returns the store", () => {
            // Arrange
            const storeId = coreRegistry.registerStore(mockStore, {});

            // Act
            const store = coreRegistry.getStore(storeId);

            // Assert
            expect(store).toBe(mockStore);
        });

        it("throws error in the unexpected situation when store never registered", () => {
            // Arrange
            const storeId = "store_1_235263437";

            // Act
            // Assert
            expect(() => coreRegistry.getStore(storeId)).toThrowError();
        });
    });

    describe("registerState", () => {
        let stateReducer: StateReducer;
        let statePublisher: StatePublisher;

        beforeEach(() => {
            stateReducer = jest.fn() as any;
            statePublisher = jest.fn() as any;
        });

        it("throws error in the unexpected situation when trying to register state for inexistent store", () => {
            // Arrange

            // Act
            // Assert
            expect(() => coreRegistry.registerState("store_id", stateReducer, statePublisher)).toThrowError();
        });

        it("registers the reducer using the reducer registry", () => {
            // Arrange
            const storeId = coreRegistry.registerStore(mockStore, {});

            // Act
            coreRegistry.registerState(storeId, stateReducer, statePublisher);

            // Assert
            const reducerRegistryMockInstance = (ReducerRegistry as any).mock.instances[0];
            const mockRegisterReducer = reducerRegistryMockInstance.registerReducer;
            expect(mockRegisterReducer).toHaveBeenCalledWith(stateReducer);
        });

        it("registers the publisher using the publisher registry", () => {
            /// Arrange
            const storeId = coreRegistry.registerStore(mockStore, {});

            // Act
            coreRegistry.registerState(storeId, stateReducer, statePublisher);

            // Assert
            const publisherRegistryMockInstance = (PublisherRegistry as any).mock.instances[0];
            const mockPublisherPublisher = publisherRegistryMockInstance.registerPublisher;
            expect(mockPublisherPublisher).toHaveBeenCalledWith(statePublisher);
        });
    });
});