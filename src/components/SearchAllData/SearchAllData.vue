<template>
  <el-dialog
    :visible="visible"
    custom-class="nav-modal"
    :show-close="false"
    @close="closeDialog"
  >
    <bf-dialog-header
      slot="title"
      :title="title"
    />

    <dialog-body>
      <p>Create unique queries to search across the study.</p>
      <search-all-data-filters
        ref="filters"
        v-model="searchModalSearch.filters"
        class="mb-16"
        :models="modelsList"
        @delete-filter="deleteFilter"
      />

      <div class="mb-24">
        <button
          class="linked"
          @click="addFilter"
        >
          <svg-icon
            name="icon-plus"
            height="24"
            width="24"
          />
          Add Filter
        </button>
      </div>

      <div class="filter-actions mb-48">
        <bf-button
          v-if="searchPage === 'FileUpload'"
          class="btn-search"
          @click="executeSearch"
        >
          Search
        </bf-button>
        <bf-button
          v-else
          class="btn-search"
          @click="closeDialog"
        >
          Apply Filters
        </bf-button>
        <bf-button
          class="secondary"
          @click="clearAll"
        >
          Clear All Filters
        </bf-button>
      </div>

      <template v-if="searchPage === 'FileUpload' && showSearchResults">
        <h2>Search Results</h2>
        <search-results
          ref="searchResults"
          class="mb-48"
          :search-criteria="searchModalSearch"
          :show-search-results="showSearchResults"
          :show-download-results=false
          :show-dataset-column=false
          :show-menu-column=false
          :table-search-params="tableSearchParams"
          @reset-search-params="resetSearchParams"
        />
      </template>
    </dialog-body>
  </el-dialog>
</template>

