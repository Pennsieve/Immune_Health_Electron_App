import {mapState} from "vuex";
import Request from '@/mixins/request'
import {pathOr, isNil, uniqBy, prop, compose, propOr, find, propEq, defaultTo} from 'ramda'
//import nodes from "d3-selection/src/selection/nodes";
//import GetConceptTitleVal from '../../components/datasets/explore/GetConceptTitleVal'



export default {
  mixins: [
    Request
  ],
  data: function () {
    return {
      hasData: false,
      graphData: {
        edges: [],
        nodes: []
      }
    }
  },

  computed: {
    ...mapState([
      'relationshipTypes',
      'userToken',
      'config',
    ]),
    graphUrl: function() {
      const apiUrl = this.config.conceptsUrl
      const datasetId = pathOr('', ['params', 'datasetId'])(this.$route)
      if (apiUrl && datasetId) {
        return `${apiUrl}/datasets/${datasetId}/concepts/schema/graph`
      }
    },
    recordsUrl: function() {
      const apiUrl = this.config.conceptsUrl
      const datasetId = pathOr('', ['params', 'datasetId'])(this.$route)
      if (apiUrl && datasetId) {
        return `${apiUrl}/datasets/${datasetId}/concepts/`
      }
    }
  },

  watch: {
    // graphData: {
    //   handler: function(graphData) {
    //     if (graphData.nodes && graphData.nodes.length) {
    //       if (this.graphInit) {
    //         this.graphInit = false
    //         let data = graphData
    //         this.$nextTick(() => {
    //           this.initChart()
    //           this.updateChart(data.edges, data.nodes)
    //         })
    //       } else {
    //         let data = graphData
    //         this.$nextTick(() => {
    //           // this.destroyChart()
    //           // this.renderChart(data)
    //           this.updateChart(data.edges, data.nodes)
    //         })
    //       }
    //     }
    //   },
    //   immediate: true,
    //   deep: true
    // }
  },

  methods: {
    /**
     * Given a model, get a list of records for that model.
     * @param modelId
     * @param maxRecords
     * @param page
     */
    // eslint-disable-next-line no-unused-vars
    getRecordsForModel: function(activeNode, maxRecords, page) {
      let vm =this

      this.sendXhr(`${this.recordsUrl}/${activeNode.id}/instances`, {
        header: {
          'Authorization': `bearer ${this.userToken}`
        }
      })
        .then(response => {
          const nodesEdges = vm.transformApiResponse(response, activeNode.id)
          nodesEdges.nodes.forEach(x => {
            x.parentNode = activeNode
            x.x = activeNode.x
            x.y = activeNode.y})
          vm.recordData[activeNode.id]['nodes'] = nodesEdges.nodes
          vm.recordData[activeNode.id]['edges'] = nodesEdges.edges
          vm.recordData[activeNode.id].showRecords = true
          let renderNodesEdges = vm.getRenderNodesEdges()
          vm.updateChart(renderNodesEdges.edges, renderNodesEdges.nodes, false)
        })
        .catch(errror => {
          console.log(errror) //vm.handleXhrError.bind(vm)
        })

    },
    /**
     * Fetch graph data from API
     */
    getGraphData: function() {
      if (!this.userToken) {
        return
      }

      // Short circuit if data is being passed to component
      if (this.schemaProp) {
        return
      }

      if (this.showRelationshipTypes) {
        this.graphData = this.transformRelationshipTypes()
        this.isLoading = false
        return
      }

      this.sendXhr(this.graphUrl, {
        header: {
          'Authorization': `bearer ${this.userToken}`
        }
      })
        .then(response => {
          this.hasData = true
          this.isLoading = false
          this.graphData = this.transformApiResponse(response)
          let vm = this
          response.map(x => {
              vm.recordData[x.id] = {
                showRecords: false,
                nodes: [],
                edges: []
              }
            }
          )

          this.updateChart(this.graphData.edges, this.graphData.nodes, true)
        })
        .catch(this.handleXhrError.bind(this))
    },

    /**
     * Transform relationships types and concepts state
     * @returns {Object}
     */
    transformRelationshipTypes: function() {
      const conceptsHash = this.conceptsHash

      // get available nodes and edges
      const edges = []
      const nodes = []

      this.relationshipTypes.forEach(relType => {
        const { to, from } = relType

        // get nodes
        if (conceptsHash[to] && conceptsHash[from]) {
          nodes.push(conceptsHash[to])
          nodes.push(conceptsHash[from])
        }

        // get edges
        const hasSource = !isNil(from) && !isNil(conceptsHash[from])
        const hasDestination = !isNil(to) && !isNil(conceptsHash[to])

        if (hasSource && hasDestination) {
          relType.source = from
          relType.target = to
          edges.push(relType)
        }
      })


      return {
        nodes: uniqBy(prop('id'), nodes),
        edges
      }
    },

    /**
     * Transform API GET Response
     * @param {Arrray} data
     * @returns {Object}
     */
    transformApiResponse: function(data, fromModelId) {
      const nodes = []
      const edges = []

      data.forEach(obj => {
        if (obj.type && (obj.type === 'schemaRelationship' || obj.type === 'schemaLinkedProperty')) {
          const hasFromNode = data.findIndex(d => d.id === obj.from) >= 0
          const hasToNode = data.findIndex(d => d.id === obj.to) >= 0

          if (hasFromNode && hasToNode) {
            edges.push({
              displayName: obj.displayName,
              type: obj.type,
              source: obj.from,
              target: obj.to,
              nodeType: "model"
            })
          }
        } else if (obj.type && (obj.type === 'concept')) {
          nodes.push({
            id: obj.id,
            displayName: obj.displayName,
            nodeType: "model",
            type: obj.type,
          })
          if (fromModelId) {
            edges.push({
              source: fromModelId,
              target:obj.id,
              nodeType: "model",
              type: obj.type,
            })
          }

        }else {
          nodes.push({
            id: obj.id,
            displayName: this.getConceptTitleVal('value',obj.values),
            nodeType: "record",
            type: obj.type,
          })
          if (fromModelId) {
            edges.push({
              source: fromModelId,
              target:obj.id,
              nodeType: "record",
              type: obj.type,
            })
          }
        }
      })

      return { nodes, edges }
    },

    getConceptTitleVal: function(key, list) {
      return compose(
        propOr('', key),
        find(propEq('conceptTitle', true)),
        defaultTo([])
      )(list)
    },
    /**
     * Format nodes and edges data for chart
     * @param {Array} rawEdges
     * @param {Array} rawNodes
     * @param {String} activeNode
     */
    formatData: function(rawEdges, rawNodes, activeNode = '') {
      const nodes = rawNodes.map(function(node) {
        // set node active state
        if (activeNode && (node.id === activeNode)) {
          node.active = true
        } else {
          node.active = false
        }
        return node
      })

      const edges = rawEdges.map(function(edge) {
        const { source, target } = edge
        // if active node === source node, update target node active state
        if (activeNode && (activeNode === source.id)) {
          const nodeIdx = nodes.findIndex(n => n.id === target.id)
          nodes[nodeIdx].active = true
          // set edge active state
          edge.active = true
          // if active node === target node, update source node active state
        } else if (activeNode && (activeNode === target.id)) {
          const nodeIdx = nodes.findIndex(n => n.id === source.id)
          nodes[nodeIdx].active = true
          // set edge active state
          edge.active = true
        } else {
          edge.active = false
        }
        return edge
      })

      return { edges, nodes }
    },
  }
}