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
  fetchFilteredPatientsMetadataRelatedToStudy,
  fetchFilteredVisitsMetadataRelatedToStudy,
  fetchFilteredSamplesMetadataRelatedToStudy,
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
      activeNode: '',
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
      visibleRecordCount: {
        'patient': 0,
        'visits': 0,
        'samples': 0,
        'files': 0
      },
      visiblePatientRecords: [],
      visibleVisitsRecords: [],
      visibleSamplesRecords: [],
      participantsPage: 0,
      visitsPage: 0,
      samplesPage: 0,
      filesPage: 0,
      selectedStudyTrigger: false,
      // These are the local filters that get applied when a user clicks on a record in the grid. These filters are used in conjunction with
      // searchModalSearch.filters to create the grid of filtered record results along with their associated files
      clickedRecordsFilters: [],
      clickedAPatient: false,
      clickedAVisit: false
    }
  },

  computed: {
    //will get whenever updated or changed. NOTE, we are just storing the model data in the component now
    ...mapState([
      'relationshipTypes',
      'config',
      'selectedStudy',
      'searchModalSearch',
      'filterApplicationCount',
      'shadedVisits',
      'shadedSamples',
      'shadedParticipants',
      'selectedStudyName'
    ]),
    ...mapGetters(['userToken','triggerForClearing','linkingTarget']),
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
    selectedStudy: function() {
      this.selectedStudyTrigger = true;
      this.updateStudyDataV2().then(() => {
        this.updateView()
        this.selectedStudyTrigger = false;
        this.clickedRecordsFilters = []
      })
    },
    visiblePatientRecords: function(){
    if (this.selectedStudyTrigger == false){
        this.updateView()
      }
    },
    visibleVisitsRecords: function(){
    if (this.selectedStudyTrigger == false){
        this.updateView()
      }
    },
    visibleSamplesRecords: function(){
    if (this.selectedStudyTrigger == false){
        this.updateView()
      }
    },
    /*
    'searchModalSearch.filters': function(){
      //whenever a filter is added or subtracted from list it will update the downstream elements
      this.handleFilterChangeSequential();

    },
    */
    filterApplicationCount: function(){
      this.handleFilterChangeSequential()
    },

    triggerForClearing: function(){
      var shadedarr = []
      var p = this.shadedParticipants
      var v = this.shadedVisits
      var s = this.shadedSamples
      shadedarr = shadedarr.push(p)
      shadedarr = shadedarr.push(v)
      shadedarr = shadedarr.push(s)
      for (const x of shadedarr){
        for (const y of x){
          this.onClickElement(y) //will trigger branch of code that sets click to 0
        }
      }
    },
    clickedRecordsFilters (newFilters) {
      this.$emit('record-clicked', newFilters)
    },
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
    ...mapActions(['updateSearchModalVisible', 'updateSearchModalSearch','setAllParticipants','setAllVisits','setAllSamples','setShadedParticipants','setShadedVisits','setShadedSamples','setShadedFiles','setLinkingTarget','updatefilterApplicationCount']), //include set all files potentially

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
          if (nodeData.parent) {
            // it is a record
            vm.mouseClickRecord(nodeData)
          } else {
            // it is a model
            vm.mouseClickModel(nodeData, mouseX)
          }
        }
      })
    },

    mouseClickModel: function(nodeData, mouseX) {
      const vm = this
      const models = vm.custom.selectAll('custom.model');
      // const colKey = nodeData.hiddenCol
      // eslint-disable-next-line
      let xCoord = ''
      // eslint-disable-next-line
      let yCoord = ''
      // eslint-disable-next-line
      models.each(function(d,i) { //iterate through models, find model x and y coords
        let node = d3.select(this);
        if (node.attr('modelName') == nodeData.displayName){
          // eslint-disable-next-line
          xCoord = node.attr('x')
          // eslint-disable-next-line
          yCoord = node.attr('y')
        }
      });
      /*
      var yStartPrev = yCoord - 35
      var  xStartPrev = xCoord +70
      var  xStopPrev = xCoord +140
      var  xStopNext = xCoord +250
      */
      if (mouseX >= 115 && mouseX <= 215){
        //if currently clicking prev model attr
        // eslint-disable-next-line
        vm.advancePage(nodeData.displayName, 'prev');
      }
      // eslint-disable-next-line
      else if (mouseX >= 215){
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
        vm.onClickElement(nodeData, selectedRecord, false)// , d.click, mouseX, mouseY)
      }
    },

    removeClickedRecordsFiltersWithTarget(target) {
      this.clickedRecordsFilters = this.clickedRecordsFilters.filter(clickedFilter => {
        return clickedFilter.target != target
      })
    },

    removeClickedFilterWithValue(target, value) {
      this.clickedRecordsFilters = this.clickedRecordsFilters.filter(clickedFilter => {
        return !(clickedFilter.target == target && clickedFilter.value == value)
      })
    },
    // clicked filters can only be the equals operation for now i.e. filter by the clicked records identifier
    addClickedFilter(property, target, value) {
      this.clickedRecordsFilters.push({
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
        property: property,
        propertyLabel: property,
        propertyType: {format: null, type: "String"},
        target: target,
        targetLabel: target,
        type: "model",
        value: value
      })
    },

    //When a record is clicked, we want to add that as a local filter and get the related records.
    // We dont want to update the view for the current model (apart from coloring the selected record)
    handleFilterChangeClick: async function(nodeData, clickstatus) {
      const limit = 100
      const model = nodeData.parent.displayName;
      const identifier = nodeData.details.values[0].value
      const visitsOffset = limit*this.visitsPage;
      const samplesOffset = limit*this.samplesPage;
      var filters = []
      var filteredVisitsRecordsResponse = {}
      var filteredSamplesRecordsResponse = {}

      // get identifier from nodedata (use inspector)
      // if a user selects a record then filter records by its identifier.
      // If the user un-selects a record then remove that filter
      if (clickstatus == 'click'){
        switch(model) {
          case 'patient':
            //this.clearVisitRecordData()
            //this.clearSamplesRecordData()
            // We will first remove any previous filters that might no longer apply
            // i.e. the user has already clicked a visit or sample record and then clicked a patient record after
            this.removeClickedRecordsFiltersWithTarget('visits')
            this.removeClickedRecordsFiltersWithTarget('samples')
            // add the clicked patient record as a filter
            this.addClickedFilter("externalparticipantid", model, identifier)
            filters = this.searchModalSearch.filters.concat(this.clickedRecordsFilters)

            filteredVisitsRecordsResponse = await fetchFilteredVisitsMetadataRelatedToStudy(this.selectedStudy, filters, this.userToken, limit, visitsOffset)
            filteredSamplesRecordsResponse = await fetchFilteredSamplesMetadataRelatedToStudy(this.selectedStudy, filters, this.userToken, limit, samplesOffset)

            // update the visits and samples records with the new filter being applied
            this.clickedAPatient = true
            this.visibleVisitsRecords = filteredVisitsRecordsResponse.records
            this.visibleSamplesRecords = filteredSamplesRecordsResponse.records
            break;
          case 'visits':
          //this.clearSamplesRecordData()
            // We will first remove any previous filters that might no longer apply
            // i.e. the user has already clicked a sample record and then clicked a visit record after
            this.removeClickedRecordsFiltersWithTarget('samples')
            // add the clicked visit record as a filter
            this.addClickedFilter("visit_event_id", model, identifier)
            filters = this.searchModalSearch.filters.concat(this.clickedRecordsFilters)

            filteredSamplesRecordsResponse = await fetchFilteredSamplesMetadataRelatedToStudy(this.selectedStudy, filters, this.userToken, limit, samplesOffset)

            // update the samples records with the new filter being applied
            this.clickedAVisit = true
            this.visibleSamplesRecords = filteredSamplesRecordsResponse.records
            break;
          case 'samples':
            // add the clicked sample record as a filter
            this.addClickedFilter("study_sample_id", model, identifier)
            break;
        }
      } else if (clickstatus == 'unclick') {
        // Remove filter that have been unclicked
        // No need to first remove any previous filters because removing filters can only broaden the search so all filters should still apply
        this.removeClickedFilterWithValue(model, identifier)
        filters = this.searchModalSearch.filters.concat(this.clickedRecordsFilters)

        switch(model) {
          case 'patient':
            filteredVisitsRecordsResponse = await fetchFilteredVisitsMetadataRelatedToStudy(this.selectedStudy, filters, this.userToken, limit, visitsOffset)
            filteredSamplesRecordsResponse = await fetchFilteredSamplesMetadataRelatedToStudy(this.selectedStudy, filters, this.userToken, limit, samplesOffset)
            this.clickedAPatient = true
            this.visibleVisitsRecords = filteredVisitsRecordsResponse.records
            this.visibleSamplesRecords = filteredSamplesRecordsResponse.records
            break;
          case 'visits':
            filteredSamplesRecordsResponse = await fetchFilteredSamplesMetadataRelatedToStudy(this.selectedStudy, filters, this.userToken, limit, samplesOffset)
            this.clickedAVisit = true
            this.visibleSamplesRecords = filteredSamplesRecordsResponse.records
            break;
          case 'samples':
            // No need to do anything here because the unclicked sample filter has already been removed
            break;
        }
  }
},

    //Must put in correct metadata url
    handleFilterChangeSequential: async function(){
      var model = this.searchModalSearch.model;
      switch(model){
        case 'patient':
        //this.clearPatientRecordData()
        //this.clearVisitRecordData()
        console.log('filtering patient')
        var offset_p = 100*this.participantsPage;
        var offset_v = 100*this.visitsPage;
        var patients_metadata = await fetchFilteredPatientsMetadataRelatedToStudy(this.selectedStudy, this.searchModalSearch.filters, this.userToken, 100, offset_p)
        var patient_recs = patients_metadata.records;
        console.log('setting patient records')
        this.visiblePatientRecords = patient_recs;
        //TO DO ORDERING RESULTS flat_arr = flat_arr.sort((a, b) => b.externalparticipantid - a.externalparticipantid)... may need to flatten array
        var visits_metadata = await fetchFilteredVisitsMetadataRelatedToStudy(this.selectedStudy, this.searchModalSearch.filters, this.userToken, 100, offset_v)
        var visit_recs = visits_metadata.records;
        this.visibleVisitsRecords = visit_recs;
        console.log('setting related visit records')
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
        this.visiblePatientRecords = send_to_backlog[0];
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
        this.visibleVisitsRecords = send_to_backlog[0];
        this.visitsBacklog = send_to_backlog;
*/
        break;

        case 'visits':
        //this.clearVisitRecordData()
        //this.clearSamplesRecordData()
        console.log('filtering visits')
        // eslint-disable-next-line
        var offset_v = 100*this.visitsPage;
        var offset_s = 100*this.samplesPage;
        // eslint-disable-next-line
        var visits_metadata = await fetchFilteredVisitsMetadataRelatedToStudy(this.selectedStudy, this.searchModalSearch.filters, this.userToken, 100, offset_v)
        // eslint-disable-next-line
        var visit_recs = visits_metadata.records;
        this.visibleVisitsRecords = visit_recs;
        console.log('setting visit records')
        //TO DO ORDERING RESULTS flat_arr = flat_arr.sort((a, b) => b.externalparticipantid - a.externalparticipantid)... may need to flatten array
        var samples_metadata = await fetchFilteredSamplesMetadataRelatedToStudy(this.selectedStudy, this.searchModalSearch.filters, this.userToken, 100, offset_s)
        var sample_recs = samples_metadata.records;
        this.visibleSamplesRecords = sample_recs;
        console.log('setting related samples records')

        break;
        case 'samples':
        //this.clearSamplesRecordData()
        console.log('filtering samples')
        // eslint-disable-next-line
        var offset_s = 100*this.samplesPage;
        //TO DO ORDERING RESULTS flat_arr = flat_arr.sort((a, b) => b.externalparticipantid - a.externalparticipantid)... may need to flatten array
        // eslint-disable-next-line
        var samples_metadata = await fetchFilteredSamplesMetadataRelatedToStudy(this.selectedStudy, this.searchModalSearch.filters, this.userToken, 100, offset_s)
        // eslint-disable-next-line
        var sample_recs = samples_metadata.records;
        this.visibleSamplesRecords = sample_recs;
        console.log('setting sample records')

      }
    },


    //called when a record is clicked
    onClickElement(nodeData, selectedRecord, clearing){
      //checking that its a record and not a model
      if (nodeData.parent && clearing == false) {
        //parentname will determine what color we change the square to
        var parent = nodeData.parent;
        var parentName = parent.displayName
        let clickCount = selectedRecord.attr("clickcount") + 1
        selectedRecord.attr("clickcount", clickCount)

        // set default fill style (when record is unselected)
        let fillstyle = '#C8C7C7'

        // unselected (an even number of clicks)
        if (clickCount%2 == 0){
          // TODO: add selectedNode to a "selected nodes" list (based on record type -> `parentName`)

          this.handleFilterChangeClick(nodeData, 'unclick');
        }
        // selected (an odd number of clicks)
        else if (clickCount%2 == 1 ){
          // TODO: remove selectedNode from a "selected nodes" list (based on record type -> `parentName`)
          switch (parentName) {
            case 'patient':
            //LOGIC FOR POPULATING ARRAY FOR CLEARING SELECTIONS

                //var part_arr = this.shadedParticipants
                //console.log(part_arr)
                var payload = [nodeData,selectedRecord, true]
                console.log(this.shadedParticipants)
                this.setShadedParticipants(this.shadedParticipants.push(payload))


                fillstyle ="#d10a00"
                // eslint-disable-next-line
                this.handleFilterChangeClick(nodeData, 'click');
                break;
            case 'visits':


                //LOGIC FOR POPULATING ARRAY FOR CLEARING SELECTIONS

                //var vis_arr = this.shadedVisits
                //console.log(vis_arr)
                console.log(this.shadedVisits)
                var payload1 = [nodeData,selectedRecord, true]
                var le_payload = this.shadedVisits.push(payload1)
                this.setShadedVisits(le_payload)
                console.log(this.shadedSamples.length)
                console.log(this.shadedVisits.length)

                //logic for setting linking target
                var vis_arr_len = this.shadedVisits;
                var samp_arr_len = this.shadedSamples;
                if (vis_arr_len.length == 1 && (samp_arr_len.length == 0 || samp_arr_len.length > 1)){
                  console.log(vis_arr_len.length)
                  console.log(samp_arr_len.length)
                  var to_be_linked = this.selectedRecord.details.id //CONFIRM THIS IS THE DATA WE ARE INTERESTED IN!
                  console.log(to_be_linked)
                  console.log(this.linkingTarget)
                  this.setLinkingTarget(to_be_linked)
                  console.log(this.linkingTarget)
                }
                fillstyle ="#0049d1"
                // eslint-disable-next-line
                //this.handleFilterChangeClick(nodeData, 'click');
                break;
            case 'samples':

              //LOGIC FOR POPULATING ARRAY FOR CLEARING SELECTIONS

                //var samp_arr = this.shadedSamples
                var payload2 = [nodeData,selectedRecord, true]
                console.log(this.shadedSamples)
                this.setShadedSamples(this.shadedSamples.push(payload2))


                //logic for setting linking target
                // eslint-disable-next-line
                var vis_arr_len = this.shadedVisits;
                // eslint-disable-next-line
                var samp_arr_len = this.shadedSamples;
                if (samp_arr_len.length == 1 && (vis_arr_len.length == 0 || vis_arr_len.length > 1)){
                  // eslint-disable-next-line
                  var to_be_linked = this.selectedRecord.details.id //CONFIRM THIS IS THE DATA WE ARE INTERESTED IN!
                  this.setLinkingTarget(to_be_linked)
                  console.log(this.linkingTarget)
                }

                fillstyle ="#f0cc00"
                // eslint-disable-next-line
                this.handleFilterChangeClick(nodeData, 'click');
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
      if (!this.userToken) {
        return
      }

      let vm = this
      this.sendXhr(this.graphUrl, {
        header: {
          'Authorization': `Bearer ${this.userToken}`
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
    clearPatientRecordData: function() {
      this.visibleRecordCount['patient'] = 0
      this.visiblePatientRecords = []
      //this.participantsPage = 0
    },
    clearVisitRecordData: function(){
      this.visibleRecordCount['visits'] = 0
      this.visibleVisitsRecords = []
      //this.visitsPage = 0
    },
    clearSamplesRecordData: function(){
      this.visibleRecordCount['samples'] = 0
      this.visibleSamplesRecords  = []
      //this.samplesPage = 0
    },
    clearSelectedRecordDataCounts: function() {
      this.visibleRecordCount['patient'] = 0
      this.visibleRecordCount['visits'] = 0
      this.visibleRecordCount['samples'] = 0
    },
    clearSelectedRecordData: function() {
      this.visiblePatientRecords = []
      this.visibleVisitsRecords = []
      this.visibleSamplesRecords  = []
    },
    clearSelectedPageNumbers: function() {
      this.participantsPage = 0
      this.visitsPage = 0
      this.samplesPage = 0
      this.filesPage = 0
    },

    updateStudyDataV2: function() {
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
            break;
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
            Authorization: `Bearer ${vm.userToken}`
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
                  break;
              }
            }).catch(function (error) {
              console.error(error);
            })
        )
      })

      return Promise.all(promisedEvents)
    },

    updatePatients: function(data) {
      this.visiblePatientRecords = data
      this.visibleRecordCount['patient'] = data.length
    },

    updateVisits: function(data) {
      this.visibleVisitsRecords = data
      this.visibleRecordCount['visits'] = data.length
    },

    updateSamples: function(data) {
      this.visibleSamplesRecords  = data
      this.visibleRecordCount['samples'] = data.length
    },

    //NOTE: In the case where we have clicked on a record, we want to perform updateview for the downstream models only if aplicable
    updateView: function() {
      this.nextCol = 1 //reset hidden Canvas color scheme
      this.colorToNode = {}
      this.startIndex = 0
      this.recordData = {}
      this.recordPool = {}

      let vm = this
      var model_arr = []
      if (this.clickedAPatient){
        model_arr = ['visits','samples']
        var model_obj_p = vm.modelData
        for (var x of model_arr){
        //Need to change this. Turning modeldata obj into an array, filtering by each of the models that we want
        //to apply changes to, and then converting back to an object
        Object.fromEntries(Object.entries(model_obj_p).filter(([key]) => key.includes(x)));
        }
        vm.model_obj_p.map(x => {

          // some fixed width that we will decide on
          // TODO: clean up recordCount and x.count (use just one)
          let recordCount = vm.visibleRecordCount[x.name]
          x.count = recordCount
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
      }
      else if (this.clickedAVisit){
        model_arr = ['samples']
        var model_obj_v = vm.modelData
        for (var y of model_arr){
        Object.fromEntries(Object.entries(model_obj_v).filter(([key]) => key.includes(y)));
        }
        vm.model_obj_v.map(x => {

          // some fixed width that we will decide on
          // TODO: clean up recordCount and x.count (use just one)
          let recordCount = vm.visibleRecordCount[x.name]
          x.count = recordCount
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
      }
      else{
      vm.modelData.map(x => {

        // some fixed width that we will decide on
        // TODO: clean up recordCount and x.count (use just one)
        let recordCount = vm.visibleRecordCount[x.name]
        x.count = recordCount
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
    }

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
      //filtered is false and we just grab the next page of records
      // eslint-disable-next-line
      var offset = 100*pagenum;
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
            Authorization: `Bearer ${vm.userToken}`
          }
        };
        */
      switch (modelName){
        case 'patient':
          // error with filter array. Must address
          var pmetadata = {}
          if (this.searchModalSearch.filters == undefined){
            pmetadata = await fetchFilteredPatientsMetadataRelatedToStudy(this.selectedStudy, [], this.userToken, 100, offset)
          }else{
            pmetadata = await fetchFilteredPatientsMetadataRelatedToStudy(this.selectedStudy, this.searchModalSearch.filters, this.userToken, 100, offset)
          }
          var p_record_results = propOr([], 'records', pmetadata)
          //ORDERBY TODO
          //verify data is in a list, if not, put it in one before sending off
          this.updatePatients(p_record_results);
          break;
        case 'visits':
          var vmetadata = {}
          if (this.searchModalSearch.filters == undefined){
            vmetadata = await fetchFilteredVisitsMetadataRelatedToStudy(this.selectedStudy, [], this.userToken, 100, offset)
          }else{
            vmetadata = await fetchFilteredVisitsMetadataRelatedToStudy(this.selectedStudy, this.searchModalSearch.filters, this.userToken, 100, offset)
          }
          var v_record_results = propOr([], 'records', vmetadata)
          this.updateVisits(v_record_results);
          break;
        case 'samples':
          var smetadata = {}
          if (this.searchModalSearch.filters == undefined){
            smetadata = await fetchFilteredSamplesMetadataRelatedToStudy(this.selectedStudy, [], this.userToken, 100, offset)
          }else{
            smetadata = await fetchFilteredSamplesMetadataRelatedToStudy(this.selectedStudy, this.searchModalSearch.filters, this.userToken, 100, offset)
          }
          var s_record_results = propOr([], 'records', smetadata)
          this.updateSamples(s_record_results);
          break;
        case 'files':
          break;
      }
    },

    updatePage: function(modelName, modelPage, orderBy, direction){
      //can't go back before the first page
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
          break;
      }
      if (pagenum != -1) {
        vm.updatePageHelper(modelName, pagenum, orderBy).then(() => {
          vm.updateView()
        })
      }
    },

    //fetches and sets store to entries on the 'next' page for each model. Will call from the page advance bar bound to each model bin
    //Should have forward and advance page as one function by setting forward or advance to the attrs of the arrows bounding box
    //NOTE: NEED TO ACCOUNT FOR THE CASE WHERE THIS IS FILTERED. MUST MAKE A MODIFIED CALL TO renderAfterFilter()
    //NOTE: when filter is applied, we can grab next element of backlog rather than make an api call
    // eslint-disable-next-line
    advancePage: function(modelName, direction) {
      var orderBy = ''
      var modelPage = ''
      switch (modelName) {
        case 'patient':
          orderBy = 'externalparticipantid'; //verify data is in a list, if not, put it in one before sending off
          modelPage = this.participantsPage;
          this.visiblePatientRecords = [];
          this.visibleRecordCount['patient'] = 0;
          //if there are any filters applied to the model
          /*
          if (this.patientsBacklog.length > 0){
            console.log('something in patients backlog. backlog is:', this.patientsBacklog)
            //grab next page from the backlog array and assign that to selected__...must do for each of them
            // eslint-disable-next-line
            this.updatePage('patient', modelPage, orderBy, direction,true);
          }
          */
          this.updatePage('patient', modelPage, orderBy, direction);
          break;
        case 'visits':
          orderBy = 'event date and time';
          modelPage = this.visitsPage;
          this.visibleVisitsRecords = [];
          this.visibleRecordCount['visits'] = 0;
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
          this.visibleSamplesRecords  = [];
          this.visibleSamplesRecords['samples'] = 0;
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
          break;
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
          // eslint-disable-next-line no-unused-vars
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
          'Authorization': `bearer ${this.userToken}`
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
      if (!this.userToken) {
        return
      }

      let vm = this
      this.sendXhr(this.graphUrl, {
        header: {
          'Authorization': `Bearer ${this.userToken}`
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
  position: absolute;
  left: 0;
  top: 0;
  z-index: -1;
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
