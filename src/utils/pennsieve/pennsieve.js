/***

Copyright (c) 2022 Patryk Orzechowski | Wagenaar Lab | University of Pennsylvania

***/


const PROTO_PATH = __dirname+'/protos/agent.proto'
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

const packageDefinition = protoLoader.loadSync(
    PROTO_PATH,
    {keepCase: true,
     longs: String,
     enums: String,
     defaults: true,
     oneofs: true
    });



class Pennsieve {

    constructor(target='localhost:9000') { 
        //creating a connection stub
        const routeguide = grpc.loadPackageDefinition(packageDefinition);
        this.client = new routeguide.v1.Agent('localhost:9000', grpc.credentials.createInsecure());
    }


    // Manifest Endpoints
    createManifest(base_path, target_base_path='.', files = null) {
        let payload = {
            base_path : base_path,
            target_base_path: target_base_path,
            files: files
        };
        return new Promise ((resolve, reject) => {
            this.client.createManifest(payload, (err, data) => {
                if (err) return reject(err)
                resolve(data)
            })
        })
    }

    addToManifest(manifest_id, base_path, target_base_path='.', files = null) {
        let payload = {
            manifest_id : manifest_id,
            base_path : base_path,
            target_base_path : target_base_path,
            files: files
        };
        return new Promise ((resolve, reject) => {
            this.client.addToManifest(payload, (err, data) => {
                if (err) return reject(err)
                resolve(data)
            })
        })
    }

    removeFromManifest(manifest_id, file_id) {
        let payload = {
                        manifest_id : manifest_id,
                        file_id : file_id,
                      };
        return new Promise ((resolve, reject) => {
            this.client.removeFromManifest(payload, (err, data) => {
                if (err) return reject(err)
                resolve(data)
            })
        })
    }

    deleteManifest(manifest_id) {
        let payload = { manifest_id : manifest_id };
        return new Promise ((resolve, reject) => {
            this.client.deleteManifest(payload, (err, data) => {
                if (err) return reject(err)
                resolve(data)
            })
        })
    }

    resetManifest(manifest_id) {
        let payload = { manifest_id : manifest_id };
        return new Promise ((resolve, reject) => {
            this.client.resetManifest(payload, (err, data) => {
                if (err) return reject(err)
                resolve(data)
            })
        })
    }

    listManifests() {
        return new Promise ((resolve, reject) => {
            this.client.listManifests({}, (err, data) => {
                if (err) return reject(err)
                resolve(data)
            })
        })
    }

    listManifestFiles(manifest_id, offset=0, limit=100) {
        let payload = {
                        manifest_id : manifest_id,
                        offset : offset,
                        limit : limit
                      };
        return new Promise ((resolve, reject) => {
            this.client.listManifestFiles(payload, (err, data) => {
                if (err) return reject(err)
                resolve(data)
            })
        })
    }

    syncManifest(manifest_id) {
        let payload = { manifest_id : manifest_id };
        return new Promise ((resolve, reject) => {
            this.client.syncManifest(payload, (err, data) => {
                if (err) return reject(err)
                resolve(data)
            })
        })
    }


    // Upload Endpoints
    uploadManifest(manifest_id) {
        let payload = { manifest_id : manifest_id };
        return new Promise ((resolve, reject) => {
            this.client.uploadManifest(payload, (err, data) => {
                if (err) return reject(err)
                resolve(data)
            })
        })
    }

    cancelUpload(manifest_id, cancel_all=true) {
        let payload = {
                        manifest_id : manifest_id,
                        cancel_all : cancel_all
                      };
        return new Promise ((resolve, reject) => {
            this.client.cancelUpload(payload, (err, data) => {
                if (err) return reject(err)
                resolve(data)
            })
        })
    }


    // Server Endpoints  // TODO: figure out subscribe/unsubscribe
    subscribe(id, callback) {
        let payload = {id: id};
        let readable = this.client.subscribe(payload);
        readable.on('data', (message) => {
            callback('data', message)
        });
        readable.on('close', (message) => {
            callback('close', message)
        });
        readable.on('end', (message) => {
            callback('end', message)
        });
        readable.on('error', (message) => {
            callback('error', message)
        });
    }

    unsubscribe(id, callback) {
        var payload = { id : id };
        this.client.unsubscribe(payload);
    }


    //User Endpoints
    getUser() {
        return new Promise ((resolve, reject) => {
            this.client.getUser({}, (err, data) => {
                if (err) return reject(err)
                resolve(data)
            })
        })
    }

    switchProfile(profile) {
        let payload = { profile : profile };
        return new Promise ((resolve, reject) => {
            this.client.switchProfile(payload, (err, data) => {
                if (err) return reject(err)
                resolve(data)
            })
        })
    }

    reAuthenticate() {
        return new Promise ((resolve, reject) => {
            this.client.reAuthenticate({}, (err, data) => {
                if (err) return reject(err)
                resolve(data)
            })
        })
    }


    // Datasets Endpoints
    useDataset(dataset_id) {
        let payload = { dataset_id : dataset_id };
        return new Promise ((resolve, reject) => {
            this.client.useDataset(payload, (err, data) => {
                if (err) return reject(err)
                resolve(data)
            })
        })
    }

    // version() {
    //     let payload = {};
    //     return new Promise ((resolve, reject) => {
    //         this.client.version(payload, (err, data) => {
    //             if (err) return reject(err)
    //             resolve(data)
    //         })
    //     })
    // }

    version(callback) {
        this.client.version({}, callback);
    }

}


module.exports = Pennsieve