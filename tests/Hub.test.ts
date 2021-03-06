import { createHub } from "../src/core/Hub";
import { createDirigiblePublisher } from "../src/core/DirigiblePublisher";

jest.mock("../src/core/DirigiblePublisher");

describe("Hub", () => {
  describe("when destroyed", () => {
    let destroyFunctions: Array<() => void>;

    beforeEach(() => {
      destroyFunctions = [];

      (createDirigiblePublisher as jest.Mock).mockImplementation(() => {
        const destroy = jest.fn();
        destroyFunctions.push(destroy);
        return {
          destroy
        };
      });
    });

    it("destroys all publishers", () => {
      // Arrange
      const { destroy } = createHub();

      // Act
      destroy();

      // Assert
      expect(destroyFunctions[0]).toHaveBeenCalled();
      expect(destroyFunctions[1]).toHaveBeenCalled();
      expect(destroyFunctions[2]).toHaveBeenCalled();
      expect(destroyFunctions[3]).toHaveBeenCalled();
    });
  });
});
