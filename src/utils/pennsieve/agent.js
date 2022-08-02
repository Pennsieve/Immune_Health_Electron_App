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
            console.log(args);
            this.ps.reAuthenticate(async function(err, response) {
                if (err) {
                    event.sender.send("pennsieveLoginResponse", {status: 'error', error: err});
                }
                else {
                    let user = response;
                    console.log('user:');
                    console.log(user);
                    event.sender.send("pennsieveLoginResponse", {status: 'success', result: user});
                }
            })
        })

    }
}

export default PennsieveAgent