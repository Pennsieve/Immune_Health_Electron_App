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
      <div id="Progress_Status">
        <div id="myprogressBar">0%</div>
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
      uploadCount: 0
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
    //with the total number of files from fileList and the UPLOAD STATUS responses from subscribe, will
    //update progress dynamically
    //call update every time the filesUploaded is computed
  update: function() {
  var increment = 100 / this.fileListLen
  console.log(document)
  var element = document.getElementById('myprogressBar');
  var width = 0;
  var identity = setInterval(scene, 10);
  function scene() {
    if (width >= 100) {
      clearInterval(identity);
    } else {
      width = width + increment;
      element.style.width = width + '%';
      element.innerHTML = width * 1 + '%';
    }
  }
},
onClose: function(){
  this.$emit('close-progress-dialog')
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
  #Progress_Status {
  width: 50%;
  background-color: #ddd;
}

#myprogressBar {
  width: 1%;
  height: 35px;
  background-color: #6447f5;
  text-align: center;
  line-height: 32px;
  color: white;
}
</style>
