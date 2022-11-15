<template>
  <div class="model-details">

    <SampleDetails v-if="model.name=='samples'"></SampleDetails>




<!--    <div v-if="Object.keys(record).length">-->

<!--      <h2>{{ detailsForModel(record.model).displayName }}</h2>-->

<!--      <table>-->
<!--        <tr v-for="[key, value] of Object.entries(record.props)" :key="key">-->
<!--          <td class="row-name">{{ key }}</td>-->
<!--          <td class="row-value">{{ value }}</td>-->
<!--        </tr>-->
<!--      </table>-->

<!--    </div>-->

  </div>
</template>

<script>



import SampleDetails from "@/components/SearchDetails/SampleDetails";
export default {
  name: 'ModelDetails',
  components: {
    SampleDetails
  },
  mixins: [],
  props: {
    model: {
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

  },
  watch: {

  },
  methods: {

  }
}
</script>

<style lang="scss" scoped>
@import '../../assets/css/_variables.scss';

.model-details {
  display: flex;
  min-height: 400px;
}

.row-name {
  color: $gray_5;
  font-weight: 500;
  padding: 0 32px 0 16px;
}

</style>
