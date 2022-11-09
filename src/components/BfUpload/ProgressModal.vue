<template>
  <div
    class="bf-progress"
  >
    <bf-dialog
        :title="dialogTitle"
        :open="open"
        @close="onClose"
        @overlay-click="onOverlayClick"
    >
      <el-progress
        :percentage="this.currPercentage"
        :format="format"
        :color="PennsieveCol"
        >
        </el-progress>
    </bf-dialog>
  </div>
</template>
<script>
import BfDialog from '@/components/shared/bf-dialog/bf-dialog.vue'
//import BfButton from '@/components/shared/BfButton.vue'
import EventBus from '../../utils/event-bus.js'
//import PennsieveClient from '@/utils/pennsieve/client.js'
export default {
  name: 'ProgressModal',

  components: {
    BfDialog
  },
  props: {
    open: {
      type: Boolean,
      default: false
    }
  },
  data: function() {
    return {
      isStillUploading: true,
      fileListLen: 0,
      uploadCount: 0,
      currPercentage: 0,
      PennsieveCol: '#6967f0'
    }
  },
  mounted(){

    EventBus.$on('fileMessageSent', (data) => {
      this.fileListLen = data;
    })
    EventBus.$on('subscribePing', (data) =>{
      console.log('progress message recieved is ',data)
      //this.uploadCount++;
      this.update()
    })
  },
  computed: {
    dialogTitle: function() {
      return this.isStillUploading ? 'Uploading in progress' : 'Upload complete'
    }
  },
  methods: {
    onOverlayClick: function() {
      EventBus.$emit('close-progress-dialog')
    },

    format(percentage) {
      return percentage === 100 ? 'Complete' : `{percentage}%`;
    },
    //with the total number of files from fileList and the UPLOAD STATUS responses from subscribe, will
    //update progress dynamically
    //call update every time the filesUploaded is computed
  update: function() {
  var increment = 100 / this.fileListLen
  this.currPercentage = this.currPercentage + increment
  if (this.currPercentage == 100) {
    this.waitThenExit()
  }
},
delay: function(time) {
  return new Promise(resolve => setTimeout(resolve,time));
},
waitThenExit: async function() {
  await this.delay(2000);
  this.onClose();
},
onClose: function(){
  EventBus.$emit('close-progress-dialog')
}
  }
}
</script>


<style src="./BfUpload.scss" scoped lang="scss"></style>
<style lang="scss">
  @import '../../assets/_variables.scss';
  .bf-upload .bf-dialog .bf-dialog-wrap {
    height: 300px;
    margin: -295px 0 0 -350px;
    width: 500px;
  }

</style>
