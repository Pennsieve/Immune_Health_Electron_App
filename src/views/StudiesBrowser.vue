<template>
  <div class="container">
    <span class="sidebar-container">
      <bf-navigation-secondary :studies="allStudies" />
    </span>
    <span class="selected-content-container">
      <ih-subheader previousRoute="/">
        <template v-if="selectedStudy" slot="text">
          <div>
            <div class="property-text">
              Study
            </div>
            <div>
              {{selectedStudyName}}
            </div>
          </div>
          <div class="participant-container">

          </div>
          <div class="visits-container">

          </div>
          <div class="samples-container">

          </div>
        </template>
        <template slot="buttons">
          <bf-button>
            <router-link to="/file-upload" exact>
              Upload Files
            </router-link>
          </bf-button>
        </template>
      </ih-subheader>
      <div v-if="Object.keys(selectedStudy).length != 0">
        <div>
          <bf-button v-on:click="filterSearch('patient')">
            Filter Search Patients
          </bf-button>
        </div>
        <div>
          <bf-button v-on:click="filterSearch('visits')">
            Filter Search Visits
          </bf-button>
        </div>
        <div>
          <bf-button v-on:click="filterSearch('samples')">
            Filter Search Samples
          </bf-button>
        </div>
      </div>
    </span>
  </div>
</template>

<script>
import IhSubheader from '@/components/shared/IhSubheader.vue'
import BfButton from '@/components/shared/BfButton.vue'
import BfNavigationSecondary from '@/components/bf-navigation/BfNavigationSecondary.vue'
import { mapActions, mapGetters, mapState } from 'vuex'
import { clone, mergeRight } from 'ramda'
import { v1 } from 'uuid'
export default {
  name: 'StudiesBrowser',
  components: {
    IhSubheader,
    BfButton,
    BfNavigationSecondary
  },
  mounted() {
    this.setSearchPage('StudiesBrowser')
  },
  computed: {
    ...mapState(['searchModalSearch']),
    ...mapGetters(['allStudies', 'selectedStudy', 'selectedStudyName']),
  },
  methods: {
    ...mapActions(['updateSearchModalVisible', 'updateSearchModalSearch', 'setSearchPage']),
    filterSearch(model) {
      const newFilters = clone(this.searchModalSearch.filters)
      newFilters.push({
        id: v1(),
        type: 'model',
        target: model,
        targetLabel: model,
        property: '',
        propertyLabel: '',
        propertyType: '',
        operation: '',
        operationLabel: '',
        operators: [],
        value: '',
        isInvalid: false,
        lockTarget: true
      })
      const search = mergeRight(this.searchModalSearch, {
        filters: newFilters,
        model: model
      })
      this.updateSearchModalSearch(search)
      this.updateSearchModalVisible(true)
    }
  }
}
</script>
<style scoped lang="scss">
@import '@/assets/css/_variables.scss';
.sidebar-container {
  width: auto;
  min-width: 10rem;
  max-width: 20rem;
}
.selected-content-container {
  flex-grow: 1;
}
.container {
  display: flex;
}
.property-text {
  color: $app-primary-color;
  font-size: 1rem;
  font-weight: 500;
}
</style>
