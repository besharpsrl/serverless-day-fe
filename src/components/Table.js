/* Import global components */
import React from "react";
import MaterialIcon, {colorPalette} from 'material-icons-react';
import ReactTable from "react-table";
import { OverlayTrigger, Tooltip } from "react-bootstrap";
import { API, Auth } from "aws-amplify";
import Modal from 'react-modal';
import Select from 'react-select';
import { confirmAlert } from 'react-confirm-alert';
import FileIcon, { defaultStyles } from 'react-file-icon';
import {CopyToClipboard} from 'react-copy-to-clipboard';

/* Import css */
import 'react-confirm-alert/src/react-confirm-alert.css'
import 'react-table/react-table.css'
import "./../css/Table.css"

/* Import our global library */
import { HumanFileSize, guid } from "./../libs/globals"
import config from "./config";

/* Set the root element for the Modal Component  which refers to our root div in index.js */
Modal.setAppElement('#root');

/* This is the main Table component: it is used to present the documents and it handles the actions of every row */
export default class Table extends React.Component {

    /**
     * This is the constructor for the table: we are defining the state of this component
     * as well as binding the modal actions required by the component
     *
     * @param props
     */
    constructor(props) {
        super(props);

        // here we are defining some important states
        //
        // - data: will hold our list of files
        // - modalIsOpen(x): are used to define if the modal is open or not: this is because when we work in
        //                   react we can't control the flow of the DOM so we are using the state to control the behaviour of the modal
        // - shareOptions: the options of the select component
        // - selectedOption: the selected option
        // - copied: set the state of the label in the modal
        // - share_id: contains the id of document in the sense of a sharable object. Every document is defined by a shared_id
        // - original_filename: is used to know the original filename before renaming
        // - filename: the filename of the current document
        // - forbidden: prevents to add one or more users to the shared list as per example
        // - forbiddenMails: is the list of users who can't read and download the document
        //
        this.state = {
            data: [],
            modalIsOpen: false,
            modalIsOpen2: false,
            modalIsOpen3: false,
            shareOptions: [],
            selectedOption: null,
            copied: false,
            share_id: '',
            original_filename: '',
            filename: '',
            forbidden: false,
            forbiddenMails: [],
            retry: 0
        };

        // These are the modal actions
        this.openModal = this.openModal.bind(this);
        this.afterOpenModal = this.afterOpenModal.bind(this);
        this.closeModal = this.closeModal.bind(this);

        this.openModal2 = this.openModal2.bind(this);
        this.closeModal2 = this.closeModal2.bind(this);

        this.openModal3 = this.openModal3.bind(this);
        this.closeModal3 = this.closeModal3.bind(this);
    }

    /**
     * It sets the selected option based on the callback by the select
     * @param {Array} selectedOption - the option(s) of the select component
     *
     */
    handleChange = (selectedOption) => {
        this.setState({ selectedOption });
    };

    /**
     * Here we read the forbidden state, if we are in forbidden state an alert is shown,
     * we set the timeout to close it and the list of mails that we show in that alert.
     *
     */
    handleForbidden = () => {
        let forbidden = this.state.forbidden;
        let _this = this; // this is a simple trick to maintain the context of the original *this*
        if(forbidden) {
            setTimeout(function(){
                _this.setState({ forbidden: false, forbiddenMails: [] });
            }, 3000);
        }
    };

    /**
     * Save the shared list by setting a call to our API Gateway Service:
     * we also call the RefreshTable() method to update the list of documents.
     * We also handle the forbidden.
     *
     * @returns {Promise<void>}
     */
    saveShare = async () => {
        let selectedOption = this.state.selectedOption;
        selectedOption = selectedOption.map(i => i.value);

        // getJwtToken() retrieve our auth token to make the call, as it return
        // a promise we use await to wait untile we are sure to retrieve the value.
        let token = await this.props.data.getJwtToken();
        let apiName = 'mydoctransfer';
        let path = '/share/' + this.state.share_id;
        let myInit = {
            body: { users: selectedOption },
            headers: { Authorization: token },
            response: false // response: false means that we want to receive only the return object of the lambda and not the entire api-gateway object
        };

        let _this = this;

        // Make the call
        API.post(apiName, path, myInit).then(response => {
            _this.closeModal();
            _this.RefreshTable();
            if(response.forbidden !== undefined) {
                _this.setState({ forbidden: true, forbiddenMails: response.forbidden });
                _this.handleForbidden();
            }
        }).catch(error => {
            console.log(error);
        });
    };

