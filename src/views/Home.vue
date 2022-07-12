<template>
  <div>
    <ih-subheader class="subheader">
      <span slot="text">
        Penn Immune Health Application
      </span>
      <template slot="buttons">
        <bf-button>
          <a href="http://docs.pennsieve.io" target="_blank">
            Documentation
          </a>
        </bf-button>
        <bf-button>
          <a href="http://app.pennsieve.io" target="_blank">
            Visit Pennsieve
          </a>
        </bf-button>
      </template>
    </ih-subheader>
    <div class="page-content">
      <div class="logo-container">
        <span>
          <router-link to="/studies" exact>
            <img
              src="@/assets/images/browse-data.png"
              class="logo"
            />
            <div>
              Browse
            </div>
            <div>
              Studies
            </div>
          </router-link>
        </span>
        <span>
          <router-link to="/file-upload" exact>   
              <img
                src="@/assets/images/upload-files.png"
                class="logo"
              />
              <div>
                Upload
              </div>
              <div>
                Data
              </div>
          </router-link>
        </span>
      </div>
    </div>
  </div>
</template>

<script>
import IhSubheader from '@/components/shared/IhSubheader.vue'
import BfButton from '@/components/shared/BfButton.vue'

export default {
  name: 'IhHome',
  components: {
    IhSubheader,
    BfButton
  }
}
</script>
<style scoped lang="scss">
@import '@/assets/css/_variables.scss';
.logo {
  width: auto;
  height: 5rem;
}
.logo-container {
  display: flex;
  text-align: center;
  a {
    text-decoration: none;
  }
  a:active {
    color: blue;
  }
  span:not(:last-of-type) {
    margin-right: 1rem;
  }
}
.page-content {
  padding: 0 4rem;
}
.subheader {
  padding: 1rem 4rem !important;
}
</style>