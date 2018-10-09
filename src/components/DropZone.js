/* Import global components */
import React from "react";
import Dropzone from 'react-dropzone';
import { Storage } from 'aws-amplify';
import {Auth} from "aws-amplify/lib/index";
import { ProgressBar } from 'react-bootstrap';
/* Import css */
import "./../css/DropZone.css";
/* Import our common lib */
import { HumanFileSize, guid } from "./../libs/globals"

export default class DropZoneArea extends React.Component {

    /**
     * Dropzone constructor
     * @param props
     */
    constructor(props) {
        super(props);
        this.state = { files: [], showProgress: false, fakePercentage: 10 }
    }

    /**
     * Callback on files dropped inside the hot area of dropzone
     * @param {Array} files   - the array of files directly from dropzone
     * @returns {Promise<void>}
     */
    async onDrop(files) {
        let _this = this;
        // Get the current user session to use Amplify for putting files on S3
        let session = await Auth.currentSession();
        // As we are now producing a demo the progress bar is not receiving real timing,
        // also amplify doesn't currently have a callback for the download progress. We
        // are just adding a small amount in a set interval until the upload is finished.
        this.setState({ fakePercentage: 10 });
        // Set the fake percentage until it 'eventually' reaches 100%
        setInterval(function(){
            let fakePercentage = _this.state.fakePercentage;
            fakePercentage += 1;
            if(fakePercentage > 100)
                fakePercentage = 100;
            // Setting the percentage value
            _this.setState({ fakePercentage: fakePercentage });
        }, 600);

        // Foreach file upload the file on S3
        files.forEach(function(file) {
            _this.setState({showProgress: true});
            Storage.put(session.accessToken.payload.sub+'/'+file.name, file, {
                level: 'private',
                contentType: 'application/octet-stream'
            }).then(result => {
                let files = _this.state.files;
                files.push(file);
                _this.props.table.RefreshTable(true);
                _this.setState({ files: files, showProgress: false });
            }).catch(err =>
                console.log(err)
            );
        });
    }

    /**
     * Render the Dropzone
     * @returns {*}
     */
    render() {
        return (
            <section>
                <div className="dropzone">
                    <Dropzone onDrop={this.onDrop.bind(this)}>
                        <p>Try dropping some files here, or click to select files to upload.</p>
                    </Dropzone>
                </div>
                { this.state.showProgress && <div>Uploading...<br/><ProgressBar active now={this.state.fakePercentage} /></div> }
                <div>
                    <h2>Currently uploaded files</h2>
                    <ul className="uploadedList">
                        {
                            this.state.files.map(f => <li className="droplist-item" key={f.name + "_" + guid()}>{f.name} - <strong>{HumanFileSize(f.size, false)}</strong></li>)
                        }
                    </ul>
                </div>
            </section>
        );
    };
}