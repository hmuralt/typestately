import StateProvider from "../core/StateProvider";
import UseObservable from "./UseObservable";

export default function useStateProvider<TState>(stateProvider: StateProvider<TState>) {
  return UseObservable(stateProvider.state$, stateProvider.state);
}
