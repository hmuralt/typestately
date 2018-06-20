import { Dispatch } from "redux";

export default abstract class DispatchingAction {
    public abstract execute(dispatch: Dispatch): void;
}
