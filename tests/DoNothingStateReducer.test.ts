import DoNothingStateReducer from "../src/DoNothingStateReducer";

describe("DoNothingStateReducer", () => {
    describe("extend", () => {
        it("returns same map object without changes", () => {
            // Arrange
            const doNothingStateReducer = new DoNothingStateReducer();
            const reducersMapObject = {};

            // Act
            const extendedReducersMapObject = doNothingStateReducer.extend(reducersMapObject);

            // Assert
            expect(extendedReducersMapObject).toBe(reducersMapObject);
            expect(Object.keys(extendedReducersMapObject).length).toBe(0);
        });
    });

});