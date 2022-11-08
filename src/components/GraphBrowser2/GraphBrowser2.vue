<template>
    <div >

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
            @select="selectRecord"
            @addFilter="addFilter"
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
          recordConfig:{
            nrElemPerCol: 10,
            recordSize: 16,
            cellOffset: 4,
            groupSpacing: 12,
            numberOfRows: 4,
          },
        }
      },
  
      computed: {
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

        filterOptions: {
          deep: true,
          handler: function(evt) {
            if (evt.length == 0) {
              this.setFilters([])
            }else {
              for (const j of evt) {
                if (j.valueLabel != "") {

                  // If a value exist for filter (when searching for different value then shown)
                  // then replace label by value in the vuex filters.
                  let value = j.valueLabel
                  if (j.value) {
                    value = j.value
                  }

                  const filter = {
                    id:       j.id,
                    model:    j.target,
                    property: j.property,
                    operator: j.operation,
                    value:    value
                  }
                  this.createOrUpdateFilter(filter)
                }
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
            'removeFilter',
        ]),

        selectRecord: function(evt) {
          console.log("event: ",evt)
        },

        /**
         * Add filter
         */
        addFilter: function(input) {

          if (input instanceof MouseEvent) {
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
          } else if(input) {
            this.filterOptions.push(input)
          }


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
      flex-wrap: wrap;
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
  