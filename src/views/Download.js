/* Globals */
import React, { Component } from "react";
import { Auth, Storage, API } from "aws-amplify";

/* Import css */
import "./../css/Download.css";

/* In this page we download a file if we are authorized to do so */
export default class Download extends Component {

    constructor(props) {
        super(props);

        // Setting a pre state
        this.state = {
            user: null,
            message: 'You don\'t have permission to download this file, or the link is expired.',
            className: 'alert alert-warning'
        }
    }

    async componentDidMount() {

        // Get the user
        let session = await Auth.currentSession();
        if (session) {
            // SET THE USER ON DESIGN
            this.setState({ user: session.idToken.payload.given_name + " " + session.idToken.payload.family_name });
        }

        let share_id = this.props.match.params.share_id;
        let _this = this;
        if(share_id !== undefined && share_id !== null) {

            // Setting the state telling that we can download the file
            _this.setState({
                message: 'Your file will be downloaded. Thanks for using MyDoc Transfer.',
                className: 'alert alert-success'
            });

            // Ask for the download link
            let token = await this.props.getJwtToken();
            let apiName = 'mydoctransfer';
            let path = '/share/' + share_id;
            let myInit = {
                headers: { Authorization: token },
                response: false,
                queryStringParameters: {}
            };

            API.get(apiName, path, myInit).then(response => {
                // if the response is the url download the file leaving the state as it is
                if(typeof(response.download_link) === "string") {
                    window.location.href = response.download_link;
                }

                // if we receive an object as a response we have an error message so present it
                if(typeof(response.download_link) === 'object') {
                    _this.setState({
                        message: 'You don\'t have permission to download this file.',
                        className: 'alert alert-warning'
                    });
                }
            }).catch(error => {
                // In case of error present it!
                console.log(error);
                _this.setState({
                    message: 'You don\'t have permission to download this file, or the link is expired.',
                    className: 'alert alert-warning'
                });
            });
        }
    }

    /* render the component */
    render(){
        const user = this.state.user;
        return (
            <div className="Download">
                <div className="lander">
                    <div className="row">
                        <div className="col-xs-12 col-sm-12 col-md-12 col-lg-12">
                            <h1>Download For</h1>
                            <p>{user}</p>
                            <br/>
                            <p className={this.state.className}>{this.state.message}</p>
                        </div>
                    </div>
                </div>
            </div>
        )
    }
}