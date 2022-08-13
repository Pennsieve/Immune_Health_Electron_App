// (c) 2022, The University of Pennsylvania

/**
 * @classdesc
 * PennsieveClient - an Electron renderer-side interface to the Pennsieve Agent.
 * This class provides a safe layer around the Pennsieve Agent JavaScript library.
 * Depends on the Context Bridge and functions defined in 'preload.js'
 */
class PennsieveClient {
    constructor() {
    }

    async login() {
        return new Promise((resolve, reject) => {
            window.api.pennsieveLoginResponse(function(event, response) {
                if (response.status === 'success') {
                    resolve(response.result)
                }
                else {
                    reject(response.error)
                }
            })
            window.api.pennsieveLoginRequest()
        })
    }

    async useDatset(datasetNodeId) {
        return new Promise((resolve, reject) => {
            window.api.pennsieveUseDatasetResponse(function(event, response) {
                if (response.status === 'success') {
                    resolve(response.result)
                }
                else {
                    reject(response.error)
                }
            })
            window.api.pennsieveUseDatasetRequest(datasetNodeId)
        })
    }

    async createManifest(fileList, targetBasePath='.') {
        return new Promise((resolve, reject) => {
            window.api.pennsieveCreateManifestResponse(function(event, response) {
                if (response.status === 'success') {
                    resolve(response.result)
                }
                else {
                    reject(response.error)
                }
            })
            window.api.pennsieveCreateManifestRequest(fileList, targetBasePath)
        })
    }

    // addToManifest(manifestId, filePath, callback) {
    //     // set callback for IPC response
    //     window.api.pennsieveAddToManifestResponse(callback)
    //     // send add to manifest request message via IPC channel
    //     window.api.pennsieveAddToManifestRequest(manifestId, filePath)
    // }

    uploadManifest(manifestId) {
        return new Promise((resolve, reject) => {
            window.api.pennsieveUploadManifestResponse(function(event, response) {
                if (response.status === 'success') {
                    resolve(response.result)
                }
                else {
                    reject(response.error)
                }
            })
            window.api.pennsieveUploadManifestRequest(manifestId)
        })
    }
}

export default PennsieveClient
