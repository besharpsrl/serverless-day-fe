/*
    This is an example on how we can build a simple global library to use in our project,
    as we can export the single functions as costants and so we can do an import from our
    components and use the functions.
*/

/**
 * This method returns a readable file size by passing the dimension in bytes and a boolean
 * to check if we want value divided by 1024 or not.
 *
 * @param {number}   bytes  - the number of bytes which could be retrieved from an uploaded file for example
 * @param {boolean}  si     - true use / 1000, false use / 1024
 * @returns {string}        - the readable value
 * @constructor
 */
export const HumanFileSize = (bytes, si) => {
        let thresh = si ? 1000 : 1024;
        if(Math.abs(bytes) < thresh) {
            return bytes + ' B';
        }
        let units = si
            ? ['kB','MB','GB','TB','PB','EB','ZB','YB']
            : ['KiB','MiB','GiB','TiB','PiB','EiB','ZiB','YiB'];
        let u = -1;
        do {
            bytes /= thresh;
            ++u;
        } while(Math.abs(bytes) >= thresh && u < units.length - 1);
        return bytes.toFixed(1)+' '+units[u];
};

/**
 * Generates a random UUID number
 * @returns {string}   - the random generated number
 */
export const guid = () => {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000)
            .toString(16)
            .substring(1);
    }
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
};

