const { URL } = require('url');

module.exports = function isValidUrl(sUrl, aProtocols = ["http", "https"]) {
    try {
        const oURL = new URL(sUrl);

        return oURL.protocol
            ? aProtocols.map(x => `${x.toLowerCase()}:`).includes(oURL.protocol)
            : false;
    } catch (err) {
        return false;
    }
}; // function isValidUrl()