<template>
<!-- TODO: bring this back in for 'click outside' behavior
  <div
    v-click-outside="onClickOutsideGraph"
    class="data-model-graph"
    element-loading-background="#fff"
  >
-->
  <div
    class="data-model-graph"
    element-loading-background="#fff"
  >
    <div ref="canvas_wrapper" class="chart-wrapper">
      <canvas ref="mainCanvas" class="mainCanvas"/>
      <canvas ref="hiddenCanvas" class="hiddenCanvas"/>
    </div>
    <record-tooltip
        :model="hoveredModel"
        @mouseenter.native="shouldHideTooltip = false"
        @mouseleave.native="hideModelTooltip"
    />
  </div>
</template>

<script>
import {
  // eslint-disable-next-line
  fetchFilteredPatientsMetadataRelatedToStudy,
  // eslint-disable-next-line
  fetchFilteredVisitsMetadataRelatedToStudy,
  // eslint-disable-next-line
  fetchFilteredSamplesMetadataRelatedToStudy,
  fetchVisitsFilesRelatedToStudy,
  fetchSamplesFilesRelatedToStudy,
  GET_FILTERED_METADATA_RECORDS_ENDPOINT,
  REQUEST_HEADER,
  handleV2RecordsResponse,
  getQuery
} from '@/utils/fetchRecords'

import axios from 'axios'
import * as d3 from 'd3'
import { select } from 'd3-selection';
// eslint-disable-next-line
import { v1 } from 'uuid'
// eslint-disable-next-line
import { pathOr, propOr, clone, mergeRight} from 'ramda'
import debounce from 'lodash/debounce'
import { mapState, mapActions, mapGetters } from 'vuex'
import Request from '@/mixins/request'
import RecordTooltip from "@/components/DataModelGraph/RecordTooltip/RecordTooltip";
let zoom

