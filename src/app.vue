<template>
  <div>
    <ih-header />
    <router-view />
    <search-all-data
      :visible.sync="searchModalVisible"
    />
  </div>
</template>

<script>
import IhHeader from '@/components/shared/IhHeader.vue'
import SearchAllData from '@/components/SearchAllData/SearchAllData.vue'
import { mapGetters, mapActions } from 'vuex'
import globalMessageHandler from "@/mixins/global-message-handler";

export default {
  name: 'app',
  components: {
    IhHeader,
    SearchAllData
  },
  mixins: [
    globalMessageHandler
  ],
  computed: {
    ...mapGetters(['selectedStudy', 'searchModalVisible'])
  },
  methods: {
    ...mapActions(['setLinkingTargets']),
  },
  watch: {
    async selectedStudy() {
      // Clear the linking target when we change what study is selected
      this.setLinkingTargets([])
    }
  }
}
</script>
<style scoped lang="scss">
@import 'assets/css/_variables.scss';

</style>
