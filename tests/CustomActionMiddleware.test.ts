import { Dispatch, Action as ReduxAction, MiddlewareAPI } from "redux";
import customActionMiddleware from "../src/CustomActionMiddleware";
import DispatchingAction from "../src/DispatchingAction";
import Action from "../src/Action";

class TestDispatchingAction extends DispatchingAction {

    constructor(public mock: jest.Mock, public testAction: ReduxAction) {
        super();
    }

    public execute(dispatch: Dispatch): void {
        dispatch(this.testAction);
        this.mock();
    }
}

class TestAction extends Action {
    constructor(public testProperty: string) {
        super("testaction");
    }
}

// tslint:disable:no-any
describe("customActionMiddleware", () => {
    let mockMiddlewareApi: MiddlewareAPI;
    let mockDispatch: jest.Mock;
    let mockNext: jest.Mock;

    beforeEach(() => {
        mockDispatch = jest.fn();
        mockMiddlewareApi = {
            getState: jest.fn(),
            dispatch: mockDispatch
        };
        mockNext = jest.fn();
    });

    it("executes action if dispatching action", () => {
        // Arrange
        const mock = jest.fn();
        const action = new TestDispatchingAction(mock, { type: "test" });

        // Act
        customActionMiddleware(mockMiddlewareApi as any)(mockNext)(action);

        // Assert
        expect(mock).toHaveBeenCalledTimes(1);
    });

    it("passes dispatch if dispatching action", () => {
        // Arrange
        const testAction = { type: "test" };
        const action = new TestDispatchingAction(jest.fn(), testAction);

        // Act
        customActionMiddleware(mockMiddlewareApi as any)(mockNext)(action);

        // Assert
        expect(mockDispatch).toHaveBeenCalledWith(testAction);
    });

    it("executes next if is action", () => {
        // Arrange
        const action = new TestAction("the property");

        // Act
        customActionMiddleware(mockMiddlewareApi as any)(mockNext)(action);

        // Assert
        expect(mockNext).toHaveBeenCalledWith(action);
    });

    it("executes next if is simple redux action", () => {
        // Arrange
        const action = {
            type: "reduxtestaction"
        };

        // Act
        customActionMiddleware(mockMiddlewareApi as any)(mockNext)(action);

        // Assert
        expect(mockNext).toHaveBeenCalledWith(action);
    });
});