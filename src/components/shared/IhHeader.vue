<template>
  <div class="header">
    <div class="logo-wrap">
      <router-link to="/" exact>
        <img
          src="@/assets/images/pennsieve-logo-white.svg"
          class="logo"
        >
      </router-link>
    </div>
    <span class="title heading1">Penn Immune Health Application</span>
    <span>
      <bf-button @click="login">
        <svg-icon
          class="login-icon"
          icon="icon-person"
          height="18"
          width="18"
          color="#fff"
        />
        <span v-if="!isLoggedIn">
          Login
        </span>
        <span v-else>
          {{username}}
        </span>
      </bf-button>
    </span>
  </div>
</template>

<script>
import BfButton from '@/components/shared/BfButton.vue'
import { mapActions, mapGetters } from 'vuex'

export default {
  name: 'IhHeader',
  components: {
    BfButton
  },
  data() {
    return {
      isLogInModalVisible: false,
      userDisplayName: '',
    }
  },
  methods: {
    ...mapActions(['login']),
  },
  computed: {
    ...mapGetters(['username', 'isLoggedIn'])
  }
}
</script>

<style scoped lang="scss">
@import '@/assets/css/_variables.scss';
.header {
  align-items: center;
  box-sizing: border-box;
  display: flex;
  height: 64px;
  background-color: $purple_2;
  padding-right: 20px;
  position: relative;
  width: 100%;
  justify-content: space-between;
}
.logo {
  display: block;
  height: 35px;
  width: 198px;
}
.logo-wrap {
  align-items: center;
  display: flex;
  flex-shrink: 0;
}
.title {
  color: white;
  white-space: nowrap;
  margin-right: 1rem;
  font-weight: 700;
}
.login-icon {
  margin-right: 1rem;
}
</style>
