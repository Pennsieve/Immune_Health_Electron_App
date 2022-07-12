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

export default {
  name: 'app',
  components: {
    IhHeader,
    SearchAllData
  },
  computed: {
    ...mapGetters(['selectedStudy', 'searchModalVisible'])
  },
  methods: {
    ...mapActions(['fetchAllPatientsMetadata', 'fetchAllVisitsMetadata', 'fetchAllSamplesMetadata', 'applyFiltersToMetadata']),
  },
  watch: {
    async selectedStudy() {
      await this.fetchAllPatientsMetadata()
      await this.fetchAllVisitsMetadata()
      await this.fetchAllSamplesMetadata()
      this.applyFiltersToMetadata()
    }
  }
}
</script>
<style scoped lang="scss">
@import '@/assets/css/_variables.scss';

</style>
