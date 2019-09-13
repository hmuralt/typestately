# typestately

Recomposed approach of using redux with TypeScript. An idea showing how you can deal with state management using redux.

[![build status](https://img.shields.io/travis/hmuralt/typestately/master.svg?style=flat-square)](https://travis-ci.org/hmuralt/typestately)
[![npm version](https://img.shields.io/npm/v/typestately.svg?style=flat-square)](https://www.npmjs.com/package/typestately)

## Some goals

- Reduce needed type annotation by making use of type inference
- Reduce boilerplate code
- Encapsulate state details/concerns (e.g. key used for a reducer in the stores state object) in one place
- Easy way to plug new parts of global state in and out
- Support code-splitting
- Support multiple stores

## Examples/HowTo

A complete example can be found here: https://github.com/hmuralt/typestately-example

It shows the usage with state handlers (class) and an alternative usage with state contexts (objects & functions).

### Store

This is an example of how stores could be setup and registered.

_StoreContexts.ts_

```tsx
import { setupMainStoreContext } from "./StoreContextSetups";

const storeContexts = {
  Main: setupMainStoreContext()
};

export default storeContexts;
```

_StoreContextSetups.ts_

```tsx
import { createStore } from "redux";
import { createStoreContext } from "typestately";

export function setupMainStoreContext() {
  const store = createStore((state) => state || {});

  return createStoreContext(store, {});
}
```

### Counter example

#### State

_CounterState.ts_

```tsx
export default interface State {
  value: number;
  clicked: Date;
}

export const defaultState: State = {
  value: 0,
  clicked: new Date()
};
```

#### Actions

_CounterActions.ts_

```tsx
import { Action } from "redux";

export enum ActionType {
  Increment = "INCREMENT",
  Decrement = "DECREMENT"
}

export interface ChangeAction extends Action<ActionType> {
  type: ActionType;
  clicked: Date;
}
```

#### State handler

_CounterStateHandler.ts_

```tsx
import { StateHandler } from "typestately";
import Status from "components/Loader/State/Status";
import LoaderStateHandler from "components/Loader/State/LoaderStateHandler";
import { ChangeAction, ActionType } from "./CounterActions";
import State, { defaultState } from "./CounterState";

class CounterStateHandler extends StateHandler<State, ActionType> {
  @StateHandler.nested
  public readonly loaderStateHandler: LoaderStateHandler;

  constructor(loaderStateHandler: LoaderStateHandler) {
    super("counter", defaultState);

    this.loaderStateHandler = loaderStateHandler;
  }

  public increment(clicked: Date) {
    this.dispatch<ChangeAction>({
      type: ActionType.Increment,
      clicked
    });
  }

  public decrement(clicked: Date) {
    this.dispatch<ChangeAction>({
      type: ActionType.Decrement,
      clicked
    });
  }

  public incrementAsync(clicked: Date) {
    this.loaderStateHandler.setStatus(Status.Updating);
    window.setTimeout(() => {
      this.increment(clicked);
      this.loaderStateHandler.setStatus(Status.Done);
    }, 2000);
  }

  @StateHandler.reducer<State, ActionType>(ActionType.Increment)
  protected reduceIncrement(state: State, action: ChangeAction) {
    return {
      value: state.value + 1,
      clicked: action.clicked
    };
  }

  @StateHandler.reducer<State, ActionType>(ActionType.Decrement)
  protected reduceDecrement(state: State, action: ChangeAction) {
    return {
      value: state.value - 1,
      clicked: action.clicked
    };
  }
}
// Ideally managed by IOC container...
const counterStateHandler = new CounterStateHandler(new LoaderStateHandler());

export default counterStateHandler;
```

#### Component

_Counter.tsx_

```tsx
import * as React from "react";

export interface Props {
  value: number;
  clicked: Date;
  onIncrement: (clicked: Date) => void;
  onIncrementAsync: (clicked: Date) => void;
  onDecrement: (clicked: Date) => void;
}

export default class Counter extends React.Component<Props> {
  constructor(props: Props) {
    super(props);

    this.increment = this.increment.bind(this);
    this.incrementAsync = this.incrementAsync.bind(this);
    this.decrement = this.decrement.bind(this);
  }

  public render() {
    return (
      <div>
        <p>
          Value: {this.props.value} (clicked: {this.props.clicked.toLocaleString()})
        </p>
        <p>
          <button onClick={this.decrement}>-</button>
          <button onClick={this.increment}>+</button>
        </p>
        <p>
          <button onClick={this.incrementAsync}>+ (async)</button>
        </p>
      </div>
    );
  }

  private increment() {
    this.props.onIncrement(new Date());
  }

  private incrementAsync() {
    this.props.onIncrementAsync(new Date());
  }

  private decrement() {
    this.props.onDecrement(new Date());
  }
}
```

#### Container

_Counter.ts_

```tsx
counterStateHandler.attachTo(storeContexts.Main.hub);

export default withStateToProps(
  counterStateHandler,
  (counterState): Props => {
    return {
      value: counterState.value,
      clicked: counterState.clicked,
      onIncrement: (clicked: Date) => counterStateHandler.increment(clicked),
      onIncrementAsync: (clicked: Date) => counterStateHandler.incrementAsync(clicked),
      onDecrement: (clicked: Date) => counterStateHandler.decrement(clicked)
    };
  }
)(Counter);
```
