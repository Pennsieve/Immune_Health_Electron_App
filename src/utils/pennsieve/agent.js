// (c) 2022, The University of Pennsylvania

import Pennsieve from '@/utils/pennsieve/pennsieve.js'
import { ipcMain } from 'electron'

/**
 * @classdesc
 * PennsieveAgent - an Electron main-side interface to the Pennsieve Agent.
 * This class' actions are triggered by events received over the IPC channel between the main process
 * and the renderer process. It invokes functions in the Pennsieve Agent Javascript, which in turn
 * communicate with the Pennsieve Agent via gRPC. This must execute in the non-safe Electron main process
 * because gRPC requires unsafe packages/libraries like fs, net, and http2.
 */
class PennsieveAgent {
    constructor() {
        this.ps = new Pennsieve();

        ipcMain.on("pennsieveLoginRequest", (event, args) => {
            this.ps.reAuthenticate()
                .then(response =>
                    event.sender.send("pennsieveLoginResponse", {status: 'success', result: response})
                )
                .catch( err =>
                    event.sender.send("pennsieveLoginResponse", {status: 'error', error: err})
                )
        })

        ipcMain.on("pennsieveUseDatasetRequest", (event, args) => {
            this.ps.useDataset(args.datasetId, async function (err, response) {
                if (err) {
                    event.sender.send("pennsieveUseDatasetResponse", {status: 'error', error: err});
                }
                else {
                    event.sender.send("pennsieveUseDatasetResponse", {status: 'success', result: response});
                }
            })
        })

        ipcMain.on("pennsieveCreateManifestRequest", (event, args) => {
            this.ps.createManifest('TBD', async function (err, response) {
                event.sender.send("pennsieveCreateManifestResponse", this.answer(err, response));
            })
        })

        ipcMain.on("pennsieveAddToManifestRequest", (event, args) => {
            this.ps.addToManifest(args.manifestId, args.filePath, '.', async function(err, response) {
                event.sender.send("pennsieveAddToManifestResponse", this.answer(err, response))
            })
        })

        ipcMain.on("pennsieveUploadManifestRequest", (event, args) => {
            this.ps.uploadManifest(args.manifestId, async function(err, response) {
                event.sender.send("pennsieveUploadManifestResponse", this.answer(err, response))
            })
        })

    }

    answer(err, response) {
        if (err) {
            return {status: 'error', error: err}
        }
        else {
            return {status: 'success', result: response}
        }
    }
}

export default PennsieveAgent