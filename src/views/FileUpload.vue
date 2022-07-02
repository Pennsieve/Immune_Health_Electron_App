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
            //will disable movie option
            //@move="showMove"
            @delete="showDelete"
            @process="processFile"
            //not sure what this one does
            @copy-url="getPresignedUrl"
            @selection-change="setSelectedFiles"
            //can probably disable below (if its for entering a folder in the file table)
            @click-file-label="onClickLabel"
          />
          <!--
          <bf-drop-info
            v-if="showDropInfo"
            :show-drop-info.sync="showDropInfo"
            :file="file"
          />
          -->
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
import FilesTable from '../../components/FilesTable.vue'
import { mapGetters, mapActions } from 'vuex'

export default {
  name: 'FileUpload',
  components: {
    BfNavigationSecondary,
    IhSubheader,
    BfButton,
    FilesTable
  },
  computed: {
    ...mapGetters(['allStudies', 'selectedStudyName'])
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
      isOpen: false
    }
  },
  methods: {
    ...mapActions(['setPlaceholderUploadDest']),
    /**
     * Handle upload menu click event
     * @param {String} command
     */
    // command is arg
    onUploadMenuClick: function () {
      console.log('launching upload menu')
      this.isOpen = false;
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
    }
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
