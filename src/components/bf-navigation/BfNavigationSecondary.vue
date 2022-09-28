<template>
  <div class="main-container">
    <div class="study-container">
      <div class="header cannot-select">
        Studies
      </div>
    </div>
    <template v-if="studies.length > 0">
      <div v-for="study in studies" class="study-container heading1" :class="getStudyName(study) === getStudyName(selectedStudy) ? 'selected-study' : 'not-selected-study'" :key="study.sstudyid" v-on:click="studySelected">
        {{ getStudyName(study) }}
      </div>
    </template>
  </div>
</template>

<script>
import { isEmpty, pathOr, propOr } from 'ramda'
import { mapActions, mapGetters } from 'vuex'

export default {
  name: 'BfNavigationSecondary',
  components: {

  },
  data() {
    return {
    }
  },
  props: {
    studies: {
      type: Array,
      default: () => []
    }
  },
  methods: {
    ...mapActions(['setSelectedStudy']),
    getStudyName(study) {
      const studyValues = propOr([], 'values', study)
      if (isEmpty(studyValues)) {
        return ''
      }
      return propOr('', 'value', studyValues[0])
    },
    studySelected(e) {
      const studyName = pathOr('', ['target', 'outerText'], e)
      const selectedStudy = this.studies.find(study => this.getStudyName(study) === studyName)
      this.selectStudy(selectedStudy)
    },
    selectStudy(study) {
      this.setSelectedStudy(study)
      const studyId = propOr('', 'id', study)
      this.$emit('study-selected', studyId)
    }
  },
  computed: {
    ...mapGetters(['allStudies', 'selectedStudy'])
  }
}
</script>

<style scoped lang="scss">
@import '../../assets/css/_variables.scss';
.main-container {
  border-right: 1px solid $light-gray;
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
