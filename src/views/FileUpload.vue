<template>
  <div class="container">
    <span class="sidebar-container">
      <bf-navigation-secondary :studies="allStudies" />
    </span>
    <span class="selected-content-container">
      <ih-subheader previousRoute="/studies">
        <template slot="text">
          <template v-if="!isLinkingTargetSet">No Linking Target Selected</template>
           <!--if visit is selected-->
          <template v-else-if="linkingTarget.modelId === '9c579bef-6ce0-4632-be1c-a95aadc982c4'">
            Linking Target:
            <div class="ml-16">
              <div class="property-text">
                Visit Event ID
              </div>
              <div>
                {{linkingTarget.visit_event}}
              </div>
            </div>
            <div class="ml-16">
              <div class="property-text">
                Event Name
              </div>
              <div>
                {{linkingTarget.event_name}}
              </div>
            </div>
          </template>
           <!--if sample is selected-->
          <template v-else-if="linkingTarget.modelId === 'e1ada387-5401-4409-b9d6-748f3aaddf23'">
            Linking Target:
            <div class="ml-16">
              <div class="property-text">
                Sample Type ID
              </div>
              <div>
                {{linkingTarget.sample_type_id}}
              </div>
            </div>
            <div class="ml-16">
              <div class="property-text">
                Study Sample ID
              </div>
              <div>
                {{linkingTarget.study_sample_id}}
              </div>
            </div>
          </template>
        </template>
        <template slot="buttons">
          <bf-button>
            <router-link to="/" exact>
              Main Menu
            </router-link>
          </bf-button>
        </template>
      </ih-subheader>
      <h2></h2>
      <bf-button v-on:click="updateSearchModalVisible(true)">
        Select Linking Target
      </bf-button>
      <div class="logo-container">
        <span>
        <bf-button @click="linkToTarget()">
          Link selected files to record
        </bf-button>
        </span>
        </div>
        <span>
          <div>
          <bf-button @click="onUploadMenuClick">
            Upload Files
          </bf-button>
          </div>
          <hr>
          <h2 class="orgtext">Staged Files</h2>
          <files-table
            v-if="hasFiles"
            :data="files"
            :multiple-selected="multipleSelected"
            @delete="showDelete"
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
      <div>
      </div>
    </span>
  </div>
</template>

<script>
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
    ...mapGetters(['allStudies', 'selectedStudyName','userToken','uploadDestination','datasetId','getRelationshipTypeByName']),
  ...mapState(['linkingTarget']),
  isLinkingTargetSet() {
    return !isEmpty(this.linkingTarget)
  },
    //returns true if more than 1 select file
    multipleSelected: function () {
      return this.selectedFiles.length > 1
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
      ...mapActions(['setSearchPage', 'updateSearchModalVisible','addRelationshipType']),
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
      console.log('createrelationshiprequests called')
      //change datasetId
      this.isCreating = true
      //const datasetId = this.datasetId;
      //pathOr('', ['params', 'datasetId'], this.$route)
      //CHANGE THIS URL
      const url = `https://api.pennsieve.io/models/datasets/N:dataset:e2de8e35-7780-40ec-86ef-058adf164bbc/proxy/package/instances`
      //NOTE: I think selecteditemids == selectedfiles. BUT HOW are selected files uniquely identified???
      var iter = this.selectedFiles;
      var selecteditemids = []
      for (const f of iter){
        var i = f.content.id
        selecteditemids.push(i)
      }
      const queues = Array.from(selecteditemids).map(itemId => {
        const recordId = itemId
        console.log(recordId)
        const packageId = this.linkingTarget.recordId //the record we are linking to
        console.log(packageId)
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
      return Promise.all(queues.map(q => {
        return q.catch(err => ({status: err.status}))
      }))
    },

    /**
     * Callback for create relationship success
     * Refresh table and close drawer
     */

    // eslint-disable-next-line no-unused-vars
    createRelationshipsSuccess: function() {
      console.log('createRElationshipsSuccess called')
      //const conceptName = propOr('', 'name', this.concept)
      //const displayName = propOr('', 'displayName', this.concept)
      //NOTE: need to figure out how to pass in selectedfiles and set the target to the staging folder of the dataset
      var destination = 'https://app.pennsieve.io/N:organization:aab5058e-25a4-43f9-bdb1-18396b6920f2/datasets/N:dataset:e2de8e35-7780-40ec-86ef-058adf164bbc/files/N:collection:26ccb088-419b-4e48-bbe6-5bd54847656d';
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

    /**
    * Reset selected files state
    */
   resetSelectedFiles: function () {
     console.log("selected files reset")
     this.selectedFiles = []
     this.lastSelectedFile = {}
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
      for (let i = 0; i < items.length; i++) {
        console.log(i)
        const fileIndex = findIndex(pathEq(['content', 'id'], items[i]), this.files)
        this.files.splice(fileIndex, 1)
      }
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
      console.log("moveitems called. moving linked files out of staging and into linked")
      if (destination) {
        const things = items.map(item => item.content.id)
        console.log(destination)
        console.log(things)
        this.sendXhr(destination, {
          method: 'POST',
          body: {
            destination,
            things //edit this
          }
        })
          .then(response => {
            this.onMoveItems(response)
          })
          .catch(response => {
            this.handleXhrError(response)
          })
      }
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
      this.isLoading = true
    //  if (this.isFile) {
      console.log('createrelationships called')
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
      console.log('linking to target');
      this.createRelationships();
      //Then move selected files from staging to linked (don't launch modal)
      //OR do it on success...
    },

    /**
    EDIT THIS
     * Set subtype of file, defaulting to package type
     * @param {Object} file
     * @returns {String}
     */
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
     * Show delete dialog
     */
    showDelete: function () {
      this.$refs.deleteDialog.visible = true
    },
    /**
     * Handler for delete XHR
     */
     /*
    onDelete: function (response) {
      //const successItems = propOr([], 'success', response)
      //this.removeItems(successItems)
    },
    */

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
      var api_url = `https://api.pennsieve.io/packages/N%3Acollection%3Afda8d13c-658f-475a-b90a-cd7a79ef7b87?api_key=${this.userToken}&includeAncestors=true`;
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
@import '@/assets/css/_variables.scss';
.sidebar-container {
  width: auto;
  min-width: 10rem;
  max-width: 20rem;
}
.selected-content-container {
  flex-grow: 1;
}
.container {
  display: flex;
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
.property-text {
  color: $app-primary-color;
  font-size: 1rem;
  font-weight: 500;
}
::v-deep .text-container {
  align-items: flex-end;
}
}
</style>