    /**
     * [SHARE TO USER MODAL] Open the first modal and set the share_id of the object and
     * the *already shared* list of users to pre-populate the select object
     *
     * @param {string}   share_id   - the share id of the file
     * @param {Array}    shareds    - the shared list of user for the selected document
     */
    openModal(share_id, shareds) {
        let selectedOption = [];
        shareds.forEach(function(val){
            selectedOption.push({
                value: val.email + "#" + val.name + "#" + val.surname,
                label: val.name + " " + val.surname
            });
        });

        // We set the state relative to this modal operation. Every component in react lives by its
        // state so for every dynamic object we need to set the appropriate property
        this.setState({modalIsOpen: true, share_id: share_id, selectedOption: selectedOption});
    }

    /**
     * [SHARE LINK MODAL] Open the second modal passing the share_id for generating the share link
     * @param {string} share_id   - the share id of the file
     */
    openModal2(share_id) {
        this.setState({modalIsOpen2: true, share_id: share_id});
    }

    /**
     * [RENAME MODAL] Add the possibility to rename the file, here we pass the share_id and the original filename.
     * Every time the share_id is used to make the call to API Gateway
     *
     * @param {string} share_id   - the share_id of the file
     * @param {string} filename   - the original filename
     */
    openModal3(share_id, filename) {
        this.setState({modalIsOpen3: true, share_id: share_id, original_filename: filename});
    }

    /**
     * After Modal Open callback. It's used to define the list of possible values for the select component
     * @returns {Promise<void>}
     */
    async afterOpenModal() {

        // We use the user to remove it from the list of user as it is useless to shareyour document with yourself
        let user = await Auth.currentAuthenticatedUser();
        let token = await this.props.data.getJwtToken();

        // Prepare the API call
        let apiName = 'mydoctransfer';
        let path = '/share/users';
        let myInit = {
            headers: { Authorization: token },
            response: false,
            queryStringParameters: {}
        };

        // Call the API and set the options array
        API.get(apiName, path, myInit).then(response => {

            const options = [];
            response.forEach(function(val){
                if(val.email !== user.attributes.email)
                    options.push({
                        value: val.email + "#" + val.name + "#" + val.surname,
                        label: val.name + " " + val.surname
                    });
            });

            // Set the options
            this.setState({ shareOptions: options });
        }).catch(error => {
            console.log(error);
            this.setState({ shareOptions: [] });
        });
    }

    // We have closed
    closeModal()  { this.setState({modalIsOpen: false}); }
    closeModal2() { this.setState({modalIsOpen2: false, copied: false}); }
    closeModal3() { this.setState({modalIsOpen3: false }); }

    // We call the componentDidMount() when the component lives to set the initial state of the table.
    componentDidMount() {
        this.RefreshTable();
    }

