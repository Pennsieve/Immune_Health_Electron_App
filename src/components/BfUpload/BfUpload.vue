<template>
  <div
    class="bf-upload"
    @dragenter="setIsDragging(true)"
    @dragover.prevent="setIsDragging(true)"
    @dragleave="setIsDragging(false)"
    @drop.prevent="onDrop"
  >
    <bf-dialog
      :title="dialogTitle"
      :open="open"
      @close="onClose"
      @overlay-click="onOverlayClick"
    >
      <div
        slot="body"
        class="bf-upload-body"
        @dragenter="setIsDragging(true)"
      >
        <!-- This is the template for when we are adding files -->
        <template v-if="isAddingFiles">
          <!-- This is the file input area: file selector input, and drag-and-drop zone -->
          <div
            v-if="!errorPreflight"
            ref="bfUpload"
            class="bf-upload-dropzone"
            :class="[
              isDragging ? 'is-dragging' : '',
              hasItems(fileList) ? 'condensed' : ''
            ]"
          >
            <div class="dropzone-content upload-content">
              <div class="upload-icons-wrap">
              <!--
                <img
                  class="svg-icon icon-item pdf icon-upload-extra outside"
                  :src="fileIcon('PDF', 'PDF')"
                >

                <img
                  class="svg-icon icon-item timeseries icon-upload-extra outside"
                  :src="fileIcon('Timeseries', 'TimeSeries')"
                >

                <iron-icon
                  class="icon-upload"
                  icon="blackfynn:icon-upload"
                />

                <img
                  class="svg-icon icon-item image icon-upload-extra outside"
                  :src="fileIcon('Image', 'Image')"
                >

                <img
                  class="svg-icon icon-item slide icon-upload-extra outside"
                  :src="fileIcon('Microscope', 'Slide')"
                >
                -->
              </div>
              <h3>
                Drag and drop files here or
                <a
                  href="#"
                  @click.prevent="triggerInputFile"
                >
                  choose your files
                </a>.
              </h3>
            </div>

            <input
              ref="inputFile"
              class="visuallyhidden"
              type="file"
              multiple="multiple"
              @change="onInputFileChange"
            >
          </div>

          <div
              v-if="hasItems(fileListMap)"
              ref="fileListMapWrap"
              class="bf-upload-packages-wrap"
              :class="[ hasWarnings ? 'has-warnings' : '' ]"
          >
            <!-- -->
              <files-table
                v-if="hasItems(fileListMap)"
                :data="uploadFileList()"
                :multiple-selected="false"
                :within-upload-menu="true"
                :enable-download="false"
                :enable-file-move="false"
                @delete="uploadRemoveFile"
                @process="uploadProcessFile"
                @copy-url="uploadGetPresignedUrl"
                @selection-change="uploadSetSelectedFiles"
                @click-file-label="uploadOnClickLabel">
              </files-table>
            <!-- -->
          </div>

        </template>

          <!-- TODO: refactor the !isAddingFiles case (done adding files) -->
          <!-- TODO: when upload is started isAddingFiles should be set to false -->
          <!-- TODO: when isAddingFiles is false, we can show the upload progress -->
        <!--
        <template v-if="!isAddingFiles">
          <div
            ref="uploadWrap"
            class="bf-upload-packages-wrap"
          >
            <bf-upload-package
              v-for="item in uploadList"
              :key="item.uploadId"
              :item="item"
              :name="item.packageName"
              :submitted="true"
              :is-uploaded="item.isUploaded"
              :has-error="item.error"
              @remove-package="cancelPackageUpload"
              @toggle-files="checkOverflow($refs.uploadWrap)"
            />
          </div>
        </template>
        -->
      </div>

      <template
        v-if="isAddingFiles && !errorPreflight"
        slot="footer"
      >
        <bf-button
          class="secondary"
          @click="cancelUpload"
        >
          Cancel
        </bf-button>

        <bf-button
          :disabled="fileListMap.size === 0"
          @click="startUpload"
        >
          Start Upload
        </bf-button>

      </template>

      <template
        v-if="!isAddingFiles && !errorPreflight"
        slot="footer"
      >
        <bf-button
          class="secondary"
          @click="onClose"
        >
          Hide
        </bf-button>
        <bf-button @click="uploadMoreFiles">
          Upload More Files
        </bf-button>
      </template>
    </bf-dialog>
  </div>
</template>

<script>

