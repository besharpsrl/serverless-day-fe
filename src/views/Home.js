import React, { Component } from "react";
import { Auth, Storage, API } from "aws-amplify";

import "./../css/Home.css";

import Table from "./../components/Table"
import DropZoneArea from "./../components/DropZone"

export default class Home extends Component {

    constructor(props) {
        super(props);
        this.state = { user: null }
    }

    /**
     * We are using the standard nickname attribute of cognito as
     * a "space" to use for setting an attribute we will use inside the software
     * @returns {Promise<void>}
     */
    async componentDidMount() {
        try {
            let session = await Auth.currentSession();
            let myUser = await Auth.currentAuthenticatedUser();

            // If the attribute is not set we set it for the first time
            if(myUser.attributes.nickname === undefined) {
                let result = await Auth.updateUserAttributes(myUser, {
                    'nickname': 'user'
                });
            }

            // Here we are presenting the user to the render method using the state
            if (session) {
                // SET THE USER ON DESIGN
                this.setState({ user: session.idToken.payload.given_name + " " + session.idToken.payload.family_name });
            }

            // Check if we have a share id and resend to correct path
            const regex = /share=([A-Fa-f0-9]+)/g;
            let parsed = regex.exec(this.props.location.search);
            if(parsed !== null) {
                window.location.href = "/share/" + parsed[1];
                return;
            }
        }
        catch(e) {
            alert(e);
        }
    }

    /**
     * Get the token from the props, we are using the props trick to get a function from another component.
     * In fact in javascript even a function is an object so we can map the function object to a variable and pass it through the components.
     * Another way would have been to map the function in a generic class like the other examples, but for the sake of this demo we
     * are providing several option to achieve the same results.
     */
    getToken = () => {
        this.props.getJwtToken().then((r) => {
            console.log(r);
        });
    };

    /**
     * We are rendering the DropZone and the Table component
     * @returns {*}
     */
    render() {
        const user = this.state.user;
        return (
            <div className="Home">
                <div className="lander">
                    <div className="row">
                        <div className="col-xs-12 col-sm-12 col-md-4">
                            <h1>Hello, </h1>
                            <p>{user}</p>
                            <br/>
                            <div>
                                <DropZoneArea table={this.table}/>
                            </div>
                        </div>

                        <div className="col-xs-12 col-sm-12 col-md-8">
                            <div>
                                <h1>Your currently available documents</h1>
                                <p>note: if you are the owner, you can change the users to share the document with by clicking on the <b>'Shared With'</b> row.</p>
                            </div>
                            <Table ref={table => this.table = table} data={this.props}/>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}