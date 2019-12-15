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

It shows the usage with state handlers (class) and an alternative usage with plain objects & functions.

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

### Counter example with state handler classes

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

### Counter example with state handler functions (alternative to classes)

#### State

```tsx
export default interface CounterState {
  value: number;
  clicked: Date;
}

export const defaultCounterState: CounterState = {
  value: 0,
  clicked: new Date()
};
```

#### Actions

_CounterActions.ts_

```tsx
export enum ActionType {
  Increment = "INCREMENT",
  Decrement = "DECREMENT"
}

export interface ChangeAction extends Action<ActionType> {
  type: ActionType;
  clicked: Date;
}
```

#### Reducer

```tsx
function increment(state: CounterState, action: ChangeAction) {
  return {
    value: state.value + 1,
    clicked: action.clicked
  };
}

function decrement(state: CounterState, action: ChangeAction) {
  return {
    value: state.value - 1,
    clicked: action.clicked
  };
}

const counterReducer = createExtensibleReducer<CounterState, ActionType>()
  .handling(ActionType.Increment, increment)
  .handling(ActionType.Decrement, decrement);

export default counterReducer;
```

#### State handler

```tsx
const counterStateDefinition = defineState(defaultCounterState)
  .makeStorableUsingKey("counter")
  .setReducer(() => counterReducer)
  .setActionDispatchers({
    increment(dispatch: Dispatch<ActionType>, clicked: Date) {
      dispatch<ChangeAction>({
        type: ActionType.Increment,
        clicked
      });
    },
    decrement(dispatch: Dispatch<ActionType>, clicked: Date) {
      dispatch<ChangeAction>({
        type: ActionType.Decrement,
        clicked
      });
    }
  });

export function createCounterStateHandler(hub: Hub) {
  const counterStateHandler = counterStateDefinition.createStateHandler(hub);
  const loaderStateHandler = createLoaderStateHandler(hub, counterStateHandler.contextId);
  const extensions = {
    incrementAsync(clicked: Date) {
      loaderStateHandler.setStatus(Status.Updating);

      window.setTimeout(() => {
        counterStateHandler.increment(clicked);

        loaderStateHandler.setStatus(Status.Done);
      }, 2000);
    }
  };

  return Object.assign(counterStateHandler, extensions, {
    loaderStateProvider: withStateProvider(loaderStateHandler)({})
  });
}
```

#### Container

```tsx
const CounterContainer: React.FC = () => {
  const counterStateHandler = React.useMemo(() => createCounterStateHandler(storeContexts.FunctionsExample.hub), []);
  const counterState = useStateProvider(counterStateHandler);

  return (
    <Counter
      value={counterState.value}
      clicked={counterState.clicked}
      onIncrement={counterStateHandler.increment}
      onIncrementAsync={counterStateHandler.incrementAsync}
      onDecrement={counterStateHandler.decrement}
    />
  );
};
```
