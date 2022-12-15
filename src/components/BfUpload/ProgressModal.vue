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

    <div
      slot="body"
      class="bf-progress-body"
    >
      <el-progress
        :percentage="this.currPercentage"
        :format="format"
        :color="PennsieveCol"
        >
        </el-progress>

      </div>
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
      PennsieveCol: '#6967f0',
      currIncrement: 0
    }
  },
  mounted(){

    EventBus.$on('fileMessageSent', (data) => {
      if (this.currIncrement == 0){
      this.fileListLen = data;
      var increment = 100 / this.fileListLen
      this.currIncrement = increment
    }

    })
    EventBus.$on('subscribePing', (data) =>{
      console.log('progress message recieved is ',data)
      //this.uploadCount++;
      this.update()
    })
  },
  computed: {
    dialogTitle: function() {
      return this.isStillUploading ? 'Upload in progress' : 'Upload complete'
    }
  },
  methods: {
    onOverlayClick: function() {
      this.$emit('close-progress-dialog')
    },

    format(percentage) {
      return percentage === 100 ? 'Complete' : `${percentage}%`;
    },

    //with the total number of files from fileList and the UPLOAD STATUS responses from subscribe, will
    //update progress dynamically
    //call update every time the filesUploaded is computed
  update: function() {

  if (this.currPercentage < 100){
    console.log("file list length is ",this.fileListLen)
    if (this.currIncrement != 0){
    console.log("so progress will update in increments of ",this.currIncrement)
    var temp = this.currPercentage + this.currIncrement
    this.currPercentage = Math.ceil(temp);
    console.log("curr percentage ",this.currPercentage)

  }
}
  if (this.currPercentage >= 100) {
    this.isStillUploading = false;
    //this.$emit('refreshMessageFromChildSecondary')
    console.log("REFRESH FILES PAGE CALLED")
    //setTimeout(this.onClose(),3000);
    //this.onClose();
    this.waitThenExit()
    this.currPercentage = 0;
    }
},

delay: function(time) {
  return new Promise(resolve => setTimeout(resolve,time));
},
waitThenExit: async function() {
  await this.delay(3000);
  this.onClose();
},
onClose: function(){
  console.log('CLOSE PROGRESS MODAL CALLED')
  this.$emit('refreshMessageFromChildSecondary')

  this.$emit('close-progress-dialog')
}
  }
}
</script>


<style src="./BfUpload.scss" scoped lang="scss"></style>
<style lang="scss">
  @import '../../assets/_variables.scss';

  .bf-progress .bf-dialog .bf-dialog-wrap {
    height: 150px;
    margin: -295px 0 0 -350px;
    width: 700px;
  }


</style>
