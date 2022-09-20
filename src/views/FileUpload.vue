<template>
  <div class="container">
    <span class="sidebar-container">
      <bf-navigation-secondary :studies="allStudies" />
    </span>
    <span class="selected-content-container">
      <ih-subheader previousRoute="/studies">
        <template slot="text">
          <template v-if="!isLinkingTargetSet">No Linking Target(s) Selected</template>
          <template v-else>
            Linking Target(s):
            <div class="targets-container">
              <div class="target-item" v-for="(target, index) in linkingTargets" :key="index">
                <!--if visit is selected-->
                <template v-if="target.modelId === '9c579bef-6ce0-4632-be1c-a95aadc982c4'">
                  <div class="ml-16" >
                    <div class="property-text">
                      Visit Event ID
                    </div>
                    <div>
                      {{target.visit_event}}
                    </div>
                  </div>
                  <div class="ml-16">
                    <div class="property-text">
                      Event Name
                    </div>
                    <div>
                      {{target.event_name}}
                    </div>
                  </div>
                </template>
                <!--if sample is selected-->
                <template v-else-if="target.modelId === 'e1ada387-5401-4409-b9d6-748f3aaddf23'">
                  <div class="ml-16">
                    <div class="property-text">
                      Sample Type ID
                    </div>
                    <div>
                      {{target.sample_type_id}}
                    </div>
                  </div>
                  <div class="ml-16">
                    <div class="property-text">
                      Study Sample ID
                    </div>
                    <div>
                      {{target.study_sample_id}}
                    </div>
                  </div>
                </template>
              </div>
            </div>
          </template>
        </template>
        <template slot="buttons">
        <bf-button @click="onUploadMenuClick">
          Upload Files
        </bf-button>
        </template>
      </ih-subheader>

      <div class="upload-content">

              <template v-if="!isLinkingTargetSet">
        <bf-button v-on:click="updateSearchModalVisible(true)">
          Select Linking Targets
        </bf-button>
      </template>
      <template v-else>
      <bf-button v-on:click="updateSearchModalVisible(true)">
        Select Linking Targets
      </bf-button>
      </template>
      <div class="logo-container">
        <span>
        <bf-button @click="linkToTarget()">
          Link selected files to record
        </bf-button>
        </span>
        </div>
        <span>
        <!--
          <div>
          <bf-button @click="onUploadMenuClick">
            Upload Files
          </bf-button>
          </div>
          -->
          <hr>
          <h2 class="orgtext">Staged Files</h2>

          <div
            class="bf-dataset-breadcrumbs"
          >
            <breadcrumb-navigation
              :ancestors="ancestors"
              :file="file"
              :file-id="$route.params.fileId"
              @navigate-breadcrumb="handleNavigateBreadcrumb"
            />
          </div>

          <files-table
              v-if="hasFiles"
              :data="files"
              :multiple-selected="multipleSelected"
              @delete="deleteIt"
              @process="processFile"
              @copy-url="getPresignedUrl"
              @selection-change="setSelectedFiles"
              @click-file-label="onClickLabel">
          </files-table>
          <!--
          <bf-drop-info
            v-if="showDropInfo"
            :show-drop-info.sync="showDropInfo"
            :file="file"
          />
          -->

          <bf-upload
              :open.sync="uploadDialogOpen"
              :isAddingFiles = "isAddingFiles"
              @close-upload-dialog = "closeUploadDialog"
          />

          <bf-drop-info
              v-if="showDropInfo"
              :show-drop-info.sync="showDropInfo"
              :file="file"
          />

          <!--
          <bf-delete-dialog
            ref="deleteDialog"
            :selected-files="selectedFiles"
            @file-delete="onDelete"
          />
          -->
        </span>
      </div>



    </span>
  </div>
</template>

