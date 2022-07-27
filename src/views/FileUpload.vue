<template>
  <div class="container">
    <span class="sidebar-container">
      <bf-navigation-secondary :studies="allStudies" />
    </span>
    <span class="selected-content-container">
      <ih-subheader previousRoute="/studies">
        <template slot="text">
          <template v-if="!isLinkingTargetSet">No Linking Target Selected</template>
          <template v-else-if="linkingTarget.modelId === 'visits'">
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
          <template v-else>
            Linking Target:
            <div class="ml-16">
              <div class="property-text">
                Sample Type ID
              </div>
              <div>
                <!--Figure out the name of the sample type id property that is set on the linking target-->
                <!--{{linkingTarget.sample_type_id}}-->
              </div>
            </div>
            <div class="ml-16">
              <div class="property-text">
                Study Sample ID
              </div>
              <div>
                <!--Figure out the name of the study sample id property that is set on the linking target-->
                <!--{{linkingTarget.study_sample_id}}-->
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
