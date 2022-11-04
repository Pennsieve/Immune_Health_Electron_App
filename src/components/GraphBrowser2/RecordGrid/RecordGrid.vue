<template>
      <div
          class="data-model-graph"
          element-loading-background="#fff">

        <div class="header">
          {{model.name}}
        </div>
        <div ref="canvas_wrapper" class="chart-wrapper">
          <canvas ref="mainCanvas" class="mainCanvas"/>
          <canvas ref="hiddenCanvas" class="hiddenCanvas"/>
        </div>
<!--        <record-tooltip-->
<!--            :model="hoveredModel"-->
<!--            @mouseenter.native="shouldHideTooltip = false"-->
<!--            @mouseleave.native="hideModelTooltip"-->
<!--        />-->
      <div ref="custom"></div>
      </div>
</template>

<script>  
    import debounce from 'lodash/debounce'
    import {mapActions, mapGetters, mapState} from 'vuex'
    import * as d3 from 'd3'

    export default {
      name: 'RecordGrid',

      props: {
        studyName: {
          type: String
        },
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
            width: 200,
            height: 200
          },
          drawTimer:null,
          xOffset: 0,
          yOffset: 0,
          modelHeaderHeight: 0
        }
      },

      watch: {
        studyName: function () {
          this.fetchRecords(this.model.name)
        },
        filters: {
          deep: true,
          handler: function() {
            console.log("new filters")
            this.fetchRecords(this.model.name)
          }
        },
      },
  
      computed: {
        ...mapGetters('graphBrowseModule',[
            'getRecordsByModel'
        ]),
        ...mapState([
          'selectedStudy',
        ]),
        ...mapState('graphBrowseModule',[
            'filters'
        ]),


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

          if  (this.model && mutation.payload.model === this.model.name) {
            console.log("TRIGGERED ", this.model.name)
            this.records = this.getRecordsByModel(this.model.name)
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

      },
  
      beforeDestroy: function() {
        this.unsubscribe()
        document.removeEventListener('fullscreenchange', this.onFullscreenchange.bind(this))
        window.removeEventListener('resize', this.setChartHeight)
      },
  
      methods: {
        ...mapActions('graphBrowseModule', [
          'fetchRecords',
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
          let numElem = this.records.length < 2500 ? this.records.length : 2500

          let vm = this
          let recs = []
          if (numElem > 0) {
            recs = d3.range(startIndex, startIndex + numElem ).map(function(el) {
              return {
                id: el,
                recordIndex: el-startIndex,
                recordId: vm.records[el],
              }
            })
          }


          console.log(recs)
          return recs
        },

        recordbind: function() {

          let elem =  this.getCanvasElements()
          console.log("ELEMENTS: ", elem)
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
              .attr('fillStyle', '#5039F7')
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
          // var elements = this.custom.selectAll('custom.model');// Grab all elements you bound data to in the databind() function.
          //
          // let vm = this
          // elements.each(function() { // For each virtual/custom element...
          //   var node = d3.select(this);   // This is each individual element in the loop.
          //
          //   // Render Model label sections
          //   ctx.fillStyle = hidden ? node.attr('fillStyleHidden') : node.attr('fillStyle');
          //   ctx.fillRect(node.attr('x'), node.attr('y') - vm.modelHeaderHeight , node.attr('width'), vm.modelHeaderHeight);
          //
          //   if (!hidden) {
          //     // render background rectangles
              ctx.fillStyle = '#EEEBFE';
              ctx.fillRect(0,0,this.canvasSize.width,this.canvasSize.height)
              // ctx.fillRect(node.attr('x'), node.attr('y'), node.attr('width'), node.attr('height'));

          //     // render Text
          //     ctx.font = '12px "Helvetica Neue"';
          //     ctx.fillStyle= '#34259F'
          //     let xCoord = parseInt(node.attr('x')) + 2
          //     let yCoord = parseInt(node.attr('y')) - 5
          //     let displayName = node.attr('modelName')
          //     if (displayName.length > 10) {
          //       displayName = displayName.substring(0, 10) + "..."
          //     }
          //     ctx.fillText(displayName, xCoord, yCoord);
          //   }
          // })

          // RECORDS
          let els = this.custom.selectAll('custom.record');// Grab all elements you bound data to in the databind() function.
          els.each(function() { // For each virtual/custom element...
            let node = d3.select(this);   // This is each individual element in the loop.
            ctx.fillStyle = hidden ? node.attr('fillStyleHidden') : node.attr('fillStyle');
            ctx.fillRect(node.attr('x'), node.attr('y'), node.attr('width'), node.attr('height'));  // Here you retrieve the position of the node and apply it to the fillRect context function which will fill and paint the square.
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
