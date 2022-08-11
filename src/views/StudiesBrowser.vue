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
      <div v-if="Object.keys(selectedStudy).length != 0">
        <div class="mb-16">
          <bf-button  @click="clearAllSelections()">
            Clear selections
          </bf-button>
        </div>
        <div v-if="SearchStep == 0">
          <bf-button v-on:click="filterSearch('patient')">
            Filter Search Patients
          </bf-button>
        </div>
        <div v-if="SearchStep == 1">
          <bf-button v-on:click="filterSearch('visits')">
            Filter Search Visits
          </bf-button>
        </div>
        <div v-if="SearchStep == 2">
          <bf-button v-on:click="filterSearch('samples')">
            Filter Search Samples
          </bf-button>
        </div>
        <div v-if="SearchStep == 3">
          <h2>Clear filters and selections to start another search</h2>
        </div>
      </div>
      <br>
      <div>
        <graph-browser
          @record-clicked="updateClickedRecordsFilters"
        />
      </div>
      <div class="results-toggle">
        <p class="mr-16">View files for </p>
        <el-radio-group
          v-model="selectedButton"
          size="medium"
        >
          <el-radio-button
            class="records-radio-button"
            label="Samples"
          />
          <el-radio-button
            class="files-radio-button"
            label="Visits"
          />
        </el-radio-group>
      </div>
      <div v-loading="isLoadingFiles">
        <div
          v-if="showNoFileResultsState"
          class="no-results-container"
        >
          <h3>No results found</h3>
        </div>
        <div
          v-if="showFileResultsState"
          class="results-container"
        >
          <div class="results-table">
            <div class="file-pagination">
              <div>
                <pagination-page-menu
                  class="mr-24"
                  pagination-item-label="Results"
                  :page-size="filesTableLimit"
                  @update-page-size="updateFilesTableLimit"
                />
              </div>
              <el-pagination
                :page-size="filesTableLimit"
                :pager-count="5"
                :current-page="curFileSearchPage"
                layout="prev, pager, next"
                :total="tableResultsTotalCount"
                @current-change="onFilesTablePageChange"
              />
            </div>
            <files-table
              :data="fileResults"
              :multiple-selected="multipleSelected"
              :is-search-results="true"
              :non-sortable-columns="['content.name', 'subtype', 'storage', 'content.createdAt', 'datasetName']"
              @selection-change="setSelectedFiles"
            />
          </div>
        </div>
      </div>
    </span>
  </div>
</template>

<script>
import IhSubheader from '@/components/shared/IhSubheader.vue'
import BfButton from '@/components/shared/BfButton.vue'
import BfNavigationSecondary from '@/components/bf-navigation/BfNavigationSecondary.vue'
import GraphBrowser from '@/components/GraphBrowser/GraphBrowser.vue'
import FilesTable from '@/components/FilesTable/FilesTable.vue'
import PaginationPageMenu from '@/components/shared/PaginationPageMenu/PaginationPageMenu.vue'
import GetFileProperty from '@/mixins/get-file-property'
import Request from '@/mixins/request/index'
import FormatDate from '@/mixins/format-date'
import { mapActions, mapGetters, mapState } from 'vuex'
import { pathOr, clone, mergeRight } from 'ramda'
import { v1 } from 'uuid'
import { fetchVisitsFilesRelatedToStudy, fetchSamplesFilesRelatedToStudy } from '@/utils/fetchRecords'

