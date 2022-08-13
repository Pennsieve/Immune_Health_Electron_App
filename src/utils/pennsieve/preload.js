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
    // pennsieveAddToManifestRequest: function(manifestId, filePath) {
    //     ipcRenderer.send("pennsieveAddToManifestRequest", {manifestId: manifestId, filePath: filePath});
    // },
    // pennsieveAddToManifestResponse: function(func) {
    //     ipcRenderer.on("pennsieveAddToManifestResponse", (event, ...args) => func(event, ...args))
    // },
    pennsieveUploadManifestRequest: function(manifestId) {
        ipcRenderer.send("pennsieveUploadManifestRequest", {manifestId: manifestId});
    },
    pennsieveUploadManifestResponse: function(func) {
        ipcRenderer.on("pennsieveUploadManifestResponse", (event, ...args) => func(event, ...args))
    }
});
