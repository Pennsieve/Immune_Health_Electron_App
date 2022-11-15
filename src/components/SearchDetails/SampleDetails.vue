<template>
  <div class="sample-details">
    <el-table
        :data="recordArr"
        style="width: 100%"
        max-height="600">
      <el-table-column
          prop="props.text_value"
          label="Label">
      </el-table-column>
      <el-table-column
          fixed
          prop="props.study_sample_id"
          label="Sample Id">
      </el-table-column>
      <el-table-column
          prop="props.study_participant_event_id"
          label="Event Id">
      </el-table-column>
      <el-table-column
          prop="props.sample_type_id"
          label="Type">
      </el-table-column>
      <el-table-column
          prop="props.specimen_type"
          label="Specimen">
      </el-table-column>
      <el-table-column
          prop="props.storage_status"
          label="Status">
      </el-table-column>
    </el-table>

<!--      <table>-->
<!--        <tr class="sample_row" v-for="[key, value] of Object.entries(recordArr)" :key="key">-->
<!--          <td class="sample_col" v-for="[key1, value1] of Object.entries(value.props)" :key="key1"> {{value1}}-->
<!--          </td>-->
<!--        </tr>-->

<!--      </table>-->

    </div>
</template>

<script>



import {mapGetters} from "vuex";

export default {
  name: 'SampleDetails',
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
        return Object.values(this.records)
      }
     return null
    },

    // records: function() {
    //  return this.getSelectedRecordsByModel('samples')
    // }

  },
  mounted: function() {
    // Subscribe to changes to the records of the model.
    this.unsubscribe = this.$store.subscribe((mutation) => {
      let needsUpdate = mutation.type == 'graphBrowseModule/SET_SELECTED_RECORDS_FOR_MODEL'

      if (needsUpdate) {
        this.records = this.getSelectedRecordsByModel('samples')
      }

    })

  },
  beforeDestroy: function() {
    this.unsubscribe()
  },

  watch: {

  },
  methods: {

  }
}
</script>

<style lang="scss" scoped>
@import '../../assets/css/_variables.scss';

.sample-details {
  display: flex;
  margin: 16px 0;
  //min-height: 400px;
}

.sample_row {

}

.sample_col {
  padding: 0 16px;
}

.row-name {
  color: $gray_5;
  font-weight: 500;
  padding: 0 32px 0 16px;
}

</style>
