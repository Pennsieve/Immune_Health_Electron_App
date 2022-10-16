<template>
  

</template>

<script>
import {
  fetchFilteredPatientsMetadataRelatedToStudy,
  fetchFilteredVisitsMetadataRelatedToStudy,
  fetchFilteredSamplesMetadataRelatedToStudy,
  //fetchFilteredExperimentsMetadataRelatedToStudy
} from '@/utils/fetchRecords'
import axios from 'axios'
import * as d3 from 'd3'
import { select } from 'd3-selection';
import { v1 } from 'uuid'
import { pathOr, propOr } from 'ramda'
import debounce from 'lodash/debounce'
import { mapState, mapActions, mapGetters } from 'vuex'
import Request from '@/mixins/request'
import RecordTooltip from "@/components/DataModelGraph/RecordTooltip/RecordTooltip";
let zoom
// Vue Component
export default {
  name: 'DataGridGraphChild',
  components: {
    RecordTooltip
  },
  mixins: [
    Request,
  ],
  props: {
    showTitle: {
      type: Boolean,
      default: true
    },
    height: {
      type: Number,
      default: 500
    },
    hasLinks: {
      type: Boolean,
      default: true
    },
    showRelationshipTypes: {
      type: Boolean,
      default: false
    },
    relationshipLinkedProps: {
      type: Array,
      default: () => []
    },
    strength: {
      type: Number
    },
    schemaProp: {
      type: Array
    },
    showOverlay: {
      type: Boolean,
      default: true
    },
    showToolbar: {
      type: Boolean,
      default: false
    }
    /*NOTE: add props for the filteredx... that will be returned by the search in the parent component*/
  },

  data() {
    return {
      data: [],
      active: false,
      activeNode: '',
      hoveredModel: {},
      graphInit: true,
      modelData: {},
      recordData: {},   // mapped to nodes
      recordPool: {},   // pool of records ready to be mapped
      recordStack: [],
      canvasSize: {
        width: 1000,
        height: 400
      },
      custom: null,
      numberOfRows: 1,
      binRegistrySize: 5000,
      binRegistry: [],
      drawTimer:null,
      nrElemPerCol: 10,
      recordSize: 20,
      cellOffset: 4,
      xOffset: 50,
      yOffset: 100,
      groupSpacing: 8,
      modelHeaderHeight: 35,
      nextCol: 1,  // used to generate unique colors for hidden canvas
      colorToNode: {},
      startIndex: 0,  //used to map colors to nodes
      selectedNode: null,
      datasetId: 'N:dataset:e2de8e35-7780-40ec-86ef-058adf164bbc',
      interestedModels: ['patient', 'visits'], //'experiments'
      visibleRecordCount: {
        'patient': 0,
        'visits': 0,
        'samples': 0,
        'files': 0,
      //  'experiments': 0
      },
      visiblePatientRecords: [],
      visibleVisitsRecords: [],
      visibleSamplesRecords: [],
      participantsPage: 0,
      visitsPage: 0,
      samplesPage: 0,
      filesPage: 0,
      //experimentsPage: 0,
      selectedStudyTrigger: false,
      // These are the local filters that get applied when a user clicks on a record in the grid. These filters are used in conjunction with
      // searchModalSearch.filters to create the grid of filtered record results along with their associated files
      clickedRecordsFilters: [],
      clickedAPatient: false,
      clickedAVisit: false,
      clickedAnExperiment: false
    }
  },
}
</script>
