import * as React from "react";
import { Observable, Subscription } from "rxjs";

interface State<TState> {
  content: TState;
}

export default function withStateToProps<TState, TProps, TOwnProps = {}>(
  defaultState: TState,
  state$: Observable<TState>,
  stateToProps: (state: TState, ownProps: TOwnProps) => TProps
): (Component: React.ComponentType<TProps>) => React.ComponentClass<TOwnProps> {
  return (Component: React.ComponentType<TProps>) => {
    return class StateToProps extends React.PureComponent<TOwnProps, State<TState>> {
      private subscription: Subscription;

      constructor(props: TOwnProps) {
        super(props);

        this.state = {
          content: defaultState
        };

        this.onStateChanged = this.onStateChanged.bind(this);
      }

      public componentDidMount() {
        this.subscription = state$.subscribe(this.onStateChanged);
      }

      public render() {
        const innerProps = stateToProps(this.state.content, this.props);
        return <Component {...innerProps}>{this.props.children}</Component>;
      }

      public componentWillUnmount() {
        this.subscription.unsubscribe();
      }

      private onStateChanged(state: TState) {
        this.setState({
          content: state
        });
      }
    };
  };
}
