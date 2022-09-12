<template>
  <div class="search-results">
    <div
      v-if="showControls"
      class="results-toggle"
    >
      <p class="mr-16">View</p>
      <el-radio-group
        v-model="selectedButton"
        size="medium"
      >
        <el-radio-button
          label="Samples"
        />
        <el-radio-button
          label="Visits"
        />
      </el-radio-group>
    </div>
    <div v-loading="isLoadingRecords">
      <div
        v-if="showNoResultsState"
        class="no-results-container"
      >
        <h3>No results found</h3>
        <p>{{ emptyStateCopy }}</p>
      </div>
      <div
        v-if="showResultsState"
        class="results-container"
      >
        <div class="results-table">
          <div class="file-pagination">
            <div>
              <pagination-page-menu
                class="mr-24"
                pagination-item-label="Results"
                :page-size="tableSearchParams.limit"
                @update-page-size="updateTableSearchLimit"
              />
            </div>
            <el-pagination
              :page-size="tableSearchParams.limit"
              :pager-count="5"
              :current-page="curFileSearchPage"
              layout="prev, pager, next"
              :total="tableResultsTotalCount"
              @current-change="onPaginationPageChange"
            />
          </div>
          <records-table
            class="search-results-records-table"
            :data="recordResults"
            :selected-rows="selections"
            :record-type="recordType"
            :headings="recordHeadings"
            :show-menu-column="showMenuColumn"
            :search-all-data-menu="true"
            :search-all-data-records="true"
            :is-sortable="isRecordsSortable"
            :table-search-params="tableSearchParams"
            @selection-changed="onSelectionChanged"
            @linking-targets-changed="onLinkingTargetsChanged"
            @sort="$emit('sort', $event)"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
/* eslint-disable */
import { mapActions, mapGetters, mapState } from 'vuex'
import RecordsTable from './RecordsTable/RecordsTable.vue'
import PaginationPageMenu from '@/components/shared/PaginationPageMenu/PaginationPageMenu.vue'
import Request from '@/mixins/request/index'
import FormatDate from '@/mixins/format-date'
import { mergeRight } from 'ramda'
import {
  fetchFilteredVisitsMetadataRelatedToStudy,
  fetchFilteredSamplesMetadataRelatedToStudy,
  //fetchFilteredExperimentsMetadataRelatedToStudy
} from '@/utils/fetchRecords'
export default {
  name: 'SearchResults',
  components: {
    RecordsTable,
    PaginationPageMenu
  },
  mixins: [Request, FormatDate],
  props: {
    searchCriteria: {
      type: Object,
      default: () => {
        return {}
      }
    },
    showSearchResults: {
      type: Boolean,
      default: false
    },
    tableSearchParams: {
      type: Object,
      default: () => {
        return {}
      }
    },
    datasetList: {
      type: Array,
      default: () => {
        return []
      }
    },
    showControls: {
      type: Boolean,
      default: true
    },
    showDatasetColumn: {
      type: Boolean,
      default: true
    },
    showMenuColumn: {
      type: Boolean,
      default: true
    },
    showDownloadResults: {
      type: Boolean,
      default: true
    },
    emptyStateCopy: {
      type: String,
      default: 'Try a different combination of filters or search within all datasets'
    },
    isRecordsSortable: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      selections: [],
      recordResults: [],
      recordHeadings: [],
      selectedButton: 'Visits',
      tableResultsTotalCount: 0,
      datasetId: '',
      datasetName: '',
      isLoadingRecords: false,
      isLoadingFiles: false,
    }
  },
  computed: {
    ...mapState(['selectedStudy', 'searchModalSearch']),
    ...mapGetters(['userToken']),
    /**
     * Returns the current page postion for files table in pagination ticker
     * @returns {Number}
     */
    curFileSearchPage: function() {
      return this.tableSearchParams.offset / this.tableSearchParams.limit + 1
    },
    /**
     * Indicates that no search results were found
     * @returns {Boolean}
     */
    noResultsFound: function() {
      return this.recordResults.length === 0
    },
    /**
     * Compute if the no results found state should be shown
     * @returns {Boolean}
     */
    showNoResultsState: function() {
      return this.noResultsFound
        && this.isLoadingRecords === false
    },
    /**
     * Compute if the results state should be shown
     * @returns {Boolean}
     */
    showResultsState: function() {
      return this.noResultsFound === false
        && this.isLoadingRecords === false
    },
    recordType: function() {
      console.log("RECORD TYPE", this.selectedButton)
      return this.selectedButton
    }
  },
  watch: {
    /**
     * Watches for button change in order
     * to reset pagination
     */
    selectedButton: {
      handler: async function() {
        this.$emit('reset-search-params')
      },
      immediate: true
    },
    selectedStudy: {
      handler: async function() {
        this.$emit('reset-search-params')
      }
    },
  },
  methods: {
    ...mapActions(['updateSearchModalVisible', 'updateSearchModalSearch', 'setLinkingTargets']),
    /**
     * Fetches record search results
     */
    fetchRecords: async function() {
      this.isLoadingRecords = true

      const metadata = this.selectedButton === 'Visits' ?
        await fetchFilteredVisitsMetadataRelatedToStudy(this.selectedStudy, this.searchModalSearch.filters, this.userToken, this.searchModalSearch.limit, this.searchModalSearch.offset) :
        await fetchFilteredSamplesMetadataRelatedToStudy(this.selectedStudy, this.searchModalSearch.filters, this.userToken, this.searchModalSearch.limit, this.searchModalSearch.offset)
        //TO DO: replace above with await fetchFilteredExperimentsMetadataRelatedToStudy(this.selectedStudy, this.searchModalSearch.filters, this.userToken, this.searchModalSearch.limit, this.searchModalSearch.offset)

      // TODO: Figure out how to calculate total (records.length is incorrect)
      this.tableResultsTotalCount = metadata.totalCount
      this.recordHeadings = metadata.headings
      this.recordResults = metadata.records

      this.isLoadingRecords = false
    },
    /**
     * Updates file search limit based on pagination selection
     * @param {Nunber} newLimit
     */
    updateTableSearchLimit: async function(newLimit) {
      const newSearch = mergeRight(this.searchModalSearch, { limit: newLimit })
      this.updateSearchModalSearch(newSearch)
      await this.fetchRecords()
    },
    /**
     * Update pagination offset
     */
    onPaginationPageChange: async function(page) {
      const newOffset = (page - 1) * this.tableSearchParams.limit
      const newSearch = mergeRight(this.searchModalSearch, { offset: newOffset })
      this.updateSearchModalSearch(newSearch)
      await this.fetchRecords()
    },
    onLinkingTargetsChanged: function(records) {
      /*
      // Set the target when record is clicked
      var vis_arr_len = this.shadedVisits;
      var samp_arr_len - this.shadedVisits;
      //if a single selection has been made for sample or visit via user click, then they need to unselect it before proceeding
      if (vis_arr_len.length == 1 || samp_arr_len.length == 1){
        var to_be_linked = this.selectedRecord.details.id //CONFIRM THIS IS THE DATA WE ARE INTERESTED IN!
        this.setLinkingTargets(to_be_linked)
      }
      */
      this.setLinkingTargets(records)
      this.updateSearchModalVisible(false)
    },
    onSelectionChanged: function(rows) {
      this.selections = rows
    }
  }
}
</script>

