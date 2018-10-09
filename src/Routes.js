import React from "react";
import { Switch } from "react-router-dom";

// We are importing our views
import Home from "./views/Home";
import NotFound from "./views/NotFound";
import Download from "./views/Download";
import Audit from "./views/Audit";

// AppliedRoute is our component which basically inject custom props inside the normal ones
import AppliedRoute from "./components/AppliedRoute"

// This is like a route file: if the route is defined with *path* we are going to that route, otherwise we default to not found
export default ({ childProps }) =>
    <Switch>
        <AppliedRoute path="/" exact component={Home} props={childProps} />
        <AppliedRoute path="/share/:share_id" exact component={Download} props={childProps} />
        <AppliedRoute path="/audit/" exact component={Audit} props={childProps} />
        <AppliedRoute component={NotFound} />
    </Switch>;