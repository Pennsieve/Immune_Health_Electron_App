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

    login(callback) {
        // set callback for IPC response
        window.api.pennsieveLoginResponse(callback)
        // send login request message via IPC channel
        window.api.pennsieveLoginRequest()
    }

    useDatset(datasetNodeId, callback) {
        // set callback for IPC response
        window.api.pennsieveUseDatasetResponse(callback)
        // send use dataset request message via IPC channel
        window.api.pennsieveUseDatasetRequest(datasetNodeId)
    }
}

export default PennsieveClient
