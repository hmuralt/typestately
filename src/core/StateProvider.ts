import { Observable, combineLatest } from "rxjs";

export default interface StateProvider<TState> {
  readonly state: TState;
  state$: Observable<TState>;
}

export function combine<TState1, TState2>(
  stateProvider1: StateProvider<TState1>,
  stateProvider2: StateProvider<TState2>
): StateProvider<[TState1, TState2]>;
export function combine<TState1, TState2, TState3>(
  stateProvider1: StateProvider<TState1>,
  stateProvider2: StateProvider<TState2>,
  stateProvider3: StateProvider<TState3>
): StateProvider<[TState1, TState2, TState3]>;
export function combine<TState1, TState2, TState3, TState4>(
  stateProvider1: StateProvider<TState1>,
  stateProvider2: StateProvider<TState2>,
  stateProvider3: StateProvider<TState3>,
  stateProvider4: StateProvider<TState4>
): StateProvider<[TState1, TState2, TState3, TState4]>;
export function combine<TState1, TState2, TState3, TState4, TState5>(
  stateProvider1: StateProvider<TState1>,
  stateProvider2: StateProvider<TState2>,
  stateProvider3: StateProvider<TState3>,
  stateProvider4: StateProvider<TState4>,
  stateProvider5: StateProvider<TState5>
): StateProvider<[TState1, TState2, TState3, TState4, TState5]>;
export function combine<TState1, TState2, TState3, TState4, TState5, TState6>(
  stateProvider1: StateProvider<TState1>,
  stateProvider2: StateProvider<TState2>,
  stateProvider3: StateProvider<TState3>,
  stateProvider4: StateProvider<TState4>,
  stateProvider5: StateProvider<TState5>,
  stateProvider6: StateProvider<TState6>
): StateProvider<[TState1, TState2, TState3, TState4, TState5, TState6]>;

export function combine(...stateProviders: Array<StateProvider<{}>>) {
  return {
    state: stateProviders.map((stateProvider) => stateProvider.state),
    state$: combineLatest(stateProviders.map((stateProvider) => stateProvider.state$))
  };
}

export function withStateProvider<TState>(stateProvider: StateProvider<TState>) {
  return <TTarget extends {}>(target: TTarget) => {
    return {
      ...target,
      get state() {
        return stateProvider.state;
      },
      state$: stateProvider.state$
    } as TTarget & StateProvider<TState>;
  };
}
