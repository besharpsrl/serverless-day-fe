/* Global import */
import React, { Component } from "react";
import { Link } from "react-router-dom";
import { Nav, Navbar, NavItem } from "react-bootstrap";
import { Auth } from "aws-amplify";
import { withAuthenticator } from 'aws-amplify-react';

/* Import css */
import "./../css/App.css";

/* Import our component */
import Routes from "./../Routes";

/* App is the main file and we can define it as a bootstrap file*/
class App extends Component {

    constructor(props) {
        super(props);

        this.state = {
            isAuthenticated: false,
            isAuthenticating: true,
            isAdmin: false
        };
    }

    async componentDidMount() {
        try {
            if (await Auth.currentSession()) {
                this.userHasAuthenticated(true);

                let session = await Auth.currentUserPoolUser();
                this.setState({ isAdmin: (session.attributes.nickname === 'admin')});
            }
        }
        catch(e) {
            if (e !== 'No current user') {
                alert(e);
            }
        }

        this.setState({ isAuthenticating: false });
    }

    /**
     * Set the user as authenticated as we want to maintain the state across the entire app
     * @param {boolean} authenticated   - the boolean that define our state
     */
    userHasAuthenticated = authenticated => {
        this.setState({ isAuthenticated: authenticated });
        console.log(authenticated);
    };

    /**
     * Get the JwtToken from your session
     * @returns {Promise<string>}
     */
    getJwtToken = async () => {
        let jwtToken = "";
        await Auth.currentUserPoolUser().then((session) => {
            jwtToken  = session.signInUserSession.idToken.jwtToken;
        }).catch((error) => {});
        return jwtToken;
    };

    /**
     * Handle the logout event
     * @param event
     * @returns {Promise<void>}
     */
    handleLogout = async event => {
        Auth.signOut()
            .then(data => console.log(data))
            .catch(err => console.log(err));
        // By doing this, you are revoking all the auth tokens(id token, access token and refresh token)
        // which means the user is signed out from all the devices
        // Note: although the tokens are revoked, the AWS credentials will remain valid until they expire (which by default is 1 hour)
        Auth.signOut({ global: true })
            .then(data => console.log(data))
            .catch(err => console.log(err));

        window.location.reload();
    };

    /**
     * When we handle a route we set a link for navigation
     * @param {string} route   - url to navigate to
     */
    handleRouteInNavbar = (route) => {
        window.location.href = route;
    };

    /**
     * Render the common component, the navbar and most importantly the routes
     * @returns {*}
     */
    render() {
        const childProps = {
            isAuthenticated: this.state.isAuthenticated,
            userHasAuthenticated: this.userHasAuthenticated,
            getJwtToken: this.getJwtToken
        };

        return (
            <div className="App container">
                <Navbar fluid collapseOnSelect>
                    <Navbar.Header>
                        <Navbar.Brand>
                            <Link to="/">MyDoc Transfer</Link>
                        </Navbar.Brand>
                        <Navbar.Toggle />
                    </Navbar.Header>
                    <Navbar.Collapse>
                        <Nav pullRight>
                            <NavItem onClick={() => this.handleRouteInNavbar('/')}>My Documents</NavItem>
                            {
                                this.state.isAdmin && <NavItem onClick={() => this.handleRouteInNavbar('/audit/')}>Audit</NavItem>
                            }
                            <NavItem onClick={this.handleLogout}>Logout</NavItem>
                        </Nav>
                    </Navbar.Collapse>
                </Navbar>
                <Routes childProps={childProps}/>
            </div>
        );
    }
}

export default withAuthenticator(App);