    /**
     * We use this method to Refresh the table and the forceRefresh boolean is used by external calls
     * to force a polling behaviour for big files as we need some time from the backend to finish all the operations
     *
     * @param {boolean} forceRefresh   - if true we force a polling behaviour, if undefined we launch the call just one time
     * @returns {Promise<void>}
     * @constructor
     */
    async RefreshTable(forceRefresh) {

        // We keep the original length of the table as we will use it when forceRefresh is true
        let _this = this;
        let originalLength = this.state.data.length;

        // We make the API call
        let token = await this.props.data.getJwtToken();
        let apiName = 'mydoctransfer';
        let path = '/docs';
        let myInit = {
            headers: { Authorization: token },
            response: false,
            queryStringParameters: {}
        };

        // This is a private function to transform the data that comes from
        let transformData = function(response) {
            response.forEach(function(row){
                let parts = row.display_name.split(".");
                let ext = parts[parts.length - 1];

                row.extension = ext;
                row.actions = {
                    sharable:  !row.share_with_you,
                    deletable: !row.share_with_you
                };
            });
            return response;
        };

        // Call the API and transform the result data
        API.get(apiName, path, myInit).then(response => {
            _this.setState({ data: transformData(response) });
            // If we have force resfresh we call recursively this function until the table
            // changes we also check for a max retry option to prevent infinite loops
            if(forceRefresh !== undefined && _this.state.data.length === originalLength && _this.state.retry < 10) {
               let id = setInterval(function () {
                  originalLength = _this.state.data.length;
                  _this.setState({retry: (_this.state.retry + 1)});
                  _this.RefreshTable(forceRefresh);
                  if(_this.state.data.length === originalLength) {
                      clearInterval(id);
                      _this.setState({retry: 0});
                  }
               }, 1000);

            }

        }).catch(error => {
            console.log(error);
            this.setState({ data: [] });
        });
    }

    /**
     * Download directly a specified file given the share_id
     * @param {string} share_id   - the share id string identifying the file
     * @returns {Promise<void>}
     */
    async downloadFile(share_id) {
        let token = await this.props.data.getJwtToken();
        let apiName = 'mydoctransfer';
        let path = '/share/' + share_id;
        let myInit = {
            headers: { Authorization: token },
            response: false,
            queryStringParameters: {}
        };

        // To download the file or, if the browser is configured to do so, to preview it, just set the location.href to the file url.
        API.get(apiName, path, myInit).then(response => {
            window.location.href = response.download_link;
        }).catch(error => {
            console.log(error);
        });
    }

    /**
     * We can delete the remote file by passing the share_id
     * @param {string} share_id   - the string identifying the file
     * @returns {Promise<void>}
     */
    async deleteRemoteFile(share_id) {
        let token = await this.props.data.getJwtToken();
        let apiName = 'mydoctransfer';
        let path = '/docs/' + share_id;
        let myInit = {
            body: { action: "delete" },
            headers: { Authorization: token },
            response: false
        };

        let _this = this;

        // Call the API and refresh the table if everything goes well
        API.post(apiName, path, myInit).then(response => {
            _this.RefreshTable();
        }).catch(error => {
            console.log(error);
        });
    };

    /**
     * This method calls the alert component and if the user calls for a YES we start the deleteRemoteFile() method
     * @param {string} share_id   - the share id of the file
     */
    deleteDocument = (share_id) => {
        confirmAlert({
            title: 'Confirm to delete document',
            message: 'Are you sure you want to delete the document?',
            buttons: [
                {
                    label: 'Yes',
                    onClick: () => this.deleteRemoteFile(share_id)
                },
                {
                    label: 'No',
                    onClick: () => null
                }
            ]
        })
    };

    /**
     * Just set the state
     */
    onCopyToClipboard = () => {
        this.setState({copied: true});
    };

    /**
     * Get the icon base don the extension
     * @param {string} ext   - the file extension
     * @returns {*}          - return the file icon
     */
    getIcon(ext) {
        return (<FileIcon size={32} extension={ext} {...defaultStyles[ext]} />);
    }

    /**
     * Set the filename
     */
    setFilename = () => {
      this.setState({ filename: this.refs.nameField.value });
    };

