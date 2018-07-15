re-composed
===========
Recomposed approach of using redux with TypeScript in a react app. An idea showing how you can deal with state management using redux.  
## Some goals
* Reduce needed type annotation by making use of type inference
* Reduce boilerplate code 
* Encapsulate state details/concerns (e.g. key used for a reducer in the stores state object) in one place
* Easy way to plug new parts of global state in and out
* Support code-splitting
* Support multiple stores

## Examples/HowTo

### Store

This is an example of how stores could be setup, registered and tracked by id.

_StoreIds.ts_
```tsx
import { setupMainStore } from "./StoreSetups";

const storeIds = {
    Main: setupMainStore()
};

export default storeIds;
```

_StoreSetup.ts_
```tsx
export function setupMainStore() {
    const initalReducers = {
        router: routerReducer
    };

    const store = createStore(combineReducers(initalReducers), applyMiddleware(routerMiddleware(history)));

    return coreRegistry.registerStore(store, initalReducers);
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
export enum ActionType {
    Increment = "INCREMENT",
    Decrement = "DECREMENT"
}

export interface ChangeAction extends ReduxAction<ActionType> {
    type: ActionType;
    clicked: Date;
}
```

#### State handler

_CounterStateHandler.ts_
```tsx
@DecoratedStateHandler
class CounterStateHandler extends StateHandler<State, ActionType> {

    constructor() {
        super("counter", defaultState);
    }

    public dispatchIncrement(clicked: Date) {
        this.dispatch<ChangeAction>({
            type: ActionType.Increment,
            clicked
        });
    }

    public dispatchDecrement(clicked: Date) {
        this.dispatch<ChangeAction>({
            type: ActionType.Decrement,
            clicked
        });
    }

    public incrementAsync(clicked: Date) {
        return new Promise<void>((resolve) => {
            window.setTimeout(
                () => {
                    this.dispatchIncrement(clicked);
                    resolve();
                },
                2000
            );
        });
    }

    @Reducer<State, ActionType>(ActionType.Increment)
    protected increment(state: State, action: ChangeAction) {
        return {
            value: state.value + 1,
            clicked: action.clicked
        };
    }

    @Reducer<State, ActionType>(ActionType.Decrement)
    protected decrement(state: State, action: ChangeAction) {
        return {
            value: state.value - 1,
            clicked: action.clicked
        };
    }
}

const counterStateHandler = new CounterStateHandler();

registerOnStore(storeIds.Main, counterStateHandler);

export default counterStateHandler;
```

#### Component

_Counter.tsx_
```tsx
export interface Props {
    value: number;
    clicked: Date;
    onIncrement: (clicked: Date) => void;
    onIncrementAsync: (clicked: Date) => Promise<void>;
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
                <p>Value: {this.props.value} (clicked: {this.props.clicked.toLocaleString()})</p>
                <p>
                    <button onClick={this.increment}> + </button>
                    <button onClick={this.decrement}> - </button>
                </p>
                <p>
                    <button onClick={this.incrementAsync}> + (async) </button>
                </p>
            </div>
        );
    }

    private increment() {
        this.props.onIncrement(new Date());
    }

    private incrementAsync() {
        this.props
            .onIncrementAsync(new Date())
            .then(() => {
                console.log("async done!")
            });
    }

    private decrement() {
        this.props.onDecrement(new Date());
    }
}
```

#### Container

_Counter.ts_
```tsx
export default withStateToProps<State, Props>(
    counterStateHandler.stateProvider,
    (counterState) => {
        return {
            value: counterState.value,
            clicked: counterState.clicked,
            onIncrement: (clicked: Date) => counterStateHandler.dispatchIncrement(clicked),
            onIncrementAsync: (clicked: Date) => counterStateHandler.incrementAsync(clicked),
            onDecrement: (clicked: Date) => counterStateHandler.dispatchDecrement(clicked)
        };
    }
)(Counter);
```