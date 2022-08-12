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

    createManifest(callback) {
        // set callback for IPC response
        window.api.pennsieveCreateManifestResponse(callback)
        // send create manifest request message via IPC channel
        window.api.pennsieveCreateManifestRequest()
    }

    addToManifest(manifestId, filePath, callback) {
        // set callback for IPC response
        window.api.pennsieveAddToManifestResponse(callback)
        // send add to manifest request message via IPC channel
        window.api.pennsieveAddToManifestRequest(manifestId, filePath)
    }

    uploadManifest(manifestId, callback) {
        // set callback for IPC response
        window.api.pennsieveUploadManifestResponse(callback)
        // send upload manifest request message via IPC channel
        window.api.pennsieveUploadManifestRequest(manifestId)
    }
}

export default PennsieveClient
