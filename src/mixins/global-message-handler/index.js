import { pathOr, propOr } from 'ramda'
import { mapState, mapActions } from 'vuex'
//mport Auth from '@aws-amplify/auth'
import EventBus from '../../utils/event-bus.js'
//import logger from '../../mixins/logger'
//import LogoutHandler from '../logout-handler'

export default {
  data() {
    //return {
      //minCompletedEvents: 5
    //}
  },

  mixins: [LogoutHandler],

  mounted() {
    // Vue event listeners
    EventBus.$on('toast', this.onToast.bind(this))
    //EventBus.$on('logout', this.onLogout.bind(this))
    EventBus.$on('ajaxError', this.onToast.bind(this))
    EventBus.$on('add-to-upload-queue', this.addToUploadQueue.bind(this))
    EventBus.$on('add-input-files-to-upload-queue', this.addInputFilesToUploadQueue.bind(this))
    EventBus.$on('open-uploader', this.onOpenUploader.bind(this))
    EventBus.$on('close-uploader', this.onCloseUploader.bind(this))
    //EventBus.$on('get-file-proxy-id', this.getFilesProxyId.bind(this))
  },

  computed: {
    ...mapState(['userToken','activeOrganization',])
  },

  beforeDestroy() {
    EventBus.$off('toast', this.onToast.bind(this))
    //EventBus.$off('logout', this.onLogout.bind(this))
    EventBus.$off('ajaxError', this.onToast.bind(this))
    EventBus.$off('add-to-upload-queue', this.addToUploadQueue.bind(this))
    EventBus.$off('add-input-files-to-upload-queue', this.addInputFilesToUploadQueue.bind(this))
    EventBus.$off('open-uploader', this.onOpenUploader.bind(this))
    EventBus.$off('close-uploader', this.onCloseUploader.bind(this))
    //EventBus.$off('get-file-proxy-id', this.getFilesProxyId.bind(this))
  },

  methods: {
    ...mapActions(['updateUserToken', 'updateProfile']),
    /**
     * @param {Object} evt
     */
    onToast(evt) {
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

    /**
     //Gets files proxy ID for dataset

    getFilesProxyId: function() {
      const defaultPromise = Promise.resolve([])

      const datasetId = pathOr(0, ['params', 'datasetId'], this.$route)
      if (datasetId === 0) {
        return this.updateFilesProxyId('')
      }

      const url = `${this.config.conceptsUrl}/datasets/${datasetId}/proxy/package`
      return this.sendXhr(url, {
        header: {
          'Authorization': `bearer ${this.userToken}`
        }
      })
      .then(response => {
        this.updateFilesProxyId(response.id)
      })
    },
    **/
    /**
     * Open upload component
     * @param {Boolean} isAddingFiles
     */
    onOpenUploader: function(isAddingFiles) {
      const bfUpload = this.$refs.bfUpload
      bfUpload.isOpen = true
      bfUpload.isAddingFiles = isAddingFiles
    },

    /**
     * Close upload component
     */
    onCloseUploader: function() {
      const bfUpload = this.$refs.bfUpload
      bfUpload.isOpen = false
      bfUpload.clearUploadedFiles()
    },

    /**
     * Add files to upload queue
     * @param {Object} dataTransfer
     */
    addToUploadQueue: function(dataTransfer) {
      const bfUpload = this.$refs.bfUpload
      bfUpload.onDrop(dataTransfer)

      this.onOpenUploader({
        detail: {
          isAddingFiles: true
        }
      })
    },
    /**
     * Add files to upload queue via a file input change event
     * @param {Object} e
     */
    addInputFilesToUploadQueue: function(e) {
      const bfUpload = this.$refs.bfUpload
      bfUpload.onInputFileChange(e)

      this.onOpenUploader({
        detail: {
          isAddingFiles: true
        }
      })
    },

    /**
     * Handle logout
     */
     //NOTE: cannot use async in electron, must use one of lifecycle methods
     /*
    async onLogout(payload) {
      try {
        await Auth.signOut()
        this.handleLogout(payload)
      } catch (error) {
        EventBus.$emit('toast', {
          detail: {
            msg: `There was an error with your sign out attempt. Please try again.`
          }
        })
      }
    },
    */

    /**
     * Get profile url
     * @param {String} token
     * @returns {String}
     */
    getProfileUrl(token) {
      return `${process.env.api_host}/user?api_key=${token}`
    },

    /**
     * Update state if user token exists
     * @param {String} token
     */
    getProfile(token) {
      if (!token) {
        return
      }

      const profileUrl = this.getProfileUrl(token)
      this.$axios
        .$get(profileUrl)
        .then((profile) => {
          this.updateUserToken(token)
          this.updateProfile(profile)
        })
        .catch((response) => {
          if (response.status !== 200) {
            //this.handleLogout()
            console.log("couldn't get profile")
          }
        })
    }
  }
}
