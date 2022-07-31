<template>
  <div class="container">
    <span class="sidebar-container">
      <bf-navigation-secondary :studies="allStudies" />
    </span>
    <span class="selected-content-container">
      <ih-subheader previousRoute="/">
        <template v-if="selectedStudy" slot="text">
          <div>
            <div class="property-text">
              Study
            </div>
            <div>
              {{selectedStudyName}}
            </div>
          </div>
          <div class="participant-container">

          </div>
          <div class="visits-container">

          </div>
          <div class="samples-container">

          </div>
        </template>
        <template slot="buttons">
          <bf-button>
            <router-link to="/file-upload" exact>
              Upload Files
            </router-link>
          </bf-button>
        </template>
      </ih-subheader>
      <div>
        <bf-button v-on:click="updateSearchModalVisible(true)">
          Search Studies
        </bf-button>
      </div>
      <!-- graph browser here -->
      <br>
      <hr>
      <h2 class="orgtext">Related Files</h2>
      <div>
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
      </div>
    </span>
  </div>
</template>

<script>
import IhSubheader from '@/components/shared/IhSubheader.vue'
import FilesTable from '@/components/FilesTable/FilesTable.vue'
import BfButton from '@/components/shared/BfButton.vue'
import BfNavigationSecondary from '@/components/bf-navigation/BfNavigationSecondary.vue'
import { mapActions, mapGetters } from 'vuex'

export default {
  name: 'StudiesBrowser',
  components: {
    IhSubheader,
    BfButton,
    BfNavigationSecondary,
    FilesTable
  },
  mounted() {
    this.setSearchPage('StudiesBrowser')
  },
  computed: {
    ...mapGetters(['allStudies', 'selectedStudy', 'selectedStudyName']),
    //returns true if more than 1 select file
    multipleSelected: function () {
      return this.selectedFiles.length > 1
  }
},
  data(){
    return {
      hasFiles: true,
      selectedFiles: [],
      filteredFilesMetadata: {}
  }
  },
  watch: {
    //when related files are returned, fill the table with said files
    filteredFilesMetadata: {
      handler: function(){
        //if there are no files yet, fetch them
        if (!this.files.length){
          this.fetchFiles()
        }
      }
    }
  },
  methods: {
<<<<<<< HEAD
    ...mapActions(['updateSearchModalVisible']),
    /**
     * Set selected files
     * @param {Array} selection
     */
    setSelectedFiles: function (selection) {
      this.selectedFiles = selection
    }/*
    ,
    //gets all related files. UNCOMMENT
    fetchFiles: function () {

          //must assign 'file'to something
          this.file = filteredVisitsMetadata
          this.files = filteredVisitsMetadata.children.map(file => {
            //figure out whats happening here
            file.storage = 0
            }
            return file
          })
          this.sortedFiles = this.returnSort('content.name', this.files, this.sortDirection)
          this.ancestors = filteredVisitsMetadata.ancestors
=======
    ...mapActions(['updateSearchModalVisible', 'updateSearchModalSearch', 'setSearchPage']),
    filterSearch(model) {
      const newFilters = clone(this.searchModalSearch.filters)
      newFilters.push({
        id: v1(),
        type: 'model',
        target: model,
        targetLabel: model,
        property: '',
        propertyLabel: '',
        propertyType: '',
        operation: '',
        operationLabel: '',
        operators: [],
        value: '',
        isInvalid: false,
        lockTarget: true
      })
      const search = mergeRight(this.searchModalSearch, {
        filters: newFilters,
        model: model
      })
      this.updateSearchModalSearch(search)
      this.updateSearchModalVisible(true)
>>>>>>> main
    }
  }
  */
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
.property-text {
  color: $app-primary-color;
  font-size: 1rem;
  font-weight: 500;
}
.orgtext {
  //padding: 0 2rem;
  color: #2f26ad;
}
</style>
