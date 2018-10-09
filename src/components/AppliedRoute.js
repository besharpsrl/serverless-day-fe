import React from "react";
import { Route } from "react-router-dom";

/*
    We are creating a simple component that wraps the standard navigator Route,
    so we can pass the props to the inner view file that we link to the route as
    we can see in Routes.js
*/
export default ({ component: C, props: cProps, ...rest }) =>
    <Route {...rest} render={props => <C {...props} {...cProps} />} />;