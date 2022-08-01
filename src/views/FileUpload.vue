<template>
  <div class="container">
    <span class="sidebar-container">
      <bf-navigation-secondary :studies="allStudies" />
    </span>
    <span class="selected-content-container">
      <ih-subheader previousRoute="/studies">
        <template slot="text">
          <template v-if="!isLinkingTargetSet">No Linking Target Selected</template>
           <!--if visit is selected-->
          <template v-else-if="linkingTarget.modelId === '9c579bef-6ce0-4632-be1c-a95aadc982c4'">
            Linking Target:
            <div class="ml-16">
              <div class="property-text">
                Visit Event ID
              </div>
              <div>
                {{linkingTarget.visit_event}}
              </div>
            </div>
            <div class="ml-16">
              <div class="property-text">
                Event Name
              </div>
              <div>
                {{linkingTarget.event_name}}
              </div>
            </div>
          </template>
           <!--if sample is selected-->
          <template v-else-if="linkingTarget.modelId === 'e1ada387-5401-4409-b9d6-748f3aaddf23'">
            Linking Target:
            <div class="ml-16">
              <div class="property-text">
                Sample Type ID
              </div>
              <div>
                {{linkingTarget.sample_type_id}}
              </div>
            </div>
            <div class="ml-16">
              <div class="property-text">
                Study Sample ID
              </div>
              <div>
                {{linkingTarget.study_sample_id}}
              </div>
            </div>
          </template>
        </template>
        <template slot="buttons">
          <bf-button>
            <router-link to="/" exact>
              Main Menu
            </router-link>
          </bf-button>
        </template>
      </ih-subheader>
      <div>
        <bf-button v-on:click="updateSearchModalVisible(true)">
          Select Linking Target
        </bf-button>
      </div>
    </span>
  </div>
</template>

<script>
import IhSubheader from '@/components/shared/IhSubheader.vue'
import BfButton from '@/components/shared/BfButton.vue'
import BfNavigationSecondary from '@/components/bf-navigation/BfNavigationSecondary.vue'
import { mapActions, mapGetters, mapState } from 'vuex'
import { isEmpty } from 'ramda'

export default {
  name: 'FileUpload',
  components: {
    BfNavigationSecondary,
    IhSubheader,
    BfButton
  },
  mounted() {
    this.setSearchPage('FileUpload')
  },
  methods: {
    ...mapActions(['setSearchPage', 'updateSearchModalVisible'])
  },
  computed: {
    ...mapGetters(['allStudies', 'selectedStudyName']),
    ...mapState(['linkingTarget']),
    isLinkingTargetSet() {
      return !isEmpty(this.linkingTarget)
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
::v-deep .text-container {
  align-items: flex-end;
}
</style>
