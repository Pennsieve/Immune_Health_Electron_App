import { ipcRenderer, contextBridge } from 'electron'

contextBridge.exposeInMainWorld("api", {
    pennsieveLoginRequest: function(){
        ipcRenderer.send("pennsieveLoginRequest");
    },
    pennsieveLoginResponse: function(func){
        ipcRenderer.on("pennsieveLoginResponse", (event, ...args) => func(event, ...args));
    }
});
