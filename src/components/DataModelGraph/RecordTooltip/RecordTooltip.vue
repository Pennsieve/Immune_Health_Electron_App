<template>
  <div class="record-tooltip">
    <transition
      name="fade"
    >
      <div
        v-if="Object.keys(model).length"
        class="record-tooltip-wrap"
      >
<!--        <h2>-->
<!--          <router-link-->
<!--            :to="modelSearchLink"-->
<!--            class="record-name"-->
<!--          >-->
<!--            {{ model.displayName }}-->
<!--            <svg-icon-->
<!--              class="ml-8"-->
<!--              icon="icon-arrow-up"-->
<!--              dir="right"-->
<!--              height="10"-->
<!--              width="10"-->
<!--            />-->
<!--          </router-link>-->
<!--        </h2>-->
        <h2>{{ model.displayName }}</h2>
        <ul class="unstyled">
          <li v-for="property in model.properties" :key="property.name">
            <span><b>{{ property.name }}:</b> {{ property.value }}</span>
          </li>
<!--          <li>-->
<!--            <svg-icon-->
<!--              class="mr-8"-->
<!--              icon="icon-document"-->
<!--              height="16"-->
<!--              width="16"-->
<!--            />-->
<!--            <span>{{ recordLabel }}</span>-->
<!--          </li>-->
<!--          <li>-->
<!--            <svg-icon-->
<!--              class="mr-8"-->
<!--              icon="icon-info"-->
<!--              height="16"-->
<!--              width="16"-->
<!--            />-->
<!--            <span>{{ propertyLabel }}</span>-->
<!--          </li>-->
        </ul>
      </div>
    </transition>
  </div>
</template>

<script>
  import { propOr } from 'ramda'

  import Pluralizer from '@/mixins/Pluralizer'

  export default {
    name: 'RecordTooltip',

    mixins: [
      Pluralizer
    ],

    props: {
      model: {
        type: Object,
        default: function() {
          return {}
        }
      }
    },

    computed: {
      // /**
      //  * Compute the label for records
      //  * @returns {String}
      //  */
      // recordLabel: function() {
      //   const count = propOr(0, 'count', this.model)
      //
      //   return this.pluralizer(count, 'Record', 'Records')
      // },
      //
      // /**
      //  * Compute the label for properties
      //  * @returns {String}
      //  */
      // propertyLabel: function() {
      //   const count = propOr(0, 'propertyCount', this.model)
      //
      //   return this.pluralizer(count, 'Property', 'Properties')
      // },

      /**
       * Computes the model search link
       * @return {Object | String}
       */
      modelSearchLink: function() {
        const modelId = propOr('', 'id', this.model)

        return {
          name: 'concept-search',
          params: { conceptId: modelId }
        }
      },
    }
  }
</script>

<style scoped lang="scss">
  @import '@/assets/css/_variables.scss';

  .record-tooltip {
    left: 0;
    position: fixed;
    top: 0;
    z-index: 10;
  }
  .record-tooltip-wrap {
    background: #fff;
    border: 1px solid $gray_2;
    border-radius: 3px;
    box-shadow: 0 0 10px 0 rgba(189,189,189,0.3);
    color: $gray_6;
    width: 300px;
  }
  .record-name, ul {
    display: block;
    padding: 8px 16px;
  }
  .record-name {
    align-items: center;
    border-bottom: 1px solid #DADADA;
    display: flex;
    font-size: 14px;
    font-weight: 400;
    line-height: 16px;
    justify-content: space-between;
    .svg-icon {
      flex-shrink: 0;
    }
  }
  li {
    align-items: center;
    display: flex;
    font-size: 12px;
    margin-bottom: 8px;
  }
</style>
