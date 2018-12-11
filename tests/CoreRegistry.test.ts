import { Store } from "redux";
import coreRegistry from "../src/CoreRegistry";
import ReducerRegistry from "../src/ReducerRegistry";
import StateConnector from "../src/StateConnector";

jest.mock("../src/ReducerRegistry");

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

        it("stops propagating state changes", () => {
            // Arrange
            const storeId = coreRegistry.registerStore(mockStore, {});
            const storeSubscribeCallback = mockSubscribe.mock.calls[0][0];
            const state$SubscribeCallback = jest.fn();
            const stateConnector: StateConnector = {
                setState$: (state$) => state$.subscribe(state$SubscribeCallback),
                setDispatch: jest.fn(),
                stateReducer: {
                    extend: jest.fn()
                }
            };
            coreRegistry.registerState(storeId, stateConnector);

            // Act
            coreRegistry.replaceStore(storeId, mockStoreNew, {});
            storeSubscribeCallback();

            // Assert
            expect(state$SubscribeCallback).not.toHaveBeenCalled();
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
        let stateConnector: StateConnector;
        let mockState$SubscribeCallback: jest.Mock;

        beforeEach(() => {
            mockState$SubscribeCallback = jest.fn();
            stateConnector = {
                setState$: (state$) => state$.subscribe(mockState$SubscribeCallback),
                setDispatch: jest.fn(),
                stateReducer: {
                    extend: jest.fn()
                }
            };
        });

        it("throws error in the unexpected situation when trying to register state for inexistent store", () => {
            // Arrange

            // Act
            // Assert
            expect(() => coreRegistry.registerState("store_id", stateConnector)).toThrowError();
        });

        it("sets the state$ on the connector", () => {
            // Arrange
            const storeId = coreRegistry.registerStore(mockStore, {});
            const storeSubscribeCallback = mockSubscribe.mock.calls[0][0];

            // Act
            coreRegistry.registerState(storeId, stateConnector);
            storeSubscribeCallback();

            // Assert
            expect(mockState$SubscribeCallback).toHaveBeenCalledTimes(1);
        });

        it("sets the dispatch", () => {
            // Arrange
            const storeId = coreRegistry.registerStore(mockStore, {});

            // Act
            coreRegistry.registerState(storeId, stateConnector);

            // Assert
            expect(stateConnector.setDispatch).toHaveBeenCalledWith(mockStore.dispatch);
        });

        it("registers the reducer using the reducer registry", () => {
            // Arrange
            const storeId = coreRegistry.registerStore(mockStore, {});

            // Act
            coreRegistry.registerState(storeId, stateConnector);

            // Assert
            const reducerRegistryMockInstance = (ReducerRegistry as any).mock.instances[0];
            const mockRegisterReducer = reducerRegistryMockInstance.registerReducer;
            expect(mockRegisterReducer).toHaveBeenCalledWith(stateConnector.stateReducer);
        });
    });
});