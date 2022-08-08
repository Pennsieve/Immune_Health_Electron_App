import { ipcRenderer, contextBridge } from 'electron'

contextBridge.exposeInMainWorld("api", {
    pennsieveLoginRequest: function(){
        ipcRenderer.send("pennsieveLoginRequest");
    },
    pennsieveLoginResponse: function(func){
        ipcRenderer.on("pennsieveLoginResponse", (event, ...args) => func(event, ...args));
    },
    pennsieveUseDatasetRequest: function(datasetNodeId) {
        ipcRenderer.send("pennsieveUseDatasetRequest", {datasetId: datasetNodeId});
    },
    pennsieveUseDatasetResponse: function(func){
        ipcRenderer.on("pennsieveUseDatasetResponse", (event, ...args) => func(event, ...args));
    }
});
