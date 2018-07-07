
import coreRegistry from "../src/CoreRegistry";
import { registerOnStore } from "../src/StateHandlerUtils";
import StateHandler from "../src/StateHandler";
import { Dispatch } from "../node_modules/redux";

// tslint:disable:no-empty no-any

const mockDispatch = jest.fn();

jest.mock("../src/CoreRegistry", () => ({
    default: {
        getStore: () => ({ dispatch: mockDispatch }),
        registerState: jest.fn()
    }
}));

class TestStateHandler extends StateHandler {

    constructor() {
        super("testKey", {});
        this.onDispatch = jest.fn();
    }

    protected getReducers() {
        return new Map();
    }

    protected getNestedStateHandlers() {
        return [];
    }
}

describe("StateHandlerUtils", () => {

    beforeEach(() => {
        (mockDispatch as any).mockClear();
        (coreRegistry.registerState as any).mockClear();
    });

    describe("registerOnStore", () => {
        it("registers reducer and publisher with correct store id", () => {
            // Arrange
            const stateHandler = new TestStateHandler();
            const testStoreId = "testStoreId";
            // Act
            registerOnStore(testStoreId, stateHandler);

            // Assert
            const regsiterStateCall = (coreRegistry.registerState as any).mock.calls[0];
            expect(regsiterStateCall[0]).toBe(testStoreId);
            expect(regsiterStateCall[1]).toBe(stateHandler.stateReducer);
            expect(regsiterStateCall[2]).toBe(stateHandler.statePublisher);
        });

        it("sets dispatch callback", () => {
            // Arrange
            const stateHandler = new TestStateHandler();
            const testStoreId = "testStoreId";
            // Act
            registerOnStore(testStoreId, stateHandler);

            // Assert
            expect(stateHandler.onDispatch).toHaveBeenCalledWith(mockDispatch);
        });
    });
});