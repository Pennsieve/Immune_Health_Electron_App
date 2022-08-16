<template>

  <div class="bf-mini-page">

    <!--<bf-stage slot="stage"> -->
    <div>
      <div class="activity-list-controls mb-16">
        <div class="activity-list-controls-menus">
        <!--will just give option to filter by contributor and actvity date, others will be set to default all categories and all activity-->

          <filter-menu
            class="mr-24"
            :options="datasetDateRangeOptions"
            :selected-option="datasetActivityParams.dateRange"
            @select="updateDatasetActivityDateRange"
          />

          <filter-menu
            class="mr-24"
            :options="datasetCategoryOptions"
            :selected-option="datasetActivityParams.category"
            @select="updateDatasetActivityCategory"
          />

          <filter-menu
            class="mr-24"
            :options="datasetContributorOptions"
            :selected-option="datasetActivityParams.userId"
            @select="updateDatasetActivityUserId"
          />
        </div>
      </div>

      <div
        v-loading="isLoadingDatasetActivity"
        class="dataset-activity-wrap"
      >
        <template v-if="hasDatasetActivity">
          <dataset-activity-panel
            v-for="(evt, idx) in datasetActivity"
            :key="evt.timeRange.start+evt.timeRange.end"
            :event="evt"
            :previous-event="datasetActivity[idx-1]"
          />

          <div
            v-if="datasetActivityParams.cursor"
            class="btn-load-more-wrap"
          >
            <bf-button
              :processing="isLoadingDatasetActivity"
              processing-text="Loading More"
              @click="fetchDatasetActivity"
            >
              Load more
            </bf-button>
          </div>
        </template>

        <bf-empty-page-state
          v-if="!hasDatasetActivity && !isLoadingDatasetActivity"
          class="no-results-found-wrapper"
        >
          <h2>No recent organization activity</h2>
          <p>
            There have been no changes in the last 12 months
          </p>
        </bf-empty-page-state>
      </div>
    <!--</bf-stage>-->
    </div>
  </div>
</template>

<script>
import { mapActions, mapState, mapGetters } from 'vuex'
import BfEmptyPageState from '../shared/bf-empty-page-state/BfEmptyPageState.vue'
//import BfRafter from '../shared/bf-rafter/BfRafter.vue'
//import BfStage from '@/components/layout/BfStage/BfStage.vue'
import BfButton from '@/components/shared/BfButton.vue'
import FilterMenu from '../shared/FilterMenu/FilterMenu.vue'
import DatasetActivityPanel from '@/components/shared/DatasetActivityPanel/DatasetActivityPanel.vue'
import Request from '@/mixins/request'
import Sorter from '@/mixins/sorter'
import { DATASET_ACTIVITY_ALL_CATEGORIES, DATASET_ACTIVITY_ALL_CONTRIBUTORS, DATASET_ACTIVITY_DATE_RANGE_30 } from '@/utils/constants'

