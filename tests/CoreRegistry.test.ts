import { Store } from "redux";
import coreRegistry from "../src/CoreRegistry";
import StateAccess from "../src/StateAccess";
import ReducerRegistry from "../src/ReducerRegistry";
import PublisherRegistry from "../src/PublisherRegistry";
// redux-mock-store not working with TS, so mocking store manually here

jest.mock("../src/ReducerRegistry");
jest.mock("../src/PublisherRegistry");

// tslint:disable:no-any
describe("CoreRegistry", () => {
    let mockStore: Store<{}>;
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

    describe("removeStore", () => {
        it("calls the unsubscribe", () => {
            // Arrange
            const storeId = coreRegistry.registerStore(mockStore, {});

            // Act
            coreRegistry.removeStore(storeId);

            // Assert
            expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
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

        it("returns undefined when store never registered", () => {
            // Arrange
            const storeId = "store_1_235263437";

            // Act
            const store = coreRegistry.getStore(storeId);

            // Assert
            expect(store).toBeUndefined();
        });

        it("returns undefined when store has been removed", () => {
            // Arrange
            const storeId = coreRegistry.registerStore(mockStore, {});
            coreRegistry.removeStore(storeId);

            // Act
            const store = coreRegistry.getStore(storeId);

            // Assert
            expect(store).toBeUndefined();
        });
    });

    describe("registerState", () => {
        let stateAccess: StateAccess<{}>;

        beforeEach(() => {
            stateAccess = {
                reducer: jest.fn() as any,
                publisher: jest.fn() as any,
                provider: jest.fn() as any
            };
        });

        it("throws error in the unexpected situation where trying to register state for inexistent store", () => {
            // Arrange

            // Act
            // Assert
            expect(() => coreRegistry.registerState("store_id", stateAccess)).toThrowError();
        });

        it("registers the reducer using the reducer registry", () => {
            // Arrange
            const storeId = coreRegistry.registerStore(mockStore, {});

            // Act
            coreRegistry.registerState(storeId, stateAccess);

            // Assert
            const reducerRegistryMockInstance = (ReducerRegistry as any).mock.instances[0];
            const mockRegisterReducer = reducerRegistryMockInstance.registerReducer;
            expect(mockRegisterReducer).toHaveBeenCalledWith(stateAccess.reducer);
        });

        it("registers the publisher using the publisher registry", () => {
            /// Arrange
            const storeId = coreRegistry.registerStore(mockStore, {});

            // Act
            coreRegistry.registerState(storeId, stateAccess);

            // Assert
            const publisherRegistryMockInstance = (PublisherRegistry as any).mock.instances[0];
            const mockPublisherPublisher = publisherRegistryMockInstance.registerPublisher;
            expect(mockPublisherPublisher).toHaveBeenCalledWith(stateAccess.publisher);
        });
    });
});