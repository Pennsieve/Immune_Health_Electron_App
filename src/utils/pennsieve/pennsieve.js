/***

Copyright (c) 2022 Patryk Orzechowski | Wagenaar Lab | University of Pennsylvania

***/


var PROTO_PATH = __dirname+'/protos/agent.proto'
//var async = require('async');
//var fs = require('fs');
//var parseArgs = require('minimist');
//var path = require('path');
//var _ = require('lodash');
var grpc = require('@grpc/grpc-js');
var protoLoader = require('@grpc/proto-loader');
//var protobuf = require("protobufjs/minimal");

var packageDefinition = protoLoader.loadSync(
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
        this.client = new routeguide.protos.Agent(target, grpc.credentials.createInsecure());
    }


    // Manifest Endpoints
    createManifest(base_path, callback) {
        var payload = { base_path : base_path };
        this.client.createManifest(payload, callback);
    }

    addToManifest(manifest_id, base_path, targetBasePath='.', callback) {
        var payload = {
                        manifest_id : manifest_id,
                        base_path : base_path,
                        targetBasePath : targetBasePath
                      };
        this.client.addToManifest(payload, callback);
    }

    removeFromManifest(manifest_id, file_id, callback) {
        var payload = {
                        manifest_id : manifest_id,
                        file_id : file_id,
                      };
        this.client.removeFromManifest(payload, callback);
    }

    deleteManifest(manifest_id, callback) {
        var payload = { manifest_id : manifest_id };
        this.client.deleteManifest(payload, callback);
    }

    resetManifest(manifest_id, callback) {
        var payload = { manifest_id : manifest_id };
        this.client.resetManifest(payload, callback);
    }

    listManifests(callback) {
        this.client.listManifests({}, callback);
    }

    listManifestFiles(manifest_id, offset=0, limit=100, callback) {
        var payload = {
                        manifest_id : manifest_id,
                        offset : offset,
                        limit : limit
                      };
        this.client.listManifestFiles(payload, callback);
    }

    syncManifest(manifest_id, callback) {
        var payload = { manifest_id : manifest_id };
        this.client.syncManifest(payload, callback);
    }


    // Upload Endpoints
    uploadManifest(manifest_id, callback) {
        var payload = { manifest_id : manifest_id };
        this.client.uploadManifest(payload, callback);
    }

    cancelUpload(manifest_id, cancel_all=true, callback) {
        var payload = {
                        manifest_id : manifest_id,
                        cancel_all : cancel_all
                      };
        this.client.cancelUpload(payload, callback);
    }


    // Server Endpoints
    subscribe(id, callback) {
        var payload = { id : id };
        this.client.subscribe(payload, callback);
    }

    unsubscribe(id, callback) {
        var payload = { id : id };
        this.client.unsubscribe(payload, callback);
    }


    //User Endpoints
    getUser(callback) {
        this.client.getUser({}, callback);
    }

    switchProfile(profile, callback) {
        var payload = { profile : profile };
        this.client.switchProfile(payload, callback);
    }

    reAuthenticate(callback) {
        this.client.reAuthenticate({}, callback);
    }


    // Datasets Endpoints
    useDataset(dataset_id, callback) {
        var payload = { dataset_id : dataset_id };
        this.client.useDataset(payload, callback);
    }

}


export default Pennsieve