    /**
     * Rename the file given the name from the input field, we use
     * setFilename() to set the state of the new name and use it here
     * @returns {Promise<void>}
     */
    renameFile = async () => {
        let _this = this;
        let filename = this.state.filename;

        let token = await this.props.data.getJwtToken();
        let apiName = 'mydoctransfer';
        let path = '/docs/' + this.state.share_id;
        let myInit = {
            body: { action: "rename", new_name: filename },
            headers: { Authorization: token },
            response: false,
            queryStringParameters: {}
        };

        API.post(apiName, path, myInit).then(response => {
            _this.closeModal3();
            _this.RefreshTable();
        }).catch(error => {
            console.log(error);
        });
    };

    /**
     * Set the color of the filename to red if the file is expiring
     * @param {Date} date   - javascript date
     * @returns {string}    - return the class name for the red style
     */
    expiring(date) {
        let TEN_MINUTES = 10 * 60 * 1000;
        return ((new Date(date + " UTC") - new Date()) < TEN_MINUTES) ? "color-red" : ""
    }

    /**
     * Render the component
     * @returns {*}
     */
    render() {
        const selectedOption = this.state.selectedOption;
        const options = this.state.shareOptions;

        const data = this.state.data;

        // The tooltip constant
        const tooltip_a = ( <Tooltip id="tooltip_a">Download File</Tooltip> );
        const tooltip_b = ( <Tooltip id="tooltip_b">Get File Share Link</Tooltip> );
        const tooltip_c = ( <Tooltip id="tooltip_c">Delete</Tooltip> );
        const tooltip_d = ( <Tooltip id="tooltip_d">Rename File</Tooltip> );

        // Here we are preparing the columns as a schema for the table component, this way we can define the Headers,
        // the content and how we present it and also the accessor, a.k.a. the key of the data file
        const columns = [
            { Header: '#', accessor: 'extension', width: 40, Cell: props => <span>{this.getIcon(props.value)}</span> },
            { Header: 'Filename', accessor: 'display_name', Cell: props =>
                    <div>
                        <OverlayTrigger placement="top" overlay={<Tooltip id={guid()}>Expires at<br/>{new Date(props.original.expires_at + " UTC").toLocaleString("en-US")}</Tooltip>}>
                            <span className={this.expiring(props.original.expires_at)}>{props.value}</span>
                        </OverlayTrigger>
                    </div> },
            { Header: 'Size', accessor: 'size', width: 100, Cell: props => <span className='fileSize'>{HumanFileSize(props.value, false)}</span> },
            { Header: 'Owner', accessor: 'owner', Cell: props =>
                    <div>
                        <OverlayTrigger placement="top" overlay={<Tooltip id={guid()}>{props.value.name} {props.value.surname}<br/><strong>{props.value.email}</strong></Tooltip>}>
                            <span className={props.original.actions.deletable ? "sharedCircleOwner" : "sharedCircle"}>{props.value.name[0]}{props.value.surname[0]}</span>
                        </OverlayTrigger>
                    </div>
            },
            { Header: 'Shared With', accessor: 'people', Cell: props =>
                    props.value.length > 0 ?
                    <div className={props.original.actions.deletable ? 'sharedWith': 'sharedWithDisabled'} onClick={() => props.original.actions.deletable ? this.openModal(props.original.share_id, props.value) : null }>
                        {
                            props.value.map(function(share, idx) {
                                return (
                                    <OverlayTrigger key={"overlay_" + idx} placement="top" overlay={<Tooltip id={"tooltip_" + idx}>{share.name} {share.surname}<br/><strong>{share.email}</strong></Tooltip>}>
                                        <span className="sharedCircle">{share.name[0]}{share.surname[0]}</span>
                                    </OverlayTrigger>
                                )
                            })
                        }
                    </div>
                        :
                    <div className={props.original.actions.deletable ? 'sharedWith': 'sharedWithDisabled'} onClick={() => props.original.actions.deletable ? this.openModal(props.original.share_id, props.value) : null }>
                        <span>Click here to share...</span>
                    </div>
            },
            { Header: 'Actions', accessor: 'actions', width: 150, Cell: props =>
                    <span className="pull-right">
                        { props.value.deletable &&
                        <OverlayTrigger placement="top" overlay={tooltip_d}>
                            <a className="actionLink" href="#" onClick={() => this.openModal3(props.original.share_id, props.original.display_name) }><MaterialIcon icon="space_bar"/></a>
                        </OverlayTrigger>
                        }
                        <OverlayTrigger placement="top" overlay={tooltip_a}>
                            <a className="actionLink" href="#" onClick={() => this.downloadFile(props.original.share_id) }><MaterialIcon icon="get_app"/></a>
                        </OverlayTrigger>
                        { props.value.sharable &&
                            <OverlayTrigger placement="top" overlay={tooltip_b}>
                                <a className="actionLink" href="#"onClick={ () => this.openModal2(props.original.share_id) }><MaterialIcon icon="share"/></a>
                            </OverlayTrigger>
                        }
                        { props.value.deletable &&
                            <OverlayTrigger placement="top" overlay={tooltip_c}>
                                <a className="actionLink" href="#" onClick={() => this.deleteDocument(props.original.share_id) }><MaterialIcon icon="delete"/></a>
                            </OverlayTrigger>
                        }
                    </span>

            }
        ];

        // Render the actual component and, if someone is forbidden to see something present the alert
        return (
            <div>
                {
                    this.state.forbidden ?

                        <div className="alert alert-warning">
                            The following users are restricted to download the selected file: {this.state.forbiddenMails.join(",")}
                        </div>
                    :
                    null
                }
                <br/>
                <ReactTable data={data} columns={columns} />
                <Modal
                    isOpen={this.state.modalIsOpen}
                    onAfterOpen={this.afterOpenModal}
                    onRequestClose={this.closeModal}
                    className="Modal"
                    overlayClassName="Overlay"
                    contentLabel="Modal"
                >

                    <h2>Share Your File With...</h2>
                    <button className="modal-close" onClick={this.closeModal}></button>


                        <Select
                            value={selectedOption}
                            onChange={this.handleChange}
                            options={options}
                            isMulti={true}
                            isSearchable={true}
                        />
                        <button className="changeSharedButton" onClick={this.saveShare}>Save Shared people</button>

                </Modal>

                <Modal
                    isOpen={this.state.modalIsOpen2}
                    onRequestClose={this.closeModal2}
                    className="Modal"
                    overlayClassName="Overlay"
                    contentLabel="Modal2"
                >
                <div>
                    <h2>Share it with any valid user!</h2>
                    <button className="modal-close" onClick={this.closeModal2}></button>
                    <div className="row">
                        <div className="col-xs-10">
                        <span className="underlined">{config.app.URL}?share={this.state.share_id}</span>
                        </div>
                        <div className="col-xs-2">
                        <CopyToClipboard onCopy={this.onCopyToClipboard} text={ config.app.URL + '?share=' + this.state.share_id }>
                            <a href="#"><MaterialIcon icon="file_copy"/></a>
                        </CopyToClipboard>
                        {this.state.copied && <span className="copied">Copied!</span>}
                        </div>
                    </div>
                    <button className="changeSharedButton" onClick={this.closeModal2}>Ok</button>
                </div>
                </Modal>

                <Modal
                    isOpen={this.state.modalIsOpen3}
                    onRequestClose={this.closeModal3}
                    className="Modal"
                    overlayClassName="Overlay"
                    contentLabel="Modal3"
                >
                    <div>
                        <h2>Rename your file</h2>
                        <button className="modal-close" onClick={this.closeModal3}></button>
                        <div className="row">
                            <div className="col-xs-12">
                                <span className="underlined">Original name: {this.state.original_filename}</span>
                                <br/><br/>
                            </div>
                            <div className="col-xs-12">
                                <input ref="nameField" placeholder="Set your new name here..." className="form-control" type="text" onKeyUp={this.setFilename} />
                            </div>
                        </div>
                        <button className="changeSharedButton" onClick={this.renameFile}>Ok</button>
                    </div>
                </Modal>
            </div>
        );
    }

}