<style lang="scss" scoped>
@import '@/assets/css/_variables.scss';
h3 {
  font-size: 16px;
  font-weight: normal;
  letter-spacing: 0.5px;
  color: $gray_6;
}
.no-results-container {
  p {
    font-size: 13px;
    font-weight: normal;
    letter-spacing: 0.44px;
    line-height: 32px;
    color: $gray_4;
    margin-top: -14px;
  }
}
.results-container {
  display: inline-flex;
  flex-direction: column;
  width: 100%;
  p {
    font-size: 14px;
    font-weight: normal;
    letter-spacing: 0px;
    line-height: 0px;
    color: $gray_4;
    margin-right: 11px;
    margin-top: 7px;
  }
}
.results-toggle {
  display: inline-flex;
  align-items: flex-end;
  flex-direction: row;
  margin-bottom: 21px;
}
.file-pagination {
  margin-bottom: 14px;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  ::v-deep .el-dropdown-text-link:not(:hover, :active) {
    color: $gray_6;
  }
}
.files-radio-button {
  ::v-deep .el-radio-button__inner {
    width: 85px !important;
  }
}
.el-loading-parent--relative {
  min-height: 52px // Matches the no results state
}
::v-deep .el-radio-button__inner {
  height: 32px;
  padding-top: 8px;
  font-size: 14px;
  color: $gray_4;
  font-weight: 500;
}
::v-deep .el-radio-button__orig-radio:checked + .el-radio-button__inner {
  background-color: $purple_3;
  border-color: $purple_3;
  color: white;
}
::v-deep .el-radio-button__orig-radio:disabled + .el-radio-button__inner {
  color: $disabled-radio-button-text-color;
  border-color: $disabled-radio-button-border-color;
  background-color: $disabled-radio-button-background-color;
}
.download-icon {
  margin-top: -4px;
}
</style>
