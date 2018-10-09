/* Import globals */
import React from "react";
import ReactTable from "react-table";
import { API } from "aws-amplify";

/* Import css files */
import 'react-confirm-alert/src/react-confirm-alert.css'
import 'react-table/react-table.css'
import "./../css/Table.css"

/**
 *
 * This is how we create a simple component, when we use export we can
 * use import from other components to generate an instance of this very
 * specific component.
 *
 */
export default class Table extends React.Component {

    /**
     * Construct the component setting the initial state
     * @param props
     */
    constructor(props) {
        super(props);

        this.state = {
            data: [],
            filteredData: [],
            search: ''
        };
    }

    /**
     * When the component is mount, refresh the table to see if we have files
     */
    componentDidMount() { this.RefreshTable(); }

    /**
     * Unmount component: here we would put methods for unloading resources
     */
    componentWillUnmount() {}

    /**
     * Refresh table handle the state relative to the audit table. For the purpose of this example
     * the call is made explicitly from this method as well as from other methods, but a good practice
     * would have been to refactor the call inside a generic GET/POST method to put inside our common
     * lib to better DRY the project
     *
     * @returns {Promise<void>}
     * @constructor
     */
    RefreshTable = async () => {

        let _this = this;
        // Create the path and the token to use
        let token = await this.props.data.getJwtToken();
        let apiName = 'mydoctransfer';
        let path = '/audit';
        // init the call
        let myInit = {
            headers: { Authorization: token },
            response: false,
            queryStringParameters: {}
        };

        // this is a "private" function to add new accessors to the response, this way
        // we can set them as custom fields in the table
        let transformResponse = function(response) {
            response.forEach(function(item){
                item["complete_name"]  = item.owner_name + " " + item.owner_surname;
                item["formatted_time"] = new Date(item.display_time + " UTC").toLocaleString("en-US");
                item["expired"] = _this.expired(new Date(item.display_time + " UTC").toLocaleString("en-US"), item["action"]);
            });
            return response;
        };

        // Do the actual call
        API.get(apiName, path, myInit).then(response => {
            this.setState({ data: transformResponse(response) });
            this.setState({ filteredData: this.state.data });
        }).catch(error => {
            console.log(error);
            this.setState({ data: [], filteredData: [] });
        });
    };

    /**
     * Check in a fuzzy way if the search value is contained in the text of the table
     *
     * @param {string}    text     - text to search against
     * @param {string}    search   - search words
     * @returns {boolean}          - true if found, false otherwise
     */
    fuzzyContains = (text, search) => {
        if (!text)
            return false;
        if (!search)
            return true;

        // Set the search text and the text to search both lowercase to allow a case insensitive search
        search = search.toLowerCase();
        text = text.toString().toLowerCase();

        let previousLetterPosition = -1;

        return search.split('').every(s => {
            previousLetterPosition = text.indexOf(s, previousLetterPosition + 1);
            return previousLetterPosition !== -1
        })
    };

    /**
     * Expired check against two date to see if they are under a certain threshold (1 HOUR)
     * @param {Date}     date     - javascript date
     * @param {string}   action   - check if the action is uploaded as we want to check against only uploaded object
     * @returns {string}          - returns a string representation of the result to show in a very simple way inside the table
     */
    expired = (date, action) => {
        let HOUR = 60 * 60 * 1000;
        return (action === "uploaded" && (new Date() - new Date(date)) > HOUR) ? "true" : ""
    };

    /**
     * Handle the full text search of the table
     */
    handleSearch = () => {
        // Extract the data to search against
        const {data} = this.state;

        // Get the search text
        let search = this.refs.searchField.value;
        let filteredData = data.filter(x => Object.keys(x).some(key =>
            this.fuzzyContains(x[key], search)
        ));
        // Set the new data; the interesting part is that we maintain the orginal data as well as the filtered one so we can always check
        // against the original data. This way we are sure to check all the available text. For the purpose of this project everything is
        // done client side, but we can do this kind of computation also server-side.
        this.setState({filteredData, search})
    };

    /**
     * Render our component
     * @returns {*}
     */
    render() {
        // Getting the actual filtered data
        const data = this.state.filteredData;
        // Defining the column structure
        const columns = [
            { Header: 'File', accessor: 'display_name', width: 300},
            { Header: 'Owner', accessor: 'complete_name'},
            { Header: 'Email', accessor: 'owner'},
            { Header: 'Action', accessor: 'action', width: 100},
            { Header: 'Time', width: 200,
              accessor: 'formatted_time',
              sortMethod: (a, b) => {
                  let d1 = new Date(a);
                  let d2 = new Date(b);
                  return d1.getTime() > d2.getTime() ? 1 : -1;
              }
            },
            { Header: 'Expired', accessor: 'expired', width: 100,
                sortMethod: (a, b) => {
                    return a.length > b.length ? 1 : -1;
                }
            }
        ];
        // Draw the search field and the table
        return (
            <div>
                <br/>
                <input ref="searchField" placeholder="Search here..." className="form-control" type="text" onKeyUp={this.handleSearch} />
                <br/>
                <ReactTable data={data} columns={columns} />
            </div>
        );
    }

}