<script>
import {
  mapActions,
  mapState,
  mapGetters
} from 'vuex'
import {
  clone,
  compose,
  includes,
  props,
  propEq,
  mergeRight
} from 'ramda'
import BfDialogHeader from '@/components/shared/bf-dialog-header/BfDialogHeader.vue'
import DialogBody from '@/components/shared/dialog-body/DialogBody.vue'
import BfButton from '@/components/shared/BfButton.vue'
import SearchAllDataFilters from './SearchAllDataFilters/SearchAllDataFilters.vue'
import SearchResults from './SearchResults/SearchResults.vue'
import { v1 } from 'uuid'
const MODELS_LIST = [
  {
    label: 'patient',
    value: 'patient'
  },
  {
    label: 'visits',
    value: 'visits'
  },
  {
    label: 'samples',
    value: 'samples'
  }
]
export default {
  name: 'SearchAllData',
  components: {
    BfButton,
    BfDialogHeader,
    DialogBody,
    SearchAllDataFilters,
    SearchResults
  },
  props: {
    visible: {
      type: Boolean,
      default: false
    },
  },
  data: function() {
    return {
      showSearchResults: false,
      allModels: [],
      modelsList: MODELS_LIST
    }
  },
  computed: {
    ...mapState([
      'searchModalSearch',
      'searchPage'
    ]),
    ...mapGetters(['userToken', 'selectedStudyName']),
    title: function() {
      return `Search study: ${this.selectedStudyName}`
    },
    tableSearchParams: function() {
      return {
        limit: this.searchModalSearch.limit,
        offset: this.searchModalSearch.offset
      }
    }
  },
  methods: {
    ...mapActions(['updateSearchModalVisible', 'updateSearchModalSearch', 'applyFiltersToMetadata']),
    /**
     * Resets table search params for pagination
     */
    resetSearchParams: function() {
      const newSearch = mergeRight(this.searchModalSearch, { limit: 25, offset: 0 })
      this.updateSearchModalSearch(newSearch)
      this.$nextTick(async () => {
        await this.$refs.searchResults.fetchRecords()
      })
    },
    /**
     * Execute search based on search criteria
     */
    executeSearch: async function() {
      const isSearchInvalid = this.validateSearch()
      if (isSearchInvalid) { return }
      if (this.searchPage === 'FileUpload') {
        this.showSearchResults = true
        this.resetSearchParams()
      }
    },
    /**
     * Validate search and ensure that all
     * filters are complete
     * @returns {Boolean}
     */
    validateSearch: function() {
      this.searchModalSearch.filters = this.validateFilters()
      return this.searchModalSearch.isModelInvalid
    },
    /**
     * Validate filters for search
     * @returns {Boolean}
     */
    validateFilters: function() {
      // Validate filters
      return this.searchModalSearch.filters.map(filter => {
        const requiredFields = this.getRequiredFilters(this.searchModalSearch, filter)
        const isFilterInvalid = compose(
          includes(''),
          props(requiredFields)
        )(filter)
        return {
          ...filter,
          isInvalid: isFilterInvalid
        }
      })
    },
    /**
   * Get required filters
   * @param {Object} search
   * @param {Object} filter
   * @returns {Array}
   */
  getRequiredFilters (search, filter) {
    const emptyTarget = propEq('target', '', filter)
    if (search.filters.length === 1 && emptyTarget) {
      return []
    }
    return filter.type === 'model'
      ? ['target', 'property', 'operation', 'value']
      : ['target']
  },
    /**
     * Closes the Search Across All Datasets dialog
     */
    closeDialog: function() {
      this.updateSearchModalVisible(false)
    },
    /**
     * Add filter
     */
    addFilter: function() {
      const newFilter = {
        id: v1(),
        type: 'model',
        target: this.searchModalSearch.model || 'patient',
        targetLabel: this.searchModalSearch.model || 'patient',
        property: '',
        propertyLabel: '',
        propertyType: '',
        operation: '',
        operationLabel: '',
        operators: [],
        value: '',
        isInvalid: false,
        lockTarget: false
      }
      this.searchModalSearch.filters.push(newFilter)
      this.updateSearchModalSearch(clone(this.searchModalSearch))
      this.$nextTick(() => {
        this.$refs.filters.focusFilter(this.searchModalSearch.filters.length - 1)
      })
    },
    /**
     * Delete filter
     * @params {Number} idx
     */
    deleteFilter: function(idx) {
      this.searchModalSearch.filters.splice(idx, 1)
      this.updateSearchModalSearch(clone(this.searchModalSearch))
      if (this.searchModalSearch.filters.length === 0) {
        this.addFilter()
      }
      this.executeSearch()
    },
    /**
     * Clear all inputs
     */
    clearAll: function() {
      const newFilters = [{
        id: v1(),
        type: 'model',
        target: this.searchModalSearch.model || 'patient',
        targetLabel: this.searchModalSearch.model || 'patient',
        property: '',
        propertyLabel: '',
        propertyType: '',
        operation: '',
        operationLabel: '',
        operators: [],
        value: '',
        isInvalid: false,
        lockTarget: false
      }]
      const newSearch = mergeRight(this.searchModalSearch, { filters: newFilters })
      this.updateSearchModalSearch(newSearch)
      // we can just hide the table since the result arrays are reset when making
      // a new call to get results
      this.showSearchResults = false
      this.executeSearch()
    },
  }
}
</script>

<style lang="scss" scoped>
@import '@/assets/css/_variables.scss';
h2 {
  font-size: 18px;
  font-weight: 400;
  line-height: 1;
}
/deep/ .el-dialog {
  height: calc(100vh - 32px);
  border-radius: 3px;
  margin-bottom: 0;
  margin-top: 16px !important;
  .el-dialog__header {
    border-bottom: none;
    padding-bottom: 0px;
  }
  .el-dialog__body {
    padding-top: 7px;
  }
  .el-dialog__title {
    font-size: 16px;
    font-weight: bold;
  }
  .el-dialog__headerbtn .el-dialog__close {
    color: $gray_6;
    height: 10px;
    width: 10px;
  }
}
.search-all-data-buttons {
   display: flex;
  .bf-button:first-child {
    margin-right: 16px;
  }
}
p {
  font-size: 13px;
  font-weight: normal;
  line-height: 16px;
  letter-spacing: 0px;
  color: $gray_4;
}
/deep/ h3 {
  font-size: 14px;
  font-weight: bold;
  color: $gray_6;
}
.filter-actions {
  display: flex;
}
.btn-search {
  margin-right: 16px;
}
.search-all-data-filters {
  max-width: 811px
}
</style>

<style lang="scss">
.nav-modal {
  width: auto !important;
  min-width: fit-content;
  margin: 0 10rem !important;
  overflow-y: auto;
}
</style>
