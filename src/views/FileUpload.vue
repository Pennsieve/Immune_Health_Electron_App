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
              :file-id="file.content.id"
              @navigate-breadcrumb="handleNavigateBreadcrumb"
            />
          </div>
          <br/>
          <files-table
              v-if="hasFiles"
              :data="files"
              :multiple-selected="multipleSelected"
              @delete="deleteIt"
              @process="processFile"
              @copy-url="getPresignedUrl"
              @selection-change="setSelectedFiles"
              @click-file-label="onClickLabel"
              @link-selected-files="createRelationships">
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
              :currUploadDest = "selectedStudyName"
              @close-upload-dialog = "closeUploadDialog"
              @refreshMessageFromChild ="refreshMessageRecieved"
              @openProgressDialog="openProgress"
          />

          <bf-drop-info
              v-if="showDropInfo"
              :show-drop-info.sync="showDropInfo"
              :file="file"
          />

          <progress-modal
            :open.sync="progressDialogOpen"

            @refreshMessageFromChildSecondary="refreshMessageRecieved2"

            @close-progress-dialog = "closeProgressDialog"
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
import axios from 'axios'
import BreadcrumbNavigation from '@/components/shared/BreadcrumbNavigation/BreadcrumbNavigation.vue'
import IhSubheader from '@/components/shared/IhSubheader.vue'
import BfButton from '@/components/shared/BfButton.vue'
import BfNavigationSecondary from '@/components/bf-navigation/BfNavigationSecondary.vue'
//import BfUploadMenu from '@/components/BfUploadMenu/BfUploadMenu.vue'
import EventBus from '../utils/event-bus.js'
import FilesTable from '@/components/FilesTable/FilesTable.vue'
import BfUpload from '../components/BfUpload/BfUpload.vue'
import ProgressModal from '../components/BfUpload/ProgressModal.vue'
import Sorter from '../mixins/sorter/index.js'
import Request from '../mixins/request/index.js'
//import BfDeleteDialog from '../components/bf-delete-dialog/BfDeleteDialog.vue'
import {findIndex, pathEq, isEmpty, pathOr} from 'ramda'
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
    FilesTable,
    BreadcrumbNavigation,
    ProgressModal
    //BfDeleteDialog
  },
  mixins: [
    Sorter,
    Request,
    //GetFileProperty
  ],
  computed: {
    //delete instance of selectedStudayName
    ...mapGetters(['allStudies', 'selectedStudyName', 'userToken', 'uploadDestination', 'datasetId', 'getRelationshipTypeByName']),
    ...mapState(['linkingTargets','config']),
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
      handler: function (value) {
        // clear the current files in case fetchFiles errors out due to there being no files present (otherwise the files from the previously selected study will still be showing)
        this.clearFiles()
        //console.log("clearing files")
        let packageId = this.stagingLookup[value]
        this.currId = packageId
        this.fetchFiles(packageId)
        //console.log("fetching files")
      }
    },
    loadingPackageIds: {
      handler: function(value) {
        if (value === false) {
          this.setupFileTable()
        }
      }
    },
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
      progressDialogOpen: false,
      isCreating: false,
      fileId: '',
      stagingLookup: {},
      linkedLookup: {},
      currUploadDest: '',
      currId: '',
      loadingPackageIds: true,
      lastFileArr: []
    }
  },
  created(){
    this.$on('open-progress-dialog', (data) => {
      this.progressDialogOpen = data;
    })
  },
  mounted: function () {

    console.log(`mounted() selectedStudyName: ${this.selectedStudyName}`)
    //if no files yet
    this.setSearchPage('FileUpload')
    //this.fetchPackageIds()
    this.fetchPackageIds()
    /*
     this.$el.addEventListener('dragenter', this.onDragEnter.bind(this))
     EventBus.$on('add-uploaded-file', this.onAddUploadedFile.bind(this))
     EventBus.$on('dismiss-upload-info', this.onDismissUploadInfo.bind(this))
     EventBus.$on('update-uploaded-file-state', this.onUpdateUploadedFileState.bind(this))
     EventBus.$on('update-external-file', this.onFileRenamed)

    checks length of both staging and linked lookup tables and populates them if they're empty
    if (!Object.keys(this.stagingLookup).length && !Object.keys(this.linkedLookup).length){
    }
    */




  },
  destroyed: function () {
    // this.$el.removeEventListener('dragenter', this.onDragEnter.bind(this))
    // EventBus.$off('add-uploaded-file', this.onAddUploadedFile.bind(this))
    // EventBus.$off('dismiss-upload-info', this.onDismissUploadInfo.bind(this))
    // EventBus.$off('update-uploaded-file-state', this.onUpdateUploadedFileState.bind(this))
    // EventBus.$off('update-external-file', this.onFileRenamed)
  },

  methods: {
    ...mapActions(['setSearchPage', 'updateSearchModalVisible', 'addRelationshipType', 'setItsLinkinTime']),

  openProgress: function(){
      this.progressDialogOpen = true;
    },

    refreshMessageRecieved: function(){
      //this.fetchPackageIds()
      this.setupFileTable()
    },
    async refreshMessageRecieved2() {
      console.log("FETCHING FILES")
      //const initialFilesArrayLength = this.files.length
      //let newFilesArrayLength = this.files.length
      this.clearFiles()
      this.wait()
      //while (newFilesArrayLength == initialFilesArrayLength) {
        await new Promise(resolve => setTimeout(resolve, 3000));
        let packageId = this.stagingLookup[this.selectedStudyName]
        this.currId = packageId
        this.wait2()
        this.fetchFiles(packageId)
        //await this.fetchFiles(packageId).then(() => {
          //newFilesArrayLength = this.files.length
        //})
      //}
    },
    setupFileTable: function() {
      this.clearFiles()
      console.log('setupFileTable()')
      let packageId = this.stagingLookup[this.selectedStudyName]
      this.currId = packageId
      console.log(`setupFileTable() packageId: ${packageId}`)
      this.fetchFiles(packageId)
    },

    /*
      creates a lookup table consisting of mappings from a given study name to its staging and linked collections
    */
    fetchPackageIds: function () {
      console.log('fetchPackageIds()')
      this.loadingPackageIds = true
      var url = `${this.config.apiUrl}/datasets/N%3Adataset%3Ae2de8e35-7780-40ec-86ef-058adf164bbc?api_key=${this.userToken}`
      axios.get(url).then(async ( { data }) => {
        var temp_dict = data.children
        await Promise.all(temp_dict.map(async (child) => {
          //will just gather top level for now, when you can naviagte to the children, just make 2 dictionary entries with the same process
          var master_name = pathOr('', ['content', 'name'], child)
          this.currUploadDest = master_name
          var node_id = pathOr('', ['content', 'nodeId'], child)
          //need to make a call to url and make entry
          var le_url = `${this.config.apiUrl}/packages/${node_id}?api_key=${this.userToken}`
          await axios.get(le_url).then(( { data } ) => {
            var temp2 = data.children
            temp2.forEach(child2 => {
              const child2Name = pathOr('', ['content', 'name'], child2)
              const child2Id = pathOr('', ['content', 'id'], child2)
              if (child2Name == 'staging'){
                this.stagingLookup[master_name] = child2Id
              }
              else if (child2Name == 'linked') {
                this.linkedLookup[master_name] = child2Id
              }
            })
          })
        }))
        this.loadingPackageIds = false
        // .then(() => {
        //   console.log('fetchPackageIds() /then/ this.stagingLookup:')
        //   console.log(this.stagingLookup)
        // })
        // .finally(() => {
        //   console.log('fetchPackageIds() /finally/ this.stagingLookup:')
        //   console.log(this.stagingLookup)
        //   // let packageId = this.stagingLookup[this.selectedStudyName]
        //   // console.log(`fetchPackageIds() [finally] packageId: ${packageId}`)
        //   // this.fetchFiles(packageId)
        // })
      })
    },

    /**
     * Navigate to file
     * @param {String} id
     */
    navigateToFile: function (id) {
      //files == collection-files
      this.currId = id
      console.log(`navigateToFile() id: ${id}`)
      //this.$router.push({name: 'files', params: {fileId: id}})
      this.fetchFiles(id)
    },

    handleNavigateBreadcrumb: function (id) {
      console.log(`handleNavigateBreadcrumb() id: ${id}`)
      this.currId = id
      console.log(`setting Curr ID to ${id}`)
      this.navigateToFile(id)
    },

    onClickChild: function () {
      console.log("onClickhild()") //will be somevalue

    },
    /**
     * Handle upload menu click event
     * @param {String} command
     */
    // command is arg
    onUploadMenuClick: function () {
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

    closeUploadDialog: function () {
      this.uploadDialogOpen = false;
    },

    closeProgressDialog: function() {
      this.progressDialogOpen = false;
    },

    processFile: function () {
      console.log("processFile()")
    },

    getPresignedUrl: function () {
      console.log("getPresignedUrl()")
    },

    onClickLabel: function (file) {
      console.log(`onClickLabel() file:`)
      console.log(file)
      // eslint-disable-next-line
      const id = pathOr('', ['content', 'id'], file)
      console.log('id is ', id)
      // eslint-disable-next-line
      const packageType = pathOr('', ['content', 'packageType'], file)
      console.log('package type is ', packageType)
      if (id === '') {
        return
      }

      if (packageType === 'Collection') {
        console.log('we are in the collection case')
        this.navigateToFile(id)
        //this.fetchFiles(id)
      } else {
        // this.$router.push({
        //   name: 'file-record',
        //   params: {
        //     conceptId: this.filesProxyId,
        //     instanceId: id
        //   }
        // })
      }


    },

    setPlaceholder: function () {
      console.log('setting target');
      //send API request for specific visit record, and set that record to the store
    },
    createDefaultRelationship: function () {
      const datasetId = 'N:dataset:e2de8e35-7780-40ec-86ef-058adf164bbc'
      const url = `${this.config.apiUrl}/models/v1/datasets/${datasetId}/relationships`
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
    checkBelongsToExists: function () {
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
    createFileRelationshipRequests: async function () {
      console.log('createFileRelationshipRequests()')
      console.log('- selectedFiles: ')
      console.log(this.selectedFiles)
      this.isCreating = true
      const url = `${this.config.apiUrl}/models/datasets/N:dataset:e2de8e35-7780-40ec-86ef-058adf164bbc/proxy/package/instances`
      var iter = this.selectedFiles;
      var selecteditemids = []
      for (const f of iter) {
        var i = f.content.id
        selecteditemids.push(i)
      }
      //NOTE: verify linkingTargets  var
      var iter2 = this.linkingTargets;
      console.log('LINKING TARGETS ARE: ', this.linkingTargets)
      //iterating through linking target(s). We then map all of the selected files (i.e. link) to the current target
      const promises = []
      for (const j of iter2) {
        console.log("CURRENT LINKING TARGET IS ", j)
        var curr_targ = j.recordId
        console.log('- selecteditemids:')
        console.log(selecteditemids)
        // eslint-disable-next-line no-unused-vars
        promises.push[Promise.all(Array.from(selecteditemids).map(itemId => {
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
        }))]
        // this maps over all the queued responses to guarantee that all responses are returned regardless of error status
        //return Promise.all(queues.map(q => {
        //return q.catch(err => ({status: err.status}))
        //}))

      }
      return Promise.all(promises)
    },

    /**
     * Callback for create relationship success
     * Refresh table and close drawer
     */

    // eslint-disable-next-line no-unused-vars
    createRelationshipsSuccess: function () {
      console.log('createRelationshipsSuccess()')
      //const conceptName = propOr('', 'name', this.concept)

      var destination = this.linkedLookup[this.selectedStudyName]
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

      this.isCreating = false
    },
    /**
     * Create relationship
     */
    createRecordRelationships: function () {
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

    deleteIt: function () {
      const fileIds = this.selectedFiles.map(item => item.content.id)

      this.sendXhr(`${this.config.apiUrl}/data/delete?api_key=${this.userToken}`, {
        method: 'POST',
        body: {things: fileIds}
      })
          .then(response => {
            console.log("files deleted", response)
          })
          .catch(response => {
            this.handleXhrError(response)
          })
    },

    clearFiles() {
      this.file = {
        content: {
          name: ''
        }
      }
      this.fileId = ''
      this.files = []
    },

        //waits 10 seconds
        wait: async function() {
          await this.delay(10000);
        },
        //waits 5 seconds
        wait2: async function() {
          await this.delay(5000);
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
      console.log("selected files are", items)
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
      let url = `${this.config.apiUrl}/data/move?api_key=${apiKey}`
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
              console.log('selected files are: ', this.selectedFiles)

              this.fetchFiles(this.currId)
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
    },

    createRelationships: function () {
      console.log('createRelastionships()')
      this.createFileRelationshipRequests()
        .then(() => this.createRelationshipsSuccess())

    },
    linkToTarget: function () {
      console.log('linkToTarget() called');
      this.createRelationships();
      //Then move selected files from staging to linked (don't launch modal)
      //OR do it on success...
    },
    getSubType: function (file) {
      const subtype = this.getFilePropertyVal(file.properties, 'subtype')

      let defaultType = ''
      //NOTE: must get this by other means
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
    fetchFiles: function (packageId) {
      console.log(`fetchFiles() packageId: ${packageId}`)
      //var packageId = this.stagingLookup[this.selectedStudyName]
      var api_url = `${this.config.apiUrl}/packages/${packageId}?api_key=${this.userToken}&includeAncestors=true`;

      console.log('fetchFiles() api_url: ', api_url)
      return this.sendXhr(api_url)
          .then(response => {
            console.log('fetchFiles() response:')
            console.log(response)
            this.file = response
            this.fileId = response.content.id
            this.files = response.children.map(file => {
              return file
            })
            this.sortedFiles = this.returnSort('content.name', this.files, this.sortDirection)
            this.ancestors = response.ancestors
          })
          .catch(response => {
            this.handleXhrError(response)
          })
    }
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
