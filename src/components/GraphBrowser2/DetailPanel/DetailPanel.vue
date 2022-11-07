<template>
  <div class="main-container">
    <div class="study-container">
      <div class="header cannot-select">
        {{ selectedModel }}
      </div>
    </div>
    <div v-for="record in this.records"
         :key="record.id"
         class="study-container heading1">

      {{getTitle(record)}}
    </div>

<!--    <template v-if="studies.length > 0">-->
<!--&lt;!&ndash;      <div v-for="study in studies" class="study-container heading1" :class="getStudyName(study) === getStudyName(selectedStudy) ? 'selected-study' : 'not-selected-study'" :key="study.sstudyid" v-on:click="studySelected">&ndash;&gt;-->
<!--&lt;!&ndash;        {{ getStudyName(study) }}&ndash;&gt;-->
<!--&lt;!&ndash;      </div>&ndash;&gt;-->
<!--    </template>-->
  </div>
</template>

<script>
import { mapState, mapGetters } from 'vuex'

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
    }
  },
  computed: {
    ...mapGetters("graphBrowseModule",[
        'recordsForSelectedModel'
    ]),
    ...mapState("graphBrowseModule",[
        'selectedModel'
    ])
  }
}
</script>

<style scoped lang="scss">
@import '../../../assets/css/_variables.scss';
.main-container {
  border-right: 1px solid $light-gray;
  width: 320px;
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
