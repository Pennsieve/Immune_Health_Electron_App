<template>
  <div class="visit-details">
    <el-timeline>
      <el-timeline-item
          v-for="(visit, index) in recordArr"
          :key="index"
          type="primary"
          :color="getColorForVisit(visit)"
          size="normal"
          :timestamp="getDate(visit)">
        <el-card>
          <div>
            <div class="visit-header">
              <h4>{{visit.props.visit_event}}</h4>
              <div>{{visit.props.study}}</div>
              <div>{{visit.props.event_status}}</div>
            </div>
            <table>
              <tr>
                <td class="key">Participant:</td>
                <td>{{ visit.props.externalparticipantid }}</td>
              </tr>
              <tr>
                <td class="key">Action:</td>
                <td>{{ visit.props.event_name }}</td>
              </tr>
              <tr>
                <td class="key">Type:</td>
                <td>{{ visit.props.visit_type }}</td>
              </tr>
              <tr>
                <td class="key">Cohort:</td>
                <td>{{ visit.props.cohort_id }}</td>
              </tr>
            </table>
          </div>

        </el-card>
      </el-timeline-item>
    </el-timeline>

  </div>

  <!--  </div>-->
</template>

<script>



import {mapGetters} from "vuex";

export default {
  name: 'VisitsDetails',
  components: {
  },
  mixins: [],
  props: {

  },
  data() {
    return {
      records: []

    }
  },
  computed: {
    ...mapGetters('graphBrowseModule',['getSelectedRecordsByModel']),

    recordArr: function(){
      if (this.records ) {
        let visits =  Object.values(this.records)
        return visits
      }
      return null
    },

  },
  mounted: function() {
    // Subscribe to changes to the records of the model.
    this.unsubscribe = this.$store.subscribe((mutation) => {
      let needsUpdate = mutation.type == 'graphBrowseModule/SET_SELECTED_RECORDS_FOR_MODEL'

      if (needsUpdate) {
        this.records = this.getSelectedRecordsByModel('visits')
      }

    })

  },
  beforeDestroy: function() {
    this.unsubscribe()
  },

  watch: {

  },
  methods: {
    getDate: function(d) {
      return d.props.event_date_and_time
    },
    getColorForVisit: function(visit) {
      switch (visit.props.event_status) {
        case "Pending":
          return "#F9A23A"
        case "Completed":
          return "#14a758"
        case "Missed":
          return "#E94B4B"
        case "Cancelled":
          return "#DE38B3"
        case "At Collection":
          return "#08B3AF"
        default:
          return "#5039F7"
      }
    }

  }
}
</script>

<style lang="scss" scoped>
@import '../../assets/css/_variables.scss';

.model-details {
  display: flex;
  //min-height: 400px;
}

.sample_row {

}

.sample_col {
  padding: 0 16px;
}

.row-name {
  color: $gray_5;
  font-weight: 700;
  padding: 0 32px 0 16px;
}

.visit-header {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;

}

td.key {
  font-weight: 500;
  color: $purple_1;
}

</style>
