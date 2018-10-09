/* Import globals */
import React, { Component } from "react";
import { Auth, Storage, API } from "aws-amplify";
import AuditTable from '../components/AuditTable';

/* Import audit css */
import "./../css/Audit.css";

/* The Audit view: this component is really simple: we render a table only if the user is an admin one */
export default class Audit extends Component {

    constructor(props) {
        super(props);
        this.state = {
            user: null,
            nickname: 'admin'
        }
    }

    /**
     * We get the user and check if it if an admin one
     * @returns {Promise<void>}
     */
    async componentDidMount() {

        // Get the user
        let user = await Auth.currentAuthenticatedUser();
        if(user.attributes.nickname !== "admin") {
            this.setState({nickname: 'user'})
        }

        // The auth session
        let session = await Auth.currentSession();
        if (session) {
            // SET THE USER ON DESIGN
            this.setState({ user: session.idToken.payload.given_name + " " + session.idToken.payload.family_name });
        }
    }

    /**
     * We are rendering the component
     * @returns {*}
     */
    render(){
        const user = this.state.user;
        return (
            <div className="Audit">
                <div className="lander">
                    <div className="row">
                        {
                            (this.state.nickname !== 'admin') ?

                            <div className="col-xs-12 col-sm-12 col-md-12">
                                <h1>Hello, {user}. You're not authorized to see this page.</h1>
                                <p>Please go back to your documents.</p>
                            </div>
                                :
                            <div className="col-xs-12 col-sm-12 col-md-12">
                                <h1>Hello, {user}. This is the Audit Log as
                                    of {new Date().toLocaleDateString("en-US")}</h1>
                                <p>You can explore the actions done by the users as of today. Note that the number of
                                    information you can see here can be customized in the future to better fit your
                                    needs.</p>
                                <AuditTable ref={table => this.table = table} data={this.props}/>
                            </div>
                        }
                    </div>
                </div>
            </div>
        )
    }
}