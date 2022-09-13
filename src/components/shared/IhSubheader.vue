<template>
  <div class="subheader">
    <span class="route-info">
      <span v-if="showBackNavigationContainer" class="back-navigation-container">
        <router-link :to="previousRoute" exact>
          <svg-icon
            class="back-arrow"
            icon="icon-arrow-left"
            height="22"
            width="22"
            color="#000"
          />
        </router-link>
      </span>
      <span class="text-container heading1">
        <slot name="text" />
      </span>
    </span>
    <span class="button-container">
      <slot name="buttons" />
    </span>
  </div>
</template>

<script>
import { isEmpty } from 'ramda'

export default {
  name: 'IhSubheader',
  props: {
    previousRoute: {
      type: String,
      default: ''
    }
  },
  computed: {
    showBackNavigationContainer() {
      return !isEmpty(this.previousRoute)
    }
  }
}

</script>

<style scoped lang="scss">
@import '@/assets/css/_variables.scss';
.subheader {
  align-items: center;
  justify-content: space-between;
  box-sizing: border-box;
  display: flex;
  background-color: $purple_2;
  width: 100%;
  background-color: rgba(189, 189, 189, .1);
  font-weight: 400;
  padding: 1rem 1rem;
  margin-bottom: 1rem;
}
.text-container {
  color: black;
  margin-right: 1rem;
  display: contents;
  width: -webkit-fill-available;
}
.text-container:hover {
  cursor: default;
}
.button-container {
  display: flex;
  button:not(:last-of-type) {
    margin-right: .5rem;
  }
}
.route-info {
  width: 100%;
  display: flex;
  white-space: nowrap;
  text-overflow: clip;
  overflow: hidden;
}
.back-navigation-container {
  margin-right: 1rem;
  align-self: center;
}
</style>
