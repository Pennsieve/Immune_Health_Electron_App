<template>
    <div>

      <search-all-data-filters
          ref="filters"
          v-model="filterOptions"
          class="mb-16"
          :models="modelOptions"
          @delete-filter="deleteFilter"
      />

      <div class="mb-24">
        <button
            class="linked"
            @click="addFilter"
        >
          <svg-icon
              name="icon-plus"
              height="24"
              width="24"
          />
          Add Filter
        </button>
      </div>

      <div class="model-grid-array">
        <RecordGrid
            v-for="model in filteredModels"
            :key="model.name"
            :model="model"
            :record-config="recordConfig"
            :study-name="selectedStudy.values[0].value"
        >
        </RecordGrid>
      </div>

    </div>


</template>
  
<script>
  import debounce from 'lodash/debounce'
  import { mapActions, mapState, mapGetters } from 'vuex'
  
  import RecordGrid from '@/components/GraphBrowser2/RecordGrid/RecordGrid.vue'
  import SearchAllDataFilters from "@/components/SearchAllData/SearchAllDataFilters/SearchAllDataFilters";
  import {v1} from "uuid";

    export default {
      name: 'GraphBrowser2',
  
      components: {
        RecordGrid,
        SearchAllDataFilters,
      },
  
      data() {
        return {
          chartHeight: 0,
          isFullscreen: false,
          modelsListVisible: true,
          resetModelsList: false,
          filterOptions: [],
          studyFilter: null,
          recordConfig:{
            nrElemPerCol: 10,
            recordSize: 15,
            cellOffset: 4,
            groupSpacing: 8,
            numberOfRows: 4,
          },
        }
      },
  
      computed: {
        ...mapState([
            'selectedStudy',
        ]),
        ...mapState('graphBrowseModule',[
            'showModels',
            'models',
            'filters'
        ]),
        ...mapGetters([
          'userToken',
        ]),
        ...mapState('graphBrowseModule',[
           'records'
        ]),

        filteredModels: function() {
          return this.models.filter(model => this.showModels.includes(model.name))
        },

        modelOptions: function() {
          let options =  this.models.map(model => {
                const record = {value: model.name, label: model.name}
                return record
              }
          )
          return options
        }
      },

      watch: {
        userToken: {
          deep: true,
          handler: function() {
            this.fetchModels()
          }
        },
        selectedStudy: {
          handler: function(newValue) {
            console.log("UPDATE SELECTED STUDY")
            if (this.studyFilter) {
              this.studyFilter.value = newValue.values[0].value
            } else {
              this.studyFilter = {
                id: v1(),
                model: "study",
                property: "sstudyid",
                operator: "STARTS WITH",
                value: newValue.values[0].value
              }
            }

            this.createOrUpdateFilter(this.studyFilter)
          }
        },

        filterOptions: {
          deep: true,
          handler: function(evt) {
            for (const j of evt) {
              if (j.value != "") {
                const filter = {
                  id:       j.id,
                  model:    j.target,
                  property: j.property,
                  operator: j.operation,
                  value:    j.value
                }
                this.createOrUpdateFilter(filter)
              }
            }
          }
        }
      },


      created: function () {
        window.addEventListener('resize', this.setChartHeight)
        this.setChartHeight()
      },
  
      mounted: function() {
        document.addEventListener('fullscreenchange', this.onFullscreenchange.bind(this))

        this.unwatch = this.$store.watch(
            (state,getters) => getters['graphBrowseModule/getRecords'], () => {
              console.log("WHeLP")
            }
        )

        if (this.userToken) {
          this.fetchModels()
        }


      },
  
      beforeDestroy: function() {
        document.removeEventListener('fullscreenchange', this.onFullscreenchange.bind(this))
        window.removeEventListener('resize', this.setChartHeight)
      },
  
      methods: {
        ...mapActions('graphBrowseModule', [
            'fetchModels',
            'clearRecords',
            'setFilters',
            'createOrUpdateFilter',
            'removeFilter'
        ]),

        /**
         * Add filter
         */
        addFilter: function() {
          const newFilter = {
            id: v1(),
            type: 'model',
            target: this.filteredModels[0].name,
            targetLabel: this.filteredModels[0].name,
            property: '',
            propertyLabel: '',
            propertyType: '',
            operation: '',
            operationLabel: '',
            operators: [],
            value: '',
            isInvalid: false,
            lockTarget: false
          }
          this.filterOptions.push(newFilter)

        },
        deleteFilter: function(idx) {
          this.removeFilter(this.filterOptions[idx].id)
          this.filterOptions.splice(idx, 1)
        },

        /**
         * Set chart height based on the height of the window
         */
        setChartHeight: debounce(
          function() {
            const header = document.querySelector('.header')
            const subheader = document.querySelector('.subheader')
            const rafterHeight = this.isFullscreen ? 0 : header.offsetHeight + subheader.offsetHeight
            this.chartHeight = window.innerHeight - rafterHeight
          },
          100
        ),
  
        /**
         * List for fullscreen event and set fullscreen data
         */
        // eslint-disable-next-line no-unused-vars
        onFullscreenchange: function(evt) {
          this.isFullscreen = document.fullscreenElement
          this.setChartHeight()
        },

      }
    }
  </script>
  
  <style lang="scss" scoped>
    @import '../../assets/css/_variables.scss';

    .model-grid-array {
      display: flex;
    }
    .graph-browser {
      height: 100%;
      margin: 0px;
      position: relative;
    }
    .models-list-wrap {
      background: #fff;
      box-shadow: -3px 1px 11px 0 rgba(0,0,0,0.21);
      height: 100%;
      position: absolute;
      right: 0;
      top: 0;
      transform: translate3d(100%, 0, 0);
      transition: transform .3s ease-out;
      width: 300px;
      will-change: transform;
      z-index: 3;
      &.visible {
        transform: translate3d(0, 0, 0);
      }
    }
    .models-list-scroll {
      height: 100%;
      overflow: hidden;
    }
    .btn-toggle-models-list {
      align-items: center;
      background: #fff;
      box-shadow: -3px 1px 11px 0 rgba(0,0,0,0.21);
      display: flex;
      height: 32px;
      left: -33px;
      justify-content: center;
      position: absolute;
      top: 20px;
      width: 33px;
      &:after {
        background: white;
        content: '';
        height: 100%;
        pointer-events: none;
        position: absolute;
        top: 0;
        right: -5px;
        width: 5px;
      }
    }
  </style>
  