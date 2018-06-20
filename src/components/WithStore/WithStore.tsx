import * as React from "react";
import { Store as ReduxStore } from "redux";
import coreRegistry from "../../CoreRegistry";

export interface Props {
    store?: ReduxStore<{}>;
}

export interface OwnProps {
    store?: ReduxStore<{}>;
}

export default function withStore(storeId: string) {
    return <TProps extends Props>(Component: React.ComponentType<TProps>) => {

        const StoreContainer: React.StatelessComponent<OwnProps> = (ownProps) => {
            const StoreContext = React.createContext(coreRegistry.getStore(storeId));

            if (StoreContext === undefined) {
                return null;
            }

            return (
                ownProps.store ?
                    (
                        <Component {...ownProps} store={ownProps.store} />
                    ) :
                    (
                        <StoreContext.Consumer>
                            {(store) => <Component {...ownProps} store={store} />}
                        </StoreContext.Consumer>
                    )
            );
        };

        return StoreContainer;
    };
}