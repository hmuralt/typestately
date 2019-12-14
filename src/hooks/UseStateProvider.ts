import StateProvider from "../core/StateProvider";
import useObservable from "./UseObservable";

export default function useStateProvider<TState>(stateProvider: StateProvider<TState>) {
  return useObservable(stateProvider.state$, stateProvider.state);
}
