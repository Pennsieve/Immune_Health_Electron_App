<template>
  <div
    v-loading="isLoading"
    v-click-outside="onClickOutsideGraph"
    class="data-model-graph"
    element-loading-background="#fff"
  >
    <h2 v-if="showTitle">
      Data Model
    </h2>

    <data-model-graph-toolbar
      v-if="showToolbar"
      @zoom-in="zoomBy(1.2)"
      @zoom-out="zoomBy(0.8)"
      @center="center"
      @fullscreen="fullscreen"
      @exit-fullscreen="exitFullscreen"
    />

    <div class="chart-wrapper">
      <svg
        ref="chart"
        class="chart"
        :class="active ? `active` : ``"
      />
    </div>
<!--    <div-->
<!--      v-if="!active && hasData && showOverlay"-->
<!--      class="enable-chart-wrapper"-->
<!--      @click.stop="activateChart"-->
<!--    >-->
<!--      <div class="enable-chart-message-wrapper">-->
<!--        <div class="enable-chart-message">-->
<!--          Click to enable navigation. Click and drag to move. Use your scroll wheel to zoom.-->
<!--        </div>-->
<!--      </div>-->
<!--    </div>-->
    <div
      v-if="!isLoading && !hasData"
      class="enable-chart-wrapper no-chart-data"
    >
      <p class="no-chart-data--copy">
        <a
          href="https://docs.pennsieve.io/docs/introduction-to-metadata-on-pennsieve"
          target="_blank"
        >
          Learn More
        </a> about how to set up your graph and start gaining insights into your data.
      </p>
    </div>

    <model-tooltip
      :model="hoveredModel"
      @mouseenter.native="shouldHideTooltip = false"
      @mouseleave.native="hideModelTooltip"
    />
  </div>
</template>

<script>
//import axios from 'axios'
  import * as d3 from 'd3'
  import { select } from 'd3-selection';

  import { propOr, pluck } from 'ramda'
  import debounce from 'lodash/debounce'
  import { mapState } from 'vuex'

  import DataModelGraphToolbar from './DataModelGraphToolbar/DataModelGraphToolbar.vue'
  import ModelTooltip from './ModelTooltip/ModelTooltip.vue'

  import Request from '@/mixins/request'


  // D3 Helpers
  import { tickActions } from '@/utils/d3Helpers'

  import GraphViewerHelper from '@/mixins/graph-viewer'

// NOTE: Defining simulation variable in global scope becuase we need to initiate d3 force simulation
// within the context onf the renderChart function but we also need access to simulation in update chart function
let simulation
let zoom

