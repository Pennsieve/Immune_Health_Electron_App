 /* eslint-disable no-use-before-define, no-undef */
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
    <model-tooltip
      :model="hoveredModel"
      @mouseenter.native="shouldHideTooltip = false"
      @mouseleave.native="hideModelTooltip"
    />
  </div>
</template>

<script>

// TODO List
// 1. try out API call to get records in context of selected study
// 2. put returned records in store
// 3. add watch on store values, on change render grid graph
// 4. refactor mounted(): don't call getModelData()
// 5. refactor getModelData(): ??? ~ remove? ~ repurpose?
// 6. don't render until a study is selected
// 7. wait to render until "all changes" are complete

// CONSIDER:
// 1. performance and efficiency, esp. when iterating over a lot of records
import {
  // eslint-disable-next-line
  fetchFilteredPatientsMetadataRelatedToStudy,
  // eslint-disable-next-line
  fetchFilteredVisitsMetadataRelatedToStudy,
  // eslint-disable-next-line
  fetchFilteredSamplesMetadataRelatedToStudy,
  // eslint-disable-next-line
  GET_FILTERED_METADATA_RECORDS_ENDPOINT,
  // eslint-disable-next-line
  getQuery,
  // eslint-disable-next-line
  REQUEST_HEADER,
  // eslint-disable-next-line
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

import ModelTooltip from './ModelTooltip/ModelTooltip.vue'

import Request from '@/mixins/request'

// NOTE: Defining simulation variable in global scope becuase we need to initiate d3 force simulation
// within the context onf the renderChart function but we also need access to simulation in update chart function

// let simulation
let zoom

// Vue Component
export default {
  name: 'DataGridGraph',

  components: {
    ModelTooltip
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
      interestedModels: [/*'study',*/ 'patient', 'visits', 'samples'],
      selectedRecordCount: {
        'patient': 0,
        'visits': 0,
        'samples': 0,
        'files': 0
      },
      selectedPatientRecords: [],
      selectedVisitRecords: [],
      selectedSampleRecords: [],
      selectedFileRecords: [],
      participantsPage: 0,
      visitsPage: 0,
      samplesPage: 0,
      filesPage: 0,
      //these will house all of the records (all pages) when filters are applied
      patientsBacklog: [],
      visitsBacklog: [],
      samplesBacklog: [],
      filesBacklog: [],

      //filters: this.searchModalSearch.filters
    }
  },

  computed: {
    //will get whenever updated or changed. NOTE, we are just storing the model data in the component now
    ...mapState([
      'relationshipTypes',
      'config',
      /*
      'allSamples',
      'allVisits',
      'allParticipants',
      'allStudies',
      'currParticipants',
      'currVisits',
      'currSamples',
      'currFiles',
      'selectedCurrFile',
      'selectedCurrVisit',
      'selectedCurrParticipants',
      'selectedCurrSample',
      */
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
          console.log(this.selectedNode.details.id)
        }
      }
    },
    // userToken: {
    //   handler: function() {
    //     this.getModelData()
    //   }
    // },
    //whenever selected study changes, we want to get all of the related data and set them to the store
    //selectedStudy: {
    //  handler: function() {
    //    this.setAllRelatedPage1(this, this.selectedStudy,0);
    //  }
    //}

    selectedStudy: function() {
      console.log(`selectedStudy: ${this.selectedStudy.values[0].value}`)
      this.updateStudyData()
    },
    selectedPatientRecords: function() {
      console.log('updating view')
      this.updateView()
    },
    selectedVisitRecords: function() {
      console.log('updating view')
      this.updateView()
    },
    selectedSampleRecords: function() {
      console.log('updating view')
      this.updateView()
    },
    searchModalSearch: function(){
      //whenever a filter is added or subtracted from list
      this.handleFilterChangeSequential();

    }
  },

  mounted() {
    console.log(`mounted()`)
    let vm = this


    // d3.range(5000).forEach(function(el) {
    //   vm.data.push({ value: el });
    // })

    //this.canvasSize = {
    //  width: 1000,
    //  height: 1000
    //}

    var mainCanvas = d3.select('.mainCanvas')
      .attr('width', this.canvasSize.width)
      .attr('height', this.canvasSize.height);
    var hiddenCanvas = d3.select('.hiddenCanvas')
      .attr('width', this.canvasSize.width)
      .attr('height', this.canvasSize.height);

    var customBase = document.createElement('custom');
    this.custom = d3.select(customBase);

    // this.databind(this.data)

    this.drawTimer= d3.timer(function(elapsed) {
      vm.draw(mainCanvas, false);
      if (elapsed > 300) vm.drawTimer.stop();
    }); // Timer running the draw function repeatedly for 300 ms.

    d3.select('.mainCanvas').on('mousemove', function(d) {

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
      // eslint-disable-next-line
      if (nodeData){
        // eslint-disable-next-line
        //console.log(`mouseX: ${mouseX} mouseY: ${mouseY} colKey: ${colKey} nodeData: ${nodeData}`)
        // eslint-disable-next-line
        vm.onHoverElement(nodeData, d.clientX, d.clientY)

      } else {
        vm.hideModelTooltip()
      }

    });
    //when an element is clicked, get its data and if it is a prev/ next, call appropriate function
    // eslint-disable-next-line
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
      if (nodeData){
        // eslint-disable-next-line
      if (!nodeData.parent){ //i.e. if it is a model
        console.log(nodeData)
        var models = vm.custom.selectAll('custom.model');
        var xCoord = ''
        var yCoord = ''
        // eslint-disable-next-line
        models.each(function(d,i) { //iterate through models, find model x and y coords
          var node = d3.select(this);
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
        console.log(nodeData.displayName,mouseX,xCoord, yCoord)
        if (mouseX >= 115 && mouseX <= 215){
          // eslint-disable-next-line
          console.log(`CLICKED: PREVIOUS for: ${nodeData.displayName} mouseX: ${mouseX} mouseY: ${mouseY} colKey: ${colKey} nodeData: ${nodeData}`);
          //if currently clicking prev model attr
          // eslint-disable-next-line
          vm.advancePage(nodeData.displayName, 'prev');
        }
        // eslint-disable-next-line
     else if (mouseX >= 215){
      // eslint-disable-next-line
      console.log(`CLICKED: NEXT for: ${nodeData.displayName} mouseX: ${mouseX} mouseY: ${mouseY} colKey: ${colKey} nodeData: ${nodeData}`)
       // eslint-disable-next-line
      vm.advancePage(nodeData.displayName, 'next');
    }
  } //if its a record
      else if (nodeData.parent){
        // eslint-disable-next-line
        console.log(nodeData)

        console.log(`CLICKED: ${nodeData} mouseX: ${mouseX} mouseY: ${mouseY} colKey: ${colKey} nodeData: ${nodeData}`)
        console.log(nodeData)
        var records = vm.custom.selectAll('custom.record');// Grab all elements you bound data to in the databind() function.
        // eslint-disable-next-line no-unused-vars
        records.each(function(d,i) { // For each virtual/custom element...
          // eslint-disable-next-line
          var node = d3.select(this);   // This is each individual element in the loop.
          console.log(node);
          //ctx.fillStyle = hidden ? node.attr('fillStyleHidden') : node.attr('fillStyle');
          //ctx.fillRect(node.attr('x'), node.attr('y'), node.attr('width'), node.attr('height'));  // Here you retrieve the position of the node and apply it to the fillRect context function which will fill and paint the square.
        });

        //vm.onHoverElement(nodeData, d.clientX, d.clientY)
        //NOTE: must pass in the actual record data (i.e. nod.attr...)
        vm.onClickElement(nodeData, d.click, mouseX, mouseY)
      }
      }
    }); // canvas listener/handler



    // this.getModelData()
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
    ...mapActions(['updateSearchModalVisible', 'updateSearchModalSearch','setAllParticipants','setAllVisits','setAllSamples','setShadedParticipants','setShadedVisits','setShadedSamples','setShadedFiles']), //include set all files potentially
    ...mapGetters(['userToken','shadedParticipants','shadedVisits','shadedSamples','shadedFiles','searchModalSearch']),
/*
  //When a record is clicked, we want to add that as a filter and get the related records. We dont want to update the view for the current model (apart from coloring the selected record)
    async handleFilterChangeClick(nodeData, clickstatus) {
      const limit = 100
      const model = nodeData.parent.displayName;
      const identifier = nodeData.details.id
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

        var new_vis =  await axios.post(filteredRecordsUrl, samplesQuery, REQUEST_HEADER(token)).then(response => {
           return handleV2RecordsResponse(propOr([], 'data', response))
         })
         var visit_recs = new_vis.records;
         this.selectedVisitRecords = visit_recs;
        break;
        case 'visits':
        var offset = limit*this.samplesPage;
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
        //TO DO: for samples, we want to have the selection influence files that are returned.
        case 'samples'
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
    else if (clickstatus == 'unclick'){
    switch(model){
      case 'patient':
      var offset = limit*this.visitsPage
      var filteredRecordsUrl = `${GET_FILTERED_METADATA_RECORDS_ENDPOINT}?limit=${limit}&offset=${offset}`
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
      var newFilters = newFilters.filter(function(entry) {
        return entry != remove1;
      });
       var  visitsQuery = await getQuery('visits', newFilters, token)

      var new_vis =  await axios.post(filteredRecordsUrl, samplesQuery, REQUEST_HEADER(token)).then(response => {
         return handleV2RecordsResponse(propOr([], 'data', response))
       })
       var visit_recs = new_vis.records;
       this.selectedVisitRecords = visit_recs;
      break;
      case 'visits':
      var offset = limit*this.samplesPage;
      var filteredRecordsUrl = `${GET_FILTERED_METADATA_RECORDS_ENDPOINT}?limit=${limit}&offset=${offset}`
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
      var newFilters = newFilters.filter(function(entry) {
        return entry != remove2;
      });
      var  visitsQuery2 = await getQuery('samples', newFilters, token)

     var new_samp =  await axios.post(filteredRecordsUrl, visitsQuery2, REQUEST_HEADER(token)).then(response => {
        return handleV2RecordsResponse(propOr([], 'data', response))
      })
      var sample_recs = new_samp.records;
      this.selectedSampleRecords = sample_recs;
      break;
      //TO DO: for samples, we want to have the selection influence files that are returned.
      case 'samples'
      var newFilters = clone(this.searchModalSearch.filters)
      break;
    }
  }
    },
*/
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


    //called when a record is clicked
    // eslint-disable-next-line
    onClickElement(nodeData, click, x, y){
      //checking that its a record and not a model
      console.log('executing click element')
      if (nodeData.parent){
        console.log('has a parent')
        var parent = nodeData.parent;
        //parentname will determine what color we change the square to
        var parentName = parent.displayName
        //want to set color conditionally
        //need to advance click on the individual record. Most likely need to use the same process as in recordbind()..i.e. join
// eslint-disable-next-line
        nodeData.click_count ++;
        //NOTE: must figure out how to actually access this!
        // eslint-disable-next-line
        if ((nodeData.click_clickcount)%2 == 0 ){
          //will fill with grey default (or do nothing) if it is first click or a 'clear' click
          // eslint-disable-next-line
          var ctx = canvas.node().getContext('2d');
          //how do we grab the record we're interested in?
          // eslint-disable-next-line
          ctx.fillstyle ="#afb3b0";
          //ACTUALLY:
            //ctx.fillRect(node.attr('x'), node.attr('y'), node.attr('width'), node.attr('height'));
            //vm.draw(mainCanvas,false); //or this.draw(mainCanvas,false);
          switch (parentName){
            case 'patient':
            //we want to remove this record from our list of shaded records
            // eslint-disable-next-line
              var curr_p = this.shadedParticipants;
              // eslint-disable-next-line
              var removed_p = curr_p.filter(function(value, index, curr_p){
                return value != nodeData.details.id;
              });
              // eslint-disable-next-line
              setShadedParticipants(removed_p);
              // eslint-disable-next-line
              //handleFilterChangeClick(nodeData, unclick);
              break;
            case 'visits':
            // eslint-disable-next-line
              var curr_v = this.shadedVisits;
              // eslint-disable-next-line
              var removed_v = curr_v.filter(function(value, index, curr_v){
                return value != nodeData.details.id;
              });
              // eslint-disable-next-line
              setShadedVisits(removed_v);
              // eslint-disable-next-line
              //handleFilterChangeClick(nodeData, unclick);
              break;
            case 'samples':
            // eslint-disable-next-line
              var curr_s = this.shadedSamples;
              // eslint-disable-next-line
              var removed_s = curr_s.filter(function(value, index, curr_s){
                return value != nodeData.details.id;
              });
              // eslint-disable-next-line
              setShadedSamples(removed_s);
              // eslint-disable-next-line
              //handleFilterChangeClick(nodeData, unclick);
              break;
            case 'files':
              var curr_selected_files = this.shadedFiles;
              // eslint-disable-next-line
              var removed_f = curr_f.filter(function(value, index, curr_f){
                return value != nodeData.details.id;
              });
              // eslint-disable-next-line
              setShadedFiles(removed_f);
              // eslint-disable-next-line
              //handleFilterChangeClick(nodeData, unclick);
          }
        }
        //clicks that shade the records depending on model
        // eslint-disable-next-line
        else if ((nodeData.click_count)%2 == 1 ){
          //what they've selected vs what is related to their selection
          switch (parentName) {
            case 'patient':
            // eslint-disable-next-line
                var curr_shaded_participants = this.shadedParticipants;
                //before doing this, check to see if selectedCurr particpants is recordID or record object. If the latter, need to get
                //proper data from the current clicked node.
                //here, we want to get the current list of 'selected' records (can be empty), add our new selectoin to it,
                // and (optionally) filter duplicates. Then set new list to store.
                // eslint-disable-next-line
                var prelist = curr_selected_participants.concat(nodeData.details.id);
                /*
                let filteredlist = prelist.filter((c, index) => {
                    return prelist.indexOf(c) === index;
                });
                */
                // eslint-disable-next-line
                setShadedParticipants(prelist);
                // eslint-disable-next-line
                //handleFilterChangeClick(nodeData, click);
                //red square
                //NOTE: use the same process as in the section above
                // eslint-disable-next-line
                // eslint-disable-next-line
                var ctx = canvas.node().getContext('2d');
                //how do we grab the record we're interested in?
                // eslint-disable-next-line
                var element = this.custom('custom.record');
                // eslint-disable-next-line
                var node = d3.select(element);
                // eslint-disable-next-line
                ctx.fillstyle ="#d10a00";
                // eslint-disable-next-line
                ctx.fillRect(node.attr('x'), node.attr('y'), node.attr('width'), node.attr('height'));
                //or just use d3.select(this).style("fill","#d10a00");
                //get related record data and set to store... see how Eric's filter gets related first
                break;
            case 'visits':
                var curr_selected_visits = this.shadedVisits;
                // eslint-disable-next-line
                var prelist = curr_selected_visits.concat(nodeData.details.id);
                // eslint-disable-next-line
                setShadedVisits(prelist);
                // eslint-disable-next-line
                //handleFilterChangeClick(nodeData, click);
                //blue
                // eslint-disable-next-line
                var ctx = canvas.node().getContext('2d');
                //how do we grab the record we're interested in?
                // eslint-disable-next-line
                var element = this.custom('custom.record');
                // eslint-disable-next-line
                var node = d3.select(element);
                ctx.fillstyle ="#0049d1";
                // eslint-disable-next-line
                ctx.fillRect(node.attr('x'), node.attr('y'), node.attr('width'), node.attr('height'));
                //or just use
                //d3.select(this).style("fill","#0049d1");
                break;
            case 'samples':
            // eslint-disable-next-line
                var curr_selected_samples = this.shadedSamples;
                // eslint-disable-next-line
                var prelist = curr_selected_samples.concat(nodeData.details.id);
                // eslint-disable-next-line
                setShadedSamples(prelist);
                // eslint-disable-next-line
                //handleFilterChangeClick(nodeData, click);
                //yellow
                // eslint-disable-next-line
                var ctx = canvas.node().getContext('2d');
                //how do we grab the record we're interested in?
                // eslint-disable-next-line
                var element = this.custom('custom.record');
                // eslint-disable-next-line
                var node = d3.select(element);
                // eslint-disable-next-line
                ctx.fillstyle ="#f0cc00";
                // eslint-disable-next-line
                ctx.fillRect(node.attr('x'), node.attr('y'), node.attr('width'), node.attr('height'));
                //or just use
                //d3.select(this).style("fill","#f0cc00");
                break;
            case 'files':
            // eslint-disable-next-line
                var curr_selected_files = this.shadedFiles;
                // eslint-disable-next-line
                var prelist = curr_selected_files.concat(nodeData.details.id);
                // eslint-disable-next-line
                setShadedFiles(prelist);
                // eslint-disable-next-line
                //handleFilterChangeClick(nodeData, click);
                //green
                // eslint-disable-next-line
                var ctx = canvas.node().getContext('2d');
                //how do we grab the record we're interested in?
                // eslint-disable-next-line
                var element = this.custom('custom.record');
                // eslint-disable-next-line
                var node = d3.select(element);
                // eslint-disable-next-line
                ctx.fillstyle ="#06a600";
                // eslint-disable-next-line
                ctx.fillRect(node.attr('x'), node.attr('y'), node.attr('width'), node.attr('height'));
                //or just use
                //d3.select(this).style("fill","#06a600");
          }
        }
        //saving current selected to store
      }
    },

  /*
//DEPRECATED with new API endpoint
    setAllRelatedFilter: function(modelname, startrecord, targetmodel, pagenumber){
        //need to reset the pages for all models
        this.participantsPage = pagenumber;
        this.visitsPage = pagenumber;
        this.samplesPage = pagenumber;
        this.filesPage =  pagenumber;
        // eslint-disable-next-line
        var pagenum = pagenumber;
        // eslint-disable-next-line
        var offset = 0;
        var orderBy = '';
          switch (targetmodel) {
            case 'patient':
                orderBy = 'externalparticipantid';//verify data is in a list, if not, put it in one before sending off
                break;
            case 'visits':
                orderBy = 'event date and time'
                break;
            case 'samples':
                orderBy = 'study sample ID';
                break;
            case 'files':
                console.log('nothing for files yet');
          }
          const options = {
              method: 'GET',
              url: `https://api.pennsieve.io/models/v1/datasets/%2FN%3Adataset%3Ae2de8e35-7780-40ec-86ef-058adf164bbc/concepts/${modelname}/instances/${startrecord}/relations/${targetmodel}`,
              params: {
                  limit: '100',
                  // eslint-disable-next-line
                  offset: `${offset}`,
                  recordOrderBy: `${orderBy}`,
                  ascending: 'true',
                  includeIncomingLinkedProperties: 'false'
                },
                headers: {
                  Accept: 'application/json',
                  Authorization: `${this.userToken}`
                }
              };
              // eslint-disable-next-line
          axios.request(options).then(function (response) {
            // eslint-disable-next-line
              console.log(response.data);
              }).catch(function (error) {
              console.error(error);
              });
          //return should be an array of record objects
          // eslint-disable-next-line
          return Object.values(response.data);

      },
    */
    /*
    //DEPRECATED with new API endpoint
    renderAfterFilter: function(model,filter_results){

      //...first, get all of the records from the first backlog into a flat array, then
      //for each element, call the get related api and put into backlog, order entire thing by property according to
      //model type, then break up into sublists 100 elements each...
      //sets the model that was filtered
      switch(model){
        case 'patient':
          var flat_arr = this.patientsBacklog.flat();
          var other_models = ['visits','samples','files']
          for (model in other_models){
          for (x in flat_arr){
            //get the related records for each model, and put into backlog for model

          }
        }
        break;
        case 'visits':
          var other_models = ['patient','samples','files']
          var flat_arr = this.visitsBacklog.flat();
          for (model in other_models){
            for (x in flat_arr){

            }
          }
        break;
        case 'samples':
          var other_models = ['patient','visits','files']
          var flat_arr = this.samplesBacklog.flat();
          for (model in other_models){
            for (x in flat_arr){

            }
          }
        break;
        case 'files':
          var other_models = ['patient','visits','samples']
          var flat_arr = this.filesBacklog.flat();
          for (model in other_models){
            for (x in flat_arr){

            }
          }

          //this.selectedFileRecords = filter_results
          //this.selectedRecordCount['files'] = filter_results.length

      }
      //array of records that will be set in the store after iteration
      var temp_p_arr = [];
      var temp_v_arr = [];
      var temp_s_arr = [];
      var temp_f_arr = [];
      //need to look at objects returned in list (id'd by either name or displayname)...
      //we are assuming that the model name is heterogeneous here
      var ex_list = ['patient','visits','samples','files'];
      let ex_list2 = ex_list.filter(function(value) {
        return value != model; });
        //for each element of the filtered result list, get the related records of each other model type
        for (var y = 0; y <filter_results.length; y++){
          ex_list2.forEach((x, i) =>
          switch(x){
            case 'patient':
              temp_p_arr.push(setAllRelatedFilter(model,filter_results[y],'patient',0);)
            break;
            case 'vist':
              temp_v_arr.push(setAllRelatedFilter(model,filter_results[y],'visits',0);)
            break;
            case 'sample':
              temp_s_arr.push(setAllRelatedFilter(model,filter_results[y],'samples',0);)
            break;
            case 'file':
              temp_s_arr.push(setAllRelatedFilter(model,filter_results[y],'files',0);)
          }
          );
        }
      }
      }
      //eliminating duplicates in each array and setting variables
      //here we don't want to overwrite the model that we're filtering by. Check this
      if(model != 'patient'){
        let filtered_p_arr = temp_p_arr.filter((c, index) => {return temp_p_arr.indexOf(c) === index;});
        //NOTE:beforte doing this, check what type of date this setter expects
        this.selectedPatientRecords = filtered_p_arr
        this.selectedRecordCount['patient'] = filtered_p_arr.length
      }
      if (model != 'visit'){
        let filtered_v_arr = temp_v_arr.filter((c, index) => {return temp_v_arr.indexOf(c) === index;});
        this.selectedVisitRecords = filtered_v_arr
        this.selectedRecordCount['visits'] = filtered_v_arr.length
      }
      if (model != 'sample'){
        let filtered_s_arr = temp_s_arr.filter((c, index) => {return temp_s_arr.indexOf(c) === index;});
        this.selectedSampleRecords = filtered_s_arr
        this.selectedRecordCount['samples'] = filtered_s_arr.length
      }
      if (model != 'file'){
        let filtered_f_arr = temp_f_arr.filter((c, index) => {return temp_f_arr.indexOf(c) === index;});
        //this.selectedFileRecords = filtered_f_arr
        //this.selectedRecordCount['files'] = filtered_f_arr.length

      }
    },
    */

    loadModelData: function() {
      console.log(`loadModelData()`)
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
      console.log(`bindModelData()`)
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
          return d.numRows * vm.cellSize + (d.numRows - 1) * vm.groupSpacing
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

    //clears record data for each model each time a new study is chosen (hopefully gets rid of residual record issue)
    // eslint-disable-next-line
    clearRecordData: function() {
      this.selectedPatientRecords = []
      this.selectedRecordCount['patient'] = 0
      this.selectedVisitRecords = []
      this.selectedRecordCount['visits'] = 0
      this.selectedSampleRecords  = []
      this.selectedSampleRecords['samples'] = 0
    },
    clearBacklogData: function(){
      this.patientsBacklog = []
      this.visitsBacklog = []
      this.samplesBacklog = []
      this.filesBacklog = []
    },
    updateStudyData: function() {
      // eslint-disable-next-line
      this.clearRecordData()
      this.clearBacklogData()
      var modelList = ['patient','visits','samples'/*,'files'*/];
      // TODO: figure out pagenum
      // eslint-disable-next-line
      var pagenum = 0;
      // eslint-disable-next-line
      var offset = 100*pagenum;
      // eslint-disable-next-line no-unused-vars
      var orderBy = '';

      var vm = this
      modelList.forEach(function (modelName){
        switch (modelName) {
          case 'patient':
              orderBy = 'externalparticipantid';//verify data is in a list, if not, put it in one before sending off
              break;
          case 'visits':
              orderBy = 'event date and time'
              //this.setAllVisits(response.data);
              break;
          case 'samples':
              orderBy = 'study sample ID';
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
        });
      })
    },

    updatePatients: function(data) {
      console.log('updatePatients() data:')
      console.log(data)
      this.selectedPatientRecords = data
      this.selectedRecordCount['patient'] = data.length
    },

    updateVisits: function(data) {
      console.log('updateVisits() data:')
      console.log(data)
      this.selectedVisitRecords = data
      this.selectedRecordCount['visits'] = data.length
    },

    updateSamples: function(data) {
      console.log('updateSamples() data:')
      console.log(data)
      this.selectedSampleRecords  = data
      this.selectedSampleRecords['samples'] = data.length
    },

    updateView: function() {
      console.log(`updateView()`)

      this.nextCol = 1 //reset hidden Canvas color scheme
      this.colorToNode = {}
      this.startIndex = 0
      this.recordData = {}
      this.recordPool = {}

      var vm = this
      vm.modelData.map(x => {
        console.log(`updateView() x: ${x.name}`)
        //some fixed width that we will decide on
        // TODO: clean up recordCount and x.count (use just one)
        let recordCount = vm.selectedRecordCount[x.name]
        console.log(`number of (1) '${x.name}' records: ${recordCount}`)
        x.count = recordCount
        console.log(`number of (2) '${x.name}' records: ${x.count}`)
        let numElem = recordCount < 100 ? recordCount : 100
        let recs = d3.range(vm.startIndex, vm.startIndex + numElem ).map(function(el) {
            return {
              id: el,
              recordIndex: el-vm.startIndex,
              parent: x,
              recordId: null,
              details: null,
            }
          })

          vm.startIndex += numElem

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

      this.bindModelData()
      this.recordbind()
      var mainCanvas = d3.select('.mainCanvas')
      var hiddenCanvas = d3.select('.hiddenCanvas')
      vm.draw(hiddenCanvas, true)
      this.drawTimer.restart(function(elapsed) {
        vm.draw(mainCanvas, false);
        if (elapsed > 600) vm.drawTimer.stop();
      })
    },
// eslint-disable-next-line
updatePageHelper: async function(modelName,pagenum,orderBy){
          //var vm = this;
          console.log('entering update page helper')
          //filtered is false and we just grab the next page of records
        // eslint-disable-next-line
        var offset = 100*pagenum;
        console.log('offset is:', offset)
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
              //error with filter array. Must address
              if (this.searchModalSearch.filters == undefined){
                var pmetadata = await fetchFilteredPatientsMetadataRelatedToStudy(this.selectedStudy.id, [], this.userToken(), 100, offset)
              }else{
              // eslint-disable-next-line
              var pmetadata = await fetchFilteredPatientsMetadataRelatedToStudy(this.selectedStudy.id, this.searchModalSearch.filters, this.userToken(), 100, offset)
              }
              var p_record_results = pmetadata.records
              //ORDERBY TODO
               console.log("updating patient data")
                  //verify data is in a list, if not, put it in one before sending off
                  this.updatePatients(p_record_results);
                  break;
              case 'visits':
              if (this.searchModalSearch.filters == undefined){
                var vmetadata = await fetchFilteredVisitsMetadataRelatedToStudy(this.selectedStudy.id, [], this.userToken(), 100, offset)
              }else{
              // eslint-disable-next-line
              var vmetadata = await fetchFilteredVisitsMetadataRelatedToStudy(this.selectedStudy.id, this.searchModalSearch.filters, this.userToken(), 100, offset)
              }
                  var v_record_results = vmetadata.records
                  this.updateVisits(v_record_results);
                  break;
              case 'samples':
              if (this.searchModalSearch.filters == undefined){
                var smetadata = await fetchFilteredSamplesMetadataRelatedToStudy(this.selectedStudy.id, [], this.userToken(), 100, offset)
              }else{
              // eslint-disable-next-line
              var smetadata = await fetchFilteredSamplesMetadataRelatedToStudy(this.selectedStudy.id, this.searchModalSearch.filters, this.userToken(), 100, offset)
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
    console.log('update page executing')
      var vm = this;
      // eslint-disable-next-line
        // eslint-disable-next-line
        var pagenum = ''
          //if this model has been filtered, we want to get its page from the backlog and set it to selected
          switch (modelName){
              case 'patient':
              if (this.participantsPage >= 0) {
                if (direction == 'next') {
                  console.log('participant page is incrementing by 1')
                  this.participantsPage++;
                  pagenum = this.participantsPage;
                  console.log(this.participantsPage)
                  }
                  else if(direction == 'prev'){
                    console.log('participant page is decrementing by 1')
                    this.participantsPage--;
                    pagenum = this.participantsPage;
                    console.log(this.participantsPage)
                  }
                  vm.updatePageHelper('patient',pagenum,orderBy)
                }
                  break;
              case 'visits':
              // eslint-disable-next-line
              if (this.visitsPage >= 0) {
                if (direction == 'next') {
                  console.log('visits page is incrementing by 1')
                  this.visitsPage++;
                  pagenum = this.visitsPage;
                  console.log(this.visitsPage)
                  }
                  else if(direction == 'prev'){
                    console.log('visits page is decrementing by 1')
                    this.visitsPage--;
                    pagenum = this.visitsPage;
                    console.log(this.visitsPage)
                  }
                  vm.updatePageHelper('visits',pagenum,orderBy)
                }
                  break;
              case 'samples':
              if (this.samplesPage >= 0) {
                if (direction == 'next') {
                  console.log('samples page is incrementing by 1')
                  this.samplesPage++;
                  pagenum = this.samplesPage;
                  console.log(this.samplesPage)
                  }
                  else if(direction == 'prev'){
                    console.log('samples page is decrementing by 1')
                    this.samplesPage--;
                    pagenum = this.samplesPage;
                    console.log(this.samplesPage)
                  }
                  vm.updatePageHelper('samples',pagenum,orderBy)
                }
                  break;
              case 'files':
                  console.log('nothing for files yet');
          }
},

  //fetches and sets store to entries on the 'next' page for each model. Will call from the page advance bar bound to each model bin
  //Should have forward and advance page as one function by setting forward or advance to the attrs of the arrows bounding box
  //NOTE: NEED TO ACCOUNT FOR THE CASE WHERE THIS IS FILTERED. MUST MAKE A MODIFIED CALL TO renderAfterFilter()
  //NOTE: when filter is applied, we can grab next element of backlog rather than make an api call
  // eslint-disable-next-line
  advancePage: function(modelName, direction) {
    console.log('advancepage executing')
    var orderBy = ''
    var modelPage = ''
    console.log("modelname is", modelName)
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
      // TODO: remove return
      //return

      // eslint-disable-next-line no-unreachable
      if (nodeData) {
        // eslint-disable-next-line
        if (nodeData.parent && !nodeData.details) {
          // eslint-disable-next-line
          console.log('no details yet')
          const modelId = nodeData.parent.id
          if (this.recordPool[modelId].unMapped.length === 0 && !this.recordPool[modelId].isPending) {
            console.log('Getting more records')
            this.fetchRecords(modelId)
          } else {
            const unMapped = this.recordPool[modelId].unMapped
            const randomIndex =Math.floor(Math.random() * unMapped.length);
            // eslint-disable-next-line
            nodeData.details = this.recordPool[modelId].records[ unMapped[randomIndex]]
            console.log(nodeData.details)
            unMapped.splice(randomIndex, 1)
          }
        }
        else {
          // eslint-disable-next-line
          this.selectedNode = nodeData

          const tooltip = select('.model-tooltip')

          this.shouldHideTooltip = false
          // eslint-disable-next-line
          this.hoveredModel = nodeData.details

          tooltip.style('transform', `translate(${x}px, ${y + 20}px)`)

        }
      }
      else {
        this.shouldHideTooltip = false

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
      var join = this.custom.selectAll('custom.record')
        .data(this.getRecordData);

      let vm = this
      var enterSel = join.enter()
        .append('custom')
        .attr('class', 'record')


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
        .attr('fillStyle', '#C8C7C7 ')
        .attr('fillStyleHidden', function(d) {
          d.hiddenCol = vm.genColor();
          vm.colorToNode[d.hiddenCol] = d;
          return d.hiddenCol;
        })
        //will be the click counter for a given record and will be initialized to 0 for every record
        // eslint-disable-next-line
        .attr('click_count',0)
        .attr('modelName', function(d) {return d.displayName})

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
    draw: function(canvas, hidden) {
      //console.log(`draw() hidden: ${hidden}`)

      // MODEL-AREAS)
      var ctx = canvas.node().getContext('2d');
      ctx.clearRect(0, 0, this.canvasSize.width, this.canvasSize.height); // Clear the canvas.
      var models = this.custom.selectAll('custom.model');// Grab all elements you bound data to in the databind() function.

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
      this.selectedNode = {}
       this.shouldHideTooltip = false

       this.shouldHideTooltip = true
       clearTimeout(this.hideModelTooltipTimeout)

       this.hideModelTooltipTimeout = setTimeout(() => {
         if (this.shouldHideTooltip) {
           this.selectedNode = {}
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
