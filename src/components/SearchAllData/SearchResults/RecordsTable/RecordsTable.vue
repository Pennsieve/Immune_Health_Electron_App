<template>
  <div class="records-table">
    <el-table
      ref="table"
      :border="true"
      :data="data"
      @select="handleTableSelectionChange"
      @select-all="selectAll"
      @sort-change="onSortChange"
    >
      <el-table-column
        type="selection"
        align="center"
        fixed
        width="50"
      />
      <el-table-column
        v-for="heading in headings"
        :key="heading.name"
        :prop="heading.name"
        :label="heading.displayName"
        :sortable="isSortable ? 'custom' : false"
      >
        <template slot="header">
          <el-tooltip
            v-if="isSortable"
            :content="heading.displayName"
            placement="to"
          >
            <button :class="{ 'sort-active': tableSearchParams.orderBy === heading.name }">
              {{ heading.displayName }}
              <svg-icon
                name="icon-sort-asc"
                class="sort-icon"
                :dir="tableSearchParams.ascending && tableSearchParams.orderBy === heading.name ? 'up' : 'down'"
              />
            </button>
          </el-tooltip>

          <template v-else>
            {{ heading.displayName }}
          </template>
        </template>
        <template slot-scope="scope">
          <div
            :class="{ 'model-title': heading.modelTitle }"
            v-html="$sanitize(scope.row[heading.name], ['a'])"
          />
        </template>
      </el-table-column>

      <el-table-column
        v-if="showMenuColumn"
        label=""
        fixed="right"
        align="right"
        width="54"
        :sortable="isSortable ? 'custom' : false"
        :resizable="false"
      >
        <template slot-scope="scope">
          <div
            class="record-actions-wrap"
          >
            <table-menu
              :file="scope.row"
              :search-all-data-menu="searchAllDataMenu"
              :search-all-data-records="searchAllDataMenu"
            />
          </div>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script>
import { propOr } from 'ramda'

import TableMenu from '@/components/TableMenu/TableMenu.vue'

import BfStorageMetrics from '@/mixins/bf-storage-metrics'
import FileIcon from '@/mixins/file-icon/index'
import FormatDate from '@/mixins/format-date'
import TableFunctions from '@/mixins/table-functions'
import Sorter from '@/mixins/sorter'

export default {
  name: 'RecordsTable',

  components: {
    TableMenu
  },

  mixins: [
    BfStorageMetrics,
    FileIcon,
    FormatDate,
    Sorter,
    TableFunctions
  ],

  props: {
    data: {
      type: Array,
      default: () => []
    },
    searchAllDataMenu: {
      type: Boolean,
      default: false
    },
    searchAllDataRecords: {
      type: Boolean,
      default: false
    },
    headings: {
      type: Array,
      default: () => []
    },
    showMenuColumn: {
      type: Boolean,
      default: true
    },
    isSortable: {
      type: Boolean,
      default: false
    },
    tableSearchParams: {
      type: Object,
      default: () => {
        return {}
      }
    },
    recordType: {
      type: String,
      default: ''
    },
    selectedRows: {
      type: Array,
      default: () => []
    }
  },

  watch: {
    selectedRows: {
      handler: async function(rows) {
        this.selectedPreExisting(rows)
      },
      immediate: true
    }
  },

  data () {
    return {
      selectedItems: this.selectedRows,
    }
  },

  computed: {
    // return the name of the property of the object that we should be using to identify a row by (the properties available differ between visits, samples, and experiments)
    rowKeyProp() {
      if (this.recordType == 'Visits') {
        return 'visit_event'
      }
      if (this.recordType == 'Samples') {
        return 'study_sample_id'
      }
      if (this.recordType == 'Experiments'){
        return 'workitemid'
      }
      return ''
    }
  },

  methods: {
    selectedPreExisting (rows) {
      if (rows.length > 0) {
        // Use nextTick to prevent trying to get the table ref before rendering is completed
        this.$nextTick(() => {
          rows.forEach(row => {
            let selectedItem = this.data.find(item => item[`${this.rowKeyProp}`] == row[`${this.rowKeyProp}`])
            // Check if the item is in the current data being shown and if it is then check it
            if (selectedItem != undefined) {
              this.$refs.table.toggleRowSelection(selectedItem, true);
            }
          })
        })
      } else {
        this.$nextTick(() => {
          this.$refs.table.clearSelection()
        })
      }
    },
    selectAll (selection) {
      if (selection.length > 0) {
        this.addRows(this.data)
      } else {
        this.deleteRows(this.data)
      }
      this.$emit('selection-changed', this.selectedItems)
    },
    // Add the check
    addRows (rows) {
      rows.forEach(row => {
        if (this.selectedItems.find(item => item[`${this.rowKeyProp}`] == row[`${this.rowKeyProp}`])) {
          return
        }
        this.selectedItems.push(row)
      });
    },
    // Deselect
    deleteRows (rows) {
      if (this.selectedItems.length == 0) {
        return
      }
      rows.forEach(row => {
        this.selectedItems = this.selectedItems.filter(item => item[`${this.rowKeyProp}`] != row[`${this.rowKeyProp}`])
      })
    },
    /**
     * Callback from sort change
     * Set new sort order and property
     * @param {Object} evt
     */
    onSortChange: function(evt) {
      const property = propOr('', 'prop', evt)

      const ascending = !(this.tableSearchParams.orderBy === property && this.tableSearchParams.ascending)

      const orderDirection = ascending ? 'asc' : 'desc'

      this.$emit('sort', {
        orderBy: property,
        ascending,
        orderDirection
      })
    },
    /**
     * Handle table selection change
     * @param {Array} selection
     */
    // eslint-disable-next-line no-unused-vars
     handleTableSelectionChange: function(selection, row) {
      // if selection doesn't contain the row then that means the row was unselected and we can remove it from selectedItems
      if (selection && selection.find(item => item && (item[`${this.rowKeyProp}`] == row[`${this.rowKeyProp}`]))) {
        this.addRows([row])
      } else {
        this.deleteRows([row])
      }
      this.$emit('selection-changed', this.selectedItems)
    },
  }
}
</script>

<style lang="scss" scoped>
@import '@/assets/css/_variables.scss';

.records-table {
  position: relative;
}
.el-table {
  width: 100%;
}
.el-table--border ::v-deep td {
  border-right: 1px solid transparent;
}

::v-deep .hover-row,
::v-deep .el-table__row:hover {
  background: #f5f6f9;
}
.btn-selection-action {
  align-items: center;
  display: flex;
  font-size: 14px;
}

::v-deep .el-table {
  border-radius: 4px;
  tr {
    transition: background-color 0.3s ease-in-out;
  }
  td {
    padding: 8px 0;
    &:hover {
      cursor: pointer;
    }
  }
  th {
    padding: 10px 0;
    font-size: 12px;
    font-weight: 600;
  }
  .cell {
    padding-left: 16px;
    padding-right: 16px;
  }
  .caret-wrapper {
    display: none;
  }
  .highlight {
    background-color: $status_yellow;
  }
}
.record-actions-wrap {
  display: flex;
  justify-content: flex-end;
}

.el-table--border .el-table__cell:first-child .cell {
  padding-left: unset;
}
</style>
