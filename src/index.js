import React from 'react';
import ReactDOM from 'react-dom';
import './css/index.css';
import App from './views/App';
import { BrowserRouter as Router } from "react-router-dom";
import registerServiceWorker from './registerServiceWorker';
import Amplify, { Storage } from "aws-amplify";
import { withAuthenticator, Greetings, SignIn, ConfirmSignIn, VerifyContact, ForgotPassword, RequireNewPassword } from 'aws-amplify-react';

import config from "./config";


/**
 * Here we launch the react app by calling an High Order Component which envelope the standard App one
 */
const AppWithAuth = withAuthenticator(App, false, [
    <Greetings />,
    <SignIn />,
    <ConfirmSignIn />,
    <RequireNewPassword />,
    <VerifyContact />,
    <ForgotPassword />
]);

// Here we are configuring Aws Amplify with our custom config file: here we
// are using the export default const trick to use the file with the import call
Amplify.configure({
    Auth: {
        mandatorySignIn: true,
        region: config.cognito.REGION,
        userPoolId: config.cognito.USER_POOL_ID,
        identityPoolId: config.cognito.IDENTITY_POOL_ID,
        userPoolWebClientId: config.cognito.APP_CLIENT_ID,
    },
    Storage: {
        region: config.s3.REGION,
        bucket: config.s3.BUCKET,
        identityPoolId: config.cognito.IDENTITY_POOL_ID
    },
    API: {
        endpoints: [
            {
                name: config.apiGateway.NAME,
                endpoint: config.apiGateway.URL,
                region: config.apiGateway.REGION
            },
        ]
    }
});

// Finally we call the ReactDOM.render which is our "main"
ReactDOM.render(
    <Router>
        <AppWithAuth />
    </Router>,
    document.getElementById("root"));

registerServiceWorker();