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

import axios from 'axios'
import * as d3 from 'd3'
import { select } from 'd3-selection';

import { pathOr, propOr } from 'ramda'
import debounce from 'lodash/debounce'
import { mapState, mapActions, mapGetters } from 'vuex'

//import ModelTooltip from './ModelTooltip/ModelTooltip.vue'

import Request from '@/mixins/request'

// NOTE: Defining simulation variable in global scope becuase we need to initiate d3 force simulation
// within the context onf the renderChart function but we also need access to simulation in update chart function

// let simulation
let zoom

// Vue Component
export default {
  name: 'DataGridGraph',

  components: {
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
      recordSize: 12,
      cellOffset: 4,
      xOffset: 50,
      yOffset: 100,
      groupSpacing: 8,
      modelHeaderHeight: 14,
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
      filesPage: 0
    }
  },

  computed: {
    //will get whenever updated or changed. NOTE, we are just storing the model data in the component now
    ...mapState([
      'relationshipTypes',
      'config',
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
      'selectedStudy'
    ]),
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
      this.updateView()
    },
    selectedVisitRecords: function() {
      this.updateView()
    },
    selectedSampleRecords: function() {
      this.updateView()
    },
    //will be in component data
    filteredPatientsMetadata: function(){
      renderAfterFilter('patients', filteredPatientsMetadata)
    },
    filteredVisitsMetadata: function(){
      renderAfterFilter('visits', filteredVisitsMetadata)
    },
    filteredSamplesMetadata: function(){
      renderAfterFilter('samples', filteredSamplesMetadata)
    },
    /*
    filteredFilesMetadata: function(){
      ...
    },
    */
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
        console.log(`mouseX: ${mouseX} mouseY: ${mouseY} colKey: ${colKey} nodeData: ${nodeData}`)
        // eslint-disable-next-line
        vm.onHoverElement(nodeData, d.clientX, d.clientY)

      } else {
        vm.hideModelTooltip()
      }

    }
    //when an element is clicked, get its data and if it is a prev/ next, call appropriate function
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
      if (d.prev){
        // eslint-disable-next-line
        console.log(`mouseX: ${mouseX} mouseY: ${mouseY} colKey: ${colKey} nodeData: ${nodeData}`)
        //if currently clicking prev model attr
        vm.advancePage(d.displayName, prev);
    } elseif (d.next) {
      // eslint-disable-next-line
      console.log(`mouseX: ${mouseX} mouseY: ${mouseY} colKey: ${colKey} nodeData: ${nodeData}`)
      vm.advancePage(d.displayName, next);
    } //if its a record
      elseif (nodeData.parent){
        vm.onClickElement(nodeData, d.click, d.clientX, d.clientY)
      }
      }
    }
  ); // canvas listener/handler



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
    ...mapActions(['setAllParticipants','setAllVisits','setAllSamples','setShadedParticipants','setShadedVisits','setShadedSamples','setShadedFiles']), //include set all files potentially
    ...mapGetters(['userToken','shadedParticipants','shadedVisits','shadedSamples','shadedFiles']),

    //called when a record is clicked
    onClickElement(nodeData, click, x, y){
      //checking that its a record and not a model
      if (nodeData.parent && !nodeData.details){
        var parent = nodeData.parent;
        //parentname will determine what color we change the square to
        var parentName = parent.attr('modelName')
        //want to set color conditionally
        //need to advance click on the individual record. Most likely need to use the same process as in recordbind()..i.e. join
        click ++;
        if ((click)%2 == 0 ){
          //will fill with grey default (or do nothing) if it is first click or a 'clear' click
          var ctx = canvas.node().getContext('2d');
          //how do we grab the record we're interested in?
          var element = this.custom('custom.record');
          var node = d3.select(element);
          ctx.fillstyle ="#afb3b0";
          ctx.fillRect(node.attr('x'), node.attr('y'), node.attr('width'), node.attr('height'));
          //OR just do this below
          //d3.select(this).style("fill","#afb3b0");
          //eliminate repition of code in future versions
          switch (parentName){
            case 'patient':
            //we want to remove this record from our list of shaded records
              var curr_p = this.shadedParticipants;
              var removed_p = curr_p.filter(function(value, index, curr_p){
                return value != nodeData.recordId;
              });
              setShadedParticipants(removed_p);
              break;
            case 'visits':
              var curr_v = this.shadedVisits;
              var removed_v = curr_v.filter(function(value, index, curr_v){
                return value != nodeData.recordId;
              });
              setShadedVisits(removed_v);
              break;
            case 'samples':
              var curr_s = this.shadedSamples;
              var removed_s = curr_s.filter(function(value, index, curr_s){
                return value != nodeData.recordId;
              });
              setShadedSamples(removed_s);
              break;
            case 'files':
              var curr_selected_files = this.shadedFiles;
              var removed_f = curr_f.filter(function(value, index, curr_f){
                return value != nodeData.recordId;
              });
              setShadedFiles(removed_f);
          }
        }
        //clicks that shade the records depending on model
        if ((click)%2 == 1 ){
          //what they've selected vs what is related to their selection
          switch (parentName) {
            case 'patient':
                var curr_sshaded_participants = this.shadedParticipants;
                //before doing this, check to see if selectedCurr particpants is recordID or record object. If the latter, need to get
                //proper data from the current clicked node.
                //here, we want to get the current list of 'selected' records (can be empty), add our new selectoin to it,
                // and (optionally) filter duplicates. Then set new list to store.
                var prelist = curr_selected_participants.concat(nodeData.recordId);
                /*
                let filteredlist = prelist.filter((c, index) => {
                    return prelist.indexOf(c) === index;
                });
                */
                setShadedParticipants(prelist);
                //red square
                var ctx = canvas.node().getContext('2d');
                //how do we grab the record we're interested in?
                var element = this.custom('custom.record');
                var node = d3.select(element);
                ctx.fillstyle ="#d10a00";
                ctx.fillRect(node.attr('x'), node.attr('y'), node.attr('width'), node.attr('height'));
                //or just use d3.select(this).style("fill","#d10a00");
                //get related record data and set to store... see how Eric's filter gets related first
                break;
            case 'visits':
                var curr_selected_visits = this.shadedVisits;
                var prelist = curr_selected_visits.concat(nodeData.recordId);
                setShadedVisits(prelist);
                //blue
                var ctx = canvas.node().getContext('2d');
                //how do we grab the record we're interested in?
                var element = this.custom('custom.record');
                var node = d3.select(element);
                ctx.fillstyle ="#0049d1";
                ctx.fillRect(node.attr('x'), node.attr('y'), node.attr('width'), node.attr('height'));
                //or just use
                //d3.select(this).style("fill","#0049d1");
                break;
            case 'samples':
                var curr_selected_samples = this.shadedSamples;
                var prelist = curr_selected_samples.concat(nodeData.recordId);
                setShadedSamples(prelist);
                //yellow
                var ctx = canvas.node().getContext('2d');
                //how do we grab the record we're interested in?
                var element = this.custom('custom.record');
                var node = d3.select(element);
                ctx.fillstyle ="#f0cc00";
                ctx.fillRect(node.attr('x'), node.attr('y'), node.attr('width'), node.attr('height'));
                //or just use
                //d3.select(this).style("fill","#f0cc00");
                break;
            case 'files':
                var curr_selected_files = this.shadedFiles;
                var prelist = curr_selected_files.concat(nodeData.recordId);
                setShadedFiles(prelist);
                //green
                var ctx = canvas.node().getContext('2d');
                //how do we grab the record we're interested in?
                var element = this.custom('custom.record');
                var node = d3.select(element);
                ctx.fillstyle ="#06a600";
                ctx.fillRect(node.attr('x'), node.attr('y'), node.attr('width'), node.attr('height'));
                //or just use
                //d3.select(this).style("fill","#06a600");
          }
        }
        //saving current selected to store
      }
    },

    setAllRelatedFilter: function(modelname, startrecord, targetmodel, pagenumber){
        //need to reset the pages for all models
        this.participantsPage = pagenumber;
        this.visitsPage = pagenumber;
        this.samplesPage = pagenumber;
        this.filesPage =  pagenumber;
        var pagenum = pagenumber;
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
                  offset: `${offset}`,
                  recordOrderBy: `${orderBy}`,'externalparticipantid'
                  ascending: 'true',
                  includeIncomingLinkedProperties: 'false'
                },
                headers: {
                  Accept: 'application/json',
                  Authorization: `${this.userToken}`
                }
              };
          axios.request(options).then(function (response) {
              console.log(response.data);
              }).catch(function (error) {
              console.error(error);
              });
          //return should be an array of record objects
          return Object.values(response.data);

      },

    renderAfterFilter: function(model,filter_results){
      //sets the model that was filtered
      switch(model){
        case 'patient':
          this.selectedPatientRecords = filter_results
          this.selectedRecordCount['patient'] = filter_results.length
        break;
        case 'visits':
          this.selectedVisitRecords = filter_results
          this.selectedRecordCount['visit'] = filter_results.length
        break;
        case 'samples':
          this.selectedSampleRecords = filter_results
          this.selectedRecordCount['samples'] = filter_results.length
        break;
        case 'files':
          /*
          this.selectedFileRecords = filter_results
          this.selectedRecordCount['files'] = filter_results.length
          */
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
      // and (optionally) filter duplicates.
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
        /*
        this.selectedFileRecords = filtered_f_arr
        this.selectedRecordCount['files'] = filtered_f_arr.length
        */
      }
    },

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

    //clears record data for each model each time a new study is chosen (hopefully gets rid of residual record issue)
    clearRecordData: function() {
      this.selectedPatientRecords = []
      this.selectedRecordCount['patient'] = 0
      this.selectedVisitRecords = []
      this.selectedRecordCount['visits'] = 0
      this.selectedSampleRecords  = []
      this.selectedSampleRecords['samples'] = 0
    },

    updateStudyData: function() {
      clearRecordData()
      var modelList = ['patient','visits','samples'/*,'files'*/];
      // TODO: figure out pagenum
      var pagenum = 0;
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
  //updates model view according to current page. NOTE: add in logic for orderBy next
  updatePage: function(modelName, modelPage, orderBy, direction){
    //can't go back before the first page
    if (modelPage >= 0) {
      var vm = this;
      if (direction == 'next') {
        this.modelPage++;
        var pagenum = modelPage;
        var offset = 100*pagenum;
        const options = {
          method: 'GET',
          url: `https://api.pennsieve.io/models/v1/datasets/${vm.datasetId}/concepts/study/instances/${vm.selectedStudy.id}/relations/${modelName}`,
          params: {
              limit: '100',
              offset: `${offset}`,
              orderBy: `${orderBy}`,
              ascending: 'true'
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
      }
      //direction is prev
      else {
        this.modelPage--;
        var pagenum = modelPage;
        var offset = 100*pagenum;
        method: 'GET',
        url: `https://api.pennsieve.io/models/v1/datasets/${vm.datasetId}/concepts/study/instances/${vm.selectedStudy.id}/relations/${modelName}`,
        params: {
            limit: '100',
            offset: `${offset}`,
            orderBy: `${orderBy}`,
            ascending: 'true'
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
      }
    }
  },

  //fetches and sets store to entries on the 'next' page for each model. Will call from the page advance bar bound to each model bin
  //Should have forward and advance page as one function by setting forward or advance to the attrs of the arrows bounding box
  //NOTE: NEED TO ACCOUNT FOR THE CASE WHERE THIS IS FILTERED. MUST MAKE A MODIFIED CALL TO renderAfterFilter()
  advancePage: function(modelName, direction) {
    var orderBy = ''
    var modelPage = ''
    switch (modelName) {
      case 'patient':
          orderBy = 'externalparticipantid';//verify data is in a list, if not, put it in one before sending off
          modelPage = 'participantsPage';
          //clearing model data before updating
          this.selectedPatientRecords = [];
          this.selectedRecordCount['patient'] = 0;
          updatePage('patient', modelPage, orderBy, direction);
          break;
      case 'visits':
          orderBy = 'event date and time';
          modelPage = 'visitsPage';
          this.selectedVisitRecords = [];
          this.selectedRecordCount['visits'] = 0;
          updatePage('visits', modelPage, orderBy, direction);
          break;
      case 'samples':
          orderBy = 'study sample ID';
          modelPage = 'samplesPage';
          this.selectedSampleRecords  = [];
          this.selectedSampleRecords['samples'] = 0;
          updatePage('samples', modelPage, orderBy, direction);
          break;
      case 'files':
          modelPage = 'filesPage';
          console.log('nothing for files yet');
          updatePage('files', modelPage, orderBy, direction);
    }
  },
    // eslint-disable-next-line
    onHoverElement: function(nodeData, x, y) {
      // TODO: remove return
      return

      // eslint-disable-next-line no-unreachable
      if (nodeData) {
        // eslint-disable-next-line
        if (nodeData.parent && !nodeData.details) {
          // eslint-disable-next-line
          const modelId = nodeData.parent.id
          if (this.recordPool[modelId].unMapped.length === 0 && !this.recordPool[modelId].isPending) {
            console.log('Getting more records')
            this.fetchRecords(modelId)
          } else {
            const unMapped = this.recordPool[modelId].unMapped
            const randomIndex =Math.floor(Math.random() * unMapped.length);
            // eslint-disable-next-line
            nodeData.details = this.recordPool[modelId].records[ unMapped[randomIndex]]
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

      const offset = startIndex+(this.recordPool[modelId].nextPage * numberOfRecords)
      this.recordPool[modelId].isPending = true
      this.sendXhr(`${this.recordsUrl}/${modelId}/instances?limit=${numberOfRecords}&offset=${offset}`, {
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
        .attr('click',0)

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
          ctx.font = '12px "Helvetica Neue"';
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
          ctx.font = '12px "Helvetica Neue"';
          let xCoordPrev = parseInt(node.attr('x')) + 50
          let yCoordPrev = parseInt(node.attr('y')) - 5
          let pageTxtPrev = "< Previous"
          let xCoordNext = xCoordPrev + 70
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
      // this.shouldHideTooltip = false

      // this.shouldHideTooltip = true
      // clearTimeout(this.hideModelTooltipTimeout)
      //
      // this.hideModelTooltipTimeout = setTimeout(() => {
      //   if (this.shouldHideTooltip) {
      //     this.selectedNode = {}
      //     this.shouldHideTooltip = false
      //   }
      // }, 100)
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
