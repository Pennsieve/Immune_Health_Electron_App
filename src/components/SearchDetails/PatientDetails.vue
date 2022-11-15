<template>
  <div class="patient-details" >
<!--    <div v-if="Object.keys(record).length">-->

      <!--      <h2>{{ detailsForModel(record.model).displayName }}</h2>-->

    <div class="patient-container">
      <div class="patient-item" v-for="value of recordArr" :key="value.id">
        <div class="patient-value">
          {{ value.props.name}}
        </div>

      </div>
    </div>





<!--    </div>-->

  </div>
</template>

<script>


import {mapGetters} from "vuex";

export default {
  name: 'PatientDetails',
  components: {
  },
  mixins: [],
  props: {
  },
  mounted: function() {
    // Subscribe to changes to the records of the model.
    this.unsubscribe = this.$store.subscribe((mutation) => {
      let needsUpdate = mutation.type == 'graphBrowseModule/SET_SELECTED_RECORDS_FOR_MODEL'

      if (needsUpdate) {
        this.records = this.getSelectedRecordsByModel('patient')
      }

    })

  },
  beforeDestroy: function() {
    this.unsubscribe()
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
        let patients =  Object.values(this.records)
        return patients
      }
      return null
    },
  },
  watch: {

  },
  methods: {

  }
}
</script>

<style lang="scss" scoped>
@import '../../assets/css/_variables.scss';

.patient-details {

}

.patient-item {
  width: 64px;
  height: 64px;
  border-radius: 64px;
  border: 1px solid $gray_3;
  margin:4px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.patient-container {
  display: flex;
  flex-direction: row;
  overflow-wrap: normal;
  flex-wrap: wrap;
}
td.key {
  color: $purple_1;
  padding: 0 32px 0 16px;
}
.patient-value {
  font-size: smaller;
  overflow: hidden;
  margin: 8px;
}

</style>
