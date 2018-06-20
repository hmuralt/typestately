import ReducerRegistry from "../src/ReducerRegistry";

describe("ReducerRegistry", () => {
    describe("registerReducer", () => {
        it("calls listener with updated reducers map object", () => {
            // Arrange
            const initialReducersMapObject = {
                mockReducer: jest.fn()
            };
            const mockStateReducer = {
                extend: jest.fn((reducersMapObject) => reducersMapObject)
            };
            const mockListener = jest.fn();
            const reducerRegistry = new ReducerRegistry(mockListener, initialReducersMapObject);

            // Act
            reducerRegistry.registerReducer(mockStateReducer);

            // Assert
            expect(mockListener).toHaveBeenCalledWith(initialReducersMapObject);
        });
    });
});