// Vue Component
export default {
  name: 'DataModelGraph',

  components: {
    DataModelGraphToolbar,
    ModelTooltip
  },

  mixins: [
    Request,
    GraphViewerHelper
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
  },

  data() {
    return {
      active: false,
      activeNode: String,
      hoveredModel: {},
      graphInit: true,
      recordData: {
      }
    }
  },

  computed: {
    ...mapState([
      'relationshipTypes',
      'userToken',
      'config',
    ])
  },

  watch: {
    userToken: {
      handler: function() {
        this.getGraphData()
      }
    },
    /**
     * Watch the schema property and transform the data when available
     */
    schemaProp: {
      handler: function(val) {
        if (val) {
          this.graphData = this.transformApiResponse(val)
          this.isLoading = false
        }
      },
      immediate: true
    },
    activeNode: function() {
      // const data = this.graphData
      // const { edges, nodes } = this.formatData(data.edges, data.nodes, this.activeNode)
      // this.updateChart(edges, nodes)
    },

    /**
     * Activate the chart if there is no overlay
     */
    showOverlay: {
      handler: function(val) {
        if (val === false) {
          this.activateChart()
        }
      },
      immediate: true
    }
  },

  mounted() {
    const chartRef = this.$refs.chart
    const svg = select(chartRef)
    const outerContainer = svg.append('g')
      .attr('class', 'outer-container')
    const chartPosition = chartRef.getBoundingClientRect()
    const width = Math.floor(chartPosition.width)
    const height = this.height

    svg.attr('width', width)
    svg.attr('height', height)

    zoom = d3.zoom()
      .scaleExtent([1 / 2, 4])
      .on('zoom', zoomed)

    svg.call(zoom)
      .on("dblclick.zoom", null);

    outerContainer.on("dblclick.zoom", null);

    simulation = d3.forceSimulation()
      .force('link', d3.forceLink().id(function(d) {
        return d.id;
      }))
      .force('charge', d3.forceManyBody())
      .force("y", d3.forceY().strength(0.1).y( height/2 ))
      .force('collide', d3.forceCollide().radius(function(d) {
        let r = 35
        if (d.nodeType == "record") {
          r = 5
        }
        return r
      }))

    simulation.alphaMin(0.05)

    function zoomed() {
      const transform = d3.zoomTransform(this).toString()
      innerContainer.attr('transform', transform)
    }




    //  /**
    //  * Markers
    //  */
    //
    //  const defs = svg.append('defs')
    //
    //  defs.append('marker')
    //    .attr('id', 'marker')
    //    .attr('viewBox', '0 -5 10 10')
    //    .attr('refX', 17)
    //    .attr('refY', -1.5)
    //    .attr('markerWidth', 10)
    //    .attr('markerHeight', 10)
    //    .attr('orient', 'auto')
    //    .attr('markerUnits', 'userSpaceOnUse')
    //    .append('path')
    //    .attr('d', 'M0,-5L10,0L0,5')
    //    .attr('fill', '#BDBDBD')
    //
    // defs.append('marker')
    //   .attr('id', 'marker-active')
    //   .attr('viewBox', '0 -5 10 10')
    //   .attr('refX', 17)
    //   .attr('refY', -1.5)
    //   .attr('markerWidth', 10)
    //   .attr('markerHeight', 10)
    //   .attr('orient', 'auto')
    //   .attr('markerUnits', 'userSpaceOnUse')
    //   .append('path')
    //   .attr('d', 'M0,-5L10,0L0,5')
    //   .attr('fill', 'rgb(39,96,255, 1)')

    const innerContainer = outerContainer.append('g')
      .attr('class', 'inner-container')
      .style('z-index', 2)

    innerContainer.on("dblclick.zoom", null);

    /**
     * Edge elements
     */
    /* TODO: why do we need `edgeElements`?
    const edgeElements = innerContainer.append('g')
      .attr('class', 'edges')
      .attr('sroke-width', '1px')
      .attr('fill', 'none')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', 2)
    */
    /**
     * node group container
     */
    /* TODO: why do we need `nodeGroupContainer`?
    const nodeGroupContainer = innerContainer.append('g')
      .attr('class', 'nodes')
    */

    this.getGraphData()
    window.addEventListener('resize', this.handleResize.bind(this))
  },

  beforeDestroy() {
    this.destroyChart()
    window.removeEventListener('resize', this.handleResize.bind(this))
  },

  methods: {
    /**
     * Make the chart inactive when the user blurs
     */
    onClickOutsideGraph: function() {
      if (this.active) {
        this.active = false
      }
    },

    /**
     * Redraw d3 chart
     */
    // resetChart: function() {
    //   this.destroyChart()
    //   this.$nextTick(() => {
    //     this.getGraphData()
    //   })
    // },

    /**
     * Handles window resize event
     */
    handleResize: debounce(
      function() {
        const { edges, nodes } = this.graphData
        this.updateChart(edges, nodes)
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

    /**
     * Calculate total number of edges per node
     * @param {String} key
     * @param {Object} data
     */
    getCounts: function(key, data) {
      const keyValues = pluck(key, data)
      const counts = {}
      keyValues.forEach(function(val) {
        if (counts[val]) {
          counts[val] = counts[val] += 1
        } else {
          counts[val] = 1
        }
      })
      return counts
    },

    /**
     * If activeNode is undefined, returns node that has the most relationships
     * @param {Array} edges
     */
    getActiveNode: function(edges) {
      // if active node has been set, return
      if (this.activeNode) {
        return this.activeNode
      }

      // else, get active node based on concept with the most relationships
      const edgeCounts = this.getCounts('source', edges)

      // set inital max value
      let max = { name: '', value: 0 }

      edgeCounts.forEach(edgeCount => {
        if (edgeCount >= max.value) {
          // TODO: what is `key` in this context? (note: workaround is to make it an in-line defined string)
          max = { name: 'key', value: edgeCount }
        }
      })

      return max.name
    },

    /**
     * Compute strength value based on number of edges
     */
    getStrength: function(edges) {
      const total = edges.length

      switch(true) {
        case total >= 35:
          return -200
        case total >= 25:
          return -150
        case total >= 15:
          return -125
        default:
          return -100
      }
    },


    /**
     * Updates d3 chart
     * @param {Object} data
     */

    // --++
    //
    // TODO: updateChart() is huge, nearly 200 lines -- REFACTOR into smaller, single-purpose functions
    //
    // ----

    // TODO: figure out `isModels` in this context, why is it needed?
    updateChart:  function(edges, nodes, /*isModels = false*/) {
      const vm = this

      /* TODO: why do we need `dragged()`?
      function dragged(event, d) {
        d.x = event.x;
        d.y = event.y;
        d3.select(this).raise().attr("transform", d=> "translate("+[d.x,d.y]+")" )
      }
      */

      var dragcontainer = d3.drag()
        .on("start", function(event) {
          if (!event.active) simulation.restart();
        })
        .on("drag", function dragged(event, d) {
          if (!event.active) simulation.restart();
          d.x = event.x;
          d.y = event.y;
          d3.select(this).raise().attr("transform", d=> "translate("+[d.x,d.y]+")" )

        })
        .on("end", function() {});

      /**
       *
       */
      const cursor = vm.hasLinks ? 'pointer' : 'default'

      // update svg dimensions
      const chartRef = this.$refs.chart
      // svg selection
      if (!chartRef) {
        window.removeEventListener('resize', this.handleResize.bind(this))
        return
      }
      const svg = select(chartRef)
      const chartPosition = chartRef.getBoundingClientRect()
      const width = Math.floor(chartPosition.width)
      const height = this.height

      svg.attr('width', width)
      svg.attr('height', height)

      // update outer container dimensions
      const outerContainer = svg.select('.outer-container')
      outerContainer.attr('width', width)
      outerContainer.attr('height', height)


      const innerContainer = outerContainer.select('.inner-container')
      const nodeGroupContainer = innerContainer.select('.nodes')
      const linkGroupContainer = innerContainer.select('.edges')
      innerContainer.call(zoom)
      /**
      * Edge elements
      */

      // DATA JOIN
      // Join new data with old elements, if any.
      const edgeElements = linkGroupContainer.selectAll('.link').data(edges)

      // ENTER + UPDATE
      // After merging the entered elements with the update selection,
      // apply operations to both.
      edgeElements.enter().append('path')
        .merge(edgeElements)
        .attr('class', function(d) {
          return `link ${d.nodeType}`})
        .attr('stroke', function(d) {
          if (d.active) {
            return 'rgb(39,96,255, 1)'
          }
          return '#ddd'
        })
        .attr('sroke-width', '1px')
        .attr('fill', 'none')
        .attr('stroke-opacity', 0.6)
        .attr('stroke-width', 2)

      // if (vm.showRelationshipTypes) {
      //   edgeElements
      //     .attr('marker-end', function(d) {
      //       if (d.from === d.to) {
      //         return ''
      //       }
      //
      //       if (d.active) {
      //         return 'url(#marker-active)'
      //       } else {
      //         return 'url(#marker)'
      //       }
      //     })
      // }

      // EXIT
      // Remove old elements as needed.
      edgeElements.exit().remove();

      /**
       * Node Elements
       */

      // Create Group element for each node
      const nodeGroupElements = nodeGroupContainer.selectAll('g')
        .data(nodes, function(d) { return d.id })
        .enter()
        .append('g')
          .attr('class', function(d) {
            return `node-group ${d.id.toLowerCase()} ${d.nodeType}`
          })
          .attr("fill", "#fff")
          .attr("stroke", "#000")
          .attr("stroke-width", 1.5)

      // Add Model Node Circles

      nodeGroupElements.filter(function(d) { return d.nodeType == 'model' })
        .append('circle')
          .attr('class', function(d) {
            return `node-circle ${d.id.toLowerCase()}`
          })
          .attr('r', 10)
          .attr('fill', '#EEEBFE')
          .attr('stroke', '#2760FF')
          .attr('data-id', function(d) {
            return d.id
          })

      nodeGroupElements.filter(function(d) { return d.nodeType == 'model' })
        .append('foreignObject')
          .attr('width', '150')
          .attr('height', 1)
          .attr('class', function(d) {
            return `node-text ${d.id.toLowerCase()}`
          })
          .attr('x', 16)
          .attr('y', -7)
          .attr('data-id', function(d) {
            return d.id
          })
        .append('xhtml:div')
          .attr('class', 'node-text-div')
          .html(function(d) {
            return `<span class='node-text-span' style='cursor:${cursor}'>${d.displayName}</span>`
          })

      nodeGroupElements.filter(function(d) { return d.nodeType == 'record' })
        .append('circle')
          .attr('class', function(d) {
            return `node-circle ${d.id.toLowerCase()}`
          })
          .attr('r', 3.5)
          .attr('fill', '#5039F7')
          .attr('stroke', '#fff')
          .attr('data-id', function(d) {
            return d.id
          })

      nodeGroupElements.call(dragcontainer);

      nodeGroupContainer.selectAll('g')
        .data(nodes, function(d) { return d.id })
        .exit()
        .remove()

      d3.selectAll('.node-circle')
        .on('click', vm.handleNodeClick)
        .on("dblclick", vm.handleNodeDblClick)
        .on('mouseenter', vm.handleNodeEnter)
        .on('mouseleave', vm.hideModelTooltip)

        let nodeTypes = ["concept"].concat(this.graphData.nodes.map(x => x.displayName.toLowerCase().replace(' ', '_')))
        let range =d3.range(nodeTypes.length).map(x => {return 100 + 120*x})

        var x = d3.scaleOrdinal()
          .domain(nodeTypes)
          .range(range)


      /**
       * Restart force simulation
       */
      simulation
        .force("x", d3.forceX().strength(1).x( function(d){
          return x(d.type)
        } ))
      simulation.nodes(nodes)
        .on('tick', tickActions)

      simulation.force('link').links(edges)
      simulation.alpha(0.3).restart()
    },


    //width / 2, height / 2

    handleNodeClick: function(d) {
      this.activeNode = d.currentTarget.__data__.id
    },
    handleNodeDblClick: function(d) {
      d.stopPropagation();
      this.activeNode = d.currentTarget.__data__
      let records = this.recordData[this.activeNode.id]
      if (!records.showRecords){
        records.showRecords = true
        if (!records.nodes.length) {
          this.getRecordsForModel(this.activeNode, 100, 0)
        }
      } else {
        records.showRecords = false
      }
      const renderObjs = this.getRenderNodesEdges()
      this.updateChart(renderObjs.edges, renderObjs.nodes)

    },

    handleNodeEnter: function(d) {
      const tooltip = select('.model-tooltip')

      this.shouldHideTooltip = false
      let obj = d.currentTarget.__data__

      this.hoveredModel = obj
      const textEl = this.$el.querySelector(`.node-text[data-id="${obj.id}"]`)
      if (textEl) {
        const boundingBox = textEl.getBoundingClientRect()

        tooltip.style('transform', `translate(${boundingBox.x}px, ${boundingBox.y + 20}px)`)
      }
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

    /**
     * Center the graph at the current zoom level
     * Call-back for 'center'-button
     */
    center: function() {
      const outerContainer = select('.outer-container')
      outerContainer.transition()
        .duration(400).call(zoom.transform, d3.zoomIdentity)
    },

    /**
     * Zoom the graph in or out
     */
    zoomBy: function(num) {
      const outerContainer = select('.outer-container')
      outerContainer.call(zoom.scaleBy, num)
    },

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
        // eslint-disable-next-line no-unused-vars
        const x = node.__data__.x + 150 // Account for the width of the models list sidebar
        // eslint-disable-next-line no-unused-vars
        const y = node.__data__.y
        // eslint-disable-next-line no-unused-vars
        const outerContainer = select('.outer-container')
        // outerContainer.transition().duration(400).call(zoom.translateTo, x, y)
        this.activeNode = id
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
          this.hoveredModel = {}
          this.shouldHideTooltip = false
        }
      }, 300)
    }
  }
}
</script>

<style lang='scss' scoped>
@import '@/assets/css/_variables.scss';

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
