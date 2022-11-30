<template>
  <div class="selected-info">

    <h3>Details</h3>
    <div class="top-panel">
      <div class="sel-model">
        <p class="selected-model-name">{{selectedModel}}</p>
        <record-details class="selected-record"
                        v-if="selectedRecord"
                        :record="selectedRecord"
        />

        <p class="selected-model-name">patient</p>
        <patient-details class="patient-details"></patient-details>
      </div>
      <div>
        <p class="selected-model-name">Visits</p>
        <visits-details class="visit-details" ></visits-details>
      </div>
    </div>

    <div class="related-records" v-if="selectedRecord">
      <div v-for="m of otherShowModels" :key="m">
        <p class="selected-model-name">{{m}}</p>
        <sample-details v-if="m=='samples'"></sample-details>

      </div>

    </div>
  </div>

</template>

<script>


import { mapGetters, mapState} from "vuex";
import recordDetails from "@/components/SearchDetails/RecordDetails";
import sampleDetails from "@/components/SearchDetails/SampleDetails";
import VisitsDetails from "@/components/SearchDetails/VisitsDetails";
import PatientDetails from "@/components/SearchDetails/PatientDetails";

export default {
  name: 'SelectedInfo',
  components: {
    PatientDetails,
    VisitsDetails,
    recordDetails,
    sampleDetails
  },
  mixins: [],
  props: {


  },
  data() {
    return {

    }
  },
  computed: {
    ...mapState('graphBrowseModule',['selectedRecord', 'selectedModel', 'showModels']),
    ...mapGetters('graphBrowseModule',['getSelectedRecordsByModel','detailsForModel']),

    otherShowModels: function(){

      let index = this.showModels.indexOf(this.selectedModel);
      let otherModels = [...this.showModels];
      if (index > -1) { // only splice array when item is found
        otherModels.splice(index, 1); // 2nd parameter means remove one item only
      }

      index = otherModels.indexOf('visits');
      otherModels.splice(index, 1); // 2nd parameter means remove one item only

      index = otherModels.indexOf('patient');
      otherModels.splice(index, 1); // 2nd parameter means remove one item only

      return otherModels
    }

  },
  watch: {

  },
  methods: {

    modelHasSelectedRecords: function(model) {
      const records = this.getSelectedRecordsByModel(model)
      console.log(records)
      if (records != undefined) {
        return !!Object.keys(records).length;
      }

      return false




    }
  }
}
</script>

<style lang="scss" scoped>
@import '../../assets/css/_variables.scss';

.selected-info {
  display: flex;
  flex-direction: column;
  margin-top: 16px;
  margin-right: 16px;
}

.selected-record {
  margin-bottom: 32px;
  min-height: 100px;
}

.visit-details {
  max-height: 750px;
  min-width: 600px;

  overflow: scroll;
}

.top-panel {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  min-height: 200px;
}

.selected-model-name {
  color: $gray_4

  //border-bottom: 1px solid $gray_3
}

.sel-model {
  width: 100%;
  margin-right: 8px;
}

.patient-details {
  max-height: 600px;
  overflow: scroll;
  margin-bottom: 32px;
}

</style>
