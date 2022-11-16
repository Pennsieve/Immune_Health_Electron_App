import { ipcRenderer, contextBridge } from 'electron'

contextBridge.exposeInMainWorld("api", {
    pennsieveLoginRequest: function() {
        ipcRenderer.send("pennsieveLoginRequest");
    },
    pennsieveLoginResponse: function(func) {
        ipcRenderer.on("pennsieveLoginResponse", (event, ...args) => func(event, ...args));
    },
    pennsieveUseDatasetRequest: function(datasetNodeId) {
        ipcRenderer.send("pennsieveUseDatasetRequest", {datasetId: datasetNodeId});
    },
    pennsieveUseDatasetResponse: function(func) {
        ipcRenderer.on("pennsieveUseDatasetResponse", (event, ...args) => func(event, ...args));
    },
    pennsieveCreateManifestRequest: function(fileList, targetBasePath) {
        ipcRenderer.send("pennsieveCreateManifestRequest", {fileList: fileList, targetBasePath: targetBasePath});
    },
    pennsieveCreateManifestResponse: function(func) {
        ipcRenderer.on("pennsieveCreateManifestResponse", (event, ...args) => func(event, ...args))
    },
    pennsieveUploadManifestRequest: function(manifestId) {
        ipcRenderer.send("pennsieveUploadManifestRequest", {manifestId: manifestId});
    },
    pennsieveUploadManifestResponse: function(func) {
        ipcRenderer.on("pennsieveUploadManifestResponse", (event, ...args) => func(event, ...args))
    },
    pennsieveSubscribeRequest: function(subscribeId) {
        ipcRenderer.send("pennsieveSubscribeRequest", {subscribeId: subscribeId});
    },
    pennsieveSubscribeResponse: function(func) {
        ipcRenderer.on("pennsieveSubscribeResponse", (event, ...args) => func(event, ...args))
    },
    pennsieveAgentMessage: function(func) {
        ipcRenderer.on("pennsieveAgentMessage", (event, ...args) => func(event, ...args))
    },
    pennsieveUnsubscribeRequest: function(subscribeId) {
        ipcRenderer.send("pennsieveUnsubscribeRequest", {subscribeId: subscribeId});
    },
    pennsieveUnsubscribeResponse: function(func) {
        ipcRenderer.on("pennsieveUnsubscribeResponse", (event, ...args) => func(event, ...args))
    },
});
