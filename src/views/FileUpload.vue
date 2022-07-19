<template>
  <div class="container">
    <span class="sidebar-container">
      <bf-navigation-secondary :studies="allStudies" />
    </span>
    <span class="selected-content-container">
      <ih-subheader previousRoute="/studies">
        <template slot="text">
          File Upload
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
          Select Upload Target
        </bf-button>
      </div>
    </span>
  </div>
</template>

<script>
import IhSubheader from '@/components/shared/IhSubheader.vue'
import BfButton from '@/components/shared/BfButton.vue'
import BfNavigationSecondary from '@/components/bf-navigation/BfNavigationSecondary.vue'
import { mapActions, mapGetters } from 'vuex'

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
    ...mapGetters(['allStudies', 'selectedStudyName'])
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
</style>
