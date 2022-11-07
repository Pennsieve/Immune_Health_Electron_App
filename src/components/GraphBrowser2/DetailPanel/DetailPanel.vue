<template>
  <div class="main-container">
    <div class="study-container">
      <div class="header cannot-select">
        {{ selectedModel }}
      </div>
    </div>
    <div class="list-container">
      <div v-for="record in this.records"
           :key="record.id"
           @click="selectRecord(record) "
           :class="{ 'study-container': true, 'heading1': true, 'selected-study': isSelected(record.id) }">

        {{getTitle(record)}}
      </div>
    </div>


  </div>
</template>

<script>
import { mapState, mapGetters, mapActions } from 'vuex'

export default {
  name: 'DetailPanel',
  components: {

  },
  data() {
    return {
      records: [],
      unsubscribe: null
    }
  },
  props: {
    studies: {
      type: Array,
      default: () => []
    }
  },

  mounted: function() {
    // Subscribe to changes to the records of the model.
    this.unsubscribe = this.$store.subscribe((mutation) => {
      let needsUpdate = mutation.type=='graphBrowseModule/SET_RECORDS_FOR_MODEL'
      if  (this.selectedModel && needsUpdate && mutation.payload.model === this.selectedModel) {
        this.records = this.recordsForSelectedModel

      }
    })
  },

  beforeDestroy: function() {
    this.unsubscribe()
  },

  watch: {
    selectedModel: {
      handler: function() {
        this.records = this.recordsForSelectedModel
      }
    },
  },

  methods: {
    ...mapActions('graphBrowseModule', [
        'setSelectedRecord'
    ]),

    getTitle: function(record) {

      switch (record.model) {
        case 'patient':
          return record.props.name;
        case 'visits':
          return record.props.visit_event;
        case 'study':
          return record.props.sstudyid;
        case 'samples':
          return record.props.study_sample_id;
        default:
          return record.id
      }
    },
    isSelected: function(id) {
      if (this.selectedRecord){
        return this.selectedRecord.id == id
      } else {
        return false
      }

    },
    selectRecord: function(record) {
        this.setSelectedRecord(record)
    },
  },
  computed: {
    ...mapGetters("graphBrowseModule",[
        'recordsForSelectedModel'
    ]),
    ...mapState("graphBrowseModule",[
        'selectedModel',
        'selectedRecord'
    ]),

  },

}
</script>

<style scoped lang="scss">
@import '../../../assets/css/_variables.scss';
.main-container {
  border-right: 1px solid $light-gray;
  width: 320px;

}

.list-container {
  max-height: 1500px;
  overflow: scroll;
}

.study-container {
  padding: 1rem;
  border-bottom: 1px solid $light-gray;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  .header {
    font-weight: 700;
    text-align: center;
  }

}
.study-container:hover {
  cursor: pointer;
}

.selected-study {
  border-left: .5rem solid orange;
  padding-left: .5rem;
  background-color: $purple_tint;
}

.not-selected-study {
  padding-left: 1rem;
  border-left: none;
}

.cannot-select {
  cursor: default !important;
}
</style>