// Vue Component
export default {
  name: 'DataGridGraph',

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
      activeNode: String,
      hoveredModel: {},
      graphInit: true,
      modelData: {},
      recordData: {},   // mapped to nodes
      recordPool: {},   // pool of records ready to be mapped
      recordStack: [],
      canvasSize: {
        width: 1000,
        height: 1000
      },
      custom: null,
      numberOfRows: 10,
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
      interestedModels: ['patient', 'visits', 'samples' /*'files'*/],
      selectedRecordCount: {
        'patient': 0,
        'visits': 0,
        'samples': 0,
        'files': 0
      },
      selectedPatientRecords: [],
      selectedVisitRecords: [],
      selectedSampleRecords: [],
      selectedVisitsFiles: [],
      selectedSamplesFiles: [],
      participantsPage: 0,
      visitsPage: 0,
      samplesPage: 0,
      filesPage: 0,

      //filters: this.searchModalSearch.filters
    }
  },

  computed: {
    //will get whenever updated or changed. NOTE, we are just storing the model data in the component now
    ...mapState([
      'relationshipTypes',
      'config',
      'selectedStudy'
    ]),
    /*
    onFilterAdd: function() {
      this.filterStatus = searchModalSearch.filters;
      return
    },
    */
    graphUrl: function() {
      //const apiUrl = this.config.conceptsUrl
      //const datasetId = pathOr('', ['params', 'datasetId'])(this.$route)
      //if (apiUrl && datasetId)
        return `https://api.pennsieve.io/models/v1/datasets/${this.datasetId}/concepts/schema/graph`

    },
    recordsUrl: function() {
      //const apiUrl = this.config.conceptsUrl
      //const datasetId = pathOr('', ['params', 'datasetId'])(this.$route)
      //if (apiUrl && datasetId) {
        return `https://api.pennsieve.io/models/v1/datasets/${this.datasetId}/concepts/`
    },

    //wont need
    relationsUrl: function() {
      const apiUrl = "http://api.pennsieve.net/model/v2"
      const datasetId = pathOr('', ['params', 'datasetId'])(this.$route)
      if (apiUrl && datasetId) {
        return `${apiUrl}/datasets/${datasetId}/concepts/`
      }
      else {
        return ''
      }
    },
    cellSize: function() {
      return Math.floor( this.nrElemPerCol * (this.recordSize + this.cellOffset) + 2 * this.cellOffset)
    },
    recordSpacing: function() {
      return Math.floor((this.cellSize - (2 * this.cellOffset) - this.nrElemPerCol * this.recordSize) / (this.nrElemPerCol - 1))
    },
    loadingSelectedStudy: function() {
      return this.loadingStudyRecords || this.loadingPatientRecords || this.loadingVisitsRecords || this.loadingSamplesRecords
    }


  },

  watch: {
    selectedNode: {
      handler: function() {
        if (this.selectedNode && this.selectedNode.details){
          console.log(`selectedNode: ${this.selectedNode.details.id}`)
        }
      }
    },
    selectedStudy: function() {
      console.log(`selectedStudy: ${this.selectedStudy.values[0].value}`)
      this.updateStudyDataV2().then((result) => {
        console.log('updateStudyDataV2() ~ Promise(s) completed - result:')
        console.log(result)
        this.updateView()
      })
    },
    searchModalSearch: function(){
      //whenever a filter is added or subtracted from list it will update the downstream elements
      this.handleFilterChangeSequential();

    },
    triggerForClearing: function(){
      var shadedarr = []
      shadedarr = shadedarr.push(this.shadedParticipants)
      shadedarr = shadedarr.push(this.shadedVisits)
      shadedarr = shadedarr.push(this.shadedSamples)
      for (const x of shadedarr){
        for (const y of x){
          this.onClickElement(y) //will trigger branch of code that sets click to 0
        }
      }
    }
  },

  mounted() {
    let vm = this

    // eslint-disable-next-line
    const mainCanvas = d3.select('.mainCanvas')
      .attr('width', this.canvasSize.width)
      .attr('height', this.canvasSize.height);
    // eslint-disable-next-line
    const hiddenCanvas = d3.select('.hiddenCanvas')
      .attr('width', this.canvasSize.width)
      .attr('height', this.canvasSize.height);

    const customBase = document.createElement('custom');
    this.custom = d3.select(customBase);

    vm.draw(hiddenCanvas, true)
    this.drawTimer = d3.timer(function(elapsed) {
      vm.draw(mainCanvas, false);
      if (elapsed > 300) vm.drawTimer.stop();
    }); // Timer running the draw function repeatedly for 300 ms.

    this.setupMouseOver()
    this.setupMouseClick()
    this.loadModelData()
    this.bindModelData()
    window.addEventListener('resize', this.handleResize.bind(this))
  },

  beforeDestroy() {
    // this.destroyChart()
    window.removeEventListener('resize', this.handleResize.bind(this))
  },

  methods: {
    //will not use these map actions since all data will be within component
    ...mapActions(['updateSearchModalVisible', 'updateSearchModalSearch','setAllParticipants','setAllVisits','setAllSamples','setShadedParticipants','setShadedVisits','setShadedSamples','setShadedFiles','setLinkingTarget']), //include set all files potentially
    ...mapGetters(['userToken','shadedParticipants','shadedVisits','shadedSamples','shadedFiles','searchModalSearch','triggerForClearing','linkingTarget']),

    setupMouseOver: function() {
      const vm = this
      const hiddenCanvas = d3.select('.hiddenCanvas')
      d3.select('.mainCanvas').on('mousemove', function(d) {

        vm.draw(hiddenCanvas, true); // Draw the hidden canvas.
        // Get mouse positions from the main canvas.
        const cCoord = this.getBoundingClientRect();
        const mouseY = d.clientY - cCoord.top;
        const mouseX = d.clientX - cCoord.left;

        var hiddenCtx = hiddenCanvas.node().getContext('2d');
        var col = hiddenCtx.getImageData(mouseX, mouseY, 1, 1).data;
        var colKey = 'rgb(' + col[0] + ',' + col[1] + ',' + col[2] + ')';
        var nodeData = vm.colorToNode[colKey];
        if (nodeData){
          // console.log(`mousemove() mouseX: ${mouseX} mouseY: ${mouseY} colKey: ${colKey} nodeData:`)
          // console.log(nodeData)
          // eslint-disable-next-line
          vm.onHoverElement(nodeData, d.clientX, d.clientY)

        } else {
          vm.hideModelTooltip()
        }

      });
    },

    setupMouseClick: function() {//when an element is clicked, get its data and if it is a prev/ next, call appropriate function
      const vm = this
      const hiddenCanvas = d3.select('.hiddenCanvas')

      d3.select('.mainCanvas').on('click', function(d) {
        //draw the hidden canvas, and get the properties of the thing you clicked on (set elsewhere)
        vm.draw(hiddenCanvas, true); // Draw the hidden canvas.
        // Get mouse positions from the main canvas.
        const cCoord = this.getBoundingClientRect();
        const mouseY = d.clientY - cCoord.top;
        const mouseX = d.clientX - cCoord.left;

        var hiddenCtx = hiddenCanvas.node().getContext('2d');
        var col = hiddenCtx.getImageData(mouseX, mouseY, 1, 1).data;
        var colKey = 'rgb(' + col[0] + ',' + col[1] + ',' + col[2] + ')';
        // eslint-disable-next-line
        var nodeData = vm.colorToNode[colKey];
        //if has data
        // eslint-disable-next-line

        if (nodeData) {
          console.log("mouseClick() nodeData:")
          console.log(nodeData)
          if (nodeData.parent) {
            // it is a record
            vm.mouseClickRecord(nodeData)
          } else {
            // it is a model
            vm.mouseClickModel(nodeData, mouseX, mouseY)
          }
        }
      })
    },

    mouseClickModel: function(nodeData, mouseX, mouseY) {
      console.log('mouseClickModel() nodeData:')
      console.log(nodeData)
      const vm = this
      const models = vm.custom.selectAll('custom.model');
      // const colKey = nodeData.hiddenCol
      let xCoord = ''
      let yCoord = ''
      // eslint-disable-next-line
      models.each(function(d,i) { //iterate through models, find model x and y coords
        let node = d3.select(this);
        //console.log(node.attr('modelName'))
        if (node.attr('modelName') == nodeData.displayName){
          // eslint-disable-next-line
          xCoord = node.attr('x')
          // eslint-disable-next-line
          yCoord = node.attr('y')
          //console.log(nodeData.displayName)
        }
      });
      /*
      var yStartPrev = yCoord - 35
      var  xStartPrev = xCoord +70
      var  xStopPrev = xCoord +140
      var  xStopNext = xCoord +250
      */
      console.log(`mouseClickModel() displayName: ${nodeData.displayName} (mouseX: ${mouseX}, mouseY: ${mouseY}) (xCoord: ${xCoord}, yCoord: ${yCoord})`)
      if (mouseX >= 115 && mouseX <= 215){
        // eslint-disable-next-line
        console.log(`mouseClickModel() CLICKED PREVIOUS for: ${nodeData.displayName}`);
        //if currently clicking prev model attr
        // eslint-disable-next-line
        vm.advancePage(nodeData.displayName, 'prev');
      }
      // eslint-disable-next-line
      else if (mouseX >= 215){
        // eslint-disable-next-line
        console.log(`mouseClickModel() CLICKED NEXT for: ${nodeData.displayName}`);
        // eslint-disable-next-line
        vm.advancePage(nodeData.displayName, 'next');
      }
    },

    mouseClickRecord: function(nodeData) {
      const vm = this

      let records = vm.custom.selectAll('custom.record');// Grab all elements you bound data to in the databind() function.
      let selectedRecord = null
      // eslint-disable-next-line no-unused-vars
      records.each(function(d,i) { // For each virtual/custom element...
        var node = d3.select(this);   // This is each individual element in the loop.
        // eslint-disable-next-line no-unused-vars
        node.each(function(enclosed, index) {
          if (enclosed.hiddenCol === nodeData.hiddenCol) {
            selectedRecord = node
          }
        })
      });

      if (selectedRecord) {
        vm.onClickElement(nodeData, selectedRecord,false)// , d.click, mouseX, mouseY)
      }
    },


  //When a record is clicked, we want to add that as a filter and get the related records. We dont want to update the view for the current model (apart from coloring the selected record)
    handleFilterChangeClick: async function(nodeData, clickstatus) {
      const limit = 100
      const model = nodeData.parent.displayName;
      const identifier = nodeData.details.values[0].value
      const token = this.userToken()
      //get identifier from nodedata (use inspector)
      if (clickstatus == 'click'){
        switch(model){
        case 'patient':
        var offset = limit*this.visitsPage
        var filteredRecordsUrl = `${GET_FILTERED_METADATA_RECORDS_ENDPOINT}?limit=${limit}&offset=${offset}`
        var newFilters = clone(this.searchModalSearch.filters)
        newFilters.push({
          id: v1(),
          isInvalid: false,
          lockTarget: true,
          operation: "=",
          operationLabel: "equals",
          operators: [
            {
              label: 'equals',
              value: '='
            },
            {
              label: 'does not equal',
              value: '<>'
            },
            {
              label: 'starts with',
              value: 'STARTS WITH'
            },
          ],
          property: "externalparticipantid",
          propertyLabel: "externalparticipantid",
          propertyType: {format: null, type: "String"},
          target: "patient",
          targetLabel: "patient",
          type: "model",
          value: identifier
        })
         var  visitsQuery = await getQuery('visits', newFilters, token)

        var new_vis =  await axios.post(filteredRecordsUrl, visitsQuery, REQUEST_HEADER(token)).then(response => {
           return handleV2RecordsResponse(propOr([], 'data', response))
         })
         var visit_recs = new_vis.records;
         this.selectedVisitRecords = visit_recs;
        break;
        case 'visits':
        // eslint-disable-next-line
        var offset = limit*this.samplesPage;
        // eslint-disable-next-line
        var filteredRecordsUrl = `${GET_FILTERED_METADATA_RECORDS_ENDPOINT}?limit=${limit}&offset=${offset}`
        // eslint-disable-next-line
        var newFilters = clone(this.searchModalSearch.filters)
        newFilters.push({
          id: v1(),
          isInvalid: false,
          lockTarget: true,
          operation: "=",
          operationLabel: "equals",
          operators: [
            {
              label: 'equals',
              value: '='
            },
            {
              label: 'does not equal',
              value: '<>'
            },
            {
              label: 'starts with',
              value: 'STARTS WITH'
            },
          ],
          property: "visit_event_id",
          propertyLabel: "visit_event_id",
          propertyType: {format: null, type: "String"},
          target: "visits",
          targetLabel: "visits",
          type: "model",
          value: identifier
        })
        var  visitsQuery2 = await getQuery('samples', newFilters, token)

       var new_samp =  await axios.post(filteredRecordsUrl, visitsQuery2, REQUEST_HEADER(token)).then(response => {
          return handleV2RecordsResponse(propOr([], 'data', response))
        })
        var sample_recs = new_samp.records;
        this.selectedSampleRecords = sample_recs;
        break;
        case 'samples':
        //NOTE: need to figure out how to use selection to limit or highlight the relevant files
        // eslint-disable-next-line
        var newFilters = clone(this.searchModalSearch.filters)
        newFilters.push({
          id: v1(),
          isInvalid: false,
          lockTarget: true,
          operation: "=",
          operationLabel: "equals",
          operators: [
            {
              label: 'equals',
              value: '='
            },
            {
              label: 'does not equal',
              value: '<>'
            },
            {
              label: 'starts with',
              value: 'STARTS WITH'
            },
          ],
          property: "study_sample_id", //CHECK THIS
          propertyLabel: "study_sample_id",
          propertyType: {format: null, type: "String"},
          target: "samples",
          targetLabel: "samples",
          type: "model",
          value: identifier
        })
        break;
      }
    }
    else {
    switch(model){
      case 'patient':
      // eslint-disable-next-line
      var offset = limit*this.visitsPage
      // eslint-disable-next-line
      var filteredRecordsUrl = `${GET_FILTERED_METADATA_RECORDS_ENDPOINT}?limit=${limit}&offset=${offset}`
      // eslint-disable-next-line
      var newFilters = clone(this.searchModalSearch.filters)
      var remove1 = {
        id: v1(),
        isInvalid: false,
        lockTarget: true,
        operation: "=",
        operationLabel: "equals",
        operators: [
          {
            label: 'equals',
            value: '='
          },
          {
            label: 'does not equal',
            value: '<>'
          },
          {
            label: 'starts with',
            value: 'STARTS WITH'
          },
        ],
        property: "externalparticipantid",
        propertyLabel: "externalparticipantid",
        propertyType: {format: null, type: "String"},
        target: "patient",
        targetLabel: "patient",
        type: "model",
        value: identifier
      }
      // eslint-disable-next-line
      var newFilters = newFilters.filter(function(entry) {
        return entry != remove1;
      });
      // eslint-disable-next-line
       var  visitsQuery = await getQuery('visits', newFilters, token)
       // eslint-disable-next-line
      var new_vis =  await axios.post(filteredRecordsUrl, visitsQuery, REQUEST_HEADER(token)).then(response => {
         return handleV2RecordsResponse(propOr([], 'data', response))
       })
       // eslint-disable-next-line
       var visit_recs = new_vis.records;
       this.selectedVisitRecords = visit_recs;
      break;
      case 'visits':
      // eslint-disable-next-line
      var offset = limit*this.samplesPage;
      // eslint-disable-next-line
      var filteredRecordsUrl = `${GET_FILTERED_METADATA_RECORDS_ENDPOINT}?limit=${limit}&offset=${offset}`
      // eslint-disable-next-line
      var newFilters = clone(this.searchModalSearch.filters)
      var remove2 = {
        id: v1(),
        isInvalid: false,
        lockTarget: true,
        operation: "=",
        operationLabel: "equals",
        operators: [
          {
            label: 'equals',
            value: '='
          },
          {
            label: 'does not equal',
            value: '<>'
          },
          {
            label: 'starts with',
            value: 'STARTS WITH'
          },
        ],
        property: "visit_event_id",
        propertyLabel: "visit_event_id",
        propertyType: {format: null, type: "String"},
        target: "visits",
        targetLabel: "visits",
        type: "model",
        value: identifier
      }
      // eslint-disable-next-line
      var newFilters = newFilters.filter(function(entry) {
        return entry != remove2;
      });
      // eslint-disable-next-line
      var  visitsQuery2 = await getQuery('samples', newFilters, token)
      // eslint-disable-next-line
     var new_samp =  await axios.post(filteredRecordsUrl, visitsQuery2, REQUEST_HEADER(token)).then(response => {
        return handleV2RecordsResponse(propOr([], 'data', response))
      })
      // eslint-disable-next-line
      var sample_recs = new_samp.records;
      this.selectedSampleRecords = sample_recs;
      break;
      //TO DO: for samples, we want to have the selection influence files that are returned.
      case 'samples':
      //NOTE: need to figure out how to use selection to limit or highlight the relevant files
      // eslint-disable-next-line
      var newFilters = clone(this.searchModalSearch.filters)
      break;
    }
  }
},
/*
    splitArrIntoPages(arr){
      const chunkSize = 100;
      var return_arr = [];
      for (let i = 0; i < arr.length; i += chunkSize) {
        const chunk = arr.slice(i, i + chunkSize);
        return_arr.push(chunk);
      }
      return return_arr;
    },

*/
    /*
    handleFilterChangeClick(nodeData){
      // eslint-disable-next-line
      //Need to get the model from the click (nodeData.details.type, or parent.displayName)
      // eslint-disable-next-line
      var model = nodeData.details.type //nodeData.parent.displayName
      var model_lst = ['patient','visits','samples','files']
      // eslint-disable-next-line
      model_lst = model_lst.filter(e => e !== model);
      switch(model){
        case 'patient':
        // eslint-disable-next-line
          var click_lst = this.shadedParticipants;
        break;
        case 'visits':
        // eslint-disable-next-line
          var click_lst = this.shadedVisits;
        break;
        case 'samples':
        // eslint-disable-next-line
          var click_lst = this.shadedSamples;
        break;
        case 'files':
        // eslint-disable-next-line
          var click_lst = this.shadedFiles;

      }
        // eslint-disable-next-line
        for(let record = '';record in click_lst;){
          // eslint-disable-next-line
          for(let m = '';m in model_lst;){
            // eslint-disable-next-line
            switch(m){
              case 'patient':
              // eslint-disable-next-line
                var mbacklog = this.patientsBacklog;
                var view = this.selectedPatientRecords;
                var orderBy = 'externalparticipantid';
              break;
              case 'visits':
              // eslint-disable-next-line
                var mbacklog = this.visitsBacklog;
                // eslint-disable-next-line
                var view = this.selectedVisitRecords;
                // eslint-disable-next-line
                var orderBy = 'event date and time';
              break;
              case 'samples':
              // eslint-disable-next-line
                var mbacklog = this.samplesBacklog;
                // eslint-disable-next-line
                var view = this.selectedSampleRecords;
                // eslint-disable-next-line
                var orderBy = 'study sample ID';
              break;
              case 'files':
              // eslint-disable-next-line
                var mbacklog = this.filesBacklog;
                // eslint-disable-next-line
                var view = this.selectedFileRecords;
            }
            //call to api that gets all of the things related (directly or transitivley) to current record for model type m
            //for each in response, if recordID is in current instance of mbacklog, then add to temp backlog
            // eslint-disable-next-line
            var resp_arr =[];
            //or put in resp_arr and get intersection
            var flat_arr = mbacklog.flat();
            // eslint-disable-next-line
            var filteredBacklog = array1.filter(value => flat_arr.includes(value));
            //sort this before breaking it up into
            // eslint-disable-next-line
            if (m == 'patient' || 'visits' || 'samples'){
              // eslint-disable-next-line
              filteredBacklog = filteredBacklog.sort((a, b) => b.orderBy - a.orderBy)
            }
            // eslint-disable-next-line
            var new_arr = splitArrIntoPages(filteredBacklog);
            //value or reference here??
            mbacklog = new_arr
            //setting the set of selected files that will appear on the page to the first page of the backlog
            // eslint-disable-next-line
            view = new_arr[0]

          }
        }
      // --> do this for nonclick filters as well
    },
    */
    //Must put in correct metadata url
    handleFilterChangeSequential: async function(){
      console.log("handleFilterChangeSequential called")
      var model = this.searchModalSearch.model;
      switch(model){
        case 'patient':
        console.log("filtering patient")
        var offset_p = 100*this.participantsPage;
        var offset_v = 100*this.visitsPage;
        var patients_metadata = await fetchFilteredPatientsMetadataRelatedToStudy(this.selectedStudy, this.searchModalSearch.filters, this.userToken, 100, offset_p)
        var patient_recs = patients_metadata.records;
        console.log(patient_recs)
        this.selectedPatientRecords = patient_recs;
        //TO DO ORDERING RESULTS flat_arr = flat_arr.sort((a, b) => b.externalparticipantid - a.externalparticipantid)... may need to flatten array
        var visits_metadata = await fetchFilteredVisitsMetadataRelatedToStudy(this.selectedStudy, this.searchModalSearch.filters, this.userToken, 100, offset_v)
        var visit_recs = visits_metadata.records;
        this.selectedVisitRecords = visit_recs;
        /*
        var results_total_count = page_1_metadata.totalCount
        var patient_res = [];
        for (let i = 0; i < results_total_count; i += 100){
          var element = await fetchFilteredPatientsMetadataRelatedToStudy(this.selectedStudy, this.searchModalSearch.filters, this.userToken, 100, i)
            var recs = element.records
            patient_res.push(recs)
        }
        var flat_arr = patient_res.flat();
        //if API doesn't take orderby
        flat_arr = flat_arr.sort((a, b) => b.externalparticipantid - a.externalparticipantid)
// eslint-disable-next-line
        var send_to_backlog = splitArrIntoPages(flat_arr);
        this.selectedPatientRecords = send_to_backlog[0];
        this.patientsBacklog = send_to_backlog;
        //this.ignoreHandleFilterChange = true;
        var related_visit_recs = [];
        for (const x of flat_arr){
          var id = x.externalparticipantid //reference this correctly
          //filterSearchAux(model,id); //see if you need anything else. will add extpid == x to filters which will return all related visits
          //-------------
            //ASK Eric about pagination for these... get the total count.. hardcoding to 500 for now
            // eslint-disable-next-line
            const patientsStudyMetadataUrl = `https://api.pennsieve.io/models/v1/datasets/N:dataset:e2de8e35-7780-40ec-86ef-058adf164bbc/concepts/${RELEVANT_CONCEPT_ID}/instances/${id}/relations/visits?limit=500&offset=0&includeIncomingLinkedProperties=true`
            // eslint-disable-next-line
            var resp =  await axios.get(patientsStudyMetadataUrl, REQUEST_HEADER(token)).then(response => {
              return handleV1RecordsResponse(response.data)
            })
            var related = resp.records;
            related_visit_recs.push(related)
        }
        // eslint-disable-next-line
        var flat_arr = related_visit_recs.flat();
        //if cant specify orderby
        flat_arr = flat_arr.sort((a, b) => b.event_date_and_time - a.event_date_and_time)
        // eslint-disable-next-line
        var send_to_backlog = splitArrIntoPages(flat_arr);
        this.selectedVisitRecords = send_to_backlog[0];
        this.visitsBacklog = send_to_backlog;
        */
        break;

        case 'visits':
        // eslint-disable-next-line
        var offset_v = 100*this.visitsPage;
        var offset_s = 100*this.samplesPage;
        // eslint-disable-next-line
        var visits_metadata = await fetchFilteredVisitsMetadataRelatedToStudy(this.selectedStudy, this.searchModalSearch.filters, this.userToken, 100, offset_v)
        // eslint-disable-next-line
        var visit_recs = visits_metadata.records;
        this.selectedVisitRecords = visit_recs;
        //TO DO ORDERING RESULTS flat_arr = flat_arr.sort((a, b) => b.externalparticipantid - a.externalparticipantid)... may need to flatten array
        var samples_metadata = await fetchFilteredSamplesMetadataRelatedToStudy(this.selectedStudy, this.searchModalSearch.filters, this.userToken, 100, offset_s)
        var sample_recs = samples_metadata.records;
        this.selectedSampleRecords = sample_recs;

        /*
        // eslint-disable-next-line
        const visits_to_compare = this.visitsBacklog.flat();
        // eslint-disable-next-line
        var page_1_metadata = await fetchFilteredVisitsMetadataRelatedToStudy(this.selectedStudy, this.searchModalSearch.filters, this.userToken, 100, 0)
        //set these to the correct vars
        // eslint-disable-next-line
        var results_total_count = page_1_metadata.totalCount
        var visit_res = [];
        for (let i = 0; i < results_total_count; i += 100){
          // eslint-disable-next-line
          var element = await fetchFilteredVisitsMetadataRelatedToStudy(this.selectedStudy, this.searchModalSearch.filters, this.userToken, 100, i)
          // eslint-disable-next-line
            var recs = element.records
            visit_res.push(recs)
        }
        // eslint-disable-next-line
        var flat_arr = visit_res.flat();
        var common = visits_to_compare.filter(x => visit_res.indexOf(x) !== -1)
        //if API doesn't take orderby
        common = common.sort((a, b) => b.event_date_and_time - a.event_date_and_time)
// eslint-disable-next-line
        var send_to_backlog = splitArrIntoPages(common);
        this.selectedVisitRecords = send_to_backlog[0];
        this.visitsBacklog = send_to_backlog;
        //this.ignoreHandleFilterChange = true;
// eslint-disable-next-line
        var related_samples_recs = [];
        for (const x of common){
          // eslint-disable-next-line
          var id = x.study_participant_event_id //reference this correctly
          //filterSearchAux(model,id); //see if you need anything else. will add extpid == x to filters which will return all related visits
          //-------------
            //ASK Eric about pagination for these... get the total count.. hardcoding to 500 for now
            // eslint-disable-next-line
            const visitsStudyMetadataUrl = `https://api.pennsieve.io/models/v1/datasets/N:dataset:e2de8e35-7780-40ec-86ef-058adf164bbc/concepts/${RELEVANT_CONCEPT_ID}/instances/${id}/relations/samples?limit=500&offset=0&includeIncomingLinkedProperties=true`
// eslint-disable-next-line
            var resp =  await axios.get(visitsStudyMetadataUrl, REQUEST_HEADER(token)).then(response => {
              return handleV1RecordsResponse(response.data)
            })
            // eslint-disable-next-line
            var related = resp.records;
            // eslint-disable-next-line
            related_sample_recs.push(related)
        }
        // eslint-disable-next-line
        var flat_arr = related_sample_recs.flat();
        //if cant specify orderby
        flat_arr = flat_arr.sort((a, b) => b.study_sample_id - a.study_sample_id)
// eslint-disable-next-line
        var send_to_backlog = splitArrIntoPages(flat_arr);
        this.selectedSampleRecords = send_to_backlog[0];
        this.samplesBacklog = send_to_backlog;
        */
        break;
        case 'samples':
        // eslint-disable-next-line
        var offset_s = 100*this.samplesPage;
        //TO DO ORDERING RESULTS flat_arr = flat_arr.sort((a, b) => b.externalparticipantid - a.externalparticipantid)... may need to flatten array
        // eslint-disable-next-line
        var samples_metadata = await fetchFilteredSamplesMetadataRelatedToStudy(this.selectedStudy, this.searchModalSearch.filters, this.userToken, 100, offset_s)
        // eslint-disable-next-line
        var sample_recs = samples_metadata.records;
        this.selectedSampleRecords = sample_recs;

        /*
        // eslint-disable-next-line
        const samples_to_compare = this.samplesBacklog.flat();
        // eslint-disable-next-line
        var page_1_metadata = await fetchFilteredSamplesMetadataRelatedToStudy(this.selectedStudy, this.searchModalSearch.filters, this.userToken, 100, 0)
        //set these to the correct vars
        // eslint-disable-next-line
        var results_total_count = page_1_metadata.totalCount
// eslint-disable-next-line
        var sample_res = [];
        for (let i = 0; i < results_total_count; i += 100){
          // eslint-disable-next-line
          var element = await fetchFilteredSamplesMetadataRelatedToStudy(this.selectedStudy, this.searchModalSearch.filters, this.userToken, 100, i)
          // eslint-disable-next-line
            var recs = element.records
            sample_res.push(recs)
        }
        // eslint-disable-next-line
        sample_res = sample_res.flat();
        // eslint-disable-next-line
        var common1 = samples_to_compare.filter(x => sample_res.indexOf(x) !== -1)
        //if API doesn't take orderby
        common1 = common1.sort((a, b) => b.study_sample_id - a.study_sample_id)
// eslint-disable-next-line
        var send_to_backlog = splitArrIntoPages(common1);
        this.selectedSampleRecords = send_to_backlog[0];
        this.samplesBacklog = send_to_backlog;
        */
      }
    },

    //called when a record is clicked
    // eslint-disable-next-line
    onClickElement(nodeData, selectedRecord, clearing){
    /*
    //filters the page for the model the filters are applied to and sets the backlog for that model
    // eslint-disable-next-line
    handleFilterChange: async function(){
      // eslint-disable-next-line
      model = this.searchModalSearch.model;
      // eslint-disable-next-line
      switch(model){
        case 'patient':
          //getting the first page of filtered records for the model
          var page_1_metadata = await fetchFilteredPatientsMetadataRelatedToStudy(this.selectedStudy, this.searchModalSearch.filters, this.userToken, 100, 0)
          //set these to the correct vars
          var results_total_count = page_1_metadata.totalCount
          //this.recordHeadings = page_1_metadata.headings
          var to_be_sorted = page_1_metadata.records
          sorted = to_be_sorted.sort((a, b) => b.externalparticipantid - a.externalparticipantid)
          this.selectedPatientRecords = sorted
          this.selectedRecordCount['patient'] = sorted.length
          //getting all of the record data and putting into backlog for model. Each element of the backlog will be a page of filtered results
          for (let i = 0; i < results_total_count; i += 100){
            // eslint-disable-next-line
            backlog_metadata = []
            var element = await fetchFilteredPatientsMetadataRelatedToStudy(this.selectedStudy, this.searchModalSearch.filters, this.userToken, 100, i)
            // eslint-disable-next-line
            backlog_metadata.push(element);
            // eslint-disable-next-line
            this.patientsBacklog.push(backlog_metadata);
            //var flat_arr = this.patientsBacklog.flat();

            var other_models = ['visits','samples','files']
            for (model in other_models){
            for (x in flat_arr){
              //make request to NEW API ENDPOINT. get the related records for each model, and put into respective backlogs
              //for response, call a helper that sets the backlog for each of the returned models just like the intended one that sets the backlog from filter
              //i.e. switch case if model is vists, set visits backlog, etc

            }
          break;
          case 'visits':
            //getting the first page of filtered records for the model
            var page_1_metadata1 = await fetchFilteredPatientsMetadataRelatedToStudy(this.selectedStudy, this.searchModalSearch.filters, this.userToken, 100, 0)
            //set these to the correct vars
            var results_total_count1 = page_1_metadata1.totalCount
            //this.recordHeadings = page_1_metadata.headings
            this.selectedVisitRecords = page_1_metadata1.records
            //getting all of the record data and putting into backlog for model. Each element of the backlog will be a page of filtered results
            for (let i = 0; i < results_total_count1; i += 100){
              // eslint-disable-next-line
              backlog_metadata = []
              var element1 = await fetchFilteredPatientsMetadataRelatedToStudy(this.selectedStudy, this.searchModalSearch.filters, this.userToken, 100, i)
              // eslint-disable-next-line
              backlog_metadata.push(element1);
              // eslint-disable-next-line
              this.visitsBacklog.push(backlog_metadata);
            }
            break;
        case 'samples':
          //getting the first page of filtered records for the model
          var page_1_metadata2 = await fetchFilteredPatientsMetadataRelatedToStudy(this.selectedStudy, this.searchModalSearch.filters, this.userToken, 100, 0)
          //set these to the correct vars
          var results_total_count2 = page_1_metadata2.totalCount
          //this.recordHeadings = page_1_metadata.headings
          this.selectedSampleRecords = page_1_metadata2.records
          //getting all of the record data and putting into backlog for model. Each element of the backlog will be a page of filtered results
          for (let i = 0; i < results_total_count2; i += 100){
            // eslint-disable-next-line
            backlog_metadata = []
            var element2 = await fetchFilteredPatientsMetadataRelatedToStudy(this.selectedStudy, this.searchModalSearch.filters, this.userToken, 100, i)
            // eslint-disable-next-line
            backlog_metadata.push(element2);
            // eslint-disable-next-line
            this.samplesBacklog.push(backlog_metadata);
          }
          break;
        case 'files':
          //getting the first page of filtered records for the model
          var page_1_metadata3 = await fetchFilteredPatientsMetadataRelatedToStudy(this.selectedStudy, this.searchModalSearch.filters, this.userToken, 100, 0)
          //set these to the correct vars
          var results_total_count3 = page_1_metadata3.totalCount
          //this.recordHeadings = page_1_metadata.headings
          this.selectedFileRecords = page_1_metadata3.records
          //getting all of the record data and putting into backlog for model. Each element of the backlog will be a page of filtered results
          for (let i = 0; i < results_total_count3; i += 100){
            // eslint-disable-next-line
            backlog_metadata = []
            var element3 = await fetchFilteredPatientsMetadataRelatedToStudy(this.selectedStudy, this.searchModalSearch.filters, this.userToken, 100, i)
// eslint-disable-next-line
            backlog_metadata.push(element3);
            // eslint-disable-next-line
            this.filesBacklog.push(backlog_metadata);
          }

      }
    },
    */


    onClickElement(nodeData, selectedRecord){
      //checking that its a record and not a model
      // console.log('onClickElement() nodeData:')
      // console.log(nodeData)
      // console.log('onClickElement() selectedRecord:')
      // console.log(selectedRecord)
      if (nodeData.parent && clearing == false) {
        //parentname will determine what color we change the square to
        var parent = nodeData.parent;
        var parentName = parent.displayName
        let clickCount = +selectedRecord.attr("clickcount") + 1
        selectedRecord.attr("clickcount", clickCount)

        // set default fill style (when record is unselected)
        let fillstyle = '#C8C7C7'

        // unselected (an even number of clicks)
        if (clickCount%2 == 0){
          // TODO: add selectedNode to a "selected nodes" list (based on record type -> `parentName`)

          handleFilterChangeClick(nodeData, unclick);
        }
        // selected (an odd number of clicks)
        else if (clickCount%2 == 1 ){
          // TODO: remove selectedNode from a "selected nodes" list (based on record type -> `parentName`)
          switch (parentName) {
            case 'patient':
            // // eslint-disable-next-line
            //     var curr_shaded_participants = this.shadedParticipants;
            //     //before doing this, check to see if selectedCurr particpants is recordID or record object. If the latter, need to get
            //     //proper data from the current clicked node.
            //     //here, we want to get the current list of 'selected' records (can be empty), add our new selectoin to it,
            //     // and (optionally) filter duplicates. Then set new list to store.
            //     // eslint-disable-next-line
            //     var prelist = curr_selected_participants.concat(nodeData.details.id);
            //     /*
            //     let filteredlist = prelist.filter((c, index) => {
            //         return prelist.indexOf(c) === index;
            //     });
            //     */
            //     // eslint-disable-next-line
            //     setShadedParticipants(prelist);
            //     // eslint-disable-next-line
            //     //handleFilterChangeClick(nodeData, click);
            //     //red square
            //     //NOTE: use the same process as in the section above
            //     // eslint-disable-next-line
            //     // eslint-disable-next-line
            //     var ctx = canvas.node().getContext('2d');
            //     //how do we grab the record we're interested in?
            //     // eslint-disable-next-line
            //     var element = this.custom('custom.record');
            //     // eslint-disable-next-line
            //     var node = d3.select(element);
            //     // eslint-disable-next-line
            //     ctx.fillstyle ="#d10a00";
            //     // eslint-disable-next-line
            //     ctx.fillRect(node.attr('x'), node.attr('y'), node.attr('width'), node.attr('height'));
            //     //or just use d3.select(this).style("fill","#d10a00");
            //     //get related record data and set to store... see how Eric's filter gets related first
            /*
                var part_arr = this.shadedParticipants
                console.log(part_arr)
                var payload = [nodeData,selectedRecord, true]
                this.shadedParticipants = part_arr.push(payload)
                this.setShadedParticipants(this.shadedParticipants)
            */
                fillstyle ="#d10a00"
                // eslint-disable-next-line
                handleFilterChangeClick(nodeData, unclick);
                break;
            case 'visits':
                // var curr_selected_visits = this.shadedVisits;
                // // eslint-disable-next-line
                // var prelist = curr_selected_visits.concat(nodeData.details.id);
                // // eslint-disable-next-line
                // setShadedVisits(prelist);
                // // eslint-disable-next-line
                // //handleFilterChangeClick(nodeData, click);
                // //blue
                // // eslint-disable-next-line
                // var ctx = canvas.node().getContext('2d');
                // //how do we grab the record we're interested in?
                // // eslint-disable-next-line
                // var element = this.custom('custom.record');
                // // eslint-disable-next-line
                // var node = d3.select(element);
                // ctx.fillstyle ="#0049d1";
                // // eslint-disable-next-line
                // ctx.fillRect(node.attr('x'), node.attr('y'), node.attr('width'), node.attr('height'));
                // //or just use
                // //d3.select(this).style("fill","#0049d1");

                /*
                LOGIC FOR POPULATING ARRAY FOR CLEARING SELECTIONS
                var vis_arr = this.shadedVisits
                var payload1 = [nodeData,selectedRecord, true]
                this.shadedVisits = vis_arr.push(payload1)
                this.setShadedVisits(this.shadedVisits)

                //logic for setting linking target
                var vis_arr_len = this.shadedVisits;
                var samp_arr_len - this.shadedVisits;
                if (vis_arr_len.length == 1 && (samp_arr_len.length == 0 || samp_arr_len.length > 1)){
                  var to_be_linked = this.selectedRecord.details.id //CONFIRM THIS IS THE DATA WE ARE INTERESTED IN!
                  this.setLinkingTarget(to_be_linked)
                }
                */
                fillstyle ="#0049d1"
                // eslint-disable-next-line
                handleFilterChangeClick(nodeData, unclick);
                break;
            case 'samples':
            // // eslint-disable-next-line
            //     var curr_selected_samples = this.shadedSamples;
            //     // eslint-disable-next-line
            //     var prelist = curr_selected_samples.concat(nodeData.details.id);
            //     // eslint-disable-next-line
            //     setShadedSamples(prelist);
            //     // eslint-disable-next-line
            //     //handleFilterChangeClick(nodeData, click);
            //     //yellow
            //     // eslint-disable-next-line
            //     var ctx = canvas.node().getContext('2d');
            //     //how do we grab the record we're interested in?
            //     // eslint-disable-next-line
            //     var element = this.custom('custom.record');
            //     // eslint-disable-next-line
            //     var node = d3.select(element);
            //     // eslint-disable-next-line
            //     ctx.fillstyle ="#f0cc00";
            //     // eslint-disable-next-line
            //     ctx.fillRect(node.attr('x'), node.attr('y'), node.attr('width'), node.attr('height'));
            //     //or just use
            //     //d3.select(this).style("fill","#f0cc00");
            /*
              LOGIC FOR POPULATING ARRAY FOR CLEARING SELECTIONS
                var samp_arr = this.shadedSamples
                var payload2 = [nodeData,selectedRecord, true]
                this.shadedSamples = samp_arr.push(payload2)
                this.setShadedSamples(this.shadedSamples)

                //logic for setting linking target
                var vis_arr_len = this.shadedVisits;
                var samp_arr_len - this.shadedVisits;
                if (samp_arr_len.length == 1 && (vis_arr_len.length == 0 || vis_arr_len.length > 1)){
                  var to_be_linked = this.selectedRecord.details.id //CONFIRM THIS IS THE DATA WE ARE INTERESTED IN!
                  this.setLinkingTarget(to_be_linked)
                }
                */

                fillstyle ="#f0cc00"
                // eslint-disable-next-line
                handleFilterChangeClick(nodeData, unclick);
                break;
            case 'files':
                fillstyle ="#f0cc00" // TODO: should be a different color
                break;
          }
        }
        // set selected record's fill style and re-draw the main canvas
        selectedRecord.attr('fillStyle', fillstyle)
        const mainCanvas = d3.select('.mainCanvas')
        this.draw(mainCanvas, false)
      }
      else {
        //we are in the case where clearing == true
        //var parent_clear = nodeData.parent;
        //var parentName_clear = parent_clear.displayName
        let clickCount_clear = 0
        selectedRecord.attr("clickcount", clickCount_clear)
        // set default fill style (when record is 'unclicked')
        let fillstyle_clear = '#C8C7C7'
        selectedRecord.attr('fillStyle', fillstyle_clear)
        const mainCanvas_clear = d3.select('.mainCanvas')
        this.draw(mainCanvas_clear, false)
      }
    },

    loadModelData: function() {
      if (!this.userToken()) {
        return
      }

      let vm = this
      this.sendXhr(this.graphUrl, {
        header: {
          'Authorization': `Bearer ${this.userToken()}`
        }
      })
        .then(response => {
          vm.hasData = true
          vm.isLoading = false
          vm.modelData = response.filter(x => x.type === 'concept').filter(x => vm.interestedModels.includes(x.displayName))
        })
        .catch(this.handleXhrError.bind(this))
    },

    bindModelData: function() {
      //NOTE: add in a section which binds creates 2 rectangles per model next to text, and gives first one prev attr, second one next attr
      var join = this.custom.selectAll('custom.model')
        .data(this.modelData);

      let vm = this
      var enterSel = join.enter()
        .append('custom')
        .attr('class', 'model')
        .attr('modelName', function(d) {return d.displayName})

      join
        .merge(enterSel)
        .transition()
        .attr("x", function(d) {
          let col = Math.floor(d.bins[0] / vm.numberOfRows)
          return ( vm.cellSize + vm.groupSpacing) * col + vm.xOffset
        })
        .attr("y", function(d, i) { // eslint-disable-line no-unused-vars
          let row = d.bins[0] % vm.numberOfRows
          return (vm.modelHeaderHeight + vm.cellSize + vm.groupSpacing) * row + vm.yOffset
        })
        //d
        .attr('width', function(d) {
          //d.numRows
          return d.numCols * vm.cellSize + (d.numCols - 1) * vm.groupSpacing
        })
        //d
        .attr('height', function(d) {
          //d.numRows
          return d.numRows *  vm.cellSize + (d.numRows - 1) * (vm.groupSpacing + vm.modelHeaderHeight)
        })
        .attr('strokeStyle', '#34259F')
        .attr('fillStyle', 'white') //'#34259F')
        .attr('fillStyleHidden', function(d) {
          d.hiddenCol = vm.genColor();
          vm.colorToNode[d.hiddenCol] = d;
          return d.hiddenCol;
        })
    },

    clearRecordData: function() {
      this.clearSelectedRecordData()
      this.clearSelectedRecordDataCounts()
      this.clearSelectedPageNumbers()
    },
    clearSelectedRecordDataCounts: function() {
      this.selectedRecordCount['patient'] = 0
      this.selectedRecordCount['visits'] = 0
      this.selectedRecordCount['samples'] = 0
    },
    clearSelectedRecordData: function() {
      this.selectedPatientRecords = []
      this.selectedVisitRecords = []
      this.selectedSampleRecords  = []
    },
    clearSelectedPageNumbers: function() {
      this.participantsPage = 0
      this.visitsPage = 0
      this.samplesPage = 0
      this.filesPage = 0
    },

    updateStudyDataV2: function() {
      console.log('updateStudyDataV2() - starting')
      this.clearRecordData()
      var modelList = ['patient','visits','samples'/*,'files'*/];
      var pagenum = 0;
      var offset = 100*pagenum;
      // let orderBy = '';
      let promisedEvents = [];

      var vm = this
      modelList.forEach(function (modelName){
        switch (modelName) {
          case 'patient':
            // orderBy = 'externalparticipantid';//verify data is in a list, if not, put it in one before sending off
            break;
          case 'visits':
            // orderBy = 'event date and time'
            //this.setAllVisits(response.data);
            break;
          case 'samples':
            // orderBy = 'study sample ID';
            break;
          case 'files':
            console.log('nothing for files yet');
        }
        const options = {
          method: 'GET',
          url: `https://api.pennsieve.io/models/v1/datasets/${vm.datasetId}/concepts/study/instances/${vm.selectedStudy.id}/relations/${modelName}`,
          params: {
            limit: '100',
            // eslint-disable-next-line
            offset: `${offset}`
          },
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${vm.userToken()}`
          }
        };
        promisedEvents.push(
            axios.request(options).then(function (response) {
              switch (modelName){
                case 'patient':
                  //verify data is in a list, if not, put it in one before sending off
                  vm.updatePatients(response.data);
                  break;
                case 'visits':
                  vm.updateVisits(response.data);
                  break;
                case 'samples':
                  vm.updateSamples(response.data);
                  break;
                case 'files':
                  console.log('nothing for files yet');
              }
            }).catch(function (error) {
              console.error(error);
            })
        )
      })

      console.log('updateStudyDataV2() promisedEvents:')
      console.log(promisedEvents)
      return Promise.all(promisedEvents)
    },

    updatePatients: function(data) {
      console.log(`updatePatients() length: ${data.length} data:`)
      console.log(data)
      this.selectedPatientRecords = data
      this.selectedRecordCount['patient'] = data.length
    },

    updateVisits: function(data) {
      console.log(`updateVisits() length: ${data.length} data:`)
      console.log(data)
      this.selectedVisitRecords = data
      this.selectedRecordCount['visits'] = data.length
    },

    updateSamples: function(data) {
      console.log(`updateSamples() length: ${data.length} data:`)
      console.log(data)
      this.selectedSampleRecords  = data
      this.selectedSampleRecords['samples'] = data.length
    },

    updateView: function() {
      console.log(`updateView() selectedRecordCount:`)
      console.log(this.selectedRecordCount)

      this.nextCol = 1 //reset hidden Canvas color scheme
      this.colorToNode = {}
      this.startIndex = 0
      this.recordData = {}
      this.recordPool = {}

      let vm = this
      vm.modelData.map(x => {
        console.log(`updateView() x: ${x.name}`)
        //some fixed width that we will decide on
        // TODO: clean up recordCount and x.count (use just one)
        let recordCount = vm.selectedRecordCount[x.name]
        x.count = recordCount
        console.log(`updateView() number of '${x.name}' records: ${x.count}`)
        let numElem = recordCount < 100 ? recordCount : 100
        let recs = d3.range(vm.startIndex, vm.startIndex + numElem ).map(function(el) {
            return {
              id: el,
              study: vm.selectedStudy,
              recordIndex: el-vm.startIndex,
              parent: x,
              recordId: null,
              details: null,
            }
          })

        vm.startIndex += numElem

        // Record data is mapped to objects on the canvas
        vm.recordData[x.id] = {
          model: x.displayName,
          showRecords: false,
          nodes: recs,
        }

        // RecordPool is caching all records returned from API.
        vm.recordPool[x.id] = {
          model: x.displayName,
          isPending: false,
          nextPage: 0,
          unMapped: [],
          records: [],
        }
      })

      vm.binRegistry = Array(vm.binRegistrySize).fill(0)
      vm.modelData.forEach( x => {
        [x.bins, x.numRows, x.numCols] = this.findBins(x.id, x.count)
      })

      vm.bindModelData()
      vm.recordbind()
      vm.drawCanvases()
    },

    // eslint-disable-next-line
    updatePageHelper: async function(modelName,pagenum,orderBy){
      //var vm = this;
      console.log(`updatePageHelper() modelName: ${modelName} pagenum: ${pagenum} orderBy: ${orderBy}`)
      //filtered is false and we just grab the next page of records
      // eslint-disable-next-line
      var offset = 100*pagenum;
      console.log(`updatePageHelper() offset: ${offset}`)
      /*
      const options = {
        method: 'GET',
        url: `https://api.pennsieve.io/models/v1/datasets/${vm.datasetId}/concepts/study/instances/${vm.selectedStudy.id}/relations/${modelName}`,
        params: {
            limit: '100',
            // eslint-disable-next-line
            offset: `${offset}`,
            orderBy: `${orderBy}`,
            ascending: 'true'
          },
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${vm.userToken()}`
          }
        };
        */
      switch (modelName){
        case 'patient':
          console.log('updatePageHelper() updating patient')
          //error with filter array. Must address
          if (this.searchModalSearch.filters == undefined){
            var pmetadata = await fetchFilteredPatientsMetadataRelatedToStudy(this.selectedStudy, [], this.userToken(), 100, offset)
          }else{
            // eslint-disable-next-line
            var pmetadata = await fetchFilteredPatientsMetadataRelatedToStudy(this.selectedStudy, this.searchModalSearch.filters, this.userToken(), 100, offset)
          }
          var p_record_results = pmetadata.records
          //ORDERBY TODO
          console.log("updating patient data")
          //verify data is in a list, if not, put it in one before sending off
          this.updatePatients(p_record_results);
          break;
        case 'visits':
          console.log('updatePageHelper() updating visits')
          console.log('updatePageHelper() this.selectedStudy:')
          console.log(this.selectedStudy)
          if (this.searchModalSearch.filters == undefined){
            var vmetadata = await fetchFilteredVisitsMetadataRelatedToStudy(this.selectedStudy, [], this.userToken(), 100, offset)
          }else{
            // eslint-disable-next-line
            var vmetadata = await fetchFilteredVisitsMetadataRelatedToStudy(this.selectedStudy, this.searchModalSearch.filters, this.userToken(), 100, offset)
          }
          var v_record_results = vmetadata.records
          console.log('updatePageHelper() v_record_results:')
          console.log(v_record_results)
          this.updateVisits(v_record_results);
          break;
        case 'samples':
          if (this.searchModalSearch.filters == undefined){
            var smetadata = await fetchFilteredSamplesMetadataRelatedToStudy(this.selectedStudy, [], this.userToken(), 100, offset)
          }else{
            // eslint-disable-next-line
            var smetadata = await fetchFilteredSamplesMetadataRelatedToStudy(this.selectedStudy, this.searchModalSearch.filters, this.userToken(), 100, offset)
          }
          var s_record_results = smetadata.records
          this.updateSamples(s_record_results);
          break;
        case 'files':
          console.log('nothing for files yet');
      }
    },

    updatePage: function(modelName, modelPage, orderBy, direction){
      //can't go back before the first page
      console.log(`updatePage() modelName: ${modelName} modelPage: ${modelPage} orderBy: (${orderBy}) direction: ${direction}`)
      const vm = this;
      let pagenum = -1
      //if this model has been filtered, we want to get its page from the backlog and set it to selected
      switch (modelName){
        case 'patient':
          if (direction == 'next') {
            this.participantsPage++;
          }
          else if ((direction == 'prev') && (this.participantsPage > 0)) {
            this.participantsPage--;
          }
          pagenum = this.participantsPage;
          break;
        case 'visits':
          if (direction == 'next') {
            this.visitsPage++;
          }
          else if ((direction == 'prev') && (this.visitsPage > 0)) {
            this.visitsPage--;
          }
          pagenum = this.visitsPage;
          break;
        case 'samples':
          if (direction == 'next') {
            this.samplesPage++;
          }
          else if ((direction == 'prev') && (this.samplesPage > 0)) {
            this.samplesPage--;
          }
          pagenum = this.samplesPage;
          break;
        case 'files':
          console.log('updatePage(): nothing for files yet');
      }
      if (pagenum != -1) {
        console.log(`updatePage() ${direction} -> get ${modelName} pagenum: ${pagenum}`)
        // eslint-disable-next-line
        vm.updatePageHelper(modelName, pagenum, orderBy).then(value => {
          vm.updateView()
        })
      }
    },

    async updateVisitsFiles() {
      this.selectedVisitsFiles = await fetchVisitsFilesRelatedToStudy(this.selectedStudy, this.searchModalSearch.filters, this.userToken(), 100, 0)
    },

    async updateSamplesFiles() {
      this.selectedSamplesFiles = await fetchSamplesFilesRelatedToStudy(this.selectedStudy, this.searchModalSearch.filters, this.userToken(), 100, 0)
    },

    //fetches and sets store to entries on the 'next' page for each model. Will call from the page advance bar bound to each model bin
    //Should have forward and advance page as one function by setting forward or advance to the attrs of the arrows bounding box
    //NOTE: NEED TO ACCOUNT FOR THE CASE WHERE THIS IS FILTERED. MUST MAKE A MODIFIED CALL TO renderAfterFilter()
    //NOTE: when filter is applied, we can grab next element of backlog rather than make an api call
    // eslint-disable-next-line
    advancePage: function(modelName, direction) {
      console.log(`advancePage() modelName: ${modelName} direction: ${direction}`)
      var orderBy = ''
      var modelPage = ''
      switch (modelName) {
          //console.log(modelName)
        case 'patient':
          console.log('case patient')
          orderBy = 'externalparticipantid';//verify data is in a list, if not, put it in one before sending off
          modelPage = this.participantsPage;
          this.selectedPatientRecords = [];
          this.selectedRecordCount['patient'] = 0;
          //if there are any filters applied to the model
          /*
          if (this.patientsBacklog.length > 0){
            console.log('something in patients backlog. backlog is:', this.patientsBacklog)
            //grab next page from the backlog array and assign that to selected__...must do for each of them
            // eslint-disable-next-line
            this.updatePage('patient', modelPage, orderBy, direction,true);
          }
          */
          // eslint-disable-next-line
          this.updatePage('patient', modelPage, orderBy, direction);
          break;
        case 'visits':
          orderBy = 'event date and time';
          modelPage = this.visitsPage;
          this.selectedVisitRecords = [];
          this.selectedRecordCount['visits'] = 0;
          // eslint-disable-next-line
          /*
          if (this.visitsBacklog.length > 0){
            //grab next page from the backlog array and assign that to selected__...must do for each of them
            // eslint-disable-next-line
            this.updatePage('visits', modelPage, orderBy, direction,true);
          }
          */

          // eslint-disable-next-line
          this.updatePage('visits', modelPage, orderBy, direction);
          break;
        case 'samples':
          orderBy = 'study sample ID';
          modelPage = this.samplesPage;
          this.selectedSampleRecords  = [];
          this.selectedSampleRecords['samples'] = 0;
          // eslint-disable-next-line
          /*
          if (this.samplesBacklog.length > 0){
            // eslint-disable-next-line
          this.updatePage('samples', modelPage, orderBy, direction,true);
          }
          */
          // eslint-disable-next-line
          this.updatePage('samples', modelPage, orderBy, direction);
          break;
        case 'files':
          modelPage = this.filesPage;
          console.log('nothing for files');
      }
    },

    // eslint-disable-next-line
    onHoverElement: function(nodeData, x, y) {
      // console.log(`onHoverElement() x: ${x} y: ${y} nodeData:`)
      // console.log(nodeData)

      // eslint-disable-next-line no-unreachable
      if (nodeData && nodeData.parent) {
        // eslint-disable-next-line
        if (!nodeData.details) {
          // eslint-disable-next-line
          // console.log('onHoverElement() nodeData.details: no details yet')
          const modelId = nodeData.parent.id
          // console.log(`onHoverElement() modelId: ${modelId}`)
          if (this.recordPool[modelId].unMapped.length === 0 && !this.recordPool[modelId].isPending) {
            // console.log('onHoverElement() Getting more records')
            this.fetchRecords(modelId)
          } else {
            const unMapped = this.recordPool[modelId].unMapped
            const randomIndex =Math.floor(Math.random() * unMapped.length);
            // eslint-disable-next-line
            nodeData.details = this.recordPool[modelId].records[ unMapped[randomIndex]]
            // console.log(nodeData.details)
            unMapped.splice(randomIndex, 1)
          }
        }
        // eslint-disable-next-line
        this.selectedNode = nodeData

        const tooltip = select('.record-tooltip')

        this.shouldHideTooltip = false
        // eslint-disable-next-line
        // this.hoveredModel = nodeData.details
        if (nodeData.details && nodeData.details.values) {
          this.hoveredModel = {
            displayName: nodeData.parent.name,
            properties: nodeData.details.values ? nodeData.details.values : []
          }
        }

        tooltip.style('transform', `translate(${x}px, ${y + 20}px)`)
      }
      else {
        // there is no nodeData or this nodeData does not have a parent (i.e., it is a model)
        this.hideModelTooltip()
      }
    },

    fitBin: function(modelId, totalNumberBins, nCols, startingBinIndex ){
      let maxRatio = 4

      if (nCols > totalNumberBins) {
        return [null, null,null]
      } else {
        let nRows = Math.ceil(totalNumberBins / nCols)

        if (nCols/nRows > maxRatio) {
          return [null, null,null]
        }

        let remainingRows = this.numberOfRows - (startingBinIndex % this.numberOfRows)
        if (nRows > remainingRows) {
          return this.fitBin(modelId, totalNumberBins, nCols+1, startingBinIndex)
        }

        // When here, we know that the shape will potentially fit
        let isAvailable = true
        let bins = []
        for (let colIndex = 0; colIndex < nCols; colIndex++) {
          for (let rowIndex = 0; rowIndex < nRows; rowIndex++) {
            let index = startingBinIndex + rowIndex + (colIndex * this.numberOfRows)
            if (this.binRegistry[index] != 0) {
              isAvailable = false
              break
            } else {
              bins.push(index)
            }
          }
        }
        if (isAvailable) {
          bins.forEach(x => this.binRegistry[x] = modelId)
          return [bins, nRows, nCols ]
        } else {
          return this.fitBin(modelId, totalNumberBins, nCols+1, startingBinIndex)
        }


      }
    },

    findBins: function(modelId, numberOfRecords) {
      let bins = []
      let numRows = null
      let numCols = null

      let numBins = Math.max(Math.ceil(numberOfRecords / (this.nrElemPerCol**2)), 1)
      let foundResult = false

      let index = 0 // Index of the active cell in the registry
      while (!foundResult) {
        if (index > 500) {
          break
        }

        if (this.binRegistry[index] == 0) {
          let remainingRows =  this.numberOfRows- (index % this.numberOfRows)
          let allRemainingAvailable = true
          for (let i = 0; i < remainingRows; i++){
            if (this.binRegistry[index + i] != 0){
              // eslint-disable-next-line no-unused-vars
              allRemainingAvailable = false
            }
          }
          [bins, numRows, numCols] = this.fitBin(modelId, numBins, 1, index)
          foundResult = bins != null
        }
        index += 1
      }
      return [bins, numRows, numCols]

    },

    fetchRecords: function(modelId, startIndex=0, numberOfRecords=10) {
// eslint-disable-next-line
      const offset1 = startIndex+(this.recordPool[modelId].nextPage * numberOfRecords)
      this.recordPool[modelId].isPending = true
      // eslint-disable-next-line
      this.sendXhr(`${this.recordsUrl}/${modelId}/instances?limit=${numberOfRecords}&offset=${offset1}`, {
        header: {
          'Authorization': `bearer ${this.userToken()}`
        }
      })
        .then(response => {
          response.forEach(r => {
            r.mapped = false
          })

          this.recordPool[modelId].unMapped = d3.range(0, response.length )
          this.recordPool[modelId].records = response
          this.recordPool[modelId].nextPage += 1
          this.recordPool[modelId].isPending = false

        })
    },


    getRecordData: function() {
      let nodes = []
      // eslint-disable-next-line no-unused-vars
      for (const [key, value] of Object.entries(this.recordData)) {
        // if (value.showRecords) {
          nodes = nodes.concat(value.nodes)
        // }
      }
      return nodes
    },

    recordbind: function() {
      console.log('recordbind()')
      let recordData = this.getRecordData()
      console.log('recordData:')
      console.log(recordData)

      var join = this.custom.selectAll('custom.record')
        .data(this.getRecordData);

      console.log('recordbind() join:')
      console.log(join)

      let vm = this
      var enterSel = join.enter()
        .append('custom')
        .attr('class', 'record')

      console.log('recordbind() enterSel:')
      console.log(enterSel)

      join
        .merge(enterSel)
        .transition()
        .attr("x", function(d) {
          let parent = d.parent
          let ModelCol = Math.floor(parent.bins[0] / vm.numberOfRows)
          let RecordCol = d.recordIndex % vm.nrElemPerCol
          let RecordSection = Math.floor( d.recordIndex / ((vm.nrElemPerCol ** 2) * parent.numRows))

          return Math.floor((vm.cellSize + vm.groupSpacing) * (ModelCol + RecordSection) + vm.xOffset + vm.cellOffset +  RecordCol * (vm.recordSize + vm.recordSpacing))
        })
        .attr("y", function(d, i) { // eslint-disable-line no-unused-vars
          let parent = d.parent
          let row = parent.bins[0] % vm.numberOfRows

          let RecordRow = Math.floor(((d.recordIndex % (parent.numRows * vm.nrElemPerCol**2) )/ vm.nrElemPerCol)) % vm.nrElemPerCol
          let recordSection = Math.floor( d.recordIndex / (vm.nrElemPerCol**2)) % parent.numRows
          return vm.yOffset + (vm.modelHeaderHeight + vm.cellSize + vm.groupSpacing) * (row + recordSection)  + vm.cellOffset + RecordRow * (vm.recordSize + vm.recordSpacing)
        })
        .attr('width', function(d) { // eslint-disable-line no-unused-vars
          return vm.recordSize
        })
        .attr('height', function(d) { // eslint-disable-line no-unused-vars
          return vm.recordSize
        })
        .attr('fillStyle', '#C8C7C7')
        .attr('fillStyleHidden', function(d) {
          d.hiddenCol = vm.genColor();
          vm.colorToNode[d.hiddenCol] = d;
          return d.hiddenCol;
        })
        //will be the click counter for a given record and will be initialized to 0 for every record
        // eslint-disable-next-line
        .attr('clickcount',0)
        .attr('study', vm.selectedStudy.values[0].value)
        .attr('modelName', function(d) {return d.parent.displayName})
        .attr('record', function(d) {return d})

    },

/*
    modelbind: function() {
      var join = this.custom.selectAll('custom.model')
        .data(this.modelData);

      let vm = this
      var enterSel = join.enter()
        .append('custom')
        .attr('class', 'model')
        .attr('modelName', function(d) {return d.displayName})

      join
        .merge(enterSel)
        .transition()
        .attr("x", function(d) {
          let col = Math.floor(d.bins[0] / vm.numberOfRows)
          return ( vm.cellSize + vm.groupSpacing) * col + vm.xOffset
        })
        .attr("y", function(d, i) { // eslint-disable-line no-unused-vars
          let row = d.bins[0] % vm.numberOfRows
          return (vm.modelHeaderHeight + vm.cellSize + vm.groupSpacing) * row + vm.yOffset
        })
        .attr('width', function(d) {
          return d.numCols *  vm.cellSize + (d.numCols - 1) * vm.groupSpacing
        })
        .attr('height', function(d) {
          return d.numRows *  vm.cellSize + (d.numRows - 1) * (vm.groupSpacing + vm.modelHeaderHeight)
        })
        .attr('strokeStyle', '#34259F')
        .attr('fillStyle', 'white') //'#34259F')
        .attr('fillStyleHidden', function(d) {
          d.hiddenCol = vm.genColor();
          vm.colorToNode[d.hiddenCol] = d;
          return d.hiddenCol;
        })



    },
*/
    drawCanvases: function() {
      let vm = this
      let mainCanvas = d3.select('.mainCanvas')
      let hiddenCanvas = d3.select('.hiddenCanvas')
      vm.drawTimer.restart(function(elapsed) {
        vm.draw(hiddenCanvas, true)
        vm.draw(mainCanvas, false);
        if (elapsed > 600) vm.drawTimer.stop();
      })
    },

    draw: function(canvas, hidden) {
      //console.log(`draw() hidden: ${hidden}`)

      // MODEL-AREAS)
      var ctx = canvas.node().getContext('2d');
      ctx.clearRect(0, 0, this.canvasSize.width, this.canvasSize.height); // Clear the canvas.
      var models = this.custom.selectAll('custom.model')

      let vm = this
      // eslint-disable-next-line no-unused-vars
      models.each(function(d,i) { // For each virtual/custom element...
        var node = d3.select(this);   // This is each individual element in the loop.

        // Render Model label sections
        ctx.fillStyle = hidden ? node.attr('fillStyleHidden') : node.attr('fillStyle');
        ctx.fillRect(node.attr('x'), node.attr('y') - vm.modelHeaderHeight , node.attr('width'), vm.modelHeaderHeight);

        if (!hidden) {
          // render background rectangles
          ctx.fillStyle = hidden ? node.attr('fillStyleHidden') : '#EEEBFE';
          ctx.fillRect(node.attr('x'), node.attr('y'), node.attr('width'), node.attr('height'));

          // render Text
          ctx.font = '14px "Helvetica Neue"';
          ctx.fillStyle= '#34259F'
          let xCoord = parseInt(node.attr('x')) + 2
          let yCoord = parseInt(node.attr('y')) - 5
          let displayName = node.attr('modelName')
          displayName = displayName.substring()
          if (displayName.length > 10) {
            displayName = displayName.substring(0, 10) + "..."
          }
          ctx.fillText(displayName, xCoord, yCoord);
          //creating text for pagination
          ctx.font = '14px "Helvetica Neue"';
          let xCoordPrev = parseInt(node.attr('x')) + 70
          let yCoordPrev = parseInt(node.attr('y')) - 5
          let pageTxtPrev = "< Previous"
          let xCoordNext = xCoordPrev + 140
          let yCoordNext = parseInt(node.attr('y')) - 5
          let pageTxtNext = "Next >"
          ctx.fillText(pageTxtPrev, xCoordPrev, yCoordPrev);
          ctx.fillText(pageTxtNext, xCoordNext, yCoordNext);
        }
      })

      // RECORDS
      var records = this.custom.selectAll('custom.record');// Grab all elements you bound data to in the databind() function.
      // eslint-disable-next-line no-unused-vars
      records.each(function(d,i) { // For each virtual/custom element...
        var node = d3.select(this);   // This is each individual element in the loop.
        ctx.fillStyle = hidden ? node.attr('fillStyleHidden') : node.attr('fillStyle');
        ctx.fillRect(node.attr('x'), node.attr('y'), node.attr('width'), node.attr('height'));  // Here you retrieve the position of the node and apply it to the fillRect context function which will fill and paint the square.
      })


    },

/*
    getModelData: function() {
      if (!this.userToken()) {
        return
      }

      let vm = this
      this.sendXhr(this.graphUrl, {
        header: {
          'Authorization': `Bearer ${this.userToken()}`
        }
      })
        .then(response => {
          vm.hasData = true
          vm.isLoading = false
          vm.modelData = response.filter(x => x.type === 'concept').filter(x => vm.interestedModels.includes(x.displayName))

          let startIndex = 0
          vm.modelData.map(x => {
            //some fixed width that we will decide on
            let numElem = x.count < 100 ? x.count : 100
            let recs = d3.range(startIndex, startIndex + numElem ).map(function(el) {
                return {
                  id: el,
                  recordIndex: el-startIndex,
                  parent: x,
                  recordId: null,
                  details: null,
                }
              })

              startIndex += numElem

              // Record data is mapped to objects on the canvas
              vm.recordData[x.id] = {
                showRecords: false,
                nodes: recs,
              }

              // RecordPool is caching all records returned from API.
              vm.recordPool[x.id] = {
                isPending: false,
                nextPage: 0,
                unMapped: [],
                records: [],
              }
            }
          )

          vm.binRegistry = Array(vm.binRegistrySize).fill(0)
          vm.modelData.forEach( x => {
            [x.bins, x.numRows, x.numCols] = this.findBins(x.id, x.count)
          })

          this.nextCol = 1 //reset hidden Canvas color scheme
          this.modelbind()
          this.recordbind()
          var mainCanvas = d3.select('.mainCanvas')
          var hiddenCanvas = d3.select('.hiddenCanvas')
          vm.draw(hiddenCanvas, true)
          this.drawTimer.restart(function(elapsed) {
            vm.draw(mainCanvas, false);
            if (elapsed > 600) vm.drawTimer.stop();
          })
        })
        .catch(this.handleXhrError.bind(this))
    },
*/

    /**
     * Make the chart inactive when the user blurs
     */
    onClickOutsideGraph: function() {
      if (this.active) {
        this.active = false
      }
    },

    /**
     * Handles window resize event
     */
    handleResize: debounce(
      function() {
        // const { edges, nodes } = this.graphData
        // this.updateChart(edges, nodes)
      },
      250
    ),

    /**
     * Sets chart to active state
     */
    activateChart: function() {
      this.active = true
    },

    /**
     * Removes chart from DOM
     */
    destroyChart: function() {
      select('.outer-container').remove()
    },

    handleNodeClick: function(d) {
      this.activeNode = d.currentTarget.__data__.id
    },

    getRenderNodesEdges: function() {
      let nodes = this.graphData.nodes
      let edges = this.graphData.edges
      // eslint-disable-next-line no-unused-vars
      for (const [key, value] of Object.entries(this.recordData)) {
        if (value.showRecords) {
          nodes = nodes.concat(value.nodes)
          edges = edges.concat(value.edges)
        }
      }
      return {nodes, edges}
    },
    packingBy: function(by) {
      this.nrElemPerCol += by
      //this.getModelData()
      this.updateView()
    },

    /**
     * Center the graph at the current zoom level
     * Call-back for 'center'-button
     */
    center: function() {

      var mainCanvas = d3.select('.mainCanvas')
      var hiddenCanvas = d3.select('.hiddenCanvas')

      this.draw(mainCanvas, false)
      this.draw(hiddenCanvas, true)

      const outerContainer = select('.outer-container')
      outerContainer.transition()
        .duration(400).call(zoom.transform, d3.zoomIdentity)
    },

    /**
     * Zoom the graph in or out
     */
    // zoomBy: function(num) {
    //   const outerContainer = select('.outer-container')
    //   outerContainer.call(zoom.scaleBy, num)
    // },

    /**
     * Fullscreen the graph
     */
    fullscreen: function() {
      const graphBrowser = document.querySelector('.graph-browser')
      if (graphBrowser) {
        graphBrowser.requestFullscreen()
      }
    },

    /**
     * Fullscreen the graph
     */
    exitFullscreen: function() {
      document.exitFullscreen()
    },

    /**
     * Focus on node
     * @param {Object} evt
     */
    focusNode: function(evt) {
      const id = propOr('', 'id', evt)
      const node = this.$el.querySelector(`[data-id="${id}"]`)

      if (node) {
        // const x = node.__data__.x + 150 // Account for the width of the models list sidebar
        // const y = node.__data__.y
        // const outerContainer = select('.outer-container')
        // outerContainer.transition().duration(400).call(zoom.translateTo, x, y)
        this.activeNode = id
      }
    },

    genColor: function() {
      let ret = [];
      if(this.nextCol < 16777215){
        ret.push(this.nextCol & 0xff) // R
        ret.push((this.nextCol & 0xff00) >> 8) // G
        ret.push((this.nextCol & 0xff0000) >> 16) // B
        this.nextCol += 1;
      }
      const col = "rgb(" + ret.join(',') + ")";
      return col;

    },

    /**
     * Hide tooltip if it should be hidden
     * `shouldHideTooltip` is set to `true` on `mouseleave` of the circle node or tooltip
     * `shouldHideTooltip` is set to `false` on `mouseenter` of the circle node or tooltip
     */
    hideModelTooltip: function() {
      this.shouldHideTooltip = true
      clearTimeout(this.hideModelTooltipTimeout)

      this.hideModelTooltipTimeout = setTimeout(() => {
        if (this.shouldHideTooltip) {
          this.hoveredModel = {}
          this.shouldHideTooltip = false
        }
      }, 100)
    }
  }
}
</script>

<style lang='scss' scoped>
@import '@/assets/css/_variables.scss';

.hiddenCanvas {
  //display: none;
}

.data-model-graph {
  height: 100%;
  position: relative;
  width: 100%;
}

.chart-wrapper {
  background: #fff;
  position: relative;
  width: 100%;
}

.tooltip {
  opacity: 0;
  color: $purple_1;
  padding: 8px;
  position: absolute;
  z-index: 10;
  width: auto;
  border: 1px solid #DADADA;
  border-radius: 3px;
  background-color: $white;
  box-shadow: 0 2px 10px 0 rgba(0,0,0,0.15);
}

.chart {
  display: block;
  position: relative;
  height: 100%;
  width: 100%;
  z-index: 1;

  &.active {
    z-index: 2;
  }
}

.enable-chart-wrapper {
  align-items: center;
  display: flex;
  height: 100%;
  justify-content: center;
  position: absolute;
  top: 0;
  width: 100%;
  z-index: 3;
  left: 0;

  &.no-chart-data {
    background: rgba(64,69,84,0.86);
    z-index: 5;
    align-items: center;
    justify-content: center;
    color: #fff;

    p {
      max-width: 450px;
      margin: 0;
      text-align: center;
    }

    a {
      color: #fff;
      text-decoration: underline;

      &:hover, &:active {
        color: #fff;
        text-decoration: none;
      }
    }
  }
}

.enable-chart-message-wrapper {
  border-radius: 12px;
  background-color: $purple_1;
  cursor: pointer;
  padding: 10px 18px;
  width: auto;

  .enable-chart-message {
    color: $white;
    line-height: 14px;
    text-align: center;
  }
}
</style>
<style lang="scss">
.data-model-graph {
  .el-loading-mask {
    transition: none;
    z-index: 2
  }

  .node-text {
    overflow: visible;
  }
}
</style>