import qq from 'fine-uploader/lib/core'
import { mapActions, mapGetters, mapState } from 'vuex';
import BfButton from '../shared/BfButton.vue'
import BfDialog from '../shared/bf-dialog/bf-dialog.vue'
import CheckOverflow from '../../mixins/check-overflow/index'
import Sorter from '../../mixins/sorter'
import Request from '../../mixins/request';
import debounce from 'lodash/debounce'
import {v1 as uuidv1} from 'uuid'
import {
  compose,
  defaultTo,
//    equals,
  filter,
  find,
  findIndex,
  init,
  pathOr,
  prop,
  propEq,
  propOr,
  split,
  pluck,
  sum
} from 'ramda';
import EventBus from '../../utils/event-bus.js';
import PennsieveClient from '@/utils/pennsieve/client.js'
import FilesTable from "@/components/FilesTable/FilesTable";
//import BfUploadPackage from './bf-upload-package/bf-upload-package.vue'

  const transformPath = compose(
    init,
    filter(i => i),
    split('/')
  )

  export default {
    name: 'BfUpload',

    components: {
      FilesTable,
      BfButton,
      BfDialog,
      //BfUploadPackage
    },

    mixins: [Sorter, CheckOverflow, Request,
    //FileIcon
    ],

    props: {
      open: {
        type: Boolean,
        default: false
      },
      //Define this in the parent if it doesnt work here
     currUploadDest: {
       type: String,
       default: ''
     }
    },

    data: function() {
      return {
        isDragging: false,
        showInfo: false,
        droppedFiles: [],
        fileListMap: {},
        uploadFileLst: [],
        fileList: [],
        packageList: [],
        uploadList: [],
        errorPreflight: '',
        shouldUpload: true,
        isAddingFiles: true,
        packageListBorders: false,
        recordId: '',
        uploadListId: -1, // start at -1 because this is incremented for every file added
        ps: null,
        selectedFiles: null,
        datasetIdInUse: '',
        //uploadTargetFolder: 'staging',
        withinUploadMenu: 'true',
        uploadArr: []

      }
    },

    computed: {
      ...mapGetters(['userToken', 'uploadDestination', 'subscribeId']),
      ...mapState(['onboardingEvents', 'activeOrganization', 'dataset','config']),
      ...mapActions(['updateSubscribeId']),

      /**
       * Compute dialog title based on isAddingFiles
       * @returns {string}
       */
      dialogTitle: function() {
        return this.isAddingFiles ? 'Add Files to Upload' : 'File Upload Status'
      },

      /**
       * Compute files that are being processed
       * @returns {Array}
       */
      filesProcessing: function() {
        return filter(propEq('processing', true), this.fileList)
      },

      /**
       * Compute if there are warning/error meessages to show
       * @returns {Boolean}
       */
      showWarnings: function() {
        return this.hasWarnings
      },

      /**
       * Compute if any of the queued packages have warnings
       * @returns {Boolean}
       */
      hasWarnings: function() {
        return this.warningPackages.length > 0
      },

      /**
       * Compute packages that have warnings
       * @returns {Array}
       */
      warningPackages: function() {
        return this.packageList.filter(item => {
          return item.warnings.length
        })
      },

      /**
       * Compute packages that do not have warnings
       * @returns {Array}
       */
      goodPackages: function() {
        return this.packageList.filter(item => {
          return item.warnings.length === 0
        })
      },
    },

    watch: {
      fileList: function() { // function(newFileList, oldFileList) {
        // add items in fileList to fileListMap (that are not already there)
        this.fileList.filter(d => !this.fileListMap.has(d.filePath)).forEach(d => this.fileListMap.set(d.filePath, d));

        // remove items from fileListMap that are not in fileList
        const fileListKeys = this.fileList.map(file => file.filePath)
        const removeList = Array.from(this.fileListMap.keys()).filter(key => !fileListKeys.includes(key))
        removeList.forEach(key => this.fileListMap.delete(key))
      },

      packageList: function() {
         this.checkOverflow(this.$refs.packageWrap)
      },

      uploadList: function() {
         this.checkOverflow(this.$refs.uploadWrap)
      },

      isOpen: function() {
        //should create a pennsieve object here
        // Look at the conceptId & instanceId query params and update locate state
        //NOTE: must edit here
        const modelId = pathOr('', ['params', 'conceptId'])(this.$route)
        const recordId = pathOr('', ['params', 'instanceId'])(this.$route)

        if (modelId && recordId) {
          this.modelId = modelId
          this.recordId = recordId
        }
      }
    },

    methods: {
      ...mapActions(['updateOnboardingEvents']),

      sendRefreshMessage: function(){
        EventBus.$emit('refreshMessageFromChild')
      },

      /*
      sendRefreshMessage2: function(){
        EventBus.$emit('refreshMessageFromChildSecondary')
      },
      */

      filesLengthMessage: function(filesL) {
        EventBus.$emit('fileMessageSent',filesL)
      },
      sendSubscribePing: function(message) {

        console.log("SEND SUBSCRIBE PING CALLED!!!!!!!!!!!!")

        EventBus.$emit('subscribePing',message)
      },
      /**
       * Compute if array has items
       */
      hasItems: function(list) {
        return list && (list.length > 0 || list.size > 0) ? true : false
      },

      /**
       * Set is dragging property if the user is adding files
       * @param {Boolean} isDragging
       */
      setIsDragging: function(isDragging) {
        if (this.isAddingFiles) {
          this.isDragging = isDragging
        }
      },

      /**
       * Dismiss onboarding info
       */
      dismissInfo: function() {
        this.showInfo = false
        localStorage.setItem('seen-upload-info', true)
      },

      /**
       * Cancel queueing files for upload
       */
      cancelQueue: function() {
        this.resetQueue()
        this.onClose()
      },

      cancelUpload: function() {
        this.resetQueue()
        this.onClose()
      },

      /**
       * Close dialog callback
       */
      onClose: function() {
        this.errorPreflight = ''
        this.showInfo = false
        this.modelId = ''
        this.recordId = ''
        //want to refresh displayed files after upload executes
        this.sendRefreshMessage()
        this.clearUploadedFiles()
        this.$emit('close-upload-dialog')
      },

      onOverlayClick: function() {
        this.$emit('close-upload-dialog')
      },

      /**
       * Trigger input file click
       */
      triggerInputFile: function() {
        this.$refs.inputFile.click()
      },

      /**
       * onInputFileChange(): callback when file input has changed
       * @param {Object} Event
       */
      onInputFileChange: function(e) {
        const files = e.target.files || e.dataTransfer.files
        this.transformFiles(Array.from(files))

        // Reset file input
        this.$refs.inputFile.value = ''
      },

      /**
       * onDrop(): handles the drag-and-drop of a file or folder into the upload area
       * @param e DragEvent
       */
      onDrop: function(e) {
        if (this.isAddingFiles) {
          this.handleDataTransfer(e.dataTransfer || e.target).then(() => {
            this.transformFiles(this.droppedFiles)

            // Reset droppedFiles
            this.droppedFiles = []

            // Reset isDragging state
            this.isDragging = false
          })
        }
      },

      /**
       * transformFiles(): adds files to the fileList
       *
       * @param files an array of File objects
       */
      transformFiles: function(files) {
        const fileList = files.map((file, index) => {
          const uploadId = (this.uploadListId += 1)
          file.uploadId = uploadId

          return {
            uploadId,
            fileName: file.name,
            size: file.size,
            filePath: file.path,
            importId: index + uuidv1(),
            processing: true,
            file
          }
        })

        this.fileList = [...this.fileList, ...fileList]
      },

      /**
       * Traverse file tree to get all files in directories
       * @param {Object} entry
       * @returns {Promise}
       */
      traverseFileTree: function(entry) {
        // eslint-disable-next-line no-undef
        const parseEntryPromise = new qq.Promise()
        if (entry.isFile) {
          entry.file(
            file => {
              file.filePath = transformPath(entry.fullPath)
              this.droppedFiles.push(file)
              parseEntryPromise.success()
            },
            /*
            fileError => {
              parseEntryPromise.failure()
            }
            */
          )
        } else if (entry.isDirectory) {
          this.getFilesInDirectory(entry).then(
            entries => {
              let entriesLeft = entries.length
              // eslint-disable-next-line no-undef
              qq.each(entries, (idx, entry) => {
                this.traverseFileTree(entry).done(() => {
                  entriesLeft -= 1
                  if (entriesLeft === 0) {
                    parseEntryPromise.success()
                  }
                })
              })
              if (!entries.length) {
                parseEntryPromise.success()
              }
            },
            /*
            fileError => {
              parseEntryPromise.failure()
            }
            */
          )
        }
        return parseEntryPromise
      },

      /**
       * Get files in directory
       * @param {Object} entry
       * @param {Object} reader
       * @param {Array} accumEntries
       * @param {Promise} existingPromise
       * @returns {Promise}
       */
      getFilesInDirectory: function(
        entry,
        reader,
        accumEntries,
        existingPromise
      ) {
        // eslint-disable-next-line no-undef
        const promise = existingPromise || new qq.Promise()
        const dirReader = reader || entry.createReader()
        dirReader.readEntries(entries => {
          const newEntries = accumEntries ? accumEntries.concat(entries) : entries
          if (entries.length) {
            setTimeout(() => {
              this.getFilesInDirectory(entry, dirReader, newEntries, promise)
            }, 0)
          } else {
            promise.success(newEntries)
          }
        }, promise.failure)
        return promise
      },

      /**
       * Get files from dropped items
       * @param {Array} dataTransfer
       * @returns {Promise}
       */
      handleDataTransfer: function(dataTransfer) {
        const pendingFolderPromises = []
        // eslint-disable-next-line no-undef
        const handleDataTransferPromise = new qq.Promise()

        this.droppedFiles = []
        // eslint-disable-next-line no-undef
        if (qq.isFolderDropSupported(dataTransfer)) {
          // eslint-disable-next-line no-undef
          qq.each(dataTransfer.items, (idx, item) => {
            const entry = item.webkitGetAsEntry()
            if (entry) {
              if (entry.isFile) {
                this.droppedFiles.push(item.getAsFile())
              } else {
                pendingFolderPromises.push(
                  this.traverseFileTree(entry).done(() => {
                    pendingFolderPromises.pop()
                    if (pendingFolderPromises.length === 0) {
                      handleDataTransferPromise.success()
                    }
                  })
                )
              }
            }
          })
        } else {
          this.droppedFiles = dataTransfer.files
        }

        if (pendingFolderPromises.length === 0) {
          handleDataTransferPromise.success()
        }

        return handleDataTransferPromise
      },

      /**
       * Remove package
       * @param {Object} item
       */
      removePackage: function(item) {
        // Remove from packageList
        const index = this.packageList.indexOf(item)
        this.packageList.splice(index, 1)

        // Remove from fileList
        item.files.forEach(file => {
          const index = findIndex(
            propEq('uploadId', file.uploadId),
            this.fileList
          )
          this.fileList.splice(index, 1)
        })
      },

      /**
       * Get fine uploader ID by uploadId
       * @param {Object} file
       * @param {Array} list
       * @returns {Number}
       */
      getFineUploaderId: (file, list) =>
        compose(
          prop('id'),
          defaultTo({}),
          find(propEq('uploadId', file.uploadId))
        )(list),

      /**
       * Retry get packages
       */
      retryGetPackages: function() {
        this.errorPreflight = ''
        this.getPackages()
      },

      /**
       * Get packages based off of files
       * @param {Array} fileList
       */
      getPackages: debounce(function() {
        /*
        * Add dataset ID and destination ID as query params
        * The endpoint will use this for lookups and package verification
        */
        const datasetId = pathOr('', ['content', 'intId'], this.dataset)
        let dataParams = `append=false&dataset_id=${datasetId}`

        // If uploading to a collection
        if (this.uploadDestination.packageType !== 'DataSet') {
          const destinationId = propOr('', 'id', this.uploadDestination)
          dataParams += `&destinationId=${destinationId}`
        }

        const organizationId = pathOr(
          '',
          ['organization', 'id'],
          this.activeOrganization
        )
        this.sendXhr(
          `${
            this.config.apiUrl
          }/upload/preview/organizations/${organizationId}?${dataParams}`,
          {
            method: 'POST',
            header: {
              Authorization: `bearer ${this.userToken}`
            },
            body: {
              files: this.fileList
            }
          }
        )
          .then(this.onGetPackages.bind(this))
          .catch(this._handleGetPackagesError.bind(this))
      }, 500),

      /**
       * Callback on get package preview from API
       * @param {Object} response
       */
      onGetPackages: function(response) {
        let packages = response.packages

        // Loop through response and set each file's processing prop to false
        // eslint-disable-next-line no-unused-vars
        packages.forEach((item, itemIndex) => {
        // eslint-disable-next-line no-unused-vars
          item.files.forEach((file, index) => {
            const fileListItem = find(
              propEq('uploadId', file.uploadId),
              this.fileList
            )
            fileListItem.processing = false
            fileListItem.isUploaded = false
            fileListItem.file.importId = item.importId
            fileListItem.file.chunkedUpload = file.chunkedUpload

            // Add package ID to file for lookup
            file.importId = item.importId
          })
        })
        this.packageList = this.returnSort('previewPath', packages, 'asc')
      },

      /**
       * Error getting packages
       * @param {Object} response
       */
      _handleGetPackagesError: function(response) {
        if (response.status === 401) {
          EventBus.$emit('logout')
        } else {
          this.errorPreflight = response.status === 429 ? 'throttle' : 'error'
        }
      },

      /**
       * show the intercom dialog
       */
      openIntercom: function() {
        window.Intercom('show')
      },

      /**
       * Start uploading stored files
       */
      startUpload: function() {
        // check that there are files in the fileListMap
        let uploadTargetFolder = this.currUploadDest+'/staging'
        console.log(`startUpload() uploadTargetFolder: ${uploadTargetFolder}`)
        let ps = new PennsieveClient()
        // Add to uploadList
        const packageList = this.packageList.slice()
        packageList.forEach(thePackage => {
          thePackage.uploadDestination = this.uploadDestination
          // Set recordId and modelId properties on the package
          if (this.modelId && this.recordId) {
            thePackage.recordId = this.recordId
            thePackage.modelId = this.modelId
          }
        })

        //this.uploadList.push(...packageList)

        if (this.fileListMap.size > 0) {
          // generate list of files as an Array
          let fileList = Array.from(this.fileListMap.values()).map(file => file.filePath)
          var fileListLen = fileList.length
          this.filesLengthMessage(fileListLen)
          // create a manifest passing in the list of files
          //this.uploadTargetFolder
          ps.createManifest(fileList, uploadTargetFolder)
            .then(response => {
              let manifestId = response.manifest_id
              // start upload

              ps.uploadManifest(manifestId)
                .catch(err => {
                  console.log('error:')
                  console.log(err)
                })
            })
            .catch(err => {
              console.log('error:')
              console.log(err)
            })

            // Set uploading state
        this.$store.dispatch('updateUploadStatus', true)

        // Add file size
        const totalSize = sum(pluck('groupSize', packageList))
        this.$store.dispatch('updateUploadRemainingAdd', totalSize)
        this.$store.dispatch('updateTotalUploadSize', totalSize)

        // Add file count
        this.$store.dispatch('uploadCountAdd', this.fileList.length)

        //this.isAddingFiles = false
        }

        this.$emit('openProgressDialog','true')
        console.log('OPENING THE PROGRESS DIALOG')

        // close the upload dialog
        this.onClose()
      },

      /**
       * Reset upload queue
       */
      resetQueue: function() {
        this.fileList = []
        this.fileListMap = new Map()
        this.packageList = []
        this.errorPreflight = ''
      },

      /**
       * Set state to upload queue to allow user to upload more files
       */
      uploadMoreFiles: function() {
        this.isAddingFiles = true
      },

      /**
       * Clear out packages that have been uploaded and hide bf-upload-info
       */
      clearUploadedFiles: function() {
        this.packageList = this.packageList.filter(item => !item.isUploaded)
        this.uploadList = this.uploadList.filter(item => !item.isUploaded)
        if (this.uploadList.length === 0) {
          this.isAddingFiles = true
          EventBus.$emit('dismiss-upload-info')
        } else {
          this.isAddingFiles = false
        }
      },

      /**
       * Get uploadList file based off of file ID
       * @param {number} id
       * @returns {Object}
       */
      getUploadListFile: function(id) {
        const file = this.uploader.getFile(id)
        const thePackage = find(
          propEq('importId', file.importId),
          this.uploadList
        )
        const filesArray = propOr([], 'files', thePackage)

        return find(propEq('uploadId', file.uploadId), filesArray)
      },

      /**
       * Set error state for package
       * @param {number} packageIndex
       */
      _onPackageCompleteError: function(packageIndex) {
        const updatedItem = pathOr({}, [packageIndex], this.uploadList)
        updatedItem.error = true
        this.uploadList.splice(packageIndex, 1, updatedItem)
      },

      /**
       * Add files to queue
       * @param {Array} files
       */
      addFilesToQueue: function(files) {
        this.uploader.addFiles(files)
      },

      /**
       * Update files list when a file has completed uploading
       * @params {Array}
       */
      updateFilesList: function(response) {
        response.forEach(item => {
          // add package dto to each item in uploadList
          const uploadListPkg = find(
            propEq('importId', item.manifest.importId),
            this.uploadList
          )

          // Add file to files list if uploading to current collection
          const packageDTO =
            uploadListPkg.previewPath === null
              ? propOr({}, 'package', item)
              : pathOr({}, ['package', 'parent'], item)

          EventBus.$emit('add-uploaded-file', {
            packageDTO,
            uploadDestination: this.uploadDestination
          })

          uploadListPkg.package = item.package
        })
      },

      uploadFileList: function() {
        const fileList = Array.from(this.fileListMap.values()).map(item => {
          return {
            content: {
              name: item.file.path,
              createdAt: '2022-07-31T23:59:59.999999Z',
              nodeId: 'N:upload-file:00000000-0000-0000-0000-000000000000'
            }
          }
        })
        return fileList
      },

      uploadRemoveFile: function() {
        const removeList = new Map()
        this.selectedFiles.forEach(file => removeList.set(file.content.name, file))
        const fileList = this.fileList.filter(file => !removeList.has(file.filePath))
        this.fileList = fileList
      },
      uploadProcessFile: function() {
      },
      uploadGetPresignedUrl: function() {
      },
      uploadSetSelectedFiles: function(selection) {
        this.selectedFiles = selection
      },
      // eslint-disable-next-line no-unused-vars
      uploadOnClickLabel: function(file) {
      },
      //function called on unsubscribe
      actionOnEndSubscribe: function(type,message){
        if (message){
        console.log('Successfully unsubscribed')
        }
      },
      //function detects when subscribe stream returns a 'complete' message and notifies the user

      actionOnUploadSuccess: function(type, message){

        console.log(`actionOnUploadSuccess() type: ${type} message:`)
        //console.log(message)
        if (message){


          console.log('message')
        //var txt = message.event_info.details
        if (message.type == 'UPLOAD_STATUS' && message.upload_status.status == 'IN_PROGRESS'){
          //if (this.uploadArr.includes(message.upload_status.file_id) == false)
          //this.uploadArr.push(message.upload_status.file_id)
          if (message.upload_status.current == message.upload_status.total && !this.uploadFileLst.includes(message.upload_status.file_id)){
            this.uploadFileLst.push(message.upload_status.file_id)
            console.log('uploading file')
            this.sendSubscribePing(message)

          }
        }
        else if (message.type == 'UPLOAD_STATUS' && message.upload_status.status == 'COMPLETE'){
          //need to set a flag to send one toast message or put message in loading screen
          EventBus.$emit('toast', {
            detail: {
              msg: 'Your files have been uploaded. Syncing database with application.',
              type: 'success'
            }
          })
          if (this.subscribeId == -1){
            var rand = Math.floor(Math.random() * 100)
            //this.updateSubscribeId(rand)
            this.$store.dispatch('updateSubscribeId', rand)
          }
          this.ps = new PennsieveClient()
          //stop listening after success
          this.ps.unsubscribe(this.subscribeId,this.actionOnEndSubscribe)
          console.log(`unsubscribing from: ${this.subscribeId}`)

        }

    }
    },
    // eslint-disable-next-line no-unused-vars
    default: function(type, message){
      console.log(`unsubscribing from: ${this.subscribeId}`)
    }
    },

    mounted: function() {
      console.log("confirmation that mounted block executes")
      this.resetQueue()
      this.ps = new PennsieveClient()
      this.ps.useDatset(this.config.datasetId)
        .then(response => {
          this.datasetIdInUse = response.dataset_id
        })
        .catch(err => {
          // TODO: raise a toast notification?
          console.log('useDatset() failure:')
          console.log(err)
        })
     //initiating subscription
     // eslint-disable-next-line
     console.log(`BfUpload.mounted() subscribeId: ${this.subscribeId}`)
     if (this.subscribeId == 1){
       var rand = Math.floor(Math.random() * 100)
       //this.updateSubscribeId(rand)
       this.$store.dispatch('updateSubscribeId', rand)
       console.log("subscribe ID is ",this.subscribeId)
     }
     this.ps.subscribe(this.subscribeId, this.actionOnUploadSuccess)
      .then(response => {
        console.log('BfUpload.mounted() SUCCESS: subscribed to Agent, response:')
        console.log(response)
      })
      .catch(err => {
        console.log('BfUpload.mounted() FAILURE: subscribe to Agent failed, err:')
        console.log(err)
      })
    }
  }
</script>

<style src="./BfUpload.scss" scoped lang="scss"></style>
<style lang="scss">
  @import '../../assets/_variables.scss';
  .bf-upload .bf-dialog .bf-dialog-wrap {
    height: 590px;
    margin: -295px 0 0 -350px;
    width: 700px;
  }
</style>
