import * as React from "react";
import { Store } from "redux";
import coreRegistry, { Unsubscribe } from "../../CoreRegistry";

export interface Props {
    store?: Store<{}>;
}

export interface OwnProps {
    store?: Store<{}>;
}

interface OwnState {
    store: Store;
}

export default function withStore(storeId: string) {
    return <TProps extends Props>(Component: React.ComponentType<TProps>) => {

        return class StateToProps extends React.PureComponent<OwnProps, OwnState> {
            public unsubscribe: Unsubscribe;

            constructor(props: OwnProps) {
                super(props);
                this.state = {
                    store: coreRegistry.getStore(storeId)
                };
            }

            public componentDidMount() {
                this.unsubscribe = coreRegistry.subscribe(storeId, (store) => {
                    this.setState({
                        store
                    });
                });
            }

            public render() {
                return (
                    this.props.store ?
                        (
                            <Component {...this.props} store={this.props.store} />
                        ) :
                        (
                            <Component {...this.props} store={this.state.store} />
                        )
                );
            }

            public componentWillUnmount() {
                this.unsubscribe();
            }
        };
    };
}