export default {
  name: 'StudiesBrowser',
  components: {
    IhSubheader,
    GraphBrowser,
    BfButton,
    BfNavigationSecondary,
    FilesTable,
    PaginationPageMenu
  },
  mixins: [GetFileProperty, Request, FormatDate],
  mounted() {
    this.setSearchPage('StudiesBrowser')
    this.clearAllSelections()
  },
  data() {
    return {
      SearchStep: 0,
      selectedButton: 'Visits',
      fileResults: [],
      selectedFiles: [],
      tableResultsTotalCount: 0,
      isLoadingFiles: false,
      filesTableLimit: 5,
      filesTableOffset: 0,
      clickedRecordsFilters: []
    }
  },
  watch: {
    filesFilters: {
      handler: async function() {
        await this.fetchFiles()
      },
      immediate: true
    },
  },
  computed: {
    ...mapState(['searchModalSearch']),
    ...mapGetters(['userToken', 'allStudies', 'selectedStudy', 'selectedStudyName']),
   /**
     * Indicates that no search results were found
     * @returns {Boolean}
     */
    noFileResultsFound: function() {
      return this.fileResults.length === 0
    },

    /**
     * Compute if the no results found state should be shown
     * @returns {Boolean}
     */
    showNoFileResultsState: function() {
      return this.noFileResultsFound
        && this.isLoadingFiles === false
    },

    /**
     * Compute if the results state should be shown
     * @returns {Boolean}
     */
    showFileResultsState: function() {
      return this.noFileResultsFound === false
        && this.isLoadingFiles === false
    },
    multipleSelected: function () {
      return this.selectedFiles.length > 1
    },
    curFileSearchPage: function() {
      return this.filesTableOffset / this.filesTableLimit + 1
    },
    // This combines the filters from the search modal and the clicked records from DataGridGraph
    filesFilters: function() {
      return this.clickedRecordsFilters === undefined ? this.searchModalSearch.filters : this.searchModalSearch.filters.concat(this.clickedRecordsFilters)
    }
  },
  methods: {
    ...mapActions(['updateSearchModalVisible', 'updateSearchModalSearch', 'setSearchPage','clearClickedSelections','setTriggerForClearing']),
    clearAllSelections: function() {
      this.setTriggerForClearing(true)
      this.clearClickedSelections()
      this.clearFilters()
      this.SearchStep = 0;
    },
    incrementStep: function(){
      this.SearchStep++;
    },
    filterSearch(model) {
      this.SearchStep++;
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
    },
    clearFilters() {
      const newSearch = mergeRight(this.searchModalSearch, { filters: [] })
      this.updateSearchModalSearch(newSearch)
    },
    /**
     * @param {Array} clickedFilters The filters added from clicking the record in DataGridGraph get passed in here 
     */
    updateClickedRecordsFilters(clickedFilters) {
      this.clickedRecordsFilters = clickedFilters
    },
    async fetchFiles() {
      this.isLoadingFiles = true
      let response = []
      if (this.selectedButton === 'visits') {
        response = await fetchVisitsFilesRelatedToStudy(this.selectedStudy, this.filesFilters, this.userToken, this.filesTableLimit, this.filesTableOffset)
          .catch(response => {
            this.handleXhrError(response)
          })
          .finally(() => {
            this.isLoadingFiles = false
          })
      } else {
        response = await fetchSamplesFilesRelatedToStudy(this.selectedStudy, this.filesFilters, this.userToken, this.filesTableLimit, this.filesTableOffset)
          .catch(response => {
            this.handleXhrError(response)
          })
          .finally(() => {
            this.isLoadingFiles = false
          })
      }
      if (response === undefined) {
        return
      }
      this.tableResultsTotalCount = response.totalCount
      this.fileResults = response.packages.map(file => {
        if (!file.storage) {
          file.storage = 0
        }
        file.icon =
          file.icon || this.getFilePropertyVal(file.properties, 'icon')
        file.subtype = this.getSubType(file)
        return file
      })
    },
    getSubType: function(file) {
      const subtype = this.getFilePropertyVal(file.properties, 'subtype')
      let defaultType = ''
      const packageType = pathOr('', ['content', 'packageType'], file)
      switch (packageType) {
        case 'Collection':
          defaultType = 'Folder'
          break
        case 'ExternalFile':
          defaultType = 'External File'
          break
        default:
          break
      }
      return subtype ? subtype : defaultType
    },
    setSelectedFiles: function(selection) {
      this.selectedFiles = selection
    },
    updateFilesTableLimit: async function(limit) {
      this.filesTableLimit = limit
      await this.fetchFiles()
    },
    onFilesTablePageChange: async function(page) {
      this.filesTableOffset = (page - 1) * this.filesTableLimit
      await this.fetchFiles()
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
.property-text {
  color: $app-primary-color;
  font-size: 1rem;
  font-weight: 500;
}
.results-toggle {
  display: inline-flex;
  align-items: flex-end;
  flex-direction: row;
  margin-bottom: 21px;
}
</style>