<script>
import BreadcrumbNavigation from '@components/shared/BreadcrumbNavigation/BreadcrumbNavigation.vue'
import IhSubheader from '@/components/shared/IhSubheader.vue'
import BfButton from '@/components/shared/BfButton.vue'
import BfNavigationSecondary from '@/components/bf-navigation/BfNavigationSecondary.vue'
//import BfUploadMenu from '@/components/BfUploadMenu/BfUploadMenu.vue'
import EventBus from '../utils/event-bus.js'
import FilesTable from '@/components/FilesTable/FilesTable.vue'
import BfUpload from '../components/BfUpload/BfUpload.vue'
//MAY NEED ONE LESS UP DIR
import Sorter from '../mixins/sorter/index.js'
import Request from '../mixins/request/index.js'
//import BfDeleteDialog from '../components/bf-delete-dialog/BfDeleteDialog.vue'
import {findIndex, pathEq, isEmpty} from 'ramda'
import { mapGetters,
         mapActions,
         mapState
       }
from 'vuex'
// import PennsieveClient from '@/utils/pennsieve/client.js'

export default {
  name: 'FileUpload',
  components: {
    BfNavigationSecondary,
    IhSubheader,
    BfButton,
    BfUpload,
    FilesTable
    //BfDeleteDialog
  },
  mixins: [
    Sorter,
    Request,
    //GetFileProperty
  ],
  computed: {
    //delete instance of selectedStudayName
    ...mapGetters(['allStudies', 'selectedStudyName','userToken','uploadDestination','datasetId','getRelationshipTypeByName']),
    ...mapState(['linkingTargets','selectedStudyName']),
    isLinkingTargetSet() {
      return !isEmpty(this.linkingTargets)
    },
    //returns true if more than 1 select file
    multipleSelected: function () {
      return this.selectedFiles.length > 1
    },

  },

  watch: {
    selectedStudyName: {
      handler: function() {
        this.fetchFiles()
      }
      },
  data() {
    return {
      file: {
        content: {
          name: ''
        }
      },
      ancestors: null,
      files: [],
      sortedFiles: [],
      selectedFiles: [],
      showDropInfo: false,
      showUploadInfo: false,
      sortDirection: 'asc',
      singleFile: {},
      isLoading: false,
      isAddingFiles: false,
      hasFiles: true,
      uploadDialogOpen: false,
      isCreating: false
    }
  },
  mounted: function () {
    //if no files yet
    this.setSearchPage('FileUpload')
    if (!this.files.length){
      this.fetchFiles()
    }

    // this.$el.addEventListener('dragenter', this.onDragEnter.bind(this))
    // EventBus.$on('add-uploaded-file', this.onAddUploadedFile.bind(this))
    // EventBus.$on('dismiss-upload-info', this.onDismissUploadInfo.bind(this))
    // EventBus.$on('update-uploaded-file-state', this.onUpdateUploadedFileState.bind(this))
    // EventBus.$on('update-external-file', this.onFileRenamed)
  },
  destroyed: function () {
    // this.$el.removeEventListener('dragenter', this.onDragEnter.bind(this))
    // EventBus.$off('add-uploaded-file', this.onAddUploadedFile.bind(this))
    // EventBus.$off('dismiss-upload-info', this.onDismissUploadInfo.bind(this))
    // EventBus.$off('update-uploaded-file-state', this.onUpdateUploadedFileState.bind(this))
    // EventBus.$off('update-external-file', this.onFileRenamed)
  },

  methods: {
      ...mapActions(['setSearchPage', 'updateSearchModalVisible','addRelationshipType','setItsLinkinTime']),

      handleNavigateBreadcrumb: function (id = '') {
        if (id) {
          this.navigateToFile(id)
        } else {
          this.navigateToDataset()
        }
      },

    onClickChild: function(){
      console.log("onClickhild()") //will be somevalue

    },
    /**
     * Handle upload menu click event
     * @param {String} command
     */
    // command is arg
    onUploadMenuClick: function(){
      this.uploadDialogOpen = true;
      //this.$emit('upload-menu-click', file)
      EventBus.$emit('open-uploader', true);
      /*
      const options = {
        'file': this.showUpload
        //'external-file': this.openUploadExternalFileDialog
      }

      const handler = options[command]
      if (typeof handler === 'function') {
        handler()
      }
      */
    },

    closeUploadDialog: function() {
      this.uploadDialogOpen = false;
    },

    processFile: function() {
      console.log("processFile()")
    },

    getPresignedUrl: function() {
      console.log("getPresignedUrl()")
    },

    onClickLabel: function() {
      console.log("onClickLabel()")
        const id = pathOr('', ['content', 'id'], file)
        const packageType = pathOr('', ['content', 'packageType'], file)

        if (id === '') {
          return
        }

        if (packageType === 'Collection') {
          this.navigateToFile(id)
        } else {
          this.$router.push({
            name: 'file-record',
            params: {
              conceptId: this.filesProxyId,
              instanceId: id
            }
          })
        }


    },

    setPlaceholder: function(){
      console.log('setting target');
      //send API request for specific visit record, and set that record to the store
    },
    createDefaultRelationship: function() {
      const datasetId = 'N:dataset:e2de8e35-7780-40ec-86ef-058adf164bbc'
      const url = `${this.config.conceptsUrl}/datasets/${datasetId}/relationships`
      return this.sendXhr(url, {
        method: 'POST',
        header: {
          'Authorization': `bearer ${this.userToken}`
        },
        body: {
          name: 'belongs_to',
          displayName: 'Belongs To',
          description: '',
          schema: []
        }
      }).then(response => {
        this.addRelationshipType(response)
      })
    },
    checkBelongsToExists: function() {
      /*
      const belongsTo = this.getRelationshipTypeByName('belongs_to')
      if (Object.keys(belongsTo).length === 0) {
        // if not, create a default, then create the file relationship
        return this.createDefaultRelationship()
      }
      */
      return Promise.resolve([])
    },

    /**
     * Creates relationships with file(s)
     */
    createFileRelationshipRequests: function() {
      console.log('createFileRelationshipRequests()')
      console.log('- selectedFiles: ')
      console.log(this.selectedFiles)
      this.isCreating = true
      const url = `https://api.pennsieve.io/models/datasets/N:dataset:e2de8e35-7780-40ec-86ef-058adf164bbc/proxy/package/instances`
      var iter = this.selectedFiles;
      var selecteditemids = []
      for (const f of iter){
        var i = f.content.id
        selecteditemids.push(i)
      }
      //NOTE: verify linkingTargets  var
      var iter2 = this.linkingTargets;
      console.log('LINKING TARGETS ARE: ', this.linkingTargets)
      //iterating through linking target(s). We then map all of the selected files (i.e. link) to the current target
      for (const j of iter2){
        console.log("CURRENT LINKING TARGET IS ", j)
        var curr_targ = j.recordId
        console.log('- selecteditemids:')
        console.log(selecteditemids)
        // eslint-disable-next-line no-unused-vars
        const queues = Array.from(selecteditemids).map(itemId => {
          const recordId = itemId
          console.log(`+ recordId: ${recordId}`)
          const packageId = curr_targ //the record we are linking to
          console.log(`+ packageId: ${packageId}`)
          //pathOr('', ['params', 'instanceId'], this.$route)
          const linkTarget = {
            'ConceptInstance': {
              id: packageId //again, the file we are currently on
            }
          }

          return this.sendXhr(url, {
            method: 'POST',
            header: {
              'Authorization': `bearer ${this.userToken}`
            },
            body: {
              //switch
              externalId: recordId, //OR MAYBE recordId
              targets: [{
                direction: 'FromTarget',
                linkTarget, //the file
                relationshipType: 'belongs_to',
                relationshipData: []
              }]
            }
          })
        })
        // this maps over all the queued responses to guarantee that all responses are returned regardless of error status
        //return Promise.all(queues.map(q => {
          //return q.catch(err => ({status: err.status}))
        //}))

      }
    },

    /**
     * Callback for create relationship success
     * Refresh table and close drawer
     */

    // eslint-disable-next-line no-unused-vars
    createRelationshipsSuccess: function() {
      console.log('createRelationshipsSuccess()')
      //const conceptName = propOr('', 'name', this.concept)
      //const displayName = propOr('', 'displayName', this.concept)
      //NOTE: need to figure out how to pass in selectedfiles and set the target to the staging folder of the dataset

      // the destination is the 'linked' folder
      //NOTE: here we need to get the UUID of the study specific collection and stuff that into the destination


      switch(this.selectedStudyName){
        case 'COVAXX':
        // eslint-disable-next-line no-redeclare
          var destination = "N:collection:a9e58d46-22cd-4664-8523-896da5550ac7"
        break;
        case 'Immune Health Multiple Sclerosis':
        // eslint-disable-next-line no-redeclare
          var destination  = "N:collection:5ae3fcd0-c337-4afa-8359-3acf9e56e162"
        case 'MESSI COVID-19':
        // eslint-disable-next-line no-redeclare
          var destination  = `https://api.pennsieve.io/packages/N%3Acollection%3Aac6c99e6-3a66-477a-ac86-0b64c63c912f?api_key=${this.userToken}&includeAncestors=true`;
        break;
        case 'MESSI Sepsis':
        // eslint-disable-next-line no-redeclare
          var destination  = `https://api.pennsieve.io/packages/N%3Acollection%3Ac118aa8f-e2cb-4da3-8a22-c7583367cc97?api_key=${this.userToken}&includeAncestors=true`;
        break;
        case 'METRIC':
        // eslint-disable-next-line no-redeclare
          var destination  = `https://api.pennsieve.io/packages/N%3Acollection%3A36eb3b7e-4146-47f6-a2bd-40f1484bb0ee?api_key=${this.userToken}&includeAncestors=true`;
        break;
        case 'Meyer iSpy COVID':
        // eslint-disable-next-line no-redeclare
          var destination  = `https://api.pennsieve.io/packages/N%3Acollection%3A6977e0c2-6cb3-4148-b3ac-eb20bdf49a84?api_key=${this.userToken}&includeAncestors=true`;
        break;
        case 'Wherry Allen IBD':
        // eslint-disable-next-line no-redeclare
        var destination = `https://api.pennsieve.io/packages/N%3Acollection%3A983ed537-961c-4689-9d91-ee32a207c241?api_key=${this.userToken}&includeAncestors=true`;
        break;
        case 'Wherry Allen Melanoma':
        // eslint-disable-next-line no-redeclare
          var destination  = `https://api.pennsieve.io/packages/N%3Acollection%3A57cfdd94-3d05-43c9-8990-c85200c2fef8?api_key=${this.userToken}&includeAncestors=true`;
        break;
        case 'Wherry CHIP':
        // eslint-disable-next-line no-redeclare
          var destination  = `https://api.pennsieve.io/packages/N%3Acollection%3A9dd73709-13b1-4e36-84f3-b3d0795318ba?api_key=${this.userToken}&includeAncestors=true`;
        break;
        case 'Wherry COVEND':
        // eslint-disable-next-line no-redeclare
          var destination  = `https://api.pennsieve.io/packages/N%3Acollection%3A683c76e5-2ff9-42e2-848e-93659d616c12?api_key=${this.userToken}&includeAncestors=true`;
        break;
        case 'Wherry COVID Vaccine':
        // eslint-disable-next-line no-redeclare
          var destination  = `https://api.pennsieve.io/packages/N%3Acollection%3Ad209e36a-a70f-4324-821d-06bc6ebb6384?api_key=${this.userToken}&includeAncestors=true`;
        break;
        case 'Wherry HD in-lab':
        // eslint-disable-next-line no-redeclare
          var destination  = `https://api.pennsieve.io/packages/N%3Acollection%3Afc35c65f-69eb-4bd5-83c5-2d18f0ab4559?api_key=${this.userToken}&includeAncestors=true`;
        break;
        case 'Wherry Healthy Donor Flu Vaccine':
        // eslint-disable-next-line no-redeclare
          var destination  = `https://api.pennsieve.io/packages/N%3Acollection%3Ac779548d-d79b-42f3-b0fc-2610799c5ee1?api_key=${this.userToken}&includeAncestors=true`;
        break;
        case 'Wherry Melanoma AntiPD1':
        // eslint-disable-next-line no-redeclare
          var destination  = `https://api.pennsieve.io/packages/N%3Acollection%3A04ae0bc0-4435-4eb8-a269-7e8acf36af01?api_key=${this.userToken}&includeAncestors=true`;
        break;
        case 'Wherry Recov Donors':
        // eslint-disable-next-line no-redeclare
          var destination  = `https://api.pennsieve.io/packages/N%3Acollection%3Afda8d13c-658f-475a-b90a-cd7a79ef7b87?api_key=${this.userToken}&includeAncestors=true`;
        break;
        default:
          //end
          // eslint-disable-next-line no-redeclare
        var destination  = `https://api.pennsieve.io/packages/N%3Acollection%3Adaa2ee61-2684-42af-b052-db2aa8937c99?api_key=${this.userToken}&includeAncestors=true`;
      }

      //let destination = "N:collection:42632589-b052-453d-ad03-23701ab595df"
      this.moveItems(destination, this.selectedFiles);
      const numRequests = this.selectedFiles.size
      const plural = numRequests === 1 ? '' : 's'
      /*
      EventBus.$emit('refresh-table-data', {
        name: conceptName,
        count: numRequests,
        displayName,
        type: 'Add'
      })
      */
      EventBus.$emit('toast', {
        detail: {
          msg: `Record${plural} Linked!`,
          type: 'success'
        }
      })
      // check for onboarding event state for creating a relationship
      //if (this.onboardingEvents.indexOf('CreatedRelationshipType') === -1){
        // make post request
      //  this.sendOnboardingEventsRequest()
      //}
      //this.closeSideDrawer()
      this.isCreating = false
    },
    /**
     * Create relationship
     */
    createRecordRelationships: function() {
      // execute batch request
      let body = []
      let to, from = ''
      this.selectedItemIds.forEach(item => {
        if (this.inverseDirection) {
          to = this.$route.params.instanceId
          from = item
        } else {
          to = item
          from = this.$route.params.instanceId
        }
        body.push({
          from,
          to,
          values: []
        })
      })
      return this.sendXhr(this.createRelationshipUrl, {
        method: 'POST',
        header: {
          'Authorization': `bearer ${this.userToken}`
        },
        body
      })
        .then(() => {
          // track adding a relationship between records
          EventBus.$emit('track-event', {
            name: 'Add a Relationship Between Records'
          })

          this.createRelationshipsSuccess()
        })
        .catch(this.handleXhrError.bind(this))
    },

    deleteIt: function (){
      const fileIds = this.selectedFiles.map(item => item.content.id)

      this.sendXhr(`https://api.pennsieve.io/data/delete?api_key=${this.userToken}`, {
        method: 'POST',
        body: { things: fileIds }
      })
      .then(response => {
        console.log("files deleted", response)
      })
      .catch(response => {
        this.handleXhrError(response)
      })
    },
    /**
    * Reset selected files state
    */
   resetSelectedFiles: function () {
      /*
       const fileIds = this.selectedFiles.map(item => item.content.id)

       this.sendXhr(`https://api.pennsieve.io/data/delete?api_key=${this.userToken}`, {
         method: 'POST',
         body: { things: fileIds }
       })
       .then(response => {
         console.log("files deleted", response)
       })
       .catch(response => {
         this.handleXhrError(response)
       })
       */
     console.log("selected files resetting")
     this.selectedFiles = []
     this.lastSelectedFile = {}
     //refresh after moving
     this.fetchFiles()
   },

   /**
    * Sort table by column
    * @param {String} path
    * @param {String} dir
    */
   sortColumn: function (path, dir = '') {
     this.sortedFiles = this.returnSort(path, this.files, dir)
   },

    /**
     * Remove items from files list
     * @param {Object} items
     */
    removeItems: function (items) {
      console.log("selected files are",items)
      // Remove all successfully deleted files RETURN TO THIS...need to splice out files from display
      console.log("file len before loop is ", this.files.length)
      for (let i = 0; i < items.length; i++) {
        console.log(i)
        const fileIndex = findIndex(pathEq(['content', 'id'], items[i]), this.files)
        this.files.splice(fileIndex, 1)
      }
      console.log("file len after loop is ", this.files.length)
      // Resort files
      this.sortColumn(this.sortBy, this.sortDirection)
      console.log("resetting selected files")
      this.resetSelectedFiles()
    },

    /**
     * Send XHR to move items
     * @param {String} destination}
     * @param {Array} items
     */
    moveItems: function (destination, items) {
      console.log("moveItems()")
      console.log(`- destination: ${destination}`)
      console.log('- items: ')
      console.log(items)
      let apiKey = this.userToken
      let url = `https://api.pennsieve.io/data/move?api_key=${apiKey}`
      console.log('* url: ')
      console.log(url)
      if (destination) {
        const things = items.map(item => item.content.id)
        console.log('+ things:')
        console.log(things)
        this.sendXhr(url, {
          method: 'POST',
          body: {
            destination,
            things //edit this
          }
        })
          .then(response => {
            //this.onMoveItems(response)
            console.log(response)
            console.log('selected files are: ',this.selectedFiles)
            this.fetchFiles()
          })
          .catch(response => {
            this.handleXhrError(response)
          })
      }
      // this.removeItems(this.selectedFiles)
    },

    /**
     * Handler for move items endpoint request
     * @param {Object} response
     */
     // eslint-disable-next-line no-unused-vars
    onMoveItems: function (response) {
      console.log("onMoveItems called. We are removing the files that we linked from the staging file")
      // Remove successful items from the files list
      //
      //const successItems = propOr([], 'success', response)
      // eslint-disable-next-line no-undef
      //NOTE: consider using response
      this.removeItems(this.selectedFiles);
      //dont bother with this for now
      /*
      // Handle conflict items
      const failures = propOr([], 'failures', response)
      const failureIds = pluck('id', failures)
      const failureItems = failureIds.map(id => {
        return find(pathEq(['content', 'id'], id), this.files)
      })

      // Show failure dialog
      if (failureItems.length > 0) {
        this.moveConflict = {
          display: failureItems,
          files: failures,
          destination: propOr(null, 'destination', response)
        }

        // Show user notice of conflicts
        this.$refs.moveDialog.visible = true
      } */
    },

    createRelationships: function() {
      console.log('createRelationships()')
      this.isLoading = true
    //  if (this.isFile) {

        this.checkBelongsToExists()
        //this.createFileRelationshipRequests()
        .then(() => this.createFileRelationshipRequests())
        .then(() => this.createRelationshipsSuccess())
        .finally(() => this.isLoading === false)
      //} else {
      //  this.createRecordRelationships().finally(() => this.isLoading = false)
    //  }
    },
    linkToTarget: function() {
      console.log('linkToTarget() called');
      this.createRelationships();
      //Then move selected files from staging to linked (don't launch modal)
      //OR do it on success...
    },
    getSubType: function (file) {
      const subtype = this.getFilePropertyVal(file.properties, 'subtype')

      let defaultType = ''
      //NOTE: must get this by other means
      //const packageType = pathOr('', ['content', 'packageType'], file)
      var packageType = 'file';
      switch (packageType) {
        case 'Collection':
          defaultType = 'Folder'
          break
        default:
          break
      }

      return subtype
        ? subtype
        : defaultType
    },

    /**
     * Set selected files
     * @param {Array} selection
     */
    setSelectedFiles: function (selection) {
      console.log('FileUpload::setSelectedFiles() selection:')
      console.log(selection)
      this.selectedFiles = selection
    },

    //gets all files in the dataset within the staged directory on mount
    fetchFiles: function () {
      //NOTE: here we need to get the UUID of the study specific collection and stuff that into the api_url

      // eslint-disable-next-line no-undef
      switch(this.selectedStudyName){
        case 'COVAXX':
        // eslint-disable-next-line no-redeclare
          var api_url = `https://api.pennsieve.io/packages/N%3Acollection%3Aa6299140-4392-4f37-9490-df0399f4c2c8?api_key=${this.userToken}&includeAncestors=true`;
        break;
        case 'Immune Health Multiple Sclerosis':
        // eslint-disable-next-line no-redeclare
          var api_url = `https://api.pennsieve.io/packages/N%3Acollection%3A3f6086c9-e5a6-4d23-a776-be6a738016f0?api_key=${this.userToken}&includeAncestors=true`;
        break;
        case 'MESSI COVID-19':
        // eslint-disable-next-line no-redeclare
          var api_url = `https://api.pennsieve.io/packages/N%3Acollection%3Aac6c99e6-3a66-477a-ac86-0b64c63c912f?api_key=${this.userToken}&includeAncestors=true`;
        break;
        case 'MESSI Sepsis':
        // eslint-disable-next-line no-redeclare
          var api_url = `https://api.pennsieve.io/packages/N%3Acollection%3Ac118aa8f-e2cb-4da3-8a22-c7583367cc97?api_key=${this.userToken}&includeAncestors=true`;
        break;
        case 'METRIC':
        // eslint-disable-next-line no-redeclare
          var api_url = `https://api.pennsieve.io/packages/N%3Acollection%3A36eb3b7e-4146-47f6-a2bd-40f1484bb0ee?api_key=${this.userToken}&includeAncestors=true`;
        break;
        case 'Meyer iSpy COVID':
        // eslint-disable-next-line no-redeclare
          var api_url = `https://api.pennsieve.io/packages/N%3Acollection%3A6977e0c2-6cb3-4148-b3ac-eb20bdf49a84?api_key=${this.userToken}&includeAncestors=true`;
        break;
        case 'Wherry Allen IBD':
        // eslint-disable-next-line no-redeclare
          var api_url = `https://api.pennsieve.io/packages/N%3Acollection%3A983ed537-961c-4689-9d91-ee32a207c241?api_key=${this.userToken}&includeAncestors=true`;
        break;
        case 'Wherry Allen Melanoma':
        // eslint-disable-next-line no-redeclare
          var api_url = `https://api.pennsieve.io/packages/N%3Acollection%3A57cfdd94-3d05-43c9-8990-c85200c2fef8?api_key=${this.userToken}&includeAncestors=true`;
        break;
        case 'Wherry CHIP':
        // eslint-disable-next-line no-redeclare
          var api_url = `https://api.pennsieve.io/packages/N%3Acollection%3A9dd73709-13b1-4e36-84f3-b3d0795318ba?api_key=${this.userToken}&includeAncestors=true`;
        break;
        case 'Wherry COVEND':
        // eslint-disable-next-line no-redeclare
          var api_url = `https://api.pennsieve.io/packages/N%3Acollection%3A683c76e5-2ff9-42e2-848e-93659d616c12?api_key=${this.userToken}&includeAncestors=true`;
        break;
        case 'Wherry COVID Vaccine':
        // eslint-disable-next-line no-redeclare
          var api_url = `https://api.pennsieve.io/packages/N%3Acollection%3Ad209e36a-a70f-4324-821d-06bc6ebb6384?api_key=${this.userToken}&includeAncestors=true`;
        break;
        case 'Wherry HD in-lab':
        // eslint-disable-next-line no-redeclare
          var api_url = `https://api.pennsieve.io/packages/N%3Acollection%3Afc35c65f-69eb-4bd5-83c5-2d18f0ab4559?api_key=${this.userToken}&includeAncestors=true`;
        break;
        case 'Wherry Healthy Donor Flu Vaccine':
        // eslint-disable-next-line no-redeclare
          var api_url = `https://api.pennsieve.io/packages/N%3Acollection%3Ac779548d-d79b-42f3-b0fc-2610799c5ee1?api_key=${this.userToken}&includeAncestors=true`;
        break;
        case 'Wherry Melanoma AntiPD1':
        // eslint-disable-next-line no-redeclare
          var api_url = `https://api.pennsieve.io/packages/N%3Acollection%3A04ae0bc0-4435-4eb8-a269-7e8acf36af01?api_key=${this.userToken}&includeAncestors=true`;
        break;
        case 'Wherry Recov Donors':
        // eslint-disable-next-line no-redeclare
          var api_url = `https://api.pennsieve.io/packages/N%3Acollection%3Afda8d13c-658f-475a-b90a-cd7a79ef7b87?api_key=${this.userToken}&includeAncestors=true`;
        break;
        default:
          //end
          // eslint-disable-next-line no-redeclare
          var api_url = `https://api.pennsieve.io/packages/N%3Acollection%3Adaa2ee61-2684-42af-b052-db2aa8937c99?api_key=${this.userToken}&includeAncestors=true`;
      }

      // eslint-disable-next-line no-redeclare
      //var api_url = `https://api.pennsieve.io/packages/N%3Acollection%3Adaa2ee61-2684-42af-b052-db2aa8937c99?api_key=${this.userToken}&includeAncestors=true`;

      this.sendXhr(api_url)
        .then(response => {
          this.file = response
          this.files = response.children.map(file => {
            /**
            if (!file.storage) {
              file.storage = 0
            }
            */
            //file.icon = file.icon //|| this.getFilePropertyVal(file.properties, 'icon')
            //UNCOMMENT WHEN YOU KNOW WHAT IT DOES
            //file.subtype = this.getSubType(file)
            return file
          })
          this.sortedFiles = this.returnSort('content.name', this.files, this.sortDirection)
          this.ancestors = response.ancestors

          //NOTE: need to change this
          /*
          const pkgId = pathOr('', ['query', 'pkgId'], this.$route)
          if (pkgId) {
            this.scrollToFile(pkgId)
          }
          */
        })
        .catch(response => {
          this.handleXhrError(response)
        })
    },
  }
}
</script>
<style scoped lang="scss">
@import '../assets/css/_variables.scss';
.upload-content {
  margin: 0 16px
}
.sidebar-container {
  width: 20%;
}
.selected-content-container {
  width: 80%;
}
.container {
  display: flex;
}
.target-item {
  display: inline-block;
  border-right: 1px solid orange;
  padding-right: 1rem;
}
.targets-container .target-item:last-child {
  border-right: none;
}
.targets-container {
  white-space: nowrap;
  overflow: auto;
  width: -webkit-fill-available;
  margin-right: 1rem;
}
.logo-container {
  gap: 5px;
  display: flex;
  text-align: center;
  padding: 15px 0;
  a {
    text-decoration: none;
  }
  a:active {
    color: blue;
  }
  span:not(:last-of-type) {
    margin-right: 1rem;
  }
  .orgtext {
    //padding: 0 2rem;
    color: #2f26ad;
  }
}
.property-text {
  color: $app-primary-color;
  font-size: 1rem;
  font-weight: 500;
}
::v-deep .text-container {
  align-items: flex-end;
}
</style>
