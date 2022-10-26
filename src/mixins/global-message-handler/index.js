import { pathOr, propOr } from 'ramda'
import EventBus from '../../utils/event-bus.js'

export default {
  data() {
    return {
    }
  },

  mixins: [],

  mounted() {
    // Vue event listeners
    EventBus.$on('toast', this.onToast.bind(this))
  },

  beforeDestroy() {
    EventBus.$off('toast', this.onToast.bind(this))
  },

  methods: {
    /**
     * @param {Object} evt
     */
    onToast(evt) {
      console.log('onToast() evt:')
      console.log(evt)
      const detailMsg = pathOr('', ['detail', 'msg'], evt)
      const message = propOr(detailMsg, 'msg', evt)
      const type = pathOr('info', ['detail', 'type'], evt).toLowerCase()
      let messageClass = pathOr('', ['detail', 'class'], evt)

      // Check the route to see if header is visible
      if (this.$route.matched.some((record) => record.components.header)) {
        messageClass = 'with-header'
      }

      this.$message({
        message,
        type,
        showClose: false,
        customClass: messageClass,
        duration: 3000,
        dangerouslyUseHTMLString: true
      })
    },
  }
}
