const soap = require('soap');
const client = require('@sap-cloud-sdk/http-client');
const connectivity = require('@sap-cloud-sdk/connectivity');

// Helper to create a soap service through the BTP destination service
async function getSoapService(service, wsdl, endpoint) {

    // Get the service reference
    var definition = cds.env.requires[service];

    // Get the destination data from BTP
    const dest = await connectivity.getDestination({ destinationName: definition.credentials.destination });
    // Get service endpoint
    const url = (dest.url.substring(dest.url.length - 1, 1) === '/') ? dest.url.substring(0, dest.url.length - 1) : dest.url;
    endpoint.url = url + definition.credentials.path;

    // Create an httpClient which connects over the BTP destination
    var httpClient = {
        request: async function (url, data, callback, exheaders, exoptions) {
            client.executeHttpRequest(dest, {
                method: 'POST',
                url: url,
                data: data,
                headers: exheaders
            }, { ...exoptions, fetchCsrfToken: false }).then((result) => {
                callback(null, result, result.data);
            }).catch((e) => {
                callback(e);
            });
        }
    }
    // Instantiate the service using that http client
    return soap.createClientAsync(wsdl, { httpClient: httpClient });

}

module.exports = {
    getSoapService
}