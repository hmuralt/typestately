import * as React from "react";
import { Dispatch } from "redux";
import StateProvider, { unsubsribe } from "../../StateProvider";
import WithStore, { Props as WithStoreProps } from "../WithStore/WithStore";

export default function withStateToProps<TState, TProps>(
    stateProvider: StateProvider<TState>,
    stateToProps: (state: TState, dispatch: Dispatch) => TProps,
    store: string
) {
    return (Component: React.ComponentType<TProps>) => {
        class StateToProps extends React.PureComponent<WithStoreProps, TProps> {
            private unsubscribe: unsubsribe;

            constructor(props: WithStoreProps) {
                super(props);
                this.onStateChanged = this.onStateChanged.bind(this);
                this.state = stateToProps(stateProvider.getState(), this.getDispatch());
            }

            public componentDidMount() {
                this.unsubscribe = stateProvider.subscribe(this.onStateChanged);
                this.onStateChanged(stateProvider.getState());
            }

            public render() {
                return (
                    <Component {...this.props} {...this.state} />
                );
            }

            public componentWillUnmount() {
                this.unsubscribe();
            }

            private onStateChanged(state: TState) {
                this.setState(stateToProps(state, this.getDispatch()));
            }

            private getDispatch(): Dispatch {
                return this.props.store ? this.props.store.dispatch : this.doNothingDispatch;
            }

            // tslint:disable-next-line:no-empty no-any
            private doNothingDispatch(action: any) {
            }
        }

        return WithStore(store)(StateToProps);
    };
}