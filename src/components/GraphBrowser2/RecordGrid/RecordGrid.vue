<template>
      <div
          class="data-model-graph"
          element-loading-background="#fff"
          @mouseleave="hideModelTooltip"
          >

        <div class="header" @click="selectModel">
          <div>
            {{model.name}}
          </div>

        </div>
        <div ref="canvas_wrapper" class="chart-wrapper">
          <div class="gridInfo"></div>
          <canvas ref="mainCanvas" :class="{ 'mainCanvas': true, 'select': !shouldHideTooltip }"/>
          <canvas ref="hiddenCanvas" class="hiddenCanvas"/>
        </div>

        <record-tooltip ref="recordToolTip"
            :item="hoveredRecord"
            @mouseenter.native="shouldHideTooltip = false"
        />

        <div ref="custom"></div>
      </div>
</template>

<script>  
    import debounce from 'lodash/debounce'
    import {mapActions, mapGetters, mapState} from 'vuex'
    import { select } from 'd3-selection';
    import * as d3 from 'd3'
    import RecordTooltip from "@/components/DataModelGraph/RecordTooltip/RecordTooltip";
    import {v1} from "uuid";

    export default {
      name: 'RecordGrid',

      components: {
        RecordTooltip,
      },

      props: {
        model: {
          type: Object,
          default: () => {
          },
        },
        recordConfig: {
          type: Object,
          default: () => {
            return {
              nrElemPerCol: 10,
              recordSize: 12,
              cellOffset: 4,
              groupSpacing: 8,
              numberOfRows: 4,
            }
          },
        },
      },


  
      data() {
        return {
          nextCol: 1,  // used to generate unique colors for hidden canvas
          colorToNode: {},  //used to map colors to nodes
          canvasSize: {
            width: 248,
            height: 248,
          },
          drawTimer:null,
          xOffset: 0,
          yOffset: 0,
          modelHeaderHeight: 0,
          hoveredRecord: {},
          shouldHideTooltip: true,
          records: [],
          selectedRecords: []

        }
      },

      watch: {
        filters: {
          deep: true,
          handler: function() {
            this.fetchRecords(this.model.name)
            this.fetchSelectedRecords(this.model.name)
          }
        },
        selectedRecord: {
          deep: true,
          handler: function() {
            this.fetchSelectedRecords(this.model.name)
          }
        }

      },
  
      computed: {
        ...mapGetters('graphBrowseModule',[
            'getRecordsByModel',
            'getSelectedRecordsByModel'
        ]),
        ...mapState('graphBrowseModule',[
            'filters',
            'selectedRecord'
        ]),

        mergedRecords: function() {
          if (this.selectedRecords ) {

            let recordIdArr = this.records.map(value => value.id)

            let iInsert = this.records.length - 1
            let mRecords = this.records.slice()

            if (mRecords.length > 0) {
              for (let r in this.selectedRecords) {
                if (!(recordIdArr.includes(this.selectedRecords[r].id))) {
                  while (this.selectedRecords[mRecords[iInsert].id] != undefined) {
                    console.log('already exists')
                    iInsert -= 1
                  }

                  mRecords[iInsert] = this.selectedRecords[r]
                  iInsert -= 1
                }
              }
            }

            return mRecords

          } else {
            return this.records
          }

        },


        cellSize: function() {
          return Math.floor( this.recordConfig.nrElemPerCol * (this.recordConfig.recordSize + this.recordConfig.cellOffset) + 2 * this.recordConfig.cellOffset)
        },
        recordSpacing: function() {
          return Math.floor((this.cellSize - (2 * this.recordConfig.cellOffset) - this.recordConfig.nrElemPerCol * this.recordConfig.recordSize) / (this.recordConfig.nrElemPerCol - 1))
        }
      },
  
      created: function () {
        window.addEventListener('resize', this.setChartHeight)
        this.setChartHeight()

      },
  
      mounted: function() {
        document.addEventListener('fullscreenchange', this.onFullscreenchange.bind(this))

        this.custom = d3.select(this.$refs.custom);
        var mainCanvas = d3.select(this.$refs.mainCanvas)
            .attr('width', this.canvasSize.width)
            .attr('height', this.canvasSize.height);
        d3.select(this.$refs.hiddenCanvas)
            .attr('width', this.canvasSize.width)
            .attr('height', this.canvasSize.height);

        this.fetchRecords(this.model.name)

        let vm = this
        this.drawTimer= d3.timer(function(elapsed) {
          vm.draw(mainCanvas, false);
          if (elapsed > 300) vm.drawTimer.stop();
        }); // Timer running the draw function repeatedly for 300 ms.

        // Subscribe to changes to the records of the model.
        this.unsubscribe = this.$store.subscribe((mutation) => {

          let needsUpdate = mutation.type=='graphBrowseModule/SET_RECORDS_FOR_MODEL' ||
              mutation.type =='graphBrowseModule/SET_SELECTED_RECORDS_FOR_MODEL'
          if  (this.model && needsUpdate && mutation.payload.model === this.model.name) {
            this.records = this.getRecordsByModel(this.model.name)
            this.selectedRecords = this.getSelectedRecordsByModel(this.model.name)





            this.recordbind()

            let mainCanvas = d3.select(this.$refs.mainCanvas)
            let hiddenCanvas = d3.select(this.$refs.hiddenCanvas)

            let vm = this
            vm.draw(hiddenCanvas, true)
            this.drawTimer.restart(function(elapsed) {
              vm.draw(mainCanvas, false);
              if (elapsed > 600) vm.drawTimer.stop();
            })

          }
        })

        this.setupMouseOver()
        this.setupMouseClick()


      },
  
      beforeDestroy: function() {
        this.unsubscribe()
        document.removeEventListener('fullscreenchange', this.onFullscreenchange.bind(this))
        window.removeEventListener('resize', this.setChartHeight)
      },
  
      methods: {
        ...mapActions('graphBrowseModule', [
            'fetchRecords',
            'fetchSelectedRecords',
            'setSelectedModel',
            'setSelectedRecord',
        ]),

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

        selectModel: function() {
          this.setSelectedModel(this.model.name)
        },

        setupMouseOver: function() {
          const vm = this
          const hiddenCanvas = d3.select(this.$refs.hiddenCanvas)
          d3.select(this.$refs.mainCanvas).on('mousemove', function (d) {

            vm.draw(hiddenCanvas, true); // Draw the hidden canvas.
            // Get mouse positions from the main canvas.
            const cCoord = this.getBoundingClientRect();
            const mouseY = d.clientY - cCoord.top;
            const mouseX = d.clientX - cCoord.left;

            var hiddenCtx = hiddenCanvas.node().getContext('2d');
            var col = hiddenCtx.getImageData(mouseX, mouseY, 1, 1).data;
            var colKey = 'rgb(' + col[0] + ',' + col[1] + ',' + col[2] + ')';
            var nodeData = vm.colorToNode[colKey];
            if (nodeData) {
              // eslint-disable-next-line
              vm.onHoverElement(nodeData, d.clientX, d.clientY)
            } else {
              vm.hideModelTooltip()
            }

          });
        },

        setupMouseClick: function() {
          const vm = this
          const hiddenCanvas = d3.select(this.$refs.hiddenCanvas)
          d3.select(this.$refs.mainCanvas).on('click', function(d) {

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

            if (nodeData) {

              if (vm.selectedRecord && vm.selectedRecord.id === nodeData.record.id) {

                let propLabel = "ID"
                let operationLabel = "STARTS WITH"
                let valueLabel = nodeData.record.id

                // TODO: Take this out of this component or have some sort of generalized approach.
                switch (vm.model.name) {
                  case "study":
                      propLabel = "study ID"
                      operationLabel = "equals"
                      valueLabel = nodeData.record.props.sstudyid
                      break;
                  case "visits":
                      propLabel = "visit event"
                      operationLabel = "equals"
                      valueLabel = nodeData.record.props.visit_event
                      break;
                  case "patient":
                    propLabel = "name"
                    operationLabel = "equals"
                    valueLabel = nodeData.record.props.name
                    break;
                  case "samples":
                    propLabel = "sample ID"
                    operationLabel = "equals"
                    valueLabel = nodeData.record.props.study_sample_id
                    break;
                }

                const newFilter = {
                  id: v1(),
                  type: 'model',
                  target: vm.model.name,
                  targetLabel: vm.model.name,
                  property: "`@id`",
                  propertyLabel: propLabel,
                  propertyType: {format: null, type: "string"},
                  operation: 'STARTS WITH',
                  operationLabel: operationLabel,
                  operators: [{label: "equals", value:"="},{label: "does not equal", value:"<>"},{label: "starts with", value:"STARTS WITH"}],
                  value: nodeData.record.id,
                  valueLabel: valueLabel,
                  isTrusted: true,
                  lockTarget: true
                }
                vm.$emit('addFilter', newFilter)
              }


              vm.onClickRecord(nodeData)



            }
          })
        },

        onClickRecord: function(nodeData ){
          this.setSelectedRecord(nodeData.record)
          this.setSelectedModel(this.model.name)
        },

        // eslint-disable-next-line
        onHoverElement: function(nodeData, x, y) {
          // eslint-disable-next-line no-unreachable
          if (nodeData) {
            // eslint-disable-next-line
            // if (!nodeData.details) {
            //   // eslint-disable-next-line
            //   // console.log('onHoverElement() nodeData.details: no details yet')
            //   const modelId = nodeData.model
            //   if (this.recordPool[modelId].unMapped.length === 0 && !this.recordPool[modelId].isPending) {
            //     this.fetchRecords(modelId)
            //   } else {
            //     const unMapped = this.recordPool[modelId].unMapped
            //     const randomIndex =Math.floor(Math.random() * unMapped.length);
            //     // eslint-disable-next-line
            //     nodeData.details = this.recordPool[modelId].records[ unMapped[randomIndex]]
            //     unMapped.splice(randomIndex, 1)
            //   }
            // }
            // eslint-disable-next-line

            this.selectedNode = nodeData

            const tooltip = select(this.$refs.recordToolTip.$el)
            // const tooltip = this.$refs.recordToolTip.$el

            this.shouldHideTooltip = false
            // eslint-disable-next-line
            // this.hoveredModel = nodeData.details
            // if (nodeData.details) {
            //
            //   this.hoveredModel = {
            //     displayName: nodeData.parent.name,
            //     properties: nodeData.details ? this.recordForDisplay(nodeData.details) : []
            //   }
            // }

            this.hoveredRecord = nodeData

            tooltip.style('transform', `translate(${x}px, ${y + 20}px)`)
          }
          else {
            // there is no nodeData or this nodeData does not have a parent (i.e., it is a model)
            this.hideModelTooltip()
          }
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
              this.hoveredRecord = {}
              this.shouldHideTooltip = false
            }
          }, 100)
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

        // Parse records to items that should be rendered in canvas
        getCanvasElements: function() {

          let startIndex = 0
          let numElem = this.mergedRecords.length < 2500 ? this.mergedRecords.length : 2500

          let vm = this
          let recs = []
          if (numElem > 0) {
            recs = d3.range(startIndex, startIndex + numElem ).map(function(el) {

              let inSelected = false
              if (vm.selectedRecords) {
                inSelected = vm.mergedRecords[el].id in vm.selectedRecords
              }

              let isSelected = false
              if (vm.selectedRecord) {
                isSelected = vm.mergedRecords[el].id == vm.selectedRecord.id
              }

              return {
                id: el,
                recordIndex: el-startIndex,
                record: vm.mergedRecords[el],
                inSelected: inSelected,
                isSelected: isSelected
              }
            })
          }

          return recs
        },

        recordbind: function() {

          let elem =  this.getCanvasElements()
          var join = this.custom.selectAll('custom.record')
              .data(elem);

          join.exit()
              .remove();

          let vm = this
          var enterSel = join.enter()
              .append('custom')
              .attr('class', 'record')


          join
              .merge(enterSel)
              .transition()
              .attr("x", function(d) {
                let ModelCol = 0
                let RecordCol = d.recordIndex % vm.recordConfig.nrElemPerCol
                let RecordSection = Math.floor( d.recordIndex / ((vm.recordConfig.nrElemPerCol ** 2) * 1))

                return Math.floor((vm.cellSize + vm.recordConfig.groupSpacing) * (ModelCol + RecordSection) + vm.xOffset + vm.recordConfig.cellOffset +  RecordCol * (vm.recordConfig.recordSize + vm.recordSpacing))
              })
              .attr("y", function(d) {
                let row = 0 % vm.recordConfig.numberOfRows
                let RecordRow = Math.floor(((d.recordIndex % (1 * vm.recordConfig.nrElemPerCol**2) )/ vm.recordConfig.nrElemPerCol)) % vm.recordConfig.nrElemPerCol
                let recordSection = Math.floor( d.recordIndex / (vm.recordConfig.nrElemPerCol**2)) % 1
                return vm.yOffset + (vm.modelHeaderHeight + vm.cellSize + vm.recordConfig.groupSpacing) * (row + recordSection)  + vm.recordConfig.cellOffset + RecordRow * (vm.recordConfig.recordSize + vm.recordSpacing)
              })
              .attr('width', function() {
                return vm.recordConfig.recordSize
              })
              .attr('height', function() {
                return vm.recordConfig.recordSize
              })
              .attr('fillStyle', function(d) {
                if (d.inSelected) {
                  return '#F67325'
                } else {
                  return '#08B3AF'
                }
              })
              .attr('isSelected', function(d) {
                return d.isSelected

              })
              .attr('fillStyleHidden', function(d) {
                d.hiddenCol = vm.genColor();
                vm.colorToNode[d.hiddenCol] = d;
                return d.hiddenCol;
              })

        },

        draw: function(canvas, hidden) {

          // // MODEL-AREAS)
          var ctx = canvas.node().getContext('2d');
          ctx.clearRect(0, 0, this.canvasSize.width, this.canvasSize.height); // Clear the canvas.

              ctx.fillStyle = '#EEEBFE';
              ctx.fillRect(0,0,this.canvasSize.width,this.canvasSize.height)


          // RECORDS
          let els = this.custom.selectAll('custom.record');// Grab all elements you bound data to in the databind() function.
          els.each(function() { // For each virtual/custom element...
            let node = d3.select(this);   // This is each individual element in the loop.
            ctx.fillStyle = hidden ? node.attr('fillStyleHidden') : node.attr('fillStyle');
            // if (node.attr('isSelected') == "true") {
            //   ctx.fillStyle = "#34259F"
            //   ctx.fillRect(node.attr('x'), node.attr('y'), node.attr('width'), node.attr('height'));  // Here you retrieve the position of the node and apply it to the fillRect context function which will fill and paint the square.

              let x = Number(node.attr('x'))
              let y = Number(node.attr('y'))
              let radius = 3
              let w = Number(node.attr('width'))
              let h = Number(node.attr('height'))

              let r = x + w;
              let b = y + h;


              ctx.strokeStyle="#34259F";
              // ctx.fillStyle="#34259F";
              ctx.lineWidth="3";
              ctx.beginPath()
              ctx.moveTo(x+radius, y);
              ctx.lineTo(r-radius, y);
              ctx.quadraticCurveTo(r, y, r, y+radius);
              ctx.lineTo(r, y+h-radius);
              ctx.quadraticCurveTo(r, b, r-radius, b);
              ctx.lineTo(x+radius, b);
              ctx.quadraticCurveTo(x, b, x, b-radius);
              ctx.lineTo(x, y+radius);
              ctx.quadraticCurveTo(x, y, x+radius, y);
              ctx.fill()

              if (node.attr('isSelected') == "true") {
                 ctx.stroke();
              }

            // } else {
            //   ctx.fillRect(node.attr('x'), node.attr('y'), node.attr('width'), node.attr('height'));  // Here you retrieve the position of the node and apply it to the fillRect context function which will fill and paint the square.
            //
            // }
          })


        },

        /**
         * List for fullscreen event and set fullscreen data
         */
        // eslint-disable-next-line no-unused-vars
        onFullscreenchange: function(evt) {
          this.isFullscreen = document.fullscreenElement
          this.setChartHeight()
        },
  
      },
    }
</script>
  
<style lang="scss" scoped>

  @import '../../../assets/css/_variables.scss';

  .gridInfo {
    min-width: 42px;
    background: $purple_tint;
    //border-right: 1px solid $purple_1;
  }

  .header {
    cursor: pointer;
    background: $purple_tint;
    border-bottom: 2px solid $purple_1;
    height: 32px;
    display: flex;
    justify-content: flex-start;
    align-items: center;
    padding: 0 8px;
    color: $gray_6;
    font-size: larger;
  }

  .data-model-graph {
    height: 100%;
    position: relative;
    margin: 8px;

  }

  .chart-wrapper {
    background: #fff;
    position: relative;
    width: 100%;
    display: flex;
  }

  .mainCanvas.select {
    cursor: pointer;
  }

  .hiddenCanvas {
    display: none;
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