export default {
  name: 'OrgActivity',

  components: {
    BfButton,
    BfEmptyPageState,
    //BfRafter,
    //BfStage,
    FilterMenu,
    DatasetActivityPanel
  },

  mixins: [
    Request,
    Sorter
  ],

  data() {
    return {
      datasetCategoryOptions: [
      /*  {
          value: 'DATASET',
          label: 'Dataset Metadata',
        },
        {
          value: 'PACKAGES',
          label: 'Files',
        },
        {
          value: 'PERMISSIONS',
          label: 'Permissions',
        },
        {
          value: 'PUBLISHING',
          label: 'Publishing',
        },
        {
          value: 'MODELS_AND_RECORDS',
          label: 'Records/Models',
        }, */
        DATASET_ACTIVITY_ALL_CATEGORIES
      ],
      datasetDateRangeOptions: [
        DATASET_ACTIVITY_DATE_RANGE_30,
        {
          value: 90,
          label: 'Last 90 Days',
        },
        {
          value: null,
          label: 'All Activity',
        }
      ],
      datasetUsers: []
    }
  },

  computed: {
    ...mapState([
      'orgMembers',
      'dataset',
      'config',
      'userToken',
      'datasetActivityParams',
      'datasetActivity',
      'isLoadingDatasetActivity'
    ]),

    ...mapGetters([
      'getOrgMembersById',
      'datasetId',
      'userToken',
      'datasetActivityParams'
    ]),

    /**
     * Compute if there is dataset activity
     * @returns {Boolean}
     */
    hasDatasetActivity: function() {
      return this.datasetActivity.length > 0
    },

    /**
     * Compute dataset icon sort direction
     * @returns {String}
     */
    sortIconDirection: function () {
      return this.datasetActivityParams.orderDirection === 'Asc' ? 'up' : 'down'
    },

    /**
     * Compute get dataset users URL
     * @returns {String}
     */
    getDatasetUsersUrl: function() {
      const datasetId = this.datasetId
      const apiKey = this.userToken
      return  `https//:api.pennsieve.io/datasets/${datasetId}/collaborators/users?api_key=${apiKey}`
    },

    /**
     * Compute dataset contributors
     * Get list of users from orgMembers, this will include
     * the intId for the users, which is needed for the
     * timeline endpoint
     * @returns {Array}
     */
    datasetContributorOptions: function() {
      const userIds = this.datasetUsers.map((member) => {
        return member.id
      })

      const users = this.returnSort('lastName', this.getOrgMembersById(userIds), 'asc')
      const contributors = users.map((member) => {
        return {
          value: member.intId,
          label: `${member.firstName} ${member.lastName}`
        }
      })

      return [
        ...contributors,
        DATASET_ACTIVITY_ALL_CONTRIBUTORS
      ]
    }
  },

  watch: {
    getDatasetUsersUrl: {
      handler: function() {
        this.getDatasetUsers()
      },
      immediate: true
    }
  },

  mounted () {
    this.clearDatasetActivityState()
    this.fetchDatasetActivity()
     /*
     used in BfPage
     function() {
      EventBus.$on('stage-scroll', this.onScroll.bind(this))
    } */

  /*
  used in BFpage
  beforeDestroy: function() {
    EventBus.$off('stage-scroll', this.onScroll.bind(this))
  },
  */
  /* used in BFStage
  mounted: function() {
  this.$el.addEventListener('scroll', this.onScroll)
  },

  beforeDestroy: function() {
    this.$el.removeEventListener('scroll', this.onScroll)
  },
  */
  },

  methods: {
    //can likely omit datset module
    ...mapActions([
      'updateDatasetActivityCategory',
      'updateDatasetActivityUserId',
      'updateDatasetActivityDateRange',
      'updateDatasetActivityOrderDirection',
      'fetchDatasetActivity',
      'clearDatasetActivityState']),

    /**
     * Set sort direction
     */
    setSortDir: function () {
      const orderDirection = this.datasetActivityParams.orderDirection === 'Asc'
        ? 'Desc'
        : 'Asc'

      this.updateDatasetActivityOrderDirection(orderDirection)
    },


    /**
     * Get users with permissions to this dataset
     */

    getDatasetUsers: function() {
      this.sendXhr(this.getDatasetUsersUrl)
        .then(datasetUsers => {
          this.datasetUsers = datasetUsers
        })
        .catch(() => {
          this.datasetUsers = []
        })
    }
  }
}
</script>

<style lang="scss" scoped>
.bf-mini-page {
  display: flex;
  flex-direction: column;
}
.activity-list-controls {
  align-items: center;
  display: flex;
  justify-content: space-between;
}
.activity-list-controls-menus {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  .el-dropdown {
    flex-shrink: 0
  }
}
.dataset-activity {
  background: #fff;
}
::v-deep .bf-stage-content {
  display: flex;
  flex-direction: column;
}
.dataset-activity-wrap {
  flex: 1;
}
.btn-load-more-wrap {
  display: flex;
  justify-content: center;;
  margin-top: 32px;
}
.dataset-activity-panel {
  margin-bottom: 16px;
  &:not(:first-child).date-grouped {
    margin-top: 56px;
  }
}
</style>
