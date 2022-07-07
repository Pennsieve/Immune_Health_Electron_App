<template>
  <div class="container">
    <span class="sidebar-container">
      <bf-navigation-secondary :studies="allStudies" />
    </span>
    <span class="selected-content-container">
      <ih-subheader previousRoute="/studies">
        <template slot="text">
          File Upload
        </template>
        <template slot="buttons">
          <bf-button>
            <router-link to="/" exact>
              Main Menu
            </router-link>
          </bf-button>
        </template>
      </ih-subheader>
      <h2>Filter Files placeholder</h2>
      <bf-button @click="setPlaceholder()">
        Set test uploadDestination
      </bf-button>
      <hr>
      <div class="logo-container">
        <span>
        <bf-button @click="onUploadMenuClick">
          Upload
        </bf-button>
        </span>
        <span>
          <bf-button @click="linkToTarget()">
            Link selected files to record
          </bf-button>

          <files-table
            v-if="hasFiles"
            :data="files"
            :multiple-selected="multipleSelected"
            //@move="showMove"
            @delete="showDelete"
            //@process="processFile"
            //@copy-url="getPresignedUrl"
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
          <!--
          <bf-upload
          :open="isOpen"
          :isAddingFiles = "isAddingFiles"
          />

          <bf-drop-info
            v-if="showDropInfo"
            :show-drop-info.sync="showDropInfo"
            :file="file"
          />
          -->
          <bf-delete-dialog
            ref="deleteDialog"
            :selected-files="selectedFiles"
            @file-delete="onDelete"
          />
        </span>
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
//import BfUpload from '../components/BfUpload/BfUpload.vue'
//MAY NEED ONE LESS UP DIR
import Sorter from '../../mixins/sorter/index.js'
import Request from '../../mixins/request/index.js'
import BfDeleteDialog from '../components/bf-delete-dialog/BfDeleteDialog.vue'
import { mapGetters, mapActions } from 'vuex'

export default {
  name: 'FileUpload',
  components: {
    BfNavigationSecondary,
    IhSubheader,
    BfButton,
    //BfUpload
    FilesTable,
    BfDeleteDialog
  },
  mixins: [
    Sorter,
    Request,
    //GetFileProperty
  ],
  computed: {
    ...mapGetters(['allStudies', 'selectedStudyName','API_KEY']),

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
      isOpen: false,
      isAddingFiles: false,
      hasFiles: true
    }
  },
  mounted: function () {
    //if no files yet
    if (!this.files.length){
      this.fetchFiles()
    }

    this.$el.addEventListener('dragenter', this.onDragEnter.bind(this))
    EventBus.$on('add-uploaded-file', this.onAddUploadedFile.bind(this))
      EventBus.$on('dismiss-upload-info', this.onDismissUploadInfo.bind(this))
      EventBus.$on('update-uploaded-file-state', this.onUpdateUploadedFileState.bind(this))
      EventBus.$on('update-external-file', this.onFileRenamed)

    },
    destroyed: function () {
      this.$el.removeEventListener('dragenter', this.onDragEnter.bind(this))
      EventBus.$off('add-uploaded-file', this.onAddUploadedFile.bind(this))
      EventBus.$off('dismiss-upload-info', this.onDismissUploadInfo.bind(this))
      EventBus.$off('update-uploaded-file-state', this.onUpdateUploadedFileState.bind(this))
      EventBus.$off('update-external-file', this.onFileRenamed)
    },
  methods: {
    //...mapActions(['setPlaceholderUploadDest']),
    /**
     * Handle upload menu click event
     * @param {String} command
     */
    // command is arg
    onUploadMenuClick: function(){
      console.log('launching upload menu')
      this.isOpen = true;
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

    setPlaceholder: function(){
      console.log('setting target');
      //send API request for specific visit record, and set that record to the store
    },
    linkToTarget: function() {
      console.log('linking to target');
      //this.createRelationships();
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
      const packageType = pathOr('', ['content', 'packageType'], file)
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
    onDelete: function (response) {
      //const successItems = propOr([], 'success', response)
      //this.removeItems(successItems)
    },

    /**
     * Set selected files
     * @param {Array} selection
     */
    setSelectedFiles: function (selection) {
      this.selectedFiles = selection
    },

    //gets all files in the dataset within the staged directory on mount
    fetchFiles: function () {
      api_url = `https://api.pennsieve.io/packages/N%3Acollection%3Afda8d13c-658f-475a-b90a-cd7a79ef7b87?api_key=${this.API_KEY}&includeAncestors=true`;
      this.sendXhr(this.api_url)
        .then(response => {
          this.file = response
          this.files = response.children.map(file => {
            /**
            if (!file.storage) {
              file.storage = 0
            }
            */
            //file.icon = file.icon || this.getFilePropertyVal(file.properties, 'icon')
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
}
</style>
