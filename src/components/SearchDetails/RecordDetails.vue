<template>
  <div class="record-details">
    <div v-if="Object.keys(record).length">

<!--      <h2>{{ detailsForModel(record.model).displayName }}</h2>-->

      <table>
        <tr v-for="[key, value] of Object.entries(record.props)" :key="key">
          <td class="key">{{ key }}</td>
          <td class="row-value">{{ value }}</td>
        </tr>
      </table>

    </div>

  </div>
</template>

<script>


import {mapGetters} from "vuex";

export default {
  name: 'RecordDetails',
  components: {
  },
  mixins: [],
  props: {
    record: {
      type: Object,
      default: () => {
        return {}
      }
    },

  },
  data() {
    return {

    }
  },
  computed: {
    ...mapGetters('graphBrowseModule',['detailsForModel']),

  },
  watch: {

  },
  methods: {

  }
}
</script>

<style lang="scss" scoped>
@import '../../assets/css/_variables.scss';

.record-details {
  display: flex;
}


td.key {
  color: $purple_1;
  padding: 0 32px 0 16px;
}

</style>
